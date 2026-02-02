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
        $todos = Todo::where('user_id', $request->user()->id)->orderBy('due_date')->get();
        return response()->json($todos);
    }

    public function store(StoreTodoRequest $request)
    {
        $data = $request->validated();
        $data['user_id'] = $request->user()->id;
        $todo = Todo::create($data);
        return response()->json($todo, 201);
    }

    public function show($id)
    {
        $todo = Todo::findOrFail($id);
        return response()->json($todo);
    }

    public function update(UpdateTodoRequest $request, $id)
    {
        $todo = Todo::findOrFail($id);
        $this->authorize('update', $todo);
        $todo->update($request->validated());
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
