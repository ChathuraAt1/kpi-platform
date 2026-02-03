<?php

namespace App\Models;

use App\Models\TaskLog;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

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
}
