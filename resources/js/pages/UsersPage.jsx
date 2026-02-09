import React, { useEffect, useState } from "react";
import axios from "axios";

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        axios
            .get("/api/users")
            .then((r) => setUsers(r.data.data || []))
            .finally(() => setLoading(false));
    }, []);

    const getRoleColor = (role) => {
        const roleColors = {
            admin: "bg-rose-100 text-rose-700",
            it_admin: "bg-violet-100 text-violet-700",
            hr: "bg-indigo-100 text-indigo-700",
            supervisor: "bg-amber-100 text-amber-700",
            employee: "bg-emerald-100 text-emerald-700",
        };
        return roleColors[role] || "bg-slate-100 text-neutral-700";
    };

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <header className="relative p-10 rounded-4xl bg-linear-to-br from-indigo-900 to-slate-900 text-white overflow-hidden shadow-2xl border border-orange-500/10">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-orange-500/20 backdrop-blur-md rounded-full text-[10px] font-black text-orange-300 uppercase tracking-widest border border-orange-400/20">
                            Administration
                        </span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight">
                        User <span className="text-orange-400">Management</span>
                    </h2>
                    <p className="text-neutral-400 font-medium max-w-2xl mt-2">
                        View and manage all users in the system, including their
                        roles and supervisors.
                    </p>
                </div>
            </header>

            {/* Users Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 bg-neutral-50/50">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                        All Users ({users.length})
                    </h3>
                </div>

                {loading ? (
                    <div className="p-8 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 border-4 border-orange-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                            <p className="text-neutral-400 font-medium">
                                Loading users...
                            </p>
                        </div>
                    </div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-neutral-500 font-medium mb-2">
                            No users found
                        </p>
                        <p className="text-neutral-400 text-sm">
                            Users will appear here as they are created
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        Supervisor
                                    </th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((u) => (
                                    <tr
                                        key={u.id}
                                        className="hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-bold text-neutral-900">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center border border-indigo-200">
                                                    <span className="text-indigo-700 font-black text-sm">
                                                        {u.name
                                                            ? u.name
                                                                  .charAt(0)
                                                                  .toUpperCase()
                                                            : "?"}
                                                    </span>
                                                </div>
                                                <span>{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {u.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${getRoleColor(u.role)}`}
                                            >
                                                {u.role
                                                    ? u.role
                                                          .replace("_", " ")
                                                          .replace(
                                                              /\b\w/g,
                                                              (l) =>
                                                                  l.toUpperCase(),
                                                          )
                                                    : "N/A"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.supervisor ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                                                        <span className="text-slate-600 font-black text-xs">
                                                            {u.supervisor.name
                                                                ? u.supervisor.name
                                                                      .charAt(0)
                                                                      .toUpperCase()
                                                                : "?"}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-medium">
                                                        {u.supervisor.name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-neutral-400 text-sm italic">
                                                    No supervisor
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">
                                                Active
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
