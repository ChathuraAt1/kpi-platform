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
    ];

    protected $casts = [
        'date' => 'date',
        'duration_hours' => 'decimal:2',
        'llm_suggestion' => 'array',
        'metadata' => 'array',
        'approved_at' => 'datetime',
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
}
