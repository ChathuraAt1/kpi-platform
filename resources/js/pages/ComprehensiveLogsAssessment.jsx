import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ComprehensiveLogsAssessment() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [allEmployees, setAllEmployees] = useState([]);
    const [employeeSubmissions, setEmployeeSubmissions] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch all employees
        axios
            .get("/api/users?all=1")
            .then((r) => {
                const employees = r.data || [];
                setAllEmployees(employees);
                // Fetch logs for each employee to get last submission
                fetchEmployeeSubmissions(employees);
            })
            .catch((e) => console.error("Failed to fetch employees", e));
    }, []);

    function fetchEmployeeSubmissions(employees) {
        setLoading(true);
        Promise.all(
            employees.map((emp) =>
                axios
                    .get("/api/task-logs", { params: { employee_id: emp.id } })
                    .then((r) => ({
                        empId: emp.id,
                        logs: r.data.data || [],
                    }))
                    .catch((e) => ({
                        empId: emp.id,
                        logs: [],
                    })),
            ),
        )
            .then((results) => {
                const submissions = {};
                results.forEach(({ empId, logs }) => {
                    submissions[empId] = logs;
                });
                setEmployeeSubmissions(submissions);
            })
            .finally(() => setLoading(false));
    }

    // Get last submission info for an employee
    function getLastSubmission(empId) {
        const logs = employeeSubmissions[empId] || [];
        if (logs.length === 0) return null;
        const sorted = [...logs].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );
        return sorted[0];
    }

    // Get submission stats for an employee
    function getSubmissionStats(empId) {
        const logs = employeeSubmissions[empId] || [];
        return {
            total: logs.length,
            submitted: logs.filter((l) => l.status === "submitted").length,
            pending: logs.filter((l) => l.status === "pending").length,
        };
    }

    return (
        <div className="space-y-10 pb-20 px-4 md:px-0">
            <header className="relative p-10 rounded-4xl bg-linear-to-br from-indigo-900 to-slate-900 text-white overflow-hidden shadow-2xl border border-orange-500/10">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-orange-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-orange-300 uppercase tracking-widest border border-orange-400/20">
                            Employee Submissions
                        </span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight">
                        Team Task Submissions{" "}
                        <span className="text-orange-400">Overview</span>
                    </h2>
                    <p className="text-neutral-400 font-medium max-w-2xl mt-2">
                        Review when each team member last submitted their task
                        logs.
                    </p>
                </div>
            </header>

            {/* Employees Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 bg-neutral-50/50">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                        Employee Submission Status ({allEmployees.length})
                    </h3>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-neutral-500">
                        Loading submission status...
                    </div>
                ) : allEmployees.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 italic">
                        No employees found
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        Employee
                                    </th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        Last Submission
                                    </th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        Task / Date
                                    </th>
                                    <th className="text-center px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        Total Logs
                                    </th>
                                    <th className="text-center px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        Stats
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allEmployees.map((emp) => {
                                    const lastLog = getLastSubmission(emp.id);
                                    const stats = getSubmissionStats(emp.id);
                                    const daysAgo = lastLog
                                        ? Math.floor(
                                              (new Date() -
                                                  new Date(
                                                      lastLog.created_at,
                                                  )) /
                                                  (1000 * 60 * 60 * 24),
                                          )
                                        : null;

                                    return (
                                        <tr
                                            key={emp.id}
                                            onClick={() =>
                                                navigate(
                                                    `/employees/${emp.id}/logs`,
                                                )
                                            }
                                            className="hover:bg-indigo-50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-6 py-4 font-bold text-neutral-900">
                                                <div>{emp.name}</div>
                                                <div className="text-xs text-neutral-500">
                                                    {emp.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {lastLog ? (
                                                    <div className="space-y-1">
                                                        <div className="text-sm font-bold text-neutral-900">
                                                            {new Date(
                                                                lastLog.created_at,
                                                            ).toLocaleDateString(
                                                                "en-US",
                                                                {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    year: "numeric",
                                                                },
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-neutral-500">
                                                            {daysAgo === 0
                                                                ? "Today"
                                                                : daysAgo === 1
                                                                  ? "Yesterday"
                                                                  : `${daysAgo} days ago`}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-neutral-400 italic">
                                                        No submission
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-neutral-700">
                                                {lastLog ? (
                                                    <div className="space-y-1">
                                                        <div className="font-medium">
                                                            {lastLog.task
                                                                ?.title ||
                                                                "N/A"}
                                                        </div>
                                                        <div className="text-xs text-neutral-500">
                                                            {lastLog
                                                                .kpi_category
                                                                ?.name ||
                                                                "Unassigned"}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xl font-black text-orange-600">
                                                    {stats.total}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex gap-2 justify-center">
                                                    {stats.submitted > 0 && (
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
                                                            📤 {stats.submitted}
                                                        </span>
                                                    )}
                                                    {stats.pending > 0 && (
                                                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
                                                            ⏳ {stats.pending}
                                                        </span>
                                                    )}
                                                    {stats.total === 0 && (
                                                        <span className="text-neutral-400 text-xs italic">
                                                            No logs
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
