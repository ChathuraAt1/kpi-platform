<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\TaskLog;

class ReportingController extends Controller
{
    /**
     * Get missing and late submissions for a specific date
     * Shows detailed submission status per employee and supervisor
     */
    public function missingSubmissions(Request $request)
    {
        $date = $request->query('date', now()->toDateString());
        $deadline = \Carbon\Carbon::parse($date)->setHour(23)->setMinute(0)->setSecond(0);

        // Get all active employees
        $employees = User::where('role', 'employee')
            ->where('status', '!=', 'inactive')
            ->get();

        $missing = [];
        $late = [];
        $submitted = [];

        foreach ($employees as $emp) {
            // Check if has any submission for this date
            $hasSubmission = TaskLog::where('user_id', $emp->id)
                ->whereDate('date', $date)
                ->where('submission_type', 'evening_log')
                ->whereNotNull('submitted_at')
                ->exists();

            if (!$hasSubmission) {
                // No submission at all
                $missing[] = [
                    'user_id' => $emp->id,
                    'name' => $emp->name,
                    'email' => $emp->email,
                    'supervisor_id' => $emp->supervisor_id,
                    'supervisor_name' => $emp->supervisor?->name ?? 'Unassigned',
                    'job_role_id' => $emp->job_role_id,
                ];
            } else {
                // Has submission - check if late
                $submission = TaskLog::where('user_id', $emp->id)
                    ->whereDate('date', $date)
                    ->where('submission_type', 'evening_log')
                    ->whereNotNull('submitted_at')
                    ->first();

                if ($submission->is_late) {
                    $late[] = [
                        'user_id' => $emp->id,
                        'name' => $emp->name,
                        'email' => $emp->email,
                        'supervisor_id' => $emp->supervisor_id,
                        'supervisor_name' => $emp->supervisor?->name ?? 'Unassigned',
                        'submitted_at' => $submission->submitted_at,
                        'deadline' => $deadline,
                        'minutes_late' => $submission->submission_metadata['minutes_late'] ?? 0,
                    ];
                } else {
                    $submitted[] = [
                        'user_id' => $emp->id,
                        'name' => $emp->name,
                        'submitted_at' => $submission->submitted_at,
                        'submission_type' => $submission->submission_type,
                    ];
                }
            }
        }

        return response()->json([
            'date' => $date,
            'deadline' => $deadline->toIso8601String(),
            'total_employees' => $employees->count(),
            'submitted_count' => count($submitted),
            'late_count' => count($late),
            'missing_count' => count($missing),
            'submitted' => $submitted,
            'late' => $late,
            'missing' => $missing,
        ]);
    }

    /**
     * Get submission summary per day (for past 7 days or custom range)
     */
    public function submissionTrend(Request $request)
    {
        $days = $request->query('days', 7);
        $start = now()->subDays($days)->toDateString();
        $end = now()->toDateString();

        $dates = [];
        for ($i = 0; $i < $days; $i++) {
            $dates[] = now()->subDays($i)->toDateString();
        }
        sort($dates);

        $result = [];
        foreach ($dates as $date) {
            $allEmps = User::where('role', 'employee')->count();

            $submitted = TaskLog::whereDate('date', $date)
                ->where('submission_type', 'evening_log')
                ->whereNotNull('submitted_at')
                ->where('is_late', false)
                ->distinct('user_id')
                ->count('user_id');

            $late = TaskLog::whereDate('date', $date)
                ->where('submission_type', 'evening_log')
                ->whereNotNull('submitted_at')
                ->where('is_late', true)
                ->distinct('user_id')
                ->count('user_id');

            $missing = $allEmps - $submitted - $late;

            $result[] = [
                'date' => $date,
                'total_employees' => $allEmps,
                'submitted' => $submitted,
                'late' => $late,
                'missing' => $missing,
                'submission_rate' => $allEmps > 0 ? round(($submitted / $allEmps) * 100, 2) : 0,
            ];
        }

        return response()->json([
            'period' => "{$start} to {$end}",
            'trends' => $result,
        ]);
    }
    /**
     * Get today's submission status metrics
     */
    public function submissionStatusToday()
    {
        $today = now()->toDateString();
        $allEmployees = User::where('role', 'employee')->active()->count();

        $submitted = TaskLog::whereDate('date', $today)
            ->where('submission_type', 'evening_log')
            ->whereNotNull('submitted_at')
            ->where('is_late', false)
            ->distinct('user_id')
            ->count('user_id');

        $late = TaskLog::whereDate('date', $today)
            ->where('submission_type', 'evening_log')
            ->whereNotNull('submitted_at')
            ->where('is_late', true)
            ->distinct('user_id')
            ->count('user_id');

        $missing = $allEmployees - $submitted - $late;
        $submissionRate = $allEmployees > 0 ? round(($submitted / $allEmployees) * 100, 2) : 0;

        return response()->json([
            'date' => $today,
            'total_employees' => $allEmployees,
            'submitted_on_time' => $submitted,
            'submitted_late' => $late,
            'missing' => $missing,
            'submission_rate_percentage' => $submissionRate,
            'status' => $submissionRate >= 80 ? 'healthy' : ($submissionRate >= 60 ? 'warning' : 'critical'),
        ]);
    }

    /**
     * Get API key health overview
     */
    public function apiKeyHealth()
    {
        $apiKeys = \App\Models\ApiKey::all();

        $healthy = $apiKeys->filter(function ($key) {
            return $key->status === 'active' && !$key->isQuotaExceeded();
        })->count();

        $degraded = $apiKeys->filter(function ($key) {
            return $key->status === 'connected' || ($key->isQuotaWarningNeeded());
        })->count();

        $inactive = $apiKeys->filter(function ($key) {
            return $key->status === 'inactive' || $key->status === 'error';
        })->count();

        return response()->json([
            'total_keys' => $apiKeys->count(),
            'healthy_keys' => $healthy,
            'degraded_keys' => $degraded,
            'inactive_keys' => $inactive,
            'overall_health' => $healthy === $apiKeys->count() ? 'optimal' : ($inactive === 0 ? 'healthy' : 'degraded'),
            'keys' => $apiKeys->map(function ($key) {
                return [
                    'id' => $key->id,
                    'provider' => $key->provider,
                    'status' => $key->status,
                    'quota_percentage' => $key->getQuotaPercentage(),
                    'today_usage' => $key->daily_usage,
                    'daily_limit' => $key->daily_quota,
                    'health' => $key->status === 'active' && !$key->isQuotaExceeded() ? 'healthy' : ($key->isQuotaWarningNeeded() ? 'warning' : 'critical'),
                ];
            })->values(),
        ]);
    }

    /**
     * Get LLM classification stats
     */
    public function llmClassificationStats()
    {
        $sevenDaysAgo = now()->subDays(7);

        $totalClassifications = TaskLog::where('created_at', '>=', $sevenDaysAgo)
            ->whereNotNull('ai_category')
            ->count();

        $successfulClassifications = TaskLog::where('created_at', '>=', $sevenDaysAgo)
            ->whereNotNull('ai_category')
            ->where('ai_confidence', '>=', 0.7)
            ->count();

        $failedClassifications = $totalClassifications - $successfulClassifications;

        $averageConfidence = TaskLog::where('created_at', '>=', $sevenDaysAgo)
            ->whereNotNull('ai_confidence')
            ->avg('ai_confidence') ?? 0;

        return response()->json([
            'period_days' => 7,
            'total_classifications' => $totalClassifications,
            'successful' => $successfulClassifications,
            'failed' => $failedClassifications,
            'success_rate_percentage' => $totalClassifications > 0 ?
                round(($successfulClassifications / $totalClassifications) * 100, 2) : 0,
            'average_confidence' => round($averageConfidence * 100, 2),
            'status' => $successfulClassifications / max(1, $totalClassifications) >= 0.8 ? 'healthy' : 'needs_attention',
        ]);
    }

    /**
     * Get composite admin dashboard metrics
     */
    public function adminDashboardMetrics(Request $request)
    {
        $today = now()->toDateString();
        $allEmployees = User::where('role', 'employee')->active()->count();

        // Submission metrics
        $submitted = TaskLog::whereDate('date', $today)
            ->where('submission_type', 'evening_log')
            ->whereNotNull('submitted_at')
            ->where('is_late', false)
            ->distinct('user_id')
            ->count('user_id');

        $late = TaskLog::whereDate('date', $today)
            ->where('submission_type', 'evening_log')
            ->whereNotNull('submitted_at')
            ->where('is_late', true)
            ->distinct('user_id')
            ->count('user_id');

        $missing = $allEmployees - $submitted - $late;
        $submissionRate = $allEmployees > 0 ? round(($submitted / $allEmployees) * 100, 2) : 0;

        // API Key metrics
        $apiKeys = \App\Models\ApiKey::all();
        $healthyKeys = $apiKeys->filter(function ($key) {
            return $key->status === 'active' && !$key->isQuotaExceeded();
        })->count();

        // LLM Stats
        $sevenDaysAgo = now()->subDays(7);
        $totalClassifications = TaskLog::where('created_at', '>=', $sevenDaysAgo)
            ->whereNotNull('ai_category')
            ->count();
        $successfulClassifications = TaskLog::where('created_at', '>=', $sevenDaysAgo)
            ->whereNotNull('ai_category')
            ->where('ai_confidence', '>=', 0.7)
            ->count();
        $llmSuccessRate = $totalClassifications > 0 ?
            round(($successfulClassifications / $totalClassifications) * 100, 2) : 0;

        // System health determination
        $healthStatus = 'optimal';
        $issues = [];

        if ($submissionRate < 80) {
            $issues[] = "Only {$submissionRate}% of employees submitted today";
            $healthStatus = $submissionRate < 60 ? 'critical' : 'warning';
        }

        if ($apiKeys->count() > $healthyKeys) {
            $issues[] = ($apiKeys->count() - $healthyKeys) . ' API key(s) have issues';
            if (count($issues) > 1) $healthStatus = 'warning';
        }

        if ($llmSuccessRate < 75) {
            $issues[] = "LLM classification success rate: {$llmSuccessRate}%";
            if (count($issues) > 1) $healthStatus = 'warning';
        }

        return response()->json([
            'timestamp' => now()->toIso8601String(),
            'system_health' => $healthStatus,
            'health_issues' => $issues,
            'metrics' => [
                'submissions' => [
                    'total_employees' => $allEmployees,
                    'on_time' => $submitted,
                    'late' => $late,
                    'missing' => $missing,
                    'submission_rate_percentage' => $submissionRate,
                    'status' => $submissionRate >= 80 ? 'healthy' : ($submissionRate >= 60 ? 'warning' : 'critical'),
                ],
                'api_keys' => [
                    'total' => $apiKeys->count(),
                    'healthy' => $healthyKeys,
                    'degraded' => $apiKeys->count() - $healthyKeys,
                ],
                'llm_classification' => [
                    'total_classifications' => $totalClassifications,
                    'success_rate_percentage' => $llmSuccessRate,
                    'status' => $llmSuccessRate >= 80 ? 'healthy' : 'needs_attention',
                ],
            ],
        ]);
    }

    /**
     * Get audit log summary
     */
    public function auditLogSummary(Request $request)
    {
        $days = $request->query('days', 30);
        $startDate = now()->subDays($days);

        $logs = \App\Models\AuditLog::where('created_at', '>=', $startDate)
            ->orderBy('created_at', 'desc')
            ->limit($request->query('limit', 50))
            ->get();

        $summary = [
            'total_logs' => $logs->count(),
            'period_days' => $days,
            'by_action' => $logs->groupBy('action')->map->count(),
            'by_model' => $logs->groupBy('model')->map->count(),
            'by_user' => $logs->groupBy('user_id')->map->count(),
            'logs' => $logs->map(function ($log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'model' => $log->model,
                    'model_id' => $log->model_id,
                    'user_id' => $log->user_id,
                    'user_name' => $log->user?->name ?? 'System',
                    'changes' => $log->changes,
                    'description' => $log->description,
                    'timestamp' => $log->created_at->toIso8601String(),
                    'time_ago' => $log->created_at->diffForHumans(),
                ];
            })->values(),
        ];

        return response()->json($summary);
    }

    /**
     * Export employee KPIs in CSV or JSON format
     */
    public function exportEmployeeKpis(Request $request)
    {
        $format = $request->query('format', 'json'); // json, csv
        $year = $request->query('year', now()->year);
        $month = $request->query('month', now()->month);
        $jobRoleId = $request->query('job_role_id'); // Optional filter

        $query = \App\Models\MonthlyEvaluation::where('year', $year)
            ->where('month', $month)
            ->where('status', 'published')
            ->with(['user', 'user.jobRole']);

        if ($jobRoleId) {
            $query->whereHas('user', function ($q) use ($jobRoleId) {
                $q->where('job_role_id', $jobRoleId);
            });
        }

        $evaluations = $query->get();

        $data = $evaluations->map(function ($eval) {
            return [
                'employee_id' => $eval->user_id,
                'employee_name' => $eval->user->name,
                'email' => $eval->user->email,
                'job_role' => $eval->user->jobRole?->name ?? 'N/A',
                'year' => $eval->year,
                'month' => $eval->month,
                'final_score' => $eval->score ?? 0,
                'rule_based_score' => $eval->rule_based_score ?? 0,
                'llm_based_score' => $eval->llm_based_score ?? 0,
                'hr_score' => $eval->hr_score ?? 0,
                'supervisor_score' => $eval->supervisor_score ?? 0,
                'status' => $eval->status,
                'published_date' => $eval->published_at?->toDateString(),
            ];
        });

        if ($format === 'csv') {
            return $this->exportToCsv($data, "kpi_export_{$year}_{$month}");
        }

        return response()->json([
            'period' => "{$year}-{$month}",
            'count' => $data->count(),
            'data' => $data,
            'export_timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Department-level performance report (by job role)
     */
    public function departmentPerformanceReport(Request $request)
    {
        $year = $request->query('year', now()->year);
        $month = $request->query('month', now()->month);

        $jobRoles = \App\Models\JobRole::with(['users'])->get();

        $departmentStats = $jobRoles->map(function ($role) use ($year, $month) {
            $evaluations = \App\Models\MonthlyEvaluation::where('year', $year)
                ->where('month', $month)
                ->where('status', 'published')
                ->whereHas('user', function ($q) use ($role) {
                    $q->where('job_role_id', $role->id);
                })
                ->get();

            if ($evaluations->isEmpty()) {
                return null;
            }

            $scores = $evaluations->pluck('score')->filter()->values();
            $avgScore = $scores->isNotEmpty() ? $scores->avg() : 0;
            $maxScore = $scores->isNotEmpty() ? $scores->max() : 0;
            $minScore = $scores->isNotEmpty() ? $scores->min() : 0;

            return [
                'department_id' => $role->id,
                'department_name' => $role->name,
                'employee_count' => $role->users->count(),
                'evaluated_count' => $evaluations->count(),
                'average_score' => round($avgScore, 2),
                'max_score' => $maxScore,
                'min_score' => $minScore,
                'score_variance' => round($scores->isNotEmpty() ? $scores->variance() : 0, 2),
                'submission_rate' => round(($evaluations->count() / $role->users->count()) * 100, 2),
            ];
        })->filter();

        return response()->json([
            'period' => "{$year}-{$month}",
            'total_departments' => $departmentStats->count(),
            'departments' => $departmentStats->values(),
            'company_average' => $departmentStats->avg('average_score'),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * KPI trend analysis - month-over-month score changes
     */
    public function kpiTrendAnalysis(Request $request)
    {
        $months = $request->query('months', 6);
        $userId = $request->query('user_id');
        $jobRoleId = $request->query('job_role_id');

        $startMonth = now()->subMonths($months);

        $query = \App\Models\MonthlyEvaluation::where('status', 'published')
            ->where(function ($q) use ($startMonth) {
                $q->whereYear('year', '>=', $startMonth->year)
                    ->where(function ($subQ) use ($startMonth) {
                        $subQ->whereYear('year', '>', $startMonth->year)
                            ->orWhere(function ($subQ2) use ($startMonth) {
                                $subQ2->whereYear('year', $startMonth->year)
                                    ->whereMonth('month', '>=', $startMonth->month);
                            });
                    });
            });

        if ($userId) {
            $query->where('user_id', $userId);
        } elseif ($jobRoleId) {
            $query->whereHas('user', function ($q) use ($jobRoleId) {
                $q->where('job_role_id', $jobRoleId);
            });
        }

        $evaluations = $query->orderBy('year')
            ->orderBy('month')
            ->with('user')
            ->get();

        // Group by period and calculate trends
        $trends = [];
        $previousScore = null;

        foreach ($evaluations as $eval) {
            $period = sprintf('%04d-%02d', $eval->year, $eval->month);
            $score = $eval->score ?? 0;
            $change = $previousScore !== null ? $score - $previousScore : 0;
            $changePercent = $previousScore !== null && $previousScore > 0
                ? round((($score - $previousScore) / $previousScore) * 100, 2)
                : 0;

            $trends[] = [
                'period' => $period,
                'year' => $eval->year,
                'month' => $eval->month,
                'score' => round($score, 2),
                'change' => round($change, 2),
                'change_percent' => $changePercent,
                'trend_indicator' => $change > 0 ? 'up' : ($change < 0 ? 'down' : 'stable'),
                'components' => [
                    'rule_based' => $eval->rule_based_score ?? 0,
                    'llm_based' => $eval->llm_based_score ?? 0,
                    'hr_score' => $eval->hr_score ?? 0,
                    'supervisor_score' => $eval->supervisor_score ?? 0,
                ],
            ];

            $previousScore = $score;
        }

        return response()->json([
            'period_months' => $months,
            'data_points' => count($trends),
            'trends' => $trends,
            'overall_trend' => $this->calculateOverallTrend($trends),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Outlier identification - top and bottom performers
     */
    public function outlierIdentification(Request $request)
    {
        $year = $request->query('year', now()->year);
        $month = $request->query('month', now()->month);
        $stdDevThreshold = $request->query('std_dev', 1.5);

        $evaluations = \App\Models\MonthlyEvaluation::where('year', $year)
            ->where('month', $month)
            ->where('status', 'published')
            ->with('user')
            ->get();

        if ($evaluations->isEmpty()) {
            return response()->json([
                'period' => "{$year}-{$month}",
                'outliers' => [],
                'message' => 'No published evaluations found',
            ]);
        }

        $scores = $evaluations->pluck('score')->filter()->values();
        $mean = $scores->avg();
        $stdDev = sqrt($scores->map(function ($score) use ($mean) {
            return pow($score - $mean, 2);
        })->avg());

        $topPerformers = [];
        $bottomPerformers = [];

        foreach ($evaluations as $eval) {
            $zscore = $stdDev > 0 ? ($eval->score - $mean) / $stdDev : 0;

            if ($zscore > $stdDevThreshold) {
                $topPerformers[] = [
                    'user_id' => $eval->user_id,
                    'name' => $eval->user->name,
                    'email' => $eval->user->email,
                    'score' => $eval->score,
                    'zscore' => round($zscore, 2),
                    'deviation' => round($eval->score - $mean, 2),
                ];
            } elseif ($zscore < -$stdDevThreshold) {
                $bottomPerformers[] = [
                    'user_id' => $eval->user_id,
                    'name' => $eval->user->name,
                    'email' => $eval->user->email,
                    'score' => $eval->score,
                    'zscore' => round($zscore, 2),
                    'deviation' => round($eval->score - $mean, 2),
                ];
            }
        }

        return response()->json([
            'period' => "{$year}-{$month}",
            'statistics' => [
                'total_employees' => $evaluations->count(),
                'mean_score' => round($mean, 2),
                'std_dev' => round($stdDev, 2),
                'threshold' => $stdDevThreshold,
            ],
            'top_performers' => array_slice(
                $this->sortPerformers($topPerformers, true),
                0,
                10
            ),
            'bottom_performers' => array_slice(
                $this->sortPerformers($bottomPerformers, false),
                0,
                10
            ),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Category-wise performance benchmarks
     */
    public function categoryWiseBenchmarks(Request $request)
    {
        $year = $request->query('year', now()->year);
        $month = $request->query('month', now()->month);

        $kpiCategories = \App\Models\KpiCategory::all();

        $benchmarks = $kpiCategories->map(function ($category) use ($year, $month) {
            $evaluations = \App\Models\MonthlyEvaluation::where('year', $year)
                ->where('month', $month)
                ->where('status', 'published')
                ->get();

            $categoryScores = [];

            foreach ($evaluations as $eval) {
                if ($eval->breakdown && isset($eval->breakdown['categories'])) {
                    foreach ($eval->breakdown['categories'] as $cat) {
                        if ($cat['id'] === $category->id) {
                            $categoryScores[] = $cat['score'] ?? 0;
                        }
                    }
                }
            }

            if (empty($categoryScores)) {
                return null;
            }

            $scores = collect($categoryScores);

            return [
                'category_id' => $category->id,
                'category_name' => $category->name,
                'description' => $category->description,
                'average_score' => round($scores->avg(), 2),
                'max_score' => $scores->max(),
                'min_score' => $scores->min(),
                'median_score' => collect($scores)->sort()->values()->slice(
                    intval(count($scores) / 2),
                    1
                )[0] ?? 0,
                'employee_count' => count($categoryScores),
                'variance' => round($scores->variance(), 2),
                'trend' => 'stable',
                'below_threshold_count' => $scores->filter(function ($s) {
                    return $s < 70;
                })->count(),
            ];
        })->filter();

        return response()->json([
            'period' => "{$year}-{$month}",
            'total_categories' => $benchmarks->count(),
            'benchmarks' => $benchmarks->values(),
            'company_average' => round($benchmarks->avg('average_score'), 2),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Supervisor/Manager effectiveness metrics
     */
    public function supervisorEffectiveness(Request $request)
    {
        $months = $request->query('months', 6);
        $supervisorId = $request->query('supervisor_id');

        $supervisors = $supervisorId
            ? User::where('id', $supervisorId)->where(function ($q) {
                $q->where('role', 'supervisor')->orWhere('role', 'manager');
            })->get()
            : User::where(function ($q) {
                $q->where('role', 'supervisor')->orWhere('role', 'manager');
            })->get();

        if ($supervisors->isEmpty()) {
            return response()->json([
                'message' => 'No supervisors/managers found',
                'effectiveness_metrics' => [],
            ]);
        }

        $startMonth = now()->subMonths($months);

        $metrics = $supervisors->map(function ($supervisor) use ($months, $startMonth) {
            // Get team members
            $teamMembers = User::where('supervisor_id', $supervisor->id)->get();

            if ($teamMembers->isEmpty()) {
                return null;
            }

            // Get team member evaluations
            $evaluations = \App\Models\MonthlyEvaluation::where('status', 'published')
                ->whereIn('user_id', $teamMembers->pluck('id'))
                ->where(function ($q) use ($startMonth) {
                    $q->whereYear('year', '>=', $startMonth->year)
                        ->where(function ($subQ) use ($startMonth) {
                            $subQ->whereYear('year', '>', $startMonth->year)
                                ->orWhere(function ($subQ2) use ($startMonth) {
                                    $subQ2->whereYear('year', $startMonth->year)
                                        ->whereMonth('month', '>=', $startMonth->month);
                                });
                        });
                })
                ->get();

            if ($evaluations->isEmpty()) {
                return [
                    'supervisor_id' => $supervisor->id,
                    'supervisor_name' => $supervisor->name,
                    'team_size' => $teamMembers->count(),
                    'evaluated_count' => 0,
                    'effectiveness_score' => 0,
                    'message' => 'No evaluations in specified period',
                ];
            }

            $teamScores = $evaluations->pluck('score')->filter();
            $supervisorScores = $evaluations->pluck('supervisor_score')->filter();

            // Effectiveness metrics
            $avgTeamScore = $teamScores->avg();
            $scoreImprovement = 0;

            // Check score trend of team members over time
            $trendScores = [];
            foreach ($evaluations->groupBy('user_id') as $userEvals) {
                $userTrendScores = $userEvals->sortBy(function ($e) {
                    return "{$e->year}-{$e->month}";
                })->pluck('score')->filter()->values();

                if ($userTrendScores->count() > 1) {
                    $improvement = $userTrendScores->last() - $userTrendScores->first();
                    $trendScores[] = $improvement;
                }
            }

            $teamTrendImprovement = !empty($trendScores) ? collect($trendScores)->avg() : 0;

            // Calculate effectiveness score (0-100)
            $effectivenessScore = min(100, max(0, (
                ($avgTeamScore / 100) * 40 +
                (($supervisorScores->avg() ?? 0) / 100) * 30 +
                ((100 - $evaluations->pluck('supervisor_score')->filter(function ($s) {
                    return $s === null || $s === 0;
                })->count() / max(1, $evaluations->count()) * 100) / 100) * 20 +
                ((min(100, max(0, $teamTrendImprovement + 50))) / 100) * 10
            ) * 100));

            return [
                'supervisor_id' => $supervisor->id,
                'supervisor_name' => $supervisor->name,
                'team_size' => $teamMembers->count(),
                'evaluated_count' => $evaluations->distinct('user_id')->count(),
                'average_team_score' => round($avgTeamScore, 2),
                'average_supervisor_score' => round($supervisorScores->avg() ?? 0, 2),
                'supervisor_scoring_rate' => round(
                    ($supervisorScores->count() / max(1, $evaluations->count())) * 100,
                    2
                ),
                'team_score_trend' => round($teamTrendImprovement, 2),
                'effectiveness_score' => round($effectivenessScore, 2),
                'effectiveness_rating' => $effectivenessScore >= 80 ? 'excellent' : ($effectivenessScore >= 70 ? 'good' : ($effectivenessScore >= 60 ? 'satisfactory' : 'needs_improvement')),
                'scoring_completeness' => round(
                    (($evaluations->count() - $evaluations->pluck('supervisor_score')
                        ->filter(function ($s) {
                            return $s === null || $s === 0;
                        })->count())
                        / max(1, $evaluations->count())) * 100,
                    2
                ),
            ];
        })->filter();

        return response()->json([
            'period_months' => $months,
            'supervisor_count' => $metrics->count(),
            'metrics' => $metrics->values(),
            'average_effectiveness' => round($metrics->avg('effectiveness_score'), 2),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Helper method to calculate overall trend
     */
    private function calculateOverallTrend($trends)
    {
        if (count($trends) < 2) {
            return 'insufficient_data';
        }

        $changes = array_map(function ($trend) {
            return $trend['change'];
        }, array_slice($trends, -3));

        $avgChange = array_sum($changes) / count($changes);

        if ($avgChange > 2) return 'improving';
        if ($avgChange < -2) return 'declining';
        return 'stable';
    }

    /**
     * Helper method to export data to CSV
     */
    private function exportToCsv($data, $filename)
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}.csv\"",
        ];

        $callback = function () use ($data) {
            $file = fopen('php://output', 'w');

            if ($data->isNotEmpty()) {
                fputcsv($file, array_keys($data[0]));

                foreach ($data as $row) {
                    fputcsv($file, $row);
                }
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Helper method to sort performers by score
     */
    private function sortPerformers($performers, $descending = true)
    {
        usort($performers, function ($a, $b) use ($descending) {
            $cmp = $b['score'] <=> $a['score'];
            return $descending ? $cmp : -$cmp;
        });
        return $performers;
    }
}
