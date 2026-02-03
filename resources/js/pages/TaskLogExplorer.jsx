import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

export default function TaskLogExplorer() {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [filters, setFilters] = useState({
        search: "",
        status: "",
        start_date: "",
        end_date: "",
        user_id: ""
    });

    const [team, setTeam] = useState([]);

    useEffect(() => {
        if (user.role === 'supervisor') {
            axios.get("/api/users?team_view=1").then(r => setTeam(r.data.data || []));
        } else if (['admin', 'hr', 'it_admin'].includes(user.role)) {
            axios.get("/api/users").then(r => setTeam(r.data.data || []));
        }
    }, [user]);

    useEffect(() => {
        fetchLogs();
    }, [page, filters.status, filters.user_id, filters.start_date, filters.end_date]);

    function fetchLogs() {
        setLoading(true);
        const params = {
            page,
            ...filters
        };
        // Only add search if it's long enough to be useful or when explicitly triggered
        // For simplicity, we trigger on change with a debounce or here on blur/enter

        axios.get("/api/task-logs", { params })
            .then(r => {
                setLogs(r.data.data || []);
                setTotalPages(r.data.last_page || 1);
            })
            .finally(() => setLoading(false));
    }

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setPage(1);
            fetchLogs();
        }
    };

    return (
        <div className="space-y-10 pb-20">
            <header className="relative p-10 rounded-4xl bg-linear-to-br from-slate-900 to-indigo-900 text-white overflow-hidden shadow-2xl border border-white/5 group">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest border border-white/5">Operational Ledger</span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight">Log <span className="text-indigo-400">Explorer</span></h2>
                    <p className="text-slate-400 font-medium max-w-sm mt-2">Comprehensive oversight of all task submissions, architectural compliance, and output logs.</p>
                </div>
                <div className="absolute top-[-40%] right-[-10%] w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
            </header>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[300px]">
                        <input
                            type="text"
                            className="w-full bg-white border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            placeholder="Search descriptions or personnel..."
                            value={filters.search}
                            onChange={e => setFilters({ ...filters, search: e.target.value })}
                            onKeyDown={handleSearch}
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>

                    <select
                        className="bg-white border-slate-200 rounded-2xl px-6 py-3.5 text-sm font-black text-slate-500 hover:border-slate-300 transition-all cursor-pointer"
                        value={filters.user_id}
                        onChange={e => setFilters({ ...filters, user_id: e.target.value })}
                    >
                        <option value="">All Personnel</option>
                        {team.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>

                    <select
                        className="bg-white border-slate-200 rounded-2xl px-6 py-3.5 text-sm font-black text-slate-500 hover:border-slate-300 transition-all cursor-pointer"
                        value={filters.status}
                        onChange={e => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="">Status: All</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>

                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-2">
                        <input
                            type="date"
                            className="bg-transparent border-0 text-[10px] font-black text-slate-500 focus:ring-0 uppercase tracking-tighter"
                            value={filters.start_date}
                            onChange={e => setFilters({ ...filters, start_date: e.target.value })}
                        />
                        <span className="text-slate-300 text-xs">—</span>
                        <input
                            type="date"
                            className="bg-transparent border-0 text-[10px] font-black text-slate-500 focus:ring-0 uppercase tracking-tighter"
                            value={filters.end_date}
                            onChange={e => setFilters({ ...filters, end_date: e.target.value })}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-20 text-center animate-pulse text-indigo-500 font-black uppercase tracking-widest italic">Querying Ledger...</div>
                    ) : logs.length === 0 ? (
                        <div className="p-20 text-center text-slate-300 font-bold italic">No log entries found matching these coordinates.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-y border-slate-100">
                                    <th className="px-8 py-5">Personnel</th>
                                    <th className="px-8 py-5">Temporal Mark</th>
                                    <th className="px-8 py-5">Sequence / Description</th>
                                    <th className="px-8 py-5">Category</th>
                                    <th className="px-8 py-5">Status</th>
                                    <th className="px-8 py-5 text-right">Utility</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-[10px] border border-slate-200">
                                                    {log.user?.name?.charAt(0)}
                                                </div>
                                                <span className="font-bold text-slate-800 text-sm">{log.user?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-xs font-bold text-slate-500">{log.date}</div>
                                            <div className="text-[9px] font-black text-slate-300 uppercase mt-0.5">{log.start_time} - {log.end_time}</div>
                                        </td>
                                        <td className="px-8 py-6 max-w-md">
                                            <div className="text-sm font-bold text-slate-700 leading-relaxed truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                                                {log.description}
                                            </div>
                                            {log.task && (
                                                <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 bg-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                    <span className="block w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                    ID: {log.task.id}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                                                {log.kpi_category?.name || 'Uncategorized'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${log.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                log.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-all">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Temporal Matrix Segment {page} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-600 shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-600 shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
