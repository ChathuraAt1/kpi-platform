<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\MonthlyEvaluation;
use App\Models\TaskLog;

class SupervisorControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Allow viewing evaluations for tests
        \Illuminate\Support\Facades\Gate::define('viewEvaluations', fn($user) => true);
    }

    public function test_team_submission_status_returns_list_for_supervisor()
    {
        $supervisor = User::factory()->create(['role' => 'supervisor']);
        $member = User::factory()->create();

        // Make member a subordinate (assume method for linking exists)
        $member->supervisor_id = $supervisor->id;
        $member->save();

        // Create morning and evening submissions for member
        TaskLog::factory()->create(['user_id' => $member->id, 'date' => now()->toDateString(), 'submission_type' => 'morning_plan', 'submitted_at' => now()]);
        TaskLog::factory()->create(['user_id' => $member->id, 'date' => now()->toDateString(), 'submission_type' => 'evening_log', 'submitted_at' => now()]);

        $this->actingAs($supervisor, 'sanctum');
        $resp = $this->getJson('/api/supervisor/team/submission-status');
        $resp->assertStatus(200)->assertJsonStructure(['date', 'total_members', 'evening_submitted_count', 'members']);
    }

    public function test_missing_evaluations_endpoint_requires_supervisor_and_returns_list()
    {
        $supervisor = User::factory()->create(['role' => 'supervisor']);
        $member = User::factory()->create();
        $member->supervisor_id = $supervisor->id;
        $member->save();

        // Create a monthly evaluation without supervisor_score
        $eval = MonthlyEvaluation::factory()->create(['user_id' => $member->id, 'year' => now()->year, 'month' => now()->month, 'supervisor_score' => null]);

        $this->actingAs($supervisor, 'sanctum');
        $resp = $this->getJson('/api/supervisor/team/missing-evaluations');
        $resp->assertStatus(200);
        $data = $resp->json();
        $this->assertArrayHasKey('data', $data);

        // Non-supervisor is forbidden
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');
        $this->getJson('/api/supervisor/team/missing-evaluations')->assertStatus(403);
    }

    public function test_team_vs_company_returns_numbers()
    {
        $supervisor = User::factory()->create(['role' => 'supervisor']);
        $member = User::factory()->create();
        $member->supervisor_id = $supervisor->id;
        $member->save();

        MonthlyEvaluation::factory()->create(['user_id' => $member->id, 'year' => now()->year, 'month' => now()->month, 'score' => 70]);
        MonthlyEvaluation::factory()->create(['user_id' => User::factory()->create()->id, 'year' => now()->year, 'month' => now()->month, 'score' => 80]);

        $this->actingAs($supervisor, 'sanctum');
        $resp = $this->getJson('/api/supervisor/team/vs-company');
        $resp->assertStatus(200)->assertJsonStructure(['team_avg', 'company_avg', 'difference']);
    }
}
