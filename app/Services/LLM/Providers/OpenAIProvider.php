<?php

namespace App\Services\LLM\Providers;

use App\Models\ApiKey;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAIProvider
{
    /**
     * Classify logs using OpenAI Chat Completions API with robust JSON extraction.
     * Returns array of suggestions for each input log.
     *
     * @param array $logs Array of TaskLog models or arrays
     * @param ApiKey $apiKey
     * @return array<int,array{category:string,confidence:float,raw?:array}>
     */
    public function classify(array $logs, ApiKey $apiKey): array
    {
        $model = $apiKey->model ?? 'gpt-4o-mini';
        $url = $apiKey->base_url ?? 'https://api.openai.com/v1/chat/completions';

        // build system prompt enumerating categories
        $categories = \App\Models\KpiCategory::pluck('name')->toArray();
        $system = "You are a classifier. Map each input to exactly one of these KPI categories: " . implode(', ', $categories) . ".\n";
        $system .= "Respond ONLY with a JSON array in the following format: [{\"category\": string, \"confidence\": float}] and nothing else.\n";
        $system .= "Wrap the JSON response between the markers <<<JSON_START>>> and <<<JSON_END>>> to make extraction robust.";

        // Few-shot examples (2-3) to encourage deterministic JSON output
        $examples = [];
        if (count($categories) > 0) {
            $examples[] = ['input' => 'Completed client demo and gathered requirements', 'output' => [[ 'category' => $categories[0], 'confidence' => 0.95 ]]];
        }
        if (count($categories) > 1) {
            $examples[] = ['input' => 'Fixed production bug causing 500 errors', 'output' => [[ 'category' => $categories[1], 'confidence' => 0.98 ]]];
        }
        if (count($categories) > 2) {
            $examples[] = ['input' => 'Wrote unit tests and updated CI pipelines', 'output' => [[ 'category' => $categories[2], 'confidence' => 0.9 ]]];
        }

        $inputs = [];
        foreach ($logs as $log) {
            $desc = is_string($log->description ?? null) ? $log->description : (string)($log['description'] ?? '');
            $inputs[] = $desc;
        }

        // Single user message contains inputs; model should return array with same length
        $userPayload = "Classify the following inputs. Return an array where index i corresponds to input i.\n\n";
        foreach ($inputs as $i => $text) {
            $userPayload .= "[" . ($i + 1) . "] " . $text . "\n";
        }

        // Build example message sequence: user->assistant pairs
        $messages = [
            ['role' => 'system', 'content' => $system],
        ];

        foreach ($examples as $ex) {
            $messages[] = ['role' => 'user', 'content' => $ex['input']];
            $messages[] = ['role' => 'assistant', 'content' => "<<<JSON_START>>>" . json_encode($ex['output'], JSON_THROW_ON_ERROR) . "<<<JSON_END>>>"];
        }

        $messages[] = ['role' => 'user', 'content' => $userPayload];

        $payload = [
            'model' => $model,
            'messages' => $messages,
            'temperature' => 0.0,
            'max_tokens' => 1500,
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
        if (is_array($json) && isset($json['usage']['total_tokens'])) {
            $apiKey->increment('daily_usage', (int)$json['usage']['total_tokens']);
            $apiKey->last_checked_at = now();
            $apiKey->save();
        }

        // Extract assistant content robustly. Accept markers or raw JSON inside text.
        $content = $json['choices'][0]['message']['content'] ?? ($json['choices'][0]['text'] ?? null);
        $results = [];
        if ($content) {
            // Try marker extraction first
            if (preg_match('/<<<JSON_START>>>(.*)<<<JSON_END>>>/s', $content, $m)) {
                $candidate = trim($m[1]);
            } else {
                // Fallback: find first JSON array in the text
                if (preg_match('/(\[\s*\{.*?\}\s*\])/s', $content, $m)) {
                    $candidate = trim($m[1]);
                } else {
                    // Last resort: treat entire content as JSON
                    $candidate = trim($content);
                }
            }

            $parsed = @json_decode($candidate, true);
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

    /**
     * Simple health check for an API key. Returns true if key appears valid.
     */
    public function healthCheck(ApiKey $apiKey): bool
    {
        $modelsUrl = 'https://api.openai.com/v1/models';
        try {
            $resp = Http::withHeaders([
                'Authorization' => 'Bearer ' . decrypt($apiKey->encrypted_key),
                'Accept' => 'application/json',
            ])->get($modelsUrl);

            if ($resp->successful()) {
                $apiKey->last_checked_at = now();
                $apiKey->status = 'active';
                $apiKey->save();
                return true;
            }
        } catch (\Throwable $e) {
            Log::warning('OpenAI healthCheck failed for key ' . $apiKey->id . ': ' . $e->getMessage());
        }

        $apiKey->last_checked_at = now();
        $apiKey->status = 'degraded';
        $apiKey->save();
        return false;
    }

    /**
     * Score evaluation breakdown using the LLM. Returns array keyed by category_id => ['score'=>float,'confidence'=>float]
     */
    public function scoreEvaluation(int $userId, int $year, int $month, array $breakdown, ApiKey $apiKey): array
    {
        $model = $apiKey->model ?? 'gpt-4o-mini';
        $url = $apiKey->base_url ?? 'https://api.openai.com/v1/chat/completions';

        $system = "You are an objective evaluator. Given the monthly breakdown for an employee, return a JSON object mapping category_id to {\"score\":number (0-10), \"confidence\":number (0-1)}. Respond only with JSON between <<<JSON_START>>> and <<<JSON_END>>>.";

        $examples = [];
        // create few-shot examples using provided breakdown items
        foreach (array_slice($breakdown, 0, 2) as $b) {
            $examples[] = [
                'input' => "Category: {$b['category_name']}, logged_hours={$b['logged_hours']}, planned_hours={$b['planned_hours']}, rule_score={$b['rule_score']}",
                'output' => [ (int)$b['category_id'] => ['score' => round($b['rule_score'],2), 'confidence' => 0.9] ],
            ];
        }

        $userText = "EmployeeId={$userId} Year={$year} Month={$month}\n";
        foreach ($breakdown as $b) {
            $userText .= "CategoryId={$b['category_id']} Name={$b['category_name']} logged_hours={$b['logged_hours']} planned_hours={$b['planned_hours']} rule_score={$b['rule_score']}\n";
        }

        $messages = [ ['role' => 'system', 'content' => $system] ];
        foreach ($examples as $ex) {
            $messages[] = ['role' => 'user', 'content' => $ex['input']];
            $messages[] = ['role' => 'assistant', 'content' => "<<<JSON_START>>>" . json_encode($ex['output']) . "<<<JSON_END>>>"];
        }
        $messages[] = ['role' => 'user', 'content' => $userText];

        $payload = ['model' => $model, 'messages' => $messages, 'temperature' => 0.0, 'max_tokens' => 800];

        $resp = Http::withHeaders([
            'Authorization' => 'Bearer ' . decrypt($apiKey->encrypted_key),
            'Accept' => 'application/json',
        ])->post($url, $payload);

        if ($resp->failed()) {
            Log::warning('OpenAI scoring failed: ' . $resp->body());
            throw new \RuntimeException('OpenAI scoring failed');
        }

        $json = $resp->json();
        $content = $json['choices'][0]['message']['content'] ?? ($json['choices'][0]['text'] ?? null);
        if (!$content) return [];

        if (preg_match('/<<<JSON_START>>>(.*)<<<JSON_END>>>/s', $content, $m)) {
            $candidate = trim($m[1]);
        } elseif (preg_match('/(\{\s*\"?\d+\"?\s*:\s*\{.*?\}\s*\})/s', $content, $m)) {
            $candidate = trim($m[1]);
        } else {
            $candidate = trim($content);
        }

        $parsed = @json_decode($candidate, true);
        if (!is_array($parsed)) return [];

        // normalize: convert keys to ints and ensure score/confidence
        $out = [];
        foreach ($parsed as $k => $v) {
            $id = (int)$k;
            $out[$id] = [
                'score' => isset($v['score']) ? (float)$v['score'] : null,
                'confidence' => isset($v['confidence']) ? (float)$v['confidence'] : 0.0,
            ];
        }

        return $out;
    }
}
