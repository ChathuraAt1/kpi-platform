import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * MissingSubmissions Component
 * Shows admin/manager the status of all employees' submissions for today
 * - Submitted on time (green)
 * - Late submissions (orange)
 * - Missing submissions (red)
 */
export default function MissingSubmissions() {
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async (selectedDate) => {
        setLoading(true);
        try {
            const res = await axios.get('/api/submissions/missing', {
                params: { date: selectedDate }
            });
            setData(res.data);
            setError(null);
        } catch (e) {
            console.error('Failed to fetch submission status', e);
            setError('Unable to load submission data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(date);
    }, [date]);

    const handleDateChange = (e) => {
        setDate(e.target.value);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6">
                <div className="space-y-3">
                    <div className="h-8 bg-slate-200 rounded animate-pulse w-1/3"></div>
                    <div className="h-6 bg-slate-100 rounded animate-pulse"></div>
                    <div className="h-6 bg-slate-100 rounded animate-pulse w-2/3"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 p-6 rounded-lg text-red-700">
                {error}
            </div>
        );
    }

    if (!data) return null;

    const {
        date: displayDate,
        total_employees,
        submitted_count,
        late_count,
        missing_count,
        submitted,
        late,
        missing
    } = data;

    return (
        <div className="space-y-6">
            {/* Header with date filter */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900">Submission Status</h3>
                    <p className="text-slate-500 text-sm mt-1">Track daily task log submissions across your team</p>
                </div>
                <input
                    type="date"
                    value={date}
                    onChange={handleDateChange}
                    className="px-4 py-2 border border-slate-300 rounded-lg font-medium"
                />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-100 rounded-lg p-4 shadow-sm">
                    <div className="text-3xl font-black text-slate-900">{total_employees}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Total Employees</div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div className="text-3xl font-black text-emerald-700">{submitted_count}</div>
                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">✓ Submitted</div>
                    <div className="text-xs text-emerald-600 mt-2">
                        {total_employees > 0 ? ((submitted_count / total_employees) * 100).toFixed(0) : 0}% completion
                    </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="text-3xl font-black text-orange-700">{late_count}</div>
                    <div className="text-xs font-bold text-orange-600 uppercase tracking-widest mt-1">⏰ Late</div>
                    <div className="text-xs text-orange-600 mt-2">After 11 PM</div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-3xl font-black text-red-700">{missing_count}</div>
                    <div className="text-xs font-bold text-red-600 uppercase tracking-widest mt-1">✗ Missing</div>
                    <div className="text-xs text-red-600 mt-2">Not submitted</div>
                </div>
            </div>

            {/* Submitted On Time */}
            {submitted_count > 0 && (
                <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
                    <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-4">
                        <h4 className="font-bold text-emerald-900">✓ Submitted On Time ({submitted_count})</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-slate-100 bg-slate-50">
                                <tr>
                                    <th className="text-left px-6 py-3 font-bold text-slate-700">Employee</th>
                                    <th className="text-left px-6 py-3 font-bold text-slate-700">Submitted At</th>
                                    <th className="text-left px-6 py-3 font-bold text-slate-700">Type</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {submitted.map((emp, idx) => (
                                    <tr key={idx} className="hover:bg-emerald-50">
                                        <td className="px-6 py-3 font-medium text-slate-900">{emp.name}</td>
                                        <td className="px-6 py-3 text-slate-600 font-mono text-xs">
                                            {new Date(emp.submitted_at).toLocaleTimeString()}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold">
                                                {emp.submission_type === 'evening_log' ? 'Evening Log' : 'Morning Plan'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Late Submissions */}
            {late_count > 0 && (
                <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
                    <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">
                        <h4 className="font-bold text-orange-900">⏰ Late Submissions ({late_count})</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-slate-100 bg-slate-50">
                                <tr>
                                    <th className="text-left px-6 py-3 font-bold text-slate-700">Employee</th>
                                    <th className="text-left px-6 py-3 font-bold text-slate-700">Supervisor</th>
                                    <th className="text-left px-6 py-3 font-bold text-slate-700">Submitted At</th>
                                    <th className="text-right px-6 py-3 font-bold text-slate-700">Minutes Late</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {late.map((emp, idx) => (
                                    <tr key={idx} className="hover:bg-orange-50">
                                        <td className="px-6 py-3 font-medium text-slate-900">{emp.name}</td>
                                        <td className="px-6 py-3 text-slate-600 text-sm">{emp.supervisor_name}</td>
                                        <td className="px-6 py-3 text-slate-600 font-mono text-xs">
                                            {new Date(emp.submitted_at).toLocaleTimeString()}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                                                +{emp.minutes_late} min
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Missing Submissions */}
            {missing_count > 0 && (
                <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
                    <div className="bg-red-50 border-b border-red-200 px-6 py-4">
                        <h4 className="font-bold text-red-900">✗ Missing Submissions ({missing_count})</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-slate-100 bg-slate-50">
                                <tr>
                                    <th className="text-left px-6 py-3 font-bold text-slate-700">Employee</th>
                                    <th className="text-left px-6 py-3 font-bold text-slate-700">Supervisor</th>
                                    <th className="text-left px-6 py-3 font-bold text-slate-700">Email</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {missing.map((emp, idx) => (
                                    <tr key={idx} className="hover:bg-red-50">
                                        <td className="px-6 py-3 font-medium text-slate-900">{emp.name}</td>
                                        <td className="px-6 py-3 text-slate-600 text-sm">{emp.supervisor_name}</td>
                                        <td className="px-6 py-3 text-slate-600 text-xs font-mono">{emp.email}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {missing_count === 0 && late_count === 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-3">✓</div>
                    <div className="text-emerald-900 font-bold text-lg">All submissions complete!</div>
                    <div className="text-emerald-700 text-sm mt-2">Everyone has submitted their task logs on time.</div>
                </div>
            )}
        </div>
    );
}
