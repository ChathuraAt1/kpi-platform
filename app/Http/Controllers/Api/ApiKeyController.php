<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiKey;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Artisan;
use App\Http\Requests\StoreApiKeyRequest;
use App\Http\Requests\UpdateApiKeyRequest;

class ApiKeyController extends Controller
{
    public function index(Request $request)
    {
        // TODO: restrict to admin role via middleware
        $keys = ApiKey::orderBy('priority')->get();
        return response()->json($keys);
    }

    public function store(StoreApiKeyRequest $request)
    {
        $data = $request->validated();

        $apiKey = ApiKey::create([
            'user_id' => $request->user()->id,
            'provider' => $data['provider'],
            'name' => $data['name'],
            'encrypted_key' => Crypt::encryptString($data['key']),
            'priority' => $data['priority'] ?? 10,
            'daily_quota' => $data['daily_quota'] ?? null,
            'model' => $data['model'] ?? null,
            'base_url' => $data['base_url'] ?? null,
            'status' => 'active',
        ]);

        return response()->json($apiKey, 201);
    }

    public function show($id)
    {
        $key = ApiKey::findOrFail($id);
        return response()->json($key);
    }

    public function update(UpdateApiKeyRequest $request, $id)
    {
        $this->authorize('manageApiKeys');
        $apiKey = ApiKey::findOrFail($id);
        $apiKey->update($request->validated());
        return response()->json($apiKey);
    }

    public function destroy($id)
    {
        $this->authorize('manageApiKeys');
        $apiKey = ApiKey::findOrFail($id);
        $apiKey->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function healthCheckAll(Request $request)
    {
        $this->authorize('manageApiKeys');

        $onlyDegraded = $request->query('only_degraded', false);
        $options = [];
        if ($onlyDegraded) {
            $options['--only-degraded'] = true;
        }

        Artisan::call('apikey:health-check', $options);

        return response()->json(['message' => 'Health check dispatched'], 202);
    }

    /**
     * Get quota status for a specific API key
     */
    public function getQuotaStatus($id)
    {
        $this->authorize('manageApiKeys');

        $apiKey = ApiKey::findOrFail($id);

        return response()->json([
            'api_key_id' => $apiKey->id,
            'provider' => $apiKey->provider,
            'daily_usage' => $apiKey->daily_usage,
            'daily_quota' => $apiKey->daily_quota,
            'remaining' => $apiKey->getRemainingQuota(),
            'usage_percentage' => $apiKey->getQuotaPercentage(),
            'warning_threshold' => $apiKey->quota_warning_threshold,
            'last_reset_at' => $apiKey->last_usage_reset_at,
            'is_exceeded' => $apiKey->isQuotaExceeded(),
            'auto_rotate_enabled' => $apiKey->auto_rotate_on_limit,
        ]);
    }

    /**
     * Get usage history for an API key
     */
    public function getUsageHistory($id, Request $request)
    {
        $this->authorize('manageApiKeys');

        $apiKey = ApiKey::findOrFail($id);
        $days = $request->query('days', 30);

        $history = $apiKey->usageLogs()
            ->where('usage_date', '>=', now()->subDays($days))
            ->orderBy('usage_date', 'desc')
            ->get()
            ->map(function ($log) {
                return [
                    'date' => $log->usage_date->toDateString(),
                    'calls' => $log->call_count,
                    'tokens' => $log->token_usage,
                    'errors' => $log->error_count,
                    'error_rate' => $log->getErrorRateAttribute() . '%',
                    'avg_response_time_ms' => $log->getAverageResponseTimeAttribute(),
                    'models_used' => $log->getModelsUsedArray(),
                ];
            });

        return response()->json([
            'api_key_id' => $apiKey->id,
            'days' => $days,
            'history' => $history,
            'summary' => [
                'total_calls' => $history->sum('calls'),
                'total_tokens' => $history->sum('tokens'),
                'total_errors' => $history->sum('errors'),
                'avg_response_time' => $history->avg('avg_response_time_ms'),
            ],
        ]);
    }

    /**
     * Get available models across all providers or for a specific provider
     */
    public function getAvailableModels(Request $request)
    {
        $this->authorize('manageApiKeys');

        $provider = $request->query('provider');

        $query = \App\Models\LlmModel::available();

        if ($provider) {
            $query->where('provider', $provider);
        }

        $models = $query->get()
            ->groupBy('provider')
            ->map(function ($group) {
                return $group->map(function ($model) {
                    return [
                        'id' => $model->id,
                        'model_name' => $model->model_name,
                        'display_name' => $model->display_name,
                        'context_window' => $model->context_window,
                        'max_tokens' => $model->max_tokens,
                        'capabilities' => $model->capabilities,
                        'cost_per_1k_tokens' => $model->cost_per_1k_tokens,
                        'last_verified_at' => $model->last_verified_at,
                    ];
                });
            });

        return response()->json([
            'provider' => $provider,
            'models' => $models,
        ]);
    }

    /**
     * Verify models available for an API key
     */
    public function verifyKeyModels(Request $request, $id)
    {
        $this->authorize('manageApiKeys');

        $apiKey = ApiKey::findOrFail($id);

        // Get the provider service for this key
        $providerClass = $this->getProviderClass($apiKey->provider);

        if (!$providerClass) {
            return response()->json([
                'error' => 'Provider not found: ' . $apiKey->provider,
            ], 404);
        }

        try {
            // Instantiate provider with API key
            $provider = new $providerClass($apiKey);

            // Discover available models
            $availableModels = $provider->discoverModels();

            // Update api key with available models
            $apiKey->available_models = $availableModels;
            $apiKey->save();

            // Verify each model
            $verified = [];
            $failed = [];

            foreach ($availableModels as $modelName) {
                try {
                    if ($provider->verifyModel($modelName)) {
                        $verified[] = $modelName;

                        // Update or create model verification
                        $model = \App\Models\LlmModel::where('provider', $apiKey->provider)
                            ->where('model_name', $modelName)
                            ->first();

                        if ($model) {
                            $apiKey->models()->syncWithoutDetaching([$model->id => [
                                'is_verified' => true,
                                'last_verified_at' => now(),
                            ]]);
                        }
                    } else {
                        $failed[] = $modelName;
                    }
                } catch (\Exception $e) {
                    $failed[] = [
                        'model' => $modelName,
                        'error' => $e->getMessage(),
                    ];
                }
            }

            return response()->json([
                'api_key_id' => $apiKey->id,
                'verified_models' => $verified,
                'failed_models' => $failed,
                'verification_time' => now(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Verification failed: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Manually rotate to next available key
     */
    public function rotateKey(Request $request, $id)
    {
        $this->authorize('manageApiKeys');

        $apiKey = ApiKey::findOrFail($id);

        $nextKey = ApiKey::where('provider', $apiKey->provider)
            ->where('id', '!=', $id)
            ->where('is_active', true)
            ->orderByDesc('rotation_priority')
            ->orderBy('daily_usage')
            ->first();

        if (!$nextKey) {
            return response()->json([
                'error' => 'No alternative keys available for ' . $apiKey->provider,
            ], 400);
        }

        // Perform rotation
        $apiKey->update(['is_active' => false]);
        $nextKey->update(['is_active' => true]);

        \Log::info('API Key manually rotated', [
            'from_key_id' => $apiKey->id,
            'to_key_id' => $nextKey->id,
            'triggered_by' => $request->user()->id,
        ]);

        return response()->json([
            'rotated_from' => [
                'id' => $apiKey->id,
                'name' => $apiKey->name,
            ],
            'rotated_to' => [
                'id' => $nextKey->id,
                'name' => $nextKey->name,
            ],
            'message' => 'Key rotation successful',
        ]);
    }

    /**
     * Get provider class name
     */
    private function getProviderClass(string $provider): ?string
    {
        $providers = [
            'openai' => 'App\Services\Providers\OpenAiProvider',
            'azure-openai' => 'App\Services\Providers\AzureOpenAiProvider',
            'gemini' => 'App\Services\Providers\GeminiProvider',
            'groq' => 'App\Services\Providers\GroqProvider',
            'deepseek' => 'App\Services\Providers\DeepSeekProvider',
            'huggingface' => 'App\Services\Providers\HuggingFaceProvider',
        ];

        return $providers[strtolower($provider)] ?? null;
    }
}
