<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'user_id',
        'date',
        'duration_hours',
        'start_time',
        'end_time',
        'description',
        'kpi_category_id',
        'llm_suggestion',
        'status',
        'approved_by',
        'approved_at',
        'metadata',
        'submitted_at',
        'is_late',
        'submission_type',
        'submission_metadata',
        'total_hours_logged',
        'break_hours_deducted',
        'expected_work_hours',
        'time_gaps',
        'breaks_used',
        'actual_break_duration',
        'time_in_work',
        'completion_percent_at_dayend',
    ];

    protected $casts = [
        'date' => 'date',
        'duration_hours' => 'decimal:2',
        'llm_suggestion' => 'array',
        'metadata' => 'array',
        'approved_at' => 'datetime',
        'submitted_at' => 'datetime',
        'submission_metadata' => 'array',
        'total_hours_logged' => 'decimal:2',
        'break_hours_deducted' => 'decimal:2',
        'expected_work_hours' => 'decimal:2',
        'time_gaps' => 'array',
        'breaks_used' => 'array',
        'actual_break_duration' => 'decimal:2',
        'time_in_work' => 'decimal:2',
        'completion_percent_at_dayend' => 'decimal:2',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function kpiCategory()
    {
        return $this->belongsTo(KpiCategory::class, 'kpi_category_id');
    }

    /**
     * Mark log as submitted and check if late (11 PM deadline)
     * Should be called before saving
     */
    public function markAsSubmitted(string $submissionType = 'evening_log'): self
    {
        $now = now();
        $deadline = $this->getSubmissionDeadline();

        $this->submitted_at = $now;
        $this->submission_type = $submissionType;
        $this->is_late = $now->isAfter($deadline);
        $this->submission_metadata = [
            'deadline' => $deadline->toIso8601String(),
            'submitted_at' => $now->toIso8601String(),
            'minutes_late' => $this->is_late ? (int)$now->diffInMinutes($deadline) : 0,
            'submission_type' => $submissionType,
        ];

        return $this;
    }

    /**
     * Get submission deadline for this date
     * Default: 11 PM (23:00) same day
     */
    public function getSubmissionDeadline(): \Carbon\Carbon
    {
        return $this->date
            ->copy()
            ->setHour(23)
            ->setMinute(0)
            ->setSecond(0);
    }

    /**
     * Check if submission is approaching deadline (less than 1 hour remaining)
     */
    public static function isDeadlineApproaching(): bool
    {
        $deadline = now()->copy()->setHour(23)->setMinute(0)->setSecond(0);
        $minutesRemaining = (int)$deadline->diffInMinutes(now(), false);
        return $minutesRemaining > 0 && $minutesRemaining < 60;
    }

    /**
     * Get minutes remaining until deadline (negative if past deadline)
     */
    public static function getMinutesUntilDeadline(): int
    {
        $deadline = now()->copy()->setHour(23)->setMinute(0)->setSecond(0);
        return (int)$deadline->diffInMinutes(now(), false);
    }

    /**
     * Scope: only late submissions
     */
    public function scopeLate($query)
    {
        return $query->where('is_late', true);
    }

    /**
     * Scope: only submitted today
     */
    public function scopeSubmittedToday($query)
    {
        return $query->whereDate('submitted_at', now()->toDateString());
    }

    /**
     * Scope: filters for a specific date
     */
    public function scopeForDate($query, $date)
    {
        return $query->whereDate('date', $date);
    }

    /**
     * Scope: submitted (timestamp set)
     */
    public function scopeSubmitted($query)
    {
        return $query->whereNotNull('submitted_at');
    }

    /**
     * Scope: not yet submitted
     */
    public function scopePending($query)
    {
        return $query->whereNull('submitted_at');
    }
}
