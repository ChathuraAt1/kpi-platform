<?php

namespace Database\Factories;

use App\Models\MonthlyEvaluation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MonthlyEvaluation>
 */
class MonthlyEvaluationFactory extends Factory
{
    protected $model = MonthlyEvaluation::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'year' => now()->year,
            'month' => now()->month,
            'score' => fake()->randomFloat(2, 0, 10),
            'breakdown' => null,
            'generated_by' => 'system',
            'status' => 'draft',
        ];
    }
}
