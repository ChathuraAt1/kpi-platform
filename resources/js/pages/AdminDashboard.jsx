import React, { useState, useEffect } from "react";
import axios from "axios";

export default function AdminDashboard() {
    const [stats, setStats] = useState({ total_users: 0, active_keys: 0, system_health: 'Optimal' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Mocking system stats for now
        setStats({
            total_users: 124,
            active_keys: 8,
            system_health: 'Optimal'
        });
    }, []);

    return (
        <div className="space-y-10 pb-20">
            {/* System Control Header */}
            <header className="relative p-6 rounded-lg bg-slate-950 dark:bg-gray-900 overflow-hidden shadow-2xl group border border-neutral-800 dark:border-gray-700">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 text-white">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-white/5 backdrop-blur-md rounded-full text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] border border-white/10">System Nexus</span>
                            <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                            <span className="text-emerald-500 text-xs font-black uppercase tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                {stats.system_health}
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                            Admin <span className="text-orange-500">Nexus</span>
                        </h2>
                        <p className="text-neutral-500 dark:text-gray-400 font-medium max-w-sm">
                            Infrastructure governance portal. Manage API repositories, user orchestrations, and global system parameters.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 dark:bg-gray-800/50 backdrop-blur-xl p-5 rounded-lg border border-white/5 dark:border-gray-700 min-w-[160px] group-hover:border-orange-500/20 transition-colors">
                            <div className="text-white dark:text-white text-3xl font-black mb-1">{stats.total_users}</div>
                            <div className="text-[10px] font-bold text-neutral-500 dark:text-gray-400 uppercase tracking-widest leading-none">Registered Entities</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/5 min-w-[160px] group-hover:border-orange-500/20 transition-colors">
                            <div className="text-orange-500 dark:text-orange-400 text-3xl font-black mb-1">{stats.active_keys}</div>
                            <div className="text-[10px] font-bold text-neutral-500 dark:text-gray-400 uppercase tracking-widest leading-none">Active AI Nodes</div>
                        </div>
                    </div>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #4f46e5 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                <div className="absolute bottom-[-50%] right-[-10%] w-96 h-96 bg-orange-600/10 blur-[120px] rounded-full"></div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* API Management Card */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-slate-100 dark:border-gray-700 hover:shadow-xl hover:shadow-orange-500/5 dark:hover:shadow-orange-900/20 transition-all group">
                    <div className="w-14 h-14 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-8 border border-orange-100 dark:border-orange-800 group-hover:bg-orange-600 dark:group-hover:bg-orange-700 group-hover:text-white dark:group-hover:text-white transition-all">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-black text-black dark:text-white mb-2 tracking-tight">API Repository</h3>
                    <p className="text-sm text-neutral-500 font-medium leading-relaxed mb-8">
                        Configure AI provider keys, manage failover priorities, and monitor endpoint health across Google, Azure, and OpenAI.
                    </p>
                    <a href="/api-keys" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-500 transition-colors">
                        Enter Repository &rarr;
                    </a>
                </div>

                {/* User Orchestration Card */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-slate-100 dark:border-gray-700 hover:shadow-xl hover:shadow-orange-500/5 dark:hover:shadow-orange-900/20 transition-all group">
                    <div className="w-14 h-14 rounded-lg bg-slate-50 dark:bg-gray-700 flex items-center justify-center text-slate-600 dark:text-gray-300 mb-8 border border-slate-100 dark:border-gray-600 group-hover:bg-neutral-900 dark:group-hover:bg-orange-600 group-hover:text-white dark:group-hover:text-white transition-all">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-black text-black dark:text-white mb-2 tracking-tight">Entity Directory</h3>
                    <p className="text-sm text-neutral-500 font-medium leading-relaxed mb-8">
                        Manage user accounts, assign roles, and define the supervisor hierarchy for the recursive reporting structure.
                    </p>
                    <a href="/admin/users" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-black dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors">
                        Manage Entities &rarr;
                    </a>
                </div>

                {/* Global Configuration Card */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-slate-100 dark:border-gray-700 hover:shadow-xl hover:shadow-orange-500/5 dark:hover:shadow-orange-900/20 transition-all group">
                    <div className="w-14 h-14 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-8 border border-amber-100 dark:border-amber-800 group-hover:bg-amber-500 dark:group-hover:bg-amber-600 group-hover:text-white dark:group-hover:text-white transition-all">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-black text-black dark:text-white mb-2 tracking-tight">System Parameters</h3>
                    <p className="text-sm text-neutral-500 font-medium leading-relaxed mb-8">
                        Define global work shifts, break intervals, and system-wide evaluation deadlines for all departments.
                    </p>
                    <a href="/admin/settings" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-500 transition-colors">
                        Configure Parameters &rarr;
                    </a>
                </div>
            </div>
        </div>
    );
}
