import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
    const { login, hasRole } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const [emailError, setEmailError] = useState(null);
    const [passwordError, setPasswordError] = useState(null);

    const emailRef = useRef(null);

    useEffect(() => {
        emailRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!email) return setEmailError(null);
        setEmailError(emailRegex.test(email) ? null : "Invalid email address");
    }, [email]);

    useEffect(() => {
        if (!password) return setPasswordError(null);
        setPasswordError(
            password.length >= 6
                ? null
                : "Password must be at least 6 characters",
        );
    }, [password]);

    const isValid = !emailError && !passwordError && email && password;

    async function handleSubmit(e) {
        e.preventDefault();
        if (!isValid) {
            setError("Please fix the validation errors before submitting.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await login(email, password);
            if (hasRole("admin") || hasRole("it_admin"))
                return navigate("/admin");
            if (hasRole("hr")) return navigate("/hr");
            if (hasRole("supervisor")) return navigate("/supervisor");
            navigate("/");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Failed to login - check credentials",
            );
        } finally {
            setLoading(false);
        }
    }

    const demoCredentials = [
        { email: "admin@kpi.com", role: "Admin", color: "rose" },
        { email: "hr@kpi.com", role: "HR Manager", color: "blue" },
        { email: "supervisor@kpi.com", role: "Supervisor", color: "amber" },
        { email: "employee1@kpi.com", role: "Employee", color: "emerald" },
    ];

    return (
        <div
            className={`min-h-screen flex items-center justify-center p-4 transition-colors ${isDark ? "bg-linear-to-br from-neutral-950 via-neutral-900 to-neutral-950" : "bg-linear-to-br from-white via-neutral-50 to-white"}`}
        >
            {/* Dark Mode Toggle */}
            <button
                onClick={toggleTheme}
                className={`absolute top-6 right-6 p-2 rounded-lg transition-all ${isDark ? "bg-neutral-800 hover:bg-neutral-700 text-amber-400" : "bg-neutral-100 hover:bg-neutral-200 text-amber-600"}`}
                title="Toggle dark mode"
            >
                {isDark ? (
                    <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                ) : (
                    <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                )}
            </button>

            <div className="w-full max-w-md">
                {/* Logo/Brand Section */}
                <div className="text-center mb-8">
                    <div
                        className={`inline-flex items-center justify-center w-14 h-14 rounded-lg ${isDark ? "bg-orange-500/20 border-orange-500/30" : "bg-orange-50 border-orange-200"} border mb-3`}
                    >
                        <span className="text-2xl font-black text-orange-500">
                            📊
                        </span>
                    </div>
                    <h1
                        className={`text-3xl font-black tracking-tight mb-1 ${isDark ? "text-white" : "text-neutral-900"}`}
                    >
                        KPI Platform
                    </h1>
                    <p
                        className={`text-sm font-medium ${isDark ? "text-neutral-400" : "text-neutral-600"}`}
                    >
                        Performance & Task Management
                    </p>
                </div>

                {/* Login Card */}
                <div
                    className={`rounded-xl shadow-xl ${isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"} border p-8 mb-6`}
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Input */}
                        <div>
                            <label
                                className={`block text-xs font-black uppercase tracking-widest mb-2 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}
                            >
                                Email
                            </label>
                            <input
                                ref={emailRef}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="user@kpi.com"
                                className={`w-full px-4 py-2 rounded-lg border transition-all text-sm font-semibold ${
                                    isDark
                                        ? "bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500 focus:border-orange-500 focus:ring-orange-500/20"
                                        : "bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-orange-500 focus:ring-orange-50"
                                } focus:outline-none focus:ring-2`}
                            />
                            {emailError && (
                                <p className="text-xs text-rose-500 font-semibold mt-1">
                                    {emailError}
                                </p>
                            )}
                        </div>

                        {/* Password Input */}
                        <div>
                            <label
                                className={`block text-xs font-black uppercase tracking-widest mb-2 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}
                            >
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••"
                                className={`w-full px-4 py-2 rounded-lg border transition-all text-sm font-semibold ${
                                    isDark
                                        ? "bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500 focus:border-orange-500 focus:ring-orange-500/20"
                                        : "bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-orange-500 focus:ring-orange-50"
                                } focus:outline-none focus:ring-2`}
                            />
                            {passwordError && (
                                <p className="text-xs text-rose-500 font-semibold mt-1">
                                    {passwordError}
                                </p>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div
                                className={`p-3 rounded-lg text-xs font-semibold ${isDark ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"} border`}
                            >
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={!isValid || loading}
                            className={`w-full py-2 px-4 rounded-lg font-black text-sm uppercase tracking-widest transition-all ${
                                isValid && !loading
                                    ? "bg-linear-to-r from-orange-500 to-orange-600 text-white hover:shadow-lg hover:shadow-orange-500/30 active:scale-95"
                                    : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                            }`}
                        >
                            {loading ? "Signing In..." : "Sign In"}
                        </button>
                    </form>
                </div>

                {/* Demo Credentials Section */}
                <div
                    className={`rounded-xl ${isDark ? "bg-neutral-900/50 border-neutral-800" : "bg-neutral-50 border-neutral-200"} border p-6`}
                >
                    <h3
                        className={`text-xs font-black uppercase tracking-widest mb-4 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}
                    >
                        Demo Credentials
                    </h3>
                    <div className="space-y-2">
                        {demoCredentials.map((cred) => (
                            <button
                                key={cred.email}
                                type="button"
                                onClick={() => {
                                    setEmail(cred.email);
                                    setPassword("password");
                                }}
                                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all text-xs font-semibold group ${
                                    isDark
                                        ? "hover:bg-neutral-800 border border-neutral-700/50"
                                        : "hover:bg-white border border-neutral-200"
                                }`}
                            >
                                <div className="flex items-center gap-2 text-left">
                                    <span className="text-lg">👤</span>
                                    <div>
                                        <p
                                            className={`${isDark ? "text-white" : "text-neutral-900"} group-hover:text-orange-500`}
                                        >
                                            {cred.email}
                                        </p>
                                        <p
                                            className={`text-[11px] font-medium ${isDark ? "text-neutral-500" : "text-neutral-500"}`}
                                        >
                                            {cred.role}
                                        </p>
                                    </div>
                                </div>
                                <svg
                                    className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isDark ? "text-neutral-600 group-hover:text-orange-400" : "text-neutral-400 group-hover:text-orange-600"}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                    />
                                </svg>
                            </button>
                        ))}
                    </div>
                    <p
                        className={`text-[11px] font-semibold mt-4 pt-4 border-t ${isDark ? "border-neutral-800 text-neutral-500" : "border-neutral-200 text-neutral-600"}`}
                    >
                        Password:{" "}
                        <span className="text-orange-500">password</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
