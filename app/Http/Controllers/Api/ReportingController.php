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
            'overall_health' => $healthy === $apiKeys->count() ? 'optimal' : 
                               ($inactive === 0 ? 'healthy' : 'degraded'),
            'keys' => $apiKeys->map(function ($key) {
                return [
                    'id' => $key->id,
                    'provider' => $key->provider,
                    'status' => $key->status,
                    'quota_percentage' => $key->getQuotaPercentage(),
                    'today_usage' => $key->daily_usage,
                    'daily_limit' => $key->daily_quota,
                    'health' => $key->status === 'active' && !$key->isQuotaExceeded() ? 'healthy' : 
                               ($key->isQuotaWarningNeeded() ? 'warning' : 'critical'),
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