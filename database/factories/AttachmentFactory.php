<?php

namespace Database\Factories;

use App\Models\Attachment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Attachment>
 */
class AttachmentFactory extends Factory
{
    protected $model = Attachment::class;

    public function definition(): array
    {
        return [
            'attachable_type' => 'App\\Models\\Task',
            'attachable_id' => 1,
            'user_id' => User::factory(),
            'path' => 'uploads/' . fake()->word() . '.txt',
            'filename' => fake()->word() . '.txt',
            'mime' => 'text/plain',
            'size' => 1234,
            'uploaded_at' => now(),
        ];
    }
}
