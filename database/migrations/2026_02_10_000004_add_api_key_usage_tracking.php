<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds API key usage tracking, model discovery, and cooldown management
     */
    public function up(): void
    {
        // Track daily API usage and quota status
        Schema::table('api_keys', function (Blueprint $table) {
            $table->integer('daily_usage')->default(0)->after('cooldown_until');
            // Daily API call count (resets at midnight)

            $table->integer('daily_quota')->nullable()->after('daily_usage');
            // Maximum calls allowed per day (null = unlimited)

            $table->timestamp('last_usage_reset_at')->nullable()->after('daily_quota');
            // Last time daily usage counter was reset

            $table->json('available_models')->nullable()->after('last_usage_reset_at');
            // Array of available models for this key: [{name, description, max_tokens}, ...]

            $table->string('preferred_model')->nullable()->after('available_models');
            // Model name to use by default for this key

            $table->integer('rotation_priority')->default(0)->after('preferred_model');
            // Priority for automatic rotation (higher = preferred when rotating)

            $table->boolean('auto_rotate_on_limit')->default(true)->after('rotation_priority');
            // Whether to auto-rotate to next key when quota is hit

            $table->decimal('quota_warning_threshold', 5, 2)->default(80)->after('auto_rotate_on_limit');
            // Trigger warning alert when usage exceeds this % (0-100)

            $table->timestamp('quota_warning_sent_at')->nullable()->after('quota_warning_threshold');
            // Last time quota warning was sent

            $table->boolean('supports_self_signed_certs')->default(false)->after('quota_warning_sent_at');
            // For on-premises custom endpoints: allow self-signed SSL certs

            $table->index(['daily_usage', 'daily_quota', 'provider']);
            $table->index(['auto_rotate_on_limit', 'is_active']);
        });

        // Detailed API usage analytics per key
        Schema::create('api_key_usage_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('api_key_id')->constrained('api_keys')->onDelete('cascade');
            $table->date('usage_date');
            // Date of usage (for daily aggregation)

            $table->integer('call_count')->default(1);
            // Number of API calls made

            $table->integer('token_usage')->default(0);
            // Total tokens consumed (if applicable)

            $table->integer('error_count')->default(0);
            // Failed API calls

            $table->decimal('avg_response_time_ms', 8, 2)->default(0);
            // Average response time in milliseconds

            $table->string('last_error')->nullable();
            // Last error message encountered

            $table->json('models_used')->nullable();
            // Array of models used: {model_name: call_count}

            $table->timestamps();

            $table->unique(['api_key_id', 'usage_date']);
            $table->index(['usage_date']);
        });

        // Model discovery and availability tracking
        Schema::create('llm_models', function (Blueprint $table) {
            $table->id();
            $table->string('provider');
            // Provider name: openai, gemini, groq, deepseek, huggingface, azure_openai, local

            $table->string('model_name')->unique();
            // Model identifier from provider

            $table->string('display_name');
            // Human-readable name

            $table->text('description')->nullable();
            // What this model is good for

            $table->integer('context_window')->default(4096);
            // Max context size in tokens

            $table->integer('max_tokens')->default(2048);
            // Max output tokens

            $table->json('capabilities')->nullable();
            // Array: [text, chat, vision, function_calling, etc.]

            $table->decimal('input_cost_per_1k_tokens', 10, 8)->nullable();
            // Cost per 1000 input tokens

            $table->decimal('output_cost_per_1k_tokens', 10, 8)->nullable();
            // Cost per 1000 output tokens

            $table->boolean('is_active')->default(true);
            // Whether this model is available for use

            $table->timestamp('last_verified_at')->nullable();
            // Last time model availability was verified

            $table->timestamps();

            $table->index(['provider', 'is_active']);
            $table->index(['model_name', 'provider']);
        });

        // Map API keys to available models
        Schema::create('api_key_models', function (Blueprint $table) {
            $table->id();
            $table->foreignId('api_key_id')->constrained('api_keys')->onDelete('cascade');
            $table->foreignId('llm_model_id')->constrained('llm_models')->onDelete('cascade');
            // Which models this key can use

            $table->boolean('is_verified')->default(false);
            // Model availability verified for this key

            $table->timestamp('last_verified_at')->nullable();
            // When verification last occurred

            $table->timestamps();

            $table->unique(['api_key_id', 'llm_model_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('api_key_models');
        Schema::dropIfExists('llm_models');
        Schema::dropIfExists('api_key_usage_logs');

        Schema::table('api_keys', function (Blueprint $table) {
            $table->dropIndex(['daily_usage', 'daily_quota', 'provider']);
            $table->dropIndex(['auto_rotate_on_limit', 'is_active']);

            $table->dropColumn([
                'daily_usage',
                'daily_quota',
                'last_usage_reset_at',
                'available_models',
                'preferred_model',
                'rotation_priority',
                'auto_rotate_on_limit',
                'quota_warning_threshold',
                'quota_warning_sent_at',
                'supports_self_signed_certs',
            ]);
        });
    }
};
