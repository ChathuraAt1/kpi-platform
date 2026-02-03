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
                        if (refreshed) return res.data;
                        // increment attempts and schedule modal if exceeded
                        setReauthAttempts((n) => n + 1);
                        if (reauthAttempts + 1 >= 2) {
                            setShowReauthModal(true);
                            addToast({
                                type: "warning",
                                message:
                                    "Session expired — please re-authenticate to continue.",
                            });
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
        setUser(null);
        addToast({ type: "info", message: "Logged out" });
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
            // If we haven't already shown the modal, prompt re-auth
            if (!showReauthModal) {
                addToast({
                    type: "warning",
                    message: "Session expired or not authenticated",
                });
            }
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
