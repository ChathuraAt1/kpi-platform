<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class DailyPlan extends Model
{
    protected $fillable = [
        'user_id',
        'date',
        'is_finalized',
        'finalized_at',
        'planned_task_ids',
        'rollover_count',
        'morning_plan_submitted_at',
        'evening_log_submitted_at',
        'submission_status',
    ];

    protected $casts = [
        'is_finalized' => 'boolean',
        'finalized_at' => 'datetime',
        'date' => 'date',
        'planned_task_ids' => 'array',
        'rollover_count' => 'integer',
        'morning_plan_submitted_at' => 'datetime',
        'evening_log_submitted_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Submit the morning plan (finalize planning for today)
     * Called when user explicitly finalizes their morning plan
     */
    public function submitMorningPlan(array $plannedTaskIds = []): self
    {
        $this->is_finalized = true;
        $this->finalized_at = now();
        $this->morning_plan_submitted_at = now();
        $this->planned_task_ids = $plannedTaskIds;
        $this->submission_status = 'morning_planned';

        return $this;
    }

    /**
     * Submit the evening log (complete the daily submission)
     * Called when user submits evening task logs
     */
    public function submitEveningLog(): self
    {
        $this->evening_log_submitted_at = now();
        $this->submission_status = 'evening_logged';
        $this->submission_status = 'complete'; // Mark as fully submitted for the day

        return $this;
    }

    /**
     * Check if morning plan has been submitted
     */
    public function isMorningPlanSubmitted(): bool
    {
        return !is_null($this->morning_plan_submitted_at);
    }

    /**
     * Check if evening log has been submitted
     */
    public function isEveningLogSubmitted(): bool
    {
        return !is_null($this->evening_log_submitted_at);
    }

    /**
     * Check if both submissions are complete
     */
    public function isBothSubmitted(): bool
    {
        return $this->isMorningPlanSubmitted() && $this->isEveningLogSubmitted();
    }

    /**
     * Get time since morning plan was submitted
     */
    public function getMinutesSinceMorningPlan(): ?int
    {
        if (!$this->morning_plan_submitted_at) {
            return null;
        }
        return (int)$this->morning_plan_submitted_at->diffInMinutes(now());
    }

    /**
     * Get time since evening log was submitted
     */
    public function getMinutesSinceEveningLog(): ?int
    {
        if (!$this->evening_log_submitted_at) {
            return null;
        }
        return (int)$this->evening_log_submitted_at->diffInMinutes(now());
    }

    /**
     * Scope: Get plans with morning submissions
     */
    public function scopeWithMorningSubmission($query)
    {
        return $query->whereNotNull('morning_plan_submitted_at');
    }

    /**
     * Scope: Get plans with evening submissions
     */
    public function scopeWithEveningSubmission($query)
    {
        return $query->whereNotNull('evening_log_submitted_at');
    }

    /**
     * Scope: Get plans that are complete (both submissions)
     */
    public function scopeComplete($query)
    {
        return $query->whereNotNull('morning_plan_submitted_at')
            ->whereNotNull('evening_log_submitted_at');
    }

    /**
     * Scope: Get plans for a specific date
     */
    public function scopeForDate($query, $date)
    {
        return $query->whereDate('date', $date);
    }

    /**
     * Scope: Get plans for a specific user on a date
     */
    public function scopeForUserOnDate($query, $userId, $date = null)
    {
        $date = $date ?? now()->toDateString();
        return $query->where('user_id', $userId)->whereDate('date', $date);
    }
}
