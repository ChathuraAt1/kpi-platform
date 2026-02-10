import React, { useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";

// Generate a small client-side unique id for rendering keys
function genUid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function TaskLogGrid({
    initialDate = null,
    trustedDate = null,
}) {
    const [date, setDate] = useState(
        initialDate || new Date().toISOString().slice(0, 10),
    );
    const isReadOnly = trustedDate && date < trustedDate;

    const [rows, setRows] = useState([
        {
            _uid: genUid(),
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
            type: "task",
        },
    ]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Shift and break information
    const [shift, setShift] = useState(null);
    const [breaks, setBreaks] = useState([]);
    const [expectedWorkHours, setExpectedWorkHours] = useState(0);
    const [totalBreakHours, setTotalBreakHours] = useState(0);

    function addRow() {
        setRows([
            ...rows,
            {
                _uid: genUid(),
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
                type: "task",
            },
        ]);
    }

    /**
     * Check if a task overlaps with break times
     */
    function checkBreakOverlap(startTime, endTime) {
        if (!startTime || !endTime || !breaks || breaks.length === 0)
            return null;

        for (const brk of breaks) {
            const breakStart = parseFloat(brk.start.replace(":", "."));
            const breakEnd = parseFloat(brk.end.replace(":", "."));
            const taskStart = parseFloat(startTime.replace(":", "."));
            const taskEnd = parseFloat(endTime.replace(":", "."));

            // Check for overlap
            if (taskStart < breakEnd && taskEnd > breakStart) {
                return {
                    overlaps: true,
                    breakLabel: brk.label || "Break",
                    breakStart: brk.start,
                    breakEnd: brk.end,
                };
            }
        }
        return null;
    }

    /**
     * Check if task times are within shift window
     */
    function isWithinShift(startTime, endTime) {
        if (!shift || !startTime || !endTime) return true;

        const shiftStart = parseFloat(shift.start.replace(":", "."));
        const shiftEnd = parseFloat(shift.end.replace(":", "."));
        const taskStart = parseFloat(startTime.replace(":", "."));
        const taskEnd = parseFloat(endTime.replace(":", "."));

        const withinStart = taskStart >= shiftStart;
        const withinEnd = taskEnd <= shiftEnd;

        return { withinStart, withinEnd, valid: withinStart && withinEnd };
    }

    function updateRow(idx, key, value) {
        const next = rows.slice();
        next[idx][key] = value;

        // Auto-calculate duration if start/end exist
        if (key === "start_time" || key === "end_time") {
            const row = next[idx];
            if (row.start_time && row.end_time) {
                const [h1, m1] = row.start_time.split(":").map(Number);
                const [h2, m2] = row.end_time.split(":").map(Number);
                const diff = h2 * 60 + m2 - (h1 * 60 + m1);
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
                          _uid: genUid(),
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
                          type: "task",
                      },
                  ],
        );
    }

    async function submit() {
        setSubmitting(true);
        setMessage(null);
        try {
            // Normalize rows and mark non-task rows to be skipped for LLM categorization
            const payloadRows = rows.map((r) => ({
                task_id: r.task_id || null,
                start_time: r.start_time || "",
                end_time: r.end_time || "",
                description: r.description || "",
                kpi_category_id: r.kpi_category_id || null,
                priority: r.priority || "medium",
                due_date: r.due_date || "",
                status: r.status || "pending",
                completion_percent: r.completion_percent || 0,
                assigned_by: r.assigned_by || "Self",
                type: r.type || "task",
                metadata: {
                    skip_for_categorization: r.type && r.type !== "task",
                    original_type: r.type || "task",
                },
            }));

            const payload = { date, rows: payloadRows };
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
        setMessage(null);
        try {
            // 1. Check for existing logs
            const existing = await axios.get(
                `/api/task-logs?date=${encodeURIComponent(date)}`,
            );
            if (existing.data.data && existing.data.data.length > 0) {
                const mapped = existing.data.data.map((l) => ({
                    id: l.id || null,
                    _uid: l.id ? `task:${l.id}` : genUid(),
                    task_id: l.task_id || null,
                    start_time: l.start_time || "",
                    end_time: l.end_time || "",
                    duration_hours: l.duration_hours || 0,
                    description: l.description || "",
                    kpi_category_id: l.kpi_category_id || null,
                    priority: l.task?.priority || "medium",
                    weight:
                        l.metadata?.type === "task"
                            ? l.task?.priority === "high"
                                ? 3
                                : l.task?.priority === "medium"
                                  ? 2
                                  : 1
                            : 0,
                    due_date: l.task?.due_date
                        ? l.task.due_date.slice(0, 10)
                        : "",
                    status: l.status || "pending",
                    completion_percent: l.metadata?.completion_percent || 0,
                    assigned_by: l.task?.metadata?.assigned_by || "Self",
                    type: l.metadata?.type || "task",
                }));

                // dedupe by id or composite key
                const seen = new Map();
                const deduped = [];
                for (const rr of mapped) {
                    const key = rr.id
                        ? `id:${rr.id}`
                        : `t:${rr.type}|d:${rr.description}|s:${rr.start_time}|e:${rr.end_time}`;
                    if (!seen.has(key)) {
                        seen.set(key, true);
                        deduped.push(rr);
                    }
                }

                setRows(
                    deduped.map((r) => ({ ...r, _uid: r._uid || genUid() })),
                );
            } else {
                // 2. Fetch template
                const template = await axios.get(
                    `/api/task-logs/daily-template?date=${encodeURIComponent(date)}`,
                );

                // Extract shift/breaks from new response structure
                const templateData = template.data;
                if (templateData.shift) setShift(templateData.shift);
                if (templateData.breaks) setBreaks(templateData.breaks);
                if (templateData.expected_work_hours)
                    setExpectedWorkHours(templateData.expected_work_hours);
                if (templateData.total_break_hours)
                    setTotalBreakHours(templateData.total_break_hours);

                // Normalize and de-duplicate rows from the template
                const normalized = (templateData.rows || []).map((r) => ({
                    id: r.id || null,
                    _uid: r.id ? `task:${r.id}` : genUid(),
                    task_id: r.task_id || null,
                    start_time: r.start_time || "",
                    end_time: r.end_time || "",
                    duration_hours: r.duration_hours || 0,
                    description: r.description || "",
                    kpi_category_id: r.kpi_category_id || null,
                    priority: r.priority || "medium",
                    weight:
                        r.weight ||
                        (r.priority === "high"
                            ? 3
                            : r.priority === "medium"
                              ? 2
                              : 1),
                    due_date: r.due_date ? r.due_date.slice(0, 10) : "",
                    status: r.status || "pending",
                    completion_percent: r.completion_percent || 0,
                    assigned_by:
                        r.assigned_by ||
                        r.task?.metadata?.assigned_by ||
                        "Self",
                    type: r.type || r.metadata?.type || "task",
                }));

                // simple dedupe by id when present, otherwise by a composite key
                const seen = new Map();
                const deduped = [];
                for (const rr of normalized) {
                    const key = rr.id
                        ? `id:${rr.id}`
                        : `t:${rr.type}|d:${rr.description}|s:${rr.start_time}|e:${rr.end_time}`;
                    if (!seen.has(key)) {
                        seen.set(key, true);
                        deduped.push(rr);
                    }
                }

                setRows(
                    deduped.map((r) => ({ ...r, _uid: r._uid || genUid() })),
                );
            }
        } catch (e) {
            console.error("Failed to fetch daily data", e);
            const status = e.response?.status;
            if (status === 401) {
                setMessage("Authentication required. Please sign in.");
            } else if (status === 404) {
                setMessage("No template or logs found for this date.");
            } else {
                setMessage("Failed to fetch daily data.");
            }
        } finally {
            setLoading(false);
        }
    }

    async function importFromPlan() {
        if (
            confirm(
                "This will overwrite current rows with the daily template. Continue?",
            )
        ) {
            setLoading(true);
            setMessage(null);
            try {
                const template = await axios.get(
                    `/api/task-logs/daily-template?date=${encodeURIComponent(date)}`,
                );

                // Extract shift/breaks from new response structure
                const templateData = template.data;
                if (templateData.shift) setShift(templateData.shift);
                if (templateData.breaks) setBreaks(templateData.breaks);
                if (templateData.expected_work_hours)
                    setExpectedWorkHours(templateData.expected_work_hours);
                if (templateData.total_break_hours)
                    setTotalBreakHours(templateData.total_break_hours);

                const normalized = (templateData.rows || []).map((r) => ({
                    id: r.id || null,
                    _uid: r.id ? `task:${r.id}` : genUid(),
                    task_id: r.task_id || null,
                    start_time: r.start_time || "",
                    end_time: r.end_time || "",
                    duration_hours: r.duration_hours || 0,
                    description: r.description || "",
                    kpi_category_id: r.kpi_category_id || null,
                    priority: r.priority || "medium",
                    weight:
                        r.weight ||
                        (r.priority === "high"
                            ? 3
                            : r.priority === "medium"
                              ? 2
                              : 1),
                    due_date: r.due_date ? r.due_date.slice(0, 10) : "",
                    status: r.status || "pending",
                    completion_percent: r.completion_percent || 0,
                    assigned_by:
                        r.assigned_by ||
                        r.task?.metadata?.assigned_by ||
                        "Self",
                    type: r.type || r.metadata?.type || "task",
                }));

                // dedupe
                const seen = new Map();
                const deduped = [];
                for (const rr of normalized) {
                    const key = rr.id
                        ? `id:${rr.id}`
                        : `t:${rr.type}|d:${rr.description}|s:${rr.start_time}|e:${rr.end_time}`;
                    if (!seen.has(key)) {
                        seen.set(key, true);
                        deduped.push(rr);
                    }
                }

                setRows(
                    deduped.map((r) => ({ ...r, _uid: r._uid || genUid() })),
                );
            } catch (e) {
                setMessage("Failed to refresh template");
            } finally {
                setLoading(false);
            }
        }
    }

    return (
        <>
            <div className="bg-white/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-4xl border border-neutral-200 overflow-hidden flex flex-col h-full ring-1 ring-slate-900/5">
                {/* Hidden expand trigger */}
                <button
                    data-task-log-expand
                    onClick={() => setIsExpanded(true)}
                    className="hidden"
                />

                {/* Action Bar */}
                <div className="px-6 pt-5 pb-3 flex items-center justify-between bg-white border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                                <h2 className="text-lg font-black text-neutral-900 tracking-tight">
                                    Task Log
                                </h2>
                            </div>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
                                Daily Tasks
                            </p>
                        </div>

                        <div className="h-8 w-px bg-slate-100 mx-2"></div>

                        <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-100">
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="bg-transparent border-0 text-[11px] font-black text-neutral-700 uppercase focus:ring-0 p-2 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isReadOnly && (
                            <button
                                onClick={importFromPlan}
                                className="group flex items-center gap-2 px-2 py-1.5 bg-slate-50 hover:bg-white text-slate-600 hover:text-orange-600 rounded-xl border border-neutral-200 hover:border-indigo-200 transition-all text-xs font-black uppercase tracking-widest shadow-sm hover:shadow-orange-500/5"
                            >
                                <svg
                                    className="w-3.5 h-3.5"
                                    title="Refresh"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                                Sync Template
                            </button>
                        )}
                        <div className="h-8 w-px bg-slate-100 mx-1"></div>
                        <button
                            className={`group flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all ${
                                isReadOnly
                                    ? "bg-slate-100 text-neutral-400 border border-neutral-200 cursor-not-allowed shadow-none"
                                    : "bg-linear-to-r from-orange-600 to-violet-600 text-white hover:shadow-orange-500/25 border border-orange-500/20 active:scale-[0.98]"
                            }`}
                            onClick={submit}
                            disabled={submitting || loading || isReadOnly}
                        >
                            {isReadOnly ? (
                                <>
                                    <svg
                                        className="w-3.5 h-3.5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={3}
                                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                        />
                                    </svg>
                                    Account Settled
                                </>
                            ) : submitting ? (
                                "Submitting..."
                            ) : (
                                "Submit Task Log"
                            )}
                        </button>
                        <button
                            onClick={() => setIsExpanded(true)}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-indigo-100 transition-all ml-2"
                            title="Expand"
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
                                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Metrics Ribbon */}
                <div className="px-6 py-3 bg-neutral-50/50 border-b border-slate-100 flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.15em]">
                            Time Logged
                        </span>
                        <span className="text-sm font-black text-neutral-900">
                            {rows
                                .reduce(
                                    (acc, r) =>
                                        acc +
                                        (parseFloat(r.duration_hours) || 0),
                                    0,
                                )
                                .toFixed(1)}{" "}
                            <span className="text-neutral-400 font-bold">
                                URS
                            </span>
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-orange-400 uppercase tracking-[0.15em]">
                            Impact Factor
                        </span>
                        <span className="text-sm font-black text-orange-600">
                            {rows
                                .reduce(
                                    (acc, r) =>
                                        acc +
                                        (parseFloat(r.duration_hours) || 0) *
                                            (r.weight || 1),
                                    0,
                                )
                                .toFixed(1)}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.15em]">
                            Yield Score
                        </span>
                        <span className="text-sm font-black text-emerald-600">
                            {(() => {
                                const totalWeightedComp = rows.reduce(
                                    (acc, r) =>
                                        acc +
                                        (parseFloat(r.completion_percent) ||
                                            0) *
                                            (parseFloat(r.duration_hours) ||
                                                0) *
                                            (r.weight || 1),
                                    0,
                                );
                                const totalFactor = rows.reduce(
                                    (acc, r) =>
                                        acc +
                                        (parseFloat(r.duration_hours) || 0) *
                                            (r.weight || 1),
                                    0,
                                );
                                return totalFactor > 0
                                    ? (totalWeightedComp / totalFactor).toFixed(
                                          1,
                                      )
                                    : "100.0";
                            })()}
                            %
                        </span>
                    </div>
                </div>

                {/* Shift & Break Info */}
                {shift && (
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-xs font-bold text-slate-600">
                                Shift Window:
                            </span>
                            <span className="text-xs font-black text-slate-900">
                                {shift.start} - {shift.end}
                            </span>
                            {shift.is_custom && (
                                <span className="text-[8px] px-2 py-1 bg-blue-100 text-blue-700 rounded font-black">
                                    CUSTOM
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-xs font-bold text-slate-600">
                                Total Break:
                            </span>
                            <span className="text-xs font-black text-slate-900">
                                {totalBreakHours}h
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            <span className="text-xs font-bold text-slate-600">
                                Expected Work:
                            </span>
                            <span className="text-xs font-black text-slate-900">
                                {expectedWorkHours}h
                            </span>
                        </div>
                        {breaks.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-600">
                                    Break Times:
                                </span>
                                <div className="flex gap-2">
                                    {breaks.map((b, i) => (
                                        <span
                                            key={i}
                                            className="text-xs px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded font-bold"
                                        >
                                            {b.start}-{b.end} (
                                            {b.label || "Break"})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Grid Container */}
                <div className="flex-1 overflow-auto relative scrollbar-hide">
                    {loading && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                            <div className="w-10 h-10 border-4 border-orange-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    )}

                    <table className="w-full border-separate border-spacing-0">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                                <th className="px-4 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-left border-r border-white/50">
                                    Details & Objectives
                                </th>
                                <th className="px-4 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center border-r border-white/50 w-24">
                                    Start
                                </th>
                                <th className="px-4 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center border-r border-white/50 w-24">
                                    Finish
                                </th>
                                <th className="px-4 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center border-r border-white/50 w-20">
                                    Comp %
                                </th>
                                <th className="px-4 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center border-r border-white/50 w-32">
                                    Priority
                                </th>
                                <th className="px-4 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center border-r border-white/50 w-32">
                                    Target Date
                                </th>
                                <th className="px-4 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center border-r border-white/50 w-32">
                                    State
                                </th>
                                <th className="px-3 py-2 w-12 bg-neutral-50/50"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows
                                .map((r, idx) => ({ ...r, originalIdx: idx }))
                                .sort((a, b) => {
                                    // Sort by start_time, empty times go to bottom
                                    if (!a.start_time && !b.start_time)
                                        return 0;
                                    if (!a.start_time) return 1;
                                    if (!b.start_time) return -1;
                                    return a.start_time.localeCompare(
                                        b.start_time,
                                    );
                                })
                                .map((r) => {
                                    // Default rendering for task rows
                                    return (
                                        <tr
                                            key={r._uid}
                                            className={`group transition-all hover:bg-slate-50/80 ${
                                                r.type === "break"
                                                    ? "bg-emerald-50/30"
                                                    : r.type === "shift_end"
                                                      ? "bg-indigo-50/30"
                                                      : "bg-white"
                                            }`}
                                        >
                                            <td className="px-4 py-3 border-r border-slate-50">
                                                <div className="flex items-center gap-3">
                                                    {r.type === "break" && (
                                                        <div className="w-1.5 h-6 bg-emerald-400 rounded-full"></div>
                                                    )}
                                                    {r.type === "shift_end" && (
                                                        <div className="w-1.5 h-6 bg-orange-400 rounded-full"></div>
                                                    )}
                                                    <textarea
                                                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-slate-800 placeholder:text-slate-300 disabled:opacity-50 resize-none overflow-hidden"
                                                        value={
                                                            r.description || ""
                                                        }
                                                        onChange={(e) => {
                                                            updateRow(
                                                                r.originalIdx,
                                                                "description",
                                                                e.target.value,
                                                            );
                                                            e.target.style.height =
                                                                "auto";
                                                            e.target.style.height =
                                                                e.target
                                                                    .scrollHeight +
                                                                "px";
                                                        }}
                                                        onInput={(e) => {
                                                            e.target.style.height =
                                                                "auto";
                                                            e.target.style.height =
                                                                e.target
                                                                    .scrollHeight +
                                                                "px";
                                                        }}
                                                        placeholder="Specify work objective..."
                                                        disabled={isReadOnly}
                                                        rows={1}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 border-r border-slate-50">
                                                <div className="space-y-1">
                                                    <input
                                                        type="time"
                                                        className={`w-full bg-neutral-50/50 hover:bg-white border rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 transition-all p-2 disabled:opacity-50 ${
                                                            r.type === "task" &&
                                                            r.start_time &&
                                                            r.end_time &&
                                                            !isWithinShift(
                                                                r.start_time,
                                                                r.end_time,
                                                            ).withinStart
                                                                ? "border-red-300 bg-red-50"
                                                                : "border-neutral-200"
                                                        }`}
                                                        value={
                                                            r.start_time || ""
                                                        }
                                                        onChange={(e) =>
                                                            updateRow(
                                                                r.originalIdx,
                                                                "start_time",
                                                                e.target.value,
                                                            )
                                                        }
                                                        disabled={isReadOnly}
                                                    />
                                                    {r.type === "task" &&
                                                        r.start_time &&
                                                        r.end_time &&
                                                        !isWithinShift(
                                                            r.start_time,
                                                            r.end_time,
                                                        ).withinStart && (
                                                            <p className="text-[9px] text-red-600 font-bold">
                                                                Before shift:{" "}
                                                                {shift?.start}
                                                            </p>
                                                        )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 border-r border-slate-50">
                                                <div className="space-y-1">
                                                    <input
                                                        type="time"
                                                        className={`w-full bg-neutral-50/50 hover:bg-white border rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 transition-all p-2 disabled:opacity-50 ${
                                                            r.type === "task" &&
                                                            r.start_time &&
                                                            r.end_time &&
                                                            (!isWithinShift(
                                                                r.start_time,
                                                                r.end_time,
                                                            ).withinEnd ||
                                                                checkBreakOverlap(
                                                                    r.start_time,
                                                                    r.end_time,
                                                                ))
                                                                ? "border-red-300 bg-red-50"
                                                                : "border-neutral-200"
                                                        }`}
                                                        value={r.end_time || ""}
                                                        onChange={(e) =>
                                                            updateRow(
                                                                r.originalIdx,
                                                                "end_time",
                                                                e.target.value,
                                                            )
                                                        }
                                                        disabled={isReadOnly}
                                                    />
                                                    {r.type === "task" &&
                                                        r.start_time &&
                                                        r.end_time &&
                                                        !isWithinShift(
                                                            r.start_time,
                                                            r.end_time,
                                                        ).withinEnd && (
                                                            <p className="text-[9px] text-red-600 font-bold">
                                                                After shift:{" "}
                                                                {shift?.end}
                                                            </p>
                                                        )}
                                                    {r.type === "task" &&
                                                        checkBreakOverlap(
                                                            r.start_time,
                                                            r.end_time,
                                                        ) && (
                                                            <p className="text-[9px] text-yellow-600 font-bold">
                                                                ⚠️ Overlaps
                                                                break
                                                            </p>
                                                        )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 border-r border-slate-50">
                                                <div className="flex items-center justify-center">
                                                    <input
                                                        type="number"
                                                        max="100"
                                                        className={`w-14 bg-neutral-50/50 hover:bg-white border border-neutral-200 rounded-lg text-[10px] font-black text-center focus:ring-2 focus:ring-orange-500 transition-all p-2 ${r.type !== "task" ? "invisible" : ""}`}
                                                        value={
                                                            r.completion_percent ||
                                                            0
                                                        }
                                                        onChange={(e) =>
                                                            updateRow(
                                                                r.originalIdx,
                                                                "completion_percent",
                                                                e.target.value,
                                                            )
                                                        }
                                                        disabled={
                                                            r.type !== "task" ||
                                                            isReadOnly
                                                        }
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 border-r border-slate-50">
                                                <select
                                                    className={`w-full bg-neutral-50/50 hover:bg-white border border-neutral-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-orange-500 transition-all p-2 ${r.type !== "task" ? "invisible" : ""}`}
                                                    value={
                                                        r.priority || "medium"
                                                    }
                                                    onChange={(e) => {
                                                        const p =
                                                            e.target.value;
                                                        const w =
                                                            p === "high"
                                                                ? 3
                                                                : p === "medium"
                                                                  ? 2
                                                                  : 1;
                                                        updateRow(
                                                            r.originalIdx,
                                                            "priority",
                                                            p,
                                                        );
                                                        updateRow(
                                                            r.originalIdx,
                                                            "weight",
                                                            w,
                                                        );
                                                    }}
                                                    disabled={
                                                        r.type !== "task" ||
                                                        isReadOnly
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
                                            <td className="px-4 py-3 border-r border-slate-50">
                                                <input
                                                    type="date"
                                                    className={`w-full bg-neutral-50/50 hover:bg-white border border-neutral-200 rounded-lg text-[10px] font-black text-slate-600 focus:ring-2 focus:ring-orange-500 transition-all p-2 ${r.type !== "task" ? "invisible" : ""}`}
                                                    value={r.due_date || ""}
                                                    onChange={(e) =>
                                                        updateRow(
                                                            r.originalIdx,
                                                            "due_date",
                                                            e.target.value,
                                                        )
                                                    }
                                                    disabled={
                                                        r.type !== "task" ||
                                                        isReadOnly
                                                    }
                                                />
                                            </td>
                                            <td className="px-4 py-3 border-r border-slate-50">
                                                <select
                                                    className={`w-full bg-neutral-50/50 hover:bg-white border border-neutral-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-orange-500 transition-all p-2 ${r.type !== "task" ? "invisible" : ""}`}
                                                    value={
                                                        r.status || "pending"
                                                    }
                                                    onChange={(e) =>
                                                        updateRow(
                                                            r.originalIdx,
                                                            "status",
                                                            e.target.value,
                                                        )
                                                    }
                                                    disabled={
                                                        r.type !== "task" ||
                                                        isReadOnly
                                                    }
                                                >
                                                    <option value="not_started">
                                                        Not Started
                                                    </option>
                                                    <option value="inprogress">
                                                        In Progress
                                                    </option>
                                                    <option value="pending">
                                                        Pending
                                                    </option>
                                                    <option value="complete">
                                                        Complete
                                                    </option>
                                                </select>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                {!isReadOnly && (
                                                    <button
                                                        className="text-slate-300 hover:text-rose-500 transition-all scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-50"
                                                        onClick={() =>
                                                            removeRow(
                                                                r.originalIdx,
                                                            )
                                                        }
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-4 w-4"
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
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>

                    {/* Add Row Button (inline) */}
                    {!isReadOnly && (
                        <div className="p-4 border-t border-slate-50 flex justify-center sticky bottom-0 bg-white/80 backdrop-blur-md">
                            <button
                                className="group flex items-center gap-2 px-8 py-3 bg-neutral-900 border border-slate-900 hover:bg-orange-600 hover:border-indigo-600 text-white rounded-2xl transition-all shadow-xl hover:shadow-orange-500/20 active:scale-95"
                                onClick={addRow}
                            >
                                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20">
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
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest">
                                    Append Objective
                                </span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Status Channel */}
                {message && (
                    <div
                        className={`px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${
                            message.includes("success")
                                ? "bg-emerald-500 text-white"
                                : "bg-rose-500 text-white"
                        }`}
                    >
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse">
                            {message}
                        </div>
                    </div>
                )}
            </div>

            {/* Expand Modal */}
            {isExpanded &&
                createPortal(
                    <div
                        className="fixed inset-0 bg-neutral-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-6"
                        onClick={() => setIsExpanded(false)}
                    >
                        <div
                            className="bg-white rounded-4xl shadow-2xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                                            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                                                Task Log
                                            </h2>
                                        </div>
                                        <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">
                                            Expanded View
                                        </p>
                                    </div>
                                    <div className="h-8 w-px bg-slate-100 mx-2"></div>
                                    <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-100">
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) =>
                                                setDate(e.target.value)
                                            }
                                            className="bg-transparent border-0 text-[11px] font-black text-neutral-700 uppercase focus:ring-0 p-2 cursor-pointer"
                                        />
                                    </div>
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

                            {/* Metrics Ribbon */}
                            <div className="px-6 py-3 bg-neutral-50/50 border-b border-slate-100 flex items-center gap-8">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.15em]">
                                        Time Logged
                                    </span>
                                    <span className="text-sm font-black text-neutral-900">
                                        {rows
                                            .reduce(
                                                (acc, r) =>
                                                    acc +
                                                    (parseFloat(
                                                        r.duration_hours,
                                                    ) || 0),
                                                0,
                                            )
                                            .toFixed(1)}{" "}
                                        <span className="text-neutral-400 font-bold">
                                            URS
                                        </span>
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-orange-400 uppercase tracking-[0.15em]">
                                        Impact Factor
                                    </span>
                                    <span className="text-sm font-black text-orange-600">
                                        {rows
                                            .reduce(
                                                (acc, r) =>
                                                    acc +
                                                    (parseFloat(
                                                        r.duration_hours,
                                                    ) || 0) *
                                                        (r.weight || 1),
                                                0,
                                            )
                                            .toFixed(1)}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.15em]">
                                        Yield Score
                                    </span>
                                    <span className="text-sm font-black text-emerald-600">
                                        {(() => {
                                            const totalWeightedComp =
                                                rows.reduce(
                                                    (acc, r) =>
                                                        acc +
                                                        (parseFloat(
                                                            r.completion_percent,
                                                        ) || 0) *
                                                            (parseFloat(
                                                                r.duration_hours,
                                                            ) || 0) *
                                                            (r.weight || 1),
                                                    0,
                                                );
                                            const totalFactor = rows.reduce(
                                                (acc, r) =>
                                                    acc +
                                                    (parseFloat(
                                                        r.duration_hours,
                                                    ) || 0) *
                                                        (r.weight || 1),
                                                0,
                                            );
                                            return totalFactor > 0
                                                ? (
                                                      totalWeightedComp /
                                                      totalFactor
                                                  ).toFixed(1)
                                                : "100.0";
                                        })()}
                                        %
                                    </span>
                                </div>
                            </div>

                            {/* Modal Content - Scrollable Table */}
                            <div className="flex-1 overflow-auto relative">
                                {loading && (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                                        <div className="w-10 h-10 border-4 border-orange-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                    </div>
                                )}

                                <table className="w-full border-separate border-spacing-0">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                                            <th className="px-4 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-left border-r border-white/50">
                                                Details & Objectives
                                            </th>
                                            <th className="px-4 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center border-r border-white/50 w-24">
                                                Start
                                            </th>
                                            <th className="px-4 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center border-r border-white/50 w-24">
                                                Finish
                                            </th>
                                            <th className="px-4 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center border-r border-white/50 w-20">
                                                Comp %
                                            </th>
                                            <th className="px-4 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center border-r border-white/50 w-32">
                                                Priority
                                            </th>
                                            <th className="px-4 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center border-r border-white/50 w-32">
                                                Target Date
                                            </th>
                                            <th className="px-4 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center border-r border-white/50 w-32">
                                                State
                                            </th>
                                            <th className="px-3 py-2 w-12 bg-neutral-50/50"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {rows
                                            .map((r, idx) => ({
                                                ...r,
                                                originalIdx: idx,
                                            }))
                                            .sort((a, b) => {
                                                if (
                                                    !a.start_time &&
                                                    !b.start_time
                                                )
                                                    return 0;
                                                if (!a.start_time) return 1;
                                                if (!b.start_time) return -1;
                                                return a.start_time.localeCompare(
                                                    b.start_time,
                                                );
                                            })
                                            .map((r) => (
                                                <tr
                                                    key={r._uid}
                                                    className={`group transition-all hover:bg-slate-50/80 ${
                                                        r.type === "break"
                                                            ? "bg-emerald-50/30"
                                                            : r.type ===
                                                                "shift_end"
                                                              ? "bg-indigo-50/30"
                                                              : "bg-white"
                                                    }`}
                                                >
                                                    <td className="px-4 py-3 border-r border-slate-50">
                                                        <div className="flex items-center gap-3">
                                                            {r.type ===
                                                                "break" && (
                                                                <div className="w-1.5 h-6 bg-emerald-400 rounded-full"></div>
                                                            )}
                                                            {r.type ===
                                                                "shift_end" && (
                                                                <div className="w-1.5 h-6 bg-orange-400 rounded-full"></div>
                                                            )}
                                                            <textarea
                                                                className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-slate-800 placeholder:text-slate-300 disabled:opacity-50 resize-none overflow-hidden"
                                                                value={
                                                                    r.description ||
                                                                    ""
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    updateRow(
                                                                        r.originalIdx,
                                                                        "description",
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
                                                                placeholder="Specify work objective..."
                                                                disabled={
                                                                    isReadOnly
                                                                }
                                                                rows={1}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-slate-50">
                                                        <input
                                                            type="time"
                                                            className="w-full bg-neutral-50/50 hover:bg-white border border-neutral-200 rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 transition-all p-2 disabled:opacity-50"
                                                            value={
                                                                r.start_time ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                updateRow(
                                                                    r.originalIdx,
                                                                    "start_time",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            disabled={
                                                                isReadOnly
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-slate-50">
                                                        <input
                                                            type="time"
                                                            className="w-full bg-neutral-50/50 hover:bg-white border border-neutral-200 rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 transition-all p-2 disabled:opacity-50"
                                                            value={
                                                                r.end_time || ""
                                                            }
                                                            onChange={(e) =>
                                                                updateRow(
                                                                    r.originalIdx,
                                                                    "end_time",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            disabled={
                                                                isReadOnly
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-slate-50">
                                                        <div className="flex items-center justify-center">
                                                            <input
                                                                type="number"
                                                                max="100"
                                                                className={`w-14 bg-neutral-50/50 hover:bg-white border border-neutral-200 rounded-lg text-[10px] font-black text-center focus:ring-2 focus:ring-orange-500 transition-all p-2 ${r.type !== "task" ? "invisible" : ""}`}
                                                                value={
                                                                    r.completion_percent ||
                                                                    0
                                                                }
                                                                onChange={(e) =>
                                                                    updateRow(
                                                                        r.originalIdx,
                                                                        "completion_percent",
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                disabled={
                                                                    r.type !==
                                                                        "task" ||
                                                                    isReadOnly
                                                                }
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-slate-50">
                                                        <select
                                                            className={`w-full bg-neutral-50/50 hover:bg-white border border-neutral-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-orange-500 transition-all p-2 ${r.type !== "task" ? "invisible" : ""}`}
                                                            value={
                                                                r.priority ||
                                                                "medium"
                                                            }
                                                            onChange={(e) => {
                                                                const p =
                                                                    e.target
                                                                        .value;
                                                                const w =
                                                                    p === "high"
                                                                        ? 3
                                                                        : p ===
                                                                            "medium"
                                                                          ? 2
                                                                          : 1;
                                                                updateRow(
                                                                    r.originalIdx,
                                                                    "priority",
                                                                    p,
                                                                );
                                                                updateRow(
                                                                    r.originalIdx,
                                                                    "weight",
                                                                    w,
                                                                );
                                                            }}
                                                            disabled={
                                                                r.type !==
                                                                    "task" ||
                                                                isReadOnly
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
                                                    <td className="px-4 py-3 border-r border-slate-50">
                                                        <input
                                                            type="date"
                                                            className={`w-full bg-neutral-50/50 hover:bg-white border border-neutral-200 rounded-lg text-[10px] font-black text-slate-600 focus:ring-2 focus:ring-orange-500 transition-all p-2 ${r.type !== "task" ? "invisible" : ""}`}
                                                            value={
                                                                r.due_date || ""
                                                            }
                                                            onChange={(e) =>
                                                                updateRow(
                                                                    r.originalIdx,
                                                                    "due_date",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            disabled={
                                                                r.type !==
                                                                    "task" ||
                                                                isReadOnly
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-slate-50">
                                                        <select
                                                            className={`w-full bg-neutral-50/50 hover:bg-white border border-neutral-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-orange-500 transition-all p-2 ${r.type !== "task" ? "invisible" : ""}`}
                                                            value={
                                                                r.status ||
                                                                "pending"
                                                            }
                                                            onChange={(e) =>
                                                                updateRow(
                                                                    r.originalIdx,
                                                                    "status",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            disabled={
                                                                r.type !==
                                                                    "task" ||
                                                                isReadOnly
                                                            }
                                                        >
                                                            <option value="not_started">
                                                                Not Started
                                                            </option>
                                                            <option value="inprogress">
                                                                In Progress
                                                            </option>
                                                            <option value="pending">
                                                                Pending
                                                            </option>
                                                            <option value="complete">
                                                                Complete
                                                            </option>
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        {!isReadOnly && (
                                                            <button
                                                                className="text-slate-300 hover:text-rose-500 transition-all scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-50"
                                                                onClick={() =>
                                                                    removeRow(
                                                                        r.originalIdx,
                                                                    )
                                                                }
                                                            >
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    className="h-4 w-4"
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
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>

                                {/* Add Row Button in Modal */}
                                {!isReadOnly && (
                                    <div className="p-4 border-t border-slate-50 flex justify-center sticky bottom-0 bg-white/80 backdrop-blur-md">
                                        <button
                                            className="group flex items-center gap-2 px-8 py-3 bg-neutral-900 border border-slate-900 hover:bg-orange-600 hover:border-indigo-600 text-white rounded-2xl transition-all shadow-xl hover:shadow-orange-500/20 active:scale-95"
                                            onClick={addRow}
                                        >
                                            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20">
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
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest">
                                                Append Objective
                                            </span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer with Actions */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {!isReadOnly && (
                                        <button
                                            onClick={importFromPlan}
                                            className="group flex items-center gap-2 px-2 py-1.5 bg-slate-50 hover:bg-white text-slate-600 hover:text-orange-600 rounded-xl border border-neutral-200 hover:border-indigo-200 transition-all text-xs font-black uppercase tracking-widest shadow-sm hover:shadow-orange-500/5"
                                        >
                                            <svg
                                                className="w-3.5 h-3.5"
                                                title="Refresh"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={3}
                                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                />
                                            </svg>
                                            Sync Template
                                        </button>
                                    )}
                                </div>
                                <button
                                    className={`group flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all ${
                                        isReadOnly
                                            ? "bg-slate-100 text-neutral-400 border border-neutral-200 cursor-not-allowed shadow-none"
                                            : "bg-linear-to-r from-orange-600 to-violet-600 text-white hover:shadow-orange-500/25 border border-orange-500/20 active:scale-[0.98]"
                                    }`}
                                    onClick={submit}
                                    disabled={
                                        submitting || loading || isReadOnly
                                    }
                                >
                                    {isReadOnly ? (
                                        <>
                                            <svg
                                                className="w-3.5 h-3.5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={3}
                                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                                />
                                            </svg>
                                            Account Settled
                                        </>
                                    ) : submitting ? (
                                        "Submitting..."
                                    ) : (
                                        "Submit Task Log"
                                    )}
                                </button>
                            </div>

                            {/* Status Message in Modal */}
                            {message && (
                                <div
                                    className={`px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${
                                        message.includes("success")
                                            ? "bg-emerald-500 text-white"
                                            : "bg-rose-500 text-white"
                                    }`}
                                >
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                    {message}
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}
