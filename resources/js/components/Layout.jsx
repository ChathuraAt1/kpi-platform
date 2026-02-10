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
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    React.useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile && isSidebarOpen) {
                setIsSidebarOpen(false);
            } else if (!mobile && !isSidebarOpen) {
                setIsSidebarOpen(true);
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Close user menu when user changes (e.g., after login)
    React.useEffect(() => {
        setIsUserMenuOpen(false);
    }, [user]);

    // Auto-close sidebar on mobile when navigating
    React.useEffect(() => {
        if (isMobile) {
            setIsSidebarOpen(false);
        }
    }, [location.pathname, isMobile]);

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
            <div
                className={`min-h-screen font-sans ${isDark ? "bg-gray-900 text-white" : "bg-white text-black"}`}
            >
                {children}
            </div>
        );

    return (
        <div
            className={`flex h-screen ${isDark ? "bg-gray-950" : "bg-gray-50"} font-sans transition-colors`}
        >
            {/* Mobile Backdrop */}
            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    ${isSidebarOpen ? "w-72" : isMobile ? "w-0 -ml-16 overflow-hidden" : "w-24"} 
                    fixed lg:relative z-50 h-full flex flex-col transition-all duration-300 ease-in-out border-r
                    ${isDark ? "bg-gray-900/95 backdrop-blur-xl border-white/5" : "bg-white/95 backdrop-blur-xl border-gray-200/50"}
                `}
            >
                <div className="h-20 flex items-center px-6">
                    <div className={`flex items-center gap-4 ${!isSidebarOpen && !isMobile ? "justify-center w-full" : ""}`}>
                        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20 ring-1 ring-white/20">
                            <span className="text-white font-black text-lg">
                                K
                            </span>
                        </div>
                        {(isSidebarOpen) && (
                            <div className="flex flex-col">
                                <span className={`font-black text-xl tracking-tight leading-none ${isDark ? "text-white" : "text-gray-900"}`}>
                                    KPiFlow
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-0.5">Platform</span>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-8 mt-4 overflow-y-auto custom-scrollbar">
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
                                        <p className="px-4 text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3 opacity-80">
                                            {category}
                                        </p>
                                    )}
                                    <div className="space-y-1">
                                        {items.map((item) => (
                                            <NavLink
                                                key={item.path}
                                                to={item.path}
                                                end={item.path === "/"}
                                            >
                                                {({ isActive }) => (
                                                    <div
                                                        className={`
                                                            flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group relative overflow-hidden text-sm font-bold
                                                            ${isActive
                                                                ? "bg-orange-600 text-white shadow-lg shadow-orange-500/30"
                                                                : isDark
                                                                    ? "text-gray-400 hover:text-white hover:bg-white/5"
                                                                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                                            }
                                                            ${!isSidebarOpen && !isMobile ? "justify-center px-0 py-4" : ""}
                                                        `}
                                                        title={!isSidebarOpen ? item.name : ""}
                                                    >
                                                        <svg
                                                            className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive ? "scale-105" : "group-hover:scale-110"}`}
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2.5}
                                                                d={item.icon}
                                                            />
                                                        </svg>
                                                        {isSidebarOpen && (
                                                            <span className="truncate tracking-tight">
                                                                {item.name}
                                                            </span>
                                                        )}

                                                        {/* Tooltip for collapsed state */}
                                                        {!isSidebarOpen && !isMobile && (
                                                            <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl whitespace-nowrap">
                                                                {item.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </NavLink>
                                        ))}
                                    </div>
                                </div>
                            ),
                        );
                    })()}
                </nav>

                <div className={`p-6 border-t ${isDark ? "border-white/5" : "border-gray-100"}`}>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`w-full h-12 rounded-xl flex items-center justify-center transition-all ${isDark ? "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white" : "bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600"}`}
                    >
                        <svg
                            className={`w-5 h-5 transition-transform duration-300 ${!isSidebarOpen ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                            />
                        </svg>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div
                className={`flex-1 flex flex-col min-w-0 ${isDark ? "bg-gray-950" : "bg-gray-50/50"} relative overflow-hidden transition-colors w-full`}
            >
                {/* Topbar */}
                <header
                    className={`h-20 ${isDark ? "bg-gray-900/80 border-white/5" : "bg-white/80 border-gray-200/50"} backdrop-blur-xl border-b flex items-center justify-between px-8 sticky top-0 z-30 transition-colors shadow-sm`}
                >
                    <div className="flex items-center gap-4">
                        {isMobile && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className={`p-2.5 rounded-xl ${isDark ? "text-gray-200 bg-white/5" : "text-gray-600 bg-gray-100"}`}
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        )}
                        <div className="flex flex-col">
                            <h2
                                className={`text-lg font-black tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}
                            >
                                {navItems.find(
                                    (i) => i.path === location.pathname,
                                )?.name || "Overview"}
                            </h2>
                            <p
                                className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-gray-500" : "text-gray-400"}`}
                            >
                                {navItems.find(
                                    (i) => i.path === location.pathname,
                                )?.category || "Dashboard"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 lg:gap-6">
                        {/* Status Check - Mini Badge */}
                        <div
                            className={`hidden sm:flex px-4 py-2 rounded-full items-center gap-2.5 text-[10px] font-black uppercase tracking-widest ${isDark ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            System Active
                        </div>

                        <div className={`h-8 w-px ${isDark ? "bg-gray-800" : "bg-gray-200"}`}></div>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDark
                                ? "bg-gray-800 text-amber-400 hover:bg-gray-700"
                                : "bg-gray-100 text-gray-500 hover:text-amber-500 hover:bg-amber-50"
                                }`}
                            title="Toggle theme"
                        >
                            {isDark ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
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
                                className={`flex items-center gap-3 p-1.5 pr-4 rounded-full transition-all border ${isDark
                                    ? "bg-gray-800 border-gray-700 hover:border-gray-600"
                                    : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md"
                                    }`}
                            >
                                <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white bg-linear-to-br from-orange-500 to-orange-600 shadow-md shadow-orange-500/20`}
                                >
                                    {user?.name
                                        ? user.name.charAt(0).toUpperCase()
                                        : "?"}
                                </div>
                                <div className="flex-col text-right hidden sm:flex">
                                    <span
                                        className={`text-xs font-bold leading-none ${isDark ? "text-gray-200" : "text-gray-900"}`}
                                    >
                                        {user?.name ?? "User"}
                                    </span>
                                </div>
                                <svg
                                    className={`w-4 h-4 transition-transform ${isDark ? "text-gray-500" : "text-gray-400"} ${isUserMenuOpen ? "rotate-180" : ""}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.5}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>

                            {isUserMenuOpen && (
                                <div
                                    className={`absolute right-0 mt-4 w-60 rounded-3xl shadow-2xl border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-black/5 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}
                                >
                                    <div className="p-6 bg-linear-to-br from-orange-500/10 to-transparent">
                                        <p className={`text-sm font-black ${isDark ? "text-white" : "text-gray-900"}`}>
                                            {user?.name}
                                        </p>
                                        <p className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                            {user?.email}
                                        </p>
                                        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-600"}`}>
                                            {user?.role}
                                        </span>
                                    </div>

                                    <div className="p-2 space-y-1">
                                        <Link
                                            to="/profile"
                                            className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-2xl transition-all ${isDark ? "hover:bg-gray-700 text-gray-300 hover:text-white" : "hover:bg-gray-50 text-gray-600 hover:text-gray-900"}`}
                                            onClick={() => setIsUserMenuOpen(false)}
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Account Settings
                                        </Link>

                                        <hr className={`my-2 ${isDark ? "border-gray-700" : "border-gray-100"}`} />

                                        <button
                                            onClick={handleLogout}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-2xl transition-all ${isDark ? "hover:bg-rose-500/10 text-rose-400" : "hover:bg-rose-50 text-rose-600"}`}
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main
                    className={`flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10 transition-all ${isDark ? "bg-gray-950" : "bg-gray-50/50"}`}
                >
                    <div className="max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>

                <SessionModal />
            </div>
        </div>
    );
}
