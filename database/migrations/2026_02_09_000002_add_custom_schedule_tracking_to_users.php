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
        Schema::table('users', function (Blueprint $table) {
            // Add fields to track if user has customized their schedule
            $table->boolean('has_custom_schedule')->default(false)->after('breaks')->index();
            $table->timestamp('schedule_customized_at')->nullable()->after('has_custom_schedule');
        });

        Schema::table('task_logs', function (Blueprint $table) {
            // Add fields to track break time usage per log
            $table->json('breaks_used')->nullable()->after('time_gaps')->comment('Array of breaks actually taken: [{start, end, label}]');
            $table->decimal('actual_break_duration', 4, 2)->nullable()->after('breaks_used')->comment('Total hours of actual breaks taken');
            $table->decimal('time_in_work', 4, 2)->nullable()->after('actual_break_duration')->comment('Total time logged (end_time - start_time - breaks)');

            // Index for querying logs with custom break patterns
            $table->index(['user_id', 'date', 'actual_break_duration']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('task_logs', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'date', 'actual_break_duration']);
            $table->dropColumn([
                'breaks_used',
                'actual_break_duration',
                'time_in_work',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['has_custom_schedule']);
            $table->dropColumn([
                'has_custom_schedule',
                'schedule_customized_at',
            ]);
        });
    }
};
