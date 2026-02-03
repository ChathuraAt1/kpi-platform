import React, { useState, useEffect } from "react";
import axios from "axios";

export default function TodosPage() {
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTodo, setNewTodo] = useState({ title: "", priority: "medium", due_date: "" });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchTodos();
    }, []);

    const fetchTodos = async () => {
        setLoading(true);
        try {
            const resp = await axios.get("/api/todos");
            setTodos(resp.data);
        } catch (e) {
            console.error("Failed to fetch todos", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTodo = async (e) => {
        e.preventDefault();
        if (!newTodo.title.trim()) return;
        setSubmitting(true);
        try {
            await axios.post("/api/todos", newTodo);
            setNewTodo({ title: "", priority: "medium", due_date: "" });
            fetchTodos();
        } catch (e) {
            alert("Failed to add todo");
        } finally {
            setSubmitting(false);
        }
    };

    const toggleComplete = async (todo) => {
        try {
            await axios.put(`/api/todos/${todo.id}`, {
                ...todo,
                completed: !todo.completed
            });
            // Update local state for immediate feedback
            setTodos(todos.map(t => t.id === todo.id ? { ...t, completed: !t.completed } : t));
        } catch (e) {
            alert("Failed to update status");
        }
    };

    const deleteTodo = async (id) => {
        if (!confirm("Are you sure?")) return;
        try {
            await axios.delete(`/api/todos/${id}`);
            fetchTodos();
        } catch (e) {
            alert("Failed to delete");
        }
    };

    return (
        <div className="space-y-10 pb-20">
            <header className="relative p-10 rounded-4xl bg-linear-to-br from-indigo-950 to-slate-900 text-white overflow-hidden shadow-2xl border border-white/5 group">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest border border-white/5">Daily Mission Control</span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight">Unified <span className="text-indigo-400">Ledger</span></h2>
                    <p className="text-slate-400 font-medium max-w-sm mt-2">Strategic objectives from your morning plan synced with personal errands and operational logs.</p>
                </div>
                <div className="absolute top-[-40%] right-[-10%] w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
            </header>

            <div className="max-w-5xl mx-auto">
                <form onSubmit={handleAddTodo} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-10 flex flex-wrap gap-6 items-end">
                    <div className="flex-1 min-w-[300px]">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Add Personal Objective</label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            placeholder="What's on your agenda today?"
                            value={newTodo.title}
                            onChange={e => setNewTodo({ ...newTodo, title: e.target.value })}
                        />
                    </div>
                    <div className="w-40">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Priority</label>
                        <select
                            className="w-full bg-slate-50 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-slate-500 hover:border-slate-300 transition-all cursor-pointer"
                            value={newTodo.priority}
                            onChange={e => setNewTodo({ ...newTodo, priority: e.target.value })}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div className="w-52">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Due Sequence</label>
                        <input
                            type="date"
                            className="w-full bg-slate-50 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-slate-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            value={newTodo.due_date}
                            onChange={e => setNewTodo({ ...newTodo, due_date: e.target.value })}
                        />
                    </div>
                    <button
                        disabled={submitting}
                        type="submit"
                        className="h-[58px] px-10 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95 flex items-center gap-3"
                    >
                        Deploy
                    </button>
                </form>

                {loading ? (
                    <div className="py-20 text-center animate-pulse text-indigo-500 font-black uppercase tracking-widest italic">Querying Aggregated Matrix...</div>
                ) : (
                    <div className="space-y-4">
                        {todos.length === 0 && <p className="text-slate-400 text-center py-20 font-bold italic">No active objectives discovered in the ledger.</p>}
                        {todos.map(todo => (
                            <div key={todo.id} className={`group relative flex items-center gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${todo.completed ? 'bg-slate-50/50 grayscale-[0.5]' : ''}`}>
                                <button
                                    onClick={() => todo.type !== 'log' && toggleComplete(todo)}
                                    className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${todo.completed
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'border-slate-200 hover:border-indigo-500 text-transparent'
                                        }`}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </button>

                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${todo.type === 'task' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                            todo.type === 'log' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                'bg-slate-100 text-slate-500 border-slate-200'
                                            }`}>
                                            {todo.type === 'task' ? 'Strategic Task' : todo.type === 'log' ? 'System Log' : 'Personal Todo'}
                                        </span>
                                        {todo.kpi_category && (
                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Category: {todo.kpi_category}</span>
                                        )}
                                    </div>
                                    <h4 className={`text-base font-bold transition-all ${todo.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                        {todo.title}
                                    </h4>
                                    {todo.notes && (
                                        <p className="text-xs font-medium text-slate-400 mt-1 line-clamp-1">{todo.notes}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="hidden sm:flex flex-col items-end">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${todo.priority === 'high' ? 'text-rose-500' :
                                            todo.priority === 'medium' ? 'text-amber-500' :
                                                'text-emerald-500'
                                            }`}>
                                            {todo.priority} Priority
                                        </span>
                                        {todo.due_date && (
                                            <span className="text-[10px] font-bold text-slate-300 mt-1">{todo.due_date}</span>
                                        )}
                                    </div>

                                    {todo.type === 'todo' && (
                                        <button
                                            onClick={() => deleteTodo(todo.id)}
                                            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
