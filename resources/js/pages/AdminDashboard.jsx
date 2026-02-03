import React from "react";

export default function AdminDashboard() {
    return (
        <div>
            <h2 className="text-2xl font-semibold mb-4">Admin Dashboard</h2>

            <div className="grid grid-cols-1 gap-4">
                <div className="bg-white shadow rounded p-4">
                    <h3 className="font-medium">API Keys</h3>
                    <p className="text-sm text-gray-600">
                        Manage your AI provider keys, priorities and view usage.
                    </p>
                    <a className="text-blue-600" href="/api-keys">
                        Go to API Key Management (admin)
                    </a>
                </div>

                <div className="bg-white shadow rounded p-4">
                    <h3 className="font-medium">Users</h3>
                    <p className="text-sm text-gray-600">
                        Manage users and roles.
                    </p>
                    <a className="text-blue-600" href="/users">
                        Go to User Management (admin)
                    </a>
                </div>
            </div>
        </div>
    );
}
