import React, { useState } from "react";
import axios from "axios";

export default function TaskLogGrid({ initialDate = null }) {
    const [date, setDate] = useState(
        initialDate || new Date().toISOString().slice(0, 10),
    );
    const [rows, setRows] = useState([
        {
            task_id: null,
            start_time: "",
            end_time: "",
            duration_hours: 0,
            description: "",
            kpi_category_id: null,
            priority: "medium",
            due_date: "",
            status: "pending",
            assigned_by: "Self",
        },
    ]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    function addRow() {
        setRows([
            ...rows,
            {
                task_id: null,
                start_time: "",
                end_time: "",
                duration_hours: 0,
                description: "",
                kpi_category_id: null,
                priority: "medium",
                weight: 2,
                due_date: "",
                status: "pending",
                completion_percent: 0,
                assigned_by: "Self",
                type: 'task'
            },
        ]);
    }

    function updateRow(idx, key, value) {
        const next = rows.slice();
        next[idx][key] = value;

        // Auto-calculate duration if start/end exist
        if (key === 'start_time' || key === 'end_time') {
            const row = next[idx];
            if (row.start_time && row.end_time) {
                const [h1, m1] = row.start_time.split(':').map(Number);
                const [h2, m2] = row.end_time.split(':').map(Number);
                const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                if (diff > 0) row.duration_hours = (diff / 60).toFixed(2);
            }
        }

        setRows(next);
    }

    function removeRow(idx) {
        const next = rows.slice();
        next.splice(idx, 1);
        setRows(
            next.length
                ? next
                : [
                    {
                        task_id: null,
                        start_time: "",
                        end_time: "",
                        duration_hours: 0,
                        description: "",
                        kpi_category_id: null,
                        priority: "medium",
                        due_date: "",
                        status: "pending",
                        assigned_by: "Self",
                        type: 'task'
                    },
                ],
        );
    }

    async function submit() {
        setSubmitting(true);
        setMessage(null);
        try {
            const payload = { date, rows };
            await axios.post("/api/task-logs", payload);
            setMessage("Submitted successfully");
        } catch (e) {
            console.error(e);
            setMessage("Submit failed");
        } finally {
            setSubmitting(false);
        }
    }

    React.useEffect(() => {
        fetchDailyData();
    }, [date]);

    async function fetchDailyData() {
        setLoading(true);
        try {
            // 1. Check for existing logs
            const existing = await axios.get(`/api/task-logs?date=${date}`);
            if (existing.data.data && existing.data.data.length > 0) {
                const mapped = existing.data.data.map(l => ({
                    id: l.id,
                    task_id: l.task_id,
                    start_time: l.start_time || "",
                    end_time: l.end_time || "",
                    duration_hours: l.duration_hours,
                    description: l.description,
                    kpi_category_id: l.kpi_category_id,
                    priority: l.task?.priority || 'medium',
                    weight: l.type === 'task' ? (l.task?.priority === 'high' ? 3 : (l.task?.priority === 'medium' ? 2 : 1)) : 0,
                    due_date: l.task?.due_date ? l.task.due_date.slice(0, 10) : "",
                    status: l.status,
                    completion_percent: l.metadata?.completion_percent || 0,
                    assigned_by: l.task?.metadata?.assigned_by || "Self",
                    type: l.metadata?.type || 'task'
                }));
                setRows(mapped);
            } else {
                // 2. Fetch template
                const template = await axios.get(`/api/task-logs/daily-template?date=${date}`);
                setRows(template.data.map(r => ({
                    ...r,
                    due_date: r.due_date ? r.due_date.slice(0, 10) : ""
                })));
            }
        } catch (e) {
            console.error("Failed to fetch daily data", e);
        } finally {
            setLoading(false);
        }
    }

    async function importFromPlan() {
        if (confirm("This will overwrite current rows with the daily template. Continue?")) {
            setLoading(true);
            try {
                const template = await axios.get(`/api/task-logs/daily-template?date=${date}`);
                setRows(template.data);
            } catch (e) {
                alert("Failed to refresh template");
            } finally {
                setLoading(false);
            }
        }
    }

    return (
        <div className="bg-white/80 backdrop-blur-md shadow-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Daily Task Log</h2>
                        <p className="text-sm text-gray-500">Record your actual work and progress</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={importFromPlan}
                        className="text-xs bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors font-medium"
                    >
                        Refresh Template
                    </button>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5"
                    />
                </div>
            </div>

            {/* Productivity Summary */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-linear-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Total Duration</span>
                    <span className="text-2xl font-bold text-slate-800">
                        {rows.reduce((acc, r) => acc + (parseFloat(r.duration_hours) || 0), 0).toFixed(1)} hrs
                    </span>
                </div>
                <div className="bg-linear-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Weighted Factor</span>
                    <span className="text-2xl font-bold text-slate-800">
                        {rows.reduce((acc, r) => acc + ((parseFloat(r.duration_hours) || 0) * (r.weight || 1)), 0).toFixed(1)}
                    </span>
                </div>
                <div className="bg-linear-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Productivity Score</span>
                    <span className="text-2xl font-bold text-slate-800">
                        {(() => {
                            const totalWeightedComp = rows.reduce((acc, r) => acc + ((parseFloat(r.completion_percent) || 0) * (parseFloat(r.duration_hours) || 0) * (r.weight || 1)), 0);
                            const totalFactor = rows.reduce((acc, r) => acc + ((parseFloat(r.duration_hours) || 0) * (r.weight || 1)), 0);
                            return totalFactor > 0 ? (totalWeightedComp / totalFactor).toFixed(1) : "100.0";
                        })()}%
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto relative min-h-[200px]">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                )}
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50/50">
                        <tr>
                            <th className="px-4 py-3 min-w-[200px]">Description</th>
                            <th className="px-4 py-3 w-28">Start</th>
                            <th className="px-4 py-3 w-28">End</th>
                            <th className="px-4 py-3 w-24">Comp %</th>
                            <th className="px-4 py-3 w-32">Priority</th>
                            <th className="px-4 py-3 w-32">Due Date</th>
                            <th className="px-4 py-3 w-32">Status</th>
                            <th className="px-4 py-3 w-32">Assigned By</th>
                            <th className="px-1 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, idx) => (
                            <tr key={idx} className={`border-b transition-colors text-[13px] ${r.type === 'break' ? 'bg-green-50/50 hover:bg-green-50' :
                                r.type === 'shift_end' ? 'bg-blue-50/50 hover:bg-blue-50' :
                                    'bg-white hover:bg-gray-50'
                                }`}>
                                <td className="px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        {r.type === 'break' && <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>}
                                        {r.type === 'shift_end' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                                        <input
                                            className="w-full bg-transparent border-0 border-b border-transparent focus:border-purple-500 focus:ring-0 px-0 py-1 transition-colors font-medium text-slate-700"
                                            value={r.description}
                                            onChange={(e) => updateRow(idx, "description", e.target.value)}
                                            placeholder="Task details..."
                                        />
                                    </div>
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="time"
                                        className="bg-transparent border border-gray-200 text-xs rounded block w-full p-1"
                                        value={r.start_time}
                                        onChange={(e) => updateRow(idx, "start_time", e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="time"
                                        className="bg-transparent border border-gray-200 text-xs rounded block w-full p-1"
                                        value={r.end_time}
                                        onChange={(e) => updateRow(idx, "end_time", e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="number"
                                        max="100"
                                        className={`bg-transparent border border-gray-200 text-xs rounded block w-full p-1 font-bold text-slate-700 ${r.type !== 'task' ? 'invisible' : ''}`}
                                        value={r.completion_percent}
                                        onChange={(e) => updateRow(idx, "completion_percent", e.target.value)}
                                        disabled={r.type !== 'task'}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <select
                                        className={`bg-transparent border border-gray-200 text-xs rounded block w-full p-1 ${r.type !== 'task' ? 'invisible' : ''}`}
                                        value={r.priority}
                                        onChange={(e) => {
                                            const p = e.target.value;
                                            const w = p === 'high' ? 3 : (p === 'medium' ? 2 : 1);
                                            updateRow(idx, "priority", p);
                                            updateRow(idx, "weight", w);
                                        }}
                                        disabled={r.type !== 'task'}
                                    >
                                        <option value="low">Low (1x)</option>
                                        <option value="medium">Medium (2x)</option>
                                        <option value="high">High (3x)</option>
                                    </select>
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="date"
                                        className={`bg-transparent border border-gray-200 text-xs rounded block w-full p-1 ${r.type !== 'task' ? 'invisible' : ''}`}
                                        value={r.due_date}
                                        onChange={(e) => updateRow(idx, "due_date", e.target.value)}
                                        disabled={r.type !== 'task'}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <select
                                        className={`bg-transparent border border-gray-200 text-xs rounded block w-full p-1 ${r.type !== 'task' ? 'invisible' : ''}`}
                                        value={r.status}
                                        onChange={(e) => updateRow(idx, "status", e.target.value)}
                                        disabled={r.type !== 'task'}
                                    >
                                        <option value="not_started">Not Started</option>
                                        <option value="inprogress">In Progress</option>
                                        <option value="pending">Pending</option>
                                        <option value="complete">Complete</option>
                                        <option value="review">In Review</option>
                                    </select>
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        className={`bg-transparent border border-gray-200 text-xs rounded block w-full p-1 ${r.type !== 'task' ? 'invisible' : ''}`}
                                        value={r.assigned_by}
                                        onChange={(e) => updateRow(idx, "assigned_by", e.target.value)}
                                        disabled={r.type !== 'task'}
                                    />
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <button
                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                        onClick={() => removeRow(idx)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex items-center justify-between">
                <button
                    className="text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center gap-1 transition-colors group"
                    onClick={addRow}
                >
                    <div className="w-5 h-5 rounded-full bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    Add Log Entry
                </button>

                <div className="flex items-center gap-4">
                    {message && (
                        <div className={`text-xs font-medium ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</div>
                    )}
                    <button
                        className="bg-linear-to-r from-purple-600 to-pink-600 text-white font-medium py-2 px-6 rounded-lg shadow-md hover:from-purple-700 hover:to-pink-700 transition-all transform active:scale-95 disabled:opacity-50 text-sm"
                        onClick={submit}
                        disabled={submitting || loading}
                    >
                        {submitting ? "Saving..." : "Save Daily Log"}
                    </button>
                </div>
            </div>
        </div>
    );
}
