import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

export default function SupervisorTeamLogs() {
    const { user } = useAuth();
    const [subordinates, setSubordinates] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [allLogs, setAllLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedLog, setExpandedLog] = useState(null);
    const [supervisorScores, setSupervisorScores] = useState({}); // logId -> score
    const [savingScore, setSavingScore] = useState(null);
    const [filters, setFilters] = useState({
        status: "", // submitted | assessment-pending | assessment-complete
        date_from: "",
        date_to: "",
        employee_id: "",
    });

    useEffect(() => {
        // Fetch subordinates
        axios
            .get("/api/users?team_view=1")
            .then((r) => {
                const team = r.data.data || [];
                setSubordinates(team);
            })
            .catch((e) => console.error("Failed to fetch team", e));
    }, [user]);

    useEffect(() => {
        fetchAllLogs();
    }, [filters]);

    function fetchAllLogs() {
        setLoading(true);
        const params = {
            submitted: true, // Only show submitted task logs
            ...filters,
        };
        axios
            .get("/api/task-logs", { params })
            .then((r) => {
                const logs = r.data.data || [];
                setAllLogs(logs);
                // Load any existing supervisor scores
                const scores = {};
                logs.forEach((log) => {
                    if (
                        log.metadata?.supervisor_score !== null &&
                        log.metadata?.supervisor_score !== undefined
                    ) {
                        scores[log.id] = log.metadata.supervisor_score;
                    }
                });
                setSupervisorScores(scores);
            })
            .catch((e) => console.error("Failed to fetch logs", e))
            .finally(() => setLoading(false));
    }

    // Filter logs based on search term, employee, status and date range
    const filteredLogs = allLogs.filter((log) => {
        const lowerSearch = searchTerm.trim().toLowerCase();
        const matchesSearch =
            lowerSearch === "" ||
            (log.task?.title || "").toLowerCase().includes(lowerSearch) ||
            (log.description || "").toLowerCase().includes(lowerSearch) ||
            (log.user?.name || "").toLowerCase().includes(lowerSearch);

        const matchesEmployee =
            filters.employee_id === "" ||
            log.user_id === parseInt(filters.employee_id);

        const createdAt = new Date(log.date || log.created_at);
        const matchesDateFrom =
            !filters.date_from || createdAt >= new Date(filters.date_from);
        const matchesDateTo =
            !filters.date_to ||
            createdAt <= new Date(filters.date_to + "T23:59:59");

        const aiPresent =
            log.metadata &&
            log.metadata.ai_score !== undefined &&
            log.metadata.ai_score !== null;
        const matchesStatus = (() => {
            if (!filters.status) return true;
            if (filters.status === "assessment-pending") return !aiPresent;
            if (filters.status === "assessment-complete") return aiPresent;
            return true;
        })();

        return (
            matchesSearch &&
            matchesEmployee &&
            matchesDateFrom &&
            matchesDateTo &&
            matchesStatus
        );
    });

    async function saveSupervisorScore(logId, score) {
        setSavingScore(logId);
        try {
            await axios.post(`/api/task-logs/${logId}/supervisor-score`, {
                supervisor_score: parseFloat(score),
            });
            setSupervisorScores({
                ...supervisorScores,
                [logId]: parseFloat(score),
            });
        } catch (e) {
            console.error("Failed to save supervisor score", e);
            alert("Failed to save supervisor score");
        } finally {
            setSavingScore(null);
        }
    }

    return (
        <div className="space-y-10 pb-20 px-4 md:px-0">
            {/* Header */}
            <header className="relative p-10 rounded-4xl bg-linear-to-br from-indigo-900 to-slate-900 text-white overflow-hidden shadow-2xl border border-orange-500/10">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-orange-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-orange-300 uppercase tracking-widest border border-orange-400/20">
                            KPI Assessment
                        </span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight">
                        Team Task Logs &{" "}
                        <span className="text-orange-400">KPI Review</span>
                    </h2>
                    <p className="text-neutral-400 font-medium max-w-2xl mt-2">
                        Review submitted task logs, AI-generated KPI
                        assessments, and provide your supervisor evaluation
                        scores.
                    </p>
                </div>
            </header>

            {/* Search and Filters Bar */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search by task title, employee name, or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-6 py-3 bg-slate-50 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 placeholder:text-neutral-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">
                            Employee
                        </label>
                        <select
                            value={filters.employee_id}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    employee_id: e.target.value,
                                })
                            }
                            className="w-full px-4 py-3 bg-slate-50 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">All Employees</option>
                            {subordinates.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">
                            From Date
                        </label>
                        <input
                            type="date"
                            value={filters.date_from}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    date_from: e.target.value,
                                })
                            }
                            className="w-full px-4 py-3 bg-slate-50 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">
                            To Date
                        </label>
                        <input
                            type="date"
                            value={filters.date_to}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    date_to: e.target.value,
                                })
                            }
                            className="w-full px-4 py-3 bg-slate-50 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">
                            Assessment Status
                        </label>
                        <select
                            value={filters.status}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    status: e.target.value,
                                })
                            }
                            className="w-full px-4 py-3 bg-slate-50 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="assessment-pending">
                                Pending Supervisor Review
                            </option>
                            <option value="assessment-complete">
                                Assessment Complete
                            </option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Task Logs List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="p-8 text-center text-neutral-500">
                        <div className="w-10 h-10 border-4 border-orange-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
                        Loading task logs...
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 italic">
                        No task logs found for selected filters
                    </div>
                ) : (
                    filteredLogs.map((log) => {
                        const rawAi = log.metadata?.ai_score;
                        const aiScore =
                            rawAi !== undefined && rawAi !== null
                                ? parseFloat(rawAi)
                                : null;
                        const rawSup = supervisorScores[log.id];
                        const supervisorScore =
                            rawSup !== undefined && rawSup !== null
                                ? parseFloat(rawSup)
                                : null;

                        let finalScore = null;
                        if (aiScore !== null && supervisorScore !== null) {
                            finalScore = (
                                (aiScore + supervisorScore) /
                                2
                            ).toFixed(2);
                        } else if (aiScore !== null) {
                            finalScore = aiScore.toFixed(2);
                        } else if (supervisorScore !== null) {
                            finalScore = supervisorScore.toFixed(2);
                        }

                        return (
                            <div
                                key={log.id}
                                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                            >
                                {/* Card Header - Summary */}
                                <div
                                    onClick={() =>
                                        setExpandedLog(
                                            expandedLog === log.id
                                                ? null
                                                : log.id,
                                        )
                                    }
                                    className="p-6 cursor-pointer hover:bg-neutral-50/50 transition-colors border-b border-slate-50"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                        {/* Employee & Date */}
                                        <div>
                                            <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                                                Employee
                                            </div>
                                            <div className="font-bold text-neutral-900">
                                                {log.user?.name}
                                            </div>
                                            <div className="text-xs text-neutral-500 mt-1">
                                                {new Date(
                                                    log.date || log.created_at,
                                                ).toLocaleDateString()}
                                            </div>
                                        </div>

                                        {/* Task Title */}
                                        <div>
                                            <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                                                Task
                                            </div>
                                            <div className="font-bold text-neutral-900 line-clamp-2">
                                                {log.description ||
                                                    log.task?.title ||
                                                    "No description"}
                                            </div>
                                        </div>

                                        {/* Time & Metrics */}
                                        <div>
                                            <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                                                Time Logged
                                            </div>
                                            <div className="font-bold text-neutral-900">
                                                {log.duration_hours || 0} hrs
                                            </div>
                                            <div className="text-xs text-neutral-500 mt-1">
                                                Completion:{" "}
                                                {log.metadata
                                                    ?.completion_percent || 0}
                                                %
                                            </div>
                                        </div>

                                        {/* AI Score */}
                                        <div>
                                            <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                                                AI Score
                                            </div>
                                            {aiScore !== null ? (
                                                <div className="font-bold text-lg text-orange-600">
                                                    {aiScore.toFixed(2)}/100
                                                </div>
                                            ) : (
                                                <div className="text-xs text-neutral-400 italic">
                                                    Pending Assessment
                                                </div>
                                            )}
                                        </div>

                                        {/* Final Score */}
                                        <div>
                                            <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                                                Final Score
                                            </div>
                                            {finalScore !== null ? (
                                                <div className="font-bold text-lg text-emerald-600">
                                                    {finalScore}/100
                                                </div>
                                            ) : (
                                                <div className="text-xs text-neutral-400 italic">
                                                    Add Your Score
                                                </div>
                                            )}
                                            {supervisorScore !== null && (
                                                <div className="text-[10px] text-amber-600 font-bold mt-1">
                                                    Your: {supervisorScore}/100
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedLog === log.id && (
                                    <div className="p-6 bg-slate-50/30 border-t border-slate-100 space-y-6">
                                        {/* Task Details */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">
                                                    Task Details
                                                </h4>
                                                <div className="space-y-3 text-sm">
                                                    <div>
                                                        <span className="text-slate-600 font-bold">
                                                            Description:
                                                        </span>
                                                        <p className="text-neutral-700 mt-1 leading-relaxed">
                                                            {log.description ||
                                                                "No description"}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-600 font-bold">
                                                            KPI Category:
                                                        </span>
                                                        <div className="mt-1">
                                                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
                                                                {log
                                                                    .kpi_category
                                                                    ?.name ||
                                                                    "Unassigned"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-600 font-bold">
                                                            Time Logged:
                                                        </span>
                                                        <p className="text-neutral-700 mt-1">
                                                            {log.duration_hours ||
                                                                0}{" "}
                                                            hours
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3">
                                                    Metrics
                                                </h4>
                                                <div className="space-y-3 text-sm">
                                                    <div className="p-3 bg-white rounded-xl border border-neutral-200">
                                                        <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                                                            Completion %
                                                        </div>
                                                        <div className="text-2xl font-black text-amber-600">
                                                            {log.metadata
                                                                ?.completion_percent ||
                                                                0}
                                                            %
                                                        </div>
                                                    </div>
                                                    <div className="p-3 bg-white rounded-xl border border-neutral-200">
                                                        <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                                                            Priority
                                                        </div>
                                                        <div className="text-sm font-bold capitalize text-neutral-700">
                                                            {log.priority ||
                                                                "Medium"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* AI Assessment */}
                                        {aiScore !== null && (
                                            <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl">
                                                <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-3">
                                                    AI Assessment
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <div className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1">
                                                            AI Score
                                                        </div>
                                                        <div className="text-3xl font-black text-orange-600">
                                                            {aiScore.toFixed(2)}
                                                        </div>
                                                    </div>
                                                    {log.metadata
                                                        ?.ai_feedback && (
                                                        <div className="md:col-span-2">
                                                            <div className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2">
                                                                AI Feedback
                                                            </div>
                                                            <p className="text-sm text-indigo-800 leading-relaxed">
                                                                {
                                                                    log.metadata
                                                                        .ai_feedback
                                                                }
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Supervisor Score Input */}
                                        {aiScore !== null && (
                                            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl">
                                                <h4 className="text-sm font-black text-emerald-900 uppercase tracking-widest mb-4">
                                                    Your Supervisor Assessment
                                                </h4>
                                                <div className="flex items-end gap-4">
                                                    <div className="flex-1">
                                                        <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">
                                                            Score (0-100)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="0.5"
                                                            value={
                                                                supervisorScore !==
                                                                null
                                                                    ? supervisorScore
                                                                    : ""
                                                            }
                                                            onChange={(e) => {
                                                                const val =
                                                                    e.target
                                                                        .value;
                                                                if (
                                                                    val === ""
                                                                ) {
                                                                    const scores =
                                                                        {
                                                                            ...supervisorScores,
                                                                        };
                                                                    delete scores[
                                                                        log.id
                                                                    ];
                                                                    setSupervisorScores(
                                                                        scores,
                                                                    );
                                                                } else {
                                                                    setSupervisorScores(
                                                                        {
                                                                            ...supervisorScores,
                                                                            [log.id]:
                                                                                parseFloat(
                                                                                    val,
                                                                                ),
                                                                        },
                                                                    );
                                                                }
                                                            }}
                                                            className="w-full px-4 py-3 bg-white border border-emerald-300 rounded-xl text-lg font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                                                            placeholder="Enter your score..."
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            if (
                                                                supervisorScore !==
                                                                null
                                                            ) {
                                                                saveSupervisorScore(
                                                                    log.id,
                                                                    supervisorScore,
                                                                );
                                                            }
                                                        }}
                                                        disabled={
                                                            supervisorScore ===
                                                                null ||
                                                            savingScore ===
                                                                log.id
                                                        }
                                                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-black uppercase tracking-widest text-sm transition-all active:scale-95"
                                                    >
                                                        {savingScore === log.id
                                                            ? "Saving..."
                                                            : "Save Score"}
                                                    </button>
                                                </div>
                                                {supervisorScore !== null && (
                                                    <div className="mt-3 p-3 bg-emerald-100 border border-emerald-300 rounded-lg">
                                                        <p className="text-sm font-bold text-emerald-800">
                                                            Final KPI Score:{" "}
                                                            <span className="text-lg text-emerald-700">
                                                                {finalScore}/100
                                                            </span>
                                                        </p>
                                                        <p className="text-xs text-emerald-700 mt-1">
                                                            Average of AI (
                                                            {aiScore !== null
                                                                ? aiScore.toFixed(
                                                                      2,
                                                                  )
                                                                : "—"}
                                                            ) and Your Score (
                                                            {supervisorScore})
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {!aiScore && (
                                            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl">
                                                <p className="text-sm text-amber-800 font-medium">
                                                    ⏳ This task log is awaiting
                                                    AI assessment. Please check
                                                    back later to add your
                                                    supervisor score.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
