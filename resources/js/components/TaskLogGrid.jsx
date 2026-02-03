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
                const start = new Date(`1970-01-01T${row.start_time}`);
                const end = new Date(`1970-01-01T${row.end_time}`);
                const diff = (end - start) / 1000 / 60 / 60; // hours
                if (diff > 0) row.duration_hours = diff.toFixed(2);
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
                    weight: l.task?.priority === 'high' ? 3 : (l.task?.priority === 'medium' ? 2 : 1),
                    due_date: l.task?.due_date || "",
                    status: l.status,
                    completion_percent: l.metadata?.completion_percent || 0,
                    assigned_by: l.task?.metadata?.assigned_by || "Self",
                }));
                setRows(mapped);
            } else {
                // 2. Fetch template
                const template = await axios.get(`/api/task-logs/daily-template?date=${date}`);
                setRows(template.data);
            }
        } catch (e) {
            console.error("Failed to fetch daily data", e);
        } finally {
            setLoading(false);
        }
    }

    async function importFromPlan() {
        // Since we now auto-load template which includes plan, 
        // this can just be a manual refresh of the template.
        if (confirm("This will overwrite current rows with the company template. Continue?")) {
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
                <div>
                    <h2 className="text-xl font-bold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Daily Task Log</h2>
                    <p className="text-sm text-gray-500">Record your actual work and progress</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={importFromPlan}
                        className="text-sm bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200 transition-colors"
                    >
                        Import Plan
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
                            return totalFactor > 0 ? (totalWeightedComp / totalFactor).toFixed(1) : "0.0";
                        })()}%
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50/50">
                        <tr>
                            <th className="px-4 py-3 min-w-[200px]">Description</th>
                            <th className="px-4 py-3 w-28">Start</th>
                            <th className="px-4 py-3 w-28">End</th>
                            <th className="px-4 py-3 w-20">Hours</th>
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
                            <tr key={idx} className="bg-white border-b hover:bg-gray-50 text-[13px]">
                                <td className="px-4 py-2">
                                    <input
                                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-purple-500 focus:ring-0 px-0 py-1 transition-colors"
                                        value={r.description}
                                        onChange={(e) => updateRow(idx, "description", e.target.value)}
                                        placeholder="Task details..."
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="time"
                                        className="bg-gray-50 border border-gray-200 text-xs rounded block w-full p-1"
                                        value={r.start_time}
                                        onChange={(e) => updateRow(idx, "start_time", e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="time"
                                        className="bg-gray-50 border border-gray-200 text-xs rounded block w-full p-1"
                                        value={r.end_time}
                                        onChange={(e) => updateRow(idx, "end_time", e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="number"
                                        step="0.25"
                                        className="bg-gray-50 border border-gray-200 text-xs rounded block w-full p-1"
                                        value={r.duration_hours}
                                        onChange={(e) => updateRow(idx, "duration_hours", e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="number"
                                        max="100"
                                        className="bg-gray-50 border border-gray-200 text-xs rounded block w-full p-1"
                                        value={r.completion_percent}
                                        onChange={(e) => updateRow(idx, "completion_percent", e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <select
                                        className="bg-gray-50 border border-gray-200 text-xs rounded block w-full p-1"
                                        value={r.priority}
                                        onChange={(e) => {
                                            const p = e.target.value;
                                            const w = p === 'high' ? 3 : (p === 'medium' ? 2 : 1);
                                            updateRow(idx, "priority", p);
                                            updateRow(idx, "weight", w);
                                        }}
                                    >
                                        <option value="low">Low (1x)</option>
                                        <option value="medium">Medium (2x)</option>
                                        <option value="high">High (3x)</option>
                                    </select>
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="date"
                                        className="bg-gray-50 border border-gray-200 text-xs rounded block w-full p-1"
                                        value={r.due_date}
                                        onChange={(e) => updateRow(idx, "due_date", e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <select
                                        className="bg-gray-50 border border-gray-200 text-xs rounded block w-full p-1"
                                        value={r.status}
                                        onChange={(e) => updateRow(idx, "status", e.target.value)}
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
                                        className="bg-gray-50 border border-gray-200 text-xs rounded block w-full p-1"
                                        value={r.assigned_by}
                                        onChange={(e) => updateRow(idx, "assigned_by", e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <button
                                        className="text-gray-400 hover:text-red-500"
                                        onClick={() => removeRow(idx)}
                                    >
                                        &times;
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex items-center justify-between">
                <button
                    className="text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center gap-1"
                    onClick={addRow}
                >
                    + Add Row
                </button>

                <div className="flex items-center gap-4">
                    {message && (
                        <div className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</div>
                    )}
                    <button
                        className="bg-linear-to-r from-purple-600 to-pink-600 text-white font-medium py-2 px-6 rounded-lg shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
                        onClick={submit}
                        disabled={submitting}
                    >
                        {submitting ? "Saving..." : "Save Log"}
                    </button>
                </div>
            </div>
        </div>
    );
}
