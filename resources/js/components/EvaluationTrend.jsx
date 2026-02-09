import React, { useEffect, useState } from "react";
import api from "../services/api";
import "./EvaluationTrend.scss";

/**
 * EvaluationTrend
 * Displays visualization of evaluation score trends over time
 * Shows final scores and improvement metrics
 */
export default function EvaluationTrend({ userId }) {
    const [trendData, setTrendData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [months, setMonths] = useState(6);

    useEffect(() => {
        fetchTrendData();
    }, [months]);

    const fetchTrendData = async () => {
        try {
            setLoading(true);
            const response = await api.get(
                `/evaluations/my-results/trend?months=${months}`,
            );

            if (response.data.data) {
                setTrendData(response.data.data);
            }

            setError(null);
        } catch (err) {
            setError("Failed to load trend data");
            console.error("Error fetching trend data:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="trend-container loading">
                <div className="loader">Loading trend data...</div>
            </div>
        );
    }

    if (error || !trendData) {
        return (
            <div className="trend-container error">
                <p>{error || "No trend data available"}</p>
            </div>
        );
    }

    const { summary, trend_data } = trendData;

    const maxScore = Math.max(
        ...trend_data.map((d) => d.final_score || 0),
        100,
    );
    const minScore = Math.min(...trend_data.map((d) => d.final_score || 0), 0);

    return (
        <div className="trend-container">
            {/* Period Selector */}
            <div className="period-selector">
                <button
                    className={months === 3 ? "active" : ""}
                    onClick={() => setMonths(3)}
                >
                    3 Months
                </button>
                <button
                    className={months === 6 ? "active" : ""}
                    onClick={() => setMonths(6)}
                >
                    6 Months
                </button>
                <button
                    className={months === 12 ? "active" : ""}
                    onClick={() => setMonths(12)}
                >
                    12 Months
                </button>
            </div>

            {/* Summary Stats */}
            <div className="summary-stats">
                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <div className="stat-label">Current Score</div>
                        <div className="stat-value">
                            {summary.average_score}%
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">⬆️</div>
                    <div className="stat-content">
                        <div className="stat-label">Best Score</div>
                        <div className="stat-value">
                            {summary.highest_score}%
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div className="stat-content">
                        <div className="stat-label">Trend</div>
                        <div
                            className={`stat-value ${summary.score_improvement >= 0 ? "positive" : "negative"}`}
                        >
                            {summary.score_improvement >= 0 ? "+" : ""}
                            {summary.score_improvement}%
                        </div>
                    </div>
                </div>

                {summary.score_improvement !== null && (
                    <div className="stat-card">
                        <div className="stat-icon">📉</div>
                        <div className="stat-content">
                            <div className="stat-label">Improvement</div>
                            <div
                                className={`stat-value ${summary.improvement_percentage >= 0 ? "positive" : "negative"}`}
                            >
                                {summary.improvement_percentage >= 0 ? "+" : ""}
                                {summary.improvement_percentage}%
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Line Chart */}
            <div className="chart-container">
                <h4>Score Progression</h4>
                <div className="line-chart">
                    <div className="y-axis">
                        <div className="y-label">{maxScore}</div>
                        <div className="y-label">
                            {Math.round((maxScore + minScore) / 2)}
                        </div>
                        <div className="y-label">{minScore}</div>
                    </div>

                    <div className="chart-area">
                        <svg
                            viewBox={`0 0 ${trend_data.length * 60} 300`}
                            preserveAspectRatio="none"
                        >
                            {/* Grid lines */}
                            <defs>
                                <pattern
                                    id="grid"
                                    width="60"
                                    height="300"
                                    patternUnits="userSpaceOnUse"
                                >
                                    <path
                                        d="M 60 0 L 60 300"
                                        stroke="#f0f0f0"
                                        strokeWidth="1"
                                    />
                                </pattern>
                            </defs>
                            <rect
                                width={trend_data.length * 60}
                                height="300"
                                fill="url(#grid)"
                            />

                            {/* Line path */}
                            <polyline
                                points={trend_data
                                    .map((d, idx) => {
                                        const x = idx * 60 + 30;
                                        const score = d.final_score || 0;
                                        const y =
                                            300 -
                                            ((score - minScore) /
                                                (maxScore - minScore || 1)) *
                                                300;
                                        return `${x},${y}`;
                                    })
                                    .join(" ")}
                                stroke="#4f46e5"
                                strokeWidth="2"
                                fill="none"
                            />

                            {/* Data points */}
                            {trend_data.map((d, idx) => {
                                const x = idx * 60 + 30;
                                const score = d.final_score || 0;
                                const y =
                                    300 -
                                    ((score - minScore) /
                                        (maxScore - minScore || 1)) *
                                        300;
                                return (
                                    <circle
                                        key={idx}
                                        cx={x}
                                        cy={y}
                                        r="4"
                                        fill={
                                            score >= 75
                                                ? "#22c55e"
                                                : score >= 60
                                                  ? "#eab308"
                                                  : "#ef4444"
                                        }
                                        className="data-point"
                                    />
                                );
                            })}
                        </svg>

                        <div className="x-axis">
                            {trend_data.map((d, idx) => (
                                <div key={idx} className="x-label">
                                    {d.period.substring(0, 3)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="detailed-table">
                <h4>Detailed Breakdown</h4>
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Period</th>
                                <th>Rule-Based</th>
                                <th>AI Assessment</th>
                                <th>HR Review</th>
                                <th>Supervisor</th>
                                <th>Final Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trend_data.map((d, idx) => (
                                <tr key={idx} className="data-row">
                                    <td className="period">{d.period}</td>
                                    <td className="score">
                                        {d.rule_based_score || "—"}
                                    </td>
                                    <td className="score">
                                        {d.llm_score || "—"}
                                    </td>
                                    <td className="score">
                                        {d.hr_score || "—"}
                                    </td>
                                    <td className="score">
                                        {d.supervisor_score || "—"}
                                    </td>
                                    <td className="final-score">
                                        <strong
                                            className={
                                                d.final_score >= 75
                                                    ? "excellent"
                                                    : d.final_score >= 60
                                                      ? "good"
                                                      : "needs-improvement"
                                            }
                                        >
                                            {d.final_score}%
                                        </strong>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Insights */}
            <div className="insights">
                <h4>📊 Insights</h4>
                <div className="insight-list">
                    {summary.score_improvement > 0 && (
                        <div className="insight positive">
                            🎉 Great job! Your score has improved by{" "}
                            <strong>{summary.improvement_percentage}%</strong>{" "}
                            over this period.
                        </div>
                    )}
                    {summary.score_improvement < 0 && (
                        <div className="insight negative">
                            📉 Your score has declined by{" "}
                            <strong>
                                {Math.abs(summary.improvement_percentage)}%
                            </strong>
                            . Consider discussing focus areas with your
                            supervisor.
                        </div>
                    )}
                    {summary.score_improvement === 0 && (
                        <div className="insight neutral">
                            📊 Your score has remained consistent. Keep
                            maintaining the current performance level.
                        </div>
                    )}
                    {summary.highest_score >= 85 && (
                        <div className="insight">
                            ⭐ You've achieved a score of{" "}
                            <strong>{summary.highest_score}%</strong> -
                            excellent performance!
                        </div>
                    )}
                    {summary.average_score < 60 && (
                        <div className="insight warning">
                            ⚠️ Your average score is below target. Reach out to
                            your supervisor for guidance on improvement areas.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
