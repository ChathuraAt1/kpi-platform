import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        fetchPlanInfo();
    }, [date]);

    async function fetchPlanInfo() {
        setLoading(true);
        setMessage(null);
        try {
            // 1. Check status
            const statusRes = await axios.get(
                `/api/tasks/plan-status?date=${encodeURIComponent(date)}`,
            );
            const finalized = statusRes.data.is_finalized;
            setIsFinalized(finalized);

            // 2. Fetch tasks (getPlan handles rollover suggestions if not finalized, or fixed plan if finalized)
            const tasksRes = await axios.get(
                `/api/tasks/plan?date=${encodeURIComponent(date)}`,
            );
            if (tasksRes.data && tasksRes.data.length > 0) {
                setRows(
                    tasksRes.data.map((t) => ({
                        id: t.id,
                        title: t.title || "",
                        priority: t.priority || "medium",
                        due_date: t.due_date ? t.due_date.slice(0, 10) : "",
                        assigned_by: t.metadata?.assigned_by || "Self",
                        status: t.status || "open",
                    })),
                );
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
            const status = e.response?.status;
            if (status === 404) {
                setMessage("No plan found for this date.");
                setRows([
                    {
                        title: "",
                        priority: "medium",
                        due_date: "",
                        assigned_by: "Self",
                        status: "open",
                    },
                ]);
            } else if (status === 401) {
                setMessage("Authentication required. Please sign in again.");
            } else {
                setMessage("Failed to fetch plan info.");
            }
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
        setRows(
            next.length
                ? next
                : [
                      {
                          title: "",
                          priority: "medium",
                          due_date: "",
                          assigned_by: "Self",
                          status: "open",
                      },
                  ],
        );
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
            setMessage(
                "Failed to submit plan. " +
                    (e.response?.data?.message || e.message),
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <div className="flex flex-col h-full">
                {/* Hidden expand trigger */}
                <button
                    data-morning-plan-expand
                    onClick={() => setIsExpanded(true)}
                    className="hidden"
                />

                <div className="flex-1 overflow-auto scrollbar-hide">
                    {loading && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                            <div className="w-8 h-8 border-3 border-orange-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    )}

                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="px-3 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-left border-b border-slate-100">
                                    Objective
                                </th>
                                <th className="px-3 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center border-b border-slate-100 w-24">
                                    Urgency
                                </th>
                                {!isFinalized && (
                                    <th className="px-2 py-2 border-b border-slate-100 w-10"></th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.map((r, idx) => (
                                <tr
                                    key={idx}
                                    className="group hover:bg-neutral-50/50 transition-all"
                                >
                                    <td className="px-3 py-2">
                                        <textarea
                                            className={`w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-neutral-700 placeholder:text-slate-300 resize-none overflow-hidden ${isFinalized ? "opacity-70" : ""}`}
                                            value={r.title || ""}
                                            onChange={(e) => {
                                                updateRow(
                                                    idx,
                                                    "title",
                                                    e.target.value,
                                                );
                                                e.target.style.height = "auto";
                                                e.target.style.height =
                                                    e.target.scrollHeight +
                                                    "px";
                                            }}
                                            onInput={(e) => {
                                                e.target.style.height = "auto";
                                                e.target.style.height =
                                                    e.target.scrollHeight +
                                                    "px";
                                            }}
                                            placeholder="Enter goal..."
                                            readOnly={isFinalized}
                                            rows={1}
                                        />
                                        {!isFinalized && (
                                            <div className="h-px w-0 group-focus-within:w-full bg-orange-500/30 transition-all duration-500"></div>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        <select
                                            className={`w-full bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-center focus:ring-0 p-0 ${
                                                r.priority === "high"
                                                    ? "text-rose-500"
                                                    : r.priority === "medium"
                                                      ? "text-amber-500"
                                                      : "text-emerald-500"
                                            }`}
                                            value={r.priority}
                                            onChange={(e) =>
                                                updateRow(
                                                    idx,
                                                    "priority",
                                                    e.target.value,
                                                )
                                            }
                                            disabled={isFinalized}
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">
                                                Medium
                                            </option>
                                            <option value="high">High</option>
                                        </select>
                                    </td>
                                    {!isFinalized && (
                                        <td className="px-2 py-3 text-center">
                                            <button
                                                className="text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-50"
                                                onClick={() => removeRow(idx)}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-3.5 w-3.5"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 space-y-4">
                    {!isFinalized ? (
                        <div className="flex flex-col gap-4">
                            <button
                                className="group flex items-center justify-center gap-2 py-3 border-2 border-dashed border-neutral-200 hover:border-orange-300 hover:bg-indigo-50/30 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-orange-600"
                                onClick={addRow}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={4}
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                                Insert Goal
                            </button>

                            <button
                                className="w-full py-4 bg-neutral-900 border border-slate-900 hover:bg-orange-600 hover:border-indigo-600 text-white rounded-4xl transition-all shadow-xl hover:shadow-orange-500/20 active:scale-[0.98] text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3"
                                onClick={submit}
                                disabled={submitting || loading}
                            >
                                {submitting ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2.5}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                )}
                                {submitting ? "Processing..." : "Commit Plan"}
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <p className="text-[11px] font-black text-emerald-800 uppercase tracking-wider leading-tight">
                                Structure finalized.
                                <br />
                                <span className="text-[10px] text-emerald-600/70">
                                    Execution Phase Active
                                </span>
                            </p>
                        </div>
                    )}

                    {message && (
                        <div
                            className={`text-[10px] font-black uppercase tracking-widest text-center ${message.includes("success") || message.includes("finalized") ? "text-emerald-600" : "text-rose-600"}`}
                        >
                            {message}
                        </div>
                    )}
                </div>
            </div>

            {/* Expand Modal */}
            {isExpanded &&
                createPortal(
                    <div
                        className="fixed inset-0 bg-neutral-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-6"
                        onClick={() => setIsExpanded(false)}
                    >
                        <div
                            className="bg-white rounded-4xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-neutral-900">
                                        Morning Plan
                                    </h2>
                                    <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">
                                        Expanded View
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all"
                                >
                                    <svg
                                        className="w-5 h-5 text-slate-600"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6 overflow-auto max-h-[calc(90vh-140px)]">
                                {/* Same content as main view */}
                                <div className="flex flex-col h-full">
                                    <div className="flex-1 overflow-auto scrollbar-hide">
                                        <table className="w-full border-separate border-spacing-0">
                                            <thead>
                                                <tr className="bg-slate-50">
                                                    <th className="px-4 py-3 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-left border-b border-slate-100">
                                                        Objective
                                                    </th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center border-b border-slate-100 w-32">
                                                        Urgency
                                                    </th>
                                                    {!isFinalized && (
                                                        <th className="px-2 py-3 border-b border-slate-100 w-12"></th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {rows.map((r, idx) => (
                                                    <tr
                                                        key={idx}
                                                        className="group hover:bg-neutral-50/50 transition-all"
                                                    >
                                                        <td className="px-4 py-3">
                                                            <textarea
                                                                className={`w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-neutral-700 placeholder:text-slate-300 resize-none overflow-hidden ${isFinalized ? "opacity-70" : ""}`}
                                                                value={
                                                                    r.title ||
                                                                    ""
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    updateRow(
                                                                        idx,
                                                                        "title",
                                                                        e.target
                                                                            .value,
                                                                    );
                                                                    e.target.style.height =
                                                                        "auto";
                                                                    e.target.style.height =
                                                                        e.target
                                                                            .scrollHeight +
                                                                        "px";
                                                                }}
                                                                onInput={(
                                                                    e,
                                                                ) => {
                                                                    e.target.style.height =
                                                                        "auto";
                                                                    e.target.style.height =
                                                                        e.target
                                                                            .scrollHeight +
                                                                        "px";
                                                                }}
                                                                placeholder="Enter goal..."
                                                                readOnly={
                                                                    isFinalized
                                                                }
                                                                rows={1}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <select
                                                                className={`w-full bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-center focus:ring-0 p-0 ${r.priority === "high" ? "text-rose-500" : r.priority === "medium" ? "text-amber-500" : "text-emerald-500"}`}
                                                                value={
                                                                    r.priority
                                                                }
                                                                onChange={(e) =>
                                                                    updateRow(
                                                                        idx,
                                                                        "priority",
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                disabled={
                                                                    isFinalized
                                                                }
                                                            >
                                                                <option value="low">
                                                                    Low
                                                                </option>
                                                                <option value="medium">
                                                                    Medium
                                                                </option>
                                                                <option value="high">
                                                                    High
                                                                </option>
                                                            </select>
                                                        </td>
                                                        {!isFinalized && (
                                                            <td className="px-2 py-3 text-center">
                                                                <button
                                                                    className="text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-50"
                                                                    onClick={() =>
                                                                        removeRow(
                                                                            idx,
                                                                        )
                                                                    }
                                                                >
                                                                    <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        className="h-3.5 w-3.5"
                                                                        viewBox="0 0 20 20"
                                                                        fill="currentColor"
                                                                    >
                                                                        <path
                                                                            fillRule="evenodd"
                                                                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                                            clipRule="evenodd"
                                                                        />
                                                                    </svg>
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-8 space-y-6">
                                        {!isFinalized ? (
                                            <div className="flex flex-col gap-4">
                                                <button
                                                    className="group flex items-center justify-center gap-2 py-3 border-2 border-dashed border-neutral-200 hover:border-orange-300 hover:bg-indigo-50/30 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-orange-600"
                                                    onClick={addRow}
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="h-3 w-3"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={4}
                                                            d="M12 4v16m8-8H4"
                                                        />
                                                    </svg>
                                                    Insert Goal
                                                </button>
                                                <button
                                                    className="w-full py-4 bg-neutral-900 border border-slate-900 hover:bg-orange-600 hover:border-indigo-600 text-white rounded-4xl transition-all shadow-xl hover:shadow-orange-500/20 active:scale-[0.98] text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3"
                                                    onClick={submit}
                                                    disabled={
                                                        submitting || loading
                                                    }
                                                >
                                                    {submitting ? (
                                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                    ) : (
                                                        <svg
                                                            className="w-4 h-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={
                                                                    2.5
                                                                }
                                                                d="M5 13l4 4L19 7"
                                                            />
                                                        </svg>
                                                    )}
                                                    {submitting
                                                        ? "Processing..."
                                                        : "Commit Plan"}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                                                    <svg
                                                        className="w-4 h-4"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={3}
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                </div>
                                                <p className="text-[11px] font-black text-emerald-800 uppercase tracking-wider leading-tight">
                                                    Structure finalized.
                                                    <br />
                                                    <span className="text-[10px] text-emerald-600/70">
                                                        Execution Phase Active
                                                    </span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}
