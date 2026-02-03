import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

export default function ProfilePage() {
    const { user, setUser } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        work_start_time: "09:00",
        work_end_time: "18:00",
        timezone: "UTC",
        breaks: []
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                work_start_time: user.work_start_time || "09:00",
                work_end_time: user.work_end_time || "18:00",
                timezone: user.timezone || "UTC",
                breaks: user.breaks || []
            });
        }
    }, [user]);

    function handleAddBreak() {
        setFormData({
            ...formData,
            breaks: [...formData.breaks, { start: "12:00", end: "13:00", label: "Lunch" }]
        });
    }

    function handleUpdateBreak(idx, field, val) {
        const newBreaks = [...formData.breaks];
        newBreaks[idx][field] = val;
        setFormData({ ...formData, breaks: newBreaks });
    }

    function handleRemoveBreak(idx) {
        setFormData({
            ...formData,
            breaks: formData.breaks.filter((_, i) => i !== idx)
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const resp = await axios.put("/api/user/profile", formData);
            setUser(resp.data);
            addToast({ type: "success", message: "Profile updated successfully!" });
        } catch (err) {
            addToast({ type: "error", message: "Failed to update profile" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 font-display">Work Schedule & Profile</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Display Name</label>
                        <input
                            type="text"
                            className="w-full border-slate-200 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Work Start</label>
                            <input
                                type="time"
                                className="w-full border-slate-200 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                                value={formData.work_start_time}
                                onChange={(e) => setFormData({ ...formData, work_start_time: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Work End</label>
                            <input
                                type="time"
                                className="w-full border-slate-200 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                                value={formData.work_end_time}
                                onChange={(e) => setFormData({ ...formData, work_end_time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Timezone</label>
                        <select
                            className="w-full border-slate-200 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                            value={formData.timezone}
                            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        >
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">New York (EST/EDT)</option>
                            <option value="Europe/London">London (GMT/BST)</option>
                            <option value="Asia/Tokyo">Tokyo (JST)</option>
                            <option value="Asia/Colombo">Colombo (IST)</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Breaks</label>
                        <button
                            type="button"
                            onClick={handleAddBreak}
                            className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full hover:bg-slate-200 transition-colors uppercase font-bold tracking-wider"
                        >
                            + Add Break
                        </button>
                    </div>

                    <div className="space-y-3">
                        {formData.breaks.map((b, idx) => (
                            <div key={idx} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl">
                                <input
                                    type="text"
                                    className="flex-1 border-0 bg-transparent focus:ring-0 text-sm font-medium"
                                    placeholder="Label"
                                    value={b.label}
                                    onChange={(e) => handleUpdateBreak(idx, "label", e.target.value)}
                                />
                                <input
                                    type="time"
                                    className="w-28 border-slate-200 rounded-lg text-xs"
                                    value={b.start}
                                    onChange={(e) => handleUpdateBreak(idx, "start", e.target.value)}
                                />
                                <span className="text-slate-400">to</span>
                                <input
                                    type="time"
                                    className="w-28 border-slate-200 rounded-lg text-xs"
                                    value={b.end}
                                    onChange={(e) => handleUpdateBreak(idx, "end", e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveBreak(idx)}
                                    className="text-red-400 hover:text-red-600 p-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                        {formData.breaks.length === 0 && (
                            <div className="text-center py-4 text-slate-400 text-sm italic">No breaks defined</div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-black hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        {loading ? "Saving..." : "Save Settings"}
                    </button>
                </div>
            </form>
        </div>
    );
}
