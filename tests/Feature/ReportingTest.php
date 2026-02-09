<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\TaskLog;

class ReportingTest extends TestCase
{
    use RefreshDatabase;

    public function test_missing_submissions_returns_users_without_logs_for_date()
    {
        $u1 = User::factory()->create();
        $u2 = User::factory()->create();

        TaskLog::factory()->create(['user_id' => $u1->id, 'date' => '2026-01-15']);

        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin, 'sanctum');
        $resp = $this->getJson('/api/submissions/missing?date=2026-01-15');
        $resp->assertStatus(200)->assertJson(['date' => '2026-01-15']);

        $data = $resp->json();
        $ids = array_map(fn($x) => $x['id'], $data['missing']);

        // Ensure the user without logs is reported missing, and the user with a log is not
        $this->assertContains($u2->id, $ids);
        $this->assertNotContains($u1->id, $ids);
    }
}
