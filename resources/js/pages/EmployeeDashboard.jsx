import React, { useState } from "react";
import TaskLogGrid from "../components/TaskLogGrid";
import MorningPlan from "../components/MorningPlan";
import KPIBreakdown from "../components/KPIBreakdown";
import { useAuth } from "../contexts/AuthContext";

export default function EmployeeDashboard() {
    const { user, loading } = useAuth();
    const [refreshLogs, setRefreshLogs] = useState(0);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold text-gray-800">Employee Dashboard</h2>
                <p className="text-gray-500">Welcome, {user?.name || 'Employee'}. Manage your day efficiently.</p>
            </header>

            <section>
                <MorningPlan onPlanSubmitted={() => setRefreshLogs(prev => prev + 1)} />
            </section>

            <section>
                <TaskLogGrid key={refreshLogs} />
            </section>

            <section className="bg-white/80 backdrop-blur-md shadow-lg rounded-xl p-6 border border-white/20">
                <h3 className="font-medium text-lg text-gray-800 mb-2">KPI Scorecard</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Your latest evaluation will appear here after HR publishes it.
                </p>
                {user && <KPIBreakdown userId={user.id} />}
            </section>
        </div>
    );
}
