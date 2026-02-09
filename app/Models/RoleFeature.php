<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoleFeature extends Model
{
    use HasFactory;

    protected $table = 'role_features';

    protected $fillable = [
        'role',
        'feature',
        'description',
        'is_enabled',
        'settings',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'settings' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get all enabled features for a role
     */
    public static function getFeaturesForRole(string $role, $onlyEnabled = true): array
    {
        $query = self::where('role', $role);

        if ($onlyEnabled) {
            $query->where('is_enabled', true);
        }

        return $query->get()
            ->map(function ($feature) {
                return [
                    'feature' => $feature->feature,
                    'description' => $feature->description,
                    'settings' => $feature->settings,
                ];
            })
            ->toArray();
    }

    /**
     * Check if a role has a specific feature enabled
     */
    public static function roleHasFeature(string $role, string $feature): bool
    {
        return self::where('role', $role)
            ->where('feature', $feature)
            ->where('is_enabled', true)
            ->exists();
    }

    /**
     * Enable a feature for a role
     */
    public static function enableFeature(string $role, string $feature, $settings = null): void
    {
        self::updateOrCreate(
            ['role' => $role, 'feature' => $feature],
            [
                'is_enabled' => true,
                'settings' => $settings,
            ]
        );
    }

    /**
     * Disable a feature for a role
     */
    public static function disableFeature(string $role, string $feature): void
    {
        self::where('role', $role)
            ->where('feature', $feature)
            ->update(['is_enabled' => false]);
    }

    /**
     * Get feature settings for a role
     */
    public static function getFeatureSettings(string $role, string $feature): ?array
    {
        $feature = self::where('role', $role)
            ->where('feature', $feature)
            ->first();

        return $feature?->settings;
    }

    /**
     * Update feature settings
     */
    public static function updateFeatureSettings(string $role, string $feature, array $settings): void
    {
        self::where('role', $role)
            ->where('feature', $feature)
            ->update(['settings' => $settings]);
    }

    /**
     * Scope: Get only enabled features
     */
    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }

    /**
     * Scope: Get features by role
     */
    public function scopeByRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    /**
     * Get all available features
     */
    public static function getAllFeatures(): array
    {
        return self::distinct('feature')
            ->get()
            ->map(function ($feature) {
                return [
                    'feature' => $feature->feature,
                    'description' => $feature->description,
                ];
            })
            ->keyBy('feature')
            ->toArray();
    }

    /**
     * Get all available roles
     */
    public static function getAllRoles(): array
    {
        return self::distinct('role')->pluck('role')->toArray();
    }
}
