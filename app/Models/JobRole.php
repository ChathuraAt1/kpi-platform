<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobRole extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'description', 'suggested_kpis'];

    protected $casts = [
        'suggested_kpis' => 'array',
    ];

    public function kpiCategories()
    {
        return $this->belongsToMany(KpiCategory::class, 'job_role_kpi_category')
            ->withPivot('weight')
            ->withTimestamps();
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
