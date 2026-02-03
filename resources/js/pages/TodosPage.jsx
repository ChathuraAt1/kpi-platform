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
            fetchTodos();
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

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">My To-Do List</h2>

            <form onSubmit={handleAddTodo} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">New Task</label>
                    <input
                        type="text"
                        className="w-full border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="What needs to be done?"
                        value={newTodo.title}
                        onChange={e => setNewTodo({ ...newTodo, title: e.target.value })}
                    />
                </div>
                <div className="w-32">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Priority</label>
                    <select
                        className="w-full border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        value={newTodo.priority}
                        onChange={e => setNewTodo({ ...newTodo, priority: e.target.value })}
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
                <div className="w-40">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Due Date</label>
                    <input
                        type="date"
                        className="w-full border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        value={newTodo.due_date}
                        onChange={e => setNewTodo({ ...newTodo, due_date: e.target.value })}
                    />
                </div>
                <button
                    disabled={submitting}
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                    Add
                </button>
            </form>

            <div className="space-y-3">
                {todos.length === 0 && <p className="text-gray-500 text-center py-8">No tasks yet. Add one above!</p>}
                {todos.map(todo => (
                    <div key={todo.id} className={`flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition ${todo.completed ? 'opacity-60' : ''}`}>
                        <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => toggleComplete(todo)}
                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                            <h4 className={`font-medium ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                {todo.title}
                            </h4>
                            <div className="flex gap-3 mt-1">
                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${todo.priority === 'high' ? 'bg-red-100 text-red-700' :
                                        todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-green-100 text-green-700'
                                    }`}>
                                    {todo.priority}
                                </span>
                                {todo.due_date && (
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {todo.due_date}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => deleteTodo(todo.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
