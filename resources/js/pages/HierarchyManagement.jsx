import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

export default function HierarchyManagement() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes] = await Promise.all([
                axios.get("/api/users?all=1"),
                axios.get("/api/job-roles")
            ]);
            setUsers(usersRes.data);
            setSupervisors(usersRes.data.filter(u => u.role === 'supervisor' || u.role === 'admin' || u.role === 'hr'));
            setRoles(rolesRes.data);
        } catch (error) {
            console.error("Failed to fetch hierarchy data", error);
        } finally {
            setLoading(false);
        }
    };

    const updateSupervisor = async (userId, supervisorId) => {
        setUpdatingId(userId);
        try {
            await axios.patch(`/api/users/${userId}`, { supervisor_id: supervisorId });
            // Refresh local state to avoid full re-fetch
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, supervisor_id: supervisorId } : u));
        } catch (error) {
            alert("Failed to update reporting structure.");
        } finally {
            setUpdatingId(null);
        }
    };

    const updateJobRole = async (userId, jobRoleId) => {
        setUpdatingId(userId);
        try {
            await axios.patch(`/api/users/${userId}`, { job_role_id: jobRoleId });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, job_role_id: jobRoleId } : u));
        } catch (error) {
            alert("Failed to update job role.");
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-10 pb-20 px-4 md:px-0">
            <header className="relative p-10 rounded-4xl bg-linear-to-br from-indigo-900 to-slate-900 text-white overflow-hidden shadow-2xl border border-indigo-500/10">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-indigo-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-indigo-300 uppercase tracking-widest border border-indigo-400/20">Organization Design</span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight">Hierarchy <span className="text-indigo-400">Architect</span></h2>
                    <p className="text-slate-400 font-medium max-w-sm mt-2">Define reporting lines and professional role assignments across the enterprise ledger.</p>
                </div>
            </header>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <input
                            type="text"
                            placeholder="Search organization directory..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Directory</span>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black">{filteredUsers.length}</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supervisor (Report To)</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Framework</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="3" className="px-8 py-20 text-center animate-pulse text-indigo-500 font-black uppercase tracking-widest">Querying Organizational Graph...</td>
                                </tr>
                            ) : (
                                filteredUsers.map(u => (
                                    <tr key={u.id} className={`group transition-colors ${updatingId === u.id ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'}`}>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 border border-slate-200 uppercase text-xs">
                                                    {u.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-slate-900 leading-none">{u.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">{u.role}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <select
                                                className="bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none w-full max-w-xs transition-all"
                                                value={u.supervisor_id || ""}
                                                onChange={(e) => updateSupervisor(u.id, e.target.value)}
                                                disabled={updatingId === u.id}
                                            >
                                                <option value="">No Reporting Line</option>
                                                {supervisors.filter(s => s.id !== u.id).map(s => (
                                                    <option key={s.id} value={s.id}>{s.name} ({s.role.toUpperCase()})</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-8 py-6">
                                            <select
                                                className="bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none w-full max-w-xs transition-all"
                                                value={u.job_role_id || ""}
                                                onChange={(e) => updateJobRole(u.id, e.target.value)}
                                                disabled={updatingId === u.id}
                                            >
                                                <option value="">Unmapped Framework</option>
                                                {roles.map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
