import React, { useEffect, useState } from "react";
import axios from "axios";

export default function HRDashboard() {
    const [evaluations, setEvaluations] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tab, setTab] = useState("governance"); // governance | framework | pending | ready | heatmap | trends | risk
    const [loading, setLoading] = useState(false);
    const [pending, setPending] = useState({ data: [] });
    const [ready, setReady] = useState({ data: [] });
    const [heatmap, setHeatmap] = useState(null);
    const [trends, setTrends] = useState(null);
    const [risk, setRisk] = useState(null);

    useEffect(() => {
        fetchEvaluations();
        fetchCategories();
    }, []);

    useEffect(() => {
        // Fetch tab specific data lazily
        if (tab === "pending") fetchPending();
        if (tab === "ready") fetchReady();
        if (tab === "heatmap") fetchHeatmap();
        if (tab === "trends") fetchTrends();
        if (tab === "risk") fetchRisk();
    }, [tab]);

    function fetchEvaluations() {
        setLoading(true);
        axios
            .get("/api/evaluations")
            .then((r) => setEvaluations(r.data.data || []))
            .finally(() => setLoading(false));
    }

    function fetchCategories() {
        axios
            .get("/api/kpi-categories")
            .then((r) => setCategories(r.data || []));
    }

    async function triggerGenerate() {
        if (
            !confirm(
                "This will queue evaluation generation for all users for the current month. Continue?",
            )
        )
            return;
        try {
            await axios.post("/api/evaluations/trigger");
            alert("Generation process has been successfully queued.");
            fetchEvaluations();
        } catch (e) {
            alert("Failed to queue generation.");
        }
    }

    async function publishEval(id) {
        try {
            await axios.post(`/api/evaluations/${id}/publish`);
            fetchEvaluations();
            alert("Evaluation published to employee.");
        } catch (e) {
            alert("Publishing failed.");
        }
    }

    // HR Specific data fetchers
    function fetchPending(page = 1) {
        axios
            .get(`/api/evaluations/pending-hr?page=${page}`)
            .then((r) => setPending(r.data))
            .catch(() => setPending({ data: [] }));
    }

    function fetchReady(page = 1) {
        axios
            .get(`/api/evaluations/ready-to-publish?page=${page}`)
            .then((r) => setReady(r.data))
            .catch(() => setReady({ data: [] }));
    }

    function fetchHeatmap() {
        axios
            .get(`/api/evaluations/heatmap`)
            .then((r) => setHeatmap(r.data))
            .catch(() => setHeatmap(null));
    }

    function fetchTrends() {
        axios
            .get(`/api/evaluations/role-trends?months=6`)
            .then((r) => setTrends(r.data))
            .catch(() => setTrends(null));
    }

    function fetchRisk() {
        axios
            .get(`/api/evaluations/turnover-risk?threshold=60&months=3`)
            .then((r) => setRisk(r.data))
            .catch(() => setRisk(null));
    }

    return (
        <div className="space-y-10 pb-20">
            {/* HR Executive Header */}
            <header className="relative p-6 rounded-lg bg-linear-to-br from-neutral-950 to-slate-900 dark:from-gray-900 dark:to-gray-800 overflow-hidden shadow-2xl group border border-orange-500/10 dark:border-orange-900/30">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 text-white">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-orange-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-orange-300 uppercase tracking-[0.2em] border border-orange-400/20">
                                Executive Suite
                            </span>
                            <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                            <span className="text-neutral-400 text-xs font-medium uppercase tracking-wider">
                                Performance Governance
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                            HR <span className="text-orange-500">Center</span>
                        </h2>
                        <p className="text-neutral-400 font-medium max-w-sm">
                            Manage global performance assessments, define KPI
                            frameworks, and publish official reviews.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={triggerGenerate}
                            className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-3xl font-black text-sm transition-all shadow-xl shadow-orange-600/20 flex items-center gap-3 active:scale-95"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                            </svg>
                            Initial Generation
                        </button>
                    </div>
                </div>
                {/* Accent */}
                <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[140%] bg-orange-500/10 blur-[100px] rounded-full rotate-12 transition-transform duration-1000 group-hover:scale-110"></div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-neutral-200/50 dark:bg-gray-700/50 backdrop-blur-md rounded-md w-fit self-start border border-neutral-200 dark:border-gray-600">
                {[
                    {
                        id: "governance",
                        name: "Assessment Queue",
                        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
                    },
                    {
                        id: "pending",
                        name: "Pending HR",
                        icon: "M8 7h8M8 11h8M8 15h8",
                    },
                    {
                        id: "ready",
                        name: "Ready to Publish",
                        icon: "M5 13l4 4L19 7",
                    },
                    {
                        id: "heatmap",
                        name: "Heatmap",
                        icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
                    },
                    { id: "trends", name: "Role Trends", icon: "M3 3v18h18" },
                    {
                        id: "risk",
                        name: "Risk & Recs",
                        icon: "M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z",
                    },
                    {
                        id: "framework",
                        name: "KPI Framework",
                        icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
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

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {tab === "governance" && (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-neutral-50/50">
                            <h3 className="text-xl font-black text-black dark:text-white tracking-tight">
                                Review & Publication Queue
                            </h3>
                            <div className="flex gap-4">
                                <div className="px-4 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest border border-orange-100 dark:border-orange-800 italic">
                                    OFFICIAL RECORD
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-20 text-center animate-pulse text-neutral-400 font-bold uppercase tracking-[0.2em] text-xs transition-opacity duration-500 font-mono">
                                Loading official stream...
                            </div>
                        ) : evaluations.length === 0 ? (
                            <div className="p-20 text-center text-slate-300 dark:text-gray-400 font-bold italic">
                                No evaluations found on record.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-neutral-50/50 dark:bg-gray-700/30 text-[10px] font-black text-neutral-400 dark:text-gray-400 uppercase tracking-widest border-y border-slate-100 dark:border-gray-700">
                                            <th className="px-10 py-5">
                                                Employee / User
                                            </th>
                                            <th className="px-10 py-5">
                                                Assessment Period
                                            </th>
                                            <th className="px-10 py-5">
                                                Current Status
                                            </th>
                                            <th className="px-10 py-5">
                                                Final Score
                                            </th>
                                            <th className="px-10 py-5 text-right">
                                                Official Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
                                        {evaluations.map((ev) => (
                                            <tr
                                                key={ev.id}
                                                className="hover:bg-slate-50/80 dark:hover:bg-gray-700/50 transition-colors group"
                                            >
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-neutral-900 dark:bg-orange-600 flex items-center justify-center text-white dark:text-white font-black text-xs">
                                                            {ev.user?.name?.charAt(
                                                                0,
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-black dark:text-white">
                                                                {ev.user?.name}
                                                            </span>
                                                            <span className="text-[10px] text-neutral-400 dark:text-gray-400 font-bold uppercase tracking-wider">
                                                                {ev.user?.email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <span className="font-black text-neutral-700 dark:text-gray-300">
                                                        {ev.year} /{" "}
                                                        {String(
                                                            ev.month,
                                                        ).padStart(2, "0")}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <span
                                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                                                            ev.status ===
                                                            "published"
                                                                ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800"
                                                                : ev.status ===
                                                                    "approved"
                                                                  ? "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800"
                                                                  : "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800"
                                                        }`}
                                                    >
                                                        {ev.status}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6">
                                                    {ev.score !== null ? (
                                                        <span className="text-xl font-black text-orange-600 dark:text-orange-400 tracking-tighter">
                                                            {ev.score}
                                                            <span className="text-[10px] text-neutral-400 dark:text-gray-400 font-normal">
                                                                {" "}
                                                                / 10
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-300 dark:text-gray-500 italic">
                                                            Pending Finalization
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    {ev.status ===
                                                    "approved" ? (
                                                        <button
                                                            onClick={() =>
                                                                publishEval(
                                                                    ev.id,
                                                                )
                                                            }
                                                            className="px-5 py-2.5 bg-orange-600 dark:bg-orange-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-neutral-900 dark:hover:bg-orange-800 transition-all shadow-lg shadow-orange-600/20 dark:shadow-orange-900/30 active:scale-95"
                                                        >
                                                            Publish Review
                                                        </button>
                                                    ) : ev.status ===
                                                      "published" ? (
                                                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                                            PUBLISHED
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-neutral-400 dark:text-gray-500 uppercase tracking-widest">
                                                            Awaiting Superior
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {tab === "pending" && (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-neutral-50/50">
                            <h3 className="text-xl font-black text-black dark:text-white tracking-tight">
                                Pending HR Scores
                            </h3>
                        </div>
                        <div className="p-6">
                            {pending?.data?.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-neutral-50/50 text-[10px] font-black text-neutral-400 uppercase tracking-widest border-y border-slate-100">
                                                <th className="px-6 py-3">
                                                    Employee
                                                </th>
                                                <th className="px-6 py-3">
                                                    Period
                                                </th>
                                                <th className="px-6 py-3">
                                                    Status
                                                </th>
                                                <th className="px-6 py-3 text-right">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {pending.data.map((ev) => (
                                                <tr key={ev.id}>
                                                    <td className="px-6 py-4 font-bold">
                                                        {ev.user?.name}{" "}
                                                        <div className="text-xs text-neutral-400">
                                                            {ev.user?.email}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {ev.year}/
                                                        {String(
                                                            ev.month,
                                                        ).padStart(2, "0")}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {ev.status}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-black">
                                                            Open
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-10 text-center text-neutral-400">
                                    No pending HR scores found.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tab === "ready" && (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-neutral-50/50">
                            <h3 className="text-xl font-black text-black dark:text-white tracking-tight">
                                Ready to Publish
                            </h3>
                        </div>
                        <div className="p-6">
                            {ready?.data?.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-neutral-50/50 text-[10px] font-black text-neutral-400 uppercase tracking-widest border-y border-slate-100">
                                                <th className="px-6 py-3">
                                                    Employee
                                                </th>
                                                <th className="px-6 py-3">
                                                    Period
                                                </th>
                                                <th className="px-6 py-3">
                                                    Approved At
                                                </th>
                                                <th className="px-6 py-3 text-right">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {ready.data.map((ev) => (
                                                <tr key={ev.id}>
                                                    <td className="px-6 py-4 font-bold">
                                                        {ev.user?.name}{" "}
                                                        <div className="text-xs text-neutral-400">
                                                            {ev.user?.email}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {ev.year}/
                                                        {String(
                                                            ev.month,
                                                        ).padStart(2, "0")}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {ev.approved_at || "—"}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() =>
                                                                publishEval(
                                                                    ev.id,
                                                                )
                                                            }
                                                            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-black"
                                                        >
                                                            Publish
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-10 text-center text-neutral-400">
                                    No evaluations ready to publish.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tab === "heatmap" && (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-neutral-50/50">
                            <h3 className="text-xl font-black text-black dark:text-white tracking-tight">
                                Score Heatmap
                            </h3>
                        </div>
                        <div className="p-6">
                            {heatmap ? (
                                <div className="space-y-4">
                                    {Object.keys(heatmap.heatmap || {}).map(
                                        (role) => (
                                            <div
                                                key={role}
                                                className="p-4 border rounded-lg"
                                            >
                                                <div className="font-bold mb-2">
                                                    {role}{" "}
                                                    <span className="text-sm text-neutral-400">
                                                        (total{" "}
                                                        {
                                                            heatmap.heatmap[
                                                                role
                                                            ].total
                                                        }
                                                        )
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-6 gap-2">
                                                    {heatmap.bins.map((bin) => (
                                                        <div
                                                            key={bin}
                                                            className="text-center p-2 bg-neutral-50 rounded"
                                                        >
                                                            {bin}
                                                            <div className="text-xl font-black">
                                                                {heatmap
                                                                    .heatmap[
                                                                    role
                                                                ][bin] || 0}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            ) : (
                                <div className="p-10 text-center text-neutral-400">
                                    No heatmap data available.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tab === "trends" && (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-neutral-50/50">
                            <h3 className="text-xl font-black text-black dark:text-white tracking-tight">
                                Role Trends
                            </h3>
                        </div>
                        <div className="p-6">
                            {trends ? (
                                <div className="space-y-4">
                                    {Object.keys(trends.trends || {}).map(
                                        (role) => (
                                            <div
                                                key={role}
                                                className="p-4 border rounded-lg"
                                            >
                                                <div className="font-bold mb-2">
                                                    {role}
                                                </div>
                                                <div className="flex gap-4 items-center">
                                                    {trends.trends[role].map(
                                                        (t) => (
                                                            <div
                                                                key={`${role}-${t.year}-${t.month}`}
                                                                className="text-center p-2 bg-neutral-50 rounded"
                                                            >
                                                                <div className="text-xs text-neutral-400">
                                                                    {t.month}/
                                                                    {t.year}
                                                                </div>
                                                                <div className="text-lg font-black">
                                                                    {t.avg_score ||
                                                                        "—"}
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            ) : (
                                <div className="p-10 text-center text-neutral-400">
                                    No trend data available.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tab === "risk" && (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-neutral-50/50">
                            <h3 className="text-xl font-black text-black dark:text-white tracking-tight">
                                Turnover Risk & Recommendations
                            </h3>
                        </div>
                        <div className="p-6">
                            {risk ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-neutral-50/50 text-[10px] font-black text-neutral-400 uppercase tracking-widest border-y border-slate-100">
                                                <th className="px-6 py-3">
                                                    Employee
                                                </th>
                                                <th className="px-6 py-3">
                                                    Role
                                                </th>
                                                <th className="px-6 py-3">
                                                    Avg Score
                                                </th>
                                                <th className="px-6 py-3">
                                                    Latest
                                                </th>
                                                <th className="px-6 py-3">
                                                    Decline
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {risk.at_risk.map((u) => (
                                                <tr key={u.user_id}>
                                                    <td className="px-6 py-4 font-bold">
                                                        {u.name}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {u.job_role || u.role}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {u.avg_score}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {u.latest_score}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {u.decline
                                                            ? "Yes"
                                                            : "No"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-10 text-center text-neutral-400">
                                    No risk data available.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tab === "framework" && (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-neutral-50/50">
                            <h3 className="text-xl font-black text-black dark:text-white tracking-tight">
                                KPI Framework Definition
                            </h3>
                            <button className="px-5 py-2.5 bg-neutral-900 dark:bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-orange-600 dark:hover:bg-orange-700 transition-all shadow-lg active:scale-95">
                                Add New Category
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {categories.map((cat) => (
                                <div
                                    key={cat.id}
                                    className="p-5 bg-slate-50 dark:bg-gray-800 rounded-lg border border-slate-100 dark:border-gray-700 relative group overflow-hidden"
                                >
                                    <div className="relative z-10">
                                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-700 border border-neutral-200 dark:border-gray-600 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4 font-black shadow-sm group-hover:rotate-6 transition-transform text-xs">
                                            # {cat.id}
                                        </div>
                                        <h4 className="font-black text-black dark:text-white mb-2">
                                            {cat.name}
                                        </h4>
                                        <p className="text-sm text-neutral-500 dark:text-gray-400 leading-relaxed mb-6 font-medium">
                                            {cat.description ||
                                                "No description provided for this category."}
                                        </p>
                                        <div className="flex gap-2">
                                            <button className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                                                Edit Framework
                                            </button>
                                        </div>
                                    </div>
                                    <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-orange-500/5 blur-2xl rounded-full"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
