import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SessionModal() {
    const {
        showReauthModal,
        setShowReauthModal,
        login,
        fetchUser,
        sessionLastRefreshed,
    } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        let timer;
        if (showReauthModal) {
            // if user cancels, auto-redirect to login after 2 minutes
            timer = setTimeout(() => {
                setShowReauthModal(false);
                navigate("/login");
            }, 120000);
        }
        return () => clearTimeout(timer);
    }, [showReauthModal]);

    if (!showReauthModal) return null;

    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await login(email, password);
            // fetchUser will update session state; close modal
            await fetchUser();
            setShowReauthModal(false);
        } catch (err) {
            setError(err.response?.data?.message || "Re-login failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-2">Session Required</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Your session has expired or requires re-authentication.
                    Please re-enter your credentials to continue without losing
                    unsaved changes.
                </p>

                {error && <div className="text-red-600 mb-2">{error}</div>}

                <form onSubmit={submit}>
                    <label className="block mb-2">
                        <span className="text-sm text-gray-700">Email</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full border rounded px-3 py-2"
                            required
                        />
                    </label>
                    <label className="block mb-4">
                        <span className="text-sm text-gray-700">Password</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full border rounded px-3 py-2"
                            required
                        />
                    </label>
                    <div className="flex items-center justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => {
                                setShowReauthModal(false);
                                navigate("/login");
                            }}
                            className="px-3 py-2 rounded border"
                        >
                            Go to Login
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded"
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                    </div>
                </form>

                <div className="mt-3 text-xs text-gray-500">
                    Last check:{" "}
                    {sessionLastRefreshed
                        ? new Date(sessionLastRefreshed).toLocaleTimeString()
                        : "n/a"}
                </div>
            </div>
        </div>
    );
}
