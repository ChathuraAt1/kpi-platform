<?php

namespace App\Services\LLM;

use App\Models\ApiKey;
use Illuminate\Support\Facades\Log;
use App\Services\LLM\Providers\OpenAIProvider;
use App\Services\LLM\Providers\GeminiProvider;
use App\Services\LLM\Providers\GroqProvider;
use App\Services\LLM\Providers\HuggingFaceProvider;
use App\Services\LLM\Providers\DeepSeekProvider;
use App\Services\LLM\Providers\LocalProvider;

class LLMClient
{
    /**
     * Classify logs by iterating available API keys and providers until success.
     * @param array $logs
     * @return array<int,array{category:string,confidence:float,raw?:array}>
     */
    public function classify(array $logs): array
    {
        $keys = ApiKey::where('status', 'active')->orderBy('priority')->get();
        if ($keys->isEmpty()) {
            return array_map(fn($l) => ['category' => 'Uncategorized', 'confidence' => 0.0], $logs);
        }

        $lastException = null;
        foreach ($keys as $apiKey) {
            try {
                $providerName = strtolower($apiKey->provider);
                switch ($providerName) {
                    case 'openai':
                        $provider = new OpenAIProvider();
                        $res = $provider->classify($logs, $apiKey);
                        return $res;
                    case 'gemini':
                    case 'google-gemini':
                        $provider = new GeminiProvider();
                        $res = $provider->classify($logs, $apiKey);
                        return $res;
                    case 'groq':
                        $provider = new GroqProvider();
                        $res = $provider->classify($logs, $apiKey);
                        return $res;
                    case 'huggingface':
                    case 'hf':
                        $provider = new HuggingFaceProvider();
                        $res = $provider->classify($logs, $apiKey);
                        return $res;
                    case 'deepseek':
                    case 'deep-seek':
                        $provider = new DeepSeekProvider();
                        $res = $provider->classify($logs, $apiKey);
                        return $res;
                    case 'local':
                    case 'onprem':
                        $provider = new LocalProvider();
                        $res = $provider->classify($logs, $apiKey);
                        return $res;
                    default:
                        // Unknown provider: skip
                        Log::warning('Unknown LLM provider: ' . $apiKey->provider);
                        continue 2;
                }
            } catch (\Throwable $e) {
                $lastException = $e;
                Log::warning('LLM provider error with key ' . $apiKey->id . ': ' . $e->getMessage());
                // Mark key as degraded on repeated failure — simple backoff: set status to degraded temporarily
                $apiKey->status = 'degraded';
                $apiKey->last_checked_at = now();
                $apiKey->save();
                continue;
            }
        }

        // All providers failed: fallback to Uncategorized
        Log::error('All LLM providers failed: ' . ($lastException?->getMessage() ?? 'no exception'));
        return array_map(fn($l) => ['category' => 'Uncategorized', 'confidence' => 0.0], $logs);
    }

    /**
     * Ask an LLM provider to score categories for a monthly evaluation. Returns array keyed by category_id => ['score' => float, 'confidence' => float]
     * If provider scoring fails, return empty array.
     */
    public function scoreEvaluation(int $userId, int $year, int $month, array $breakdown, array $context = []): array
    {
        $keys = ApiKey::where('status', 'active')->orderBy('priority')->get();
        if ($keys->isEmpty()) {
            return [];
        }

        $lastException = null;
        foreach ($keys as $apiKey) {
            try {
                $providerName = strtolower($apiKey->provider);
                switch ($providerName) {
                    case 'openai':
                        $provider = new OpenAIProvider();
                        if (method_exists($provider, 'scoreEvaluation')) {
                            return $provider->scoreEvaluation($userId, $year, $month, $breakdown, $apiKey, $context);
                        }
                        break;
                    case 'gemini':
                        $provider = new \App\Services\LLM\Providers\GeminiProvider();
                        if (method_exists($provider, 'scoreEvaluation')) {
                            return $provider->scoreEvaluation($userId, $year, $month, $breakdown, $apiKey, $context);
                        }
                        break;
                    default:
                        Log::warning('Provider does not implement scoring: ' . $apiKey->provider);
                        continue 2;
                }
            } catch (\Throwable $e) {
                $lastException = $e;
                Log::warning('LLM scoring error with key ' . $apiKey->id . ': ' . $e->getMessage());
                $apiKey->status = 'degraded';
                $apiKey->last_checked_at = now();
                $apiKey->save();
                continue;
            }
        }

        Log::error('All providers failed scoring: ' . ($lastException?->getMessage() ?? 'no exception'));
        return [];
    }
}
