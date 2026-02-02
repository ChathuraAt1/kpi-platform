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
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('assignee_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('parent_id')->nullable()->constrained('tasks')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('kpi_category_id')->nullable()->constrained('kpi_categories')->onDelete('set null');
            $table->decimal('planned_hours', 5, 2)->nullable();
            $table->string('status')->default('open');
            $table->date('due_date')->nullable();
            $table->string('recurrence_rule')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
