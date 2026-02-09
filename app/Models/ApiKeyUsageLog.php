<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiKeyUsageLog extends Model
{
    use HasFactory;

    protected $table = 'api_key_usage_logs';

    protected $fillable = [
        'api_key_id',
        'usage_date',
        'call_count',
        'token_usage',
        'error_count',
        'response_time_total_ms',
        'models_used',
    ];

    protected $casts = [
        'usage_date' => 'date',
        'call_count' => 'integer',
        'token_usage' => 'integer',
        'error_count' => 'integer',
        'response_time_total_ms' => 'float',
        'models_used' => 'array',
    ];

    /**
     * Get the API key this log belongs to
     */
    public function apiKey()
    {
        return $this->belongsTo(ApiKey::class);
    }

    /**
     * Get average response time for this log entry
     */
    public function getAverageResponseTimeAttribute(): float
    {
        if ($this->call_count === 0) {
            return 0;
        }

        return round($this->response_time_total_ms / $this->call_count, 2);
    }

    /**
     * Get error rate percentage
     */
    public function getErrorRateAttribute(): float
    {
        if ($this->call_count === 0) {
            return 0;
        }

        return round(($this->error_count / $this->call_count) * 100, 2);
    }

    /**
     * Get average tokens per call
     */
    public function getAverageTokensPerCallAttribute(): float
    {
        if ($this->call_count === 0) {
            return 0;
        }

        return round($this->token_usage / $this->call_count, 2);
    }

    /**
     * Get models used today as array
     */
    public function getModelsUsedArray(): array
    {
        if (is_array($this->models_used)) {
            return $this->models_used;
        }

        return [];
    }

    /**
     * Track model usage
     */
    public function addModelUsage(string $modelName): void
    {
        $models = $this->getModelsUsedArray();

        if (isset($models[$modelName])) {
            $models[$modelName]++;
        } else {
            $models[$modelName] = 1;
        }

        $this->models_used = $models;
        $this->save();
    }

    /**
     * Scope: Get logs for a specific date range
     */
    public function scopeBetweenDates($query, \DateTime $from, \DateTime $to)
    {
        return $query->whereBetween('usage_date', [$from, $to]);
    }

    /**
     * Scope: Get logs with errors
     */
    public function scopeWithErrors($query)
    {
        return $query->where('error_count', '>', 0);
    }

    /**
     * Scope: Get logs by provider through API key
     */
    public function scopeByProvider($query, string $provider)
    {
        return $query->whereHas('apiKey', function ($q) use ($provider) {
            $q->where('provider', $provider);
        });
    }
}
