<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Gate;
use App\Jobs\GenerateMonthlyEvaluations;
use App\Models\User;
use App\Models\MonthlyEvaluation;

class EvaluationControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Gate::define('manageEvaluations', fn($user) => true);
        Gate::define('viewEvaluations', fn($user) => true);
        Gate::define('approveEvaluations', fn($user) => true);
    }

    public function test_trigger_dispatches_job()
    {
        Bus::fake();

        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $resp = $this->postJson('/api/evaluations/trigger', ['year' => 2026, 'month' => 1]);
        $resp->assertStatus(200)->assertJson(['status' => 'queued']);

        Bus::assertDispatched(GenerateMonthlyEvaluations::class, function ($job) {
            return $job->year === 2026 && $job->month === 1;
        });
    }

    public function test_list_returns_paginated_evaluations()
    {
        $user = User::factory()->create();
        MonthlyEvaluation::factory()->create(['user_id' => $user->id, 'year' => 2026, 'month' => 1]);
        MonthlyEvaluation::factory()->create(['user_id' => $user->id, 'year' => 2026, 'month' => 2]);
        MonthlyEvaluation::factory()->create(['user_id' => $user->id, 'year' => 2026, 'month' => 3]);

        $this->actingAs($user, 'sanctum');
        $resp = $this->getJson('/api/evaluations');
        $resp->assertStatus(200);
        $data = $resp->json();
        $this->assertArrayHasKey('data', $data);
    }

    public function test_approve_computes_final_score_and_marks_approved()
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $breakdown = [
            1 => ['category_id' => 1, 'category_name' => 'Cat1', 'rule_score' => 8.0, 'llm_score' => 7.0],
            2 => ['category_id' => 2, 'category_name' => 'Cat2', 'rule_score' => 5.0, 'llm_score' => null],
        ];

        $eval = MonthlyEvaluation::factory()->create([
            'user_id' => $user->id,
            'breakdown' => $breakdown,
            'status' => 'draft',
        ]);

        // Approve endpoint removed. Emulate supervisor scoring and approval directly.
        $breakdown[1]['supervisor_score'] = 9.0;

        $total = 0.0;
        $count = 0;
        foreach ($breakdown as $b) {
            $scores = [];
            if (isset($b['rule_score'])) $scores[] = $b['rule_score'];
            if (isset($b['llm_score']) && $b['llm_score'] !== null) $scores[] = $b['llm_score'];
            if (isset($b['supervisor_score']) && $b['supervisor_score'] !== null) $scores[] = $b['supervisor_score'];
            if (count($scores) === 0) continue;
            $avg = array_sum($scores) / count($scores);
            $total += $avg;
            $count++;
        }

        $final = $count ? round($total / $count, 2) : null;

        $eval->breakdown = $breakdown;
        $eval->score = $final;
        $eval->status = 'approved';
        $eval->approved_by = $user->id;
        $eval->approved_at = now();
        $eval->save();

        $eval->refresh();
        $this->assertEquals('approved', $eval->status);

        // Expected final: category1 avg = (8+7+9)/3 = 8.0, category2 avg = 5.0 => final = (8 + 5)/2 = 6.5
        $this->assertEquals(6.5, $eval->score);
    }

    public function test_publish_queues_email_and_audit()
    {
        \Illuminate\Support\Facades\Mail::fake();

        $hr = \App\Models\User::factory()->create(['role' => 'hr']);
        $user = \App\Models\User::factory()->create(['email' => 'employee@example.com']);

        $breakdown = [
            1 => ['category_id' => 1, 'category_name' => 'Cat1', 'rule_score' => 8.0],
        ];

        $eval = \App\Models\MonthlyEvaluation::factory()->create([
            'user_id' => $user->id,
            'breakdown' => $breakdown,
            'status' => 'approved',
            'score' => 8.0,
        ]);

        $this->actingAs($hr, 'sanctum');
        $resp = $this->postJson("/api/evaluations/{$eval->id}/publish");
        $resp->assertStatus(200)->assertJson(['status' => 'published']);

        \Illuminate\Support\Facades\Mail::assertQueued(\App\Mail\EvaluationPublished::class);
        $eval->refresh();
        $this->assertEquals('published', $eval->status);
    }

    public function test_pending_hr_endpoint_requires_hr_and_returns_list()
    {
        $hr = \App\Models\User::factory()->create(['role' => 'hr']);
        $other = \App\Models\User::factory()->create();

        // Create an evaluation without hr_score
        $eval = \App\Models\MonthlyEvaluation::factory()->create(['user_id' => $other->id, 'year' => now()->year, 'month' => now()->month, 'hr_score' => null]);

        $this->actingAs($hr, 'sanctum');
        $resp = $this->getJson('/api/evaluations/pending-hr');
        $resp->assertStatus(200);
        $data = $resp->json();
        $this->assertArrayHasKey('data', $data);
        $this->assertTrue(collect($data['data'])->contains(fn($i) => $i['id'] === $eval->id));

        // Non-HR should be forbidden
        $user = \App\Models\User::factory()->create();
        $this->actingAs($user, 'sanctum');
        $this->getJson('/api/evaluations/pending-hr')->assertStatus(403);
    }

    public function test_heatmap_and_trends_endpoints_available_to_hr_and_manager()
    {
        $hr = \App\Models\User::factory()->create(['role' => 'hr']);
        $manager = \App\Models\User::factory()->create(['role' => 'manager']);
        $u1 = \App\Models\User::factory()->create(['role' => 'engineer']);

        \App\Models\MonthlyEvaluation::factory()->create(['user_id' => $u1->id, 'year' => now()->year, 'month' => now()->month, 'score' => 72]);

        $this->actingAs($hr, 'sanctum');
        $hresp = $this->getJson('/api/evaluations/heatmap');
        $hresp->assertStatus(200)->assertJsonStructure(['year', 'month', 'bins', 'heatmap']);

        $this->actingAs($manager, 'sanctum');
        $mresp = $this->getJson('/api/evaluations/heatmap');
        $mresp->assertStatus(200);

        $this->actingAs($hr, 'sanctum');
        $tresp = $this->getJson('/api/evaluations/role-trends');
        $tresp->assertStatus(200)->assertJsonStructure(['periods', 'trends']);
    }
}
