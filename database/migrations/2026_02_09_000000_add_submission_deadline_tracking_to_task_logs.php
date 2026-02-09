<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('task_logs', function (Blueprint $table) {
            // Submission tracking
            $table->timestamp('submitted_at')->nullable()->after('approved_at')->comment('When task log was submitted');
            $table->boolean('is_late')->default(false)->after('submitted_at')->comment('Was submission after 11 PM deadline?');
            $table->string('submission_type')->nullable()->after('is_late')->comment('[morning_plan, evening_log]');
            $table->json('submission_metadata')->nullable()->after('submission_type')->comment('deadline, submitted_time, minutes_late, etc');
            
            // Submission validation fields
            $table->decimal('total_hours_logged', 5, 2)->nullable()->after('submission_metadata')->comment('Sum of all duration_hours for the day');
            $table->decimal('break_hours_deducted', 4, 2)->nullable()->after('total_hours_logged')->comment('Auto-calculated break time to deduct');
            $table->decimal('expected_work_hours', 5, 2)->nullable()->after('break_hours_deducted')->comment('Shift hours minus breaks');
            $table->json('time_gaps')->nullable()->after('expected_work_hours')->comment('Uncovered periods in work day');
            
            // Add index for faster queries
            $table->index(['user_id', 'date', 'is_late']);
            $table->index(['submitted_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('task_logs', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'date', 'is_late']);
            $table->dropIndex(['submitted_at']);
            $table->dropColumn([
                'submitted_at',
                'is_late',
                'submission_type',
                'submission_metadata',
                'total_hours_logged',
                'break_hours_deducted',
                'expected_work_hours',
                'time_gaps'
            ]);
        });
    }
};
