import React, { useEffect, useState } from "react";
import axios from "axios";

export default function SystemDashboard() {
    const [stats, setStats] = useState({ total_users: 0, pending_evaluations: 0, api_usage: 0 });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        // Placeholder stats fetch
        setTimeout(() => {
            setStats({ total_users: 15, pending_evaluations: 8, api_usage: 1250 });
            setLoading(false);
        }, 800);
    }, []);

    return (
        <div className="space-y-10 pb-20">
            <header className="relative p-10 rounded-4xl bg-neutral-900 text-white overflow-hidden shadow-2xl border border-white/5 group">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-orange-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-orange-400 uppercase tracking-widest border border-orange-400/20">Operational Intel</span>
                        </div>
                        <h2 className="text-4xl font-black tracking-tight">System <span className="text-orange-400">Governance</span></h2>
                        <p className="text-neutral-400 font-medium max-w-sm mt-1">Strategic oversight of organizational performance cycles and technical infrastructure.</p>
                    </div>
                </div>
                <div className="absolute top-[-50%] right-[-10%] w-[60%] h-[200%] bg-orange-600/10 blur-[120px] rounded-full rotate-45 transform transition-transform duration-1000 group-hover:rotate-90"></div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Network Entities', value: stats.total_users, sub: 'Active Personnel', color: 'indigo' },
                    { label: 'Pending Assessments', value: stats.pending_evaluations, sub: 'Action Required', color: 'orange' },
                    { label: 'API Consumption', value: `${stats.api_usage} tokens`, sub: 'Today\'s Utility', color: 'emerald' }
                ].map((s, i) => (
                    <div key={i} className="bg-white p-8 rounded-4xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                        <div className={`text-4xl font-black text-${s.color}-500 mb-1`}>{loading ? '...' : s.value}</div>
                        <div className="text-xs font-black text-slate-800 uppercase tracking-widest">{s.label}</div>
                        <div className="text-[10px] font-bold text-neutral-400 mt-4 uppercase tracking-tighter italic">{s.sub}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Performance Flow Mockup */}
                <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-10 h-96 flex flex-col">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Organizational Velocity</h3>
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Last 30 Days</span>
                    </div>
                    <div className="flex-1 flex items-end gap-4 px-2">
                        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95].map((h, i) => (
                            <div key={i} className="flex-1 bg-slate-50 rounded-t-2xl relative group/bar hover:bg-indigo-50 transition-colors">
                                <div className="absolute bottom-0 w-full bg-linear-to-t from-orange-600 to-indigo-400 rounded-2xl shadow-lg shadow-orange-500/20 group-hover/bar:from-orange-500 group-hover/bar:to-violet-500 transition-all duration-500" style={{ height: `${h}%` }}></div>
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10">{h}% Velocity</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* API Pulse Mockup */}
                <div className="bg-neutral-900 rounded-[3rem] shadow-2xl p-10 h-96 flex flex-col text-white relative overflow-hidden">
                    <div className="relative z-10 flex justify-between items-center mb-10">
                        <h3 className="text-xl font-black tracking-tight">API Node <span className="text-orange-400">Heartbeat</span></h3>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Systems Nominal</span>
                        </div>
                    </div>
                    <div className="relative z-10 flex-1 flex flex-col justify-center">
                        <svg className="w-full h-32 text-orange-500/30" viewBox="0 0 400 100" preserveAspectRatio="none">
                            <path d="M0,50 L20,50 L30,20 L40,80 L50,50 L100,50 L110,10 L120,90 L130,50 L250,50 L260,30 L270,70 L280,50 L400,50" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                            <path d="M0,50 L20,50 L30,20 L40,80 L50,50 L100,50 L110,10 L120,90 L130,50 L250,50 L260,30 L270,70 L280,50 L400,50" fill="none" stroke="white" strokeWidth="2" strokeDasharray="400" strokeDashoffset="400" className="animate-[dash_3s_linear_infinite]" />
                        </svg>
                    </div>
                    <div className="absolute inset-0 bg-linear-to-br from-orange-500/5 to-transparent pointer-events-none"></div>
                </div>
            </div>
        </div>
    );
}
