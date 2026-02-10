import React, { useState, useEffect } from "react";
import TaskLogGrid from "../components/TaskLogGrid";
import MorningPlan from "../components/MorningPlan";
import DeadlineTimer from "../components/DeadlineTimer";
import { useAuth } from "../contexts/AuthContext";
import { getTrustedTime } from "../utils/timeSync";
import { useTheme } from "../contexts/ThemeContext";

export default function EmployeeDashboard() {
    const { user, loading: authLoading } = useAuth();
    const [refreshLogs, setRefreshLogs] = useState(0);
    const [today, setToday] = useState(new Date().toISOString().slice(0, 10));
    const [trustedTime, setTrustedTime] = useState(null);
    const [loading, setLoading] = useState(true);

    // New state for employee dashboard features
    const [lastEvaluation, setLastEvaluation] = useState(null);
    const [dailyProductivity, setDailyProductivity] = useState(null);
    const [submissionStreak, setSubmissionStreak] = useState(null);
    const [suggestions, setSuggestions] = useState(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function syncTime() {
            const time = await getTrustedTime();
            setTrustedTime(time);
            setLoading(false);
        }
        syncTime();
    }, []);

    // Fetch employee dashboard data
    useEffect(() => {
        if (authLoading || loading) return;

        async function fetchDashboardData() {
            try {
                setDataLoading(true);
                setError(null);

                // Fetch last evaluation scores
                const evalRes = await fetch("/api/user/last-evaluation-scores");
                if (evalRes.ok) {
                    const data = await evalRes.json();
                    if (data.status === "success") {
                        setLastEvaluation(data.data);
                    }
                }

                // Fetch daily productivity
                const prodRes = await fetch(
                    "/api/user/daily-productivity?date=" + today,
                );
                if (prodRes.ok) {
                    const data = await prodRes.json();
                    if (data.status === "success") {
                        setDailyProductivity(data.data);
                    }
                }

                // Fetch submission streak
                const streakRes = await fetch(
                    "/api/user/submission-streak?days=30",
                );
                if (streakRes.ok) {
                    const data = await streakRes.json();
                    if (data.status === "success") {
                        setSubmissionStreak(data.data);
                    }
                }

                // Fetch improvement suggestions
                const suggRes = await fetch(
                    "/api/user/improvement-suggestions?period=3",
                );
                if (suggRes.ok) {
                    const data = await suggRes.json();
                    if (data.status === "success") {
                        setSuggestions(data.data);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch dashboard data:", err);
                setError(err.message);
            } finally {
                setDataLoading(false);
            }
        }

        fetchDashboardData();
    }, [authLoading, loading, today]);

    if (authLoading || loading)
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="text-neutral-400 font-medium animate-pulse">
                        Initializing your workspace...
                    </p>
                </div>
            </div>
        );

    return (
        <div className="space-y-8">
            {/* Ultra-Premium Hero Header */}
            <header className="relative group perspective-1000">
                <div className="relative z-10 p-8 rounded-3xl bg-neutral-900 dark:bg-gray-800 border border-neutral-800 dark:border-gray-700 shadow-2xl shadow-black/20 overflow-hidden transition-all duration-700 hover:shadow-orange-500/10">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4 max-w-2xl">
                            <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-700">
                                <span className="px-5 py-2 bg-orange-500/10 backdrop-blur-md rounded-full text-xs font-black text-orange-400 uppercase tracking-[0.2em] border border-orange-500/20">
                                    Daily Flow
                                </span>
                                <div className="h-px w-8 bg-neutral-700"></div>
                                <span className="text-neutral-500 text-xs font-black uppercase tracking-[0.2em]">
                                    {new Date().toLocaleDateString("en-US", {
                                        weekday: "long",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </span>
                            </div>

                            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-[0.9] animate-in fade-in slide-in-from-left-8 duration-1000">
                                Good{" "}
                                {new Date().getHours() < 12
                                    ? "Morning"
                                    : new Date().getHours() < 17
                                        ? "Afternoon"
                                        : "Evening"}
                                ,<br />
                                <span className="bg-linear-to-r from-orange-400 via-orange-400 to-orange-400 bg-clip-text text-transparent">
                                    {user?.name
                                        ? user.name.split(" ")[0]
                                        : "there"}
                                </span>
                            </h1>

                            <p className="text-neutral-400 font-medium text-base max-w-lg leading-relaxed opacity-80 animate-in fade-in duration-1000 delay-300">
                                Let's make today productive and focused.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 self-start md:self-end animate-in fade-in slide-in-from-right-8 duration-1000">
                            <div className="flex items-center gap-6 p-5 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 ring-1 ring-white/5">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1.5 opacity-70">
                                        Shift Status
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-white font-black text-2xl tracking-tight leading-none italic uppercase">
                                            Active
                                        </span>
                                    </div>
                                </div>
                                <div className="h-10 w-px bg-white/10"></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1.5 opacity-70">
                                        Window
                                    </span>
                                    <span className="text-white font-black text-xl tracking-tighter leading-none opacity-90">
                                        {user?.work_start_time || "08:30"} —{" "}
                                        {user?.work_end_time || "17:30"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Architectural Accents */}
                    <div className="absolute top-0 right-0 w-2/3 h-full bg-linear-to-l from-orange-600/10 to-transparent blur-3xl rounded-full"></div>
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-fuchsia-600/10 blur-[100px] rounded-full"></div>

                    {/* Grid Pattern Overlay */}
                    <div
                        className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{
                            backgroundImage:
                                "radial-gradient(circle, white 1px, transparent 1px)",
                            backgroundSize: "32px 32px",
                        }}
                    ></div>
                </div>
            </header>

            {/* Deadline Timer */}
            <div className="animate-in fade-in slide-in-from-top duration-500 delay-100">
                <DeadlineTimer refreshInterval={30000} />
            </div>

            {/* Dashboard Workspace */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Left Column: Intention Setting */}
                <aside className="xl:col-span-4 space-y-8">
                    <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-gray-900/50 border border-slate-100 dark:border-gray-700 overflow-hidden relative group transition-all duration-500 hover:shadow-orange-500/10">
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <h3 className="text-xl font-black text-black dark:text-white tracking-tight">
                                        Morning Plan
                                    </h3>
                                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-1">
                                        Plan Your Day
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center shadow-lg shadow-slate-900/10">
                                        <svg
                                            className="w-5 h-5 text-white"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2.5}
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                        </svg>
                                    </div>
                                    <button
                                        onClick={() =>
                                            document
                                                .querySelector(
                                                    "[data-morning-plan-expand]",
                                                )
                                                ?.click()
                                        }
                                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-orange-100 dark:bg-gray-700 dark:hover:bg-orange-600 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                        title="Expand"
                                    >
                                        <svg
                                            className="w-5 h-5 text-slate-600 dark:text-gray-300"
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

                            <MorningPlan
                                onPlanSubmitted={() =>
                                    setRefreshLogs((prev) => prev + 1)
                                }
                            />
                        </div>

                        {/* Subliminal Accent */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50/50 dark:bg-orange-900/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-orange-100/50 dark:group-hover:bg-orange-800/30 transition-all"></div>
                    </section>

                    <section className="bg-neutral-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                <span className="text-xs font-black text-orange-400 uppercase tracking-widest">
                                    Productivity Tip
                                </span>
                            </div>
                            <h4 className="text-xl font-bold leading-tight">
                                Pro Tip
                            </h4>
                            <p className="text-neutral-400 text-sm font-medium leading-relaxed">
                                Breaking down large tasks into smaller sub-tasks
                                helps maintain focus and productivity.
                            </p>
                            <button className="pt-4 text-[10px] font-black uppercase tracking-[0.25em] text-white/50 hover:text-white transition-all flex items-center gap-2">
                                Learn More
                                <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                                    />
                                </svg>
                            </button>
                        </div>
                        <div className="absolute bottom-0 right-0 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-full group-hover:scale-125 transition-transform duration-1000"></div>
                    </section>

                    {/* Submission Streak */}
                    {submissionStreak && (
                        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-3xl p-6 shadow-lg border border-blue-200/50 dark:border-blue-900/50 overflow-hidden relative group">
                            <div className="relative z-10 space-y-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-black text-blue-900 dark:text-blue-100 tracking-tight">
                                            Submission Streak
                                        </h3>
                                        <p className="text-[10px] font-black text-blue-700/60 dark:text-blue-300/60 uppercase tracking-widest mt-1">
                                            Consistency Reward
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">🔥</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/60 dark:bg-blue-900/20 rounded-2xl p-4 backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/50">
                                        <p className="text-[10px] font-black text-blue-700/70 dark:text-blue-300/70 uppercase tracking-wider mb-2">
                                            Current
                                        </p>
                                        <p className="text-3xl font-black text-blue-900 dark:text-blue-100">
                                            {
                                                submissionStreak.data
                                                    .current_streak
                                            }
                                        </p>
                                        <p className="text-[9px] text-blue-600/60 dark:text-blue-400/60 mt-1">
                                            days
                                        </p>
                                    </div>
                                    <div className="bg-white/60 dark:bg-blue-900/20 rounded-2xl p-4 backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/50">
                                        <p className="text-[10px] font-black text-blue-700/70 dark:text-blue-300/70 uppercase tracking-wider mb-2">
                                            Longest
                                        </p>
                                        <p className="text-3xl font-black text-blue-900 dark:text-blue-100">
                                            {
                                                submissionStreak.data
                                                    .longest_streak
                                            }
                                        </p>
                                        <p className="text-[9px] text-blue-600/60 dark:text-blue-400/60 mt-1">
                                            days
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-2 text-[11px] text-blue-700/70 dark:text-blue-300/70 font-medium text-center">
                                    {submissionStreak.data.current_streak > 0
                                        ? "Keep up the streak! 🚀"
                                        : "Start your streak by submitting today"}
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl -mr-12 -mt-12 group-hover:scale-125 transition-transform"></div>
                        </section>
                    )}

                    {/* Daily Productivity Score */}
                    {dailyProductivity && (
                        <section className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-3xl p-6 shadow-lg border border-emerald-200/50 dark:border-emerald-900/50 overflow-hidden relative group">
                            <div className="relative z-10 space-y-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-100 tracking-tight">
                                            Today's Score
                                        </h3>
                                        <p className="text-[10px] font-black text-emerald-700/60 dark:text-emerald-300/60 uppercase tracking-widest mt-1">
                                            Productivity Metric
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-baseline gap-2">
                                    <div className="text-5xl font-black text-emerald-900 dark:text-emerald-100">
                                        {Math.round(
                                            dailyProductivity.productivity_score,
                                        )}
                                    </div>
                                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                        / 100
                                    </span>
                                </div>

                                <div className="w-full bg-white/40 dark:bg-emerald-900/20 rounded-full h-3 overflow-hidden border border-emerald-100/50 dark:border-emerald-800/50">
                                    <div
                                        className="h-full bg-linear-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000"
                                        style={{
                                            width: `${Math.min(
                                                100,
                                                dailyProductivity.productivity_score,
                                            )}%`,
                                        }}
                                    ></div>
                                </div>

                                <div className="text-[11px] text-emerald-700/70 dark:text-emerald-300/70 font-medium space-y-1">
                                    <p>
                                        📊 {dailyProductivity.log_count} tasks
                                        logged
                                    </p>
                                    <p>
                                        ⏱️ {dailyProductivity.total_hours} hours
                                        worked
                                    </p>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl -mr-12 -mt-12 group-hover:scale-125 transition-transform"></div>
                        </section>
                    )}

                    {/* Last Evaluation */}
                    {lastEvaluation && (
                        <section className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-3xl p-6 shadow-lg border border-purple-200/50 dark:border-purple-900/50 overflow-hidden relative group">
                            <div className="relative z-10 space-y-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-black text-purple-900 dark:text-purple-100 tracking-tight">
                                            Last Evaluation
                                        </h3>
                                        <p className="text-[10px] font-black text-purple-700/60 dark:text-purple-300/60 uppercase tracking-widest mt-1">
                                            {lastEvaluation.period.month_name}{" "}
                                            {lastEvaluation.period.year}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/60 dark:bg-purple-900/20 rounded-2xl p-4 backdrop-blur-sm border border-purple-100/50 dark:border-purple-800/50">
                                        <p className="text-[10px] font-black text-purple-700/70 dark:text-purple-300/70 uppercase tracking-wider mb-2">
                                            Final Score
                                        </p>
                                        <p className="text-4xl font-black text-purple-900 dark:text-purple-100">
                                            {lastEvaluation.scores.final || "-"}
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        {lastEvaluation.scores.supervisor && (
                                            <div className="bg-white/60 dark:bg-purple-900/20 rounded-xl p-3 backdrop-blur-sm border border-purple-100/50 dark:border-purple-800/50">
                                                <p className="text-[8px] font-black text-purple-700/70 dark:text-purple-300/70 uppercase tracking-wider mb-1">
                                                    Supervisor
                                                </p>
                                                <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                                                    {
                                                        lastEvaluation.scores
                                                            .supervisor
                                                    }
                                                </p>
                                            </div>
                                        )}
                                        {lastEvaluation.scores.hr && (
                                            <div className="bg-white/60 dark:bg-purple-900/20 rounded-xl p-3 backdrop-blur-sm border border-purple-100/50 dark:border-purple-800/50">
                                                <p className="text-[8px] font-black text-purple-700/70 dark:text-purple-300/70 uppercase tracking-wider mb-1">
                                                    HR Score
                                                </p>
                                                <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                                                    {lastEvaluation.scores.hr}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button className="w-full text-[10px] font-black text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 uppercase tracking-widest py-3 transition-all">
                                    View Details →
                                </button>
                            </div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/10 rounded-full blur-3xl -mr-12 -mt-12 group-hover:scale-125 transition-transform"></div>
                        </section>
                    )}

                    {/* Improvement Suggestions */}
                    {suggestions && suggestions.data.suggestions.length > 0 && (
                        <section className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-3xl p-6 shadow-lg border border-amber-200/50 dark:border-amber-900/50 overflow-hidden relative group">
                            <div className="relative z-10 space-y-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-black text-amber-900 dark:text-amber-100 tracking-tight">
                                            Improvement Tips
                                        </h3>
                                        <p className="text-[10px] font-black text-amber-700/60 dark:text-amber-300/60 uppercase tracking-widest mt-1">
                                            Based on Your Performance
                                        </p>
                                    </div>
                                    <span className="text-base">💡</span>
                                </div>

                                <div className="space-y-3">
                                    {suggestions.data.suggestions
                                        .slice(0, 2)
                                        .map((sugg, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-white/60 dark:bg-amber-900/20 rounded-xl p-3 backdrop-blur-sm border border-amber-100/50 dark:border-amber-800/50"
                                            >
                                                <p className="text-xs font-black text-amber-900 dark:text-amber-100 mb-1">
                                                    {sugg.title}
                                                </p>
                                                <p className="text-[11px] text-amber-700/70 dark:text-amber-300/70 line-clamp-2">
                                                    {sugg.description}
                                                </p>
                                            </div>
                                        ))}
                                </div>

                                {suggestions.data.suggestions.length > 2 && (
                                    <button className="w-full text-[10px] font-black text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 uppercase tracking-widest py-3 transition-all">
                                        View All Tips →
                                    </button>
                                )}
                            </div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl -mr-12 -mt-12 group-hover:scale-125 transition-transform"></div>
                        </section>
                    )}
                </aside>

                {/* Right Column: Task Log */}
                <main className="xl:col-span-8 flex flex-col h-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    <div className="flex-1 flex flex-col">
                        <TaskLogGrid
                            key={refreshLogs}
                            initialDate={today}
                            trustedDate={trustedTime?.date}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
