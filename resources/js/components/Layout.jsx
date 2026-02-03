import React from "react";
import { Link, NavLink } from "react-router-dom";

export default function Layout({ children }) {
    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-gray-900">
                        KPI Platform
                    </h1>
                    <nav className="space-x-4">
                        <NavLink
                            to="/"
                            className={({ isActive }) =>
                                isActive
                                    ? "text-blue-600 font-medium"
                                    : "text-gray-700"
                            }
                        >
                            Employee
                        </NavLink>
                        <NavLink
                            to="/supervisor"
                            className={({ isActive }) =>
                                isActive
                                    ? "text-blue-600 font-medium"
                                    : "text-gray-700"
                            }
                        >
                            Supervisor
                        </NavLink>
                        <NavLink
                            to="/hr"
                            className={({ isActive }) =>
                                isActive
                                    ? "text-blue-600 font-medium"
                                    : "text-gray-700"
                            }
                        >
                            HR
                        </NavLink>
                        <NavLink
                            to="/admin"
                            className={({ isActive }) =>
                                isActive
                                    ? "text-blue-600 font-medium"
                                    : "text-gray-700"
                            }
                        >
                            Admin
                        </NavLink>
                    </nav>
                </div>
            </header>

            <main className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
