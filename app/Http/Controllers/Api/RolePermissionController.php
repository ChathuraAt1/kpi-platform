<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RolePermission;
use App\Models\RoleFeature;
use App\Models\User;
use Illuminate\Http\Request;

class RolePermissionController extends Controller
{
    /**
     * Get all roles and their permissions
     */
    public function getAllRolesWithPermissions()
    {
        $this->authorize('manageUsers');

        $roles = RolePermission::getAllRoles();
        $allPermissions = RolePermission::getAllPermissions();

        $rolesData = [];
        foreach ($roles as $role) {
            $permissions = RolePermission::getPermissionsForRole($role);
            $rolesData[$role] = [
                'permissions' => $permissions,
                'feature_count' => RoleFeature::byRole($role)->count(),
                'permission_count' => count($permissions),
            ];
        }

        return response()->json([
            'roles' => $rolesData,
            'all_permissions' => $allPermissions,
        ]);
    }

    /**
     * Get permissions for a specific role
     */
    public function getRolePermissions(string $role)
    {
        $this->authorize('manageUsers');

        $permissions = RolePermission::where('role', $role)->get();
        $features = RoleFeature::where('role', $role)->get();
        $allPermissions = RolePermission::getAllPermissions();

        return response()->json([
            'role' => $role,
            'permissions' => $permissions,
            'features' => $features,
            'all_permissions' => $allPermissions,
        ]);
    }

    /**
     * Update permissions for a role
     */
    public function updateRolePermissions(Request $request, string $role)
    {
        $this->authorize('manageUsers');

        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'string',
        ]);

        // Get all current permissions for this role
        $currentPermissions = RolePermission::getPermissionsForRole($role, false);

        // Disable permissions not in the new list
        foreach ($currentPermissions as $permission) {
            if (!in_array($permission, $validated['permissions'])) {
                RolePermission::disablePermission($role, $permission);
            } else {
                RolePermission::enablePermission($role, $permission);
            }
        }

        // Enable permissions not currently in the role
        foreach ($validated['permissions'] as $permission) {
            if (!in_array($permission, $currentPermissions)) {
                RolePermission::enablePermission($role, $permission);
            }
        }

        // Log audit
        \Log::info("Role permissions updated", [
            'role' => $role,
            'updated_by' => $request->user()->id,
            'permission_count' => count($validated['permissions']),
        ]);

        return response()->json([
            'message' => "Permissions updated for role: {$role}",
            'role' => $role,
            'permissions' => RolePermission::getPermissionsForRole($role),
        ]);
    }

    /**
     * Enable a permission for a role
     */
    public function enablePermission(Request $request, string $role, string $permission)
    {
        $this->authorize('manageUsers');

        RolePermission::enablePermission($role, $permission);

        \Log::info("Permission enabled for role", [
            'role' => $role,
            'permission' => $permission,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => "Permission '{$permission}' enabled for role '{$role}'",
        ]);
    }

    /**
     * Disable a permission for a role
     */
    public function disablePermission(Request $request, string $role, string $permission)
    {
        $this->authorize('manageUsers');

        RolePermission::disablePermission($role, $permission);

        \Log::info("Permission disabled for role", [
            'role' => $role,
            'permission' => $permission,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => "Permission '{$permission}' disabled for role '{$role}'",
        ]);
    }

    /**
     * Get permissions for a specific user (including custom overrides)
     */
    public function getUserPermissions(User $user)
    {
        $this->authorize('manageUsers');

        return response()->json([
            'user_id' => $user->id,
            'user_name' => $user->name,
            'role' => $user->role,
            'permission_status' => $user->getPermissionStatus(),
        ]);
    }

    /**
     * Grant a custom permission to a user
     */
    public function grantUserPermission(Request $request, User $user)
    {
        $this->authorize('manageUsers');

        $validated = $request->validate([
            'permission' => 'required|string',
        ]);

        $user->grantPermission($validated['permission']);

        \Log::info("Custom permission granted to user", [
            'user_id' => $user->id,
            'permission' => $validated['permission'],
            'granted_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => "Permission granted to user",
            'user_id' => $user->id,
            'permission' => $validated['permission'],
            'permissions' => $user->getRolePermissions(),
        ]);
    }

    /**
     * Revoke a custom permission from a user
     */
    public function revokeUserPermission(Request $request, User $user)
    {
        $this->authorize('manageUsers');

        $validated = $request->validate([
            'permission' => 'required|string',
        ]);

        $user->revokePermission($validated['permission']);

        \Log::info("Custom permission revoked from user", [
            'user_id' => $user->id,
            'permission' => $validated['permission'],
            'revoked_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => "Permission revoked from user",
            'user_id' => $user->id,
            'permission' => $validated['permission'],
            'permissions' => $user->getRolePermissions(),
        ]);
    }

    /**
     * Reset user's permissions to role defaults
     */
    public function resetUserPermissions(Request $request, User $user)
    {
        $this->authorize('manageUsers');

        $user->resetPermissionsToRoleDefaults();

        \Log::info("User permissions reset to role defaults", [
            'user_id' => $user->id,
            'role' => $user->role,
            'reset_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => "User permissions reset to role defaults",
            'user_id' => $user->id,
            'role' => $user->role,
            'permissions' => $user->getRolePermissions(),
        ]);
    }

    /**
     * Get all features for a role
     */
    public function getRoleFeatures(string $role)
    {
        $this->authorize('manageUsers');

        $features = RoleFeature::byRole($role)->get();
        $allFeatures = RoleFeature::getAllFeatures();

        return response()->json([
            'role' => $role,
            'features' => $features,
            'all_features' => $allFeatures,
        ]);
    }

    /**
     * Enable a feature for a role
     */
    public function enableFeature(Request $request, string $role, string $feature)
    {
        $this->authorize('manageUsers');

        $settings = $request->input('settings');
        RoleFeature::enableFeature($role, $feature, $settings);

        \Log::info("Feature enabled for role", [
            'role' => $role,
            'feature' => $feature,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => "Feature '{$feature}' enabled for role '{$role}'",
        ]);
    }

    /**
     * Disable a feature for a role
     */
    public function disableFeature(Request $request, string $role, string $feature)
    {
        $this->authorize('manageUsers');

        RoleFeature::disableFeature($role, $feature);

        \Log::info("Feature disabled for role", [
            'role' => $role,
            'feature' => $feature,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => "Feature '{$feature}' disabled for role '{$role}'",
        ]);
    }

    /**
     * Get audit log of permission changes
     */
    public function getPermissionAuditLog(Request $request)
    {
        $this->authorize('manageUsers');

        $days = $request->query('days', 30);

        $logs = \App\Models\AuditLog::where('action', 'like', '%permission%')
            ->where('created_at', '>=', now()->subDays($days))
            ->orderBy('created_at', 'desc')
            ->limit(500)
            ->get();

        return response()->json([
            'days' => $days,
            'total_changes' => count($logs),
            'logs' => $logs,
        ]);
    }
}
