import React, { useEffect, useState } from "react";
import axios from "axios";

export default function HRDashboard() {
    const [evaluations, setEvaluations] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tab, setTab] = useState("governance"); // governance | framework
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchEvaluations();
        fetchCategories();
    }, []);

    function fetchEvaluations() {
        setLoading(true);
        axios
            .get("/api/evaluations")
            .then((r) => setEvaluations(r.data.data || []))
            .finally(() => setLoading(false));
    }

    function fetchCategories() {
        axios.get("/api/kpi-categories")
            .then((r) => setCategories(r.data || []));
    }

    async function triggerGenerate() {
        if (!confirm("This will queue evaluation generation for all users for the current month. Continue?")) return;
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

    return (
        <div className="space-y-10 pb-20">
            {/* HR Executive Header */}
            <header className="relative p-10 rounded-4xl bg-linear-to-br from-indigo-950 to-slate-900 overflow-hidden shadow-2xl group border border-indigo-500/10">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 text-white">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-indigo-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] border border-indigo-400/20">Executive Suite</span>
                            <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Performance Governance</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                            HR <span className="text-indigo-500">Center</span>
                        </h2>
                        <p className="text-slate-400 font-medium max-w-sm">
                            Manage global performance assessments, define KPI frameworks, and publish official reviews.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={triggerGenerate}
                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black text-sm transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3 active:scale-95"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Initial Generation
                        </button>
                    </div>
                </div>
                {/* Accent */}
                <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[140%] bg-indigo-500/10 blur-[100px] rounded-full rotate-12 transition-transform duration-1000 group-hover:scale-110"></div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-200/50 backdrop-blur-md rounded-2xl w-fit self-start border border-slate-200">
                {[
                    { id: 'governance', name: 'Assessment Queue', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                    { id: 'framework', name: 'KPI Framework', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.id ? 'bg-white text-indigo-600 shadow-sm border border-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <svg className={`w-4 h-4 ${tab === t.id ? 'text-indigo-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
                        </svg>
                        {t.name}
                    </button>
                ))}
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {tab === 'governance' && (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Review & Publication Queue</h3>
                            <div className="flex gap-4">
                                <div className="px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100 italic">OFFICIAL RECORD</div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-[0.2em] text-xs transition-opacity duration-500 font-mono">Loading official stream...</div>
                        ) : evaluations.length === 0 ? (
                            <div className="p-20 text-center text-slate-300 font-bold italic">No evaluations found on record.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-y border-slate-100">
                                            <th className="px-10 py-5">Employee / User</th>
                                            <th className="px-10 py-5">Assessment Period</th>
                                            <th className="px-10 py-5">Current Status</th>
                                            <th className="px-10 py-5">Final Score</th>
                                            <th className="px-10 py-5 text-right">Official Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {evaluations.map((ev) => (
                                            <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xs">
                                                            {ev.user?.name?.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900">{ev.user?.name}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{ev.user?.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <span className="font-black text-slate-700">{ev.year} / {String(ev.month).padStart(2, '0')}</span>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${ev.status === 'published' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                            ev.status === 'approved' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                                'bg-orange-50 text-orange-600 border-orange-100'
                                                        }`}>
                                                        {ev.status}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6">
                                                    {ev.score !== null ? (
                                                        <span className="text-xl font-black text-indigo-600 tracking-tighter">{ev.score}<span className="text-[10px] text-slate-400 font-normal"> / 10</span></span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-300 italic">Pending Finalization</span>
                                                    )}
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    {ev.status === "approved" ? (
                                                        <button
                                                            onClick={() => publishEval(ev.id)}
                                                            className="px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                                                        >
                                                            Publish Review
                                                        </button>
                                                    ) : ev.status === "published" ? (
                                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">PUBLISHED</span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Superior</span>
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

                {tab === 'framework' && (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">KPI Framework Definition</h3>
                            <button className="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-all shadow-lg active:scale-95">
                                Add New Category
                            </button>
                        </div>
                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {categories.map(cat => (
                                <div key={cat.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative group overflow-hidden">
                                    <div className="relative z-10">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 mb-4 font-black shadow-sm group-hover:rotate-6 transition-transform text-xs">
                                            # {cat.id}
                                        </div>
                                        <h4 className="font-black text-slate-800 mb-2">{cat.name}</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed mb-6 font-medium">{cat.description || 'No description provided for this category.'}</p>
                                        <div className="flex gap-2">
                                            <button className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 transition-colors">Edit Framework</button>
                                        </div>
                                    </div>
                                    <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
