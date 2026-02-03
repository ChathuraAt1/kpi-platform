import React, { useEffect, useState } from "react";
import axios from "axios";

export default function UsersPage() {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        axios.get("/api/users").then((r) => setUsers(r.data.data || []));
    }, []);

    return (
        <div>
            <h2 className="text-2xl font-semibold mb-4">Users</h2>
            <div className="bg-white shadow rounded p-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-gray-600">
                            <th className="p-2">Name</th>
                            <th>Role</th>
                            <th>Supervisor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id} className="border-t">
                                <td className="p-2">{u.name}</td>
                                <td className="p-2">{u.role}</td>
                                <td className="p-2">
                                    {u.supervisor?.name || "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
