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
    ];

    protected $casts = [
        'planned_hours' => 'decimal:2',
        'metadata' => 'array',
        'due_date' => 'date',
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
}
