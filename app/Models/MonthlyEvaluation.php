<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MonthlyEvaluation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'year',
        'month',
        'score',
        'breakdown',
        'generated_by',
        'status',
        'approved_by',
        'approved_at',
        'published_by',
        'published_at',
        'team_member_avg_score',
        'team_member_scores',
        'team_member_count',
        'team_member_min_score',
        'team_member_max_score',
        'team_kpi_categories',
        'manager_productivity_score',
        'manager_supervision_effectiveness',
        'kpi_component_weights',
    ];

    protected $casts = [
        'breakdown' => 'array',
        'approved_at' => 'datetime',
        'published_at' => 'datetime',
        'team_member_scores' => 'array',
        'team_kpi_categories' => 'array',
        'kpi_component_weights' => 'array',
        'team_member_avg_score' => 'decimal:2',
        'team_member_min_score' => 'decimal:2',
        'team_member_max_score' => 'decimal:2',
        'manager_productivity_score' => 'decimal:2',
        'manager_supervision_effectiveness' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Check if this evaluation is for a management role
     */
    public function isManagementEvaluation(): bool
    {
        return !is_null($this->team_member_avg_score) || $this->user->jobRole?->isManagementRole();
    }

    /**
     * Get the count of team members evaluated in this manager evaluation
     */
    public function getTeamMemberCount(): int
    {
        return $this->team_member_count ?? 0;
    }

    /**
     * Get average team member score
     */
    public function getTeamMemberAvgScore(): ?float
    {
        return $this->team_member_avg_score;
    }

    /**
     * Get individual team member scores
     * Returns array of {user_id, name, score, category_breakdown}
     */
    public function getTeamMemberScores(): array
    {
        return $this->team_member_scores ?? [];
    }

    /**
     * Set team member scores after calculation
     * Automatically calculates min, max, and average
     */
    public function setTeamMemberScores(array $teamScores): self
    {
        $this->team_member_scores = $teamScores;
        $this->team_member_count = count($teamScores);

        if (!empty($teamScores)) {
            $scores = array_column($teamScores, 'score');
            $this->team_member_avg_score = round(array_sum($scores) / count($scores), 2);
            $this->team_member_min_score = round(min($scores), 2);
            $this->team_member_max_score = round(max($scores), 2);
        }

        return $this;
    }

    /**
     * Calculate manager's overall KPI score based on:
     * - Team member performance (weighted default: 50%)
     * - Manager's own productivity (weighted default: 30%)
     * - Supervision effectiveness (weighted default: 20%)
     */
    public function calculateManagerKpi(): float
    {
        if (!$this->isManagementEvaluation()) {
            return $this->score ?? 0;
        }

        $weights = $this->kpi_component_weights ?? [
            'team_member_kpi' => 0.5,
            'manager_productivity' => 0.3,
            'supervision_effectiveness' => 0.2,
        ];

        $teamScore = $this->team_member_avg_score ?? 0;
        $productivityScore = $this->manager_productivity_score ?? 0;
        $supervisionScore = $this->manager_supervision_effectiveness ?? 0;

        $totalWeight = array_sum($weights);
        if ($totalWeight == 0) {
            return 0;
        }

        $managerKpi = (
            ($teamScore * $weights['team_member_kpi'] ?? 0) +
            ($productivityScore * $weights['manager_productivity'] ?? 0) +
            ($supervisionScore * $weights['supervision_effectiveness'] ?? 0)
        ) / $totalWeight;

        return round(min(100, max(0, $managerKpi)), 2);
    }

    /**
     * Calculate supervision effectiveness based on team member improvement
     * Measures: % of team members with improving scores, engagement, task completion
     */
    public function calculateSupervisionEffectiveness(MonthlyEvaluation $previousEvaluation = null): float
    {
        if (empty($this->team_member_scores)) {
            return 0;
        }

        // Count team members with "good" performance (>70)
        $goodPerformers = collect($this->team_member_scores)
            ->filter(fn($member) => ($member['score'] ?? 0) >= 70)
            ->count();

        // Calculate engagement (% of team with evaluations)
        $engagement = ($goodPerformers / max(1, $this->team_member_count)) * 100;

        $effectiveness = min(100, $engagement);

        // Bonus for improving team performance YoY
        if ($previousEvaluation && $previousEvaluation->team_member_avg_score) {
            $improvement = $this->team_member_avg_score - $previousEvaluation->team_member_avg_score;
            if ($improvement > 0) {
                $effectiveness = min(100, $effectiveness + ($improvement / 2));
            }
        }

        return round($effectiveness, 2);
    }

    /**
     * Scope: Get only management evaluations (scores for managers/supervisors)
     */
    public function scopeManagement($query)
    {
        return $query->whereNotNull('team_member_avg_score');
    }

    /**
     * Scope: Get only employee evaluations
     */
    public function scopeEmployee($query)
    {
        return $query->whereNull('team_member_avg_score');
    }

    /**
     * Scope: Get evaluations for a manager and their team
     */
    public function scopeForManagerHierarchy($query, $managerId, $year, $month)
    {
        return $query->where(function ($q) use ($managerId, $year, $month) {
            $q->where('user_id', $managerId)
                ->where('year', $year)
                ->where('month', $month);
        })->orWhere(function ($q) use ($managerId, $year, $month) {
            // Get all users supervised (directly or indirectly) by this manager
            $subordinateIds = User::find($managerId)?->getAllSubordinateIds() ?? [];
            if (!empty($subordinateIds)) {
                $q->whereIn('user_id', $subordinateIds)
                    ->where('year', $year)
                    ->where('month', $month);
            }
        });
    }
}
