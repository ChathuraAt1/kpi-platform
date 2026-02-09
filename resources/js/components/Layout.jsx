import React, { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import SessionModal from "./SessionModal";

export default function Layout({ children }) {
    const { user, logout, hasRole } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // Close user menu when user changes (e.g., after login)
    React.useEffect(() => {
        setIsUserMenuOpen(false);
    }, [user]);

    async function handleLogout() {
        await logout();
        navigate("/login");
    }

    const navItems = [
        // Employee / Universal
        {
            name: "My Daily Flow",
            path: "/",
            icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
            roles: ["employee", "supervisor", "hr", "admin", "it_admin"],
            category: "Personal",
        },
        {
            name: "To-Do List",
            path: "/todos",
            icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
            roles: ["employee", "supervisor", "hr", "admin", "it_admin"],
            category: "Personal",
        },

        // Supervisor
        {
            name: "Team Tracker",
            path: "/supervisor",
            icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
            roles: ["supervisor"],
            category: "Team Management",
        },
        {
            name: "Team Task Logs",
            path: "/supervisor/logs",
            icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
            roles: ["supervisor"],
            category: "Team Management",
        },

        // HR
        {
            name: "Evaluation Center",
            path: "/hr",
            icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
            roles: ["hr"],
            category: "HR Management",
        },
        {
            name: "Job Matrix",
            path: "/hr/roles",
            icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
            roles: ["hr", "admin"],
            category: "HR Management",
        },

        {
            name: "Team Architecture",
            path: "/admin/hierarchy",
            icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
            roles: ["hr", "admin"],
            category: "HR Management",
        },
        {
            name: "Transparency Hub",
            path: "/hr/logs",
            icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
            roles: ["hr", "admin", "it_admin"],
            category: "Analytics",
        },

        // Admin / IT
        {
            name: "System Admin",
            path: "/admin",
            icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
            roles: ["admin", "it_admin"],
            category: "System",
        },
        {
            name: "Audit Logs",
            path: "/admin/logs",
            icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
            roles: ["admin", "it_admin"],
            category: "System",
        },
        {
            name: "KPI Categories",
            path: "/admin/kpi-categories",
            icon: "M4 6h16M4 12h16M4 18h16",
            roles: ["hr", "admin", "it_admin"],
            category: "System",
        },
        {
            name: "API Repository",
            path: "/admin/api-keys",
            icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
            roles: ["it_admin"],
            category: "System",
        },
        {
            name: "User Management",
            path: "/admin/users",
            icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
            roles: ["admin"],
            category: "System",
        },
    ];

    const filteredNav = navItems.filter(
        (item) =>
            item.roles.some((role) => hasRole(role.trim())) ||
            (item.name === "Team Tracker" &&
                user?.all_subordinate_ids?.length > 0),
    );

    if (!user && location.pathname !== "/login") return children;
    if (location.pathname === "/login")
        return (
            <div className={`min-h-screen font-sans ${isDark ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
                {children}
            </div>
        );

    return (
        <div className={`flex h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} font-sans transition-colors`}>
            {/* Sidebar */}
            <aside
                className={`${isSidebarOpen ? "w-56" : "w-16"} h-full ${isDark ? "bg-gray-800 text-gray-200" : "bg-black text-gray-200"} transition-all duration-300 flex flex-col shadow-lg relative z-30 border-r ${isDark ? "border-gray-700" : "border-gray-900"}`}
            >
                <div className="p-3 flex items-center justify-between overflow-hidden">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-orange-500 flex items-center justify-center shrink-0 shadow-lg">
                            <span className="text-white font-bold text-sm">
                                K
                            </span>
                        </div>
                        {isSidebarOpen && (
                            <span className="font-bold text-sm text-white tracking-tight">
                                KPiFlow
                            </span>
                        )}
                    </div>
                </div>

                <nav className="flex-1 px-2 space-y-3 mt-4 overflow-y-auto custom-scrollbar">
                    {(() => {
                        const categories = new Map();
                        filteredNav.forEach((item) => {
                            if (!categories.has(item.category)) {
                                categories.set(item.category, []);
                            }
                            categories.get(item.category).push(item);
                        });

                        return Array.from(categories.entries()).map(
                            ([category, items]) => (
                                <div key={category}>
                                    {isSidebarOpen && (
                                        <p className="px-2 text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 mt-3 first:mt-0">
                                            {category}
                                        </p>
                                    )}
                                    <div className="space-y-1">
                                        {items.map((item) => (
                                            <NavLink
                                                key={item.path}
                                                to={item.path}
                                                className={({ isActive }) => `
                                                    flex items-center gap-2 px-2 py-2 rounded-md transition-all group overflow-hidden relative text-xs font-semibold
                                                    ${
                                                        isActive
                                                            ? "bg-orange-500 text-white"
                                                            : isDark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-900 text-gray-300"
                                                    }
                                                `}
                                            >
                                                {isActive && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-white"></div>
                                                )}
                                                <svg
                                                    className={`w-4 h-4 shrink-0 transition-all`}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d={item.icon}
                                                    />
                                                </svg>
                                                {isSidebarOpen && (
                                                    <span className="truncate whitespace-nowrap">
                                                        {item.name}
                                                    </span>
                                                )}
                                            </NavLink>
                                        ))}
                                    </div>
                                </div>
                            ),
                        );
                    })()}
                </nav>

                <div className={`p-2 border-t ${isDark ? "border-gray-700 bg-gray-700/20" : "border-gray-700 bg-gray-700/20"}`}>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`w-full h-8 rounded-md flex items-center justify-center transition-colors ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-700"} text-gray-400`}
                    >
                        <svg
                            className={`w-4 h-4 transition-transform duration-300 ${!isSidebarOpen ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                            />
                        </svg>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 ${isDark ? "bg-gray-900" : "bg-gray-50"} relative overflow-hidden transition-colors`}>
                {/* Topbar */}
                <header className={`h-14 ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-white/50 border-gray-200"} backdrop-blur-xl border-b flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm transition-colors`}>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-0.5">
                            <h2 className={`text-sm font-black tracking-tight ${isDark ? "text-white" : "text-black"}`}>
                                {navItems.find(
                                    (i) => i.path === location.pathname,
                                )?.name || "Overview"}
                            </h2>
                            <p className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                                {navItems.find(
                                    (i) => i.path === location.pathname,
                                )?.category || ""}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Status Check - Mini Badge */}
                        <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest ${isDark ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"} border transition-colors`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            Active
                        </div>

                        <div className={`h-6 w-px ${isDark ? "bg-gray-700" : "bg-gray-200"} opacity-30`}></div>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className={`p-1.5 rounded-md transition-all ${isDark ? "bg-gray-700 hover:bg-gray-600 text-amber-400" : "bg-gray-100 hover:bg-gray-200 text-amber-600"}`}
                            title="Toggle dark mode"
                        >
                            {isDark ? (
                                <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            ) : (
                                <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                </svg>
                            )}
                        </button>

                        {/* User Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() =>
                                    setIsUserMenuOpen(!isUserMenuOpen)
                                }
                                className={`flex items-center gap-2 p-1.5 rounded-md transition-all border ${isDark ? "hover:bg-gray-700 border-gray-700" : "hover:bg-gray-100 border-gray-300"}`}
                            >
                                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black ${isDark ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : "bg-orange-50 text-orange-600 border-orange-200"} border shadow-sm`}>
                                    {user?.name
                                        ? user.name.charAt(0).toUpperCase()
                                        : "?"}
                                </div>
                                <div className="flex-col text-right hidden sm:flex text-[11px]">
                                    <span className={`font-bold leading-none ${isDark ? "text-white" : "text-black"}`}>
                                        {user?.name ?? "User"}
                                    </span>
                                    <span className={`text-[9px] font-bold uppercase tracking-tighter mt-0.5 ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                                        {user?.role ?? ""}
                                    </span>
                                </div>
                                <svg
                                    className={`w-3 h-3 transition-transform ${isDark ? "text-gray-500" : "text-gray-400"} ${isUserMenuOpen ? "rotate-180" : ""}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>

                            {isUserMenuOpen && (
                                <div className={`absolute right-0 mt-1 w-48 rounded-lg shadow-xl border z-50 animate-in fade-in zoom-in duration-200 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                                    <div className={`px-3 py-2 border-b ${isDark ? "border-gray-700 bg-gray-700/30" : "border-gray-200 bg-gray-50"}`}>
                                        <p className={`text-[8px] font-bold uppercase tracking-widest ${isDark ? "text-gray-500" : "text-gray-600"} mb-0.5`}>
                                            Signed in as
                                        </p>
                                        <p className={`text-xs font-bold truncate ${isDark ? "text-gray-200" : "text-gray-900"}`}>
                                            {user.email}
                                        </p>
                                    </div>
                                    <Link
                                        to="/profile"
                                        className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-all ${isDark ? "hover:bg-gray-700 text-gray-300 hover:text-orange-400" : "hover:bg-gray-100 text-gray-700 hover:text-orange-600"}`}
                                        onClick={() => setIsUserMenuOpen(false)}
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                            />
                                        </svg>
                                        My Settings
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-all ${isDark ? "hover:bg-rose-500/20 text-rose-400" : "hover:bg-rose-50 text-rose-600"}`}
                                    >
                                        <svg
                                            className="w-3.5 h-3.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                            />
                                        </svg>
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className={`flex-1 overflow-y-auto p-5 custom-scrollbar relative z-10 transition-all ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>

                <SessionModal />

                {/* Background Accents */}
                <div className={`absolute top-[-15%] right-[-12%] w-[45%] h-[45%] blur-[140px] rounded-full pointer-events-none ${isDark ? "bg-orange-500/5" : "bg-orange-500/8"}`}></div>
                <div className={`absolute bottom-[-15%] left-[-12%] w-[35%] h-[35%] blur-[140px] rounded-full pointer-events-none ${isDark ? "bg-orange-600/5" : "bg-orange-600/8"}`}></div>
            </div>
        </div>
    );
}
