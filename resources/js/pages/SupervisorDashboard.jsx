import React, { useEffect, useState } from "react";
import axios from "axios";

export default function SupervisorDashboard() {
    const [pending, setPending] = useState([]);

    useEffect(() => {
        // fetch recent task logs needing approval - placeholder
        axios
            .get("/api/task-logs?status=pending")
            .then((r) => setPending(r.data.data || []));
    }, []);

    return (
        <div>
            <h2 className="text-2xl font-semibold mb-4">
                Supervisor Dashboard
            </h2>
            <div className="grid grid-cols-1 gap-4">
                <div className="bg-white shadow rounded p-4">
                    <h3 className="font-medium mb-2">Pending Approvals</h3>
                    {pending.length === 0 && (
                        <p className="text-sm text-gray-600">
                            No pending approvals
                        </p>
                    )}
                    <ul>
                        {pending.map((p) => (
                            <li key={p.id} className="py-2 border-b">
                                <div className="flex justify-between">
                                    <div>
                                        <div className="font-medium">
                                            {p.description || "No description"}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {p.date} — {p.duration_hours}h
                                        </div>
                                    </div>
                                    <div className="space-x-2">
                                        <button className="text-green-600">
                                            Approve
                                        </button>
                                        <button className="text-red-600">
                                            Reject
                                        </button>
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
