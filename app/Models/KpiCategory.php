<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KpiCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'weight',
        'unit',
        'metadata',
    ];

    protected $casts = [
        'weight' => 'decimal:2',
        'metadata' => 'array',
    ];

    public function tasks()
    {
        return $this->hasMany(Task::class, 'kpi_category_id');
    }

    public function logs()
    {
        return $this->hasMany(TaskLog::class, 'kpi_category_id');
    }
}
