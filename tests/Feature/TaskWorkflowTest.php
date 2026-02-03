<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Task;
use App\Models\DailyPlan;
use App\Models\GlobalSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Seed global settings for breaks
        GlobalSetting::setByKey('weekday_breaks', [
            ['start' => '10:30', 'end' => '10:50', 'label' => 'Coffee Break']
        ]);
        GlobalSetting::setByKey('weekday_shift', ['start' => '08:30', 'end' => '17:30']);
    }

    public function test_user_can_submit_and_finalize_morning_plan()
    {
        $user = User::factory()->create();
        $date = now()->toDateString();

        $response = $this->actingAs($user)->postJson('/api/tasks/plan', [
            'date' => $date,
            'tasks' => [
                ['title' => 'Critical Fix', 'priority' => 'high'],
                ['title' => 'Documentation', 'priority' => 'low'],
            ]
        ]);

        $response->assertStatus(201);
        $this->assertCount(2, Task::where('owner_id', $user->id)->get());
        
        $plan = DailyPlan::where('user_id', $user->id)->where('date', $date)->first();
        $this->assertTrue($plan->is_finalized);

        // Try submitting again should fail
        $response2 = $this->actingAs($user)->postJson('/api/tasks/plan', [
            'date' => $date,
            'tasks' => [['title' => 'Sneaky Entry']]
        ]);
        $response2->assertStatus(422);
    }

    public function test_get_daily_template_includes_plan_and_special_rows()
    {
        $user = User::factory()->create();
        $date = now()->toDateString();

        // 1. Submit plan
        $this->actingAs($user)->postJson('/api/tasks/plan', [
            'date' => $date,
            'tasks' => [['title' => 'Planned Task', 'priority' => 'medium']]
        ]);

        // 2. Get template
        $response = $this->actingAs($user)->getJson("/api/task-logs/daily-template?date={$date}");
        
        $response->assertStatus(200);
        $data = $response->json();

        // Should have: Planned Task + Break + Shift End
        $this->assertCount(3, $data);
        
        $types = collect($data)->pluck('type');
        $this->assertTrue($types->contains('task'));
        $this->assertTrue($types->contains('break'));
        $this->assertTrue($types->contains('shift_end'));

        $break = collect($data)->where('type', 'break')->first();
        $this->assertEquals('Coffee Break', $break['description']);
    }

    public function test_task_status_syncs_with_log_completion()
    {
        $user = User::factory()->create();
        $date = now()->toDateString();

        $task = Task::create([
            'owner_id' => $user->id,
            'title' => 'Status Test',
            'status' => 'open'
        ]);

        $this->actingAs($user)->postJson('/api/task-logs', [
            'date' => $date,
            'rows' => [
                [
                    'task_id' => $task->id,
                    'description' => 'Working on it',
                    'completion_percent' => 100,
                    'duration_hours' => 2,
                ]
            ]
        ]);

        $this->assertEquals('complete', $task->refresh()->status);

        // Test in-progress
        $task2 = Task::create([
            'owner_id' => $user->id,
            'title' => 'Status Test 2',
            'status' => 'open'
        ]);
        $this->actingAs($user)->postJson('/api/task-logs', [
            'date' => $date,
            'rows' => [
                [
                    'task_id' => $task2->id,
                    'completion_percent' => 50,
                    'duration_hours' => 1,
                ]
            ]
        ]);
        $this->assertEquals('inprogress', $task2->refresh()->status);
    }
}
