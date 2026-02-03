<?php

namespace App\Services\LLM\Providers;

use App\Models\ApiKey;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DeepSeekProvider
{
    public function classify(array $logs, ApiKey $apiKey): array
    {
        $url = $apiKey->base_url ?? 'https://api.deepseek.ai/v1/classify';

        $categories = \App\Models\KpiCategory::pluck('name')->toArray();
        $prompt = "Map inputs to one of: " . implode(', ', $categories) . ". Return JSON array between markers <<<JSON_START>>> and <<<JSON_END>>>.";

        $inputs = array_map(fn($l) => is_string($l->description ?? null) ? $l->description : ($l['description'] ?? ''), $logs);

        // Few-shot examples
        $examples = '';
        if (count($categories) > 0) {
            $examples .= "Example Input: Completed client demo\nExample Output: <<<JSON_START>>>[{\"category\":\"" . addslashes($categories[0]) . "\",\"confidence\":0.95}]<<<JSON_END>>>\n\n";
        }
        if (count($categories) > 1) {
            $examples .= "Example Input: Fixed production bug\nExample Output: <<<JSON_START>>>[{\"category\":\"" . addslashes($categories[1]) . "\",\"confidence\":0.98}]<<<JSON_END>>>\n\n";
        }

        $payload = ['prompt' => $prompt . '\n' . $examples, 'inputs' => $inputs];

        try {
            $resp = Http::withHeaders([
                'Authorization' => 'Bearer ' . decrypt($apiKey->encrypted_key),
                'Accept' => 'application/json',
            ])->post($url, $payload);

            if ($resp->failed()) {
                Log::warning('DeepSeek classify failed: ' . $resp->body());
                throw new \RuntimeException('DeepSeek classify failed');
            }

            // attempt to update usage if provider returns usage metadata
            try {
                $json = $resp->json();
                $tokens = null;
                if (is_array($json)) {
                    if (isset($json['usage']['total_tokens'])) {
                        $tokens = (int)$json['usage']['total_tokens'];
                    } elseif (isset($json['usage']['tokens'])) {
                        $tokens = (int)$json['usage']['tokens'];
                    } elseif (isset($json['meta']['tokens'])) {
                        $tokens = (int)$json['meta']['tokens'];
                    } elseif (isset($json['estimated_tokens'])) {
                        $tokens = (int)$json['estimated_tokens'];
                    }
                }
                if ($tokens) {
                    $apiKey->increment('daily_usage', $tokens);
                    $apiKey->last_checked_at = now();
                    $apiKey->save();
                }
            } catch (\Throwable $_) {
                // ignore
            }

            $body = $resp->body();
            return $this->extractJsonResults($body, count($inputs));
        } catch (\Throwable $e) {
            Log::warning('DeepSeek provider error: ' . $e->getMessage());
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
            $endpoint = $apiKey->meta['endpoint'] ?? 'https://api.deepseek.ai/v1/ping';
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
            Log::warning('DeepSeek healthCheck failed: ' . $e->getMessage());
        }

        $apiKey->status = 'degraded';
        $apiKey->last_checked_at = now();
        $apiKey->save();
        return false;
    }

    /**
     * Score evaluation breakdown using the provider. Returns array keyed by category_id => ['score'=>float,'confidence'=>float]
     */
    public function scoreEvaluation(int $userId, int $year, int $month, array $breakdown, ApiKey $apiKey): array
    {
        $endpoint = $apiKey->meta['endpoint'] ?? 'https://api.deepseek.ai/v1/score';

        $system = "You are an objective evaluator. Given the monthly breakdown for an employee, return a JSON object mapping category_id to {\"score\":number (0-10), \"confidence\":number (0-1)}. Respond ONLY with JSON between <<<JSON_START>>> and <<<JSON_END>>>.";

        $examples = [];
        foreach (array_slice($breakdown, 0, 2) as $b) {
            $examples[] = [
                'input' => "Category: {$b['category_name']}, logged_hours={$b['logged_hours']}, planned_hours={$b['planned_hours']}, rule_score={$b['rule_score']}",
                'output' => [(int)$b['category_id'] => ['score' => round($b['rule_score'], 2), 'confidence' => 0.9]],
            ];
        }

        $userText = "EmployeeId={$userId} Year={$year} Month={$month}\n";
        foreach ($breakdown as $b) {
            $userText .= "CategoryId={$b['category_id']} Name={$b['category_name']} logged_hours={$b['logged_hours']} planned_hours={$b['planned_hours']} rule_score={$b['rule_score']}\n";
        }

        $payloadText = $system . "\n\n";
        foreach ($examples as $ex) {
            $payloadText .= "User: {$ex['input']}\nAssistant: <<<JSON_START>>>" . json_encode($ex['output']) . "<<<JSON_END>>>\n\n";
        }
        $payloadText .= "User: {$userText}";

        $payload = ['prompt' => $payloadText, 'inputs' => []];

        try {
            $resp = Http::withHeaders([
                'Authorization' => 'Bearer ' . decrypt($apiKey->encrypted_key),
                'Accept' => 'application/json',
            ])->post($endpoint, $payload);

            if ($resp->failed()) {
                Log::warning('DeepSeek scoring failed: ' . $resp->body());
                throw new \RuntimeException('DeepSeek scoring failed');
            }

            $body = $resp->body();
            if (preg_match('/<<<JSON_START>>>(.*)<<<JSON_END>>>/s', $body, $m)) {
                $candidate = trim($m[1]);
            } elseif (preg_match('/(\{\s*\"?\d+\"?\s*:\s*\{.*?\}\s*\})/s', $body, $m)) {
                $candidate = trim($m[1]);
            } else {
                $candidate = trim($body);
            }

            $parsed = @json_decode($candidate, true);
            if (!is_array($parsed)) return [];

            $out = [];
            foreach ($parsed as $k => $v) {
                $id = (int)$k;
                $out[$id] = [
                    'score' => isset($v['score']) ? (float)$v['score'] : null,
                    'confidence' => isset($v['confidence']) ? (float)$v['confidence'] : 0.0,
                ];
            }

            return $out;
        } catch (\Throwable $e) {
            Log::warning('DeepSeek scoring provider error: ' . $e->getMessage());
            throw $e;
        }
    }
}
