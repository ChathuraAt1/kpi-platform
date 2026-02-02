<?php

namespace Database\Factories;

use App\Models\TaskLog;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TaskLog>
 */
class TaskLogFactory extends Factory
{
    protected $model = TaskLog::class;

    public function definition(): array
    {
        $start = fake()->dateTimeBetween('-1 week', 'now');
        $end = (clone $start)->modify('+' . fake()->numberBetween(30, 180) . ' minutes');

        return [
            'task_id' => Task::factory(),
            'user_id' => User::factory(),
            'date' => $start->format('Y-m-d'),
            'duration_hours' => round((($end->getTimestamp() - $start->getTimestamp()) / 3600), 2),
            'start_time' => $start->format('H:i:s'),
            'end_time' => $end->format('H:i:s'),
            'description' => fake()->sentence(),
            'status' => 'pending',
        ];
    }
}
