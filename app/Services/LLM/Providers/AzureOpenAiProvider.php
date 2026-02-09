<?php

namespace App\Services\LLM\Providers;

use App\Models\ApiKey;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AzureOpenAiProvider
{
    protected $apiKey;
    protected $apiEndpoint;
    protected $apiVersion;
    protected $deploymentId;

    /**
     * Initialize Azure OpenAI provider with API key configuration
     */
    public function __construct(ApiKey $apiKey)
    {
        $this->apiKey = $apiKey;

        // Parse configuration from encrypted key or metadata
        // Expected format in base_url: https://myresource.openai.azure.com/
        $this->apiEndpoint = $apiKey->base_url ?? env('AZURE_OPENAI_ENDPOINT');
        $this->apiVersion = $apiKey->api_version ?? '2024-02-15-preview';

        // Deployment ID should be stored in model name or separate field
        $this->deploymentId = $apiKey->model ?? $apiKey->preferred_model ?? 'deployment-gpt-4';

        if (!$this->apiEndpoint) {
            throw new \RuntimeException('Azure OpenAI endpoint not configured');
        }
    }

    /**
     * Classify logs using Azure OpenAI Chat Completions API
     */
    public function classify(array $logs, ApiKey $apiKey): array
    {
        $url = $this->buildUrl('/chat/completions');

        // Build system prompt enumerating categories
        $categories = \App\Models\KpiCategory::pluck('name')->toArray();
        $system = "You are a classifier. Map each input to exactly one of these KPI categories: " . implode(', ', $categories) . ".\n";
        $system .= "Respond ONLY with a JSON array in the format: [{\"category\": string, \"confidence\": float}]\n";
        $system .= "Wrap the JSON response between <<<JSON_START>>> and <<<JSON_END>>> markers.";

        // Few-shot examples
        $examples = [];
        if (count($categories) > 0) {
            $examples[] = [
                'input' => 'Completed client demo and gathered requirements',
                'output' => [['category' => $categories[0], 'confidence' => 0.95]],
            ];
        }
        if (count($categories) > 1) {
            $examples[] = [
                'input' => 'Fixed production bug causing 500 errors',
                'output' => [['category' => $categories[1], 'confidence' => 0.98]],
            ];
        }

        // Build inputs
        $inputs = [];
        foreach ($logs as $log) {
            $desc = is_string($log->description ?? null) ? $log->description : (string)($log['description'] ?? '');
            $inputs[] = $desc;
        }

        // Build user message
        $userPayload = "Classify the following inputs. Return an array where index i corresponds to input i.\n\n";
        foreach ($inputs as $i => $text) {
            $userPayload .= "[" . ($i + 1) . "] " . $text . "\n";
        }

        // Build message sequence
        $messages = [['role' => 'system', 'content' => $system]];

        foreach ($examples as $ex) {
            $messages[] = ['role' => 'user', 'content' => $ex['input']];
            $messages[] = [
                'role' => 'assistant',
                'content' => "<<<JSON_START>>>" . json_encode($ex['output'], JSON_THROW_ON_ERROR) . "<<<JSON_END>>>",
            ];
        }

        $messages[] = ['role' => 'user', 'content' => $userPayload];

        $payload = [
            'messages' => $messages,
            'temperature' => 0.0,
            'max_tokens' => 1500,
        ];

        try {
            $resp = $this->makeRequest('POST', $url, $payload);

            if (!$resp->successful()) {
                Log::warning('Azure OpenAI classify failed: ' . $resp->body());
                throw new \RuntimeException('Azure OpenAI classification failed: ' . $resp->status());
            }

            $json = $resp->json();

            // Extract assistant content robustly
            $content = $json['choices'][0]['message']['content'] ?? null;
            $results = [];

            if ($content) {
                if (preg_match('/<<<JSON_START>>>(.*)<<<JSON_END>>>/s', $content, $m)) {
                    $candidate = trim($m[1]);
                } elseif (preg_match('/(\[\s*\{.*?\}\s*\])/s', $content, $m)) {
                    $candidate = trim($m[1]);
                } else {
                    $candidate = trim($content);
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

            // Ensure results length matches inputs
            while (count($results) < count($inputs)) {
                $results[] = ['category' => 'Uncategorized', 'confidence' => 0.0];
            }

            return $results;
        } catch (\Exception $e) {
            Log::error('Azure OpenAI classification error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Health check for Azure OpenAI connection
     */
    public function healthCheck(): bool
    {
        try {
            $url = $this->buildUrl('/models');
            $resp = $this->makeRequest('GET', $url);

            if ($resp->successful()) {
                $this->apiKey->status = 'active';
                $this->apiKey->last_checked_at = now();
                $this->apiKey->save();
                return true;
            }

            $this->apiKey->status = 'degraded';
            $this->apiKey->last_checked_at = now();
            $this->apiKey->save();
            return false;
        } catch (\Exception $e) {
            Log::warning('Azure OpenAI health check failed: ' . $e->getMessage());
            $this->apiKey->status = 'degraded';
            $this->apiKey->save();
            return false;
        }
    }

    /**
     * Score evaluation using Azure OpenAI
     */
    public function scoreEvaluation(int $userId, int $year, int $month, array $breakdown): array
    {
        $url = $this->buildUrl('/chat/completions');

        $system = "You are an objective evaluator. Given the monthly breakdown for an employee, return a JSON object mapping category_id to {\"score\":number (0-10), \"confidence\":number (0-1)}.\nRespond only with JSON between <<<JSON_START>>> and <<<JSON_END>>>.";

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

        $messages = [['role' => 'system', 'content' => $system]];
        foreach ($examples as $ex) {
            $messages[] = ['role' => 'user', 'content' => $ex['input']];
            $messages[] = ['role' => 'assistant', 'content' => "<<<JSON_START>>>" . json_encode($ex['output']) . "<<<JSON_END>>>"];
        }
        $messages[] = ['role' => 'user', 'content' => $userText];

        $payload = [
            'messages' => $messages,
            'temperature' => 0.0,
            'max_tokens' => 800,
        ];

        try {
            $resp = $this->makeRequest('POST', $url, $payload);

            if ($resp->failed()) {
                Log::warning('Azure OpenAI scoring failed: ' . $resp->body());
                throw new \RuntimeException('Azure OpenAI scoring failed');
            }

            $json = $resp->json();
            $content = $json['choices'][0]['message']['content'] ?? null;

            if (!$content) {
                return [];
            }

            if (preg_match('/<<<JSON_START>>>(.*)<<<JSON_END>>>/s', $content, $m)) {
                $candidate = trim($m[1]);
            } elseif (preg_match('/(\{\s*\"?\d+\"?\s*:\s*\{.*?\}\s*\})/s', $content, $m)) {
                $candidate = trim($m[1]);
            } else {
                $candidate = trim($content);
            }

            $parsed = @json_decode($candidate, true);
            if (!is_array($parsed)) {
                return [];
            }

            // Normalize: convert keys to ints
            $out = [];
            foreach ($parsed as $k => $v) {
                $id = (int)$k;
                $out[$id] = [
                    'score' => isset($v['score']) ? (float)$v['score'] : null,
                    'confidence' => isset($v['confidence']) ? (float)$v['confidence'] : 0.0,
                ];
            }

            return $out;
        } catch (\Exception $e) {
            Log::error('Azure OpenAI scoring error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Discover available models/deployments in Azure OpenAI
     */
    public function discoverModels(): array
    {
        try {
            $url = $this->buildUrl('/models');
            $resp = $this->makeRequest('GET', $url);

            if (!$resp->successful()) {
                Log::warning('Failed to discover Azure models: ' . $resp->body());
                return [];
            }

            $json = $resp->json();
            $models = [];

            // Parse Azure deployment/model list
            if (isset($json['data']) && is_array($json['data'])) {
                foreach ($json['data'] as $model) {
                    $models[] = $model['id'] ?? $model['model'] ?? null;
                }
            }

            // Also add the deployment ID as a known available model
            if ($this->deploymentId && !in_array($this->deploymentId, $models)) {
                $models[] = $this->deploymentId;
            }

            return array_filter($models);
        } catch (\Exception $e) {
            Log::warning('Error discovering Azure models: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Verify a specific model/deployment is accessible
     */
    public function verifyModel(string $modelName): bool
    {
        try {
            // Build a test completion call to verify the model/deployment exists
            $url = $this->buildUrl('/chat/completions', $modelName);

            $payload = [
                'messages' => [
                    ['role' => 'system', 'content' => 'You are a helpful assistant.'],
                    ['role' => 'user', 'content' => 'Say "OK" and nothing else.'],
                ],
                'temperature' => 0.0,
                'max_tokens' => 10,
            ];

            $resp = $this->makeRequest('POST', $url, $payload, timeout: 10);

            if ($resp->successful()) {
                Log::info('Azure model verified: ' . $modelName);
                return true;
            }

            Log::warning('Azure model verification failed for ' . $modelName . ': ' . $resp->body());
            return false;
        } catch (\Exception $e) {
            Log::warning('Error verifying Azure model ' . $modelName . ': ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Build Azure OpenAI API URL
     */
    protected function buildUrl(string $endpoint, string $deployment = null): string
    {
        $deployment = $deployment ?? $this->deploymentId;
        $endpoint = ltrim($endpoint, '/');

        // Format: {endpoint}/openai/deployments/{deployment-id}/{endpoint}?api-version={version}
        return rtrim($this->apiEndpoint, '/') .
            "/openai/deployments/{$deployment}/{$endpoint}" .
            "?api-version={$this->apiVersion}";
    }

    /**
     * Make HTTP request with Azure authentication
     */
    protected function makeRequest(
        string $method,
        string $url,
        array $data = null,
        int $timeout = 30
    ) {
        $headers = [
            'api-key' => decrypt($this->apiKey->encrypted_key),
            'Content-Type' => 'application/json',
        ];

        // Support for custom SSL certificates (for on-premises deployments)
        $options = [];
        if ($this->apiKey->supports_self_signed_certs) {
            $options['verify'] = false;
        }

        $client = Http::withHeaders($headers)
            ->timeout($timeout);

        if (!empty($options)) {
            $client = $client->withOptions($options);
        }

        if ($method === 'GET') {
            return $client->get($url);
        } elseif ($method === 'POST') {
            return $client->post($url, $data ?? []);
        } elseif ($method === 'PUT') {
            return $client->put($url, $data ?? []);
        } elseif ($method === 'DELETE') {
            return $client->delete($url);
        }

        throw new \RuntimeException('Unsupported HTTP method: ' . $method);
    }
}
