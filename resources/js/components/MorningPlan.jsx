import React, { useState } from "react";
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
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    function addRow() {
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
        const next = rows.slice();
        next[idx][key] = value;
        setRows(next);
    }

    function removeRow(idx) {
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
            setMessage("Plan submitted successfully!");
            setRows([{ title: "", priority: "medium", due_date: "", assigned_by: "Self", status: "open" }]); // Reset
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
                <div>
                    <h2 className="text-xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Morning Plan (To-Do List)</h2>
                    <p className="text-sm text-gray-500">Plan your tasks for the day</p>
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

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50/50">
                        <tr>
                            <th className="px-4 py-3">Task Description</th>
                            <th className="px-4 py-3 w-32">Priority</th>
                            <th className="px-4 py-3 w-32">Due Date</th>
                            <th className="px-4 py-3 w-40">Assigned By</th>
                            <th className="px-1 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, idx) => (
                            <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-4 py-2">
                                    <input
                                        className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:ring-0 px-0 py-1 transition-colors"
                                        value={r.title}
                                        onChange={(e) => updateRow(idx, "title", e.target.value)}
                                        placeholder="What needs to be done?"
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <select
                                        className={`block w-full p-1 text-sm rounded border ${r.priority === 'high' ? 'bg-red-50 text-red-800 border-red-200' :
                                                r.priority === 'medium' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                                                    'bg-green-50 text-green-800 border-green-200'
                                            }`}
                                        value={r.priority}
                                        onChange={(e) => updateRow(idx, "priority", e.target.value)}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="date"
                                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-1"
                                        value={r.due_date}
                                        onChange={(e) => updateRow(idx, "due_date", e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="text"
                                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-1"
                                        value={r.assigned_by}
                                        onChange={(e) => updateRow(idx, "assigned_by", e.target.value)}
                                        placeholder="Self"
                                    />
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <button
                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                        onClick={() => removeRow(idx)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 000-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
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
                    className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    onClick={addRow}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Task
                </button>

                <div className="flex items-center gap-4">
                    {message && (
                        <div className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</div>
                    )}
                    <button
                        className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-md transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={submit}
                        disabled={submitting}
                    >
                        {submitting ? "Submitting..." : "Submit Plan"}
                    </button>
                </div>
            </div>
        </div>
    );
}
