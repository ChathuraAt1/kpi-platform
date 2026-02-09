import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useRef,
} from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessionLastRefreshed, setSessionLastRefreshed] = useState(null);
    const intervalRef = useRef(null);
    const { addToast } = useToast();

    const [showReauthModal, setShowReauthModal] = useState(false);
    const [reauthAttempts, setReauthAttempts] = useState(0);
    const reauthAttemptsRef = useRef(0);
    const sessionToastShownRef = useRef(false);
    const isIntentionalLogoutRef = useRef(false);

    // keep ref in sync with state for reliable checks in async handlers
    useEffect(() => {
        reauthAttemptsRef.current = reauthAttempts;
    }, [reauthAttempts]);

    async function attemptSilentRefresh() {
        // Try to refresh CSRF cookie and re-fetch user once
        try {
            await axios.get("/sanctum/csrf-cookie");
            const res = await axios.get("/api/user");
            if (res.status === 200) {
                setUser(res.data);
                setSessionLastRefreshed(new Date().toISOString());
                setReauthAttempts(0);
                return true;
            }
        } catch (err) {
            // silent refresh failed
        }
        return false;
    }

    async function fetchUser() {
        setLoading(true);
        try {
            // Try common endpoints used in different setups
            const candidates = ["/api/user", "/api/me", "/user"];
            for (const url of candidates) {
                try {
                    const res = await axios.get(url);
                    if (res.status === 200) {
                        setUser(res.data);
                        setSessionLastRefreshed(new Date().toISOString());
                        setLoading(false);
                        return res.data;
                    }
                } catch (err) {
                    if (err.response && err.response.status === 401) {
                        // Not authenticated — try a silent refresh once
                        const refreshed = await attemptSilentRefresh();
                        if (refreshed) {
                            // Silent refresh succeeded and `attemptSilentRefresh` already set user
                            setLoading(false);
                            return;
                        }

                        // Safely increment attempts and react to threshold outside updater to avoid nested state updates during render
                        let newCount;
                        setReauthAttempts((n) => {
                            newCount = n + 1;
                            return newCount;
                        });

                        if (newCount >= 2) {
                            setShowReauthModal(true);
                            // defer toast to avoid setState during unrelated render cycles
                            setTimeout(
                                () =>
                                    addToast({
                                        type: "warning",
                                        message:
                                            "Session expired — please re-authenticate to continue.",
                                    }),
                                0,
                            );
                        }

                        continue;
                    }
                    // try next
                }
            }
            // none succeeded - treat as unauthenticated
            setUser(null);
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        // Restore token from localStorage on app load
        const storedToken = localStorage.getItem("auth_token");
        if (storedToken) {
            axios.defaults.headers.common["Authorization"] =
                `Bearer ${storedToken}`;
        }

        fetchUser();
        // set up auto-refresh every 5 minutes
        intervalRef.current = setInterval(() => {
            fetchUser().catch(() => {});
        }, 300000);

        return () => clearInterval(intervalRef.current);
    }, []);

    async function login(email, password) {
        // Sanctum SPA flow: get CSRF cookie, then post to /login
        await axios.get("/sanctum/csrf-cookie");
        const res = await axios.post("/login", { email, password });

        // Store bearer token if returned
        if (res.data.token) {
            localStorage.setItem("auth_token", res.data.token);
            axios.defaults.headers.common["Authorization"] =
                `Bearer ${res.data.token}`;
        }

        // After successful login, fetch user
        const user = await fetchUser();
        if (user) {
            setShowReauthModal(false);
            addToast({ type: "success", message: `Logged in as ${user.name}` });
        }
        return res;
    }

    async function logout() {
        try {
            await axios.post("/logout");
        } catch (err) {
            // Ignore errors
        }
        localStorage.removeItem("auth_token");
        delete axios.defaults.headers.common["Authorization"];
        isIntentionalLogoutRef.current = true;
        setUser(null);
    }

    function hasRole(role) {
        if (!user) return false;
        // user.role may be string or array
        if (Array.isArray(user.role)) return user.role.includes(role);
        return user.role === role;
    }

    // watch for session expiry: if fetchUser determines unauthenticated, notify
    useEffect(() => {
        if (user === null && !loading) {
            // Check if this is an intentional logout
            if (isIntentionalLogoutRef.current) {
                addToast({
                    type: "info",
                    message: "Logged out successfully",
                });
                isIntentionalLogoutRef.current = false;
            } else if (!showReauthModal && !sessionToastShownRef.current) {
                // Only show session expired for unintentional logout
                sessionToastShownRef.current = true;
                setTimeout(() => {
                    addToast({
                        type: "warning",
                        message: "Session expired or not authenticated",
                    });
                }, 0);
            }
        } else {
            // reset when user becomes available
            sessionToastShownRef.current = false;
        }
        // only trigger on changes to user/loading
    }, [user, loading, showReauthModal]);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                sessionLastRefreshed,
                showReauthModal,
                setShowReauthModal,
                fetchUser,
                login,
                logout,
                hasRole,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
