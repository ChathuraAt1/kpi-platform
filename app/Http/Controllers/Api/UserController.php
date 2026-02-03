<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Requests\UpdateUserRequest;

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

        $user->update($data);

        return response()->json($user);
    }
}
