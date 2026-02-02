<?php

namespace App\Services\LLM;

use App\Models\ApiKey;
use Illuminate\Support\Facades\Http;

class LLMClient
{
    /**
     * Classify an array of TaskLog models (or arrays) and return array of suggestions.
     * This is a small adapter skeleton — replace the HTTP call with a real provider.
     *
     * @param array $logs
     * @return array<int,array{category:string,confidence:float,raw?:array}>
     */
    public function classify(array $logs): array
    {
        // pick first active API key (simple strategy)
        $apiKey = ApiKey::where('status', 'active')->orderBy('priority')->first();
        if (!$apiKey) {
            // fallback: return unknown suggestions
            return array_map(fn($l) => ['category' => 'Uncategorized', 'confidence' => 0.0], $logs);
        }

        $key = decrypt($apiKey->encrypted_key);

        // TODO: implement provider-specific payload & HTTP call
        // Placeholder: return low-confidence match using TaskLog description tokens
        $results = [];
        foreach ($logs as $log) {
            $desc = is_string($log->description ?? null) ? $log->description : (string)($log['description'] ?? '');
            $category = 'Uncategorized';
            $confidence = 0.0;
            if ($desc !== '') {
                // naive heuristic: look for keywords
                if (stripos($desc, 'bug') !== false || stripos($desc, 'fix') !== false) {
                    $category = 'Support';
                    $confidence = 0.6;
                } elseif (stripos($desc, 'feature') !== false || stripos($desc, 'implement') !== false) {
                    $category = 'Delivery';
                    $confidence = 0.6;
                }
            }
            $results[] = ['category' => $category, 'confidence' => $confidence, 'raw' => null];
        }

        return $results;
    }
}
