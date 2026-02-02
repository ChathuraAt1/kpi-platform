<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ApiKey;
use App\Services\LLM\Providers\OpenAIProvider;
use App\Services\LLM\Providers\GeminiProvider;
use App\Services\LLM\Providers\GroqProvider;
use App\Services\LLM\Providers\HuggingFaceProvider;
use App\Services\LLM\Providers\DeepSeekProvider;
use App\Services\LLM\Providers\LocalProvider;
use Illuminate\Support\Facades\Log;

class ApiKeyHealthCheck extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'apikey:health-check {--only-degraded : Only check keys currently marked degraded}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Health-check API keys (LLM providers) and re-enable degraded keys when healthy';

    public function handle(): int
    {
        $onlyDegraded = $this->option('only-degraded');
        $query = ApiKey::query();
        if ($onlyDegraded) {
            $query->where('status', 'degraded');
        } else {
            $query->where('status', '!=', 'revoked');
        }

        $keys = $query->get();
        if ($keys->isEmpty()) {
            $this->info('No keys to check.');
            return 0;
        }

        $this->info('Checking ' . $keys->count() . ' keys...');

        foreach ($keys as $key) {
            // If key is degraded and still cooling down, skip
            if ($key->status === 'degraded' && $key->cooldown_until && now()->lt($key->cooldown_until)) {
                $this->line("Skipping key {$key->id} ({$key->provider}) — cooling down until {$key->cooldown_until}");
                continue;
            }
            try {
                $provider = strtolower($key->provider);
                switch ($provider) {
                    case 'openai':
                        $p = new OpenAIProvider();
                        $healthy = $p->healthCheck($key);
                        break;
                    case 'gemini':
                    case 'google-gemini':
                        $p = new GeminiProvider();
                        $healthy = $p->healthCheck($key);
                        break;
                    case 'groq':
                        $p = new GroqProvider();
                        $healthy = $p->healthCheck($key);
                        break;
                    case 'huggingface':
                    case 'hf':
                        $p = new HuggingFaceProvider();
                        $healthy = $p->healthCheck($key);
                        break;
                    case 'deepseek':
                    case 'deep-seek':
                        $p = new DeepSeekProvider();
                        $healthy = $p->healthCheck($key);
                        break;
                    case 'local':
                    case 'onprem':
                        $p = new LocalProvider();
                        $healthy = $p->healthCheck($key);
                        break;
                    default:
                        $healthy = false;
                        Log::warning('No healthCheck implemented for provider: ' . $key->provider);
                }

                if ($healthy) {
                    // Reset failure counters and enable
                    $key->status = 'active';
                    $key->failure_count = 0;
                    $key->cooldown_until = null;
                    $key->last_checked_at = now();
                    $key->save();
                    $this->line("Key {$key->id} ({$key->provider}) => healthy (re-enabled)");
                } else {
                    // Increment failure_count and set exponential backoff cooldown
                    $key->failure_count = ($key->failure_count ?? 0) + 1;
                    $backoffSeconds = min(3600 * (2 ** ($key->failure_count - 1)), 86400); // 1h,2h,4h... cap 24h
                    $key->cooldown_until = now()->addSeconds($backoffSeconds);
                    $key->status = 'degraded';
                    $key->last_checked_at = now();
                    $key->save();
                    $this->line("Key {$key->id} ({$key->provider}) => unhealthy (failure_count={$key->failure_count}, cooldown_until={$key->cooldown_until})");
                }
            } catch (\Throwable $e) {
                Log::warning('Health-check error for key ' . $key->id . ': ' . $e->getMessage());
                $this->error('Error checking key ' . $key->id . ': ' . $e->getMessage());
            }
        }

        return 0;
    }
}
