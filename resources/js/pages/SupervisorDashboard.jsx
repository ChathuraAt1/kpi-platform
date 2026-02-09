import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import SupervisorScoring from "../components/SupervisorScoring";
import { useTheme } from "../contexts/ThemeContext";

export default function SupervisorDashboard() {
    const { user } = useAuth();
    const [tab, setTab] = useState("logs"); // logs | evaluations | team
    const [submittedLogs, setSubmittedLogs] = useState([]);
    const [pendingEvals, setPendingEvals] = useState([]);
    const [teamStats, setTeamStats] = useState({
        total_subordinates: 0,
        active_today: 0,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchLogs();
        fetchEvaluations();
        fetchTeamStats();
    }, [user]);

    function fetchLogs() {
        setLoading(true);
        // Show submitted task logs for supervisor review (read-only)
        axios
            .get("/api/task-logs", { params: { submitted: true } })
            .then((r) => setSubmittedLogs(r.data.data || []))
            .finally(() => setLoading(false));
    }

    function fetchEvaluations() {
        axios
            .get("/api/evaluations?status=pending&team_view=1")
            .then((r) => setPendingEvals(r.data.data || []));
    }

    function fetchTeamStats() {
        // Placeholder for real team stats.
        // In a real app, this might be a specialized endpoint.
        setTeamStats({
            total_subordinates: user?.all_subordinate_ids?.length || 0,
            active_today: Math.floor(
                (user?.all_subordinate_ids?.length || 0) * 0.8,
            ), // Mocked
        });
    }

    // Note: Approve/reject workflow removed. Supervisor review is now read-only;
    // Optional scoring is handled in SupervisorTeamLogs component.

    return (
        <div className="space-y-10 pb-20">
            {/* Team Overview Header */}
            <header className="relative p-6 rounded-lg bg-neutral-900 dark:bg-gray-800 overflow-hidden shadow-2xl group">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 text-white">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">
                                Management Center
                            </span>
                            <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                            <span className="text-neutral-400 text-xs font-medium uppercase tracking-wider">
                                Team Supervision
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                            Team <span className="text-orange-500">Pulse</span>
                        </h2>
                        <p className="text-neutral-400 font-medium max-w-sm">
                            Review submitted task logs and provide optional
                            performance feedback for your team.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 min-w-[160px]">
                            <div className="text-orange-400 text-3xl font-black mb-1">
                                {teamStats.total_subordinates}
                            </div>
                            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest leading-none">
                                Total Team
                            </div>
                        </div>
                        <div className="bg-orange-600 p-6 rounded-3xl shadow-lg shadow-orange-600/20 min-w-[160px]">
                            <div className="text-white text-3xl font-black mb-1">
                                {submittedLogs.length}
                            </div>
                            <div className="text-[10px] font-bold text-orange-200 uppercase tracking-widest leading-none">
                                Submitted Logs
                            </div>
                        </div>
                    </div>
                </div>
                {/* Accent */}
                <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[140%] bg-orange-500/10 blur-[100px] rounded-full rotate-12 transition-transform duration-1000 group-hover:scale-110"></div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-neutral-200/50 dark:bg-gray-700/50 backdrop-blur-md rounded-md w-fit self-start border border-neutral-200 dark:border-gray-600">
                {[
                    {
                        id: "logs",
                        name: "Log Review",
                        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
                    },
                    {
                        id: "evaluations",
                        name: "Monthly Reviews",
                        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                    },
                    {
                        id: "team",
                        name: "My Team",
                        icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
                    },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === t.id ? "bg-white dark:bg-orange-600 text-orange-600 dark:text-white shadow-sm border border-white dark:border-orange-600" : "text-neutral-500 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-gray-200"}`}
                    >
                        <svg
                            className={`w-4 h-4 ${tab === t.id ? "text-orange-500" : "text-neutral-400"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d={t.icon}
                            />
                        </svg>
                        {t.name}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {tab === "logs" && (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-50 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">
                                Submitted Task Logs
                            </h3>
                            <div className="px-4 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest border border-orange-100 dark:border-orange-800">
                                Review Only
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-20 text-center animate-pulse text-neutral-400 font-bold uppercase tracking-[0.2em] text-xs transition-opacity duration-500">
                                Synchronizing Data...
                            </div>
                        ) : submittedLogs.length === 0 ? (
                            <div className="p-20 text-center text-neutral-400 dark:text-gray-400">
                                <svg
                                    className="w-16 h-16 mx-auto mb-4 text-slate-200"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                <p className="font-bold text-lg text-slate-300">
                                    No submitted logs to review.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-neutral-50/50 dark:bg-gray-700/30 text-[10px] font-black text-neutral-400 dark:text-gray-400 uppercase tracking-widest border-y border-slate-100 dark:border-gray-700">
                                            <th className="px-10 py-5">
                                                Employee
                                            </th>
                                            <th className="px-10 py-5">Date</th>
                                            <th className="px-10 py-5">
                                                Activity Details
                                            </th>
                                            <th className="px-10 py-5">
                                                Time spent
                                            </th>
                                            <th className="px-10 py-5 text-right">
                                                Verification
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
                                        {submittedLogs.map((log) => (
                                            <tr
                                                key={log.id}
                                                className="hover:bg-orange-50/30 dark:hover:bg-orange-900/20 transition-colors group"
                                            >
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-xs ring-2 ring-white dark:ring-gray-800">
                                                            {log.user?.name?.charAt(
                                                                0,
                                                            )}
                                                        </div>
                                                        <span className="font-bold text-black dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                                            {log.user?.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6 text-sm font-medium text-neutral-500 italic">
                                                    {log.date}
                                                </td>
                                                <td className="px-10 py-6">
                                                    <p className="text-sm font-semibold text-neutral-700 max-w-sm truncate whitespace-nowrap">
                                                        {log.description}
                                                    </p>
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Task ID:{" "}
                                                        {log.task_id ||
                                                            "Quick Log"}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <span className="px-3 py-1 bg-slate-100 dark:bg-gray-700 rounded-lg text-xs font-black text-slate-600 dark:text-gray-300">
                                                        {log.duration_hours}h
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <a
                                                            href={`/task-logs/${log.id}`}
                                                            className="px-4 py-2 bg-slate-50 dark:bg-gray-700 text-neutral-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-neutral-900 dark:hover:bg-orange-600 hover:text-white transition-all border border-slate-100 dark:border-gray-600 text-center"
                                                        >
                                                            View
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {tab === "evaluations" && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {pendingEvals.length === 0 ? (
                            <div className="col-span-full bg-white p-20 rounded-4xl border border-slate-100 text-center text-slate-300 font-bold italic">
                                No evaluations pending your review for this
                                period.
                            </div>
                        ) : (
                            pendingEvals.map((ev) => (
                                <SupervisorScoring
                                    key={ev.id}
                                    evaluation={ev}
                                    onSubmit={submitScore}
                                />
                            ))
                        )}
                    </div>
                )}

                {tab === "team" && (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-50 dark:border-gray-700 flex justify-between items-center bg-neutral-50/50 dark:bg-gray-700/30">
                            <h3 className="text-xl font-black text-black dark:text-white tracking-tight">
                                Direct & Indirect Reports
                            </h3>
                            <button className="px-5 py-2.5 bg-neutral-900 dark:bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-neutral-800 dark:hover:bg-orange-700 transition-all shadow-lg active:scale-95">
                                Hierarchy View
                            </button>
                        </div>
                        <div className="p-6">
                            <SubordinateList />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SubordinateList() {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        axios
            .get("/api/users?team_view=1")
            .then((r) => setTeam(r.data.data || []))
            .finally(() => setLoading(false));
    }, []);

    if (loading)
        return (
            <div className="text-center p-10 font-black text-slate-300 animate-pulse">
                Retreiving hierarchy...
            </div>
        );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member) => (
                <div
                    key={member.id}
                    className="p-5 bg-slate-50 dark:bg-gray-800 rounded-lg border border-slate-100 dark:border-gray-700 group relative overflow-hidden"
                >
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-lg bg-white dark:bg-gray-700 border border-neutral-200 dark:border-gray-600 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4 font-black shadow-sm group-hover:scale-110 transition-transform text-xl">
                            {member.name.charAt(0)}
                        </div>
                        <h4 className="font-black text-black dark:text-white mb-1">
                            {member.name}
                        </h4>
                        <p className="text-[10px] font-black text-neutral-400 dark:text-gray-400 uppercase tracking-widest mb-6">
                            {member.role}
                        </p>

                        <div className="w-full flex gap-2">
                            <a
                                href={`/supervisor/subordinate/${member.id}`}
                                className="flex-1 py-3 bg-white dark:bg-gray-700 border border-neutral-200 dark:border-gray-600 text-slate-600 dark:text-gray-300 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-neutral-900 dark:hover:bg-orange-600 hover:text-white dark:hover:text-white transition-all text-center"
                            >
                                Detailed Pulse
                            </a>
                        </div>
                    </div>
                    <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-orange-500/5 blur-2xl rounded-full"></div>
                </div>
            ))}
        </div>
    );
}
