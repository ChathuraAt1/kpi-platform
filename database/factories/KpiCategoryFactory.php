<?php

namespace Database\Factories;

use App\Models\KpiCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\KpiCategory>
 */
class KpiCategoryFactory extends Factory
{
    protected $model = KpiCategory::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->word(),
            'description' => fake()->sentence(),
            'weight' => fake()->randomFloat(2, 0.5, 2.0),
        ];
    }
}
