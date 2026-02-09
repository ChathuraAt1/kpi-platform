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
