<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Task>
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'assignee_id' => null,
            'title' => fake()->sentence(6),
            'description' => fake()->paragraph(),
            'planned_hours' => fake()->randomFloat(2, 0, 8),
            'status' => 'open',
            'due_date' => null,
            'metadata' => null,
        ];
    }
}
