import React, { useState, useEffect } from "react";
import "./RolePermissionsAdmin.scss";

const RolePermissionsAdmin = () => {
    const [roles, setRoles] = useState({});
    const [allPermissions, setAllPermissions] = useState({});
    const [selectedRole, setSelectedRole] = useState(null);
    const [rolePermissions, setRolePermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [selectedPermissions, setSelectedPermissions] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [showUserPermissions, setShowUserPermissions] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userPermissions, setUserPermissions] = useState(null);

    useEffect(() => {
        fetchRolesAndPermissions();
    }, []);

    const fetchRolesAndPermissions = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/roles", {
                headers: { Accept: "application/json" },
            });

            if (!response.ok) throw new Error("Failed to fetch roles");

            const data = await response.json();
            setRoles(data.roles || {});
            setAllPermissions(data.all_permissions || {});
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const selectRole = async (roleName) => {
        try {
            setSelectedRole(roleName);
            setLoading(true);

            const response = await fetch(`/api/roles/${roleName}/permissions`);
            if (!response.ok)
                throw new Error("Failed to fetch role permissions");

            const data = await response.json();
            setRolePermissions(data.permissions || []);
            setSelectedPermissions(
                new Set(data.permissions.map((p) => p.permission)),
            );
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionToggle = (permission) => {
        const updated = new Set(selectedPermissions);
        if (updated.has(permission)) {
            updated.delete(permission);
        } else {
            updated.add(permission);
        }
        setSelectedPermissions(updated);
    };

    const savePermissions = async () => {
        if (!selectedRole) return;

        try {
            setSaving(true);
            const response = await fetch(
                `/api/roles/${selectedRole}/permissions`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        permissions: Array.from(selectedPermissions),
                    }),
                },
            );

            if (!response.ok) throw new Error("Failed to update permissions");

            const data = await response.json();
            alert(data.message);
            await selectRole(selectedRole); // Refresh
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const resetToDefaults = () => {
        if (!selectedRole) return;
        if (window.confirm("Reset this role to default permissions?")) {
            const defaultPermissions =
                determineDefaultPermissions(selectedRole);
            setSelectedPermissions(new Set(defaultPermissions));
        }
    };

    const determineDefaultPermissions = (role) => {
        const defaults = {
            admin: Object.keys(allPermissions || {}),
            it_admin: [
                "manageApiKeys",
                "viewApiKeyDashboard",
                "rotateApiKeys",
                "testApiConnectivity",
                "viewUserProgress",
                "customizeUserSettings",
                "viewEvaluations",
                "reviewTaskLogs",
                "viewReports",
                "viewAnalytics",
                "viewAuditLogs",
                "viewItAdminDashboard",
                "viewOwnEvaluations",
                "viewOwnTrends",
                "manageTodos",
            ],
            hr: [
                "manageUsers",
                "viewUserProgress",
                "customizeUserSettings",
                "manageEvaluations",
                "publishEvaluations",
                "viewEvaluations",
                "editEvaluationScores",
                "addHrScores",
                "triggerEvaluationGeneration",
                "reviewTaskLogs",
                "approveLateSubmissions",
                "manageKpiCategories",
                "manageJobRoles",
                "manageKpiWeights",
                "manageCompanySettings",
                "configureShifts",
                "configureBreaks",
                "viewReports",
                "exportData",
                "viewAnalytics",
                "viewHrDashboard",
                "viewTeamMetrics",
                "viewSubordinateEvaluations",
                "viewSubordinateTrends",
                "viewOwnEvaluations",
                "viewOwnTrends",
                "requestDeadlineExtension",
                "manageTodos",
            ],
            supervisor: [
                "viewUserProgress",
                "viewEvaluations",
                "editEvaluationScores",
                "triggerEvaluationGeneration",
                "reviewTaskLogs",
                "approveLateSubmissions",
                "manageCompanySettings",
                "viewReports",
                "viewSupervisorDashboard",
                "viewTeamMetrics",
                "manageTeamMembers",
                "viewSubordinateEvaluations",
                "viewSubordinateTrends",
                "customizeUserSettings",
                "viewOwnEvaluations",
                "viewOwnTrends",
                "requestDeadlineExtension",
                "manageTodos",
                "assignTasks",
            ],
            employee: [
                "manageTasks",
                "reviewTaskLogs",
                "viewReports",
                "viewEmployeeDashboard",
                "viewOwnEvaluations",
                "viewOwnTrends",
                "requestDeadlineExtension",
                "manageTodos",
            ],
        };

        return defaults[role] || [];
    };

    const filteredPermissions = Object.entries(allPermissions).filter(
        ([perm, desc]) =>
            perm.toLowerCase().includes(searchTerm.toLowerCase()) ||
            desc?.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (loading && !selectedRole) {
        return <div className="role-permissions-admin loading">Loading...</div>;
    }

    return (
        <div className="role-permissions-admin">
            <div className="admin-header">
                <h1>Role & Permissions Management</h1>
                <p className="subtitle">Configure permissions for each role</p>
            </div>

            <div className="admin-container">
                {/* Roles List */}
                <div className="roles-section">
                    <h2>Roles</h2>
                    <div className="roles-list">
                        {Object.keys(roles).map((role) => (
                            <button
                                key={role}
                                className={`role-btn ${selectedRole === role ? "active" : ""}`}
                                onClick={() => selectRole(role)}
                            >
                                <span className="role-name">
                                    {role.replace(/_/g, " ").toUpperCase()}
                                </span>
                                <span className="perms-count">
                                    {roles[role]?.permission_count || 0}{" "}
                                    permissions
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Permissions Editor */}
                {selectedRole && (
                    <div className="permissions-section">
                        <div className="perm-header">
                            <h2>
                                {selectedRole.replace(/_/g, " ").toUpperCase()}{" "}
                                Permissions
                            </h2>
                            <div className="perm-actions">
                                <input
                                    type="text"
                                    placeholder="Search permissions..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="search-input"
                                />
                            </div>
                        </div>

                        <div className="permissions-grid">
                            {filteredPermissions.map(
                                ([permission, description]) => (
                                    <label
                                        key={permission}
                                        className="permission-item"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedPermissions.has(
                                                permission,
                                            )}
                                            onChange={() =>
                                                handlePermissionToggle(
                                                    permission,
                                                )
                                            }
                                            disabled={saving}
                                        />
                                        <div className="perm-content">
                                            <span className="perm-name">
                                                {permission}
                                            </span>
                                            {description && (
                                                <span className="perm-desc">
                                                    {description}
                                                </span>
                                            )}
                                        </div>
                                    </label>
                                ),
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="perm-buttons">
                            <button
                                className="btn btn-save"
                                onClick={savePermissions}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "💾 Save Changes"}
                            </button>
                            <button
                                className="btn btn-reset"
                                onClick={resetToDefaults}
                                disabled={saving}
                            >
                                ↺ Reset to Defaults
                            </button>
                            <div className="stats">
                                <span>
                                    Selected: {selectedPermissions.size} /{" "}
                                    {Object.keys(allPermissions).length}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {error && <div className="alert alert-error">{error}</div>}
        </div>
    );
};

export default RolePermissionsAdmin;
