<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaskLog;
use Illuminate\Http\Request;
use App\Http\Requests\StoreTaskLogRequest;

class TaskLogController extends Controller
{
    public function index(Request $request)
    {
        $query = TaskLog::query()->with('task','user','kpiCategory');
        if ($request->has('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }
        if ($request->has('date')) {
            $query->where('date', $request->query('date'));
        }
        $logs = $query->orderBy('date','desc')->paginate(25);
        return response()->json($logs);
    }

    public function store(StoreTaskLogRequest $request)
    {
        $payload = $request->validated();
        $created = [];
        foreach ($payload['rows'] as $row) {
            $row['date'] = $payload['date'];
            $row['user_id'] = $request->user()->id;
            $created[] = TaskLog::create($row);
            // TODO: enqueue LLM classification job per-row or batch
        }

        return response()->json(['created' => $created], 201);
    }

    public function show($id)
    {
        $log = TaskLog::with('task','user','kpiCategory','approvedBy')->findOrFail($id);
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
