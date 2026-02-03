<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaskLog;
use Illuminate\Http\Request;
use App\Http\Requests\StoreTaskLogRequest;

use App\Models\GlobalSetting;
use App\Models\Task;
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
        
        // Fetch morning plan for this date including Rollovers
        $tasks = Task::where('owner_id', $user->id)
            ->where(function($q) use ($dateStr) {
                $q->whereDate('due_date', $dateStr)
                  ->orWhere('metadata->plan_date', $dateStr)
                  // Rollover: unfinished tasks from the past
                  ->orWhere(function($sq) use ($dateStr) {
                      $sq->whereIn('status', ['open', 'inprogress', 'pending'])
                         ->where(function($ssq) use ($dateStr) {
                             $ssq->whereDate('due_date', '<', $dateStr)
                                 ->orWhere('metadata->plan_date', '<', $dateStr)
                                 ->orWhereDate('created_at', '<', $dateStr);
                         });
                  });
            })->get();

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
                'kpi_category_id' => null, // Maybe a special "Internal/Break" category later
                'priority' => 'low',
                'weight' => 1,
                'due_date' => $dateStr,
                'status' => 'complete',
                'completion_percent' => 100,
                'assigned_by' => 'System',
            ];
        }

        // Sort rows by start_time if possible, or just keep order
        usort($rows, function($a, $b) {
            if (!$a['start_time']) return 1;
            if (!$b['start_time']) return -1;
            return strcmp($a['start_time'], $b['start_time']);
        });

        return response()->json($rows);
    }

    private function calculateDuration($start, $end) {
        if (!$start || !$end) return 0;
        try {
            $s = Carbon::parse($start);
            $e = Carbon::parse($end);
            return round(max(0, $e->diffInMinutes($s) / 60), 2);
        } catch (\Exception $e) { return 0; }
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
        if ($request->has('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        } elseif ($request->has('status') && $request->input('status') === 'pending' && $request->user()->hasRole('supervisor')) {
            // Default to team view for supervisors checking pending
            $subordinateIds = $request->user()->getAllSubordinateIds();
            $query->whereIn('user_id', $subordinateIds);
        }
        if ($request->has('date')) {
            $query->where('date', $request->query('date'));
        }
        $logs = $query->orderBy('date', 'desc')->paginate(25);
        return response()->json($logs);
    }

    public function store(StoreTaskLogRequest $request)
    {
        $payload = $request->validated();
        $created = [];
        $userId = $request->user()->id;

        foreach ($payload['rows'] as $row) {
            $taskId = $row['task_id'] ?? null;
            $task = null;

            // Update or Create Task
            if ($taskId) {
                $task = \App\Models\Task::find($taskId);
                if ($task && $task->owner_id == $userId) {
                     // Update task details if provided
                    $updates = [];
                    if (!empty($row['priority'])) $updates['priority'] = $row['priority'];
                    if (!empty($row['status'])) $updates['status'] = $row['status'];
                    if (!empty($row['due_date'])) $updates['due_date'] = $row['due_date'];
                    if (!empty($updates)) $task->update($updates);
                }
            } elseif (!empty($row['description'])) {
                // Create new unplanned task
                $task = \App\Models\Task::create([
                    'owner_id' => $userId,
                    'title' => $row['description'],
                    'priority' => $row['priority'] ?? 'medium',
                    'status' => $row['status'] ?? 'completed', // assume completed if logged without plan? or pending?
                    'due_date' => $row['due_date'] ?? $payload['date'],
                    'planned_hours' => 0, // Unplanned
                    'metadata' => ['unplanned' => true]
                ]);
                $taskId = $task->id;
            }

            // Create Log
            $logData = [
                'user_id' => $userId,
                'date' => $payload['date'],
                'duration_hours' => $row['duration_hours'] ?? 0,
                'start_time' => $row['start_time'] ?? null,
                'end_time' => $row['end_time'] ?? null,
                'description' => $row['description'] ?? ($task?->title ?? ''),
                'kpi_category_id' => $row['kpi_category_id'] ?? null,
                'task_id' => $taskId,
                'status' => 'pending', 
                'metadata' => [
                     'completion_percent' => $row['completion_percent'] ?? 100 // default to 100 if logged?
                ]
            ];
            $created[] = TaskLog::create($logData);
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

    public function approve(Request $request, $id)
    {
        $log = TaskLog::findOrFail($id);
        $log->status = 'approved';
        $log->approved_by = $request->user()->id;
        $log->approved_at = now();
        $log->save();
        return response()->json($log);
    }

    public function reject(Request $request, $id)
    {
        $data = $request->validate(['comment' => 'nullable|string']);
        $log = TaskLog::findOrFail($id);
        $log->status = 'rejected';
        $log->save();
        // TODO: store rejection comment as Comment polymorphic or notification
        return response()->json($log);
    }
}
