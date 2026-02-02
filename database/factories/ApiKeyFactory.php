<?php

namespace Database\Factories;

use App\Models\ApiKey;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ApiKey>
 */
class ApiKeyFactory extends Factory
{
    protected $model = ApiKey::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'provider' => 'openai',
            'name' => 'key-' . fake()->unique()->word(),
            'encrypted_key' => encrypt('test-key'),
            'priority' => 10,
            'daily_quota' => null,
            'daily_usage' => 0,
            'status' => 'active',
        ];
    }
}
