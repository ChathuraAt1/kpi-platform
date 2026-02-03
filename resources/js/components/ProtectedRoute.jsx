import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, roles = [] }) {
    const { user, loading, hasRole } = useAuth();

    if (loading) return <div>Loading...</div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (roles.length > 0) {
        const ok = roles.some((r) => hasRole(r));
        if (!ok) {
            // insufficient role
            return <div className="p-4 bg-yellow-50">Unauthorized</div>;
        }
    }

    return children;
}
