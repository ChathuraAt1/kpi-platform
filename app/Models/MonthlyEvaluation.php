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
        'rule_based_score',
        'llm_based_score',
        'hr_score',
        'supervisor_score',
        'hr_remarks',
        'supervisor_remarks',
        'score_components',
        'score_calculation_method',
        'score_input_count',
        'hr_scored_at',
        'supervisor_scored_at',
        'hr_scored_by',
        'supervisor_scored_by',
        'is_finalized',
        'finalized_at',
    ];

    protected $casts = [
        'breakdown' => 'array',
        'approved_at' => 'datetime',
        'published_at' => 'datetime',
        'team_member_scores' => 'array',
        'team_kpi_categories' => 'array',
        'kpi_component_weights' => 'array',
        'score_components' => 'array',
        'team_member_avg_score' => 'decimal:2',
        'team_member_min_score' => 'decimal:2',
        'team_member_max_score' => 'decimal:2',
        'manager_productivity_score' => 'decimal:2',
        'manager_supervision_effectiveness' => 'decimal:2',
        'rule_based_score' => 'decimal:2',
        'llm_based_score' => 'decimal:2',
        'hr_score' => 'decimal:2',
        'supervisor_score' => 'decimal:2',
        'hr_scored_at' => 'datetime',
        'supervisor_scored_at' => 'datetime',
        'finalized_at' => 'datetime',
        'is_finalized' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function hrScoredBy()
    {
        return $this->belongsTo(User::class, 'hr_scored_by');
    }

    public function supervisorScoredBy()
    {
        return $this->belongsTo(User::class, 'supervisor_scored_by');
    }

    public function comments()
    {
        return $this->hasMany(EvaluationComment::class, 'evaluation_id');
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
     * Three-Score System: Calculate final evaluation score
     * Averages available scores from: rule-based, LLM, HR, Supervisor
     * Handles missing values with weighted averaging
     */
    public function calculateFinalScore(): float
    {
        $scores = [];
        $weights = [];

        // Add rule-based score (always present)
        if ($this->rule_based_score !== null) {
            $scores[] = $this->rule_based_score;
            $weights[] = 1.0;
        }

        // Add LLM score (usually present)
        if ($this->llm_based_score !== null) {
            $scores[] = $this->llm_based_score;
            $weights[] = 1.0;
        }

        // Add HR score (optional)
        if ($this->hr_score !== null) {
            $scores[] = $this->hr_score;
            $weights[] = 1.0;
        }

        // Add Supervisor score (optional)
        if ($this->supervisor_score !== null) {
            $scores[] = $this->supervisor_score;
            $weights[] = 1.0;
        }

        // If no scores at all, return 0
        if (empty($scores)) {
            return 0;
        }

        // Simple average of available scores
        $totalWeight = array_sum($weights);
        $totalScore = array_sum($scores);
        $finalScore = $totalScore / count($scores);

        return round(min(100, max(0, $finalScore)), 2);
    }

    /**
     * Get all score components as array
     * Returns: {rule_based, llm, hr, supervisor, final}
     */
    public function getScoreComponents(): array
    {
        $components = [
            'rule_based' => $this->rule_based_score,
            'llm' => $this->llm_based_score,
            'hr' => $this->hr_score,
            'supervisor' => $this->supervisor_score,
            'final' => $this->score,
        ];

        // If stored breakdown exists, return that instead
        if ($this->score_components) {
            return $this->score_components;
        }

        return $components;
    }

    /**
     * Set HR score and trigger final score recalculation
     */
    public function setHrScore(float $score, ?string $remarks = null, User $user = null): self
    {
        $this->hr_score = max(0, min(100, $score));
        if ($remarks !== null) {
            $this->hr_remarks = htmlspecialchars($remarks, ENT_QUOTES, 'UTF-8');
        }
        $this->hr_scored_at = now();
        if ($user) {
            $this->hr_scored_by = $user->id;
        }

        // Update score components and final score
        $this->updateScoreMetadata();
        $this->score = $this->calculateFinalScore();

        return $this;
    }

    /**
     * Set Supervisor score and trigger final score recalculation
     */
    public function setSupervisorScore(float $score, ?string $remarks = null, User $user = null): self
    {
        $this->supervisor_score = max(0, min(100, $score));
        if ($remarks !== null) {
            $this->supervisor_remarks = htmlspecialchars($remarks, ENT_QUOTES, 'UTF-8');
        }
        $this->supervisor_scored_at = now();
        if ($user) {
            $this->supervisor_scored_by = $user->id;
        }

        // Update score components and final score
        $this->updateScoreMetadata();
        $this->score = $this->calculateFinalScore();

        return $this;
    }

    /**
     * Update score metadata: count, calculation method, components
     */
    public function updateScoreMetadata(): self
    {
        $scoreCount = 0;
        if ($this->rule_based_score !== null) $scoreCount++;
        if ($this->llm_based_score !== null) $scoreCount++;
        if ($this->hr_score !== null) $scoreCount++;
        if ($this->supervisor_score !== null) $scoreCount++;

        $this->score_input_count = $scoreCount;

        // Determine calculation method
        $this->score_calculation_method = match ($scoreCount) {
            2 => 'two_score_basic',     // rule + llm
            3 => 'three_score_average', // rule + llm + hr/supervisor
            4 => 'four_score_average',  // rule + llm + hr + supervisor
            default => 'single_score',
        };

        // Store component breakdown
        $this->score_components = $this->getScoreComponents();

        return $this;
    }

    /**
     * Mark evaluation as finalized (all scores submitted)
     */
    public function finalize(): self
    {
        $this->is_finalized = true;
        $this->finalized_at = now();
        $this->score = $this->calculateFinalScore();
        $this->updateScoreMetadata();

        return $this;
    }

    /**
     * Check if evaluation is ready to finalize (has all required scores)
     */
    public function isReadyToFinalize(): bool
    {
        // At minimum, must have rule-based and LLM scores
        return !is_null($this->rule_based_score) && !is_null($this->llm_based_score);
    }

    /**
     * Get score input status
     */
    public function getScoreStatus(): array
    {
        return [
            'rule_based' => !is_null($this->rule_based_score),
            'llm' => !is_null($this->llm_based_score),
            'hr' => !is_null($this->hr_score),
            'supervisor' => !is_null($this->supervisor_score),
            'is_finalized' => $this->is_finalized,
            'ready_to_finalize' => $this->isReadyToFinalize(),
        ];
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
