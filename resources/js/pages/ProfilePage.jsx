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
        breaks: [],
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                work_start_time: user.work_start_time || "09:00",
                work_end_time: user.work_end_time || "18:00",
                timezone: user.timezone || "UTC",
                breaks: user.breaks || [],
            });
        }
    }, [user]);

    function handleAddBreak() {
        setFormData({
            ...formData,
            breaks: [
                ...formData.breaks,
                { start: "12:00", end: "13:00", label: "Lunch" },
            ],
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
            breaks: formData.breaks.filter((_, i) => i !== idx),
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const resp = await axios.put("/api/user/profile", formData);
            setUser(resp.data);
            addToast({
                type: "success",
                message: "Profile updated successfully!",
            });
        } catch (err) {
            addToast({ type: "error", message: "Failed to update profile" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <header className="relative p-6 rounded-lg bg-linear-to-br from-gray-900 to-slate-900 dark:from-gray-900 dark:to-gray-800 text-white overflow-hidden shadow-2xl border border-orange-500/10 dark:border-orange-900/30">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-orange-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-orange-300 uppercase tracking-widest border border-orange-400/20">
                            Account Settings
                        </span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight">
                        Work Schedule &{" "}
                        <span className="text-orange-400">Profile</span>
                    </h2>
                    <p className="text-neutral-400 dark:text-gray-400 font-medium max-w-2xl mt-2">
                        Configure your daily schedule, breaks, and personal
                        preferences.
                    </p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-50 dark:border-gray-700 bg-neutral-50/50 dark:bg-gray-700/30">
                        <h3 className="text-sm font-black text-black dark:text-white uppercase tracking-widest">
                            Personal Details
                        </h3>
                    </div>
                    <div className="p-5 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">
                                Display Name
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-slate-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                                placeholder="Your Name"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">
                                    Work Start
                                </label>
                                <input
                                    type="time"
                                    className="w-full px-4 py-3 bg-slate-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                                    value={formData.work_start_time}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            work_start_time: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">
                                    Work End
                                </label>
                                <input
                                    type="time"
                                    className="w-full px-4 py-3 bg-slate-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                                    value={formData.work_end_time}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            work_end_time: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">
                                Timezone
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-slate-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                                value={formData.timezone}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        timezone: e.target.value,
                                    })
                                }
                                placeholder="UTC"
                            />
                        </div>
                    </div>
                </div>

                {/* Breaks Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-50 dark:border-gray-700 bg-neutral-50/50 dark:bg-gray-700/30 flex items-center justify-between">
                        <h3 className="text-sm font-black text-black dark:text-white uppercase tracking-widest">
                            Work Breaks ({formData.breaks.length})
                        </h3>
                        <button
                            type="button"
                            onClick={handleAddBreak}
                            className="px-4 py-2 bg-orange-600 dark:bg-orange-700 hover:bg-orange-700 dark:hover:bg-orange-800 text-white rounded-lg font-bold text-sm transition-colors"
                        >
                            + Add Break
                        </button>
                    </div>
                    <div className="p-5 space-y-4">
                        {formData.breaks.length === 0 ? (
                            <p className="text-sm text-neutral-500 dark:text-gray-400 italic">
                                No breaks configured yet
                            </p>
                        ) : (
                            formData.breaks.map((brk, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 border border-neutral-200 dark:border-gray-600 rounded-lg space-y-4 dark:bg-gray-700/30"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">
                                                    Label
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 bg-slate-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                                                    value={brk.label}
                                                    onChange={(e) =>
                                                        handleUpdateBreak(
                                                            idx,
                                                            "label",
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Lunch"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">
                                                        Start
                                                    </label>
                                                    <input
                                                        type="time"
                                                        className="w-full px-4 py-3 bg-slate-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                                                        value={brk.start}
                                                        onChange={(e) =>
                                                            handleUpdateBreak(
                                                                idx,
                                                                "start",
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">
                                                        End
                                                    </label>
                                                    <input
                                                        type="time"
                                                        className="w-full px-4 py-3 bg-slate-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                                                        value={brk.end}
                                                        onChange={(e) =>
                                                            handleUpdateBreak(
                                                                idx,
                                                                "end",
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemoveBreak(idx)
                                            }
                                            className="mt-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold text-sm transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`px-8 py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2 ${
                            loading
                                ? "bg-slate-200 dark:bg-gray-600 text-neutral-400 dark:text-gray-400 cursor-not-allowed"
                                : "bg-orange-600 dark:bg-orange-700 hover:bg-orange-700 dark:hover:bg-orange-800 text-white shadow-lg hover:shadow-xl"
                        }`}
                    >
                        {loading ? (
                            <>
                                <svg
                                    className="animate-spin h-5 w-5"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                    ></path>
                                </svg>
                                Saving...
                            </>
                        ) : (
                            <>
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
