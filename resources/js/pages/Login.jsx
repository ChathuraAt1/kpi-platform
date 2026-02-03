import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
    const { login, hasRole } = useAuth();
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
            if (hasRole("admin")) return navigate("/admin");
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

    return (
        <div
            className="max-w-md mx-auto mt-12 bg-white p-6 rounded shadow"
            role="main"
        >
            <h2 className="text-xl font-semibold mb-4">Login</h2>

            <div aria-live="polite" className="min-h-[1.25rem]">
                {error && <div className="text-red-600 mb-3">{error}</div>}
            </div>

            <form onSubmit={handleSubmit} noValidate>
                <label className="block mb-2">
                    <span className="text-sm text-gray-700">Email</span>
                    <input
                        ref={emailRef}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`mt-1 block w-full border rounded px-3 py-2 ${
                            emailError ? "border-red-400" : "border-gray-300"
                        }`}
                        aria-invalid={!!emailError}
                        aria-describedby={
                            emailError ? "email-error" : undefined
                        }
                        required
                    />
                    {emailError && (
                        <p
                            id="email-error"
                            className="text-xs text-red-600 mt-1"
                        >
                            {emailError}
                        </p>
                    )}
                </label>

                <label className="block mb-4">
                    <span className="text-sm text-gray-700">Password</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`mt-1 block w-full border rounded px-3 py-2 ${
                            passwordError ? "border-red-400" : "border-gray-300"
                        }`}
                        aria-invalid={!!passwordError}
                        aria-describedby={
                            passwordError ? "password-error" : undefined
                        }
                        required
                    />
                    {passwordError && (
                        <p
                            id="password-error"
                            className="text-xs text-red-600 mt-1"
                        >
                            {passwordError}
                        </p>
                    )}
                </label>

                <div className="flex items-center justify-between">
                    <button
                        type="submit"
                        className={`inline-flex items-center px-4 py-2 rounded text-white ${
                            isValid && !loading
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-blue-300 cursor-not-allowed"
                        }`}
                        disabled={!isValid || loading}
                        aria-disabled={!isValid || loading}
                    >
                        {loading ? (
                            <>
                                <svg
                                    className="animate-spin h-4 w-4 mr-2 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                    ></path>
                                </svg>
                                Logging in...
                            </>
                        ) : (
                            "Login"
                        )}
                    </button>

                    <a href="/password/reset" className="text-sm text-gray-600">
                        Forgot password?
                    </a>
                </div>
            </form>
        </div>
    );
}
