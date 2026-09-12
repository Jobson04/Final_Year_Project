import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
const h = React.createElement;
export default function Register() {
    const { isAuthenticated, user, register } = useAuth();
    const [form, setForm] = useState({ student_number: "", password: "", first_name: "", last_name: "", programme: "", year_of_study: "1", department: "", school: "", national_id: "", email: "", phone: "", accommodation: "", additional_id: "" });
    const [photo, setPhoto] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    if (isAuthenticated) {
        const destination = user?.role === "student" ? "/portal" : user?.role === "lecturer" ? "/lecturer" : "/dashboard";
        return h(Navigate, { to: destination, replace: true });
    }
    const update = (event) => setForm({...form, [event.target.name]: event.target.value });
    const submit = async(event) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        const payload = new FormData();
        Object.entries(form).forEach(([key, value]) => payload.append(key, value));
        if (photo) payload.append("photo", photo);
        try { await register(payload); } catch (err) { const data = err.response && err.response.data;
            setError(data && data.detail ? data.detail : "Registration failed."); } finally { setLoading(false); }
    };
    const fields = [
        ["student_number", "Approved student computer number"],
        ["password", "Password"],
        ["first_name", "Full name / first name"],
        ["last_name", "Last name"],
        ["programme", "Program of study"],
        ["year_of_study", "Year of study"],
        ["department", "Department"],
        ["school", "School"],
        ["national_id", "National ID"],
        ["email", "Email"],
        ["phone", "Phone"],
        ["accommodation", "Accommodation"],
        ["additional_id", "Additional ID"]
    ];
    return h("main", { className: "login-page" }, h("form", { className: "login-card registration-card", onSubmit: submit }, h(UserPlus, { size: 42 }), h("h1", null, "Student Registration"), fields.map(([name, label]) => h("label", { key: name }, label, h("input", { name, type: name === "password" ? "password" : name === "email" ? "email" : name === "year_of_study" ? "number" : "text", value: form[name], onChange: update, required: ["student_number", "password", "first_name", "last_name", "programme", "year_of_study"].includes(name) }))), h("label", null, "Photo", h("input", { type: "file", accept: "image/*", onChange: (event) => setPhoto(event.target.files && event.target.files[0] ? event.target.files[0] : null), required: true })), h("p", { className: "form-help" }, "Registration is available only for computer numbers listed in REGISTERED_STUDENT_NUMBERS."), error && h("p", { className: "error" }, error), h("button", { className: "primary", type: "submit", disabled: loading }, h(UserPlus, { size: 18 }), loading ? "Registering..." : "Register and enter portal"), h(Link, { to: "/login" }, "Back to login")));
}