import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

export default function ApiKeysPage() {
    const { user, hasRole } = useAuth();
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

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">API Keys & Providers</h2>
                    <p className="text-gray-500 text-sm">Manage LLM connections and priorities</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleHealthCheck}
                        disabled={checking}
                        className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                        {checking ? "Checking..." : "Run Health Check"}
                    </button>
                    <button
                        onClick={() => { setEditingKey(null); setShowModal(true); }}
                        className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
                    >
                        + Add New Key
                    </button>
                </div>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">Name / Provider</th>
                            <th className="px-6 py-3">Priority</th>
                            <th className="px-6 py-3">Quota</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {keys.map((k) => (
                            <tr key={k.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{k.name}</div>
                                    <div className="text-xs text-gray-500 uppercase">{k.provider}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">{k.priority}</span>
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    {k.daily_usage ?? 0} / {k.daily_quota ?? '∞'}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${k.status === 'active' ? 'bg-green-100 text-green-700' :
                                        k.status === 'degraded' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {k.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => handleEdit(k)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                    <button onClick={() => handleDelete(k.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {keys.length === 0 && !loading && (
                    <div className="p-8 text-center text-gray-400">No API keys found. Add one to get started.</div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold mb-4">{editingKey ? "Edit API Key" : "Add New API Key"}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                                <select
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Production Gemini"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                                <input
                                    type="password"
                                    required={!editingKey}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.key}
                                    onChange={e => setFormData({ ...formData, key: e.target.value })}
                                    placeholder={editingKey ? "(Leave blank to keep current)" : "sk-..."}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority (1-100)</label>
                                    <input
                                        type="number"
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Daily Quota</label>
                                    <input
                                        type="number"
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.daily_quota}
                                        onChange={e => setFormData({ ...formData, daily_quota: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Model Name / ID</label>
                                    <input
                                        type="text"
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.model}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                        placeholder="e.g. gpt-4o, gemini-1.5-pro"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Base URL (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.base_url}
                                        onChange={e => setFormData({ ...formData, base_url: e.target.value })}
                                        placeholder="https://api.yourprovider.com/v1"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md"
                                >
                                    Save Key
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

