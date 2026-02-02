

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
    Route::post('api-keys/health-check', [ApiKeyController::class, 'healthCheckAll'])->middleware('can:manageApiKeys');
    Route::post('evaluations/trigger', [\App\Http\Controllers\Api\EvaluationController::class, 'trigger'])->middleware('can:manageEvaluations');
    Route::get('evaluations', [\App\Http\Controllers\Api\EvaluationController::class, 'list'])->middleware('can:viewEvaluations');
    Route::post('evaluations/{evaluation}/approve', [\App\Http\Controllers\Api\EvaluationController::class, 'approve'])->middleware('can:approveEvaluations');
    Route::post('evaluations/{evaluation}/publish', [\App\Http\Controllers\Api\EvaluationController::class, 'publish'])->middleware('can:publishEvaluations');

    // user management
    Route::get('users', [\App\Http\Controllers\Api\UserController::class, 'index'])->middleware('can:manageUsers');
    Route::patch('users/{id}', [\App\Http\Controllers\Api\UserController::class, 'update'])->middleware('can:manageUsers');
    Route::get('users/{id}/progress', [\App\Http\Controllers\Api\UserController::class, 'progress'])->middleware('auth:sanctum');

    // admin reports
    Route::get('submissions/missing', [\App\Http\Controllers\Api\ReportingController::class, 'missingSubmissions'])->middleware('can:manageUsers');

    // KPI categories management
    Route::apiResource('kpi-categories', \App\Http\Controllers\Api\KpiCategoryController::class);
