import React, { useState, useEffect } from "react";
import TaskLogGrid from "../components/TaskLogGrid";
import MorningPlan from "../components/MorningPlan";
import { useAuth } from "../contexts/AuthContext";

export default function EmployeeDashboard() {
    const { user, loading } = useAuth();
    const [refreshLogs, setRefreshLogs] = useState(0);
    const [today, setToday] = useState(new Date().toISOString().slice(0, 10));

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium animate-pulse">Initializing your workspace...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 pb-20">
            {/* Dynamic Welcome Header */}
            <header className="relative p-10 rounded-[2.5rem] bg-indigo-900 overflow-hidden shadow-2xl shadow-indigo-900/20 group">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Daily Flow</span>
                            <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                            <span className="text-indigo-200/60 text-xs font-medium uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                            Focus on <span className="text-indigo-400">Today</span>
                        </h2>
                        <p className="text-indigo-100/70 font-medium max-w-md">
                            Welcome back, {user?.name.split(' ')[0]}. Let's make today productive. Your target is consistency.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl p-4 rounded-3xl border border-white/10 self-start md:self-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30">
                            <svg className="w-6 h-6 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex flex-col pr-4">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-1">Shift Hours</span>
                            <span className="text-white font-bold text-lg leading-none">{user?.work_start_time || '08:30'} - {user?.work_end_time || '17:30'}</span>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[140%] bg-indigo-400/10 blur-[100px] rounded-full rotate-12 transition-transform duration-1000 group-hover:scale-110"></div>
                <div className="absolute bottom-[-50%] left-[-5%) w-64 h-64 bg-violet-500/20 blur-[80px] rounded-full pointer-events-none"></div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* Left: Morning Plan (The Intention) */}
                <div className="xl:col-span-4 space-y-8 sticky top-24 transition-all duration-500 hover:-translate-y-1">
                    <div className="bg-white p-8 rounded-4xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 border border-orange-200">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">Morning Intentions</h3>
                                <p className="text-xs font-medium text-slate-400">Plan your day before starting.</p>
                            </div>
                        </div>
                        <MorningPlan onPlanSubmitted={() => setRefreshLogs(prev => prev + 1)} />
                    </div>

                    {/* Productivity Tip Card */}
                    <div className="bg-linear-to-br from-slate-900 to-slate-800 p-8 rounded-4xl text-white shadow-xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <h4 className="font-bold text-indigo-400 mb-2">Pro Tip</h4>
                            <p className="text-slate-300 text-sm leading-relaxed mb-6">
                                Breaking down large tasks into smaller sub-tasks helps maintaining a consistent <span className="text-white font-bold italic">flow state</span>.
                            </p>
                            <button className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">Learn More &rarr;</button>
                        </div>
                        <div className="absolute bottom-[-20%] right-[-10%] w-32 h-32 bg-indigo-500/10 blur-2xl rounded-full transition-transform duration-700 group-hover:scale-150"></div>
                    </div>
                </div>

                {/* Right: Task Log (The Execution) */}
                <div className="xl:col-span-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                    <div className="bg-white p-1 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
                        <div className="px-8 pt-8 pb-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Timeline & Logs</h3>
                                    <p className="text-xs font-medium text-slate-400">Execute and track your daily progress.</p>
                                </div>
                            </div>

                            {/* Simple Legend/Status */}
                            <div className="items-center gap-6 hidden md:flex">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Planned</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 px-4 pb-4">
                            <TaskLogGrid key={refreshLogs} initialDate={today} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
