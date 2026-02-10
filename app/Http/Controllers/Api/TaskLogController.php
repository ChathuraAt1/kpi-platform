<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaskLog;
use Illuminate\Http\Request;
use App\Http\Requests\StoreTaskLogRequest;

use App\Models\GlobalSetting;
use App\Models\Task;
use App\Models\DailyPlan;
use Carbon\Carbon;

class TaskLogController extends Controller
{
    public function getDailyTemplate(Request $request)
    {
        $dateStr = $request->query('date', now()->toDateString());
        $date = Carbon::parse($dateStr);
        $user = $request->user();

        // Get user's effective shift times (custom or global default)
        $shift = $user->getEffectiveShift($dateStr);

        // Get user's effective breaks (custom or global default)
        $breaks = $user->getEffectiveBreaks($dateStr);

        // Fetch morning plan for this date
        // NOTE: We only fetch tasks explicitly planned for THIS date if finalized
        // OR we fetch rollover suggestions if not finalized.
        $planStatus = DailyPlan::where('user_id', $user->id)->where('date', $dateStr)->first();
        $isFinalized = $planStatus ? $planStatus->is_finalized : false;

        // 0. Get already logged task IDs for this date to avoid duplicates in template
        $loggedTaskIds = TaskLog::where('user_id', $user->id)
            ->whereDate('date', $dateStr)
            ->whereNotNull('task_id')
            ->pluck('task_id')
            ->toArray();

        $tasksQuery = Task::where('owner_id', $user->id)
            ->whereNotIn('id', $loggedTaskIds);

        if ($isFinalized) {
            $tasksQuery->where(function ($q) use ($dateStr) {
                $q->whereDate('due_date', $dateStr)
                    ->orWhere('metadata->plan_date', $dateStr);
            });
        } else {
            // Suggest rollover + new items (same as getPlan)
            $tasksQuery->where(function ($q) use ($dateStr) {
                $q->whereDate('due_date', $dateStr)
                    ->orWhere('metadata->plan_date', $dateStr)
                    ->orWhere(function ($sq) use ($dateStr) {
                        $sq->whereIn('status', ['open', 'inprogress', 'not_started'])
                            ->where(function ($ssq) use ($dateStr) {
                                $ssq->whereDate('due_date', '<', $dateStr)
                                    ->orWhere('metadata->plan_date', '<', $dateStr)
                                    ->orWhereDate('created_at', '<', $dateStr);
                            });
                    });
            });
        }

        $tasks = $tasksQuery->get();

        $rows = [];

        // 1. Add morning plan tasks
        foreach ($tasks as $t) {
            $rows[] = [
                'task_id' => $t->id,
                'start_time' => '',
                'end_time' => '',
                'duration_hours' => $t->planned_hours ?? 0,
                'description' => $t->title,
                'kpi_category_id' => $t->kpi_category_id,
                'priority' => $t->priority,
                'weight' => $this->getPriorityWeight($t->priority),
                'due_date' => $t->due_date,
                'status' => $t->status,
                'completion_percent' => 0,
                'assigned_by' => $t->metadata['assigned_by'] ?? 'Self',
                'type' => 'task'
            ];
        }

        // 2. Add breaks (including user's custom breaks if any)
        foreach ($breaks as $b) {
            $rows[] = [
                'task_id' => null,
                'start_time' => $b['start'],
                'end_time' => $b['end'],
                'duration_hours' => $this->calculateDuration($b['start'], $b['end']),
                'description' => $b['label'] ?? 'Break',
                'kpi_category_id' => null,
                'priority' => 'low',
                'weight' => 0, // Breaks shouldn't add to productivity factor weight
                'due_date' => $dateStr,
                'status' => 'complete',
                'completion_percent' => 100,
                'assigned_by' => 'System',
                'type' => 'break'
            ];
        }

        // 3. Add Shift End row (Modifiable)
        $rows[] = [
            'task_id' => null,
            'start_time' => $shift['end'],
            'end_time' => $shift['end'],
            'duration_hours' => 0,
            'description' => 'Shift End / Departure',
            'kpi_category_id' => null,
            'priority' => 'low',
            'weight' => 0,
            'due_date' => $dateStr,
            'status' => 'complete',
            'completion_percent' => 100,
            'assigned_by' => 'System',
            'type' => 'shift_end'
        ];

        // Sort rows by start_time if possible, or just keep order
        usort($rows, function ($a, $b) {
            if (!$a['start_time']) return 1;
            if (!$b['start_time']) return -1;
            return strcmp($a['start_time'], $b['start_time']);
        });

        // Return with metadata about shift/breaks being used
        return response()->json([
            'date' => $dateStr,
            'shift' => $shift,
            'breaks' => $breaks,
            'total_break_hours' => $user->getTotalBreakHours($dateStr),
            'expected_work_hours' => $user->getExpectedWorkHours($dateStr),
            'timezone' => $user->timezone ?? 'UTC',
            'rows' => $rows,
        ]);
    }

    private function calculateDuration($start, $end)
    {
        if (!$start || !$end) return 0;
        try {
            $s = Carbon::parse($start);
            $e = Carbon::parse($end);
            $minutes = $s->diffInMinutes($e);
            return round(max(0, $minutes / 60), 2);
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function getPriorityWeight(string $priority): int
    {
        return match (strtolower($priority)) {
            'high' => 3,
            'medium' => 2,
            'low' => 1,
            default => 2,
        };
    }

    public function index(Request $request)
    {
        $query = TaskLog::query()->with('task', 'user', 'kpiCategory');
        $user = $request->user();

        // Role-based visibility scoping
        if ($user->hasRole('supervisor') && !$user->hasRole('admin') && !$user->hasRole('hr') && !$user->hasRole('it_admin')) {
            $subordinateIds = $user->getAllSubordinateIds();
            $subordinateIds[] = $user->id; // Can see self too

            if ($request->has('user_id')) {
                $targetId = $request->query('user_id');
                if (!in_array($targetId, $subordinateIds)) {
                    return response()->json(['error' => 'Unauthorized access to this user logs'], 403);
                }
                $query->where('user_id', $targetId);
            } else {
                $query->whereIn('user_id', $subordinateIds);
            }
        } elseif ($request->has('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        // Filtering
        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->has('date')) {
            $query->where('date', $request->query('date'));
        } elseif ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('date', [$request->query('start_date'), $request->query('end_date')]);
        }

        if ($request->has('kpi_category_id')) {
            $query->where('kpi_category_id', $request->query('kpi_category_id'));
        }

        $logs = $query->orderBy('date', 'desc')->paginate(30);
        return response()->json($logs);
    }

    public function store(StoreTaskLogRequest $request)
    {
        $payload = $request->validated();
        $created = [];
        $userId = $request->user()->id;
        $user = $request->user();
        $submissionType = $request->input('submission_type', 'evening_log'); // morning_plan or evening_log
        $shiftValidationWarnings = []; // Track all validation warnings

        foreach ($payload['rows'] as $row) {
            $taskId = $row['task_id'] ?? null;
            $logId = $row['id'] ?? null;
            $task = null;

            // Update or Create Task
            if ($taskId) {
                $task = \App\Models\Task::find($taskId);
                if ($task && $task->owner_id == $userId) {
                    $updates = [];
                    if (!empty($row['priority'])) $updates['priority'] = $row['priority'];

                    $percent = $row['completion_percent'] ?? 0;
                    if ($percent >= 100) {
                        $updates['status'] = 'complete';
                    } elseif ($percent > 0) {
                        $updates['status'] = 'inprogress';
                    } elseif (!empty($row['status']) && $row['status'] !== 'pending') {
                        $updates['status'] = $row['status'];
                    }

                    if (!empty($row['due_date'])) $updates['due_date'] = $row['due_date'];
                    if (!empty($updates)) $task->update($updates);
                }
            } elseif (!empty($row['description']) && ($row['type'] ?? 'task') === 'task') {
                // Create new unplanned task
                $task = \App\Models\Task::create([
                    'owner_id' => $userId,
                    'title' => $row['description'],
                    'priority' => $row['priority'] ?? 'medium',
                    'status' => $row['status'] ?? 'complete',
                    'due_date' => $payload['date'],
                    'planned_hours' => 0,
                    'metadata' => ['unplanned' => true]
                ]);
                $taskId = $task->id;
            }

            // Security Check: Only allow logging for today
            $today = now()->toDateString();
            if ($payload['date'] < $today) {
                // Option: Allow admin/hr to override if needed, but for now strict for employees
                if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('hr')) {
                    continue; // Skip past dates for regular users
                }
            }

            // Validate shift and breaks
            $start = $row['start_time'] ?? null;
            $end = $row['end_time'] ?? null;
            $validation = $this->validateShiftAndBreaks($user, $start, $end, $payload['date']);

            if (!empty($validation['warnings']) && ($row['type'] ?? 'task') === 'task') {
                foreach ($validation['warnings'] as $warning) {
                    $shiftValidationWarnings[] = [
                        'row_index' => array_search($row, $payload['rows']),
                        'task' => $row['description'] ?? $task?->title ?? 'Unknown',
                        ...$warning,
                    ];
                }
            }

            // Create or Update Log
            $computedDuration = $this->calculateDuration($start, $end);

            $logData = [
                'user_id' => $userId,
                'date' => $payload['date'],
                'start_time' => $start,
                'end_time' => $end,
                'duration_hours' => $computedDuration,
                'description' => $row['description'] ?? ($task?->title ?? ''),
                'kpi_category_id' => $row['kpi_category_id'] ?? null,
                'task_id' => $taskId,
                'status' => 'pending', // Always reset to pending on edit/create
                'metadata' => [
                    'completion_percent' => $row['completion_percent'] ?? 100,
                    'type' => $row['type'] ?? 'task',
                    'shift_validation_warnings' => $validation['warnings'] ?? [],
                ]
            ];

            if ($logId) {
                $log = TaskLog::find($logId);
                if ($log && $log->user_id == $userId) {
                    $log->update($logData);
                    $created[] = $log;
                } else {
                    $log = TaskLog::create($logData);
                    $log->markAsSubmitted($submissionType);
                    $log->save();
                    $created[] = $log;
                }
            } else {
                $log = TaskLog::create($logData);
                $log->markAsSubmitted($submissionType);
                $log->save();
                $created[] = $log;
            }
        }

        // Log audit trail for late submissions
        $lateCount = 0;
        foreach ($created as $log) {
            if ($log->is_late) {
                $lateCount++;
                \App\Models\AuditLog::create([
                    'user_id' => $userId,
                    'action' => 'task_log.submitted_late',
                    'auditable_type' => TaskLog::class,
                    'auditable_id' => $log->id,
                    'old_values' => [],
                    'new_values' => [
                        'minutes_late' => $log->submission_metadata['minutes_late'] ?? 0,
                        'deadline' => $log->submission_metadata['deadline'] ?? null,
                        'submission_type' => $submissionType,
                    ],
                    'ip_address' => $request->ip(),
                ]);
            }
        }

        // Dispatch classification job for created rows (batch)
        try {
            $ids = array_map(fn($r) => $r->id, $created);
            if (!empty($ids)) {
                \App\Jobs\ClassifyTaskLogs::dispatch($ids);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Failed to dispatch ClassifyTaskLogs: ' . $e->getMessage());
        }

        // Update DailyPlan to track evening submission
        if ($submissionType === 'evening_log') {
            $dailyPlan = DailyPlan::forUserOnDate($userId, $payload['date'])->first();
            if ($dailyPlan) {
                $dailyPlan->submitEveningLog();
                $dailyPlan->save();
            }
        }

        return response()->json([
            'status' => 'submitted',
            'submission_type' => $submissionType,
            'count' => count($created),
            'late_count' => $lateCount,
            'shift_validation_warnings' => $shiftValidationWarnings,
            'has_warnings' => !empty($shiftValidationWarnings),
            'created' => $created
        ], 201);
    }

    /**
     * Get submission status for today (evening log)
     * Returns deadline info and whether user has submitted
     */
    public function submissionStatus(Request $request)
    {
        $user = $request->user();
        $today = now()->toDateString();

        // Check if user has submitted evening log today
        $hasEveningSubmission = TaskLog::where('user_id', $user->id)
            ->whereDate('date', $today)
            ->where('submission_type', 'evening_log')
            ->whereNotNull('submitted_at')
            ->exists();

        $hasNorningSubmission = TaskLog::where('user_id', $user->id)
            ->whereDate('date', $today)
            ->where('submission_type', 'morning_plan')
            ->whereNotNull('submitted_at')
            ->exists();

        $deadline = now()->copy()->setHour(23)->setMinute(0)->setSecond(0);
        $minutesRemaining = max(0, (int)$deadline->diffInMinutes(now(), false));
        $isDeadlineApproaching = $minutesRemaining > 0 && $minutesRemaining < 60;
        $isPastDeadline = $minutesRemaining < 0;

        return response()->json([
            'date' => $today,
            'has_morning_submission' => $hasNorningSubmission,
            'has_evening_submission' => $hasEveningSubmission,
            'deadline' => $deadline->toIso8601String(),
            'minutes_remaining' => max(-999999, $minutesRemaining), // Cap negatives
            'is_approaching_deadline' => $isDeadlineApproaching,
            'is_past_deadline' => $isPastDeadline,
            'current_time' => now()->toIso8601String(),
        ]);
    }

    public function show($id)
    {
        $log = TaskLog::with('task', 'user', 'kpiCategory', 'approvedBy')->findOrFail($id);
        return response()->json($log);
    }

    // Note: approve/reject methods removed per new supervisor workflow.
    // Supervisor review is handled as read-only; optional supervisor scoring is saved via `saveSupervisorScore`.

    public function saveSupervisorScore(Request $request, $id)
    {
        $data = $request->validate([
            'supervisor_score' => 'required|numeric|min:0|max:100'
        ]);

        $log = TaskLog::findOrFail($id);
        $user = $request->user();

        // Verify the supervisor has permission to score this log
        // (e.g., they're the supervisor of the task's owner)
        // For now, assume any authenticated user can score (adjust as needed)

        $metadata = $log->metadata ?? [];
        $metadata['supervisor_score'] = $data['supervisor_score'];
        $log->metadata = $metadata;
        $log->save();

        return response()->json([
            'message' => 'Supervisor score saved successfully',
            'log' => $log
        ], 200);
    }

    /**
     * Submit morning plan: Finalize the morning plan for the day
     * 
     * Endpoint: POST /api/task-logs/submit-morning-plan
     * 
     * Submitted data includes:
     * - date: date string (YYYY-MM-DD)
     * - planned_task_ids: array of task IDs selected for today
     * 
     * Returns:
     * - success: boolean
     * - submission_type: 'morning_plan'
     * - plan_status: finalized plan with task count and rollover count
     * - deadline_info: next deadline (evening submission)
     */
    public function submitMorningPlan(Request $request)
    {
        $data = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'planned_task_ids' => 'required|array',
            'planned_task_ids.*' => 'integer|exists:tasks,id',
        ]);

        $user = $request->user();
        $dateStr = $data['date'];
        $plannedTaskIds = $data['planned_task_ids'] ?? [];

        // Get or create daily plan
        // FIX: Ensure date is Y-m-d string
        $dailyPlan = DailyPlan::firstOrCreate(
            [
                'user_id' => $user->id, 
                'date' => \Carbon\Carbon::parse($dateStr)->toDateString()
            ],
            ['submission_status' => 'pending']
        );

        // Count rollover tasks (tasks that were carried over from previous day)
        $rollovers = Task::rollover()
            ->where('owner_id', $user->id)
            ->count();

        // Submit the morning plan
        $dailyPlan->submitMorningPlan($plannedTaskIds);
        $dailyPlan->rollover_count = $rollovers;
        $dailyPlan->save();

        // Log this submission
        \App\Models\AuditLog::create([
            'user_id' => $user->id,
            'action' => 'daily_plan.morning_plan_submitted',
            'auditable_type' => DailyPlan::class,
            'auditable_id' => $dailyPlan->id,
            'old_values' => [],
            'new_values' => [
                'date' => $dateStr,
                'planned_task_count' => count($plannedTaskIds),
                'rollover_count' => $rollovers,
                'submitted_at' => now()->toIso8601String(),
            ],
            'ip_address' => $request->ip(),
        ]);

        // Set deadline for evening submission
        $deadline = Carbon::parse($dateStr)->setHour(23)->setMinute(0)->setSecond(0);
        $minutesRemaining = (int)$deadline->diffInMinutes(now(), false);

        return response()->json([
            'status' => 'success',
            'submission_type' => 'morning_plan',
            'plan_status' => [
                'date' => $dateStr,
                'is_finalized' => true,
                'finalized_at' => $dailyPlan->finalized_at->toIso8601String(),
                'planned_task_count' => count($plannedTaskIds),
                'rollover_count' => $rollovers,
                'total_tasks_for_day' => count($plannedTaskIds) + $rollovers,
            ],
            'deadline_info' => [
                'deadline' => $deadline->toIso8601String(),
                'minutes_remaining' => max(-999999, $minutesRemaining),
                'deadline_type' => 'evening_submission'
            ]
        ], 201);
    }

    /**
     * Get carryover suggestions: Tasks from yesterday that weren't completed
     * 
     * Endpoint: GET /api/task-logs/carryover-tasks
     * Query params:
     * - date: optional date to get carryovers for (defaults to today)
     * 
     * Returns:
     * - carryover_tasks: array of incomplete tasks from previous day(s)
     * - carryover_count: total count
     * - can_finalize_plan: boolean indicating if morning plan can be finalized
     */
    public function getCarryoverTasks(Request $request)
    {
        $user = $request->user();
        $dateStr = $request->query('date', now()->toDateString());
        $date = Carbon::parse($dateStr);
        $previousDate = $date->copy()->subDay()->toDateString();

        // Get task logs from previous day to identify incomplete tasks
        $previousDayLogs = TaskLog::where('user_id', $user->id)
            ->whereDate('date', $previousDate)
            ->get()
            ->keyBy('task_id');

        // Get carryover candidates: unfinished tasks from previous day
        $carryoverCandidates = Task::carryoverCandidates($user->id, $previousDate)
            ->get()
            ->map(function ($task) use ($previousDayLogs) {
                $log = $previousDayLogs->get($task->id);
                $completionPercent = 0;

                // Get completion % from previous day's log if it exists
                if ($log && $log->metadata && isset($log->metadata['completion_percent'])) {
                    $completionPercent = $log->metadata['completion_percent'];
                }

                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'priority' => $task->priority,
                    'planned_hours' => $task->planned_hours,
                    'status' => $task->status,
                    'completion_percent_yesterday' => $completionPercent,
                    'is_incomplete' => $completionPercent < 100,
                    'due_date' => $task->due_date?->toDateString(),
                    'type' => 'carryover'
                ];
            });

        // Get daily plan for today
        $dailyPlan = DailyPlan::forUserOnDate($user->id, $dateStr)->first();
        $isPlannedFinalized = $dailyPlan?->is_finalized ?? false;

        return response()->json([
            'date' => $dateStr,
            'previous_date' => $previousDate,
            'carryover_tasks' => $carryoverCandidates->values(),
            'carryover_count' => $carryoverCandidates->count(),
            'carryover_incomplete_count' => $carryoverCandidates->where('is_incomplete')->count(),
            'is_plan_finalized' => $isPlannedFinalized,
            'can_finalize_plan' => !$isPlannedFinalized,
            'submission_type' => 'carryover_suggestion'
        ]);
    }

    /**
     * Check if a time falls within a time range (HH:MM format)
     */
    private function isTimeBetween(string $time, string $start, string $end): bool
    {
        $time = Carbon::createFromFormat('H:i', $time);
        $start = Carbon::createFromFormat('H:i', $start);
        $end = Carbon::createFromFormat('H:i', $end);

        return $time->greaterThanOrEqualTo($start) && $time->lessThanOrEqualTo($end);
    }

    /**
     * Check if task overlaps with any break period
     */
    private function checkBreakOverlap(string $startTime, string $endTime, array $breaks): ?array
    {
        foreach ($breaks as $break) {
            $breakStart = Carbon::createFromFormat('H:i', $break['start']);
            $breakEnd = Carbon::createFromFormat('H:i', $break['end']);
            $taskStart = Carbon::createFromFormat('H:i', $startTime);
            $taskEnd = Carbon::createFromFormat('H:i', $endTime);

            // Check for overlap: task starts before break ends AND task ends after break starts
            if ($taskStart->lessThan($breakEnd) && $taskEnd->greaterThan($breakStart)) {
                return [
                    'overlaps' => true,
                    'break_start' => $break['start'],
                    'break_end' => $break['end'],
                    'break_label' => $break['label'] ?? 'Break',
                ];
            }
        }

        return null;
    }

    /**
     * Validate task log times against shift window and breaks
     */
    private function validateShiftAndBreaks(\App\Models\User $user, string $startTime, string $endTime, string $dateStr): array
    {
        $warnings = [];

        if (!$startTime || !$endTime) {
            return ['valid' => true, 'warnings' => $warnings];
        }

        // Get user's effective shift
        $shift = $user->getEffectiveShift($dateStr);
        $breaks = $user->getEffectiveBreaks($dateStr);

        // Check if times are within shift window
        $startInShift = $this->isTimeBetween($startTime, $shift['start'], $shift['end']);
        $endInShift = $this->isTimeBetween($endTime, $shift['start'], $shift['end']);

        if (!$startInShift) {
            $warnings[] = [
                'type' => 'start_outside_shift',
                'message' => "Task starts at {$startTime}, shift starts at {$shift['start']}",
                'value' => $startTime,
            ];
        }

        if (!$endInShift) {
            $warnings[] = [
                'type' => 'end_outside_shift',
                'message' => "Task ends at {$endTime}, shift ends at {$shift['end']}",
                'value' => $endTime,
            ];
        }

        // Check for break overlap
        $breakOverlap = $this->checkBreakOverlap($startTime, $endTime, $breaks);
        if ($breakOverlap && $breakOverlap['overlaps']) {
            $warnings[] = [
                'type' => 'break_overlap',
                'message' => "Task overlaps with {$breakOverlap['break_label']} ({$breakOverlap['break_start']}-{$breakOverlap['break_end']})",
                'break_start' => $breakOverlap['break_start'],
                'break_end' => $breakOverlap['break_end'],
            ];
        }

        return [
            'valid' => empty($warnings),
            'warnings' => $warnings,
            'shift' => $shift,
        ];
    }
}
