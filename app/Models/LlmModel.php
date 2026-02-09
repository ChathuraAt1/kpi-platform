<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LlmModel extends Model
{
    use HasFactory;

    protected $table = 'llm_models';

    protected $fillable = [
        'provider',
        'model_name',
        'display_name',
        'description',
        'capabilities',
        'context_window',
        'max_tokens',
        'cost_per_1k_tokens',
        'is_available',
        'last_verified_at',
    ];

    protected $casts = [
        'capabilities' => 'array',
        'context_window' => 'integer',
        'max_tokens' => 'integer',
        'cost_per_1k_tokens' => 'float',
        'is_available' => 'boolean',
        'last_verified_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get API keys that have this model
     */
    public function apiKeys()
    {
        return $this->belongsToMany(ApiKey::class, 'api_key_models', 'llm_model_id', 'api_key_id')
            ->withPivot('is_verified', 'last_verified_at')
            ->withTimestamps();
    }

    /**
     * Check if model has specific capability
     */
    public function hasCapability(string $capability): bool
    {
        return in_array($capability, $this->capabilities ?? []);
    }

    /**
     * Get all capabilities as human-readable string
     */
    public function getCapabilitiesStringAttribute(): string
    {
        return implode(', ', $this->capabilities ?? []);
    }

    /**
     * Calculate cost based on token count
     */
    public function calculateCost(int $tokenCount): float
    {
        if ($this->cost_per_1k_tokens === null) {
            return 0;
        }

        return round(($tokenCount / 1000) * $this->cost_per_1k_tokens, 4);
    }

    /**
     * Verify this model is available and working
     */
    public function verify(): bool
    {
        // This will be called by the provider to test connectivity
        // For now, just update the verification timestamp
        $this->update([
            'is_available' => true,
            'last_verified_at' => now(),
        ]);

        return true;
    }

    /**
     * Mark model as unavailable
     */
    public function markUnavailable(string $reason = null): void
    {
        $this->update(['is_available' => false]);

        \Log::warning("LLM Model marked unavailable", [
            'provider' => $this->provider,
            'model' => $this->model_name,
            'reason' => $reason,
        ]);
    }

    /**
     * Scope: Get only available models
     */
    public function scopeAvailable($query)
    {
        return $query->where('is_available', true);
    }

    /**
     * Scope: Get models by provider
     */
    public function scopeByProvider($query, string $provider)
    {
        return $query->where('provider', $provider);
    }

    /**
     * Scope: Get models with specific capability
     */
    public function scopeWithCapability($query, string $capability)
    {
        return $query->whereJsonContains('capabilities', $capability);
    }

    /**
     * Scope: Get models verified after specific date
     */
    public function scopeRecentlyVerified($query, $days = 7)
    {
        return $query->where('last_verified_at', '>=', now()->subDays($days));
    }

    /**
     * Get all unique providers
     */
    public static function getProviders(): array
    {
        return self::distinct('provider')->pluck('provider')->toArray();
    }

    /**
     * Get models grouped by provider
     */
    public static function groupedByProvider(): array
    {
        return self::available()
            ->get()
            ->groupBy('provider')
            ->mapWithKeys(function ($group, $provider) {
                return [
                    $provider => $group->map(fn($model) => [
                        'id' => $model->id,
                        'name' => $model->model_name,
                        'display_name' => $model->display_name,
                        'context_window' => $model->context_window,
                        'capabilities' => $model->capabilities,
                    ])->toArray(),
                ];
            })
            ->toArray();
    }
}
