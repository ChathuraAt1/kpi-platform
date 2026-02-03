import React, { useEffect, useState } from "react";
import axios from "axios";

export default function HRDashboard() {
    const [evaluations, setEvaluations] = useState([]);

    useEffect(() => {
        axios
            .get("/api/evaluations")
            .then((r) => setEvaluations(r.data.data || []));
    }, []);

    async function triggerGenerate() {
        await axios.post("/api/evaluations/trigger");
        alert("Generation queued");
    }

    return (
        <div>
            <h2 className="text-2xl font-semibold mb-4">HR Dashboard</h2>
            <div className="grid grid-cols-1 gap-4">
                <div className="bg-white shadow rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">Monthly Evaluations</h3>
                        <button
                            className="bg-blue-600 text-white px-3 py-1 rounded"
                            onClick={triggerGenerate}
                        >
                            Generate Now
                        </button>
                    </div>
                    <ul>
                        {evaluations.map((ev) => (
                            <li key={ev.id} className="py-2 border-b">
                                <div className="flex justify-between">
                                    <div>
                                        <div className="font-medium">
                                            User {ev.user_id} — {ev.month}/
                                            {ev.year}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            Status: {ev.status}
                                        </div>
                                    </div>
                                    <div className="space-x-2">
                                        {ev.status === "approved" && (
                                            <button className="bg-green-600 text-white px-2 py-1 rounded">
                                                Publish
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
