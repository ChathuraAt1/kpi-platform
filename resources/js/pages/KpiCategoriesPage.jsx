import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

export default function KpiCategoriesPage() {
    const { user } = useAuth();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: "", description: "", weight: 1 });
    const [editingId, setEditingId] = useState(null);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        // Only fetch if user is loaded (ensures Authorization header is set)
        if (user !== null) {
            fetchCategories();
        }
    }, [user]);

    async function fetchCategories() {
        setLoading(true);
        try {
            const res = await axios.get("/api/kpi-categories");
            setCategories(res.data || []);
            setMessage(null);
        } catch (e) {
            console.error("Error fetching categories:", e);
            const errorMsg =
                e.response?.data?.message ||
                e.response?.data?.error ||
                "Failed to load categories";
            setMessage(errorMsg);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setForm({ name: "", description: "", weight: 1 });
        setEditingId(null);
    }

    async function submit(e) {
        e.preventDefault();
        setMessage(null);
        try {
            if (editingId) {
                await axios.put(`/api/kpi-categories/${editingId}`, form);
                setMessage("Category updated");
            } else {
                await axios.post(`/api/kpi-categories`, form);
                setMessage("Category created");
            }
            resetForm();
            fetchCategories();
        } catch (err) {
            console.error("Error:", err);
            const errorMsg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                "Save failed";
            setMessage(errorMsg);
        }
    }

    async function edit(cat) {
        setEditingId(cat.id);
        setForm({
            name: cat.name || "",
            description: cat.description || "",
            weight: cat.weight || 1,
        });
    }

    async function remove(id) {
        if (!confirm("Delete this category?")) return;
        try {
            await axios.delete(`/api/kpi-categories/${id}`);
            setMessage("Deleted");
            fetchCategories();
        } catch (e) {
            console.error(e);
            const errorMsg =
                e.response?.data?.message ||
                e.response?.data?.error ||
                "Delete failed";
            setMessage(errorMsg);
        }
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <header className="relative p-10 rounded-4xl bg-linear-to-br from-indigo-900 to-slate-900 text-white overflow-hidden shadow-2xl border border-orange-500/10">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-orange-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-orange-300 uppercase tracking-widest border border-orange-400/20">
                            Configuration
                        </span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight">
                        KPI <span className="text-orange-400">Categories</span>
                    </h2>
                    <p className="text-neutral-400 font-medium max-w-2xl mt-2">
                        Create and manage performance measurement categories for
                        role mapping and evaluation.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form Section */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 bg-neutral-50/50">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                            {editingId
                                ? "Update Category"
                                : "Create New Category"}
                        </h3>
                    </div>
                    <form className="p-6 space-y-6" onSubmit={submit}>
                        <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">
                                Category Name
                            </label>
                            <input
                                value={form.name}
                                onChange={(e) =>
                                    setForm({ ...form, name: e.target.value })
                                }
                                placeholder="e.g., Code Quality"
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">
                                Description
                            </label>
                            <textarea
                                value={form.description}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        description: e.target.value,
                                    })
                                }
                                placeholder="Brief description of this category"
                                className="w-full px-4 py-3 bg-slate-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all h-24 resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">
                                Weight (1-5)
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={form.weight}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            weight: parseInt(
                                                e.target.value || 1,
                                            ),
                                        })
                                    }
                                    className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                                />
                                <span className="px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg font-black text-orange-600 text-sm min-w-[60px] text-center">
                                    {form.weight}
                                </span>
                            </div>
                        </div>

                        {/* Message Display */}
                        {message && (
                            <div
                                className={`p-3 rounded-xl text-sm font-bold ${
                                    message.includes("failed") ||
                                    message.includes("Error")
                                        ? "bg-red-50 text-red-700 border border-red-200"
                                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                }`}
                            >
                                {message}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                className="flex-1 px-6 py-3 bg-orange-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                type="submit"
                                disabled={loading}
                            >
                                {loading
                                    ? "Saving..."
                                    : editingId
                                      ? "Update"
                                      : "Create"}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-neutral-700 rounded-xl font-black text-sm uppercase tracking-wider transition-all"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Categories List */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 bg-neutral-50/50">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                            Categories ({categories.length})
                        </h3>
                    </div>
                    <div className="p-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-8 h-8 border-4 border-orange-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                    <p className="text-neutral-400 font-medium">
                                        Loading categories...
                                    </p>
                                </div>
                            </div>
                        ) : categories.length === 0 ? (
                            <div className="flex items-center justify-center h-64 text-center">
                                <div>
                                    <p className="text-neutral-500 font-medium mb-2">
                                        No categories yet
                                    </p>
                                    <p className="text-neutral-400 text-sm">
                                        Create your first KPI category using the
                                        form
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {categories.map((c) => (
                                    <div
                                        key={c.id}
                                        className="p-4 border border-neutral-200 rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h4 className="font-black text-neutral-900 mb-1">
                                                    {c.name}
                                                </h4>
                                                <p className="text-sm text-slate-600 mb-3">
                                                    {c.description}
                                                </p>
                                                <div className="flex items-center gap-4">
                                                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold">
                                                        Weight: {c.weight}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => edit(c)}
                                                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-sm transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => remove(c.id)}
                                                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-bold text-sm transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
