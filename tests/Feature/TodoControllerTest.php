<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Todo;
use App\Models\Task;
use App\Models\TaskLog;

class TodoControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_unified_list()
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        // Create a personal todo
        Todo::factory()->create(['user_id' => $user->id, 'title' => 'Personal Errand']);

        // Create an assigned task for today
        Task::factory()->create([
            'assignee_id' => $user->id,
            'owner_id' => $user->id,
            'title' => 'Strategic Task',
            'due_date' => now()->toDateString()
        ]);

        // Create a task log for today (Work)
        TaskLog::factory()->create([
            'user_id' => $user->id,
            'date' => now(),
            'description' => 'Work Log Entry'
        ]);

        // Create a task log for today (Break) - should be filtered
        TaskLog::factory()->create([
            'user_id' => $user->id,
            'date' => now(),
            'description' => 'Lunch Break',
            'metadata' => ['type' => 'break']
        ]);

        $response = $this->getJson('/api/todos');

        $response->assertStatus(200);
        $data = $response->json();
        
        $this->assertCount(3, $data);
        $types = array_column($data, 'type');
        $this->assertContains('todo', $types);
        $this->assertContains('task', $types);
        $this->assertContains('log', $types);
    }

    public function test_updating_task_todo_updates_task_model()
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $task = Task::factory()->create([
            'assignee_id' => $user->id,
            'owner_id' => $user->id,
            'status' => 'open'
        ]);

        $response = $this->putJson("/api/todos/task_{$task->id}", [
            'completed' => true
        ]);

        $response->assertStatus(200);
        $task->refresh();
        $this->assertEquals('completed', $task->status);
    }
}
