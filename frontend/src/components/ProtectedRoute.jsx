import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
export default function ProtectedRoute({ children, role }) {
    const { isAuthenticated, user } = useAuth();
    const effectiveRole = user?.role || (user?.is_staff ? "admin" : "student");

    if (!isAuthenticated) {
        return React.createElement(Navigate, { to: "/login", replace: true });
    }

    if (role && effectiveRole !== role) {
        const destination = effectiveRole === "student" ? "/portal" : effectiveRole === "lecturer" ? "/lecturer" : "/dashboard";
        return React.createElement(Navigate, { to: destination, replace: true });
    }

    return children;
}