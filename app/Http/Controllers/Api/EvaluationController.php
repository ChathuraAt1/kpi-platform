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

    /**
     * Get manager's team KPI summary
     * Shows team average score, member count, min/max scores
     * 
     * Endpoint: GET /api/evaluations/manager-kpi-summary
     * Query params: year, month (defaults to current)
     */
    public function getManagerKpiSummary(Request $request)
    {
        $user = $request->user();

        if (!$user->isManager()) {
            return response()->json(['error' => 'Only managers can view KPI summaries'], 403);
        }

        $year = (int)$request->query('year', now()->year);
        $month = (int)$request->query('month', now()->month);

        // Get manager's own evaluation
        $managerEval = MonthlyEvaluation::where('user_id', $user->id)
            ->where('year', $year)
            ->where('month', $month)
            ->first();

        if (!$managerEval) {
            return response()->json(['error' => 'No evaluation found for this period'], 404);
        }

        return response()->json([
            'year' => $year,
            'month' => $month,
            'manager' => [
                'user_id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
                'job_role' => $user->jobRole?->name,
            ],
            'team' => [
                'member_count' => $managerEval->getTeamMemberCount(),
                'avg_score' => $managerEval->getTeamMemberAvgScore(),
                'min_score' => $managerEval->team_member_min_score,
                'max_score' => $managerEval->team_member_max_score,
            ],
            'manager_kpi' => [
                'total_score' => $managerEval->calculateManagerKpi(),
                'team_member_kpi' => $managerEval->team_member_avg_score,
                'manager_productivity' => $managerEval->manager_productivity_score,
                'supervision_effectiveness' => $managerEval->manager_supervision_effectiveness,
                'weights' => $managerEval->kpi_component_weights,
            ],
            'status' => $managerEval->status,
            'created_at' => $managerEval->created_at,
        ]);
    }

    /**
     * Get manager's team performance breakdown
     * Lists all direct and indirect reports with their evaluation scores
     * 
     * Endpoint: GET /api/evaluations/team-performance
     * Query params: year, month (defaults to current)
     */
    public function getTeamPerformance(Request $request)
    {
        $user = $request->user();

        if (!$user->isManager()) {
            return response()->json(['error' => 'Only managers can view team performance'], 403);
        }

        $year = (int)$request->query('year', now()->year);
        $month = (int)$request->query('month', now()->month);

        $subordinateIds = $user->getAllSubordinateIds();

        if (empty($subordinateIds)) {
            return response()->json([
                'year' => $year,
                'month' => $month,
                'team_members' => [],
                'statistics' => [
                    'total_members' => 0,
                    'avg_score' => null,
                    'high_performers' => 0,
                    'at_risk' => 0,
                ],
            ]);
        }

        $evaluations = MonthlyEvaluation::whereIn('user_id', $subordinateIds)
            ->where('year', $year)
            ->where('month', $month)
            ->with('user')
            ->get();

        $teamMembers = $evaluations->map(function ($eval) {
            return [
                'user_id' => $eval->user_id,
                'name' => $eval->user->name,
                'role' => $eval->user->role,
                'job_role' => $eval->user->jobRole?->name,
                'score' => $eval->score,
                'status' => $eval->status,
                'breakdown' => $eval->breakdown,
                'submitted_at' => $eval->created_at,
            ];
        });

        // Calculate statistics
        $scores = $evaluations->pluck('score')->filter()->toArray();
        $highPerformers = $evaluations->filter(fn($e) => ($e->score ?? 0) >= 80)->count();
        $atRisk = $evaluations->filter(fn($e) => ($e->score ?? 0) < 60)->count();

        return response()->json([
            'year' => $year,
            'month' => $month,
            'team_members' => $teamMembers->values(),
            'statistics' => [
                'total_members' => $evaluations->count(),
                'avg_score' => !empty($scores) ? round(array_sum($scores) / count($scores), 2) : null,
                'high_performers' => $highPerformers,
                'at_risk' => $atRisk,
            ],
        ]);
    }

    /**
     * Trigger manager KPI generation and calculation
     * Calculates manager's own KPI based on team performance and productivity
     * 
     * Endpoint: POST /api/evaluations/generate-manager-kpi
     * Body: {year, month}
     */
    public function generateManagerKpi(Request $request)
    {
        $this->authorize('manageEvaluations');

        $data = $request->validate([
            'year' => 'required|integer|min:2020',
            'month' => 'required|integer|min:1|max:12',
            'manager_id' => 'nullable|integer|exists:users,id',
        ]);

        $year = $data['year'];
        $month = $data['month'];
        $managerId = $data['manager_id'] ?? $request->user()->id;

        // User can only generate KPI for themselves unless they're admin/hr
        if ($managerId !== $request->user()->id && !$request->user()->hasRole(['admin', 'hr'])) {
            return response()->json(['error' => 'You can only generate KPI for yourself'], 403);
        }

        $manager = \App\Models\User::findOrFail($managerId);

        if (!$manager->isManager()) {
            return response()->json(['error' => 'User is not a manager'], 400);
        }

        // Get or create manager evaluation
        $evaluation = MonthlyEvaluation::firstOrCreate(
            ['user_id' => $managerId, 'year' => $year, 'month' => $month],
            ['generated_by' => $request->user()->id, 'status' => 'draft']
        );

        // Get all direct subordinates' evaluations
        $subordinateIds = $manager->getAllSubordinateIds();
        $teamEvals = [];

        if (!empty($subordinateIds)) {
            $teamEvals = MonthlyEvaluation::whereIn('user_id', $subordinateIds)
                ->where('year', $year)
                ->where('month', $month)
                ->with('user')
                ->get();
        }

        // Calculate team member scores
        $teamScores = $teamEvals->map(function ($eval) {
            return [
                'user_id' => $eval->user_id,
                'name' => $eval->user->name,
                'score' => $eval->score ?? 0,
                'category_breakdown' => $eval->breakdown,
            ];
        })->toArray();

        // Set team member scores (auto-calculates min, max, avg)
        $evaluation->setTeamMemberScores($teamScores);

        // Calculate manager's own productivity if needed
        if (is_null($evaluation->manager_productivity_score)) {
            $evaluation->manager_productivity_score = $manager->calculateDailyProductivity(
                now()->setYear($year)->setMonth($month)->toDateString()
            );
        }

        // Calculate supervision effectiveness
        if (is_null($evaluation->manager_supervision_effectiveness)) {
            $previousEval = MonthlyEvaluation::where('user_id', $managerId)
                ->where('year', $month === 1 ? $year - 1 : $year)
                ->where('month', $month === 1 ? 12 : $month - 1)
                ->first();

            $evaluation->manager_supervision_effectiveness = $evaluation->calculateSupervisionEffectiveness($previousEval);
        }

        // Calculate final manager KPI score
        $evaluation->score = $evaluation->calculateManagerKpi();
        $evaluation->save();

        // Log audit trail
        try {
            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'manager_kpi.generated',
                'auditable_type' => MonthlyEvaluation::class,
                'auditable_id' => $evaluation->id,
                'old_values' => [],
                'new_values' => [
                    'team_member_count' => $evaluation->team_member_count,
                    'team_member_avg_score' => $evaluation->team_member_avg_score,
                    'manager_kpi_score' => $evaluation->score,
                ],
                'ip_address' => $request->ip(),
            ]);
        } catch (\Throwable $_) {
            // ignore
        }

        return response()->json([
            'status' => 'success',
            'evaluation' => [
                'year' => $evaluation->year,
                'month' => $evaluation->month,
                'manager_kpi_score' => $evaluation->score,
                'team_member_count' => $evaluation->team_member_count,
                'team_avg_score' => $evaluation->team_member_avg_score,
                'components' => [
                    'team_member_kpi' => $evaluation->team_member_avg_score,
                    'manager_productivity' => $evaluation->manager_productivity_score,
                    'supervision_effectiveness' => $evaluation->manager_supervision_effectiveness,
                ],
            ]
        ], 201);
    }
}
