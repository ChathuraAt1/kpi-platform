<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Task;
use App\Models\TaskLog;
use App\Models\KpiCategory;
use App\Models\MonthlyEvaluation;
use App\Models\ApiKey;
use Carbon\Carbon;
use Illuminate\Support\Facades\Queue;
use App\Jobs\GenerateMonthlyEvaluations;

class E2EFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_full_evaluation_flow()
    {
        Queue::fake();

        // 1. Setup Roles & Users
        $admin = User::factory()->create(['role' => 'admin', 'name' => 'Admin']);
        $hr = User::factory()->create(['role' => 'hr', 'name' => 'HR']);
        $supervisor = User::factory()->create(['role' => 'supervisor', 'name' => 'Sup']);
        $employee = User::factory()->create([
            'role' => 'employee',
            'name' => 'Emp',
            'supervisor_id' => $supervisor->id
        ]);

        // 2. Setup Meta Data
        $cat = KpiCategory::create(['name' => 'Coding', 'weight' => 0.5, 'unit' => 'hours']);
        $task = Task::create([
            'owner_id' => $employee->id,
            'assignee_id' => $employee->id,
            'title' => 'Feature X',
            'kpi_category_id' => $cat->id,
            'planned_hours' => 10,
        ]);

        // 3. Employee Submits Log
        $logData = [
            'date' => now()->toDateString(),
            'rows' => [
                [
                    'task_id' => $task->id,
                    'start_time' => '09:00',
                    'end_time' => '13:00',
                    'description' => 'Did work',
                ]
            ]
        ];

        $response = $this->actingAs($employee)->postJson('/api/task-logs', $logData);
        $response->assertStatus(201);
        $logId = $response->json('created.0.id');

        // Assert log is pending and duration was computed server-side
        $this->assertDatabaseHas('task_logs', ['id' => $logId, 'status' => 'pending', 'duration_hours' => 4.00]);

        // 4. Supervisor marks log as approved (API approve endpoint removed; emulate approval)
        $log = TaskLog::find($logId);
        $log->status = 'approved';
        $log->approved_by = $supervisor->id;
        $log->approved_at = now();
        $log->save();
        $this->assertDatabaseHas('task_logs', ['id' => $logId, 'status' => 'approved']);

        // 5. HR Triggers Evaluation Generation
        $response = $this->actingAs($hr)->postJson('/api/evaluations/trigger');
        $response->assertStatus(200);

        // Assert Job Pushed
        Queue::assertPushed(GenerateMonthlyEvaluations::class);

        // 6. Simulate Evaluation Generation (Running the service directly)
        // Seed Local Key
        ApiKey::create([
            'user_id' => $admin->id,
            'provider' => 'local',
            'name' => 'mock',
            'key' => 'mock',
            'encrypted_key' => encrypt('mock'),
            'priority' => 1,
            'status' => 'active'
        ]);

        // Run service manually
        $service = app(\App\Services\EvaluationService::class);
        $year = now()->year;
        $month = now()->month;

        $evaluation = $service->generateForUserMonth($employee->id, $year, $month);

        $this->assertNotNull($evaluation);
        $this->assertEquals('pending', $evaluation->status);

        // 7. Supervisor provides scores (approve endpoint removed; emulate scoring and approval)
        $breakdown = $evaluation->breakdown;
        $catId = $cat->id;
        $breakdown[$catId]['supervisor_score'] = 9.5;

        // compute final: category1 avg = (rule + llm + supervisor) where available
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

        $evaluation->breakdown = $breakdown;
        $evaluation->score = $final;
        $evaluation->status = 'approved';
        $evaluation->approved_by = $supervisor->id;
        $evaluation->approved_at = now();
        $evaluation->save();

        // Reload evaluation
        $evaluation->refresh();
        $this->assertEquals(9.5, $evaluation->breakdown[$catId]['supervisor_score']);

        // 8. HR Publishes
        $response = $this->actingAs($hr)->postJson("/api/evaluations/{$evaluation->id}/publish");
        $response->assertStatus(200);

        $evaluation->refresh();
        $this->assertEquals('published', $evaluation->status);
    }
}
