<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;

class UserControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_user_supervisor_and_schedule()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $u = User::factory()->create(['role' => 'employee']);
        $sup = User::factory()->create(['role' => 'supervisor']);

        $this->actingAs($admin, 'sanctum');

        $resp = $this->patchJson("/api/users/{$u->id}", [
            'supervisor_id' => $sup->id,
            'work_start_time' => '08:30',
            'work_end_time' => '17:30',
            'breaks' => [['start' => '10:30', 'end' => '10:50'], ['start' => '13:00', 'end' => '14:00']],
        ]);

        $resp->assertStatus(200)->assertJsonFragment(['supervisor_id' => $sup->id]);
        $u->refresh();
        $this->assertEquals($sup->id, $u->supervisor_id);
        $this->assertEquals('08:30', substr($u->work_start_time, 0, 5));
    }

    public function test_progress_endpoint_returns_task_and_log_summary()
    {
        $u = User::factory()->create();
        $this->actingAs($u, 'sanctum');

        $resp = $this->getJson("/api/users/{$u->id}/progress?date=2026-01-15");
        $resp->assertStatus(200);
        $json = $resp->json();
        $this->assertArrayHasKey('tasks', $json);
        +$this->assertArrayHasKey('logs', $json);
    }
}
