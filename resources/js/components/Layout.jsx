import React, { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import SessionModal from "./SessionModal";

export default function Layout({ children }) {
    const { user, logout, hasRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    async function handleLogout() {
        await logout();
        navigate("/login");
    }

    const navItems = [
        // Employee / Universal
        { name: "My Daily Flow", path: "/", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", roles: ["employee", "supervisor", "hr", "admin", "it_admin"] },
        { name: "To-Do List", path: "/todos", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", roles: ["employee", "supervisor", "hr", "admin", "it_admin"] },

        // Supervisor
        { name: "Team Tracker", path: "/supervisor", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", roles: ["supervisor"] },
        { name: "Log Explorer", path: "/supervisor/logs", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", roles: ["supervisor"] },

        // HR
        { name: "Evaluation Center", path: "/hr", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", roles: ["hr"] },
        { name: "Job Matrix", path: "/hr/roles", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", roles: ["hr", "admin"] },
        { name: "Team Architecture", path: "/admin/hierarchy", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", roles: ["hr", "admin"] },
        { name: "Transparency Hub", path: "/hr/logs", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", roles: ["hr"] },

        // Admin / IT
        { name: "System Admin", path: "/admin", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z", roles: ["admin", "it_admin"] },
        { name: "Audit Logs", path: "/admin/logs", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", roles: ["admin", "it_admin"] },
        { name: "API Repository", path: "/admin/api-keys", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", roles: ["it_admin"] },
        { name: "User Management", path: "/admin/users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", roles: ["admin"] },
    ];

    const filteredNav = navItems.filter(item =>
        item.roles.some(role => hasRole(role.trim())) ||
        (item.name === "Team Tracker" && user?.all_subordinate_ids?.length > 0)
    );

    if (!user && location.pathname !== "/login") return children;
    if (location.pathname === "/login") return <div className="min-h-screen bg-slate-950 font-sans">{children}</div>;

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} h-full bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col shadow-2xl relative z-30`}>
                <div className="p-6 flex items-center justify-between overflow-hidden">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                            <span className="text-white font-bold text-xl">K</span>
                        </div>
                        {isSidebarOpen && <span className="font-bold text-lg text-white tracking-tight">KPiFlow</span>}
                    </div>
                </div>

                <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
                    {filteredNav.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-3 py-3 rounded-xl transition-all group overflow-hidden
                                ${isActive
                                    ? "bg-indigo-600/10 text-indigo-400 font-semibold"
                                    : "hover:bg-slate-800 hover:text-white"}
                            `}
                        >
                            <svg className={`w-5 h-5 shrink-0 transition-colors ${location.pathname === item.path ? 'text-indigo-500' : 'text-slate-500 group-hover:text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                            </svg>
                            {isSidebarOpen && <span className="truncate whitespace-nowrap">{item.name}</span>}
                            {location.pathname === item.path && <div className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="w-full h-10 rounded-lg hover:bg-slate-800 flex items-center justify-center transition-colors text-slate-500 group"
                    >
                        <svg className={`w-5 h-5 transition-transform duration-300 ${!isSidebarOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative overflow-hidden">
                {/* Topbar */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold bg-linear-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                            {navItems.find(i => i.path === location.pathname)?.name || "Overview"}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Status Check - Mini Badge */}
                        <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live</span>
                        </div>

                        <div className="h-8 w-px bg-slate-200 mx-1"></div>

                        {/* User Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                            >
                                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-50 to-indigo-100 flex items-center justify-center border border-indigo-200">
                                    <span className="text-indigo-600 font-bold text-xs">{user.name.charAt(0)}</span>
                                </div>
                                <div className="flex-col text-right hidden sm:flex">
                                    <span className="text-sm font-bold text-slate-900 leading-none">{user.name}</span>
                                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter mt-1">{user.role}</span>
                                </div>
                                <svg className={`w-4 h-4 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in duration-200">
                                    <div className="px-4 py-3 border-b border-slate-50 mb-1">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Authenticated</p>
                                        <p className="text-sm font-bold text-slate-800 truncate">{user.email}</p>
                                    </div>
                                    <Link
                                        to="/profile"
                                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all font-medium"
                                        onClick={() => setIsUserMenuOpen(false)}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        My Settings
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-500 hover:bg-rose-50 rounded-xl transition-all font-bold mt-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10 transition-all">
                    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>

                <SessionModal />

                {/* Background Accents (Glassmorphism effect) */}
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-violet-500/5 blur-[100px] rounded-full pointer-events-none"></div>
            </div>
        </div>
    );
}
