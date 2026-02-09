import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function EmployeeTaskLogs() {
    const { empId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [employee, setEmployee] = useState(null);
    const [taskLogs, setTaskLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            axios.get(`/api/users/${empId}`),
            axios.get("/api/task-logs", { params: { employee_id: empId } }),
        ])
            .then(([empRes, logsRes]) => {
                setEmployee(empRes.data);
                const sorted = (logsRes.data.data || []).sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at),
                );
                setTaskLogs(sorted);
            })
            .catch((e) => console.error("Failed to fetch data", e))
            .finally(() => setLoading(false));
    }, [empId]);

    return (
        <div className="space-y-10 pb-20 px-4 md:px-0">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-neutral-900 rounded-lg font-bold text-sm transition-colors"
                >
                    ← Back
                </button>
                <header className="flex-1 p-10 rounded-4xl bg-linear-to-br from-indigo-900 to-slate-900 text-white overflow-hidden shadow-2xl border border-orange-500/10">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-orange-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-orange-300 uppercase tracking-widest border border-orange-400/20">
                                Task Log Details
                            </span>
                        </div>
                        <h2 className="text-4xl font-black tracking-tight">
                            {employee?.name || "Loading..."}
                        </h2>
                        <p className="text-neutral-400 font-medium max-w-2xl mt-2">
                            {employee?.email}
                        </p>
                    </div>
                </header>
            </div>

            {/* Task Logs List */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 bg-neutral-50/50">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                        Task Logs ({taskLogs.length})
                    </h3>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-neutral-500">
                        Loading task logs...
                    </div>
                ) : taskLogs.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 italic">
                        No task logs found for this employee
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        Task
                                    </th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        KPI Category
                                    </th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="text-center px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {taskLogs.map((log) => (
                                    <tr
                                        key={log.id}
                                        className="hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="px-6 py-4 text-neutral-700 font-medium">
                                            {new Date(
                                                log.created_at,
                                            ).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-6 py-4 text-neutral-900 font-bold">
                                            {log.task?.title || "N/A"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold">
                                                {log.kpi_category?.name ||
                                                    "Unassigned"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                                                    log.status === "submitted"
                                                        ? "bg-blue-100 text-blue-700"
                                                        : log.status ===
                                                            "pending"
                                                          ? "bg-amber-100 text-amber-700"
                                                          : "bg-slate-100 text-neutral-700"
                                                }`}
                                            >
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() =>
                                                    setSelectedLog(log)
                                                }
                                                className="px-4 py-2 bg-orange-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-colors"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Task Log Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 p-6 border-b border-slate-100 bg-neutral-50/50 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-neutral-900">
                                    {selectedLog.task?.title || "N/A"}
                                </h3>
                                <p className="text-sm text-neutral-500 mt-1">
                                    {new Date(
                                        selectedLog.created_at,
                                    ).toLocaleDateString("en-US", {
                                        weekday: "long",
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-2xl text-neutral-400 hover:text-slate-600 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                                        KPI Category
                                    </label>
                                    <p className="text-sm font-bold text-neutral-900 mt-1">
                                        {selectedLog.kpi_category?.name ||
                                            "Unassigned"}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                                        Status
                                    </label>
                                    <p className="text-sm font-bold text-neutral-900 mt-1">
                                        <span
                                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                                                selectedLog.status ===
                                                "submitted"
                                                    ? "bg-blue-100 text-blue-700"
                                                    : selectedLog.status ===
                                                        "pending"
                                                      ? "bg-amber-100 text-amber-700"
                                                      : "bg-slate-100 text-neutral-700"
                                            }`}
                                        >
                                            {selectedLog.status}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Notes Section */}
                            <div>
                                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                                    Notes & Details
                                </label>
                                <div className="bg-slate-50 border border-neutral-200 rounded-xl p-4 mt-2">
                                    <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                                        {selectedLog.notes ||
                                            "No notes provided"}
                                    </p>
                                </div>
                            </div>

                            {/* Supervisor Score (if available) */}
                            {selectedLog.supervisor_score !== null &&
                                selectedLog.supervisor_score !== undefined && (
                                    <div>
                                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                                            Supervisor Score
                                        </label>
                                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mt-2 flex items-center gap-4">
                                            <div className="text-4xl font-black text-orange-600">
                                                {selectedLog.supervisor_score}
                                                /10
                                            </div>
                                            <div className="flex-1">
                                                <div className="w-full bg-indigo-200 rounded-full h-3">
                                                    <div
                                                        className="bg-orange-600 h-3 rounded-full transition-all"
                                                        style={{
                                                            width: `${(selectedLog.supervisor_score / 10) * 100}%`,
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-600 mt-2">
                                                    Performance Rating
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 p-6 border-t border-slate-100 bg-neutral-50/50 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-6 py-3 bg-orange-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
