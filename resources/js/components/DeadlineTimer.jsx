import React, { useEffect, useState } from "react";
import axios from "axios";

/**
 * DeadlineTimer Component
 * Shows submission deadline countdown for employees
 * - If submitted: green "Done" indicator
 * - If approaching deadline (< 1 hour): red urgent timer
 * - Otherwise: orange warning timer
 */
export default function DeadlineTimer({ refreshInterval = 30000 }) {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const checkStatus = async () => {
        try {
            const res = await axios.get("/api/task-logs/status/submission");
            setStatus(res.data);
            setError(null);
        } catch (e) {
            console.error("Failed to fetch submission status", e);
            setError("Unable to load submission status");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, refreshInterval);
        return () => clearInterval(interval);
    }, [refreshInterval]);

    if (loading) {
        return (
            <div className="animate-pulse bg-slate-100 h-14 rounded-lg"></div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-700 text-sm font-medium">
                {error}
            </div>
        );
    }

    if (!status) return null;

    const {
        minutes_remaining,
        is_approaching_deadline,
        is_past_deadline,
        has_evening_submission,
    } = status;

    // ✓ Submitted
    if (has_evening_submission) {
        return (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex items-center gap-3 animate-in fade-in">
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white flex-shrink-0">
                    <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
                <div className="flex-1">
                    <div className="text-emerald-900 font-bold">
                        Daily Submission Complete
                    </div>
                    <div className="text-emerald-700 text-xs">
                        Task log submitted successfully
                    </div>
                </div>
            </div>
        );
    }

    // Past deadline
    if (is_past_deadline) {
        const minutesOverdue = Math.abs(minutes_remaining);
        return (
            <div className="bg-red-50 border border-red-300 p-4 rounded-lg flex items-center gap-3 animate-in fade-in">
                <div className="w-6 h-6 rounded-full bg-red-600 animate-pulse flex items-center justify-center text-white flex-shrink-0 font-bold text-xs">
                    !
                </div>
                <div className="flex-1">
                    <div className="text-red-900 font-bold">
                        ⚠️ Submission Deadline Passed
                    </div>
                    <div className="text-red-700 text-xs">
                        {minutesOverdue} minute{minutesOverdue !== 1 ? "s" : ""}{" "}
                        overdue • Submit immediately
                    </div>
                </div>
            </div>
        );
    }

    // Approaching deadline (< 1 hour)
    if (is_approaching_deadline) {
        return (
            <div className="bg-red-50 border border-red-300 p-4 rounded-lg flex items-center gap-3 animate-in fade-in">
                <div className="w-6 h-6 rounded-full bg-red-600 animate-pulse flex items-center justify-center text-white flex-shrink-0">
                    <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm1-9a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V7z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
                <div className="flex-1">
                    <div className="text-red-900 font-bold">
                        URGENT: Submission Deadline Soon
                    </div>
                    <div className="text-red-700 text-sm font-mono font-bold">
                        {minutes_remaining} minute
                        {minutes_remaining !== 1 ? "s" : ""} remaining
                    </div>
                    <div className="text-red-600 text-xs">
                        Deadline: 11:00 PM
                    </div>
                </div>
            </div>
        );
    }

    // Normal time remaining
    return (
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg flex items-center gap-3 animate-in fade-in">
            <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-white flex-shrink-0">
                <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm1-9a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V7z"
                        clipRule="evenodd"
                    />
                </svg>
            </div>
            <div className="flex-1">
                <div className="text-orange-900 font-bold">
                    Daily Submission Deadline: 11:00 PM
                </div>
                <div className="text-orange-700 text-sm font-mono font-bold">
                    {minutes_remaining} minute
                    {minutes_remaining !== 1 ? "s" : ""} remaining
                </div>
            </div>
        </div>
    );
}
