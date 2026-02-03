<?php

namespace Database\Seeders;

use App\Models\ApiKey;
use App\Models\KpiCategory;
use App\Models\MonthlyEvaluation;
use App\Models\Task;
use App\Models\TaskLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Clear existing small demo data (optional - uncomment if desired)
        // \DB::table('task_logs')->truncate();
        // \DB::table('tasks')->truncate();
        // \DB::table('kpi_categories')->truncate();
        // \DB::table('api_keys')->truncate();
        // \DB::table('monthly_evaluations')->truncate();

        // Users: admin, hr, supervisor, employees
        $admin = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'role' => 'admin',
        ]);

        $hr = User::factory()->create([
            'name' => 'HR User',
            'email' => 'hr@example.com',
            'role' => 'hr',
        ]);

        $supervisor = User::factory()->create([
            'name' => 'Team Lead',
            'email' => 'lead@example.com',
            'role' => 'supervisor',
        ]);

        $employees = User::factory()->count(6)->create()->each(function ($u) use ($supervisor) {
            $u->role = 'employee';
            $u->supervisor_id = $supervisor->id;
            $u->save();
        });

        // KPI categories
        $categories = collect([
            ['name' => 'Productivity', 'description' => 'Hours and output', 'weight' => 0.4, 'unit' => 'hours'],
            ['name' => 'Quality', 'description' => 'Defect rate and reviews', 'weight' => 0.35, 'unit' => 'score'],
            ['name' => 'Collaboration', 'description' => 'Peer feedback and teamwork', 'weight' => 0.25, 'unit' => 'score'],
        ])->map(function ($c) {
            return KpiCategory::create($c);
        });

        // Tasks and TaskLogs
        foreach ($employees as $emp) {
            // create 3 tasks per employee
            $tasks = [];
            for ($i = 1; $i <= 3; $i++) {
                $category = $categories->random();
                $task = Task::create([
                    'owner_id' => $emp->id,
                    'assignee_id' => $emp->id,
                    'title' => "Task {$i} for {$emp->name}",
                    'description' => "Work item {$i} for demo",
                    'kpi_category_id' => $category->id,
                    'planned_hours' => rand(1, 8),
                    'status' => 'open',
                ]);
                $tasks[] = $task;
            }

            // create task logs for the last 14 days
            for ($d = 0; $d < 14; $d++) {
                $date = Carbon::now()->subDays($d)->toDateString();
                // random number of logs per day
                $count = rand(0, 2);
                for ($j = 0; $j < $count; $j++) {
                    $task = $tasks[array_rand($tasks)];
                    $duration = rand(30, 240) / 60; // 0.5 to 4 hours
                    $start = Carbon::parse("09:00")->addMinutes(rand(0, 480));
                    TaskLog::create([
                        'task_id' => $task->id,
                        'user_id' => $emp->id,
                        'date' => $date,
                        'duration_hours' => $duration,
                        'start_time' => $start->toTimeString(),
                        'end_time' => $start->copy()->addMinutes((int)($duration * 60))->toTimeString(),
                        'description' => 'Worked on ' . $task->title,
                        'kpi_category_id' => $task->kpi_category_id,
                        'status' => 'submitted',
                    ]);
                }
            }
        }

        // API key (local/mock) for admin
        ApiKey::create([
            'user_id' => $admin->id,
            'provider' => 'local',
            'name' => 'Local dev key',
            'encrypted_key' => 'mock-key',
            'priority' => 1,
            'daily_quota' => 1000,
            'daily_usage' => 0,
            'status' => 'active',
        ]);

        // Monthly evaluations for a sample employee
        $sample = $employees->first();
        MonthlyEvaluation::factory()->count(3)->create(['user_id' => $sample->id]);

        $this->command->info('Seeded demo data: users, kpis, tasks, logs, api key, evaluations.');
    }
}
