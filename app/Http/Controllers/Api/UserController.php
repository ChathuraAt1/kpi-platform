<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\TaskLog;
use App\Models\MonthlyEvaluation;
use Illuminate\Http\Request;
use App\Http\Requests\UpdateUserRequest;
use Carbon\Carbon;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('manageUsers');
        $q = User::query()->with('supervisor', 'jobRole');
        if ($request->has('role')) {
            $q->where('role', $request->query('role'));
        }

        if ($request->has('all')) {
            return response()->json($q->get());
        }

        return response()->json($q->paginate(100));
    }

    public function update(UpdateUserRequest $request, $id)
    {
        $user = User::findOrFail($id);
        $this->authorize('manageUsers');
        $user->update($request->validated());
        return response()->json($user);
    }

    public function progress(Request $request, $id)
    {
        $date = $request->query('date', now()->toDateString());
        $user = User::with('supervisor')->findOrFail($id);

        // fetch tasks owned or assigned to user
        $tasks = \App\Models\Task::with('kpiCategory')
            ->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)->orWhere('assignee_id', $user->id);
            })->get();

        // fetch task logs for date
        $logs = \App\Models\TaskLog::where('user_id', $user->id)->where('date', $date)->get();

        // compute per-task logged hours and percent
        $taskMap = [];
        foreach ($tasks as $t) {
            $taskMap[$t->id] = [
                'task' => $t,
                'planned_hours' => $t->planned_hours ?? null,
                'logged_hours' => 0,
                'completion' => 0,
            ];
        }

        foreach ($logs as $l) {
            if (isset($taskMap[$l->task_id])) {
                $taskMap[$l->task_id]['logged_hours'] += $l->duration_hours;
            } else {
                // ad-hoc tasks
                $taskMap['ad_hoc_' . $l->id] = ['task' => null, 'planned_hours' => null, 'logged_hours' => $l->duration_hours, 'completion' => null];
            }
        }

        foreach ($taskMap as $k => $v) {
            if ($v['planned_hours']) {
                $v['completion'] = min(100, ($v['logged_hours'] / $v['planned_hours']) * 100);
            }
            $taskMap[$k] = $v;
        }

        return response()->json(['date' => $date, 'tasks' => array_values($taskMap), 'logs' => $logs]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'work_start_time' => 'nullable|string',
            'work_end_time' => 'nullable|string',
            'timezone' => 'nullable|string',
            'breaks' => 'nullable|array',
        ]);

        // Mark as custom schedule if user is setting custom shift or breaks
        if (isset($data['work_start_time']) || isset($data['work_end_time']) || (isset($data['breaks']) && !empty($data['breaks']))) {
            $data['has_custom_schedule'] = true;
            $data['schedule_customized_at'] = now();
        }

        $user->update($data);

        return response()->json($user);
    }

    /**
     * Get last published evaluation scores for authenticated user
     */
    public function getLastEvaluationScores(Request $request)
    {
        $user = $request->user();

        $evaluation = MonthlyEvaluation::where('user_id', $user->id)
            ->where('status', 'published')
            ->latest('published_at')
            ->first();

        if (!$evaluation) {
            return response()->json([
                'status' => 'no_evaluation',
                'message' => 'No published evaluation available yet.',
                'data' => null,
            ], 200);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'period' => [
                    'year' => $evaluation->year,
                    'month' => $evaluation->month,
                    'month_name' => Carbon::create($evaluation->year, $evaluation->month, 1)->format('F'),
                ],
                'scores' => [
                    'rule_based' => $evaluation->rule_based_score,
                    'llm' => $evaluation->llm_based_score,
                    'hr' => $evaluation->hr_score,
                    'supervisor' => $evaluation->supervisor_score,
                    'final' => $evaluation->score,
                ],
                'breakdown' => $evaluation->breakdown ?? [],
                'published_at' => $evaluation->published_at?->format('Y-m-d H:i:s'),
            ],
        ], 200);
    }

    /**
     * Get daily productivity score for a given date
     */
    public function getDailyProductivity(Request $request)
    {
        $user = $request->user();
        $date = $request->query('date', now()->toDateString());

        // Validate date format
        try {
            $dateObj = Carbon::createFromFormat('Y-m-d', $date);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid date format. Use YYYY-MM-DD',
                'data' => null,
            ], 400);
        }

        $productivity = $user->calculateDailyProductivity($date);

        // Get logs for the day to provide breakdown
        $logs = TaskLog::where('user_id', $user->id)
            ->whereDate('date', $date)
            ->with('task')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'date' => $date,
                'productivity_score' => $productivity,
                'log_count' => $logs->count(),
                'total_hours' => round($logs->sum('duration_hours'), 2),
                'breakdown' => $logs->map(function ($log) {
                    return [
                        'task_id' => $log->task_id,
                        'task_name' => $log->task?->name ?? 'Ad-hoc',
                        'duration_hours' => $log->duration_hours,
                        'completion_percent' => $log->metadata['completion_percent'] ?? 100,
                        'priority' => $log->metadata['priority'] ?? 'medium',
                    ];
                })->toArray(),
            ],
        ], 200);
    }

    /**
     * Get submission streak (consecutive days with morning/evening submissions)
     */
    public function getSubmissionStreak(Request $request)
    {
        $user = $request->user();
        $days = (int) $request->query('days', 30);
        $days = min($days, 365); // Cap at 1 year

        $endDate = now()->toDateString();
        $startDate = now()->subDays($days - 1)->toDateString();

        // Get all submission dates in range (distinct dates where user has task logs)
        $submissionDates = TaskLog::where('user_id', $user->id)
            ->whereBetween('date', [$startDate, $endDate])
            ->distinct('date')
            ->pluck('date')
            ->toArray();

        $submissionDates = array_map('strval', $submissionDates);
        sort($submissionDates);

        // Calculate current streak (consecutive days from today backwards)
        $currentStreak = 0;
        $currentDate = now()->toDateString();

        while (in_array($currentDate, $submissionDates)) {
            $currentStreak++;
            $currentDate = Carbon::createFromFormat('Y-m-d', $currentDate)
                ->subDay()
                ->toDateString();
        }

        // Calculate longest streak in the period
        $longestStreak = 0;
        $currentStreakLength = 0;
        $streakStartDate = null;

        $dateRange = [];
        $date = Carbon::createFromFormat('Y-m-d', $startDate);
        while ($date->format('Y-m-d') <= $endDate) {
            $dateRange[] = $date->format('Y-m-d');
            $date->addDay();
        }

        foreach ($dateRange as $date) {
            if (in_array($date, $submissionDates)) {
                if ($currentStreakLength === 0) {
                    $streakStartDate = $date;
                }
                $currentStreakLength++;
            } else {
                if ($currentStreakLength > $longestStreak) {
                    $longestStreak = $currentStreakLength;
                }
                $currentStreakLength = 0;
                $streakStartDate = null;
            }
        }

        // Check final streak
        if ($currentStreakLength > $longestStreak) {
            $longestStreak = $currentStreakLength;
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'current_streak' => $currentStreak,
                'longest_streak' => $longestStreak,
                'submission_count' => count($submissionDates),
                'period_days' => $days,
                'submission_dates' => $submissionDates,
            ],
        ], 200);
    }

    /**
     * Get KPI improvement suggestions based on recent evaluations and performance
     */
    public function getImprovementSuggestions(Request $request)
    {
        $user = $request->user();
        $months = (int) $request->query('period', 3); // Default to last 3 months
        $months = min($months, 12); // Cap at 1 year

        $now = now();
        $suggestions = [];

        // Get evaluations for the period
        $evaluations = MonthlyEvaluation::where('user_id', $user->id)
            ->where('status', 'published')
            ->whereBetween('year', [
                $now->copy()->subMonths($months)->year,
                $now->year,
            ])
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->get();

        if ($evaluations->isEmpty()) {
            return response()->json([
                'status' => 'no_data',
                'message' => 'Insufficient evaluation data to generate suggestions.',
                'data' => ['suggestions' => []],
            ], 200);
        }

        // Analyze score trends
        $scores = $evaluations->pluck('score')->filter();
        $avgScore = $scores->avg();
        $latestScore = $scores->first();

        // 1. Low overall score suggestion
        if ($avgScore < 50) {
            $suggestions[] = [
                'type' => 'low_performance',
                'title' => 'Performance Improvement Needed',
                'description' => 'Your average KPI score over the past ' . ($months) . ' months is ' . $avgScore . '. Consider working with your supervisor to create an improvement plan.',
                'priority' => 'high',
                'action' => 'Review feedback from recent evaluations and schedule a 1-on-1 with your supervisor.',
            ];
        }

        // 2. Declining trend
        if (count($scores) > 1) {
            $recent = $scores->slice(0, 2)->avg();
            $older = $scores->slice(2)->avg();
            if ($older > 0 && $recent < $older * 0.9) {
                $suggestions[] = [
                    'type' => 'declining_trend',
                    'title' => 'Performance Declining',
                    'description' => 'Your KPI scores have been declining recently. Recent average: ' . $recent . ', Previous average: ' . round($older, 2),
                    'priority' => 'high',
                    'action' => 'Identify obstacles affecting your performance and seek support from your supervisor or HR team.',
                ];
            }
        }

        // 3. Inconsistent performance
        if (count($scores) > 2) {
            $standardDev = $this->calculateStandardDeviation($scores->toArray());
            if ($standardDev > 20) {
                $suggestions[] = [
                    'type' => 'inconsistent_performance',
                    'title' => 'Inconsistent Monthly Performance',
                    'description' => 'Your KPI scores vary significantly from month to month (variance: ' . round($standardDev, 1) . '). Try to maintain consistent performance.',
                    'priority' => 'medium',
                    'action' => 'Reflect on what helps you perform well in good months and replicate those behaviors consistently.',
                ];
            }
        }

        // 4. Strong performance - development opportunity
        if ($avgScore >= 85) {
            $suggestions[] = [
                'type' => 'high_performer',
                'title' => 'Excellent Performance - Growth Opportunity',
                'description' => 'You\'re performing well with an average score of ' . $avgScore . '. Consider taking on additional responsibilities or mentoring colleagues.',
                'priority' => 'low',
                'action' => 'Discuss career development opportunities with your supervisor.',
            ];
        }

        // 5. Submission habit suggestion (based on streak)
        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();

        $hasSubmissionToday = TaskLog::where('user_id', $user->id)
            ->whereDate('date', $today)
            ->exists();

        if (!$hasSubmissionToday) {
            $suggestions[] = [
                'type' => 'submission_reminder',
                'title' => 'Daily Submission Reminder',
                'description' => 'Don\'t forget to submit your daily task logs to maintain your submission streak.',
                'priority' => 'medium',
                'action' => 'Complete your daily task log submission before end of shift.',
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'suggestions' => $suggestions,
                'summary' => [
                    'average_score' => round($avgScore, 2),
                    'latest_score' => $latestScore,
                    'evaluation_months' => $evaluations->count(),
                ],
            ],
        ], 200);
    }

    /**
     * Helper: Calculate standard deviation for an array of numbers
     */
    private function calculateStandardDeviation(array $values): float
    {
        if (count($values) < 2) {
            return 0;
        }

        $avg = array_sum($values) / count($values);
        $squaredDiffs = array_map(function ($v) use ($avg) {
            return pow($v - $avg, 2);
        }, $values);

        $variance = array_sum($squaredDiffs) / count($values);
        return sqrt($variance);
    }
}
