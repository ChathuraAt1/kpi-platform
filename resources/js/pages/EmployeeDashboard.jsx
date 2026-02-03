import React from "react";
import TaskLogGrid from "../components/TaskLogGrid";

export default function EmployeeDashboard() {
    return (
        <div>
            <h2 className="text-2xl font-semibold mb-4">Employee Dashboard</h2>

            <div className="grid grid-cols-1 gap-4">
                <TaskLogGrid />

                <div className="bg-white shadow rounded p-4">
                    <h3 className="font-medium">Your KPI (previous month)</h3>
                    <p className="text-sm text-gray-600">
                        Your latest evaluation will appear here after HR
                        publishes it.
                    </p>
                </div>
            </div>
        </div>
    );
}
