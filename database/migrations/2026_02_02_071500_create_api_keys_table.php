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
        Schema::create('api_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('provider');
            $table->string('name');
            $table->text('encrypted_key');
            $table->integer('priority')->default(10);
            $table->json('meta')->nullable();
            $table->integer('daily_quota')->nullable();
            $table->integer('daily_usage')->default(0);
            $table->string('status')->default('active');
            $table->timestamp('last_checked_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('api_keys');
    }
};
