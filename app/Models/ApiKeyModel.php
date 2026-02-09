<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ApiKeyModel extends Pivot
{
    use HasFactory;

    protected $table = 'api_key_models';

    protected $fillable = [
        'api_key_id',
        'llm_model_id',
        'is_verified',
        'last_verified_at',
    ];

    protected $casts = [
        'is_verified' => 'boolean',
        'last_verified_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the API key
     */
    public function apiKey()
    {
        return $this->belongsTo(ApiKey::class);
    }

    /**
     * Get the model
     */
    public function model()
    {
        return $this->belongsTo(LlmModel::class, 'llm_model_id');
    }

    /**
     * Mark model as verified for this key
     */
    public function markVerified(): void
    {
        $this->update([
            'is_verified' => true,
            'last_verified_at' => now(),
        ]);
    }

    /**
     * Mark model as unverified
     */
    public function markUnverified(): void
    {
        $this->update([
            'is_verified' => false,
        ]);
    }

    /**
     * Check if verification is still valid (within 7 days)
     */
    public function isVerificationValid(): bool
    {
        if (!$this->is_verified || !$this->last_verified_at) {
            return false;
        }

        return $this->last_verified_at->diffInDays(now()) <= 7;
    }

    /**
     * Get verification status text
     */
    public function getVerificationStatusAttribute(): string
    {
        if (!$this->is_verified) {
            return 'Unverified';
        }

        if (!$this->isVerificationValid()) {
            return 'Verification expired';
        }

        return 'Verified';
    }

    /**
     * Scope: Get only verified models
     */
    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    /**
     * Scope: Get models needing reverification
     */
    public function scopeNeedsReverification($query)
    {
        return $query->where(function ($q) {
            $q->where('is_verified', false)
                ->orWhere('last_verified_at', '<', now()->subDays(7));
        });
    }
}
