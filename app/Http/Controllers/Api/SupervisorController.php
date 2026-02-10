<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\MonthlyEvaluation;
use App\Models\TaskLog;
use App\Models\User;

class SupervisorController extends Controller
{
    /**
     * Team submission status for today
     * GET /api/supervisor/team/submission-status
     */
    public function teamSubmissionStatus(Request $request)
    {
        $user = $request->user();

        if (!$user->hasRole('supervisor') && !$user->hasRole(['admin', 'hr'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $today = now()->toDateString();
        $subordinateIds = $user->getAllSubordinateIds();

        $members = User::whereIn('id', $subordinateIds)->get(['id', 'name', 'email', 'role']);

        $list = $members->map(function ($m) use ($today) {
            $hasEvening = TaskLog::where('user_id', $m->id)
                ->whereDate('date', $today)
                ->where('submission_type', 'evening_log')
                ->whereNotNull('submitted_at')
                ->exists();

            $hasMorning = TaskLog::where('user_id', $m->id)
                ->whereDate('date', $today)
                ->where('submission_type', 'morning_plan')
                ->whereNotNull('submitted_at')
                ->exists();

            return [
                'user_id' => $m->id,
                'name' => $m->name,
                'email' => $m->email,
                'role' => $m->role,
                'has_morning_submission' => (bool)$hasMorning,
                'has_evening_submission' => (bool)$hasEvening,
            ];
        })->values();

        $total = $list->count();
        $eveningCount = $list->where('has_evening_submission', true)->count();
        $morningCount = $list->where('has_morning_submission', true)->count();

        return response()->json([
            'date' => $today,
            'total_members' => $total,
            'evening_submitted_count' => $eveningCount,
            'morning_submitted_count' => $morningCount,
            'evening_submitted_percent' => $total ? round(($eveningCount / $total) * 100, 2) : 0,
            'members' => $list,
        ]);
    }

    /**
     * Team member KPI trends over past N months
     * GET /api/supervisor/team/kpi-trends
     */
    public function teamKpiTrends(Request $request)
    {
        $user = $request->user();
        if (!$user->hasRole('supervisor') && !$user->hasRole(['admin', 'hr'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $months = (int)$request->query('months', 6);
        $months = max(3, min(12, $months));

        $end = now()->startOfMonth();
        $periods = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $m = $end->copy()->subMonths($i);
            $periods[] = ['year' => $m->year, 'month' => $m->month, 'label' => $m->format('M Y')];
        }

        $subordinateIds = $user->getAllSubordinateIds();

        $result = [];
        foreach ($subordinateIds as $uid) {
            $userObj = User::find($uid);
            if (!$userObj) continue;

            $data = [];
            foreach ($periods as $p) {
                $ev = MonthlyEvaluation::where('user_id', $uid)
                    ->where('year', $p['year'])
                    ->where('month', $p['month'])
                    ->whereNotNull('score')
                    ->latest()
                    ->first();

                $data[] = ['year' => $p['year'], 'month' => $p['month'], 'label' => $p['label'], 'score' => $ev?->score];
            }

            $result[] = [
                'user_id' => $userObj->id,
                'name' => $userObj->name,
                'role' => $userObj->role,
                'trend' => $data,
            ];
        }

        return response()->json(['periods' => $periods, 'trends' => $result]);
    }

    /**
     * Missing / overdue evaluations to score by supervisor
     * GET /api/supervisor/team/missing-evaluations
     */
    public function missingEvaluationsToScore(Request $request)
    {
        $user = $request->user();
        if (!$user->hasRole('supervisor') && !$user->hasRole(['admin', 'hr'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $year = (int)$request->query('year', now()->year);
        $month = (int)$request->query('month', now()->month);

        $subordinateIds = $user->getAllSubordinateIds();

        $q = MonthlyEvaluation::with('user')
            ->whereIn('user_id', $subordinateIds)
            ->where('year', $year)
            ->where('month', $month)
            ->whereNull('supervisor_score')
            ->orderBy('created_at', 'desc');

        return response()->json($q->paginate(20));
    }

    /**
     * Team performance vs company average
     * GET /api/supervisor/team/vs-company
     */
    public function teamVsCompany(Request $request)
    {
        $user = $request->user();
        if (!$user->hasRole('supervisor') && !$user->hasRole(['admin', 'hr'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $year = (int)$request->query('year', now()->year);
        $month = (int)$request->query('month', now()->month);

        $subordinateIds = $user->getAllSubordinateIds();

        $teamAvg = MonthlyEvaluation::whereIn('user_id', $subordinateIds)
            ->where('year', $year)->where('month', $month)
            ->whereNotNull('score')
            ->avg('score');

        $companyAvg = MonthlyEvaluation::where('year', $year)->where('month', $month)
            ->whereNotNull('score')
            ->avg('score');

        return response()->json([
            'year' => $year,
            'month' => $month,
            'team_avg' => $teamAvg ? round($teamAvg, 2) : null,
            'company_avg' => $companyAvg ? round($companyAvg, 2) : null,
            'difference' => ($teamAvg !== null && $companyAvg !== null) ? round(($teamAvg - $companyAvg), 2) : null,
        ]);
    }

    /**
     * Individual drill-down overview for a team member
     * GET /api/supervisor/member/{user}
     */
    public function memberOverview(Request $request, User $user)
    {
        $auth = $request->user();
        $subordinateIds = $auth->getAllSubordinateIds();

        if (!in_array($user->id, $subordinateIds) && !$auth->hasRole(['admin', 'hr'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Recent published evaluations
        $recent = MonthlyEvaluation::where('user_id', $user->id)
            ->where('status', 'published')
            ->orderByDesc('published_at')
            ->take(6)
            ->get(['id', 'year', 'month', 'score', 'published_at']);

        // Latest evaluation with scores if exists
        $latestEval = MonthlyEvaluation::where('user_id', $user->id)->latest()->with('comments.user')->first();

        // Today's submission status
        $today = now()->toDateString();
        $hasEvening = TaskLog::where('user_id', $user->id)
            ->whereDate('date', $today)
            ->where('submission_type', 'evening_log')
            ->whereNotNull('submitted_at')
            ->exists();

        return response()->json([
            'user' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => $user->role],
            'recent_published' => $recent,
            'latest_evaluation' => $latestEval,
            'today_submitted' => $hasEvening,
        ]);
    }
}
