<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Todo;
use Illuminate\Http\Request;
use App\Http\Requests\StoreTodoRequest;
use App\Http\Requests\UpdateTodoRequest;

class TodoController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $today = now()->toDateString();
        
        // 1. Personal Todos
        $todos = Todo::where('user_id', $user->id)
            ->orderBy('due_date')
            ->get()
            ->map(function ($t) {
                return [
                    'id' => "todo_{$t->id}",
                    'raw_id' => $t->id,
                    'type' => 'todo',
                    'title' => $t->title,
                    'notes' => $t->notes,
                    'priority' => $t->priority,
                    'due_date' => $t->due_date ? $t->due_date->toDateString() : null,
                    'completed' => (bool)$t->completed,
                ];
            });

        // 2. Assigned Tasks (Morning Plan / Strategic)
        $tasks = \App\Models\Task::where('assignee_id', $user->id)
            ->where(function($q) use ($today) {
                $q->whereNull('due_date')
                  ->orWhereDate('due_date', '<=', $today);
            })
            ->where('status', '!=', 'cancelled')
            ->get();

        $tasks = $tasks->map(function ($t) {
                return [
                    'id' => "task_{$t->id}",
                    'raw_id' => $t->id,
                    'type' => 'task',
                    'title' => $t->title,
                    'notes' => $t->description,
                    'priority' => $t->priority ?? 'medium',
                    'due_date' => $t->due_date ? $t->due_date->toDateString() : null,
                    'completed' => $t->status === 'completed',
                    'kpi_category' => $t->kpiCategory ? $t->kpiCategory->name : null,
                ];
            });

        // 3. Today's Task Logs (Work items recorded)
        $logs = \App\Models\TaskLog::where('user_id', $user->id)
            ->whereDate('date', $today)
            ->where(function($q) {
                $q->whereNull('metadata->type')
                  ->orWhereNotIn('metadata->type', ['break', 'shift_end']);
            })
            ->with('kpiCategory')
            ->get()
            ->map(function ($l) {
                return [
                    'id' => "log_{$l->id}",
                    'raw_id' => $l->id,
                    'type' => 'log',
                    'title' => $l->description ?: 'Unnamed work item',
                    'notes' => "Recorded: {$l->start_time} - {$l->end_time} ({$l->duration_hours}h)",
                    'priority' => 'low',
                    'due_date' => $l->date->toDateString(),
                    'completed' => true,
                    'kpi_category' => $l->kpiCategory ? $l->kpiCategory->name : null,
                ];
            });

        $unified = $todos->concat($tasks)->concat($logs)
            ->sortBy(function($item) {
                // Prioritize uncompleted tasks, then by priority, then by type
                $done = $item['completed'] ? 1 : 0;
                $priorityWeight = ['high' => 0, 'medium' => 1, 'low' => 2][$item['priority']] ?? 1;
                return "{$done}_{$priorityWeight}_{$item['type']}";
            })
            ->values();

        return response()->json($unified);
    }

    public function store(StoreTodoRequest $request)
    {
        $data = $request->validated();
        $data['user_id'] = $request->user()->id;
        $todo = Todo::create($data);
        return response()->json($todo, 201);
    }

    public function update(Request $request, $id)
    {
        // Handle unified IDs (e.g., task_1, todo_1)
        if (strpos($id, 'task_') === 0) {
            $taskId = str_replace('task_', '', $id);
            $task = \App\Models\Task::findOrFail($taskId);
            $task->update([
                'status' => $request->completed ? 'completed' : 'open'
            ]);
            return response()->json(['message' => 'Task updated', 'id' => $id]);
        }
        
        if (strpos($id, 'todo_') === 0) {
            $todoId = str_replace('todo_', '', $id);
            $todo = Todo::findOrFail($todoId);
            $todo->update([
                'completed' => $request->completed,
                'completed_at' => $request->completed ? now() : null,
                'title' => $request->title ?? $todo->title,
                'priority' => $request->priority ?? $todo->priority,
                'due_date' => $request->due_date ?? $todo->due_date,
            ]);
            return response()->json($todo);
        }

        return response()->json(['error' => 'Invalid ID format or log item'], 422);
    }

    public function destroy($id)
    {
        if (strpos($id, 'todo_') === 0) {
            $todoId = str_replace('todo_', '', $id);
            $todo = Todo::findOrFail($todoId);
            $todo->delete();
            return response()->json(['message' => 'Deleted']);
        }
        
        return response()->json(['error' => 'Cannot delete strategic tasks or logs'], 403);
    }
}
