import React, { useEffect, useState } from "react";
import axios from "axios";

export default function KPIBreakdown({ userId }) {
    const [evaluation, setEvaluation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        // Fetch latest evaluation for user
        async function fetchEval() {
            try {
                const resp = await axios.get("/api/evaluations", { params: { user_id: userId, page: 1 } });
                if (resp.data.data && resp.data.data.length > 0) {
                    setEvaluation(resp.data.data[0]);
                }
            } catch (e) {
                console.error("Failed to fetch evaluation", e);
            } finally {
                setLoading(false);
            }
        }
        fetchEval();
    }, [userId]);

    if (!userId) return null;
    if (loading) return <div className="text-gray-500 text-sm animate-pulse">Loading KPI data...</div>;
    if (!evaluation) return <div className="text-gray-500 text-sm">No evaluation available yet for this month.</div>;

    // evaluation.breakdown is keys by category_id
    // It's an object: { "1": { category_name: "Dev", rule_score: 8, llm_score: 7, ... } }
    const items = Object.values(evaluation.breakdown || {});

    // Helper to calc average valid score
    const calcScore = (item) => {
        let sum = 0;
        let count = 0;
        if (item.rule_score != null) { sum += Number(item.rule_score); count++; }
        if (item.llm_score != null) { sum += Number(item.llm_score); count++; }
        if (item.supervisor_score != null) { sum += Number(item.supervisor_score); count++; }
        if (count === 0) return 0;
        return (sum / count).toFixed(1);
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Overall Score</div>
                    <div className="text-3xl font-bold bg-linear-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                        {evaluation.score !== null ? evaluation.score : "Pending"}
                        <span className="text-sm text-gray-400 font-normal"> / 10</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Month</div>
                    <div className="font-medium text-gray-700">
                        {evaluation.year}-{String(evaluation.month).padStart(2, '0')}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${evaluation.status === 'published' ? 'bg-green-100 text-green-700' :
                            evaluation.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {evaluation.status}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-800">{item.category_name}</h4>
                            <div className="text-sm font-bold text-gray-700">
                                {calcScore(item)}
                            </div>
                        </div>

                        <div className="space-y-1 text-xs text-gray-500">
                            <div className="flex justify-between">
                                <span>Activity:</span>
                                <span>{item.logged_hours} hrs</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Planned:</span>
                                <span>{item.planned_hours} hrs</span>
                            </div>

                            <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-3 gap-1 text-center">
                                <div>
                                    <div className="text-[10px] uppercase">Rule</div>
                                    <div className="font-medium text-blue-600">{item.rule_score ?? '-'}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase">AI</div>
                                    <div className="font-medium text-purple-600">{item.llm_score ?? '-'}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase">Sup.</div>
                                    <div className="font-medium text-green-600">{item.supervisor_score ?? '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-center pt-2">
                <button className="text-xs text-blue-500 hover:text-blue-700 font-medium">View Detailed Report &rarr;</button>
            </div>
        </div>
    );
}
