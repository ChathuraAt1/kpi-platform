<?php

namespace App\Services\LLM\Providers;

use App\Models\ApiKey;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAIProvider
{
    /**
     * Classify logs using OpenAI Chat Completions API.
     * Returns array of suggestions for each input log.
     *
     * @param array $logs Array of TaskLog models or arrays
     * @param ApiKey $apiKey
     * @return array<int,array{category:string,confidence:float,raw?:array}>
     */
    public function classify(array $logs, ApiKey $apiKey): array
    {
        $model = $apiKey->meta['model'] ?? 'gpt-4o-mini';
        $url = $apiKey->meta['endpoint'] ?? 'https://api.openai.com/v1/chat/completions';

        // build messages: system prompt enumerating categories
        $categories = \App\Models\KpiCategory::pluck('name')->toArray();
        $system = "You are a classifier. Map task descriptions to one of these KPI categories: " . implode(', ', $categories) . ". Respond with strict JSON array where each item matches {\"category\":string,\"confidence\":float}.";

        $inputs = [];
        foreach ($logs as $log) {
            $desc = is_string($log->description ?? null) ? $log->description : (string)($log['description'] ?? '');
            $inputs[] = $desc;
        }

        $messages = [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => json_encode(['inputs' => $inputs])]
        ];

        $payload = [
            'model' => $model,
            'messages' => $messages,
            'temperature' => 0.0,
            'max_tokens' => 3000,
        ];

        $resp = Http::withHeaders([
            'Authorization' => 'Bearer ' . decrypt($apiKey->encrypted_key),
            'Accept' => 'application/json',
        ])->post($url, $payload);

        if ($resp->failed()) {
            $status = $resp->status();
            Log::warning("OpenAI classify failed: status={$status}, body=" . $resp->body());
            throw new \RuntimeException('OpenAI classification failed: ' . $status);
        }

        $json = $resp->json();
        // update key usage if available
        if (isset($json['usage']['total_tokens'])) {
            $apiKey->increment('daily_usage', $json['usage']['total_tokens']);
            $apiKey->last_checked_at = now();
            $apiKey->save();
        }

        // Extract assistant content (assumes it returns a JSON array)
        $content = $json['choices'][0]['message']['content'] ?? null;
        $results = [];
        if ($content) {
            // try parse JSON
            $parsed = @json_decode($content, true);
            if (is_array($parsed)) {
                foreach ($parsed as $item) {
                    $results[] = [
                        'category' => $item['category'] ?? 'Uncategorized',
                        'confidence' => (float)($item['confidence'] ?? 0.0),
                        'raw' => $item,
                    ];
                }
            }
        }

        // ensure results length matches inputs
        while (count($results) < count($inputs)) {
            $results[] = ['category' => 'Uncategorized', 'confidence' => 0.0];
        }

        return $results;
    }
}
