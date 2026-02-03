import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import SessionModal from "./SessionModal";

export default function Layout({ children }) {
    const { user, logout, hasRole, sessionLastRefreshed } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        await logout();
        navigate("/login");
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-gray-900">
                        KPI Platform
                    </h1>
                    <nav className="space-x-4 flex items-center">
                        {user ? (
                            <>
                                <NavLink
                                    to="/"
                                    className={({ isActive }) =>
                                        isActive
                                            ? "text-blue-600 font-medium"
                                            : "text-gray-700"
                                    }
                                >
                                    Dashboard
                                </NavLink>

                                <NavLink
                                    to="/todos"
                                    className={({ isActive }) =>
                                        isActive
                                            ? "text-blue-600 font-medium"
                                            : "text-gray-700"
                                    }
                                >
                                    To-Do List
                                </NavLink>

                                {hasRole("supervisor") && (
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
                                )}

                                {hasRole("hr") && (
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
                                )}

                                {hasRole("admin") && (
                                    <>
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
                                        <NavLink
                                            to="/admin/api-keys"
                                            className={({ isActive }) =>
                                                isActive
                                                    ? "text-blue-600 font-medium"
                                                    : "text-gray-700"
                                            }
                                        >
                                            API Keys
                                        </NavLink>
                                        <NavLink
                                            to="/admin/users"
                                            className={({ isActive }) =>
                                                isActive
                                                    ? "text-blue-600 font-medium"
                                                    : "text-gray-700"
                                            }
                                        >
                                            Users
                                        </NavLink>
                                    </>
                                )}

                                <div className="ml-4 flex items-center space-x-3">
                                    <div className="flex flex-col text-right">
                                        <span className="text-sm text-gray-600">
                                            {user?.name}
                                        </span>
                                        {sessionLastRefreshed && (
                                            <span className="text-xs text-gray-400">
                                                Last check:{" "}
                                                {new Date(
                                                    sessionLastRefreshed,
                                                ).toLocaleTimeString()}
                                            </span>
                                        )}
                                    </div>

                                    {/** session expiry badge */}
                                    {/** show small warning if reauth required */}
                                    {/** Use simple indicator — modal is shown separately */}
                                    <div>
                                        {/** placeholder for badge */}
                                        <span className="text-xs text-yellow-600">
                                            {sessionLastRefreshed ? "" : ""}
                                        </span>
                                        <Link
                                            to="/profile"
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            onClick={() => { /* setIsProfileOpen(false) */ }}
                                        >
                                            My Profile
                                        </Link>
                                        <button
                                            onClick={() => {
                                                logout();
                                                // setIsProfileOpen(false);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Sign out
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleLogout}
                                        className="text-sm text-red-600"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </>
                        ) : (
                            <Link to="/login" className="text-blue-600">
                                Login
                            </Link>
                        )}
                    </nav>
                </div>
            </header>

            <main className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>

            <SessionModal />
        </div>
    );
}
