<?php

namespace Database\Seeders;

use App\Models\ApiKey;
use App\Models\KpiCategory;
use App\Models\MonthlyEvaluation;
use App\Models\Task;
use App\Models\TaskLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Clean up (Be careful in production, but good for dev)
        // DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        // User::truncate();
        // Task::truncate();
        // TaskLog::truncate();
        // MonthlyEvaluation::truncate();
        // DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 2. Roles & Users
        $password = Hash::make('password'); // Default password for everyone

        // Global Admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@kpi.com'],
            ['name' => 'Global Admin', 'role' => 'admin', 'password' => $password]
        );

        // IT Admin (manages API keys)
        $itAdmin = User::firstOrCreate(
            ['email' => 'it@kpi.com'],
            ['name' => 'IT Administrator', 'role' => 'it_admin', 'password' => $password]
        );

        // HR Manager (manages evaluations)
        $hr = User::firstOrCreate(
            ['email' => 'hr@kpi.com'],
            ['name' => 'HR Manager', 'role' => 'hr', 'password' => $password]
        );

        // Supervisor
        $supervisor = User::firstOrCreate(
            ['email' => 'supervisor@kpi.com'],
            ['name' => 'Team Supervisor', 'role' => 'supervisor', 'password' => $password]
        );

        // Employees (Team A)
        $employees = [];
        for ($i = 1; $i <= 5; $i++) {
            $employees[] = User::firstOrCreate(
                ['email' => "employee{$i}@kpi.com"],
                [
                    'name' => "Employee {$i}",
                    'role' => 'employee',
                    'supervisor_id' => $supervisor->id,
                    'password' => $password,
                    'work_start_time' => '08:30',
                    'work_end_time' => '17:30',
                ]
            );
        }

        $this->command->info('Users seeded: Admin, IT, HR, Supervisor, 5 Employees.');

        // 3. KPI Categories
        $categories = collect([
            ['name' => 'Deep Work', 'description' => 'High-focus development and research', 'weight' => 0.5, 'unit' => 'hours'],
            ['name' => 'Collaboration', 'description' => 'Meetings, code reviews, mentoring', 'weight' => 0.3, 'unit' => 'hours'],
            ['name' => 'Learning', 'description' => 'Training, reading documentation', 'weight' => 0.2, 'unit' => 'hours'],
        ])->map(function ($c) {
            return KpiCategory::firstOrCreate(['name' => $c['name']], $c);
        });

        // 4. Tasks & Logs (Past 10 days)
        foreach ($employees as $emp) {
            // Create ongoing tasks
            $tasks = [];
            for ($k = 1; $k <= 3; $k++) {
                $tasks[] = Task::create([
                    'owner_id' => $emp->id,
                    'assignee_id' => $emp->id,
                    'title' => "Project Module {$k}",
                    'description' => "Implementation of feature {$k}",
                    'kpi_category_id' => $categories->random()->id,
                    'planned_hours' => rand(10, 40),
                    'priority' => ['low', 'medium', 'high'][rand(0, 2)],
                    'status' => 'inprogress',
                    'due_date' => Carbon::now()->addDays(rand(1, 10)),
                ]);
            }

            // Create logs
            for ($d = 0; $d < 7; $d++) { // Last 7 days
                $date = Carbon::now()->subDays($d)->toDateString();
                if (Carbon::parse($date)->isSunday()) continue; // Skip Sundays

                foreach ($tasks as $task) {
                    if (rand(0, 1) === 0) continue; // Randomly skip tasks

                    $hours = rand(1, 4);
                    TaskLog::create([
                        'task_id' => $task->id,
                        'user_id' => $emp->id,
                        'date' => $date,
                        'duration_hours' => $hours,
                        'description' => "Worked on {$task->title}",
                        'kpi_category_id' => $task->kpi_category_id,
                        'status' => $d === 0 ? 'pending' : 'approved', // Today pending, past approved
                        'metadata' => ['priority' => $task->priority, 'completion_percent' => rand(10, 100)]
                    ]);
                }
            }
        }
        $this->command->info('Tasks and Logs seeded.');

        // 5. API Keys (for IT Admin)
        ApiKey::firstOrCreate(
            ['encrypted_key' => 'mock-gemini-key'],
            [
                'user_id' => $itAdmin->id,
                'provider' => 'gemini',
                'name' => 'Primary Gemini Key',
                'encrypted_key' => 'mock-gemini-key',
                'priority' => 10,
                'daily_quota' => 10000,
                'status' => 'active',
                'model' => 'gemini-pro',
            ]
        );

        // 6. Evaluations (Pending for HR)
        $pastMonth = Carbon::now()->subMonth();
        foreach ($employees as $emp) {
             // Create a dummy evaluation
             MonthlyEvaluation::create([
                 'user_id' => $emp->id,
                 'year' => $pastMonth->year,
                 'month' => $pastMonth->month,
                 'status' => rand(0, 1) ? 'pending' : 'approved',
                 'score' => rand(7, 9) + (rand(0, 9) / 10),
                 'breakdown' => [
                     1 => ['category_name' => 'Deep Work', 'rule_score' => 8.5, 'llm_score' => 8.0, 'supervisor_score' => null],
                     2 => ['category_name' => 'Collaboration', 'rule_score' => 9.0, 'llm_score' => 8.8, 'supervisor_score' => null],
                 ]
             ]);
        }
        
        $this->command->info('Database seeding completed successfully.');
    }
}
