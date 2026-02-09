import React, { useEffect, useState } from "react";
import axios from "axios";

export default function JobDescriptionsPage() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(null);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchRoles();
    }, []);

    async function fetchRoles() {
        setLoading(true);
        try {
            const res = await axios.get("/api/job-roles");
            setRoles(res.data || []);
        } catch (e) {
            console.error(e);
            setMessage("Failed to load job roles");
        } finally {
            setLoading(false);
        }
    }

    function startEdit(role) {
        setEditing({ id: role.id, description: role.description || "" });
        setMessage(null);
    }

    function cancelEdit() {
        setEditing(null);
        setMessage(null);
    }

    async function saveDescription(role) {
        setMessage(null);
        try {
            await axios.put(`/api/job-roles/${role.id}`, {
                name: role.name,
                description: editing.description,
            });
            setMessage("Saved");
            setEditing(null);
            fetchRoles();
        } catch (e) {
            console.error(e);
            setMessage(e.response?.data?.message || "Save failed");
        }
    }

    return (
        <div className="space-y-8">
            <div className="p-6 bg-white rounded-2xl shadow">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black">Job Descriptions</h3>
                        <p className="text-sm text-neutral-500">
                            Edit job descriptions for HR and manager visibility.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                    <div className="p-6 bg-white rounded-2xl">Loading...</div>
                ) : roles.length === 0 ? (
                    <div className="p-6 bg-white rounded-2xl">
                        No job roles found.
                    </div>
                ) : (
                    roles.map((role) => (
                        <div
                            key={role.id}
                            className="p-6 bg-white rounded-2xl shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h4 className="text-lg font-black">
                                        {role.name}
                                    </h4>
                                    {!editing || editing.id !== role.id ? (
                                        <p className="mt-3 text-sm text-slate-600 leading-relaxed min-h-[4rem]">
                                            {role.description || (
                                                <em className="text-neutral-400">
                                                    No description provided
                                                </em>
                                            )}
                                        </p>
                                    ) : (
                                        <textarea
                                            className="w-full p-3 border rounded-lg min-h-[6rem]"
                                            value={editing.description}
                                            onChange={(e) =>
                                                setEditing((prev) => ({
                                                    ...prev,
                                                    description: e.target.value,
                                                }))
                                            }
                                        />
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    {!editing || editing.id !== role.id ? (
                                        <button
                                            onClick={() => startEdit(role)}
                                            className="px-4 py-2 bg-orange-600 text-white rounded-xl font-black text-sm"
                                        >
                                            Edit
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() =>
                                                    saveDescription(role)
                                                }
                                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-sm"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="px-4 py-2 border rounded-xl"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {message && (
                <div className="text-sm font-black uppercase tracking-wider">
                    {message}
                </div>
            )}
        </div>
    );
}
