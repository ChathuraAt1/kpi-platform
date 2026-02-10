<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds three-score evaluation system with HR and Supervisor scores.
     * Tracks individual scores, remarks, and final calculated score.
     */
    public function up(): void
    {
        Schema::table('monthly_evaluations', function (Blueprint $table) {
            // Three-score system: Rule-based, LLM-based, HR score, Supervisor score
            $table->decimal('rule_based_score', 5, 2)->nullable()->after('score');
            // Rule-based score calculated from task completion and weights

            $table->decimal('llm_based_score', 5, 2)->nullable()->after('rule_based_score');
            // LLM-based score from AI analysis of tasks

            $table->decimal('hr_score', 5, 2)->nullable()->after('llm_based_score');
            // Optional score added by HR (0-100)

            $table->decimal('supervisor_score', 5, 2)->nullable()->after('hr_score');
            // Optional score added by Supervisor (0-100)

            // Remarks and comments
            $table->text('hr_remarks')->nullable()->after('supervisor_score');
            // Optional comments from HR

            $table->text('supervisor_remarks')->nullable()->after('hr_remarks');
            // Optional comments from Supervisor

            // Score calculation metadata
            $table->json('score_components')->nullable()->after('supervisor_remarks');
            // JSON: {rule_based: 85, llm_based: 82, hr: 88, supervisor: 85, final: 85}
            // Tracks all individual scores and how final was calculated

            $table->string('score_calculation_method')->nullable()->after('score_components');
            // How final score was calculated: 'two_score' (rule+llm), 'three_score' (rule+llm+hr), 
            // 'four_score' (rule+llm+hr+supervisor), 'average' (simple average), 'weighted' (weighted average)

            $table->integer('score_input_count')->default(0)->after('score_calculation_method');
            // Count of non-null scores: 2, 3, or 4

            $table->timestamp('hr_scored_at')->nullable()->after('score_input_count');
            // When HR added their score

            $table->timestamp('supervisor_scored_at')->nullable()->after('hr_scored_at');
            // When Supervisor added their score

            $table->foreignId('hr_scored_by')->nullable()->constrained('users')->onDelete('set null');
            // Which HR user added the score

            $table->foreignId('supervisor_scored_by')->nullable()->constrained('users', 'id')->onDelete('set null');
            // Which Supervisor user added the score

            $table->boolean('is_finalized')->default(false)->after('supervisor_scored_by');
            // Mark when all scores submitted and final score locked

            $table->timestamp('finalized_at')->nullable()->after('is_finalized');
            // When evaluation was finalized

            // Indexes for efficient querying
            // NOTE: unique constraint on [user_id, year, month] already exists from original migration
            $table->index(['is_finalized', 'status']);
            $table->index(['hr_score']);
            $table->index(['supervisor_score']);
        });

        // Comment history/audit trail for evaluation remarks
        Schema::create('evaluation_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->constrained('monthly_evaluations')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->text('content');
            $table->string('type')->default('remark'); // 'remark', 'mention', 'status_change'
            $table->json('mentions')->nullable(); // [{user_id, name}] for @mentions
            $table->timestamps();

            $table->index(['evaluation_id', 'created_at']);
            $table->index(['user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_comments');

        Schema::table('monthly_evaluations', function (Blueprint $table) {
            // Don't drop the unique constraint on [user_id, year, month] - it's from original migration
            $table->dropIndex(['is_finalized', 'status']);
            $table->dropIndex(['hr_score']);
            $table->dropIndex(['supervisor_score']);

            $table->dropForeign(['hr_scored_by']);
            $table->dropForeign(['supervisor_scored_by']);

            $table->dropColumn([
                'rule_based_score',
                'llm_based_score',
                'hr_score',
                'supervisor_score',
                'hr_remarks',
                'supervisor_remarks',
                'score_components',
                'score_calculation_method',
                'score_input_count',
                'hr_scored_at',
                'supervisor_scored_at',
                'hr_scored_by',
                'supervisor_scored_by',
                'is_finalized',
                'finalized_at',
            ]);
        });
    }
};
