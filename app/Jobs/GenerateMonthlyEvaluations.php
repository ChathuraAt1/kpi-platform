<?php

namespace App\Jobs;

use App\Services\EvaluationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateMonthlyEvaluations implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public int $year;
    public int $month;
    public ?int $userId;

    public function __construct(int $year, int $month, ?int $userId = null)
    {
        $this->year = $year;
        $this->month = $month;
        $this->userId = $userId;
        $this->onQueue('llm');
    }

    public function handle(EvaluationService $service): void
    {
        if ($this->userId) {
            $service->generateForUserMonth($this->userId, $this->year, $this->month);
            return;
        }

        // generate for all active users who have logs
        $users = \App\Models\User::whereHas('taskLogs', function ($q) {
            $q->whereYear('date', $this->year)->whereMonth('date', $this->month);
        })->get();

        foreach ($users as $u) {
            $service->generateForUserMonth($u->id, $this->year, $this->month);
        }
    }
}
