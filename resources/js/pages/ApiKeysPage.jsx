import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

export default function ApiKeysPage() {
    const { user } = useAuth();
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingKey, setEditingKey] = useState(null);
    const [checking, setChecking] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        provider: "gemini",
        name: "",
        key: "",
        priority: 10,
        daily_quota: 1000,
        model: "",
        base_url: "",
    });

    useEffect(() => {
        fetchKeys();
    }, []);

    function fetchKeys() {
        setLoading(true);
        axios.get("/api/api-keys")
            .then((r) => setKeys(r.data))
            .catch(e => console.error(e))
            .finally(() => setLoading(false));
    }

    function handleEdit(key) {
        setEditingKey(key);
        setFormData({
            provider: key.provider,
            name: key.name,
            key: "", // Don't show encrypted key, only allow overwrite
            priority: key.priority,
            daily_quota: key.daily_quota || 0,
            model: key.model || "",
            base_url: key.base_url || "",
        });
        setShowModal(true);
    }

    function handleDelete(id) {
        if (!confirm("Are you sure you want to delete this API Key?")) return;
        axios.delete(`/api/api-keys/${id}`).then(() => fetchKeys());
    }

    function handleHealthCheck() {
        setChecking(true);
        axios.post("/api/api-keys/health-check")
            .then(() => alert("Health Check started in background!"))
            .catch(() => alert("Failed to start health check"))
            .finally(() => setChecking(false));
    }

    function handleSubmit(e) {
        e.preventDefault();
        const payload = { ...formData };
        if (!payload.key) delete payload.key; // if empty on edit, don't send

        const req = editingKey
            ? axios.put(`/api/api-keys/${editingKey.id}`, payload)
            : axios.post("/api/api-keys", payload);

        req.then(() => {
            setShowModal(false);
            setEditingKey(null);
            setFormData({ provider: 'gemini', name: '', key: '', priority: 10, daily_quota: 1000, model: '', base_url: '' });
            fetchKeys();
        }).catch(err => {
            alert("Error saving key: " + (err.response?.data?.message || err.message));
        });
    }

    const providerIcons = {
        gemini: "G",
        openai: "O",
        groq: "Gr",
        anthropic: "A",
        huggingface: "H",
        deepseek: "D",
        local: "L"
    };

    return (
        <div className="space-y-10 pb-20 max-w-6xl mx-auto">
            {/* Developer Header */}
            <header className="relative p-10 rounded-4xl bg-slate-900 overflow-hidden shadow-2xl group border border-indigo-500/10">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 text-white">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Infrastructure</span>
                            <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">API Orchestration</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                            API <span className="text-indigo-500">Repository</span>
                        </h2>
                        <p className="text-slate-400 font-medium max-w-md">
                            Manage decentralized AI nodes. Configure failover strategies and monitor throughput for the evaluation engine.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleHealthCheck}
                            disabled={checking}
                            className="px-6 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl font-black text-xs uppercase tracking-widest text-indigo-300 hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                            <svg className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Sync Health
                        </button>
                        <button
                            onClick={() => { setEditingKey(null); setShowModal(true); }}
                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black text-sm transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                        >
                            + Cluster Node
                        </button>
                    </div>
                </div>
                {/* Accent */}
                <div className="absolute top-0 right-0 w-[400px] h-full bg-linear-to-l from-indigo-500/5 to-transparent pointer-events-none"></div>
            </header>

            <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {loading ? (
                    <div className="p-20 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse">Initializing Repository...</div>
                ) : keys.length === 0 ? (
                    <div className="bg-white p-20 rounded-4xl border border-dashed border-slate-200 text-center text-slate-300 font-bold italic">
                        Empty repository. Add your first API node to begin orchestration.
                    </div>
                ) : (
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-y border-slate-100">
                                    <th className="px-10 py-5">Node Identity</th>
                                    <th className="px-10 py-5">Configuration</th>
                                    <th className="px-10 py-5">Utilization</th>
                                    <th className="px-10 py-5">Status</th>
                                    <th className="px-10 py-5 text-right">Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {keys.map((k) => (
                                    <tr key={k.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    {providerIcons[k.provider] || k.provider.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-800">{k.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{k.provider} cluster</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Model:</span>
                                                    <span className="text-xs font-bold text-slate-700">{k.model || "Default"}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Priority:</span>
                                                    <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-black text-slate-600">Lvl {k.priority}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex flex-col gap-2 min-w-[120px]">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quota</span>
                                                    <span className="text-[10px] font-bold text-slate-900">{Math.round((k.daily_usage / k.daily_quota) * 100) || 0}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${k.status === 'active' ? 'bg-indigo-500' : 'bg-rose-500'}`}
                                                        style={{ width: `${Math.min(100, (k.daily_usage / k.daily_quota) * 100 || 0)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${k.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    k.status === 'degraded' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-rose-50 text-rose-500 border-rose-100'
                                                }`}>
                                                {k.status}
                                            </span>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleEdit(k)} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button onClick={() => handleDelete(k.id)} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
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

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-10 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingKey ? "Configure Node" : "Cluster New Node"}</h3>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">API Infrastructure Entity</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Provider</label>
                                    <select
                                        className="w-full bg-slate-50 border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        value={formData.provider}
                                        onChange={e => setFormData({ ...formData, provider: e.target.value })}
                                    >
                                        <option value="gemini">Google Gemini</option>
                                        <option value="openai">OpenAI</option>
                                        <option value="groq">Groq</option>
                                        <option value="anthropic">Anthropic</option>
                                        <option value="huggingface">HuggingFace</option>
                                        <option value="deepseek">DeepSeek</option>
                                        <option value="local">Local Instance</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Friendly Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-50 border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Primary Production"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Secret Access Key</label>
                                <input
                                    type="password"
                                    required={!editingKey}
                                    className="w-full bg-slate-50 border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    value={formData.key}
                                    onChange={e => setFormData({ ...formData, key: e.target.value })}
                                    placeholder={editingKey ? "(Leave blank to keep active key)" : "Enter encrypted string..."}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Priority Lvl (1-100)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-50 border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Daily Quota Units</label>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-50 border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        value={formData.daily_quota}
                                        onChange={e => setFormData({ ...formData, daily_quota: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Model Descriptor</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        value={formData.model}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                        placeholder="e.g. gpt-4-turbo"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Endpoint Override (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        value={formData.base_url}
                                        onChange={e => setFormData({ ...formData, base_url: e.target.value })}
                                        placeholder="https://proxy.endpoint.com/v1"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-4 bg-slate-100 text-slate-500 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-4 bg-slate-900 text-white rounded-3xl font-black text-sm hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                                >
                                    Finaliy Node Config
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

