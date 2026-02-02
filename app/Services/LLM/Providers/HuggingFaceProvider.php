<?php

namespace App\Services\LLM\Providers;

use App\Models\ApiKey;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class HuggingFaceProvider
{
    public function classify(array $logs, ApiKey $apiKey): array
    {
        // Hugging Face inference: POST to /models/{model}
        $model = $apiKey->meta['model'] ?? 'bigscience/bloom';
        $endpoint = $apiKey->meta['endpoint'] ?? ('https://api-inference.huggingface.co/models/' . $model);

        $categories = \App\Models\KpiCategory::pluck('name')->toArray();
        $prompt = "Map inputs to one of: " . implode(', ', $categories) . ". Return JSON array between <<<JSON_START>>> and <<<JSON_END>>>.";

        $inputs = array_map(fn($l) => is_string($l->description ?? null) ? $l->description : ($l['description'] ?? ''), $logs);

        // Few-shot examples
        $examples = '';
        if (count($categories) > 0) {
            $examples .= "Example Input: Completed client demo\nExample Output: <<<JSON_START>>>[{\"category\":\"" . addslashes($categories[0]) . "\",\"confidence\":0.95}]<<<JSON_END>>>\n\n";
        }
        if (count($categories) > 1) {
            $examples .= "Example Input: Fixed production bug\nExample Output: <<<JSON_START>>>[{\"category\":\"" . addslashes($categories[1]) . "\",\"confidence\":0.98}]<<<JSON_END>>>\n\n";
        }

        $payload = ['inputs' => $prompt . "\n" . $examples . implode("\n", $inputs)];

        try {
            $resp = Http::withHeaders([
                'Authorization' => 'Bearer ' . decrypt($apiKey->encrypted_key),
                'Accept' => 'application/json',
            ])->post($endpoint, $payload);

            if ($resp->failed()) {
                Log::warning('HuggingFace classify failed: ' . $resp->body());
                throw new \RuntimeException('HuggingFace classify failed');
            }

            $body = $resp->body();
            return $this->extractJsonResults($body, count($inputs));
        } catch (\Throwable $e) {
            Log::warning('HuggingFace provider error: ' . $e->getMessage());
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
            $model = $apiKey->meta['model'] ?? 'bigscience/bloom';
            $endpoint = $apiKey->meta['endpoint'] ?? ('https://api-inference.huggingface.co/models/' . $model);
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
            Log::warning('HuggingFace healthCheck failed: ' . $e->getMessage());
        }

        $apiKey->status = 'degraded';
        $apiKey->last_checked_at = now();
        $apiKey->save();
        return false;
    }
}
