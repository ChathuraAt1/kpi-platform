import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function SubordinateDetails() {
    const { id } = useParams();
    const [sub, setSub] = useState(null);
    const [recentLogs, setRecentLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        axios.get(`/api/users/${id}/progress`)
            .then(r => {
                setSub(r.data.user);
                setRecentLogs(r.data.recent_logs || []);
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading || !sub) return <div className="p-20 text-center animate-pulse text-orange-500 font-black uppercase tracking-widest">Loading Subordinate Matrix...</div>;

    return (
        <div className="space-y-10 pb-20 max-w-6xl mx-auto">
            <header className="relative p-10 rounded-4xl bg-neutral-900 text-white overflow-hidden shadow-2xl border border-orange-500/10">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-orange-500 to-violet-600 flex items-center justify-center text-3xl font-black shadow-2xl shadow-orange-500/30">
                            {sub.name.charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="px-2.5 py-1 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest">Subordinate Analytics</span>
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            </div>
                            <h2 className="text-4xl font-black tracking-tight">{sub.name}</h2>
                            <p className="text-neutral-400 font-medium">{sub.role} • {sub.email}</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/5 text-center min-w-[140px]">
                            <div className="text-3xl font-black text-orange-400">8.4</div>
                            <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-1">Avg Score</div>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-[50%] h-full bg-linear-to-l from-orange-500/10 to-transparent pointer-events-none"></div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Recent Productivity Flow */}
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-10 py-8 border-b border-slate-50 bg-neutral-50/50 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Recent Activity Stream</h3>
                            <button className="text-[10px] font-black text-orange-600 uppercase tracking-widest">View Full Archive</button>
                        </div>
                        <div className="p-10 space-y-6">
                            {recentLogs.map(log => (
                                <div key={log.id} className="flex gap-6 relative group">
                                    <div className="flex flex-col items-center">
                                        <div className="w-3 h-3 rounded-full bg-orange-500 ring-4 ring-indigo-50 z-10"></div>
                                        <div className="w-0.5 h-full bg-slate-100 absolute top-3 bottom-0 group-last:hidden"></div>
                                    </div>
                                    <div className="flex-1 pb-10">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{log.date}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${log.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                                {log.status}
                                            </span>
                                        </div>
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group-hover:border-indigo-200 group-hover:bg-white transition-all shadow-sm hover:shadow-lg">
                                            <p className="text-sm font-bold text-slate-800 mb-2 leading-relaxed">{log.description}</p>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {log.duration_hours}h
                                                </span>
                                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Weight: {log.weight || 10}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Personal Matrix */}
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 space-y-6">
                        <h3 className="text-lg font-black text-slate-800 tracking-tight mb-2">KPI Matrix</h3>
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between items-end px-1">
                                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis">Technical Velocity</span>
                                        <span className="text-xs font-black text-orange-600">85%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500 rounded-full" style={{ width: '85%' }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shift Intelligence */}
                    <div className="bg-orange-600 rounded-[2.5rem] shadow-xl shadow-orange-600/20 p-8 text-white">
                        <div className="flex items-center gap-3 mb-6">
                            <svg className="w-5 h-5 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-200">Shift Configuration</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] font-black text-orange-300 uppercase tracking-widest opacity-60">Arrival</div>
                                <div className="text-xl font-black">{sub.work_start_time || '09:00'}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-orange-300 uppercase tracking-widest opacity-60">Departure</div>
                                <div className="text-xl font-black">{sub.work_end_time || '18:00'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
