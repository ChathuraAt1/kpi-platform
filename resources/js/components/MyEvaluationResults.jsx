import React, { useEffect, useState } from "react";
import api from "../services/api";
import EvaluationTrend from "./EvaluationTrend";
import "./MyEvaluationResults.scss";

/**
 * MyEvaluationResults
 * Displays employee's latest published KPI evaluation with scores, remarks, and trend
 */
export default function MyEvaluationResults() {
    const [evaluation, setEvaluation] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("latest"); // 'latest', 'history', 'trend'

    useEffect(() => {
        fetchEvaluationResults();
    }, []);

    const fetchEvaluationResults = async () => {
        try {
            setLoading(true);
            const [latestRes, historyRes] = await Promise.all([
                api.get("/evaluations/my-results"),
                api.get("/evaluations/my-results/history?months=6"),
            ]);

            if (latestRes.data.data) {
                setEvaluation(latestRes.data.data);
            }
            if (historyRes.data.data) {
                setHistory(historyRes.data.data);
            }

            setError(null);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Failed to load evaluation results",
            );
            console.error("Error fetching evaluation results:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="evaluation-results loading">
                <div className="loader">Loading your evaluation results...</div>
            </div>
        );
    }

    if (error && !evaluation) {
        return (
            <div className="evaluation-results error">
                <div className="error-card">
                    <h2>No Published Evaluation Yet</h2>
                    <p>{error}</p>
                    <p className="hint">
                        Your evaluation will be available here once it's
                        finalized and published by HR.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="evaluation-results">
            <div className="results-header">
                <h1>📊 My Evaluation Results</h1>
                <p className="subtitle">
                    Your monthly KPI performance and feedback
                </p>
            </div>

            {evaluation && (
                <div className="tabs-container">
                    <div className="tabs">
                        <button
                            className={`tab ${activeTab === "latest" ? "active" : ""}`}
                            onClick={() => setActiveTab("latest")}
                        >
                            Latest Results
                        </button>
                        <button
                            className={`tab ${activeTab === "history" ? "active" : ""}`}
                            onClick={() => setActiveTab("history")}
                        >
                            History
                        </button>
                        <button
                            className={`tab ${activeTab === "trend" ? "active" : ""}`}
                            onClick={() => setActiveTab("trend")}
                        >
                            Trend
                        </button>
                    </div>

                    {activeTab === "latest" && (
                        <div className="tab-content latest-tab">
                            <LatestEvaluationView evaluation={evaluation} />
                        </div>
                    )}

                    {activeTab === "history" && (
                        <div className="tab-content history-tab">
                            <EvaluationHistoryView history={history} />
                        </div>
                    )}

                    {activeTab === "trend" && (
                        <div className="tab-content trend-tab">
                            <EvaluationTrend
                                userId={evaluation.evaluation.id}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * LatestEvaluationView - Display the latest published evaluation
 */
function LatestEvaluationView({ evaluation }) {
    const { evaluation: eval_data, remarks, comments } = evaluation;

    return (
        <div className="latest-evaluation">
            <div className="period-header">
                <h3>
                    {eval_data.period.month_name} {eval_data.period.year}
                </h3>
                <span className="status-badge published">Published</span>
            </div>

            {/* Final Score Display */}
            <div className="score-display">
                <div className="final-score-card">
                    <div className="score-value">
                        <span className="number">
                            {eval_data.scores.final || "N/A"}
                        </span>
                        <span className="unit">%</span>
                    </div>
                    <div className="score-label">Final Score</div>
                    <div className="score-description">
                        Your overall KPI performance for this period
                    </div>
                </div>

                {/* Score Components Breakdown */}
                <div className="score-components">
                    <div className="component-item">
                        <div className="component-label">Rule-Based</div>
                        <div className="component-score">
                            <span className="value">
                                {eval_data.scores.rule_based}
                            </span>
                            <span className="unit">%</span>
                        </div>
                        <div className="component-desc">
                            Task completion scoring
                        </div>
                    </div>

                    <div className="component-item">
                        <div className="component-label">AI Assessment</div>
                        <div className="component-score">
                            <span className="value">
                                {eval_data.scores.llm}
                            </span>
                            <span className="unit">%</span>
                        </div>
                        <div className="component-desc">
                            AI analysis of quality
                        </div>
                    </div>

                    {eval_data.scores.hr && (
                        <div className="component-item">
                            <div className="component-label">HR Review</div>
                            <div className="component-score">
                                <span className="value">
                                    {eval_data.scores.hr}
                                </span>
                                <span className="unit">%</span>
                            </div>
                            <div className="component-desc">HR evaluation</div>
                        </div>
                    )}

                    {eval_data.scores.supervisor && (
                        <div className="component-item">
                            <div className="component-label">Supervisor</div>
                            <div className="component-score">
                                <span className="value">
                                    {eval_data.scores.supervisor}
                                </span>
                                <span className="unit">%</span>
                            </div>
                            <div className="component-desc">
                                Supervisor assessment
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Category Breakdown */}
            {eval_data.score_breakdown &&
                Object.keys(eval_data.score_breakdown).length > 0 && (
                    <div className="category-breakdown">
                        <h4>Category-Wise Breakdown</h4>
                        <div className="breakdown-items">
                            {Object.entries(eval_data.score_breakdown).map(
                                ([category, score]) => (
                                    <div
                                        key={category}
                                        className="breakdown-item"
                                    >
                                        <div className="category-name">
                                            {category}
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${score}%` }}
                                            ></div>
                                        </div>
                                        <div className="category-score">
                                            {score}%
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                )}

            {/* Remarks Section */}
            {(remarks.hr || remarks.supervisor) && (
                <div className="remarks-section">
                    <h4>📝 Feedback & Remarks</h4>
                    <div className="remarks-container">
                        {remarks.hr && (
                            <div className="remark-card hr-remark">
                                <div className="remark-header">
                                    <span className="remark-from">From HR</span>
                                    <span className="remark-date">
                                        {new Date(
                                            remarks.hr.at,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="remark-content">
                                    {remarks.hr.content}
                                </div>
                            </div>
                        )}

                        {remarks.supervisor && (
                            <div className="remark-card supervisor-remark">
                                <div className="remark-header">
                                    <span className="remark-from">
                                        From Supervisor
                                    </span>
                                    <span className="remark-date">
                                        {new Date(
                                            remarks.supervisor.at,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="remark-content">
                                    {remarks.supervisor.content}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Comments Section */}
            {comments && comments.length > 0 && (
                <div className="comments-section">
                    <h4>💬 Comments ({comments.length})</h4>
                    <div className="comments-list">
                        {comments.map((comment) => (
                            <div key={comment.id} className="comment-item">
                                <div className="comment-author">
                                    <strong>{comment.author.name}</strong>
                                    <span className="comment-role">
                                        {comment.author.role}
                                    </span>
                                </div>
                                <div className="comment-content">
                                    {comment.content}
                                </div>
                                <div className="comment-date">
                                    {new Date(
                                        comment.created_at,
                                    ).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="results-footer">
                <p className="note">
                    ℹ️ Your published evaluation reflects your performance for
                    the specified month. All scores have been finalized and
                    verified.
                </p>
            </div>
        </div>
    );
}

/**
 * EvaluationHistoryView - Display evaluation history
 */
function EvaluationHistoryView({ history }) {
    if (!history || history.length === 0) {
        return (
            <div className="no-history">
                <p>No evaluation history available yet.</p>
            </div>
        );
    }

    return (
        <div className="evaluation-history">
            <h4>Your Evaluation History (Last 6 Months)</h4>
            <div className="history-table">
                <div className="history-header">
                    <div className="col col-period">Period</div>
                    <div className="col col-rule">Rule-Based</div>
                    <div className="col col-llm">AI Assessment</div>
                    <div className="col col-hr">HR</div>
                    <div className="col col-supervisor">Supervisor</div>
                    <div className="col col-final">Final Score</div>
                </div>

                {history.map((eval) => (
                    <div key={eval.id} className="history-row">
                        <div className="col col-period">
                            {eval.period.month_name} {eval.period.year}
                        </div>
                        <div className="col col-rule">
                            {eval.scores.rule_based || "—"}
                        </div>
                        <div className="col col-llm">
                            {eval.scores.llm || "—"}
                        </div>
                        <div className="col col-hr">
                            {eval.scores.hr || "—"}
                        </div>
                        <div className="col col-supervisor">
                            {eval.scores.supervisor || "—"}
                        </div>
                        <div className="col col-final">
                            <strong>{eval.scores.final}</strong>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
