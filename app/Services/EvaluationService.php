<?php

namespace App\Services;

use App\Models\MonthlyEvaluation;
use App\Models\TaskLog;
use App\Models\KpiCategory;
use App\Services\LLM\LLMClient;
use Illuminate\Support\Facades\Log;

class EvaluationService
{
    protected LLMClient $llm;

    public function __construct(LLMClient $llm)
    {
        $this->llm = $llm;
    }

    /**
     * Generate a monthly evaluation for a single user and month.
     * Returns the created MonthlyEvaluation model.
     */
    public function generateForUserMonth(int $userId, int $year, int $month): MonthlyEvaluation
    {
        // collect all task logs for the month
        $logs = TaskLog::where('user_id', $userId)
            ->whereYear('date', $year)
            ->whereMonth('date', $month)
            ->get();

        // group by kpi_category
        $categories = KpiCategory::all()->keyBy('id');
        $grouped = [];
        foreach ($logs as $log) {
            $catId = $log->kpi_category_id ?? 0;
            if (!isset($grouped[$catId])) {
                $grouped[$catId] = [
                    'category_id' => $catId,
                    'category_name' => $categories->get($catId)?->name ?? 'Uncategorized',
                    'logged_hours' => 0.0,
                    'planned_hours' => 0.0,
                    'completion_percents' => [],
                    'task_ids' => [],
                ];
            }
            $grouped[$catId]['logged_hours'] += (float)$log->duration_hours;
            if ($log->task) {
                $grouped[$catId]['task_ids'][] = $log->task->id;
                $grouped[$catId]['planned_hours'] += (float)($log->task->planned_hours ?? 0);
            }
            // look into priority and metadata for completion percent
            $priority = $log->priority ?? $log->metadata['priority'] ?? 'medium';
            $weight = $log->user->getPriorityWeight($priority);
            $duration = (float)$log->duration_hours;
            $cp = $log->metadata['completion_percent'] ?? $log->metadata['completion'] ?? 100;
            
            $grouped[$catId]['weighted_completion_sum'] = ($grouped[$catId]['weighted_completion_sum'] ?? 0) + ($cp * $duration * $weight);
            $grouped[$catId]['weight_factor_sum'] = ($grouped[$catId]['weight_factor_sum'] ?? 0) + ($duration * $weight);
            $grouped[$catId]['completion_percents'][] = (float)$cp;
        }

        // compute rule-based scores per category (0-10)
        $breakdown = [];
        foreach ($grouped as $catId => $info) {
            $avgCompletion = null;
            if (isset($info['weight_factor_sum']) && $info['weight_factor_sum'] > 0) {
                $avgCompletion = $info['weighted_completion_sum'] / $info['weight_factor_sum'];
            } elseif (count($info['completion_percents']) > 0) {
                $avgCompletion = array_sum($info['completion_percents']) / count($info['completion_percents']);
            }

            if ($avgCompletion !== null) {
                $ruleScore = min(10, ($avgCompletion / 10.0));
            } elseif ($info['planned_hours'] > 0) {
                $ratio = min(1.0, $info['logged_hours'] / max(0.0001, $info['planned_hours']));
                $ruleScore = round($ratio * 10.0, 2);
            } else {
                // fallback based on hours logged: assume 8h/day * 20 working days ~= 160h; scale
                $ratio = min(1.0, $info['logged_hours'] / 160.0);
                $ruleScore = round($ratio * 10.0, 2);
            }

            $breakdown[] = [
                'category_id' => $catId,
                'category_name' => $info['category_name'],
                'logged_hours' => $info['logged_hours'],
                'planned_hours' => $info['planned_hours'],
                'rule_score' => $ruleScore,
            ];
        }

        // Call LLM to get scores per category (token-optimized payload)
        $llmScores = [];
        try {
            $llmScores = $this->llm->scoreEvaluation($userId, $year, $month, $breakdown);
        } catch (\Throwable $e) {
            Log::warning('LLM scoring failed for user ' . $userId . ': ' . $e->getMessage());
        }

        // Combine results: store breakdown entries with both scores
        $finalBreakdown = [];
        foreach ($breakdown as $b) {
            $catId = $b['category_id'];
            $llmScore = null;
            if (isset($llmScores[$catId])) {
                $llmScore = $llmScores[$catId]['score'];
            }
            $finalBreakdown[$catId] = [
                'category_id' => $catId,
                'category_name' => $b['category_name'],
                'logged_hours' => $b['logged_hours'],
                'planned_hours' => $b['planned_hours'],
                'rule_score' => $b['rule_score'],
                'llm_score' => $llmScore,
                'supervisor_score' => null,
            ];
        }

        // Aggregate score: average of available scores per category will be calculated when manager finalizes.
        $monthly = MonthlyEvaluation::create([
            'user_id' => $userId,
            'year' => $year,
            'month' => $month,
            'score' => null,
            'breakdown' => $finalBreakdown,
            'generated_by' => null,
            'status' => 'pending',
        ]);

        return $monthly;
    }
}
