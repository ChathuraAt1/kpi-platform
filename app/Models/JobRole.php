<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobRole extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'suggested_kpis',
        'is_management_role',
        'role_hierarchy_level',
    ];

    protected $casts = [
        'suggested_kpis' => 'array',
        'is_management_role' => 'boolean',
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

    /**
     * Check if this role is a management role
     * Management roles: Supervisor, Team Lead, Manager, Director, HR Manager
     */
    public function isManagementRole(): bool
    {
        return $this->is_management_role ?? false;
    }

    /**
     * Get the hierarchy level of this role
     * Returns: employee, team_lead, supervisor, manager, director, hr_admin
     */
    public function getHierarchyLevel(): string
    {
        return $this->role_hierarchy_level ?? 'employee';
    }

    /**
     * Scope: Get only management roles
     */
    public function scopeManagement($query)
    {
        return $query->where('is_management_role', true);
    }

    /**
     * Scope: Get only employee (non-management) roles
     */
    public function scopeEmployee($query)
    {
        return $query->where('is_management_role', false);
    }

    /**
     * Scope: Filter by hierarchy level
     */
    public function scopeByHierarchyLevel($query, $level)
    {
        return $query->where('role_hierarchy_level', $level);
    }

    /**
     * Get all KPI categories for this role
     * Returns categories with weights
     */
    public function getKpiCategoriesWithWeights()
    {
        return $this->kpiCategories()
            ->select('kpi_categories.*', 'job_role_kpi_category.weight')
            ->get()
            ->map(function ($category) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'weight' => $category->pivot->weight ?? 1,
                ];
            });
    }

    /**
     * Mark this role as a management role with specific hierarchy level
     * Used during role creation/update
     */
    public function markAsManagement(string $hierarchyLevel): self
    {
        $this->is_management_role = true;
        $this->role_hierarchy_level = $hierarchyLevel;
        return $this;
    }

    /**
     * Mark this role as an employee (non-management) role
     */
    public function markAsEmployee(): self
    {
        $this->is_management_role = false;
        $this->role_hierarchy_level = 'employee';
        return $this;
    }

    /**
     * Get management roles in order of hierarchy (for cascading KPI calculations)
     * Higher levels should have their KPIs calculated last (after subordinates)
     */
    public static function getManagementHierarchyOrder()
    {
        return ['team_lead', 'supervisor', 'manager', 'director', 'hr_admin'];
