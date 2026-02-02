<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskLogController;
use App\Http\Controllers\Api\TodoController;
use App\Http\Controllers\Api\ApiKeyController;

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('tasks', TaskController::class);
    Route::apiResource('todos', TodoController::class);

    Route::get('task-logs', [TaskLogController::class, 'index']);
    Route::post('task-logs', [TaskLogController::class, 'store']);
    Route::get('task-logs/{id}', [TaskLogController::class, 'show']);
    Route::post('task-logs/{id}/approve', [TaskLogController::class, 'approve']);
    Route::post('task-logs/{id}/reject', [TaskLogController::class, 'reject']);

    Route::apiResource('api-keys', ApiKeyController::class);
});
