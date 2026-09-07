import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { LogIn, QrCode } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
const h = React.createElement;
export default function Login() {
    const { isAuthenticated, user, login } = useAuth();
    const [mode, setMode] = useState("admin");
    const [form, setForm] = useState({ username: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    if (isAuthenticated) return h(Navigate, { to: user && user.role === "student" ? "/portal" : "/dashboard", replace: true });
    const submit = async(event) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        try { await login(form); } catch (err) { const data = err.response && err.response.data; setError(data && data.non_field_errors ? data.non_field_errors[0] : data && data.detail ? data.detail : "Invalid credentials."); } finally { setLoading(false); }
    };
    const update = (event) => setForm({...form, [event.target.name]: event.target.value });
    return h("main", { className: "login-page" }, h("form", { className: "login-card", onSubmit: submit }, h(QrCode, { size: 42 }), h("h1", null, "Smart Student Identification"), h("label", null, "Login as", h("select", { value: mode, onChange: (event) => setMode(event.target.value), "aria-label": "Choose login type" }, h("option", { value: "admin" }, "Administrator"), h("option", { value: "student" }, "Student registration / login"))), h("label", null, mode === "admin" ? "Username" : "Student computer number", h("input", { name: "username", value: form.username, onChange: update, autoComplete: "username", required: true })), h("label", null, "Password", h("input", { type: "password", name: "password", value: form.password, onChange: update, autoComplete: "current-password", required: true })), error && h("p", { className: "error" }, error), h("button", { type: "submit", disabled: loading }, h(LogIn, { size: 18 }), loading ? "Signing in..." : "Login"), mode === "student" && h(Link, { to: "/register" }, "New student registration")));
}