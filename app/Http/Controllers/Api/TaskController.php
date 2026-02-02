<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        // TODO: apply role-based visibility (own tasks vs team)
        $tasks = Task::with('assignee','owner','kpiCategory')->paginate(20);
        return response()->json($tasks);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'assignee_id' => 'nullable|exists:users,id',
            'kpi_category_id' => 'nullable|exists:kpi_categories,id',
            'planned_hours' => 'nullable|numeric',
            'due_date' => 'nullable|date',
        ]);

        $data['owner_id'] = $request->user()->id;

        $task = Task::create($data);
        return response()->json($task, 201);
    }

    public function show($id)
    {
        $task = Task::with('logs','assignee','owner','kpiCategory')->findOrFail($id);
        return response()->json($task);
    }

    public function update(Request $request, $id)
    {
        $task = Task::findOrFail($id);
        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'assignee_id' => 'nullable|exists:users,id',
            'kpi_category_id' => 'nullable|exists:kpi_categories,id',
            'planned_hours' => 'nullable|numeric',
            'due_date' => 'nullable|date',
            'status' => 'nullable|string',
        ]);

        $task->update($data);
        return response()->json($task);
    }

    public function destroy($id)
    {
        $task = Task::findOrFail($id);
        $task->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
