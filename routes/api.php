

<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskLogController;
use App\Http\Controllers\Api\TodoController;
use App\Http\Controllers\Api\ApiKeyController;
use App\Http\Controllers\Api\UserController; // Added this line
use App\Http\Controllers\Api\ServerTimeController;

// Public server time used for client fallback/time sync
Route::get('/server-time', [ServerTimeController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [App\Http\Controllers\Api\AuthController::class, 'me']);
    Route::get('tasks/plan', [TaskController::class, 'getPlan']);
    Route::get('tasks/plan-status', [TaskController::class, 'getPlanStatus']);
    Route::post('tasks/plan', [TaskController::class, 'storePlan']);
    Route::get('user/progress', [UserController::class, 'progress']);
    Route::put('user/profile', [UserController::class, 'updateProfile']);
    Route::apiResource('tasks', TaskController::class);
    Route::apiResource('todos', TodoController::class);

    Route::get('task-logs', [TaskLogController::class, 'index']);
    Route::get('task-logs/daily-template', [TaskLogController::class, 'getDailyTemplate']);
    Route::get('task-logs/status/submission', [TaskLogController::class, 'submissionStatus']);
    Route::post('task-logs', [TaskLogController::class, 'store']);
    Route::get('task-logs/{id}', [TaskLogController::class, 'show']);
    // Deprecated: per-task approve/reject workflow removed — supervisors no longer approve individual logs
    Route::post('task-logs/{id}/supervisor-score', [TaskLogController::class, 'saveSupervisorScore']);

    Route::apiResource('api-keys', ApiKeyController::class);
    Route::post('api-keys/health-check', [ApiKeyController::class, 'healthCheckAll'])->middleware('can:manageApiKeys');
    Route::post('evaluations/trigger', [\App\Http\Controllers\Api\EvaluationController::class, 'trigger'])->middleware('can:manageEvaluations');
    Route::get('evaluations', [\App\Http\Controllers\Api\EvaluationController::class, 'list'])->middleware('can:viewEvaluations');
    // Deprecated: evaluation approve endpoint removed — supervisor scoring handled via other flows
    Route::post('evaluations/{evaluation}/publish', [\App\Http\Controllers\Api\EvaluationController::class, 'publish'])->middleware('can:publishEvaluations');

    // user management
    Route::get('users', [\App\Http\Controllers\Api\UserController::class, 'index'])->middleware('can:manageUsers');
    Route::patch('users/{id}', [\App\Http\Controllers\Api\UserController::class, 'update'])->middleware('can:manageUsers');
    Route::get('users/{id}/progress', [\App\Http\Controllers\Api\UserController::class, 'progress'])->middleware('auth');

    // admin reports
    Route::get('submissions/missing', [\App\Http\Controllers\Api\ReportingController::class, 'missingSubmissions'])->middleware('can:manageUsers');
    Route::get('submissions/trend', [\App\Http\Controllers\Api\ReportingController::class, 'submissionTrend'])->middleware('can:manageUsers');

    Route::get('global-settings', [\App\Http\Controllers\Api\GlobalSettingController::class, 'index']);
    Route::put('global-settings/{key}', [\App\Http\Controllers\Api\GlobalSettingController::class, 'update']);

    // KPI categories management
    Route::apiResource('kpi-categories', \App\Http\Controllers\Api\KpiCategoryController::class);
    Route::apiResource('job-roles', \App\Http\Controllers\Api\JobRoleController::class);
});
