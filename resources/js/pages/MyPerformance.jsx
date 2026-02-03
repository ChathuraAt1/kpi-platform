import React from "react";
import KPIBreakdown from "../components/KPIBreakdown";
import { useAuth } from "../contexts/AuthContext";

export default function MyPerformance() {
    const { user } = useAuth();

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">My Performance</h2>
                    <p className="text-slate-500 font-medium">Historical KPI insights and assessment breakdown.</p>
                </div>
                <div className="flex items-center gap-3 relative z-10 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                </div>
                {/* Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-slate-800">Latest Assessment</h3>
                            <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Assessment History &rarr;</button>
                        </div>
                        {user && <KPIBreakdown userId={user.id} />}
                    </section>

                    <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="text-xl font-bold text-slate-800 mb-6">Productivity Trend</h3>
                        <div className="h-64 flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-medium">
                            Trend Visualization (In Development)
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <section className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl shadow-indigo-900/20 relative overflow-hidden">
                        <h3 className="text-lg font-bold mb-4 relative z-10">Quick Tip</h3>
                        <p className="text-indigo-100 text-sm leading-relaxed relative z-10 opactiy-90">
                            Consistently filling your morning plans and updating task logs daily improves your 'Rule-Based' scoring.
                        </p>
                        <div className="absolute bottom-[-20%] right-[-10%] w-32 h-32 bg-white/10 blur-2xl rounded-full"></div>
                    </section>

                    <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Job Description Summary</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            Your performance is measured against your core responsibilities defined for the <strong>{user?.role}</strong> role.
                        </p>
                        <button className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all border border-slate-200">
                            View Full Job Description
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}
