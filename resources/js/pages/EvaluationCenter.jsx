import React, { useEffect, useState } from "react";
import axios from "axios";

export default function EvaluationCenter() {
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [triggerData, setTriggerData] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    const [showTriggerModal, setShowTriggerModal] = useState(false);

    useEffect(() => {
        fetchEvaluations();
    }, []);

    function fetchEvaluations() {
        setLoading(true);
        axios.get("/api/evaluations")
            .then(r => setEvaluations(r.data.data || []))
            .finally(() => setLoading(false));
    }

    function handleTrigger() {
        axios.post("/api/evaluations/trigger", triggerData)
            .then(() => {
                setShowTriggerModal(false);
                fetchEvaluations();
                alert("Evaluation cycle triggered!");
            });
    }

    function handlePublish(id) {
        axios.post(`/api/evaluations/${id}/publish`)
            .then(() => fetchEvaluations());
    }

    return (
        <div className="space-y-10 pb-20">
            <header className="relative p-10 rounded-4xl bg-linear-to-br from-slate-900 to-indigo-950 text-white overflow-hidden shadow-2xl border border-orange-500/10">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-orange-400 uppercase tracking-widest border border-white/5">Governance Hub</span>
                        </div>
                        <h2 className="text-4xl font-black tracking-tight">Evaluation <span className="text-orange-400">Vault</span></h2>
                        <p className="text-neutral-400 font-medium max-w-sm mt-1">Manage performance cycles, review calculated scores, and authorize final reports.</p>
                    </div>
                    <button
                        onClick={() => setShowTriggerModal(true)}
                        className="px-8 py-4 bg-orange-600 text-white rounded-3xl font-black text-sm hover:bg-orange-500 transition-all shadow-xl shadow-orange-600/20 active:scale-95 border border-orange-400/30"
                    >
                        Trigger New Cycle
                    </button>
                </div>
            </header>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-neutral-50/50">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Active Assessment Queue</h3>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full uppercase tracking-tighter">Needs Review</span>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-tighter">Ready to Publish</span>
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 text-center animate-pulse text-orange-500 font-black uppercase tracking-widest">Compiling matrix...</div>
                ) : evaluations.length === 0 ? (
                    <div className="p-20 text-center text-slate-300 font-bold italic">No evaluations found in this sector.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-neutral-50/50 text-[10px] font-black text-neutral-400 uppercase tracking-widest border-y border-slate-100">
                                    <th className="px-10 py-5">Employee</th>
                                    <th className="px-10 py-5">Period</th>
                                    <th className="px-10 py-5">Matrix Result</th>
                                    <th className="px-10 py-5">Flow Status</th>
                                    <th className="px-10 py-5 text-right">Strategic Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {evaluations.map((ev) => (
                                    <tr key={ev.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs border border-neutral-200">
                                                    {ev.user?.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-800 block">{ev.user?.name}</span>
                                                    <span className="text-[10px] text-neutral-400 font-black uppercase tracking-tighter italic">{ev.user?.role}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-sm font-bold text-neutral-500">{ev.year}-{ev.month.toString().padStart(2, '0')}</td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-lg font-black ${ev.score >= 8 ? 'text-emerald-500' : ev.score >= 6 ? 'text-amber-500' : 'text-neutral-400'}`}>
                                                    {ev.score || '—'}
                                                </span>
                                                {ev.score && (
                                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden flex shrink-0">
                                                        <div className={`h-full rounded-full ${ev.score >= 8 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${ev.score * 10}%` }}></div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${ev.status === 'published' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                    ev.status === 'approved' ? 'bg-indigo-50 text-orange-600 border border-indigo-100' :
                                                        'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                {ev.status}
                                            </span>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            {ev.status === 'approved' ? (
                                                <button
                                                    onClick={() => handlePublish(ev.id)}
                                                    className="px-5 py-2.5 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
                                                >
                                                    Publish Report
                                                </button>
                                            ) : ev.status === 'published' ? (
                                                <span className="text-[10px] font-black text-slate-300 uppercase italic">Archive Locked</span>
                                            ) : (
                                                <span className="text-[10px] font-black text-neutral-400 uppercase">Awaiting Supervisor</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showTriggerModal && (
                <div className="fixed inset-0 bg-neutral-900/80 backdrop-blur-xl flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full p-10 animate-in slide-in-from-bottom-8 duration-500">
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Initiate <span className="text-orange-600">Cycle</span></h3>
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-8">System-wide performance capture</p>

                        <div className="space-y-6 mb-10">
                            <div>
                                <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Reporting Year</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-50 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-neutral-700"
                                    value={triggerData.year}
                                    onChange={e => setTriggerData({ ...triggerData, year: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Reporting Month</label>
                                <select
                                    className="w-full bg-slate-50 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-neutral-700"
                                    value={triggerData.month}
                                    onChange={e => setTriggerData({ ...triggerData, month: e.target.value })}
                                >
                                    {[...Array(12)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setShowTriggerModal(false)} className="flex-1 py-4 text-neutral-400 font-black text-[10px] uppercase tracking-[0.2em]">Abort</button>
                            <button onClick={handleTrigger} className="flex-1 py-4 bg-neutral-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-orange-600 transition-all active:scale-95">Commit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
