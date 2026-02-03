import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import SupervisorScoring from "../components/SupervisorScoring";

export default function SupervisorDashboard() {
    const { user } = useAuth();
    const [tab, setTab] = useState("logs"); // logs | evaluations | team
    const [pendingLogs, setPendingLogs] = useState([]);
    const [pendingEvals, setPendingEvals] = useState([]);
    const [teamStats, setTeamStats] = useState({ total_subordinates: 0, active_today: 0 });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchLogs();
        fetchEvaluations();
        fetchTeamStats();
    }, [user]);

    function fetchLogs() {
        setLoading(true);
        axios.get("/api/task-logs?status=pending")
            .then((r) => setPendingLogs(r.data.data || []))
            .finally(() => setLoading(false));
    }

    function fetchEvaluations() {
        axios.get("/api/evaluations?status=pending&team_view=1")
            .then((r) => setPendingEvals(r.data.data || []));
    }

    function fetchTeamStats() {
        // Placeholder for real team stats.
        // In a real app, this might be a specialized endpoint.
        setTeamStats({
            total_subordinates: user?.all_subordinate_ids?.length || 0,
            active_today: Math.floor((user?.all_subordinate_ids?.length || 0) * 0.8) // Mocked
        });
    }

    async function handleLogAction(id, action) {
        try {
            await axios.post(`/api/task-logs/${id}/${action}`);
            fetchLogs();
        } catch (e) {
            alert("Action failed");
        }
    }

    async function submitScore(evalId, scores) {
        try {
            await axios.post(`/api/evaluations/${evalId}/approve`, { supervisor_score: scores });
            fetchEvaluations();
            alert("Evaluation approved!");
        } catch (e) {
            alert("Failed to submit score");
        }
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Team Overview Header */}
            <header className="relative p-10 rounded-4xl bg-slate-900 overflow-hidden shadow-2xl group">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 text-white">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Management Center</span>
                            <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Team Supervision</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                            Team <span className="text-indigo-500">Pulse</span>
                        </h2>
                        <p className="text-slate-400 font-medium max-w-sm">
                            Monitor progress, approve logs, and evaluate performance for your direct and indirect reports.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 min-w-[160px]">
                            <div className="text-indigo-400 text-3xl font-black mb-1">{teamStats.total_subordinates}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Total Team</div>
                        </div>
                        <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg shadow-indigo-600/20 min-w-[160px]">
                            <div className="text-white text-3xl font-black mb-1">{pendingLogs.length}</div>
                            <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest leading-none">Pending Logs</div>
                        </div>
                    </div>
                </div>
                {/* Accent */}
                <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[140%] bg-indigo-500/10 blur-[100px] rounded-full rotate-12 transition-transform duration-1000 group-hover:scale-110"></div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-200/50 backdrop-blur-md rounded-2xl w-fit self-start border border-slate-200">
                {[
                    { id: 'logs', name: 'Log Approval', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                    { id: 'evaluations', name: 'Monthly Reviews', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
                    { id: 'team', name: 'My Team', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }
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

            {/* Content Area */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {tab === 'logs' && (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Pending Task Logs</h3>
                            <div className="px-4 py-1.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-widest border border-orange-200 italic">ACTION REQUIRED</div>
                        </div>

                        {loading ? (
                            <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-[0.2em] text-xs transition-opacity duration-500">Synchronizing Data...</div>
                        ) : pendingLogs.length === 0 ? (
                            <div className="p-20 text-center text-slate-400">
                                <svg className="w-16 h-16 mx-auto mb-4 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
                                </svg>
                                <p className="font-bold text-lg text-slate-300">No logs to approve!</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-y border-slate-100">
                                            <th className="px-10 py-5">Employee</th>
                                            <th className="px-10 py-5">Date</th>
                                            <th className="px-10 py-5">Activity Details</th>
                                            <th className="px-10 py-5">Time spent</th>
                                            <th className="px-10 py-5 text-right">Verification</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {pendingLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs ring-2 ring-white">
                                                            {log.user?.name?.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{log.user?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6 text-sm font-medium text-slate-500 italic">{log.date}</td>
                                                <td className="px-10 py-6">
                                                    <p className="text-sm font-semibold text-slate-700 max-w-sm truncate whitespace-nowrap">{log.description}</p>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Task ID: {log.task_id || 'Quick Log'}</span>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-600">{log.duration_hours}h</span>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleLogAction(log.id, 'approve')}
                                                            className="px-4 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/30"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleLogAction(log.id, 'reject')}
                                                            className="px-4 py-2 bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-100"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'evaluations' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {pendingEvals.length === 0 ? (
                            <div className="col-span-full bg-white p-20 rounded-4xl border border-slate-100 text-center text-slate-300 font-bold italic">
                                No evaluations pending your review for this period.
                            </div>
                        ) : (
                            pendingEvals.map(ev => (
                                <SupervisorScoring key={ev.id} evaluation={ev} onSubmit={submitScore} />
                            ))
                        )}
                    </div>
                )}

                {tab === 'team' && (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Direct & Indirect Reports</h3>
                            <button className="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                                Hierarchy View
                            </button>
                        </div>
                        <div className="p-10">
                            <SubordinateList />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


function SubordinateList() {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        axios.get("/api/users?team_view=1")
            .then(r => setTeam(r.data.data || []))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center p-10 font-black text-slate-300 animate-pulse">Retreiving hierarchy...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map(member => (
                <div key={member.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group relative overflow-hidden">
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 mb-4 font-black shadow-sm group-hover:scale-110 transition-transform text-xl">
                            {member.name.charAt(0)}
                        </div>
                        <h4 className="font-black text-slate-800 mb-1">{member.name}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{member.role}</p>

                        <div className="w-full flex gap-2">
                            <a href={`/supervisor/subordinate/${member.id}`} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all text-center">
                                Detailed Pulse
                            </a>
                        </div>
                    </div>
                    <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full"></div>
                </div>
            ))}
        </div>
    );
}

