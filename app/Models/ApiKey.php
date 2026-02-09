<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiKey extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'provider',
        'model',
        'base_url',
        'name',
        'encrypted_key',
        'priority',
        'meta',
        'daily_quota',
        'daily_usage',
        'status',
        'last_checked_at',
        'failure_count',
        'cooldown_until',
        'last_usage_reset_at',
        'available_models',
        'preferred_model',
        'rotation_priority',
        'auto_rotate_on_limit',
        'quota_warning_threshold',
        'quota_warning_sent_at',
        'supports_self_signed_certs',
    ];

    protected $casts = [
        'meta' => 'array',
        'last_checked_at' => 'datetime',
        'cooldown_until' => 'datetime',
        'available_models' => 'array',
        'last_usage_reset_at' => 'datetime',
        'quota_warning_sent_at' => 'datetime',
        'daily_usage' => 'integer',
        'daily_quota' => 'integer',
        'rotation_priority' => 'integer',
        'auto_rotate_on_limit' => 'boolean',
        'quota_warning_threshold' => 'float',
        'supports_self_signed_certs' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function usageLogs()
    {
        return $this->hasMany(ApiKeyUsageLog::class, 'api_key_id');
    }

    public function models()
    {
        return $this->belongsToMany(LlmModel::class, 'api_key_models', 'api_key_id', 'llm_model_id')
            ->withPivot('is_verified', 'last_verified_at')
            ->withTimestamps();
    }

    /**
     * Record API usage for this key
     */
    public function recordUsage(int $tokenCount = 0, bool $isError = false, ?float $responseTimeMs = null): void
    {
        // Reset daily usage if needed
        if ($this->shouldResetDailyUsage()) {
            $this->daily_usage = 0;
            $this->last_usage_reset_at = now();
        }

        // Increment daily usage
        $this->daily_usage++;
        $this->save();

        // Log to usage analytics
        ApiKeyUsageLog::updateOrCreate(
            ['api_key_id' => $this->id, 'usage_date' => now()->toDateString()],
            [
                'call_count' => \DB::raw('call_count + 1'),
                'token_usage' => \DB::raw("token_usage + {$tokenCount}"),
                'error_count' => $isError ? \DB::raw('error_count + 1') : null,
            ]
        );

        // Check quota warning
        if ($this->isQuotaWarningNeeded()) {
            $this->sendQuotaWarning();
        }

        // Check if rotation needed
        if ($this->isQuotaExceeded() && $this->auto_rotate_on_limit) {
            $this->rotateToNextKey();
        }
    }

    /**
     * Check if daily usage should be reset
     */
    public function shouldResetDailyUsage(): bool
    {
        if (!$this->last_usage_reset_at) {
            return false;
        }

        return !$this->last_usage_reset_at->isToday();
    }

    /**
     * Check if quota is exceeded
     */
    public function isQuotaExceeded(): bool
    {
        if (!$this->daily_quota) {
            return false; // No quota limit
        }

        return $this->daily_usage >= $this->daily_quota;
    }

    /**
     * Get remaining quota for today
     */
    public function getRemainingQuota(): ?int
    {
        if (!$this->daily_quota) {
            return null;
        }

        return max(0, $this->daily_quota - $this->daily_usage);
    }

    /**
     * Get quota usage as percentage
     */
    public function getQuotaPercentage(): float
    {
        if (!$this->daily_quota) {
            return 0;
        }

        return round(($this->daily_usage / $this->daily_quota) * 100, 2);
    }

    /**
     * Check if quota warning should be sent
     */
    public function isQuotaWarningNeeded(): bool
    {
        if (!$this->daily_quota || !$this->quota_warning_threshold) {
            return false;
        }

        $percentage = $this->getQuotaPercentage();

        // Send warning if not sent today and threshold exceeded
        $warningNotSentToday = !$this->quota_warning_sent_at || !$this->quota_warning_sent_at->isToday();

        return $percentage >= $this->quota_warning_threshold && $warningNotSentToday;
    }

    /**
     * Send quota warning alert
     */
    public function sendQuotaWarning(): void
    {
        $percentage = $this->getQuotaPercentage();

        // Log warning (can be extended to send email, notification, etc.)
        \Log::warning("API Key quota warning", [
            'key_id' => $this->id,
            'provider' => $this->provider,
            'usage_percentage' => $percentage,
            'daily_usage' => $this->daily_usage,
            'daily_quota' => $this->daily_quota,
        ]);

        $this->quota_warning_sent_at = now();
        $this->save();
    }

    /**
     * Rotate to next available key
     */
    public function rotateToNextKey(): void
    {
        // Find next available key by rotation priority
        $nextKey = self::where('provider', $this->provider)
            ->where('id', '!=', $this->id)
            ->where('is_active', true)
            ->whereNull('cooldown_until')
            ->orWhere('cooldown_until', '<', now())
            ->orderByDesc('rotation_priority')
            ->orderBy('daily_usage')
            ->first();

        if ($nextKey) {
            // Mark this key as rotated
            $this->update(['is_active' => false]);

            // Mark next key as active
            $nextKey->update(['is_active' => true]);

            \Log::info("API Key rotated", [
                'from_key_id' => $this->id,
                'to_key_id' => $nextKey->id,
                'provider' => $this->provider,
            ]);
        }
    }

    /**
     * Get usage stats for today
     */
    public function getTodayStats(): array
    {
        $log = $this->usageLogs()
            ->where('usage_date', now()->toDateString())
            ->first();

        return [
            'daily_usage' => $this->daily_usage,
            'daily_quota' => $this->daily_quota,
            'remaining' => $this->getRemainingQuota(),
            'percentage' => $this->getQuotaPercentage(),
            'call_count' => $log?->call_count ?? 0,
            'token_usage' => $log?->token_usage ?? 0,
            'error_count' => $log?->error_count ?? 0,
            'avg_response_time_ms' => $log?->avg_response_time_ms ?? 0,
        ];
    }

    /**
     * Get available models for this key
     */
    public function getAvailableModelsAttribute(): array
    {
        if ($this->attributes['available_models']) {
            return json_decode($this->attributes['available_models'], true);
        }

        // Discover or return empty
        return [];
    }

    /**
     * Set preferred model
     */
    public function setPreferredModel(string $modelName): self
    {
        $this->preferred_model = $modelName;
        return $this;
    }

    /**
     * Scope: Get only active keys
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('cooldown_until')
                    ->orWhere('cooldown_until', '<', now());
            });
    }

    /**
     * Scope: Get keys by provider
     */
    public function scopeByProvider($query, string $provider)
    {
        return $query->where('provider', $provider);
    }

    /**
     * Scope: Get keys under quota
     */
    public function scopeUnderQuota($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('daily_quota')
                ->orWhereRaw('daily_usage < daily_quota');
        });
    }
}
