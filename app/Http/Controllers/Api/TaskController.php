<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\DailyPlan;
use Illuminate\Http\Request;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        // TODO: apply role-based visibility (own tasks vs team)
        $tasks = Task::with('assignee', 'owner', 'kpiCategory')->paginate(20);
        return response()->json($tasks);
    }

    public function store(StoreTaskRequest $request)
    {
        $data = $request->validated();
        $data['owner_id'] = $request->user()->id;
        $task = Task::create($data);
        return response()->json($task, 201);
    }

    public function show($id)
    {
        $task = Task::with('logs', 'assignee', 'owner', 'kpiCategory')->findOrFail($id);
        return response()->json($task);
    }

    public function update(UpdateTaskRequest $request, $id)
    {
        $task = Task::findOrFail($id);
        $this->authorize('update', $task);
        $task->update($request->validated());
        return response()->json($task);
    }

    public function storePlan(Request $request)
    {
        $data = $request->validate([
            'date' => 'required|date',
            'tasks' => 'required|array',
            'tasks.*.title' => 'required|string',
            'tasks.*.priority' => 'nullable|in:low,medium,high',
            'tasks.*.due_date' => 'nullable|date',
            'tasks.*.assigned_by' => 'nullable|string',
        ]);

        $userId = $request->user()->id;

        // Check if already finalized
        $plan = DailyPlan::where('user_id', $userId)->where('date', $data['date'])->first();
        if ($plan && $plan->is_finalized) {
            return response()->json(['message' => 'Plan is already finalized for this date.'], 422);
        }

        $created = [];
        foreach ($data['tasks'] as $row) {
            $task = Task::create([
                'owner_id' => $userId,
                'title' => $row['title'],
                'priority' => $row['priority'] ?? 'medium',
                'due_date' => $row['due_date'] ?? $data['date'],
                'status' => 'open',
                'planned_hours' => 0,
                'metadata' => [
                    'assigned_by' => $row['assigned_by'] ?? 'Self',
                    'plan_date' => $data['date']
                ]
            ]);
            $created[] = $task;
        }

        // Finalize the plan
        DailyPlan::updateOrCreate(
            ['user_id' => $userId, 'date' => $data['date']],
            ['is_finalized' => true, 'finalized_at' => now()]
        );

        return response()->json($created, 201);
    }

    public function getPlanStatus(Request $request)
    {
        $date = $request->query('date', now()->format('Y-m-d'));
        $plan = DailyPlan::where('user_id', $request->user()->id)
            ->where('date', $date)
            ->first();

        return response()->json([
            'is_finalized' => $plan ? $plan->is_finalized : false,
            'finalized_at' => $plan ? $plan->finalized_at : null
        ]);
    }

    public function getPlan(Request $request)
    {
        $date = $request->query('date', now()->format('Y-m-d'));
        $userId = $request->user()->id;

        // 1. Check if finalized plan exists for this date
        $plan = DailyPlan::where('user_id', $userId)->where('date', $date)->first();
        
        if ($plan && $plan->is_finalized) {
            // Return only tasks explicitly planned for this date
            return response()->json(
                Task::with('kpiCategory')
                    ->where('owner_id', $userId)
                    ->where(function($q) use ($date) {
                        $q->whereDate('due_date', $date)
                          ->orWhere('metadata->plan_date', $date);
                    })
                    ->get()
            );
        }

        // 2. Otherwise return editable options including Rollovers
        $tasks = Task::with('kpiCategory')
            ->where('owner_id', $userId)
            ->where(function($q) use ($date) {
                $q->whereDate('due_date', $date)
                  ->orWhere('metadata->plan_date', $date)
                  // Rollover: unfinished tasks from the past
                  ->orWhere(function($sq) use ($date) {
                      $sq->whereIn('status', ['open', 'inprogress', 'not_started'])
                         ->where(function($ssq) use ($date) {
                             $ssq->whereDate('due_date', '<', $date)
                                 ->orWhere('metadata->plan_date', '<', $date)
                                 ->orWhereDate('created_at', '<', $date);
                         });
                  });
            })
            ->get();
            
        return response()->json($tasks);
    }

    private function calculateDuration($start, $end) {
        if (!$start || !$end) return 0;
        try {
            $s = \Carbon\Carbon::parse($start);
            $e = \Carbon\Carbon::parse($end);
            return max(0, $e->diffInMinutes($s) / 60);
        } catch (\Exception $e) { return 0; }
    }

    public function destroy($id)
    {
        $task = Task::findOrFail($id);
        $task->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
