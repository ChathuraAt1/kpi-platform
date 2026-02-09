<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds task carryover and completion tracking for the weekly submission pattern.
     * Tracks:
     * - Which tasks rolled over from previous days
     * - Completion % at day transitions
     * - What was planned each morning
     */
    public function up(): void
    {
        // Add carryover tracking to tasks
        Schema::table('tasks', function (Blueprint $table) {
            $table->date('carryover_from_date')->nullable()->after('due_date');
            // Indicates this task was rolled over from the specified date
            // Used to identify "rollover" vs "new" task distinctions
            
            $table->index(['owner_id', 'carryover_from_date']);
        });

        // Add completion tracking to task_logs for day transitions
        Schema::table('task_logs', function (Blueprint $table) {
            $table->decimal('completion_percent_at_dayend', 5, 2)->nullable()->after('expected_work_hours');
            // Tracks completion % at end of day for carryover suggestions
            
            $table->index(['user_id', 'date', 'completion_percent_at_dayend']);
        });

        // Enhance daily_plans with submission tracking
        Schema::table('daily_plans', function (Blueprint $table) {
            $table->json('planned_task_ids')->nullable()->after('is_finalized');
            // Array of task IDs that were planned for this morning
            
            $table->integer('rollover_count')->default(0)->after('planned_task_ids');
            // Count of tasks carried over from previous day
            
            $table->timestamp('morning_plan_submitted_at')->nullable()->after('finalized_at');
            // When the morning plan was submitted/finalized
            
            $table->timestamp('evening_log_submitted_at')->nullable()->after('morning_plan_submitted_at');
            // When the evening log submission was completed
            
            $table->string('submission_status')->default('pending')->after('evening_log_submitted_at');
            // Status: pending, morning_planned, evening_logged, complete
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['owner_id', 'carryover_from_date']);
            $table->dropColumn('carryover_from_date');
        });

        Schema::table('task_logs', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'date', 'completion_percent_at_dayend']);
            $table->dropColumn('completion_percent_at_dayend');
        });

        Schema::table('daily_plans', function (Blueprint $table) {
            $table->dropColumn([
                'planned_task_ids',
                'rollover_count',
                'morning_plan_submitted_at',
                'evening_log_submitted_at',
                'submission_status'
            ]);
        });
    }
};
