<?php

namespace App\Services\LLM;

use App\Models\KpiCategory;

class RuleBasedClassifier
{
    /**
     * Very small rule-based classifier: tries to match category name keywords.
     * Returns ['category'=>string,'confidence'=>float] or null when no match.
     */
    public static function classify(?string $text): ?array
    {
        $text = strtolower($text ?? '');
        if (trim($text) === '') {
            return null;
        }

        $categories = KpiCategory::all();
        foreach ($categories as $cat) {
            $name = strtolower($cat->name);
            // split on non-word and check if any token appears in text
            $tokens = preg_split('/[^a-z0-9]+/', $name);
            foreach ($tokens as $t) {
                if ($t !== '' && strpos($text, $t) !== false) {
                    return ['category' => $cat->name, 'confidence' => 0.7];
                }
            }
        }

        return null;
    }
}
