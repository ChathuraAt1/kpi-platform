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
        Schema::create('task_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->nullable()->constrained('tasks')->onDelete('set null');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->date('date')->index();
            $table->decimal('duration_hours', 5, 2);
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->text('description')->nullable();
            $table->foreignId('kpi_category_id')->nullable()->constrained('kpi_categories')->onDelete('set null');
            $table->json('llm_suggestion')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_logs');
    }
};
