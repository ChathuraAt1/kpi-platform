import React, { useState, useEffect } from "react";
import "./ApiKeyDashboard.scss";

const ApiKeyDashboard = () => {
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedKey, setSelectedKey] = useState(null);
    const [testingKey, setTestingKey] = useState(null);
    const [rotatingKey, setRotatingKey] = useState(null);
    const [verifyingModels, setVerifyingModels] = useState(null);
    const [usageDetails, setUsageDetails] = useState({});
    const [expandedRows, setExpandedRows] = useState(new Set());

    useEffect(() => {
        fetchApiKeys();
    }, []);

    const fetchApiKeys = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/api-keys", {
                headers: { Accept: "application/json" },
            });

            if (!response.ok) throw new Error("Failed to fetch API keys");

            const data = await response.json();
            setApiKeys(Array.isArray(data) ? data : data.data || []);
            setError(null);
        } catch (err) {
            setError(err.message);
            setApiKeys([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuotaStatus = async (keyId) => {
        try {
            const response = await fetch(`/api/api-keys/${keyId}/quota-status`);
            if (!response.ok) throw new Error("Failed to fetch quota status");

            const data = await response.json();
            setUsageDetails((prev) => ({ ...prev, [keyId]: data }));
        } catch (err) {
            console.error("Error fetching quota:", err);
        }
    };

    const toggleRowExpanded = (keyId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(keyId)) {
            newExpanded.delete(keyId);
        } else {
            newExpanded.add(keyId);
            fetchQuotaStatus(keyId);
        }
        setExpandedRows(newExpanded);
    };

    const handleRotateKey = async (keyId) => {
        if (!window.confirm("Are you sure you want to rotate this API key?"))
            return;

        try {
            setRotatingKey(keyId);
            const response = await fetch(`/api/api-keys/${keyId}/rotate`, {
                method: "POST",
                headers: { Accept: "application/json" },
            });

            if (!response.ok) throw new Error("Rotation failed");

            const data = await response.json();
            alert(data.message);
            fetchApiKeys();
        } catch (err) {
            alert("Rotation error: " + err.message);
        } finally {
            setRotatingKey(null);
        }
    };

    const handleVerifyModels = async (keyId) => {
        try {
            setVerifyingModels(keyId);
            const response = await fetch(
                `/api/api-keys/${keyId}/verify-models`,
                {
                    method: "POST",
                    headers: { Accept: "application/json" },
                },
            );

            if (!response.ok) throw new Error("Verification failed");

            const data = await response.json();
            alert(`Verified: ${data.verified_models.length} models`);
            fetchApiKeys();
        } catch (err) {
            alert("Verification error: " + err.message);
        } finally {
            setVerifyingModels(null);
        }
    };

    const handleTestConnectivity = async (keyId) => {
        try {
            setTestingKey(keyId);
            const response = await fetch("/api/api-keys/health-check", {
                method: "POST",
                headers: { Accept: "application/json" },
            });

            if (response.ok) {
                alert("Connectivity test completed");
                fetchApiKeys();
            } else {
                alert("Connectivity test failed");
            }
        } catch (err) {
            alert("Test error: " + err.message);
        } finally {
            setTestingKey(null);
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            active: "badge-success",
            degraded: "badge-warning",
            inactive: "badge-danger",
        };
        return statusMap[status] || "badge-secondary";
    };

    const getQuotaBadge = (percentage) => {
        if (percentage >= 90) return "badge-danger";
        if (percentage >= 70) return "badge-warning";
        return "badge-success";
    };

    const formatPercentage = (value) => {
        if (value === null || value === undefined) return "N/A";
        return Math.round(value * 100) / 100 + "%";
    };

    if (loading) {
        return (
            <div className="api-key-dashboard loading">Loading API Keys...</div>
        );
    }

    return (
        <div className="api-key-dashboard">
            <div className="dashboard-header">
                <h2>LLM API Key Management</h2>
                <button
                    className="btn-refresh"
                    onClick={fetchApiKeys}
                    title="Refresh"
                >
                    ↻
                </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {apiKeys.length === 0 ? (
                <div className="empty-state">
                    <p>No API keys configured</p>
                </div>
            ) : (
                <div className="keys-grid">
                    {apiKeys.map((key) => {
                        const isExpanded = expandedRows.has(key.id);
                        const quotaInfo = usageDetails[key.id];
                        const quotaPercentage =
                            quotaInfo?.usage_percentage ?? 0;
                        const isExceeded = quotaInfo?.is_exceeded ?? false;

                        return (
                            <div key={key.id} className="key-card">
                                <div className="card-header">
                                    <div className="key-info">
                                        <h3>{key.name}</h3>
                                        <span
                                            className={`badge ${getStatusBadge(key.status)}`}
                                        >
                                            {key.status || "unknown"}
                                        </span>
                                    </div>

                                    <button
                                        className="btn-expand"
                                        onClick={() =>
                                            toggleRowExpanded(key.id)
                                        }
                                        title={
                                            isExpanded ? "Collapse" : "Expand"
                                        }
                                    >
                                        {isExpanded ? "▼" : "▶"}
                                    </button>
                                </div>

                                <div className="card-body">
                                    <div className="key-meta">
                                        <div className="meta-item">
                                            <span className="label">
                                                Provider:
                                            </span>
                                            <span className="value">
                                                {key.provider}
                                            </span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="label">
                                                Model:
                                            </span>
                                            <span className="value">
                                                {key.model ||
                                                    key.preferred_model ||
                                                    "N/A"}
                                            </span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="label">
                                                Priority:
                                            </span>
                                            <span className="value">
                                                {key.rotation_priority || "-"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quota Meter */}
                                    {key.daily_quota && (
                                        <div className="quota-section">
                                            <div className="quota-header">
                                                <span className="label">
                                                    Daily Quota Usage
                                                </span>
                                                <span
                                                    className={`percentage ${getQuotaBadge(quotaPercentage)}`}
                                                >
                                                    {formatPercentage(
                                                        quotaPercentage,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="quota-meter">
                                                <div
                                                    className={`quota-fill ${isExceeded ? "exceeded" : ""}`}
                                                    style={{
                                                        width:
                                                            Math.min(
                                                                quotaPercentage,
                                                                100,
                                                            ) + "%",
                                                    }}
                                                />
                                            </div>
                                            <div className="quota-detail">
                                                <span>
                                                    {quotaInfo?.daily_usage ??
                                                        0}{" "}
                                                    / {key.daily_quota} calls
                                                </span>
                                                {quotaInfo?.remaining !==
                                                    undefined && (
                                                    <span className="remaining">
                                                        {quotaInfo.remaining}{" "}
                                                        remaining
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Warning Threshold */}
                                    {key.quota_warning_threshold && (
                                        <div className="warning-indicator">
                                            <span className="label">
                                                Warning Threshold:
                                            </span>
                                            <span className="value">
                                                {key.quota_warning_threshold}%
                                            </span>
                                        </div>
                                    )}

                                    {/* Auto Rotate Status */}
                                    <div className="auto-rotate-status">
                                        <span className="label">
                                            Auto Rotation:
                                        </span>
                                        <span
                                            className={`status ${key.auto_rotate_on_limit ? "enabled" : "disabled"}`}
                                        >
                                            {key.auto_rotate_on_limit
                                                ? "✓ Enabled"
                                                : "✗ Disabled"}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="card-actions">
                                    <button
                                        className="btn btn-small btn-test"
                                        onClick={() =>
                                            handleTestConnectivity(key.id)
                                        }
                                        disabled={testingKey === key.id}
                                        title="Test connectivity"
                                    >
                                        {testingKey === key.id
                                            ? "Testing..."
                                            : "🔗 Test"}
                                    </button>

                                    <button
                                        className="btn btn-small btn-verify"
                                        onClick={() =>
                                            handleVerifyModels(key.id)
                                        }
                                        disabled={verifyingModels === key.id}
                                        title="Verify models"
                                    >
                                        {verifyingModels === key.id
                                            ? "Verifying..."
                                            : "✓ Verify"}
                                    </button>

                                    <button
                                        className="btn btn-small btn-rotate"
                                        onClick={() => handleRotateKey(key.id)}
                                        disabled={rotatingKey === key.id}
                                        title="Rotate to next key"
                                    >
                                        {rotatingKey === key.id
                                            ? "Rotating..."
                                            : "↻ Rotate"}
                                    </button>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && quotaInfo && (
                                    <div className="expanded-details">
                                        <div className="detail-section">
                                            <h4>Quota Details</h4>
                                            <div className="detail-grid">
                                                <div className="detail-item">
                                                    <span className="label">
                                                        Usage:
                                                    </span>
                                                    <span className="value">
                                                        {quotaInfo.daily_usage}
                                                    </span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="label">
                                                        Quota:
                                                    </span>
                                                    <span className="value">
                                                        {quotaInfo.daily_quota}
                                                    </span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="label">
                                                        Remaining:
                                                    </span>
                                                    <span className="value">
                                                        {quotaInfo.remaining}
                                                    </span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="label">
                                                        Last Reset:
                                                    </span>
                                                    <span className="value">
                                                        {quotaInfo.last_reset_at
                                                            ? new Date(
                                                                  quotaInfo.last_reset_at,
                                                              ).toLocaleString()
                                                            : "N/A"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {quotaInfo.summary && (
                                            <div className="detail-section">
                                                <h4>Usage Summary</h4>
                                                <div className="detail-grid">
                                                    <div className="detail-item">
                                                        <span className="label">
                                                            Total Calls:
                                                        </span>
                                                        <span className="value">
                                                            {
                                                                quotaInfo
                                                                    .summary
                                                                    .total_calls
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <span className="label">
                                                            Total Tokens:
                                                        </span>
                                                        <span className="value">
                                                            {
                                                                quotaInfo
                                                                    .summary
                                                                    .total_tokens
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <span className="label">
                                                            Errors:
                                                        </span>
                                                        <span className="value">
                                                            {quotaInfo.summary
                                                                .total_errors ||
                                                                0}
                                                        </span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <span className="label">
                                                            Avg Response:
                                                        </span>
                                                        <span className="value">
                                                            {quotaInfo.summary.avg_response_time?.toFixed(
                                                                2,
                                                            ) || 0}
                                                            ms
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ApiKeyDashboard;
