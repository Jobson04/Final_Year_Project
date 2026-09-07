import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
export default function ProtectedRoute({ children, role }) { const { isAuthenticated, user } = useAuth(); const effectiveRole = user && (user.role || (user.is_staff ? "admin" : "student")); if (!isAuthenticated) return React.createElement(Navigate, { to: "/login", replace: true }); if (role && effectiveRole !== role) return React.createElement(Navigate, { to: effectiveRole === "student" ? "/portal" : "/dashboard", replace: true }); return children; }