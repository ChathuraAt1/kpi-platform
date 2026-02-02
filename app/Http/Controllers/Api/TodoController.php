<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Todo;
use Illuminate\Http\Request;

class TodoController extends Controller
{
    public function index(Request $request)
    {
        $todos = Todo::where('user_id', $request->user()->id)->orderBy('due_date')->get();
        return response()->json($todos);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'notes' => 'nullable|string',
            'due_date' => 'nullable|date',
            'priority' => 'nullable|string',
        ]);
        $data['user_id'] = $request->user()->id;
        $todo = Todo::create($data);
        return response()->json($todo, 201);
    }

    public function show($id)
    {
        $todo = Todo::findOrFail($id);
        return response()->json($todo);
    }

    public function update(Request $request, $id)
    {
        $todo = Todo::findOrFail($id);
        $this->authorize('update', $todo);
        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'notes' => 'nullable|string',
            'due_date' => 'nullable|date',
            'priority' => 'nullable|string',
            'completed' => 'nullable|boolean',
        ]);
        $todo->update($data);
        return response()->json($todo);
    }

    public function destroy($id)
    {
        $todo = Todo::findOrFail($id);
        $this->authorize('delete', $todo);
        $todo->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
