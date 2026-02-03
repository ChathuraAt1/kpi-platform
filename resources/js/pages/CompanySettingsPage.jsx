import React, { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../contexts/ToastContext";

export default function CompanySettingsPage() {
    const { addToast } = useToast();
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            const resp = await axios.get("/api/global-settings");
            setSettings(resp.data);
        } catch (e) {
            addToast({ type: "error", message: "Failed to fetch settings" });
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdate(setting, newValue) {
        setSaving(setting.key);
        try {
            await axios.put(`/api/global-settings/${setting.key}`, { value: newValue });
            setSettings(settings.map(s => s.key === setting.key ? { ...s, value: newValue } : s));
            addToast({ type: "success", message: `${setting.key} updated` });
        } catch (e) {
            addToast({ type: "error", message: "Save failed" });
        } finally {
            setSaving(null);
        }
    }

    if (loading) return <div className="p-8 text-center">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto py-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Company Settings</h2>

            <div className="space-y-6">
                {settings.map(s => (
                    <SettingCard
                        key={s.key}
                        setting={s}
                        onSave={(val) => handleUpdate(s, val)}
                        isSaving={saving === s.key}
                    />
                ))}
            </div>
        </div>
    );
}

function SettingCard({ setting, onSave, isSaving }) {
    const [value, setValue] = useState(setting.value);

    // Simple editor based on value type
    const isShift = setting.key.includes('_shift');
    const isBreaks = setting.key.includes('_breaks');
    const isString = typeof setting.value === 'string';

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-700 capitalize">{setting.key.replace('_', ' ')}</h3>
                <button
                    disabled={isSaving}
                    onClick={() => onSave(value)}
                    className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50"
                >
                    {isSaving ? "Saving..." : "Save"}
                </button>
            </div>

            {isShift && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Time</label>
                        <input
                            type="time"
                            className="w-full border-slate-200 rounded-lg"
                            value={value.start}
                            onChange={e => setValue({ ...value, start: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Time</label>
                        <input
                            type="time"
                            className="w-full border-slate-200 rounded-lg"
                            value={value.end}
                            onChange={e => setValue({ ...value, end: e.target.value })}
                        />
                    </div>
                </div>
            )}

            {isBreaks && (
                <div className="space-y-3">
                    {value.map((b, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg">
                            <input
                                className="flex-1 text-sm bg-transparent border-0 focus:ring-0"
                                value={b.label}
                                onChange={e => {
                                    const next = [...value];
                                    next[idx].label = e.target.value;
                                    setValue(next);
                                }}
                            />
                            <input
                                type="time"
                                className="w-28 text-xs border-slate-200 rounded"
                                value={b.start}
                                onChange={e => {
                                    const next = [...value];
                                    next[idx].start = e.target.value;
                                    setValue(next);
                                }}
                            />
                            <span className="text-slate-400">-</span>
                            <input
                                type="time"
                                className="w-28 text-xs border-slate-200 rounded"
                                value={b.end}
                                onChange={e => {
                                    const next = [...value];
                                    next[idx].end = e.target.value;
                                    setValue(next);
                                }}
                            />
                            <button onClick={() => setValue(value.filter((_, i) => i !== idx))} className="text-red-400 px-1">&times;</button>
                        </div>
                    ))}
                    <button
                        onClick={() => setValue([...value, { start: "12:00", end: "13:00", label: "New Break" }])}
                        className="text-xs text-purple-600 font-bold"
                    >
                        + Add Break
                    </button>
                </div>
            )}

            {isString && !isBreaks && !isShift && (
                <input
                    className="w-full border-slate-200 rounded-lg"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                />
            )}
        </div>
    );
}
