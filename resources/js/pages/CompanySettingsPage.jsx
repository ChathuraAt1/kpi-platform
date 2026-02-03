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

    if (loading) return (
        <div className="flex items-center justify-center p-20 animate-pulse text-indigo-500 font-black uppercase tracking-widest italic">
            Synchronizing Global Config...
        </div>
    );

    return (
        <div className="space-y-10 pb-20 max-w-5xl mx-auto">
            <header className="relative p-12 rounded-[3.5rem] bg-slate-900 text-white overflow-hidden shadow-2xl border border-white/5 group">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-indigo-300 uppercase tracking-widest border border-white/5">Infrastructure Control</span>
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter">System <span className="text-indigo-400 italic">Nexus</span></h2>
                    <p className="text-slate-400 font-medium max-w-sm mt-3 leading-relaxed">Modify global operational parameters, shift rotations, and organizational boundaries.</p>
                </div>
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
            </header>

            <div className="grid grid-cols-1 gap-8">
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

    const isShift = setting.key.includes('_shift');
    const isBreaks = setting.key.includes('_breaks');
    const isString = typeof setting.value === 'string';

    const label = setting.key.replace(/_/g, ' ');

    return (
        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group/card relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight capitalize">{label}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Operational Parameter ID: {setting.key}</p>
                    </div>
                    <button
                        disabled={isSaving}
                        onClick={() => onSave(value)}
                        className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isSaving ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-indigo-500/10'
                            }`}
                    >
                        {isSaving ? "Syncing..." : "Update Config"}
                    </button>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8">
                    {isShift && (
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Epoch Start</label>
                                <input
                                    type="time"
                                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-700 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    value={value.start}
                                    onChange={e => setValue({ ...value, start: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Epoch End</label>
                                <input
                                    type="time"
                                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-700 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    value={value.end}
                                    onChange={e => setValue({ ...value, end: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {isBreaks && (
                        <div className="space-y-4">
                            {value.map((b, idx) => (
                                <div key={idx} className="flex gap-4 items-center bg-white p-4 rounded-3xl border border-slate-100 group/break hover:border-indigo-200 transition-all">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-xs">
                                        {idx + 1}
                                    </div>
                                    <input
                                        className="flex-1 font-bold text-slate-700 bg-transparent border-0 focus:ring-0 text-sm"
                                        value={b.label}
                                        onChange={e => {
                                            const next = [...value];
                                            next[idx].label = e.target.value;
                                            setValue(next);
                                        }}
                                    />
                                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2 border border-slate-100">
                                        <input
                                            type="time"
                                            className="bg-transparent border-0 focus:ring-0 text-[10px] font-black text-indigo-600"
                                            value={b.start}
                                            onChange={e => {
                                                const next = [...value];
                                                next[idx].start = e.target.value;
                                                setValue(next);
                                            }}
                                        />
                                        <span className="text-slate-300 font-black">-</span>
                                        <input
                                            type="time"
                                            className="bg-transparent border-0 focus:ring-0 text-[10px] font-black text-indigo-600"
                                            value={b.end}
                                            onChange={e => {
                                                const next = [...value];
                                                next[idx].end = e.target.value;
                                                setValue(next);
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setValue(value.filter((_, i) => i !== idx))}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-break-hover:opacity-100"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => setValue([...value, { start: "12:00", end: "13:00", label: "New Pause Sequence" }])}
                                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-4xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all"
                            >
                                + Inject New Pause Sequence
                            </button>
                        </div>
                    )}

                    {isString && !isBreaks && !isShift && (
                        <input
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-700 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            value={value}
                            onChange={e => setValue(e.target.value)}
                        />
                    )}
                </div>
            </div>
            <div className="absolute bottom-[-10%] left-[-5%] w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full group-hover/card:bg-indigo-500/10 transition-colors duration-700"></div>
        </div>
    );
}
