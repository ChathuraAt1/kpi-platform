<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'assignee_id',
        'parent_id',
        'title',
        'description',
        'priority',
        'kpi_category_id',
        'planned_hours',
        'status',
        'due_date',
        'recurrence_rule',
        'metadata',
        'carryover_from_date',
    ];

    protected $casts = [
        'planned_hours' => 'decimal:2',
        'metadata' => 'array',
        'due_date' => 'date',
        'carryover_from_date' => 'date',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function kpiCategory()
    {
        return $this->belongsTo(KpiCategory::class, 'kpi_category_id');
    }

    public function logs()
    {
        return $this->hasMany(TaskLog::class);
    }

    /**
     * Scope: Get unfinished tasks that are candidates for carryover to next day
     * Includes tasks that are:
     * - Not completed (status != complete)
     * - Not in pending state
     * - Due today or earlier
     * - Belong to the specified user
     */
    public function scopeCarryoverCandidates($query, $userId, $fromDate = null)
    {
        $fromDate = $fromDate ?? now()->toDateString();
        
        return $query->where('owner_id', $userId)
            ->whereIn('status', ['open', 'inprogress', 'not_started'])
            ->whereDate('due_date', '<=', $fromDate)
            ->where('carryover_from_date', null) // Don't carry forward already-carried tasks
            ->orderBy('priority', 'desc')
            ->orderBy('due_date', 'asc');
    }

    /**
     * Scope: Get tasks that have been rolled over from a specific date
     * Indicates this task is a carryover (not a fresh new task)
     */
    public function scopeRollover($query)
    {
        return $query->whereNotNull('carryover_from_date');
    }

    /**
     * Scope: Get tasks that are NOT rollovers (new tasks)
     */
    public function scopeNew($query)
    {
        return $query->whereNull('carryover_from_date');
    }

    /**
     * Mark this task as carried over from a previous date
     * Used to distinguish "rollover" vs "new" task types
     */
    public function markAsCarryover($fromDate): self
    {
        $this->carryover_from_date = $fromDate;
        return $this;
    }

    /**
     * Check if this is a rollover task (carried from previous day)
     */
    public function isCarryover(): bool
    {
        return !is_null($this->carryover_from_date);
    }

    /**
     * Get the date this task was carried over from
     */
    public function getCarryoverDate()
    {
        return $this->carryover_from_date;
    }
