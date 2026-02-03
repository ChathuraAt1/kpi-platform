import React, { useState, useEffect } from "react";
import axios from "axios";

export default function MorningPlan({ onPlanSubmitted }) {
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [rows, setRows] = useState([
        {
            title: "",
            priority: "medium",
            due_date: "",
            assigned_by: "Self",
            status: "open",
        },
    ]);
    const [isFinalized, setIsFinalized] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchPlanInfo();
    }, [date]);

    async function fetchPlanInfo() {
        setLoading(true);
        setMessage(null);
        try {
            // 1. Check status
            const statusRes = await axios.get(`/api/tasks/plan-status?date=${date}`);
            const finalized = statusRes.data.is_finalized;
            setIsFinalized(finalized);

            // 2. Fetch tasks (getPlan handles rollover suggestions if not finalized, or fixed plan if finalized)
            const tasksRes = await axios.get(`/api/tasks/plan?date=${date}`);
            if (tasksRes.data && tasksRes.data.length > 0) {
                setRows(tasksRes.data.map(t => ({
                    id: t.id,
                    title: t.title || "",
                    priority: t.priority || "medium",
                    due_date: t.due_date ? t.due_date.slice(0, 10) : "",
                    assigned_by: t.metadata?.assigned_by || "Self",
                    status: t.status || "open",
                })));
            } else {
                setRows([
                    {
                        title: "",
                        priority: "medium",
                        due_date: "",
                        assigned_by: "Self",
                        status: "open",
                    },
                ]);
            }
        } catch (e) {
            console.error("Failed to fetch plan info", e);
        } finally {
            setLoading(false);
        }
    }

    function addRow() {
        if (isFinalized) return;
        setRows([
            ...rows,
            {
                title: "",
                priority: "medium",
                due_date: "",
                assigned_by: "Self",
                status: "open",
            },
        ]);
    }

    function updateRow(idx, key, value) {
        if (isFinalized) return;
        const next = rows.slice();
        next[idx][key] = value;
        setRows(next);
    }

    function removeRow(idx) {
        if (isFinalized) return;
        const next = rows.slice();
        next.splice(idx, 1);
        setRows(next.length ? next : [
            {
                title: "",
                priority: "medium",
                due_date: "",
                assigned_by: "Self",
                status: "open",
            }
        ]);
    }

    async function submit() {
        setSubmitting(true);
        setMessage(null);
        try {
            const payload = { date, tasks: rows };
            await axios.post("/api/tasks/plan", payload);
            setMessage("Plan submitted and finalized!");
            setIsFinalized(true);
            if (onPlanSubmitted) onPlanSubmitted();
        } catch (e) {
            console.error(e);
            setMessage("Failed to submit plan. " + (e.response?.data?.message || e.message));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="bg-white/80 backdrop-blur-md shadow-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div>
                        <h2 className="text-xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Morning Plan (To-Do List)</h2>
                        <p className="text-sm text-gray-500">Plan your tasks for the day</p>
                    </div>
                    {isFinalized && (
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Finalized
                        </span>
                    )}
                </div>
                <div>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                </div>
            </div>

            <div className="overflow-x-auto relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50/50">
                        <tr>
                            <th className="px-4 py-3">Task Description</th>
                            <th className="px-4 py-3 w-32">Priority</th>
                            <th className="px-4 py-3 w-32">Due Date</th>
                            <th className="px-4 py-3 w-40">Assigned By</th>
                            {!isFinalized && <th className="px-1 py-3 w-10"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, idx) => (
                            <tr key={idx} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2">
                                    <input
                                        className={`w-full bg-transparent border-0 border-b-2 ${isFinalized ? 'border-transparent cursor-default' : 'border-gray-100 focus:border-blue-500'} focus:ring-0 px-0 py-1 transition-colors`}
                                        value={r.title}
                                        onChange={(e) => updateRow(idx, "title", e.target.value)}
                                        placeholder={isFinalized ? "" : "What needs to be done?"}
                                        readOnly={isFinalized}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <select
                                        className={`block w-full p-1 text-xs rounded border ${isFinalized ? 'border-transparent bg-transparent pointer-events-none appearance-none font-medium' : 'bg-gray-50 border-gray-200'} ${r.priority === 'high' ? 'text-red-600' :
                                            r.priority === 'medium' ? 'text-yellow-600' :
                                                'text-green-600'
                                            }`}
                                        value={r.priority}
                                        onChange={(e) => updateRow(idx, "priority", e.target.value)}
                                        disabled={isFinalized}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type={isFinalized ? "text" : "date"}
                                        className={`text-xs rounded block w-full p-1 ${isFinalized ? 'bg-transparent border-transparent' : 'bg-gray-50 border-gray-200'}`}
                                        value={r.due_date}
                                        onChange={(e) => updateRow(idx, "due_date", e.target.value)}
                                        readOnly={isFinalized}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="text"
                                        className={`text-xs rounded block w-full p-1 ${isFinalized ? 'bg-transparent border-transparent' : 'bg-gray-50 border-gray-200'}`}
                                        value={r.assigned_by}
                                        onChange={(e) => updateRow(idx, "assigned_by", e.target.value)}
                                        placeholder="Self"
                                        readOnly={isFinalized}
                                    />
                                </td>
                                {!isFinalized && (
                                    <td className="px-4 py-2 text-right">
                                        <button
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                            onClick={() => removeRow(idx)}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 000-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex items-center justify-between">
                {!isFinalized ? (
                    <button
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 transition-colors group"
                        onClick={addRow}
                    >
                        <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        Add Task
                    </button>
                ) : (
                    <div className="text-[11px] text-gray-400 font-medium italic">
                        Plan finalized. View actual progress in the Task Log.
                    </div>
                )}

                <div className="flex items-center gap-4">
                    {message && (
                        <div className={`text-xs font-medium ${message.includes('successfully') || message.includes('finalized') ? 'text-green-600' : 'text-red-600'}`}>{message}</div>
                    )}
                    {!isFinalized && (
                        <button
                            className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-md transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            onClick={submit}
                            disabled={submitting || loading}
                        >
                            {submitting ? "Submitting..." : "Finalize Plan"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
