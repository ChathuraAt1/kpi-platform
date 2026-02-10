import React, { useState, useEffect, useRef } from "react";
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
            completion_percent: 0,
            assigned_by: "Self",
            actual_break_start: "",
            actual_break_end: "",
            blockers_notes: "",
            type: "task",
        },
    ]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Selection and bulk operations state
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [contextMenu, setContextMenu] = useState(null);
    const [clipboard, setClipboard] = useState(null);

    // Shift and break information
    const [shift, setShift] = useState(null);
    const [breaks, setBreaks] = useState([]);
    const [expectedWorkHours, setExpectedWorkHours] = useState(0);
    const [totalBreakHours, setTotalBreakHours] = useState(0);

    // Refs for keyboard navigation
    const lastRowDescRef = useRef(null);
    const tableRef = useRef(null);

    function addRow() {
        setRows((prev) => [
            ...prev,
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
                actual_break_start: "",
                actual_break_end: "",
                blockers_notes: "",
                type: "task",
            },
        ]);
        setSelectedRows(new Set());
        setTimeout(() => {
            if (lastRowDescRef.current) {
                lastRowDescRef.current.focus();
            }
        }, 50);
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
        if (!shift || !startTime || !endTime) return { withinStart: true, withinEnd: true, valid: true };

        const shiftStart = parseFloat(shift.start.replace(":", "."));
        const shiftEnd = parseFloat(shift.end.replace(":", "."));
        const taskStart = parseFloat(startTime.replace(":", "."));
        const taskEnd = parseFloat(endTime.replace(":", "."));

        const withinStart = taskStart >= shiftStart;
        const withinEnd = taskEnd <= shiftEnd;

        return { withinStart, withinEnd, valid: withinStart && withinEnd };
    }

    function updateRow(idx, key, value) {
        setRows((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], [key]: value };

            if (key === "start_time" || key === "end_time") {
                const row = next[idx];
                if (row.start_time && row.end_time) {
                    const [h1, m1] = row.start_time.split(":").map(Number);
                    const [h2, m2] = row.end_time.split(":").map(Number);
                    const diff = h2 * 60 + m2 - (h1 * 60 + m1);
                    if (diff > 0) row.duration_hours = (diff / 60).toFixed(2);
                }
            }
            if (key === "priority") {
                const p = value;
                const w = p === "high" ? 3 : p === "medium" ? 2 : 1;
                next[idx].weight = w;
            }

            return next;
        });
    }

    function removeRow(idx) {
        setRows((prev) => {
            const next = [...prev];
            next.splice(idx, 1);
            setSelectedRows(new Set());
            return next.length
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
                        completion_percent: 0,
                        assigned_by: "Self",
                        actual_break_start: "",
                        actual_break_end: "",
                        blockers_notes: "",
                        type: "task",
                    },
                ];
        });
    }

    /**
     * Handle row selection with Ctrl/Cmd and Shift modifiers
     */
    function toggleRowSelection(idx, event) {
        if (event.ctrlKey || event.metaKey) {
            setSelectedRows((prev) => {
                const next = new Set(prev);
                if (next.has(idx)) {
                    next.delete(idx);
                } else {
                    next.add(idx);
                }
                return next;
            });
        } else if (event.shiftKey && selectedRows.size > 0) {
            const minIdx = Math.min(...Array.from(selectedRows));
            const maxIdx = Math.max(...Array.from(selectedRows));
            const rangeStart = Math.min(minIdx, idx);
            const rangeEnd = Math.max(maxIdx, idx);
            const newSelection = new Set();
            for (let i = rangeStart; i <= rangeEnd; i++) {
                newSelection.add(i);
            }
            setSelectedRows(newSelection);
        } else {
            setSelectedRows(new Set([idx]));
        }
    }

    /**
     * Copy selected rows to clipboard
     */
    function copyRows() {
        if (selectedRows.size === 0) return;
        const rowsToCopy = Array.from(selectedRows).map(idx => {
            const row = rows[idx];
            return {
                description: row.description,
                start_time: row.start_time,
                end_time: row.end_time,
                priority: row.priority,
                status: row.status,
                completion_percent: row.completion_percent,
                assigned_by: row.assigned_by,
                blockers_notes: row.blockers_notes,
            };
        });
        setClipboard(rowsToCopy);
        setMessage("Copied to clipboard");
        setTimeout(() => setMessage(null), 2000);
    }

    /**
     * Paste rows from clipboard
     */
    function pasteRows() {
        if (!clipboard || clipboard.length === 0) return;
        setRows((prev) => [
            ...prev,
            ...clipboard.map((row) => ({
                _uid: genUid(),
                task_id: null,
                ...row,
                type: "task",
            })),
        ]);
        setMessage(`Pasted ${clipboard.length} row(s)`);
        setTimeout(() => setMessage(null), 2000);
    }

    /**
     * Bulk delete selected rows
     */
    function bulkDelete() {
        if (selectedRows.size === 0) return;
        setRows((prev) => {
            const next = prev.filter((_, idx) => !selectedRows.has(idx));
            return next.length > 0 ? next : [{
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
                completion_percent: 0,
                assigned_by: "Self",
                actual_break_start: "",
                actual_break_end: "",
                blockers_notes: "",
                type: "task",
            }];
        });
        setSelectedRows(new Set());
        setContextMenu(null);
    }

    /**
     * Bulk update priority for selected rows
     */
    function bulkUpdatePriority(priority) {
        if (selectedRows.size === 0) return;
        setRows((prev) =>
            prev.map((row, idx) =>
                selectedRows.has(idx) ? { ...row, priority, weight: priority === "high" ? 3 : priority === "medium" ? 2 : 1 } : row
            )
        );
        setContextMenu(null);
    }

    /**
     * Bulk update status for selected rows
     */
    function bulkUpdateStatus(status) {
        if (selectedRows.size === 0) return;
        setRows((prev) =>
            prev.map((row, idx) =>
                selectedRows.has(idx) ? { ...row, status } : row
            )
        );
        setContextMenu(null);
    }

    /**
     * Select all rows
     */
    function selectAll() {
        const allIndices = new Set(rows.map((_, idx) => idx));
        setSelectedRows(allIndices);
    }

    /**
     * Deselect all rows
     */
    function deselectAll() {
        setSelectedRows(new Set());
    }

    /**
     * Handle keyboard shortcuts
     */
    function handleKeyDown(event) {
        if (isReadOnly) return;

        // Ctrl/Cmd + A to select all
        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
            event.preventDefault();
            selectAll();
        }
        // Ctrl/Cmd + C to copy
        else if ((event.ctrlKey || event.metaKey) && event.key === 'c' && selectedRows.size > 0) {
            event.preventDefault();
            copyRows();
        }
        // Ctrl/Cmd + V to paste
        else if ((event.ctrlKey || event.metaKey) && event.key === 'v' && clipboard) {
            event.preventDefault();
            pasteRows();
        }
        // Delete key to bulk delete
        else if (event.key === 'Delete' && selectedRows.size > 0) {
            event.preventDefault();
            bulkDelete();
        }
    }

    async function submit() {
        setSubmitting(true);
        setMessage(null);
        try {
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
                actual_break_start: r.actual_break_start || "",
                actual_break_end: r.actual_break_end || "",
                blockers_notes: r.blockers_notes || "",
                metadata: {
                    skip_for_categorization: r.type && r.type !== "task",
                    original_type: r.type || "task",
                },
            }));

            const payload = { date, rows: payloadRows };
            await axios.post("/api/task-logs", payload);
            setMessage("Submitted successfully");
            setTimeout(() => setMessage(null), 3000);
        } catch (e) {
            console.error(e);
            setMessage("Submit failed");
        } finally {
            setSubmitting(false);
        }
    }

    useEffect(() => {
        fetchDailyData();
    }, [date]);

    useEffect(() => {
        if (tableRef.current) {
            tableRef.current.addEventListener('keydown', handleKeyDown);
            return () => tableRef.current?.removeEventListener('keydown', handleKeyDown);
        }
    }, [rows, selectedRows, clipboard, isReadOnly]);

    async function fetchDailyData() {
        setLoading(true);
        setMessage(null);
        try {
            const existing = await axios.get(
                `/api/task-logs?date=${encodeURIComponent(date)}`,
            );

            function processRows(data) {
                return data.map((l) => ({
                    id: l.id || null,
                    _uid: l.id ? `task:${l.id}` : genUid(),
                    task_id: l.task_id || null,
                    start_time: l.start_time || "",
                    end_time: l.end_time || "",
                    duration_hours: l.duration_hours || 0,
                    description: l.description || "",
                    kpi_category_id: l.kpi_category_id || null,
                    priority: l.task?.priority || l.priority || "medium",
                    weight: l.weight || (
                        l.metadata?.type === "task" || l.type === 'task'
                            ? (l.task?.priority === "high" || l.priority === 'high')
                                ? 3
                                : (l.task?.priority === "medium" || l.priority === 'medium')
                                    ? 2
                                    : 1
                            : 0
                    ),
                    due_date: l.task?.due_date
                        ? l.task.due_date.slice(0, 10)
                        : (l.due_date ? l.due_date.slice(0, 10) : ""),
                    status: l.status || "pending",
                    completion_percent: l.metadata?.completion_percent || l.completion_percent || 0,
                    assigned_by: l.task?.metadata?.assigned_by || l.assigned_by || "Self",
                    actual_break_start: l.actual_break_start || "",
                    actual_break_end: l.actual_break_end || "",
                    blockers_notes: l.blockers_notes || "",
                    type: l.metadata?.type || l.type || "task",
                }));
            }

            if (existing.data.data && existing.data.data.length > 0) {
                const mapped = processRows(existing.data.data);
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
                setRows(deduped.map((r) => ({ ...r, _uid: r._uid || genUid() })));
            } else {
                const template = await axios.get(
                    `/api/task-logs/daily-template?date=${encodeURIComponent(date)}`,
                );

                const templateData = template.data;
                if (templateData.shift) setShift(templateData.shift);
                if (templateData.breaks) setBreaks(templateData.breaks);
                if (templateData.expected_work_hours)
                    setExpectedWorkHours(templateData.expected_work_hours);
                if (templateData.total_break_hours)
                    setTotalBreakHours(templateData.total_break_hours);

                const normalized = processRows(templateData.rows || []);

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
                setRows(deduped.map((r) => ({ ...r, _uid: r._uid || genUid() })));
            }
        } catch (e) {
            console.error("Failed to fetch daily data", e);
            const status = e.response?.status;
            if (status === 401) {
                setMessage("Authentication required. Please sign in.");
            } else if (status === 404) {
                setMessage("No template or logs found for this date.");
            } else {
                setMessage("Failed to load data from server");
            }
        } finally {
            setLoading(false);
        }
    }

    const totalDuration = rows
        .filter((r) => r.type === "task")
        .reduce((sum, r) => sum + (parseFloat(r.duration_hours) || 0), 0);
    const yieldScore = expectedWorkHours > 0 && totalDuration > 0
        ? Math.round((totalDuration / (expectedWorkHours - totalBreakHours)) * 100)
        : 0;

    function importFromPlan() {
        // Placeholder for importing from daily plan
        setMessage("Sync feature coming soon");
        setTimeout(() => setMessage(null), 2000);
    }

    return (
        <div
            ref={tableRef}
            className="flex flex-col h-full bg-white rounded-2xl shadow-lg overflow-hidden relative"
            tabIndex="0"
            onKeyDown={handleKeyDown}
        >
            {/* Header Section */}
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                            Daily Task Log
                        </h3>
                        <p className="text-xs text-gray-500 font-semibold">
                            {new Date(date).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                    </div>
                    <div className="group">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-gray-50 hover:bg-white border-0 text-sm font-bold text-gray-700 uppercase focus:ring-2 focus:ring-orange-500/20 rounded-xl px-3 py-2 cursor-pointer transition-all shadow-sm group-hover:shadow-md"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    {selectedRows.size > 0 && !isReadOnly && (
                        <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                            <span className="text-xs font-bold text-blue-600">{selectedRows.size} selected</span>
                            <button
                                onClick={deselectAll}
                                className="ml-2 px-2 py-0.5 text-xs font-bold text-blue-600 hover:bg-blue-100 rounded"
                                title="Deselect All"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {!isReadOnly && (
                        <>
                            <button
                                onClick={importFromPlan}
                                className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 text-gray-600 hover:text-orange-600 rounded-xl border border-gray-200 hover:border-orange-200 transition-all text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-orange-500/10 active:scale-95"
                                title="Reset to Daily Plan"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="hidden sm:inline">Sync Plan</span>
                            </button>
                        </>
                    )}

                    <button
                        className={`group flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] ${isReadOnly
                            ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-none"
                            : "bg-linear-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-orange-500/25 hover:shadow-orange-500/40"
                            }`}
                        onClick={submit}
                        disabled={submitting || loading || isReadOnly}
                    >
                        {isReadOnly ? (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Locked
                            </>
                        ) : submitting ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </span>
                        ) : (
                            "Save Changes"
                        )}
                    </button>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="px-6 py-3 bg-gray-50/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between sm:justify-start sm:gap-12 overflow-x-auto scrollbar-hide z-10 sticky top-[73px]">
                <div className="flex flex-col min-w-max">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        Total Hours
                    </span>
                    <span className="text-sm font-black text-gray-900 tabular-nums">
                        {totalDuration.toFixed(1)} <span className="text-gray-400 text-[10px] font-bold">HRS</span>
                    </span>
                </div>
                <div className="flex flex-col min-w-max">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                        Exp. Work
                    </span>
                    <span className="text-sm font-black text-indigo-600 tabular-nums">
                        {expectedWorkHours || 0} <span className="text-indigo-300 text-[10px] font-bold">HRS</span>
                    </span>
                </div>
                <div className="w-px h-6 bg-gray-200 mx-2 hidden sm:block"></div>
                <div className="flex flex-col min-w-max">
                    <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">
                        Productivity
                    </span>
                    <span className="text-sm font-black text-orange-600 tabular-nums">
                        {yieldScore}%
                    </span>
                </div>
            </div>

            {/* Shift Info Banner */}
            {shift && (
                <div className="px-6 py-2 bg-blue-50/50 border-b border-blue-100 flex flex-wrap gap-4 items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600 uppercase tracking-wide text-[10px]">Shift Window</span>
                        <span className="font-black text-gray-700 bg-white px-2 py-0.5 rounded shadow-sm border border-blue-100">{shift.start} - {shift.end}</span>
                    </div>
                </div>
            )}

            {/* Main Grid Area */}
            <div className="flex-1 overflow-auto relative custom-scrollbar bg-gray-50/30">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-50">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                            <p className="text-xs font-bold text-orange-600 uppercase tracking-widest animate-pulse">Loading Logs...</p>
                        </div>
                    </div>
                )}

                <table className="w-full min-w-[1200px] border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border-b border-gray-100">
                            <th className="px-3 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-12">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 cursor-pointer"
                                    checked={selectedRows.size === rows.length && rows.length > 0}
                                    onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                                    disabled={isReadOnly}
                                />
                            </th>
                            <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left flex-1 min-w-[200px]">
                                Task / Objective
                            </th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-28">
                                Time Range
                            </th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-24">
                                Progress
                            </th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-28">
                                Priority
                            </th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-32">
                                Status
                            </th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-32">
                                Assigned By
                            </th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-40">
                                Break Times
                            </th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-48">
                                Blockers/Notes
                            </th>
                            <th className="px-4 py-3 w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {rows.map((r, idx) => {
                            const isTask = r.type === "task";
                            const overlap = isTask ? checkBreakOverlap(r.start_time, r.end_time) : null;
                            const shiftCheck = isTask ? isWithinShift(r.start_time, r.end_time) : { valid: true };
                            const isSelected = selectedRows.has(idx);

                            return (
                                <tr
                                    key={r._uid}
                                    className={`group transition-colors duration-200 border-l-4 cursor-pointer ${isSelected ? 'bg-blue-50' : ''} ${!isTask ?
                                        (r.type === 'break' ? 'bg-emerald-50/30 border-l-emerald-400' : 'bg-gray-50 border-l-gray-400')
                                        : isSelected ? 'border-l-blue-500 hover:bg-blue-100/50' : 'hover:bg-orange-50/10 border-l-transparent hover:border-l-orange-500'
                                        }`}
                                    onClick={(e) => {
                                        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
                                            toggleRowSelection(idx, e);
                                        }
                                    }}
                                >
                                    {/* Checkbox */}
                                    <td className="px-3 py-3 align-top text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 cursor-pointer"
                                            checked={isSelected}
                                            onChange={() => toggleRowSelection(idx, { ctrlKey: true })}
                                            disabled={isReadOnly}
                                        />
                                    </td>

                                    {/* Description */}
                                    <td className="px-6 py-3 align-top">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                {!isTask && (
                                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${r.type === 'break' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                                                        {r.type}
                                                    </span>
                                                )}
                                                <textarea
                                                    ref={idx === rows.length - 1 ? lastRowDescRef : null}
                                                    className={`w-full bg-transparent border-0 p-0 text-sm font-semibold text-gray-800 focus:ring-0 placeholder:text-gray-300 resize-none overflow-hidden leading-relaxed ${!isTask ? 'italic text-gray-500' : ''}`}
                                                    value={r.description || ""}
                                                    onChange={(e) => {
                                                        updateRow(idx, "description", e.target.value);
                                                        e.target.style.height = "auto";
                                                        e.target.style.height = e.target.scrollHeight + "px";
                                                    }}
                                                    placeholder="Describe your task..."
                                                    rows={1}
                                                    disabled={isReadOnly}
                                                />
                                            </div>
                                            {(overlap || !shiftCheck.valid) && (
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {overlap && (
                                                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                            ⚠️ Overlaps {overlap.breakLabel}
                                                        </span>
                                                    )}
                                                    {!shiftCheck.withinStart && (
                                                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                                            ⚠️ Starts before shift
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Time Range */}
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-200 group-hover:border-gray-300 transition-colors">
                                            <input
                                                type="time"
                                                className={`w-full bg-transparent border-0 p-0 text-xs font-bold text-gray-600 text-center focus:ring-0 ${!isTask ? 'invisible' : ''}`}
                                                value={r.start_time || ""}
                                                onChange={(e) => updateRow(idx, "start_time", e.target.value)}
                                                disabled={isReadOnly || !isTask}
                                            />
                                            <span className="text-gray-300 font-light text-xs">-</span>
                                            <input
                                                type="time"
                                                className={`w-full bg-transparent border-0 p-0 text-xs font-bold text-gray-600 text-center focus:ring-0 ${!isTask ? 'invisible' : ''}`}
                                                value={r.end_time || ""}
                                                onChange={(e) => updateRow(idx, "end_time", e.target.value)}
                                                disabled={isReadOnly || !isTask}
                                            />
                                        </div>
                                    </td>

                                    {/* Completion % */}
                                    <td className="px-4 py-3 align-top text-center">
                                        <div className={`relative flex items-center justify-center ${!isTask ? 'invisible' : ''}`}>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                className="w-16 bg-white border border-gray-200 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all py-1.5"
                                                value={r.completion_percent || 0}
                                                onChange={(e) => updateRow(idx, "completion_percent", e.target.value)}
                                                disabled={isReadOnly || !isTask}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 pointer-events-none">%</span>
                                        </div>
                                    </td>

                                    {/* Priority */}
                                    <td className="px-4 py-3 align-top">
                                        <div className={`${!isTask ? 'invisible' : ''}`}>
                                            <select
                                                className={`w-full text-[10px] font-black uppercase tracking-wider border rounded-lg py-1.5 px-2 focus:ring-2 focus:ring-offset-1 transition-all cursor-pointer outline-none appearance-none text-center ${r.priority === 'high'
                                                    ? 'bg-rose-50 text-rose-600 border-rose-200 focus:ring-rose-500/30'
                                                    : r.priority === 'low'
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 focus:ring-emerald-500/30'
                                                        : 'bg-indigo-50 text-indigo-600 border-indigo-200 focus:ring-indigo-500/30'
                                                    }`}
                                                value={r.priority || "medium"}
                                                onChange={(e) => {
                                                    updateRow(idx, "priority", e.target.value);
                                                    updateRow(idx, "weight", e.target.value === "high" ? 3 : e.target.value === "medium" ? 2 : 1);
                                                }}
                                                disabled={isReadOnly || !isTask}
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3 align-top">
                                        <div className={`${!isTask ? 'invisible' : ''}`}>
                                            <select
                                                className={`w-full text-[10px] font-black uppercase tracking-wider border-0 bg-transparent py-1.5 px-0 focus:ring-0 transition-all cursor-pointer text-center ${r.status === 'complete' ? 'text-emerald-600' : r.status === 'inprogress' ? 'text-blue-600' : r.status === 'partial' ? 'text-amber-600' : 'text-gray-500'
                                                    }`}
                                                value={r.status || "pending"}
                                                onChange={(e) => updateRow(idx, "status", e.target.value)}
                                                disabled={isReadOnly || !isTask}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="inprogress">In Progress</option>
                                                <option value="partial">Partial</option>
                                                <option value="complete">Complete</option>
                                            </select>
                                        </div>
                                    </td>

                                    {/* Assigned By */}
                                    <td className="px-4 py-3 align-top">
                                        <div className={`${!isTask ? 'invisible' : ''}`}>
                                            <input
                                                type="text"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 px-2 py-1.5 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                                value={r.assigned_by || ""}
                                                onChange={(e) => updateRow(idx, "assigned_by", e.target.value)}
                                                placeholder="Self / Manager"
                                                disabled={isReadOnly || !isTask}
                                            />
                                        </div>
                                    </td>

                                    {/* Break Time Tracking */}
                                    <td className="px-4 py-3 align-top">
                                        <div className={`flex items-center gap-1 ${!isTask ? 'invisible' : ''}`}>
                                            <input
                                                type="time"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 text-center focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all px-2 py-1"
                                                value={r.actual_break_start || ""}
                                                onChange={(e) => updateRow(idx, "actual_break_start", e.target.value)}
                                                placeholder="Break Start"
                                                disabled={isReadOnly || !isTask}
                                                title="Break start time"
                                            />
                                            <span className="text-gray-300 font-light text-xs">-</span>
                                            <input
                                                type="time"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 text-center focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all px-2 py-1"
                                                value={r.actual_break_end || ""}
                                                onChange={(e) => updateRow(idx, "actual_break_end", e.target.value)}
                                                placeholder="Break End"
                                                disabled={isReadOnly || !isTask}
                                                title="Break end time"
                                            />
                                        </div>
                                    </td>

                                    {/* Blockers/Notes */}
                                    <td className="px-4 py-3 align-top">
                                        <div className={`${!isTask ? 'invisible' : ''}`}>
                                            <input
                                                type="text"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 px-2 py-1.5 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                                value={r.blockers_notes || ""}
                                                onChange={(e) => updateRow(idx, "blockers_notes", e.target.value)}
                                                placeholder="Any blockers or notes..."
                                                disabled={isReadOnly || !isTask}
                                            />
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 align-top text-center">
                                        {!isReadOnly && (
                                            <button
                                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-500 transition-all p-1.5 rounded hover:bg-rose-50"
                                                onClick={() => removeRow(idx)}
                                                title="Remove Task"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Empty State */}
                {rows.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <svg className="w-12 h-12 mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <p className="text-sm font-semibold">No tasks logged yet.</p>
                    </div>
                )}
            </div>

            {/* Keyboard Shortcuts Help */}
            <div className="px-6 py-2 bg-amber-50/50 border-t border-amber-100 text-[9px] text-amber-700 font-bold uppercase tracking-widest hidden sm:block">
                ⌨️ Shortcuts: Ctrl+A (Select All) • Ctrl+C (Copy) • Ctrl+V (Paste) • Delete (Bulk Remove)
            </div>

            {/* Floating Add Button */}
            {!isReadOnly && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                    <button
                        className="group flex items-center gap-3 px-6 py-3 bg-gray-900 hover:bg-orange-600 text-white rounded-full shadow-2xl hover:shadow-orange-500/30 transition-all active:scale-95"
                        onClick={addRow}
                    >
                        <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="font-bold text-sm tracking-wide">Add New Task</span>
                    </button>
                </div>
            )}

            {/* Notification Toast */}
            {message && (
                <div className="absolute bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <div className={`px-4 py-3 rounded-xl shadow-lg border text-sm font-bold flex items-center gap-2 ${message.includes("success")
                        ? "bg-white text-emerald-600 border-emerald-100"
                        : "bg-white text-rose-600 border-rose-100"
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${message.includes("success") ? "bg-emerald-500" : "bg-rose-500"}`}></div>
                        {message}
                    </div>
                </div>
            )}
        </div>
    );
}

    function addRow() {
        setRows((prev) => [
            ...prev,
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
        // Focus the new row description after render
        setTimeout(() => {
            if (lastRowDescRef.current) {
                lastRowDescRef.current.focus();
            }
        }, 50);
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
        if (!shift || !startTime || !endTime) return { withinStart: true, withinEnd: true, valid: true };

        const shiftStart = parseFloat(shift.start.replace(":", "."));
        const shiftEnd = parseFloat(shift.end.replace(":", "."));
        const taskStart = parseFloat(startTime.replace(":", "."));
        const taskEnd = parseFloat(endTime.replace(":", "."));

        const withinStart = taskStart >= shiftStart;
        const withinEnd = taskEnd <= shiftEnd;

        return { withinStart, withinEnd, valid: withinStart && withinEnd };
    }

    function updateRow(idx, key, value) {
        setRows((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], [key]: value };

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
            // Auto-update weight if priority changes
            if (key === "priority") {
                const p = value;
                const w = p === "high" ? 3 : p === "medium" ? 2 : 1;
                next[idx].weight = w;
            }

            return next;
        });
    }

    function removeRow(idx) {
        setRows((prev) => {
            const next = [...prev];
            next.splice(idx, 1);
            return next.length
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
                ];
        });
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
            setTimeout(() => setMessage(null), 3000);
        } catch (e) {
            console.error(e);
            setMessage("Submit failed");
        } finally {
            setSubmitting(false);
        }
    }

    useEffect(() => {
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

            function processRows(data) {
                return data.map((l) => ({
                    id: l.id || null,
                    _uid: l.id ? `task:${l.id}` : genUid(),
                    task_id: l.task_id || null,
                    start_time: l.start_time || "",
                    end_time: l.end_time || "",
                    duration_hours: l.duration_hours || 0,
                    description: l.description || "",
                    kpi_category_id: l.kpi_category_id || null,
                    priority: l.task?.priority || l.priority || "medium",
                    weight: l.weight || (
                        l.metadata?.type === "task" || l.type === 'task'
                            ? (l.task?.priority === "high" || l.priority === 'high')
                                ? 3
                                : (l.task?.priority === "medium" || l.priority === 'medium')
                                    ? 2
                                    : 1
                            : 0
                    ),
                    due_date: l.task?.due_date
                        ? l.task.due_date.slice(0, 10)
                        : (l.due_date ? l.due_date.slice(0, 10) : ""),
                    status: l.status || "pending",
                    completion_percent: l.metadata?.completion_percent || l.completion_percent || 0,
                    assigned_by: l.task?.metadata?.assigned_by || l.assigned_by || "Self",
                    type: l.metadata?.type || l.type || "task",
                }));
            }

            if (existing.data.data && existing.data.data.length > 0) {
                const mapped = processRows(existing.data.data);
                // dedupe
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
                setRows(deduped.map((r) => ({ ...r, _uid: r._uid || genUid() })));
            } else {
                // 2. Fetch template
                const template = await axios.get(
                    `/api/task-logs/daily-template?date=${encodeURIComponent(date)}`,
                );

                const templateData = template.data;
                if (templateData.shift) setShift(templateData.shift);
                if (templateData.breaks) setBreaks(templateData.breaks);
                if (templateData.expected_work_hours)
                    setExpectedWorkHours(templateData.expected_work_hours);
                if (templateData.total_break_hours)
                    setTotalBreakHours(templateData.total_break_hours);

                const normalized = processRows(templateData.rows || []);

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
                setRows(deduped.map((r) => ({ ...r, _uid: r._uid || genUid() })));
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
            !confirm(
                "This will overwrite current rows with the daily template. Continue?",
            )
        ) return;

        setLoading(true);
        setMessage(null);
        try {
            const template = await axios.get(
                `/api/task-logs/daily-template?date=${encodeURIComponent(date)}`,
            );

            const templateData = template.data;
            if (templateData.shift) setShift(templateData.shift);
            if (templateData.breaks) setBreaks(templateData.breaks);
            if (templateData.expected_work_hours)
                setExpectedWorkHours(templateData.expected_work_hours);
            if (templateData.total_break_hours)
                setTotalBreakHours(templateData.total_break_hours);

            const normalized = (templateData.rows || []).map((r) => ({
                id: r.id || null,
                _uid: genUid(),
                task_id: r.task_id || null,
                start_time: r.start_time || "",
                end_time: r.end_time || "",
                duration_hours: r.duration_hours || 0,
                description: r.description || "",
                kpi_category_id: r.kpi_category_id || null,
                priority: r.priority || "medium",
                weight: r.weight || (r.priority === "high" ? 3 : r.priority === "medium" ? 2 : 1),
                due_date: r.due_date ? r.due_date.slice(0, 10) : "",
                status: r.status || "pending",
                completion_percent: r.completion_percent || 0,
                assigned_by: r.assigned_by || "Self",
                type: r.type || "task",
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

            setRows(deduped);
        } catch (e) {
            setMessage("Failed to refresh template");
        } finally {
            setLoading(false);
        }
    }

    // Calculations
    const totalDuration = rows.reduce((acc, r) => acc + (parseFloat(r.duration_hours) || 0), 0);
    const impactFactor = rows.reduce((acc, r) => acc + (parseFloat(r.duration_hours) || 0) * (r.weight || 1), 0);
    const totalWeightedComp = rows.reduce((acc, r) => acc + (parseFloat(r.completion_percent) || 0) * (parseFloat(r.duration_hours) || 0) * (r.weight || 1), 0);
    const yieldScore = impactFactor > 0 ? (totalWeightedComp / impactFactor).toFixed(1) : "100.0";

    return (
        <div className="flex flex-col h-full bg-white/95 backdrop-blur-2xl shadow-xl rounded-2xl border border-gray-100 overflow-hidden ring-1 ring-slate-900/5 transition-all">
            {/* Action Bar */}
            <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-lg shadow-orange-500/40 animate-pulse"></div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">
                                Task Log
                            </h2>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            Daily Objectives & Performance
                        </p>
                    </div>

                    <div className="hidden md:block h-8 w-px bg-gray-100 mx-2"></div>

                    <div className="relative group">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-gray-50 hover:bg-white border-0 text-sm font-bold text-gray-700 uppercase focus:ring-2 focus:ring-orange-500/20 rounded-xl px-3 py-2 cursor-pointer transition-all shadow-sm group-hover:shadow-md"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    {!isReadOnly && (
                        <button
                            onClick={importFromPlan}
                            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 text-gray-600 hover:text-orange-600 rounded-xl border border-gray-200 hover:border-orange-200 transition-all text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-orange-500/10 active:scale-95"
                            title="Reset to Daily Plan"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span className="hidden sm:inline">Sync Plan</span>
                        </button>
                    )}

                    <button
                        className={`group flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] ${isReadOnly
                            ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-none"
                            : "bg-linear-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-orange-500/25 hover:shadow-orange-500/40"
                            }`}
                        onClick={submit}
                        disabled={submitting || loading || isReadOnly}
                    >
                        {isReadOnly ? (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Locked
                            </>
                        ) : submitting ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </span>
                        ) : (
                            "Save Changes"
                        )}
                    </button>
                </div>
            </div>

            {/* Metrics Bar - Sticky below header */}
            <div className="px-6 py-3 bg-gray-50/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between sm:justify-start sm:gap-12 overflow-x-auto scrollbar-hide z-10 sticky top-[73px]">
                <div className="flex flex-col min-w-max">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        Total Hours
                    </span>
                    <span className="text-sm font-black text-gray-900 tabular-nums">
                        {totalDuration.toFixed(1)} <span className="text-gray-400 text-[10px] font-bold">HRS</span>
                    </span>
                </div>
                <div className="flex flex-col min-w-max">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                        Exp. Work
                    </span>
                    <span className="text-sm font-black text-indigo-600 tabular-nums">
                        {expectedWorkHours || 0} <span className="text-indigo-300 text-[10px] font-bold">HRS</span>
                    </span>
                </div>
                <div className="w-px h-6 bg-gray-200 mx-2 hidden sm:block"></div>
                <div className="flex flex-col min-w-max">
                    <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">
                        Productivity
                    </span>
                    <span className="text-sm font-black text-orange-600 tabular-nums">
                        {yieldScore}%
                    </span>
                </div>
            </div>

            {/* Shift Info Banner */}
            {shift && (
                <div className="px-6 py-2 bg-blue-50/50 border-b border-blue-100 flex flex-wrap gap-4 items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600 uppercase tracking-wide text-[10px]">Shift Window</span>
                        <span className="font-black text-gray-700 bg-white px-2 py-0.5 rounded shadow-sm border border-blue-100">{shift.start} - {shift.end}</span>
                    </div>
                </div>
            )}

            {/* Main Grid Area */}
            <div className="flex-1 overflow-auto relative custom-scrollbar bg-gray-50/30">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-50">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                            <p className="text-xs font-bold text-orange-600 uppercase tracking-widest animate-pulse">Loading Logs...</p>
                        </div>
                    </div>
                )}

                <table className="w-full min-w-[800px] border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border-b border-gray-100">
                            <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left w-[40%]">
                                Task / Objective
                            </th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-28">
                                Time Range
                            </th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-24">
                                Progress
                            </th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-28">
                                Priority
                            </th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-32">
                                Status
                            </th>
                            <th className="px-4 py-3 w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {rows.map((r, idx) => {
                            const isTask = r.type === "task";
                            const overlap = isTask ? checkBreakOverlap(r.start_time, r.end_time) : null;
                            const shiftCheck = isTask ? isWithinShift(r.start_time, r.end_time) : { valid: true };

                            return (
                                <tr
                                    key={r._uid}
                                    className={`group transition-colors duration-200 border-l-4 ${!isTask ?
                                        (r.type === 'break' ? 'bg-emerald-50/30 border-l-emerald-400' : 'bg-gray-50 border-l-gray-400')
                                        : 'hover:bg-orange-50/10 border-l-transparent hover:border-l-orange-500'
                                        }`}
                                >
                                    {/* Description */}
                                    <td className="px-6 py-3 align-top">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                {!isTask && (
                                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${r.type === 'break' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                                                        {r.type}
                                                    </span>
                                                )}
                                                <textarea
                                                    ref={idx === rows.length - 1 ? lastRowDescRef : null}
                                                    className={`w-full bg-transparent border-0 p-0 text-sm font-semibold text-gray-800 focus:ring-0 placeholder:text-gray-300 resize-none overflow-hidden leading-relaxed ${!isTask ? 'italic text-gray-500' : ''}`}
                                                    value={r.description || ""}
                                                    onChange={(e) => {
                                                        updateRow(idx, "description", e.target.value);
                                                        e.target.style.height = "auto";
                                                        e.target.style.height = e.target.scrollHeight + "px";
                                                    }}
                                                    placeholder="Describe your task..."
                                                    rows={1}
                                                    disabled={isReadOnly}
                                                />
                                            </div>
                                            {/* Validation Errors */}
                                            {(overlap || !shiftCheck.valid) && (
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {overlap && (
                                                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                            ⚠️ Overlaps {overlap.breakLabel}
                                                        </span>
                                                    )}
                                                    {!shiftCheck.withinStart && (
                                                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                                            ⚠️ Starts before shift
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Time Range */}
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-200 group-hover:border-gray-300 transition-colors">
                                            <input
                                                type="time"
                                                className={`w-full bg-transparent border-0 p-0 text-xs font-bold text-gray-600 text-center focus:ring-0 ${!isTask ? 'invisible' : ''}`}
                                                value={r.start_time || ""}
                                                onChange={(e) => updateRow(idx, "start_time", e.target.value)}
                                                disabled={isReadOnly || !isTask}
                                            />
                                            <span className="text-gray-300 font-light text-xs">-</span>
                                            <input
                                                type="time"
                                                className={`w-full bg-transparent border-0 p-0 text-xs font-bold text-gray-600 text-center focus:ring-0 ${!isTask ? 'invisible' : ''}`}
                                                value={r.end_time || ""}
                                                onChange={(e) => updateRow(idx, "end_time", e.target.value)}
                                                disabled={isReadOnly || !isTask}
                                            />
                                        </div>
                                    </td>

                                    {/* Completion % */}
                                    <td className="px-4 py-3 align-top text-center">
                                        <div className={`relative flex items-center justify-center ${!isTask ? 'invisible' : ''}`}>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                className="w-16 bg-white border border-gray-200 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all py-1.5"
                                                value={r.completion_percent || 0}
                                                onChange={(e) => updateRow(idx, "completion_percent", e.target.value)}
                                                disabled={isReadOnly || !isTask}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 pointer-events-none">%</span>
                                        </div>
                                    </td>

                                    {/* Priority */}
                                    <td className="px-4 py-3 align-top">
                                        <div className={`${!isTask ? 'invisible' : ''}`}>
                                            <select
                                                className={`w-full text-[10px] font-black uppercase tracking-wider border rounded-lg py-1.5 px-2 focus:ring-2 focus:ring-offset-1 transition-all cursor-pointer outline-none appearance-none text-center ${r.priority === 'high'
                                                    ? 'bg-rose-50 text-rose-600 border-rose-200 focus:ring-rose-500/30'
                                                    : r.priority === 'low'
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 focus:ring-emerald-500/30'
                                                        : 'bg-indigo-50 text-indigo-600 border-indigo-200 focus:ring-indigo-500/30'
                                                    }`}
                                                value={r.priority || "medium"}
                                                onChange={(e) => {
                                                    updateRow(idx, "priority", e.target.value);
                                                    updateRow(idx, "weight", e.target.value === "high" ? 3 : e.target.value === "medium" ? 2 : 1);
                                                }}
                                                disabled={isReadOnly || !isTask}
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3 align-top">
                                        <div className={`${!isTask ? 'invisible' : ''}`}>
                                            <select
                                                className={`w-full text-[10px] font-black uppercase tracking-wider border-0 bg-transparent py-1.5 px-0 focus:ring-0 transition-all cursor-pointer text-center ${r.status === 'complete' ? 'text-emerald-600' : r.status === 'inprogress' ? 'text-blue-600' : 'text-gray-500'
                                                    }`}
                                                value={r.status || "pending"}
                                                onChange={(e) => updateRow(idx, "status", e.target.value)}
                                                disabled={isReadOnly || !isTask}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="inprogress">In Progress</option>
                                                <option value="complete">Complete</option>
                                                <option value="not_started">Not Started</option>
                                            </select>
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 align-top text-center">
                                        {!isReadOnly && (
                                            <button
                                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-500 transition-all p-1.5 rounded hover:bg-rose-50"
                                                onClick={() => removeRow(idx)}
                                                title="Remove Task"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Empty State */}
                {rows.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <svg className="w-12 h-12 mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <p className="text-sm font-semibold">No tasks logged yet.</p>
                    </div>
                )}
            </div>

            {/* Floating Add Button Wrapper to ensure visibility */}
            {!isReadOnly && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                    <button
                        className="group flex items-center gap-3 px-6 py-3 bg-gray-900 hover:bg-orange-600 text-white rounded-full shadow-2xl hover:shadow-orange-500/30 transition-all active:scale-95"
                        onClick={addRow}
                    >
                        <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="font-bold text-sm tracking-wide">Add New Task</span>
                    </button>
                </div>
            )}

            {/* Notification Toast */}
            {message && (
                <div className="absolute bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <div className={`px-4 py-3 rounded-xl shadow-lg border text-sm font-bold flex items-center gap-2 ${message.includes("success")
                        ? "bg-white text-emerald-600 border-emerald-100"
                        : "bg-white text-rose-600 border-rose-100"
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${message.includes("success") ? "bg-emerald-500" : "bg-rose-500"}`}></div>
                        {message}
                    </div>
                </div>
            )}
        </div>
    );
}
