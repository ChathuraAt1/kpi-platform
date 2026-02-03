<?php

namespace App\Jobs;

use App\Models\TaskLog;
use App\Services\LLM\RuleBasedClassifier;
use App\Services\LLM\LLMClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

use Illuminate\Foundation\Bus\Dispatchable;

class ClassifyTaskLogs implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public array $taskLogIds;

    /**
     * Create a new job instance.
     */
    public function __construct(array $taskLogIds)
    {
        $this->taskLogIds = $taskLogIds;
        $this->onQueue('llm');
    }

    /**
     * Execute the job.
     */
    public function handle(LLMClient $llmClient): void
    {
        $logs = TaskLog::whereIn('id', $this->taskLogIds)->get();
        foreach ($logs as $log) {
            // Skip non-task logs (breaks, shift ends)
            if (($log->metadata['type'] ?? 'task') !== 'task') {
                continue;
            }

            try {
                // 1) Run a cheap rule-based classifier first
                $suggestion = RuleBasedClassifier::classify($log->description ?? '');

                // 2) If rule-based didn't find a confident suggestion, call LLM
                if ($suggestion === null) {
                    $response = $llmClient->classify([$log]);
                    $suggestion = $response[0] ?? null;
                }

                if ($suggestion) {
                    $log->llm_suggestion = $suggestion;
                    // try map category name to kpi_category_id if exists
                    if (!empty($suggestion['category'])) {
                        $cat = \App\Models\KpiCategory::where('name', $suggestion['category'])->first();
                        if ($cat) {
                            $log->kpi_category_id = $cat->id;
                        }
                    }
                    $log->save();
                }
            } catch (\Throwable $e) {
                Log::error('LLM classification failed for TaskLog ' . $log->id . ': ' . $e->getMessage());
                // let the job fail or continue depending on policy
            }
        }
    }
}
