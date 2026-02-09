<?php

namespace App\Models;

use App\Models\TaskLog;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'job_role_id',
        'supervisor_id',
        'work_start_time',
        'work_end_time',
        'breaks',
        'timezone',
        'custom_permissions',
        'disabled_permissions',
        'permissions_last_updated_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'breaks' => 'array',
            'custom_permissions' => 'array',
            'disabled_permissions' => 'array',
            'permissions_last_updated_at' => 'datetime',
        ];
    }

    public function hasRole(string $role): bool
    {
        // simple role check: allow if stored as string, or if roles stored as array
        if (!isset($this->role)) return false;
        if (is_string($this->role)) {
            return strtolower($this->role) === strtolower($role);
        }
        if (is_array($this->role)) {
            return in_array(strtolower($role), array_map('strtolower', $this->role));
        }
        return false;
    }

    public function supervisor()
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    public function jobRole()
    {
        return $this->belongsTo(JobRole::class);
    }

    public function subordinates()
    {
        return $this->hasMany(User::class, 'supervisor_id');
    }

    /**
     * Calculate productivity for a given date based on weighted priority.
     * High = 3, Medium = 2, Low = 1
     */
    public function calculateDailyProductivity(string $date): float
    {
        $logs = TaskLog::where('user_id', $this->id)
            ->whereDate('date', $date)
            ->get();

        if ($logs->isEmpty()) return 0.0;

        $totalWeightedCompletion = 0.0;
        $totalWeightFactor = 0.0;

        foreach ($logs as $log) {
            $weight = $this->getPriorityWeight($log->metadata['priority'] ?? 'medium');
            $completion = $log->metadata['completion_percent'] ?? 100;
            $duration = (float) $log->duration_hours;

            $totalWeightedCompletion += ($completion * $duration * $weight);
            $totalWeightFactor += ($duration * $weight);
        }

        return $totalWeightFactor > 0 ? round($totalWeightedCompletion / $totalWeightFactor, 2) : 0.0;
    }

    public function getAllSubordinateIds(): array
    {
        $ids = $this->subordinates()->pluck('id')->toArray();
        foreach ($this->subordinates as $sub) {
            $ids = array_merge($ids, $sub->getAllSubordinateIds());
        }
        return array_unique($ids);
    }

    public function isSupervisorOf(User $user): bool
    {
        if ($this->id === $user->supervisor_id) return true;
        foreach ($this->subordinates as $sub) {
            if ($sub->isSupervisorOf($user)) return true;
        }
        return false;
    }

    public function getPriorityWeight(string $priority): int
    {
        return match (strtolower($priority)) {
            'high' => 3,
            'medium' => 2,
            'low' => 1,
            default => 2,
        };
    }

    /**
     * Get effective shift start time (user custom or global default)
     * Returns time in HH:MM format
     */
    public function getEffectiveShiftStart(?string $dateStr = null): string
    {
        // If user has custom shift time set (not null)
        if ($this->work_start_time) {
            return substr($this->work_start_time, 0, 5); // Ensure HH:MM format
        }

        // Fall back to global setting by day of week
        $date = $dateStr ? \Carbon\Carbon::parse($dateStr) : now();
        $key = $date->isSaturday() ? 'saturday_shift' : 'weekday_shift';
        $globalShift = GlobalSetting::getByKey($key, ['start' => '08:30', 'end' => '17:30']);

        return $globalShift['start'] ?? '08:30';
    }

    /**
     * Get effective shift end time (user custom or global default)
     * Returns time in HH:MM format
     */
    public function getEffectiveShiftEnd(?string $dateStr = null): string
    {
        // If user has custom shift time set (not null)
        if ($this->work_end_time) {
            return substr($this->work_end_time, 0, 5); // Ensure HH:MM format
        }

        // Fall back to global setting by day of week
        $date = $dateStr ? \Carbon\Carbon::parse($dateStr) : now();
        $key = $date->isSaturday() ? 'saturday_shift' : 'weekday_shift';
        $globalShift = GlobalSetting::getByKey($key, ['start' => '08:30', 'end' => '17:30']);

        return $globalShift['end'] ?? '17:30';
    }

    /**
     * Get effective breaks array (user custom or global default)
     * Returns array of break objects: [{'start': 'HH:MM', 'end': 'HH:MM', 'label': 'Break Name'}, ...]
     */
    public function getEffectiveBreaks(?string $dateStr = null): array
    {
        // If user has custom breaks set (array not empty)
        if ($this->breaks && is_array($this->breaks) && !empty($this->breaks)) {
            return $this->breaks;
        }

        // Fall back to global setting by day of week
        $date = $dateStr ? \Carbon\Carbon::parse($dateStr) : now();
        $key = $date->isSaturday() ? 'saturday_breaks' : 'weekday_breaks';
        $globalBreaks = GlobalSetting::getByKey($key, []);

        return is_array($globalBreaks) ? $globalBreaks : [];
    }

    /**
     * Get shift info array with both times (for frontend display)
     */
    public function getEffectiveShift(?string $dateStr = null): array
    {
        return [
            'start' => $this->getEffectiveShiftStart($dateStr),
            'end' => $this->getEffectiveShiftEnd($dateStr),
            'is_custom' => !is_null($this->work_start_time) || !is_null($this->work_end_time),
        ];
    }

    /**
     * Calculate total break duration in hours
     */
    public function getTotalBreakHours(?string $dateStr = null): float
    {
        $breaks = $this->getEffectiveBreaks($dateStr);
        $total = 0.0;

        foreach ($breaks as $break) {
            if (isset($break['start']) && isset($break['end'])) {
                $start = \Carbon\Carbon::createFromFormat('H:i', $break['start']);
                $end = \Carbon\Carbon::createFromFormat('H:i', $break['end']);
                $total += $start->diffInMinutes($end) / 60;
            }
        }

        return round($total, 2);
    }

    /**
     * Calculate expected work hours (shift duration minus breaks)
     */
    public function getExpectedWorkHours(?string $dateStr = null): float
    {
        $shift = $this->getEffectiveShift($dateStr);
        $shiftStart = \Carbon\Carbon::createFromFormat('H:i', $shift['start']);
        $shiftEnd = \Carbon\Carbon::createFromFormat('H:i', $shift['end']);

        $shiftHours = $shiftStart->diffInMinutes($shiftEnd) / 60;
        $breakHours = $this->getTotalBreakHours($dateStr);

        return round($shiftHours - $breakHours, 2);
    }

    /**
     * Check if this user has a management role
     * (Supervisor, Manager, Director, Team Lead, HR Manager, etc.)
     */
    public function isManager(): bool
    {
        if ($this->hasRole('admin')) return true;
        if ($this->hasRole('hr')) return true;
        return $this->jobRole?->isManagementRole() ?? false;
    }

    /**
     * Get KPI categories for this user based on their job role
     * For managers, this returns their management-specific KPI categories
     * For employees, returns standard KPI categories
     */
    public function getKpiCategories()
    {
        if (!$this->jobRole) {
            return collect([]);
        }

        // If user has role-specific KPI overrides, use those
        if ($this->role_specific_kpis) {
            return collect($this->role_specific_kpis);
        }

        // Otherwise, use job role's KPI categories
        return $this->jobRole->getKpiCategoriesWithWeights();
    }

    /**
     * Get the monthly evaluation details for this user
     */
    public function getEvaluationForMonth(int $year, int $month)
    {
        return MonthlyEvaluation::where('user_id', $this->id)
            ->where('year', $year)
            ->where('month', $month)
            ->first();
    }

    /**
     * Get current management KPI score (from latest evaluation and team performance)
     */
    public function getCurrentManagerKpi($year = null, $month = null)
    {
        if (!$this->isManager()) {
            return null;
        }

        $year = $year ?? now()->year;
        $month = $month ?? now()->month;

        return $this->getEvaluationForMonth($year, $month)?->calculateManagerKpi();
    }

    /**
     * Get team members' average KPI score for manager evaluation
     */
    public function getTeamAverageKpi($year = null, $month = null): ?float
    {
        if (!$this->isManager()) {
            return null;
        }

        $year = $year ?? now()->year;
        $month = $month ?? now()->month;

        $subordinateIds = $this->getAllSubordinateIds();
        if (empty($subordinateIds)) {
            return null;
        }

        $evaluations = MonthlyEvaluation::whereIn('user_id', $subordinateIds)
            ->where('year', $year)
            ->where('month', $month)
            ->get();

        if ($evaluations->isEmpty()) {
            return null;
        }

        $scores = $evaluations->pluck('score')->filter()->toArray();
        return !empty($scores) ? round(array_sum($scores) / count($scores), 2) : null;
    }

    /**
     * Calculate this manager's supervision effectiveness
     * Based on team member performance and engagement
     */
    public function calculateSupervisionEffectiveness($year = null, $month = null): float
    {
        $year = $year ?? now()->year;
        $month = $month ?? now()->month;

        $evaluation = $this->getEvaluationForMonth($year, $month);
        if (!$evaluation) {
            return 0;
        }

        return $evaluation->calculateSupervisionEffectiveness();
    }

    /**
     * Get team hierarchy for this manager showing all subordinates
     * Returns tree structure of direct and indirect reports
     */
    public function getTeamHierarchy(int $year, int $month)
    {
        $subordinateIds = $this->getAllSubordinateIds();

        if (empty($subordinateIds)) {
            return [];
        }

        $evaluations = MonthlyEvaluation::whereIn('user_id', $subordinateIds)
            ->where('year', $year)
            ->where('month', $month)
            ->with('user')
            ->get();

        return $evaluations->map(function ($eval) {
            return [
                'user_id' => $eval->user_id,
                'name' => $eval->user->name,
                'role' => $eval->user->role,
                'job_role' => $eval->user->jobRole?->name,
                'score' => $eval->score,
                'breakdown' => $eval->breakdown,
                'submitted_at' => $eval->created_at,
            ];
        })->toArray();
    }

    /**
     * Check if user has a specific permission
     * Checks: role permissions, user custom permissions, disabled permissions
     */
    public function hasPermission(string $permission): bool
    {
        // Admins always have all permissions
        if ($this->hasRole('admin')) {
            return true;
        }

        // Check if permission is in user's disabled list
        if ($this->disabled_permissions && in_array($permission, $this->disabled_permissions)) {
            return false;
        }

        // Check user's custom permissions (override role defaults)
        if ($this->custom_permissions && in_array($permission, $this->custom_permissions)) {
            return true;
        }

        // Check role-based permissions
        return RolePermission::roleHasPermission($this->role, $permission);
    }

    /**
     * Get all permissions for this user's role
     */
    public function getRolePermissions(): array
    {
        $rolePerms = RolePermission::getPermissionsForRole($this->role);

        // Apply overrides: remove disabled, add custom
        $permissions = $rolePerms;

        if ($this->disabled_permissions) {
            $permissions = array_diff($permissions, (array)$this->disabled_permissions);
        }

        if ($this->custom_permissions) {
            $permissions = array_unique(array_merge($permissions, (array)$this->custom_permissions));
        }

        return $permissions;
    }

    /**
     * Check if user has a specific feature enabled
     */
    public function hasFeature(string $feature): bool
    {
        // Admins have all features
        if ($this->hasRole('admin')) {
            return true;
        }

        return RoleFeature::roleHasFeature($this->role, $feature);
    }

    /**
     * Get feature settings for user's role
     */
    public function getFeatureSettings(string $feature): ?array
    {
        return RoleFeature::getFeatureSettings($this->role, $feature);
    }

    /**
     * Grant a custom permission to this user (override role default)
     */
    public function grantPermission(string $permission): void
    {
        $custom = $this->custom_permissions ?? [];

        if (!in_array($permission, $custom)) {
            $custom[] = $permission;
        }

        $disabled = $this->disabled_permissions ?? [];
        if (($key = array_search($permission, $disabled)) !== false) {
            unset($disabled[$key]);
        }

        $this->custom_permissions = array_values(array_unique($custom));
        $this->disabled_permissions = array_values(array_unique($disabled));
        $this->permissions_last_updated_at = now();
        $this->save();
    }

    /**
     * Revoke a custom permission from this user
     */
    public function revokePermission(string $permission): void
    {
        $custom = $this->custom_permissions ?? [];
        if (($key = array_search($permission, $custom)) !== false) {
            unset($custom[$key]);
        }

        $disabled = $this->disabled_permissions ?? [];
        if (!in_array($permission, $disabled)) {
            $disabled[] = $permission;
        }

        $this->custom_permissions = array_values(array_unique($custom));
        $this->disabled_permissions = array_values(array_unique($disabled));
        $this->permissions_last_updated_at = now();
        $this->save();
    }

    /**
     * Reset user's custom permissions back to role defaults
     */
    public function resetPermissionsToRoleDefaults(): void
    {
        $this->custom_permissions = null;
        $this->disabled_permissions = null;
        $this->permissions_last_updated_at = now();
        $this->save();
    }

    /**
     * Get all permissions for comparison (current vs role default)
     */
    public function getPermissionStatus(): array
    {
        $rolePerms = RolePermission::getPermissionsForRole($this->role);
        $currentPerms = $this->getRolePermissions();
        $allPerms = RolePermission::getAllPermissions();

        return [
            'role' => $this->role,
            'role_permissions' => $rolePerms,
            'current_permissions' => $currentPerms,
            'custom_permissions' => $this->custom_permissions ?? [],
            'disabled_permissions' => $this->disabled_permissions ?? [],
            'added_permissions' => array_diff($currentPerms, $rolePerms),
            'removed_permissions' => array_diff($rolePerms, $currentPerms),
            'all_available_permissions' => $allPerms,
        ];
    }

    /**
     * Scope: Get active users (not inactive/deleted)
     */
    public function scopeActive($query)
    {
        return $query->where('status', '!=', 'inactive')
            ->whereNotNull('status');
    }
}
