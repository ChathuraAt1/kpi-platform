<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds cascading KPI system for managers/supervisors/HR.
     * Enables tracking of team-based KPI scores and role hierarchy.
     */
    public function up(): void
    {
        // Add management role indicators to job_roles
        Schema::table('job_roles', function (Blueprint $table) {
            $table->boolean('is_management_role')->default(false)->after('name');
            // Indicates this role is for supervisors/managers who score teams
            // Examples: Supervisor, Team Lead, Manager, Director, HR Manager

            $table->string('role_hierarchy_level')->nullable()->after('is_management_role');
            // Tracks position in hierarchy: employee, team_lead, supervisor, manager, director, hr_admin
            // Used for cascading KPI calculations

            $table->index(['is_management_role', 'role_hierarchy_level']);
        });

        // Add team-based KPI fields to monthly_evaluations
        Schema::table('monthly_evaluations', function (Blueprint $table) {
            // Team KPI scores (for managers/supervisors)
            $table->decimal('team_member_avg_score', 5, 2)->nullable()->after('score');
            // Average score of all direct subordinates' evaluations

            $table->json('team_member_scores')->nullable()->after('team_member_avg_score');
            // Array of {user_id, score, category_breakdown} for team members

            $table->integer('team_member_count')->default(0)->after('team_member_scores');
            // Number of direct reports included in team calculation

            $table->decimal('team_member_min_score', 5, 2)->nullable()->after('team_member_count');
            // Lowest score among team members (for risk identification)

            $table->decimal('team_member_max_score', 5, 2)->nullable()->after('team_member_min_score');
            // Highest score among team members

            $table->json('team_kpi_categories')->nullable()->after('team_member_max_score');
            // KPI categories specific to management role (not inherited from job role)
            // Format: [{id, name, weight, assigned_to}, ...]

            $table->decimal('manager_productivity_score', 5, 2)->nullable()->after('team_kpi_categories');
            // Manager's own productivity (time logged, tasks completed)
            // Used in conjunction with team scores for overall manager KPI

            $table->decimal('manager_supervision_effectiveness', 5, 2)->nullable()->after('manager_productivity_score');
            // Calculated from team performance metrics
            // Factor: team cohesion, individual growth, task completion rates

            $table->json('kpi_component_weights')->nullable()->after('manager_supervision_effectiveness');
            // JSON: {team_member_kpi: 0.5, manager_productivity: 0.3, supervision_effectiveness: 0.2}
            // Configurable weights for management role KPI calculation

            $table->index(['user_id', 'year', 'month']);
            $table->index(['team_member_avg_score']);
        });

        // Add hierarchical KPI linkage to users (for cascading scores)
        Schema::table('users', function (Blueprint $table) {
            $table->json('manager_kpi_linkage')->nullable()->after('timezone');
            // Stores which evaluation this employee's KPI contributed to
            // Format: {manager_id, contributed_to_month, contributed_to_year}
            // Used for tracing how employee KPI rolls up to manager KPI

            $table->json('role_specific_kpis')->nullable()->after('manager_kpi_linkage');
            // Role-specific KPI overrides when user's job_role has special KPIs
            // Format: [{category_id, name, weight, is_custom}]
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_roles', function (Blueprint $table) {
            $table->dropIndex(['is_management_role', 'role_hierarchy_level']);
            $table->dropColumn(['is_management_role', 'role_hierarchy_level']);
        });

        Schema::table('monthly_evaluations', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'year', 'month']);
            $table->dropIndex(['team_member_avg_score']);
            $table->dropColumn([
                'team_member_avg_score',
                'team_member_scores',
                'team_member_count',
                'team_member_min_score',
                'team_member_max_score',
                'team_kpi_categories',
                'manager_productivity_score',
                'manager_supervision_effectiveness',
                'kpi_component_weights',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['manager_kpi_linkage', 'role_specific_kpis']);
        });
    }
};
