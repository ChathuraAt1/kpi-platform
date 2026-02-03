import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

export default function SupervisorDashboard() {
    const { user } = useAuth();
    const [tab, setTab] = useState("logs"); // logs | evaluations
    const [pendingLogs, setPendingLogs] = useState([]);
    const [pendingEvals, setPendingEvals] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
        fetchEvaluations();
    }, [user]);

    function fetchData() {
        setLoading(true);
        // In real app, filter by team. For now fetching all pending.
        axios.get("/api/task-logs?status=pending")
            .then((r) => setPendingLogs(r.data.data || []))
            .finally(() => setLoading(false));
    }

    function fetchEvaluations() {
        // Fetch evaluations pending approval
        // Need to ensure backend supports this filter. Assuming it does or we filter client side.
        axios.get("/api/evaluations?status=pending")
            .then((r) => setPendingEvals(r.data.data || []));
    }

    async function handleLogAction(id, action) {
        try {
            await axios.post(`/api/task-logs/${id}/${action}`);
            fetchData();
        } catch (e) {
            alert("Action failed");
        }
    }

    async function submitScore(evalId, scores) {
        try {
            await axios.post(`/api/evaluations/${evalId}/approve`, { supervisor_score: scores });
            fetchEvaluations();
            alert("Evaluation approved!");
        } catch (e) {
            alert("Failed to submit score");
        }
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Supervisor Dashboard</h2>
                    <p className="text-gray-500">Manage team performance and approvals</p>
                </div>
                <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setTab("logs")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "logs" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                    >
                        Task Logs
                    </button>
                    <button
                        onClick={() => setTab("evaluations")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "evaluations" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                    >
                        Evaluations
                    </button>
                </div>
            </header>

            {loading && <div className="text-sm text-gray-500 animate-pulse">Loading data...</div>}

            {tab === "logs" && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800">Pending Task Logs</h3>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full">{pendingLogs.length} Pending</span>
                    </div>
                    {pendingLogs.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">All caught up! No pending logs.</div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3">Employee</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Task</th>
                                    <th className="px-6 py-3">Duration</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pendingLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{log.user?.name || "Unknown"}</td>
                                        <td className="px-6 py-4 text-gray-500">{log.date}</td>
                                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{log.description}</td>
                                        <td className="px-6 py-4 text-gray-600">{log.duration_hours}h</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleLogAction(log.id, 'approve')}
                                                className="text-green-600 hover:text-green-800 font-medium text-xs bg-green-50 hover:bg-green-100 px-3 py-1 rounded-md transition-colors"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleLogAction(log.id, 'reject')}
                                                className="text-red-600 hover:text-red-800 font-medium text-xs bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                                            >
                                                Reject
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {tab === "evaluations" && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">Pending Evaluations</h3>
                    {pendingEvals.length === 0 ? (
                        <div className="text-gray-500">No evaluations pending review.</div>
                    ) : (
                        <div className="space-y-6">
                            {pendingEvals.map(ev => (
                                <EvaluationCard key={ev.id} evaluation={ev} onSubmit={submitScore} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function EvaluationCard({ evaluation, onSubmit }) {
    // simplified scoring
    const [scores, setScores] = useState({});

    const handleScoreChange = (catId, val) => {
        setScores({ ...scores, [catId]: val });
    }

    return (
        <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between mb-4">
                <h4 className="font-bold text-lg">{evaluation.user?.name} - {evaluation.year}/{evaluation.month}</h4>
                <div className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Pending Review</div>
            </div>
            <div className="grid grid-cols-1 gap-2 mb-4">
                {Object.values(evaluation.breakdown || {}).map(cat => (
                    <div key={cat.category_id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="font-medium">{cat.category_name}</span>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-500">Rule: {cat.rule_score}</span>
                            <span className="text-gray-500">AI: {cat.llm_score}</span>
                            <div className="flex items-center gap-2">
                                <label>Your Score:</label>
                                <input
                                    type="number"
                                    className="w-16 border rounded px-1 py-0.5"
                                    max="10" min="0" step="0.1"
                                    onChange={(e) => handleScoreChange(cat.category_id, e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button
                onClick={() => onSubmit(evaluation.id, scores)}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 w-full"
            >
                Submit & Approve
            </button>
        </div>
    )
}

