<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\TaskLog;
use App\Models\MonthlyEvaluation;
use Carbon\Carbon;

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

    public function test_get_last_evaluation_scores_returns_published_evaluation()
    {
        $user = User::factory()->create(['role' => 'employee']);
        $this->actingAs($user, 'sanctum');

        // Create a published evaluation
        MonthlyEvaluation::factory()->create([
            'user_id' => $user->id,
            'status' => 'published',
            'year' => 2025,
            'month' => 1,
            'rule_based_score' => 75,
            'llm_based_score' => 80,
            'hr_score' => 85,
            'supervisor_score' => 88,
            'score' => 82,
            'published_at' => now(),
        ]);

        $resp = $this->getJson('/api/user/last-evaluation-scores');
        $resp->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'period',
                    'scores',
                    'breakdown',
                ],
            ])
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.scores.final', 82);
    }

    public function test_get_last_evaluation_scores_returns_no_evaluation_when_none_published()
    {
        $user = User::factory()->create(['role' => 'employee']);
        $this->actingAs($user, 'sanctum');

        $resp = $this->getJson('/api/user/last-evaluation-scores');
        $resp->assertStatus(200)
            ->assertJsonPath('status', 'no_evaluation');
    }

    public function test_get_daily_productivity_returns_score()
    {
        $user = User::factory()->create(['role' => 'employee']);
        $today = now()->toDateString();
        $this->actingAs($user, 'sanctum');

        // Create task logs
        TaskLog::factory()->create([
            'user_id' => $user->id,
            'date' => $today,
            'duration_hours' => 2,
            'metadata' => ['priority' => 'high', 'completion_percent' => 100],
        ]);

        $resp = $this->getJson("/api/user/daily-productivity?date={$today}");
        $resp->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'date',
                    'productivity_score',
                    'log_count',
                    'total_hours',
                ],
            ])
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.log_count', 1);
    }

    public function test_get_daily_productivity_returns_zero_for_no_logs()
    {
        $user = User::factory()->create(['role' => 'employee']);
        $today = now()->toDateString();
        $this->actingAs($user, 'sanctum');

        $resp = $this->getJson("/api/user/daily-productivity?date={$today}");
        $resp->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.productivity_score', 0)
            ->assertJsonPath('data.log_count', 0);
    }

    public function test_get_daily_productivity_rejects_invalid_date()
    {
        $user = User::factory()->create(['role' => 'employee']);
        $this->actingAs($user, 'sanctum');

        $resp = $this->getJson("/api/user/daily-productivity?date=invalid-date");
        $resp->assertStatus(400)
            ->assertJsonPath('status', 'error');
    }

    public function test_get_submission_streak_returns_consecutive_days()
    {
        $user = User::factory()->create(['role' => 'employee']);
        $this->actingAs($user, 'sanctum');

        // Create logs for 5 consecutive days
        for ($i = 4; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            TaskLog::factory()->create([
                'user_id' => $user->id,
                'date' => $date,
            ]);
        }

        $resp = $this->getJson('/api/user/submission-streak?days=30');
        $resp->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'current_streak',
                    'longest_streak',
                    'submission_count',
                ],
            ])
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.current_streak', 5)
            ->assertJsonPath('data.longest_streak', 5);
    }

    public function test_get_submission_streak_handles_gap_in_days()
    {
        $user = User::factory()->create(['role' => 'employee']);
        $this->actingAs($user, 'sanctum');

        // Create logs with a gap (3 days, then skip 2, then 2 more)
        for ($i = 4; $i >= 2; $i--) {
            $date = now()->subDays($i)->toDateString();
            TaskLog::factory()->create(['user_id' => $user->id, 'date' => $date]);
        }
        // Gap of 2 days
        for ($i = 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            TaskLog::factory()->create(['user_id' => $user->id, 'date' => $date]);
        }

        $resp = $this->getJson('/api/user/submission-streak?days=30');
        $resp->assertStatus(200)
            ->assertJsonPath('data.current_streak', 2) // Last 2 consecutive days
            ->assertJsonPath('data.longest_streak', 3); // First 3 consecutive days is longest
    }

    public function test_get_improvement_suggestions_returns_suggestions_for_low_performance()
    {
        $user = User::factory()->create(['role' => 'employee']);
        $this->actingAs($user, 'sanctum');

        // Create low-scoring evaluations
        for ($i = 0; $i < 3; $i++) {
            MonthlyEvaluation::factory()->create([
                'user_id' => $user->id,
                'status' => 'published',
                'score' => 40,
            ]);
        }

        $resp = $this->getJson('/api/user/improvement-suggestions?period=3');
        $resp->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'suggestions',
                    'summary',
                ],
            ])
            ->assertJsonPath('status', 'success');

        $suggestions = $resp->json('data.suggestions');
        $this->assertNotEmpty($suggestions);
        $types = array_map(fn($s) => $s['type'], $suggestions);
        $this->assertContains('low_performance', $types);
    }

    public function test_get_improvement_suggestions_returns_empty_for_no_evaluations()
    {
        $user = User::factory()->create(['role' => 'employee']);
        $this->actingAs($user, 'sanctum');

        $resp = $this->getJson('/api/user/improvement-suggestions?period=3');
        $resp->assertStatus(200)
            ->assertJsonPath('status', 'no_data')
            ->assertJsonPath('data.suggestions', []);
    }

    public function test_get_improvement_suggestions_recognizes_high_performer()
    {
        $user = User::factory()->create(['role' => 'employee']);
        $this->actingAs($user, 'sanctum');

        // Create high-scoring evaluations
        for ($i = 0; $i < 3; $i++) {
            MonthlyEvaluation::factory()->create([
                'user_id' => $user->id,
                'status' => 'published',
                'score' => 90,
            ]);
        }

        $resp = $this->getJson('/api/user/improvement-suggestions?period=3');
        $resp->assertStatus(200);

        $suggestions = $resp->json('data.suggestions');
        $types = array_map(fn($s) => $s['type'], $suggestions);
        $this->assertContains('high_performer', $types);
    }
}
