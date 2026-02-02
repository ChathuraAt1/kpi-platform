<?php

namespace App\Services\LLM\Providers;

use App\Models\ApiKey;
use Illuminate\Support\Facades\Log;

/**
 * LocalProvider is a lightweight fallback to run small deterministic rules
 * or call an on-prem inference endpoint (e.g., llama.cpp + HTTP gateway).
 */
class LocalProvider
{
    public function classify(array $logs, ApiKey $apiKey): array
    {
        // If apiKey.meta contains endpoint, attempt to POST there; otherwise perform a simple rule-based fallback.
        if (!empty($apiKey->meta['endpoint'])) {
            try {
                $resp = \Illuminate\Support\Facades\Http::post($apiKey->meta['endpoint'], ['inputs' => array_map(fn($l) => $l->description ?? ($l['description'] ?? ''), $logs)]);
                if ($resp->successful()) {
                    $body = $resp->body();
                    if (preg_match('/(\[\s*\{.*?\}\s*\])/s', $body, $m)) {
                        $parsed = @json_decode($m[1], true);
                        if (is_array($parsed)) {
                            return array_map(fn($i) => ['category' => $i['category'] ?? 'Uncategorized', 'confidence' => (float)($i['confidence'] ?? 0.0), 'raw' => $i], $parsed);
                        }
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('LocalProvider remote call failed: ' . $e->getMessage());
            }
        }

        // Fallback: simple keyword mapping (reuse RuleBasedClassifier if available)
        $results = [];
        foreach ($logs as $l) {
            $suggest = \App\Services\LLM\RuleBasedClassifier::classify($l->description ?? ($l['description'] ?? ''));
            if ($suggest) {
                $results[] = ['category' => $suggest['category'] ?? 'Uncategorized', 'confidence' => $suggest['confidence'] ?? 0.0, 'raw' => $suggest];
            } else {
                $results[] = ['category' => 'Uncategorized', 'confidence' => 0.0];
            }
        }

        return $results;
    }

    public function healthCheck(ApiKey $apiKey): bool
    {
        if (empty($apiKey->meta['endpoint'])) {
            // Nothing to check for pure local rule fallback
            $apiKey->status = 'active';
            $apiKey->last_checked_at = now();
            $apiKey->save();
            return true;
        }

        try {
            $resp = \Illuminate\Support\Facades\Http::get($apiKey->meta['endpoint']);
            if ($resp->successful()) {
                $apiKey->status = 'active';
                $apiKey->last_checked_at = now();
                $apiKey->save();
                return true;
            }
        } catch (\Throwable $e) {
            Log::warning('LocalProvider healthCheck failed: ' . $e->getMessage());
        }

        $apiKey->status = 'degraded';
        $apiKey->last_checked_at = now();
        $apiKey->save();
        return false;
    }
}
