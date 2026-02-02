<?php

namespace App\Services\LLM\Providers;

use App\Models\ApiKey;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiProvider
{
    /**
     * Classify using Gemini-like endpoints. Uses ApiKey->meta for model/endpoint overrides.
     */
    public function classify(array $logs, ApiKey $apiKey): array
    {
        $endpoint = $apiKey->meta['endpoint'] ?? 'https://gemini.googleapis.com/v1/models/' . ($apiKey->meta['model'] ?? 'gemini-pro');

        $categories = \App\Models\KpiCategory::pluck('name')->toArray();
        $system = "You are a classifier. Map each input to exactly one of these KPI categories: " . implode(', ', $categories) . ".\n";
        $system .= "Respond ONLY with a JSON array between <<<JSON_START>>> and <<<JSON_END>>> in the format [{\"category\":string,\"confidence\":float}].";

        $inputs = array_map(fn($l) => is_string($l->description ?? null) ? $l->description : ($l['description'] ?? ''), $logs);

        // Few-shot examples appended to prompt for deterministic JSON
        $examplesPrompt = '';
        if (count($categories) > 0) {
            $examplesPrompt .= "Example: Input: Completed client demo -> Output: <<<JSON_START>>>[{'category':'" . addslashes($categories[0]) . "','confidence':0.95}]<<<JSON_END>>>\n";
        }
        if (count($categories) > 1) {
            $examplesPrompt .= "Example: Input: Fixed production bug -> Output: <<<JSON_START>>>[{'category':'" . addslashes($categories[1]) . "','confidence':0.98}]<<<JSON_END>>>\n";
        }

        $payload = [
            'prompt' => $system . "\n" . $examplesPrompt . implode("\n", $inputs),
            'temperature' => 0.0,
        ];

        try {
            $resp = Http::withHeaders([
                'Authorization' => 'Bearer ' . decrypt($apiKey->encrypted_key),
                'Accept' => 'application/json',
            ])->post($endpoint, $payload);

            if ($resp->failed()) {
                Log::warning('Gemini classify failed: ' . $resp->body());
                throw new \RuntimeException('Gemini classify failed');
            }

            $text = $resp->json()['output'][0]['content'] ?? $resp->body();
            return $this->extractJsonResults($text, count($inputs));
        } catch (\Throwable $e) {
            Log::warning('Gemini provider error: ' . $e->getMessage());
            throw $e;
        }
    }

    private function extractJsonResults(string $content, int $expected): array
    {
        if (preg_match('/<<<JSON_START>>>(.*)<<<JSON_END>>>/s', $content, $m)) {
            $candidate = trim($m[1]);
        } elseif (preg_match('/(\[\s*\{.*?\}\s*\])/s', $content, $m)) {
            $candidate = trim($m[1]);
        } else {
            $candidate = trim($content);
        }

        $parsed = @json_decode($candidate, true);
        $results = [];
        if (is_array($parsed)) {
            foreach ($parsed as $item) {
                $results[] = [
                    'category' => $item['category'] ?? 'Uncategorized',
                    'confidence' => (float)($item['confidence'] ?? 0.0),
                    'raw' => $item,
                ];
            }
        }

        while (count($results) < $expected) {
            $results[] = ['category' => 'Uncategorized', 'confidence' => 0.0];
        }

        return $results;
    }

    public function healthCheck(ApiKey $apiKey): bool
    {
        try {
            $endpoint = $apiKey->meta['endpoint'] ?? 'https://gemini.googleapis.com/v1/models';
            $resp = Http::withHeaders([
                'Authorization' => 'Bearer ' . decrypt($apiKey->encrypted_key),
            ])->get($endpoint);
            if ($resp->successful()) {
                $apiKey->status = 'active';
                $apiKey->last_checked_at = now();
                $apiKey->save();
                return true;
            }
        } catch (\Throwable $e) {
            Log::warning('Gemini healthCheck failed: ' . $e->getMessage());
        }

        $apiKey->status = 'degraded';
        $apiKey->last_checked_at = now();
        $apiKey->save();
        return false;
    }
}
