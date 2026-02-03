import React, { useState } from "react";
import axios from "axios";

export default function TaskLogGrid({ initialDate = null }) {
    const [date, setDate] = useState(
        initialDate || new Date().toISOString().slice(0, 10),
    );
    const [rows, setRows] = useState([
        {
            task_id: null,
            start_time: "",
            end_time: "",
            duration_hours: 0,
            description: "",
            kpi_category_id: null,
        },
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    function addRow() {
        setRows([
            ...rows,
            {
                task_id: null,
                start_time: "",
                end_time: "",
                duration_hours: 0,
                description: "",
                kpi_category_id: null,
            },
        ]);
    }

    function updateRow(idx, key, value) {
        const next = rows.slice();
        next[idx][key] = value;
        setRows(next);
    }

    function removeRow(idx) {
        const next = rows.slice();
        next.splice(idx, 1);
        setRows(
            next.length
                ? next
                : [
                      {
                          task_id: null,
                          start_time: "",
                          end_time: "",
                          duration_hours: 0,
                          description: "",
                          kpi_category_id: null,
                      },
                  ],
        );
    }

    async function submit() {
        setSubmitting(true);
        setMessage(null);
        try {
            const payload = { date, rows };
            const resp = await axios.post("/api/task-logs", payload);
            setMessage("Submitted successfully");
        } catch (e) {
            console.error(e);
            setMessage("Submit failed");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="bg-white shadow rounded p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Daily Task Log</h2>
                <div>
                    <label className="mr-2">Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border rounded px-2 py-1"
                    />
                </div>
            </div>

            <table className="w-full text-sm table-auto">
                <thead>
                    <tr className="text-left text-gray-600">
                        <th className="p-2">Start</th>
                        <th className="p-2">End</th>
                        <th className="p-2">Hours</th>
                        <th className="p-2">Description</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, idx) => (
                        <tr key={idx} className="border-t">
                            <td className="p-2">
                                <input
                                    className="border rounded px-2 py-1 w-24"
                                    value={r.start_time}
                                    onChange={(e) =>
                                        updateRow(
                                            idx,
                                            "start_time",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="08:30"
                                />
                            </td>
                            <td className="p-2">
                                <input
                                    className="border rounded px-2 py-1 w-24"
                                    value={r.end_time}
                                    onChange={(e) =>
                                        updateRow(
                                            idx,
                                            "end_time",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="17:30"
                                />
                            </td>
                            <td className="p-2">
                                <input
                                    type="number"
                                    step="0.25"
                                    className="border rounded px-2 py-1 w-20"
                                    value={r.duration_hours}
                                    onChange={(e) =>
                                        updateRow(
                                            idx,
                                            "duration_hours",
                                            Number(e.target.value),
                                        )
                                    }
                                />
                            </td>
                            <td className="p-2">
                                <input
                                    className="border rounded px-2 py-1 w-full"
                                    value={r.description}
                                    onChange={(e) =>
                                        updateRow(
                                            idx,
                                            "description",
                                            e.target.value,
                                        )
                                    }
                                />
                            </td>
                            <td className="p-2">
                                <input
                                    className="border rounded px-2 py-1 w-40"
                                    value={r.kpi_category_id || ""}
                                    onChange={(e) =>
                                        updateRow(
                                            idx,
                                            "kpi_category_id",
                                            e.target.value || null,
                                        )
                                    }
                                    placeholder="Category id"
                                />
                            </td>
                            <td className="p-2">
                                <button
                                    className="text-sm text-red-600"
                                    onClick={() => removeRow(idx)}
                                >
                                    Remove
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-4 flex items-center justify-between">
                <div>
                    <button
                        className="bg-gray-100 px-3 py-1 rounded mr-2"
                        onClick={addRow}
                    >
                        Add row
                    </button>
                </div>
                <div className="flex items-center space-x-2">
                    {message && (
                        <div className="text-sm text-gray-700">{message}</div>
                    )}
                    <button
                        className="bg-blue-600 text-white px-4 py-2 rounded"
                        onClick={submit}
                        disabled={submitting}
                    >
                        {submitting ? "Submitting..." : "Submit"}
                    </button>
                </div>
            </div>
        </div>
    );
}
