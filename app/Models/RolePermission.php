<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RolePermission extends Model
{
    use HasFactory;

    protected $table = 'role_permissions';

    protected $fillable = [
        'role',
        'permission',
        'description',
        'is_enabled',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get all permissions for a specific role
     */
    public static function getPermissionsForRole(string $role, $onlyEnabled = true): array
    {
        $query = self::where('role', $role);

        if ($onlyEnabled) {
            $query->where('is_enabled', true);
        }

        return $query->pluck('permission')->toArray();
    }

    /**
     * Check if a role has a specific permission
     */
    public static function roleHasPermission(string $role, string $permission): bool
    {
        return self::where('role', $role)
            ->where('permission', $permission)
            ->where('is_enabled', true)
            ->exists();
    }

    /**
     * Get all permissions grouped by role
     */
    public static function getAllPermissionsByRole(): array
    {
        return self::where('is_enabled', true)
            ->get()
            ->groupBy('role')
            ->map(function ($perms) {
                return $perms->pluck('permission')->toArray();
            })
            ->toArray();
    }

    /**
     * Enable a permission for a role
     */
    public static function enablePermission(string $role, string $permission): void
    {
        self::updateOrCreate(
            ['role' => $role, 'permission' => $permission],
            ['is_enabled' => true]
        );
    }

    /**
     * Disable a permission for a role
     */
    public static function disablePermission(string $role, string $permission): void
    {
        self::where('role', $role)
            ->where('permission', $permission)
            ->update(['is_enabled' => false]);
    }

    /**
     * Scope: Get only enabled permissions
     */
    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }

    /**
     * Scope: Get permissions by role
     */
    public function scopeByRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    /**
     * Scope: Get all available roles
     */
    public static function getAllRoles(): array
    {
        return self::distinct('role')->pluck('role')->toArray();
    }

    /**
     * Get complete permission list with descriptions
     */
    public static function getAllPermissions(): array
    {
        return self::distinct('permission')
            ->get()
            ->map(function ($perm) {
                return [
                    'permission' => $perm->permission,
                    'description' => $perm->description,
                ];
            })
            ->keyBy('permission')
            ->toArray();
    }
}
