import React, { useState } from "react";

export default function SupervisorScoring({ evaluation, onSubmit }) {
    const [scores, setScores] = useState({});
    const [remarks, setRemarks] = useState("");

    const handleScoreChange = (catId, val) => {
        setScores({ ...scores, [catId]: val });
    }

    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 hover:shadow-2xl hover:shadow-orange-500/10 transition-all group overflow-hidden relative">
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="px-3 py-1 bg-indigo-50 text-orange-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100">Performance Assessment</span>
                            <span className="w-1.5 h-1.5 bg-indigo-200 rounded-full"></span>
                        </div>
                        <h4 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">{evaluation.user?.name}</h4>
                        <p className="text-sm font-bold text-neutral-400 mt-2 uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Period {evaluation.year}-{evaluation.month.toString().padStart(2, '0')}
                        </p>
                    </div>
                    <div className="w-20 h-20 rounded-3xl bg-neutral-900 flex items-center justify-center text-white shadow-2xl rotate-6 group-hover:rotate-0 transition-transform duration-500 border-4 border-white">
                        <span className="text-3xl font-black italic">!</span>
                    </div>
                </div>

                <div className="space-y-6 mb-10">
                    {Object.values(evaluation.breakdown || {}).map(cat => (
                        <div key={cat.category_id} className="p-8 bg-slate-50 rounded-4xl border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all group/card">
                            <div className="flex justify-between items-center mb-6">
                                <div className="space-y-1">
                                    <span className="font-black text-slate-800 text-base block">{cat.category_name}</span>
                                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Statistical Accuracy</span>
                                </div>
                                <div className="flex gap-3">
                                    <div className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-xl border border-blue-100">
                                        RULE: {cat.rule_score}
                                    </div>
                                    <div className="px-3 py-1.5 bg-violet-50 text-violet-600 text-[10px] font-black rounded-xl border border-violet-100">
                                        AI: {cat.llm_score || 'N/A'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex-1 space-y-4">
                                    <input
                                        type="range"
                                        min="0" max="10" step="0.5"
                                        className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                                        value={scores[cat.category_id] || 0}
                                        onChange={(e) => handleScoreChange(cat.category_id, e.target.value)}
                                    />
                                    <div className="flex justify-between px-1">
                                        <span className="text-[9px] font-black text-slate-300 uppercase">Underperform</span>
                                        <span className="text-[9px] font-black text-orange-400 uppercase italic">Target</span>
                                        <span className="text-[9px] font-black text-slate-300 uppercase">Exceed</span>
                                    </div>
                                </div>
                                <div className="w-16 h-14 bg-white border-2 border-indigo-100 rounded-2xl flex items-center justify-center font-black text-orange-600 text-lg shadow-xl shadow-orange-500/10 ring-4 ring-indigo-50">
                                    {scores[cat.category_id] || 0}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-4 mb-10">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] px-2 italic">Qualitative Feedback (Optional)</label>
                    <textarea
                        className="w-full bg-slate-50 border-slate-100 rounded-4xl px-8 py-6 text-sm font-bold text-neutral-700 focus:ring-4 focus:ring-orange-500/10 focus:bg-white transition-all border-2"
                        rows={3}
                        placeholder="Provide strategic context or mentorship notes..."
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                    />
                </div>

                <button
                    onClick={() => onSubmit(evaluation.id, scores, remarks)}
                    className="w-full py-6 bg-neutral-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] hover:bg-orange-600 transition-all shadow-2xl shadow-slate-900/30 active:scale-[0.98] border border-white/10"
                >
                    Finalize Professional Review
                </button>
            </div>
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-orange-500/10 transition-colors duration-1000"></div>
        </div>
    );
}
