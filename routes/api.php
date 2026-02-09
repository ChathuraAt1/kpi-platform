

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

    // API Key quota management routes
    Route::get('api-keys/{id}/quota-status', [ApiKeyController::class, 'getQuotaStatus'])->middleware('can:manageApiKeys');
    Route::get('api-keys/{id}/usage-history', [ApiKeyController::class, 'getUsageHistory'])->middleware('can:manageApiKeys');
    Route::get('api-keys/available-models', [ApiKeyController::class, 'getAvailableModels'])->middleware('can:manageApiKeys');
    Route::post('api-keys/{id}/verify-models', [ApiKeyController::class, 'verifyKeyModels'])->middleware('can:manageApiKeys');
    Route::post('api-keys/{id}/rotate', [ApiKeyController::class, 'rotateKey'])->middleware('can:manageApiKeys');

    Route::post('evaluations/trigger', [\App\Http\Controllers\Api\EvaluationController::class, 'trigger'])->middleware('can:manageEvaluations');
    Route::get('evaluations', [\App\Http\Controllers\Api\EvaluationController::class, 'list'])->middleware('can:viewEvaluations');
    // Deprecated: evaluation approve endpoint removed — supervisor scoring handled via other flows
    Route::post('evaluations/{evaluation}/publish', [\App\Http\Controllers\Api\EvaluationController::class, 'publish'])->middleware('can:publishEvaluations');
    // HR & Analytics endpoints for HR dashboard
    Route::get('evaluations/pending-hr', [\App\Http\Controllers\Api\EvaluationController::class, 'pendingHr']);
    Route::get('evaluations/ready-to-publish', [\App\Http\Controllers\Api\EvaluationController::class, 'readyToPublish']);
    Route::get('evaluations/heatmap', [\App\Http\Controllers\Api\EvaluationController::class, 'heatmap']);
    Route::get('evaluations/role-trends', [\App\Http\Controllers\Api\EvaluationController::class, 'roleTrends']);
    Route::get('evaluations/turnover-risk', [\App\Http\Controllers\Api\EvaluationController::class, 'turnoverRisk']);

    // user management
    Route::get('users', [\App\Http\Controllers\Api\UserController::class, 'index'])->middleware('can:manageUsers');
    Route::patch('users/{id}', [\App\Http\Controllers\Api\UserController::class, 'update'])->middleware('can:manageUsers');
    Route::get('users/{id}/progress', [\App\Http\Controllers\Api\UserController::class, 'progress'])->middleware('auth');

    // Role and permission management
    Route::prefix('roles')->middleware('can:manageUsers')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\RolePermissionController::class, 'getAllRolesWithPermissions']);
        Route::get('{role}/permissions', [\App\Http\Controllers\Api\RolePermissionController::class, 'getRolePermissions']);
        Route::put('{role}/permissions', [\App\Http\Controllers\Api\RolePermissionController::class, 'updateRolePermissions']);
        Route::post('{role}/permissions/{permission}/enable', [\App\Http\Controllers\Api\RolePermissionController::class, 'enablePermission']);
        Route::post('{role}/permissions/{permission}/disable', [\App\Http\Controllers\Api\RolePermissionController::class, 'disablePermission']);

        Route::get('{role}/features', [\App\Http\Controllers\Api\RolePermissionController::class, 'getRoleFeatures']);
        Route::post('{role}/features/{feature}/enable', [\App\Http\Controllers\Api\RolePermissionController::class, 'enableFeature']);
        Route::post('{role}/features/{feature}/disable', [\App\Http\Controllers\Api\RolePermissionController::class, 'disableFeature']);
    });

    // User-specific permissions
    Route::prefix('user-permissions')->middleware('can:manageUsers')->group(function () {
        Route::get('{user}/permissions', [\App\Http\Controllers\Api\RolePermissionController::class, 'getUserPermissions']);
        Route::post('{user}/grant', [\App\Http\Controllers\Api\RolePermissionController::class, 'grantUserPermission']);
        Route::post('{user}/revoke', [\App\Http\Controllers\Api\RolePermissionController::class, 'revokeUserPermission']);
        Route::post('{user}/reset', [\App\Http\Controllers\Api\RolePermissionController::class, 'resetUserPermissions']);
    });

    // Audit logs
    Route::get('permissions/audit-log', [\App\Http\Controllers\Api\RolePermissionController::class, 'getPermissionAuditLog'])->middleware('can:manageUsers');

    // admin reports
    Route::get('submissions/missing', [\App\Http\Controllers\Api\ReportingController::class, 'missingSubmissions'])->middleware('can:manageUsers');
    Route::get('submissions/trend', [\App\Http\Controllers\Api\ReportingController::class, 'submissionTrend'])->middleware('can:manageUsers');
    Route::get('submissions/today', [\App\Http\Controllers\Api\ReportingController::class, 'submissionStatusToday'])->middleware('can:manageUsers');
    Route::get('api-keys/health', [\App\Http\Controllers\Api\ReportingController::class, 'apiKeyHealth'])->middleware('can:manageApiKeys');
    Route::get('llm/classification-stats', [\App\Http\Controllers\Api\ReportingController::class, 'llmClassificationStats'])->middleware('can:manageUsers');
    Route::get('dashboard/metrics', [\App\Http\Controllers\Api\ReportingController::class, 'adminDashboardMetrics'])->middleware('can:manageUsers');
    Route::get('audit-logs/summary', [\App\Http\Controllers\Api\ReportingController::class, 'auditLogSummary'])->middleware('can:manageUsers');

    Route::get('global-settings', [\App\Http\Controllers\Api\GlobalSettingController::class, 'index']);
    Route::put('global-settings/{key}', [\App\Http\Controllers\Api\GlobalSettingController::class, 'update']);

    // KPI categories management
    Route::apiResource('kpi-categories', \App\Http\Controllers\Api\KpiCategoryController::class);
    Route::apiResource('job-roles', \App\Http\Controllers\Api\JobRoleController::class);
});
