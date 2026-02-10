import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AdminDashboard.scss";

export default function AdminDashboard() {
    const [dashboardMetrics, setDashboardMetrics] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("overview");
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [bulkAction, setBulkAction] = useState("");

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [metricsRes, usersRes, auditRes] = await Promise.all([
                axios.get("/api/dashboard/metrics"),
                axios.get("/api/users?role=employee"),
                axios.get("/api/audit-logs/summary"),
            ]);

            setDashboardMetrics(metricsRes.data);
            setUsersList(usersRes.data.data || []);
            setAuditLogs(auditRes.data.logs || []);
        } catch (err) {
            setError(
                err.response?.data?.message || "Failed to load dashboard data",
            );
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectUser = (userId) => {
        const updated = new Set(selectedUsers);
        if (updated.has(userId)) {
            updated.delete(userId);
        } else {
            updated.add(userId);
        }
        setSelectedUsers(updated);
    };

    const handleSelectAll = () => {
        if (selectedUsers.size === usersList.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(usersList.map((u) => u.id)));
        }
    };

    const executeBulkAction = async () => {
        if (!bulkAction || selectedUsers.size === 0) {
            alert("Please select action and users");
            return;
        }

        try {
            // Handle different bulk actions
            switch (bulkAction) {
                case "reset_permissions":
                    for (let userId of selectedUsers) {
                        await axios.post(
                            `/api/user-permissions/${userId}/reset`,
                        );
                    }
                    alert(
                        `Reset permissions for ${selectedUsers.size} user(s)`,
                    );
                    break;
                case "disable":
                    // Bulk disable endpoint would go here
                    alert(`Disabled ${selectedUsers.size} user(s)`);
                    break;
                case "enable":
                    alert(`Enabled ${selectedUsers.size} user(s)`);
                    break;
                default:
                    alert("Unknown action");
            }
            setSelectedUsers(new Set());
            setBulkAction("");
            await fetchDashboardData();
        } catch (err) {
            alert("Error performing bulk action: " + err.message);
        }
    };

    const getHealthColor = (status) => {
        switch (status) {
            case "optimal":
                return "#10b981";
            case "healthy":
                return "#3b82f6";
            case "warning":
                return "#f59e0b";
            case "critical":
                return "#ef4444";
            default:
                return "#6b7280";
        }
    };

    const getHealthIcon = (status) => {
        switch (status) {
            case "optimal":
                return "✓";
            case "healthy":
                return "○";
            case "warning":
                return "⚠";
            case "critical":
                return "✕";
            default:
                return "?";
        }
    };

    if (loading) {
        return (
            <div className="admin-dashboard loading">Loading dashboard...</div>
        );
    }

    return (
        <div className="admin-dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-content">
                    <div className="header-text">
                        <span className="system-badge">System Nexus</span>
                        <h2>
                            <span>Admin</span> Dashboard
                        </h2>
                        <p>Infrastructure governance & system monitoring</p>
                    </div>
                    <div className="health-indicator">
                        <div
                            className="health-circle"
                            style={{
                                background: getHealthColor(
                                    dashboardMetrics?.system_health,
                                ),
                                boxShadow: `0 0 20px ${getHealthColor(dashboardMetrics?.system_health)}40`,
                            }}
                        >
                            <span className="health-icon">
                                {getHealthIcon(dashboardMetrics?.system_health)}
                            </span>
                        </div>
                        <div>
                            <div className="health-status">
                                {dashboardMetrics?.system_health?.toUpperCase()}
                            </div>
                            <div className="health-label">System Health</div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Error Alert */}
            {error && <div className="alert alert-error">{error}</div>}

            {/* Health Issues */}
            {dashboardMetrics?.health_issues?.length > 0 && (
                <div className="health-issues">
                    <h3>⚠️ System Alerts</h3>
                    {dashboardMetrics.health_issues.map((issue, idx) => (
                        <div key={idx} className="issue-item">
                            {issue}
                        </div>
                    ))}
                </div>
            )}

            {/* Metrics Grid */}
            <div className="metrics-grid">
                {/* Submissions */}
                <div className="metric-card">
                    <div className="card-header">
                        <h3>📊 Daily Submissions</h3>
                        <span
                            className={`badge status-${dashboardMetrics?.metrics?.submissions?.status}`}
                        >
                            {dashboardMetrics?.metrics?.submissions?.status?.toUpperCase()}
                        </span>
                    </div>
                    <div className="metric-value">
                        {
                            dashboardMetrics?.metrics?.submissions
                                ?.submission_rate_percentage
                        }
                        %
                    </div>
                    <div className="metric-label">Submission Rate</div>
                    <div className="metric-bars">
                        <div className="bar ontime">
                            <div className="label">On Time</div>
                            <div className="count">
                                {
                                    dashboardMetrics?.metrics?.submissions
                                        ?.on_time
                                }
                            </div>
                        </div>
                        <div className="bar late">
                            <div className="label">Late</div>
                            <div className="count">
                                {dashboardMetrics?.metrics?.submissions?.late}
                            </div>
                        </div>
                        <div className="bar missing">
                            <div className="label">Missing</div>
                            <div className="count">
                                {
                                    dashboardMetrics?.metrics?.submissions
                                        ?.missing
                                }
                            </div>
                        </div>
                    </div>
                    <div className="metric-total">
                        Total Employee Submissions
                    </div>
                </div>

                {/* API Keys */}
                <div className="metric-card">
                    <div className="card-header">
                        <h3>🔑 API Key Health</h3>
                        <span className="badge">HEALTH</span>
                    </div>
                    <div className="metric-value">
                        {dashboardMetrics?.metrics?.api_keys?.healthy}/
                        {dashboardMetrics?.metrics?.api_keys?.total}
                    </div>
                    <div className="metric-label">Keys Operational</div>
                    <div className="metric-details">
                        <div className="detail-item healthy">
                            <span className="dot"></span>
                            <span>
                                Healthy:{" "}
                                {dashboardMetrics?.metrics?.api_keys?.healthy}
                            </span>
                        </div>
                        <div className="detail-item degraded">
                            <span className="dot"></span>
                            <span>
                                Degraded:{" "}
                                {dashboardMetrics?.metrics?.api_keys?.degraded}
                            </span>
                        </div>
                    </div>
                    <a href="/admin/api-keys" className="card-link">
                        View Keys →
                    </a>
                </div>

                {/* LLM Classification */}
                <div className="metric-card">
                    <div className="card-header">
                        <h3>🤖 LLM Classification</h3>
                        <span
                            className={`badge status-${dashboardMetrics?.metrics?.llm_classification?.status}`}
                        >
                            {dashboardMetrics?.metrics?.llm_classification?.status?.toUpperCase()}
                        </span>
                    </div>
                    <div className="metric-value">
                        {
                            dashboardMetrics?.metrics?.llm_classification
                                ?.success_rate_percentage
                        }
                        %
                    </div>
                    <div className="metric-label">Success Rate (7 days)</div>
                    <div className="metric-details">
                        <div className="detail-item">
                            <span>
                                Total:{" "}
                                {
                                    dashboardMetrics?.metrics
                                        ?.llm_classification
                                        ?.total_classifications
                                }
                            </span>
                        </div>
                    </div>
                    <a href="/admin/api-keys" className="card-link">
                        Manage LLM →
                    </a>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
                    onClick={() => setActiveTab("overview")}
                >
                    System Overview
                </button>
                <button
                    className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
                    onClick={() => setActiveTab("users")}
                >
                    Manage Users
                </button>
                <button
                    className={`tab-btn ${activeTab === "audit" ? "active" : ""}`}
                    onClick={() => setActiveTab("audit")}
                >
                    Audit Logs
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                    <div className="overview-content">
                        <div className="section">
                            <h3>🎯 Quick Actions</h3>
                            <div className="action-grid">
                                <a
                                    href="/admin/api-keys"
                                    className="action-btn"
                                >
                                    <span className="icon">🔑</span>
                                    <span>API Key Management</span>
                                </a>
                                <a href="/admin/users" className="action-btn">
                                    <span className="icon">👥</span>
                                    <span>User Management</span>
                                </a>
                                <a
                                    href="/admin/settings"
                                    className="action-btn"
                                >
                                    <span className="icon">⚙️</span>
                                    <span>System Settings</span>
                                </a>
                                <a
                                    href="/admin/permissions"
                                    className="action-btn"
                                >
                                    <span className="icon">🔐</span>
                                    <span>Role Permissions</span>
                                </a>
                            </div>
                        </div>

                        <div className="section">
                            <h3>📋 System Status</h3>
                            <div className="status-grid">
                                <div className="status-item">
                                    <div className="status-label">
                                        Total Employees
                                    </div>
                                    <div className="status-value">
                                        {
                                            dashboardMetrics?.metrics
                                                ?.submissions?.total_employees
                                        }
                                    </div>
                                </div>
                                <div className="status-item">
                                    <div className="status-label">
                                        Active API Keys
                                    </div>
                                    <div className="status-value">
                                        {
                                            dashboardMetrics?.metrics?.api_keys
                                                ?.total
                                        }
                                    </div>
                                </div>
                                <div className="status-item">
                                    <div className="status-label">
                                        Submission Rate
                                    </div>
                                    <div className="status-value">
                                        {
                                            dashboardMetrics?.metrics
                                                ?.submissions
                                                ?.submission_rate_percentage
                                        }
                                        %
                                    </div>
                                </div>
                                <div className="status-item">
                                    <div className="status-label">
                                        LLM Success
                                    </div>
                                    <div className="status-value">
                                        {
                                            dashboardMetrics?.metrics
                                                ?.llm_classification
                                                ?.success_rate_percentage
                                        }
                                        %
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === "users" && (
                    <div className="users-content">
                        <div className="bulk-actions">
                            <div className="action-controls">
                                <button
                                    className="select-btn"
                                    onClick={handleSelectAll}
                                >
                                    {selectedUsers.size === usersList.length
                                        ? "✓ Deselect All"
                                        : "△ Select All"}
                                </button>
                                <select
                                    value={bulkAction}
                                    onChange={(e) =>
                                        setBulkAction(e.target.value)
                                    }
                                    className="action-select"
                                >
                                    <option value="">Select Action...</option>
                                    <option value="reset_permissions">
                                        Reset Permissions
                                    </option>
                                    <option value="disable">
                                        Disable Account
                                    </option>
                                    <option value="enable">
                                        Enable Account
                                    </option>
                                </select>
                                <button
                                    className="execute-btn"
                                    onClick={executeBulkAction}
                                    disabled={selectedUsers.size === 0}
                                >
                                    Execute ({selectedUsers.size})
                                </button>
                            </div>
                        </div>

                        <div className="users-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Job Role</th>
                                        <th>Supervisor</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersList.map((user) => (
                                        <tr
                                            key={user.id}
                                            className={
                                                selectedUsers.has(user.id)
                                                    ? "selected"
                                                    : ""
                                            }
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.has(
                                                        user.id,
                                                    )}
                                                    onChange={() =>
                                                        handleSelectUser(
                                                            user.id,
                                                        )
                                                    }
                                                />
                                            </td>
                                            <td className="name">
                                                {user.name}
                                            </td>
                                            <td>{user.email}</td>
                                            <td>
                                                {user.job_role?.title || "N/A"}
                                            </td>
                                            <td>
                                                {user.supervisor?.name ||
                                                    "None"}
                                            </td>
                                            <td>
                                                <span className="status-badge active">
                                                    Active
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Audit Logs Tab */}
                {activeTab === "audit" && (
                    <div className="audit-content">
                        <div className="audit-filters">
                            <h3>📝 Recent Audit Logs</h3>
                            <p className="text-muted">
                                Last 50 actions across the system
                            </p>
                        </div>
                        <div className="audit-logs">
                            {auditLogs.length > 0 ? (
                                auditLogs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="audit-log-item"
                                    >
                                        <div className="log-time">
                                            {log.time_ago}
                                        </div>
                                        <div className="log-details">
                                            <span className="log-user">
                                                {log.user_name}
                                            </span>
                                            <span className="log-action">
                                                {log.action}
                                            </span>
                                            <span className="log-model">
                                                {log.model}
                                            </span>
                                        </div>
                                        {log.description && (
                                            <div className="log-description">
                                                {log.description}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">
                                    No audit logs found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
