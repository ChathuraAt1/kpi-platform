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

        $resp = $this->postJson("/api/evaluations/{$eval->id}/approve", ['supervisor_score' => [1 => 9.0]]);
        $resp->assertStatus(200)->assertJsonStructure(['status', 'score']);

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
}
