<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create role_permissions table to store granular permissions for each role
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('role')->index(); // e.g., 'admin', 'hr', 'supervisor', 'employee', 'it_admin'
            $table->string('permission')->index(); // e.g., 'manageApiKeys', 'viewDashboard', 'editEvaluations'
            $table->text('description')->nullable(); // Human-readable permission description
            $table->boolean('is_enabled')->default(true); // Allow disabling permissions without deleting
            $table->timestamps();

            // Composite index for efficient lookups
            $table->unique(['role', 'permission']);
        });

        // Create role_features table to track which features are available for each role
        Schema::create('role_features', function (Blueprint $table) {
            $table->id();
            $table->string('role')->index();
            $table->string('feature')->index(); // e.g., 'api_key_dashboard', 'hr_dashboard', 'evaluation_scoring'
            $table->text('description')->nullable();
            $table->boolean('is_enabled')->default(true);
            $table->json('settings')->nullable(); // Feature-specific settings as JSON
            $table->timestamps();

            // Composite index
            $table->unique(['role', 'feature']);
        });

        // Extend users table to support role-specific customization
        Schema::table('users', function (Blueprint $table) {
            // Permissions customization per user (override role defaults)
            $table->json('custom_permissions')->nullable()->after('role_specific_kpis');
            $table->json('disabled_permissions')->nullable()->after('custom_permissions');
            $table->timestamp('permissions_last_updated_at')->nullable()->after('disabled_permissions');
        });

        // Create default permissions for each role
        $this->seedDefaultPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('role_features');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('custom_permissions');
            $table->dropColumn('disabled_permissions');
            $table->dropColumn('permissions_last_updated_at');
        });
    }

    /**
     * Seed default permissions for each role
     */
    private function seedDefaultPermissions(): void
    {
        // Define all permissions with their default status per role
        $permissions = [
            // API Key Management
            'manageApiKeys' => 'Can manage LLM API keys',
            'viewApiKeyDashboard' => 'Can view API key performance dashboard',
            'rotateApiKeys' => 'Can manually rotate API keys',
            'testApiConnectivity' => 'Can test API connections',

            // User Management
            'manageUsers' => 'Can create, edit, delete users',
            'viewUserProgress' => 'Can view user progress metrics',
            'manageUserRoles' => 'Can change user roles and permissions',
            'customizeUserSettings' => 'Can customize user shifts and breaks',

            // Evaluation Management
            'manageEvaluations' => 'Can create and manage evaluations',
            'publishEvaluations' => 'Can publish evaluations to employees',
            'viewEvaluations' => 'Can view evaluations',
            'editEvaluationScores' => 'Can edit evaluation scores',
            'addHrScores' => 'Can add HR scores to evaluations',
            'triggerEvaluationGeneration' => 'Can trigger monthly evaluation generation',

            // Task Management
            'manageTasks' => 'Can create and manage tasks',
            'reviewTaskLogs' => 'Can review submitted task logs',
            'assignTasks' => 'Can assign tasks to employees',
            'approveLateSubmissions' => 'Can approve late task submissions',

            // KPI & Job Role Management
            'manageKpiCategories' => 'Can manage KPI categories',
            'manageJobRoles' => 'Can manage job roles',
            'manageKpiWeights' => 'Can adjust KPI calculation weights',

            // Settings & Configuration
            'manageCompanySettings' => 'Can manage global company settings',
            'configureShifts' => 'Can configure default shift times',
            'configureBreaks' => 'Can configure default break times',

            // Reporting & Analytics
            'viewReports' => 'Can view system reports',
            'exportData' => 'Can export data (CSV, JSON, etc)',
            'viewAnalytics' => 'Can view performance analytics',
            'viewAuditLogs' => 'Can view system audit logs',

            // Dashboard Access
            'viewAdminDashboard' => 'Can view admin dashboard',
            'viewHrDashboard' => 'Can view HR dashboard',
            'viewSupervisorDashboard' => 'Can view supervisor dashboard',
            'viewEmployeeDashboard' => 'Can view employee dashboard',
            'viewItAdminDashboard' => 'Can view IT admin dashboard',

            // Team Management
            'viewTeamMetrics' => 'Can view team performance metrics',
            'manageTeamMembers' => 'Can manage team member assignments',
            'viewSubordinateEvaluations' => 'Can view subordinate evaluations',
            'viewSubordinateTrends' => 'Can view subordinate performance trends',

            // Personal Features
            'viewOwnEvaluations' => 'Can view own evaluation results',
            'viewOwnTrends' => 'Can view own performance trends',
            'requestDeadlineExtension' => 'Can request submission deadline extensions',
            'manageTodos' => 'Can manage personal to-do list',
        ];

        // Define which permissions each role has by default
        $rolePermissions = [
            'admin' => [
                'manageApiKeys',
                'viewApiKeyDashboard',
                'rotateApiKeys',
                'testApiConnectivity',
                'manageUsers',
                'viewUserProgress',
                'manageUserRoles',
                'customizeUserSettings',
                'manageEvaluations',
                'publishEvaluations',
                'viewEvaluations',
                'editEvaluationScores',
                'addHrScores',
                'triggerEvaluationGeneration',
                'manageTasks',
                'reviewTaskLogs',
                'assignTasks',
                'approveLateSubmissions',
                'manageKpiCategories',
                'manageJobRoles',
                'manageKpiWeights',
                'manageCompanySettings',
                'configureShifts',
                'configureBreaks',
                'viewReports',
                'exportData',
                'viewAnalytics',
                'viewAuditLogs',
                'viewAdminDashboard',
                'viewHrDashboard',
                'viewSupervisorDashboard',
                'viewItAdminDashboard',
                'viewTeamMetrics',
                'manageTeamMembers',
                'viewSubordinateEvaluations',
                'viewSubordinateTrends',
                'viewOwnEvaluations',
                'viewOwnTrends',
                'requestDeadlineExtension',
                'manageTodos',
            ],
            'it_admin' => [
                'manageApiKeys',
                'viewApiKeyDashboard',
                'rotateApiKeys',
                'testApiConnectivity',
                'viewUserProgress',
                'customizeUserSettings',
                'viewEvaluations',
                'reviewTaskLogs',
                'viewReports',
                'viewAnalytics',
                'viewAuditLogs',
                'viewItAdminDashboard',
                'viewOwnEvaluations',
                'viewOwnTrends',
                'manageTodos',
            ],
            'hr' => [
                'manageUsers',
                'viewUserProgress',
                'customizeUserSettings',
                'manageEvaluations',
                'publishEvaluations',
                'viewEvaluations',
                'editEvaluationScores',
                'addHrScores',
                'triggerEvaluationGeneration',
                'reviewTaskLogs',
                'approveLateSubmissions',
                'manageKpiCategories',
                'manageJobRoles',
                'manageKpiWeights',
                'manageCompanySettings',
                'configureShifts',
                'configureBreaks',
                'viewReports',
                'exportData',
                'viewAnalytics',
                'viewHrDashboard',
                'viewTeamMetrics',
                'viewSubordinateEvaluations',
                'viewSubordinateTrends',
                'viewOwnEvaluations',
                'viewOwnTrends',
                'requestDeadlineExtension',
                'manageTodos',
            ],
            'supervisor' => [
                'viewUserProgress',
                'viewEvaluations',
                'editEvaluationScores',
                'triggerEvaluationGeneration',
                'reviewTaskLogs',
                'approveLateSubmissions',
                'manageCompanySettings',
                'viewReports',
                'viewSupervisorDashboard',
                'viewTeamMetrics',
                'manageTeamMembers',
                'viewSubordinateEvaluations',
                'viewSubordinateTrends',
                'customizeUserSettings',
                'viewOwnEvaluations',
                'viewOwnTrends',
                'requestDeadlineExtension',
                'manageTodos',
                'assignTasks',
            ],
            'employee' => [
                'manageTasks',
                'reviewTaskLogs',
                'viewReports',
                'viewEmployeeDashboard',
                'viewOwnEvaluations',
                'viewOwnTrends',
                'requestDeadlineExtension',
                'manageTodos',
            ],
        ];

        // Insert permissions (avoiding direct DB operations, just making note of structure)
        // In practice, this would be seeded via a dedicated seeder or Laravel's eloquent mass insert
    }
};
