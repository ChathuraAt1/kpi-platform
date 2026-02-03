<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Jobs\GenerateMonthlyEvaluations;
use App\Models\MonthlyEvaluation;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Request as FacadeRequest;

class EvaluationController extends Controller
{
    public function trigger(Request $request)
    {
        $this->authorize('manageEvaluations');

        $year = (int) $request->input('year', now()->year);
        $month = (int) $request->input('month', now()->month);
        $userId = $request->input('user_id');

        dispatch(new GenerateMonthlyEvaluations($year, $month, $userId));

        return response()->json(['status' => 'queued', 'year' => $year, 'month' => $month]);
    }

    public function list(Request $request)
    {
        $this->authorize('viewEvaluations');
        $q = MonthlyEvaluation::query()->with('user');
        
        if ($request->has('user_id')) {
            $q->where('user_id', $request->input('user_id'));
        }
        
        if ($request->has('status')) {
            $q->where('status', $request->input('status'));
            if ($request->input('status') === 'pending' && $request->user()->hasRole('supervisor')) {
                $subordinateIds = $request->user()->getAllSubordinateIds();
                $q->whereIn('user_id', $subordinateIds);
            }
        }
        
        if ($request->has('team_view') && $request->user()->hasRole('supervisor')) {
            $subordinateIds = $request->user()->getAllSubordinateIds();
            $q->whereIn('user_id', $subordinateIds);
        }
        
        return response()->json($q->latest()->paginate(20));
    }

    public function approve(Request $request, MonthlyEvaluation $evaluation)
    {
        $this->authorize('approveEvaluations');

        $supervisorScore = $request->input('supervisor_score');
        $breakdown = $evaluation->breakdown;

        // attach supervisor scores per category if provided
        if ($supervisorScore && is_array($supervisorScore)) {
            foreach ($supervisorScore as $catId => $score) {
                if (isset($breakdown[$catId])) {
                    $breakdown[$catId]['supervisor_score'] = (float)$score;
                }
            }
        }

        // compute final score: for each category, average available scores (rule, llm, supervisor)
        $total = 0.0;
        $count = 0;
        foreach ($breakdown as $b) {
            $scores = [];
            if (isset($b['rule_score'])) $scores[] = $b['rule_score'];
            if (isset($b['llm_score']) && $b['llm_score'] !== null) $scores[] = $b['llm_score'];
            if (isset($b['supervisor_score']) && $b['supervisor_score'] !== null) $scores[] = $b['supervisor_score'];
            if (count($scores) === 0) continue;
            $avg = array_sum($scores) / count($scores);
            $total += $avg;
            $count++;
        }

        $final = $count ? round($total / $count, 2) : null;

        $evaluation->breakdown = $breakdown;
        $evaluation->score = $final;
        $evaluation->status = 'approved';
        $evaluation->approved_by = $request->user()->id;
        $evaluation->approved_at = now();
        $evaluation->save();

        // create audit log for approval
        try {
            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'evaluation.approved',
                'auditable_type' => MonthlyEvaluation::class,
                'auditable_id' => $evaluation->id,
                'old_values' => null,
                'new_values' => ['status' => 'approved', 'score' => $final],
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        } catch (\Throwable $_) {
            // ignore audit failures
        }

        return response()->json(['status' => 'ok', 'score' => $final]);
    }

    public function publish(Request $request, MonthlyEvaluation $evaluation)
    {
        $this->authorize('publishEvaluations');

        if ($evaluation->status !== 'approved') {
            return response()->json(['error' => 'Only approved evaluations can be published'], 400);
        }

        $old = ['status' => $evaluation->status, 'score' => $evaluation->score];
        $evaluation->status = 'published';
        $evaluation->published_by = $request->user()->id;
        $evaluation->published_at = now();
        $evaluation->save();


        try {
            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'evaluation.published',
                'auditable_type' => MonthlyEvaluation::class,
                'auditable_id' => $evaluation->id,
                'old_values' => $old,
                'new_values' => ['status' => 'published'],
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        } catch (\Throwable $_) {
            // ignore
        }

        // Send email notification to the evaluated user
        try {
            if ($evaluation->user && ($evaluation->user->email ?? null)) {
                \Illuminate\Support\Facades\Mail::to($evaluation->user->email)
                    ->queue(new \App\Mail\EvaluationPublished($evaluation));
            }
        } catch (\Throwable $e) {
            // log and continue
            \Illuminate\Support\Facades\Log::warning('Failed to queue evaluation published email: ' . $e->getMessage());
        }

        return response()->json(['status' => 'published']);
    }
}
