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

        $isSaturday = $date->isSaturday();

        // Fetch global defaults
        $breaks = GlobalSetting::getByKey($isSaturday ? 'saturday_breaks' : 'weekday_breaks', []);
        $shift = GlobalSetting::getByKey($isSaturday ? 'saturday_shift' : 'weekday_shift', ['start' => '08:30', 'end' => '17:30']);

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

        // 2. Add breaks
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

        return response()->json($rows);
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

            // Create or Update Log
            $start = $row['start_time'] ?? null;
            $end = $row['end_time'] ?? null;
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
                    'type' => $row['type'] ?? 'task'
                ]
            ];

            if ($logId) {
                $log = TaskLog::find($logId);
                if ($log && $log->user_id == $userId) {
                    $log->update($logData);
                    $created[] = $log;
                } else {
                    $created[] = TaskLog::create($logData);
                }
            } else {
                $created[] = TaskLog::create($logData);
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

        return response()->json(['created' => $created], 201);
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
}
