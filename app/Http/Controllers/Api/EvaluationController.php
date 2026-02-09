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

    // Note: approve() removed. Supervisor scoring and finalization are handled by separate workflows.

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
