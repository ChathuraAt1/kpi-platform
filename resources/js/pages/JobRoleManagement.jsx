import React, { useEffect, useState } from "react";
import axios from "axios";

export default function JobRoleManagement() {
    const [roles, setRoles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        kpis: [] // { id, weight }
    });

    useEffect(() => {
        fetchRoles();
        fetchCategories();
    }, []);

    function fetchRoles() {
        setLoading(true);
        axios.get("/api/job-roles")
            .then(r => setRoles(r.data))
            .finally(() => setLoading(false));
    }

    function fetchCategories() {
        axios.get("/api/kpi-categories")
            .then(r => setCategories(r.data));
    }

    function handleEdit(role) {
        setEditingRole(role);
        setFormData({
            name: role.name,
            description: role.description || "",
            kpis: role.kpi_categories?.map(c => ({ id: c.id, weight: c.pivot?.weight || 10 })) || []
        });
        setShowModal(true);
    }

    function toggleKpi(catId) {
        setFormData(prev => {
            const exists = prev.kpis.find(k => k.id === catId);
            if (exists) {
                return { ...prev, kpis: prev.kpis.filter(k => k.id !== catId) };
            } else {
                return { ...prev, kpis: [...prev.kpis, { id: catId, weight: 10 }] };
            }
        });
    }

    function updateKpiWeight(catId, weight) {
        setFormData(prev => ({
            ...prev,
            kpis: prev.kpis.map(k => k.id === catId ? { ...k, weight: parseInt(weight) } : k)
        }));
    }

    function handleSubmit(e) {
        e.preventDefault();
        const req = editingRole
            ? axios.put(`/api/job-roles/${editingRole.id}`, formData)
            : axios.post("/api/job-roles", formData);

        req.then(() => {
            setShowModal(false);
            fetchRoles();
        });
    }

    return (
        <div className="space-y-10 pb-20 px-4 md:px-0">
            <header className="relative p-10 rounded-4xl bg-linear-to-br from-indigo-900 to-slate-900 text-white overflow-hidden shadow-2xl border border-indigo-500/10">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-indigo-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-indigo-300 uppercase tracking-widest border border-indigo-400/20">HR Strategy</span>
                        </div>
                        <h2 className="text-4xl font-black tracking-tight">Job <span className="text-indigo-400">Architecture</span></h2>
                        <p className="text-slate-400 font-medium max-w-sm mt-2">Map professional roles to specific KPI categories to define automated evaluation frameworks.</p>
                    </div>
                    <button
                        onClick={() => { setEditingRole(null); setFormData({ name: '', description: '', kpis: [] }); setShowModal(true); }}
                        className="px-8 py-4 bg-white text-indigo-900 rounded-3xl font-black text-sm hover:bg-slate-100 transition-all shadow-xl active:scale-95"
                    >
                        Create Job Role
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(role => (
                    <div key={role.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-xl font-black text-slate-800 mb-2 truncate">{role.name}</h3>
                            <p className="text-sm text-slate-500 line-clamp-2 h-10 mb-6 font-medium leading-relaxed">{role.description || 'Architectural definition pending.'}</p>

                            <div className="space-y-3 mb-8">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">KPI Matrix</span>
                                <div className="flex flex-wrap gap-2">
                                    {role.kpi_categories?.map(cat => (
                                        <span key={cat.id} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                                            {cat.name} <span className="text-indigo-300 ml-1 opacity-60">w:{cat.pivot?.weight}</span>
                                        </span>
                                    ))}
                                    {(!role.kpi_categories || role.kpi_categories.length === 0) && (
                                        <span className="text-xs font-bold text-slate-300 italic">No KPIs mapped</span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => handleEdit(role)}
                                className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] group-hover:bg-indigo-600 transition-colors"
                            >
                                Edit Framework
                            </button>
                        </div>
                        <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full"></div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-500">
                        <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">{editingRole ? "Evolve Framework" : "Draft Job Role"}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">JD to KPI Strategic Mapping</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Role Designation</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. Senior Software Engineer"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Strategic Responsibility</label>
                                        <textarea
                                            rows={4}
                                            className="w-full bg-slate-50 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Define the primary focus and impact of this role..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">KPI Matrix Selection</label>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-4 scrollbar-hide">
                                        {categories.map(cat => {
                                            const active = formData.kpis.find(k => k.id === cat.id);
                                            return (
                                                <div key={cat.id} className={`p-4 rounded-2xl border transition-all ${active ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleKpi(cat.id)}
                                                            className="flex items-center gap-3 flex-1 text-left"
                                                        >
                                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${active ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-white border-slate-300'}`}>
                                                                {active && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                            </div>
                                                            <span className={`text-xs font-black uppercase tracking-wider ${active ? 'text-indigo-900' : 'text-slate-500'}`}>{cat.name}</span>
                                                        </button>
                                                        {active && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Weight:</span>
                                                                <input
                                                                    type="number"
                                                                    className="w-12 h-8 bg-white border-indigo-200 rounded-lg text-xs font-black text-indigo-900 text-center"
                                                                    value={active.weight}
                                                                    onChange={e => updateKpiWeight(cat.id, e.target.value)}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4">
                            <button onClick={() => setShowModal(false)} className="px-8 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors">Abort</button>
                            <button onClick={handleSubmit} className="px-10 py-4 bg-slate-900 text-white rounded-3xl font-black text-sm hover:bg-indigo-600 transition-all shadow-xl active:scale-95">Commit Role Framework</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
