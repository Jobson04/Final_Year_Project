import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";

export default function LecturerRegister() {
    const { isAuthenticated, user, login } = useAuth();
    const [form, setForm] = useState({
        username: "",
        password: "",
        full_name: "",
        title: "",
        department: "",
        email: "",
        phone: "",
        office_hours: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    if (isAuthenticated) {
        const destination = user?.role === "student" ? "/portal" : user?.role === "lecturer" ? "/lecturer" : "/dashboard";
        return <Navigate to={destination} replace />;
    }

    const update = (event) => {
        setForm((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }));
    };

    const submit = async(event) => {
        event.preventDefault();
        setLoading(true);
        setError("");

        try {
            await api.post("/lecturers/", {
                username: form.username,
                password: form.password,
                full_name: form.full_name,
                title: form.title,
                department: form.department,
                email: form.email,
                phone: form.phone,
                office_hours: form.office_hours,
            });

            await login({
                username: form.username,
                password: form.password,
            });
        } catch (err) {
            const data = err.response?.data;
            setError(data?.detail || data?.username?.[0] || data?.non_field_errors?.[0] || "Lecturer registration failed.");
        } finally {
            setLoading(false);
        }
    };

    return ( <
        main className = "login-page" >
        <
        form className = "login-card registration-card"
        onSubmit = { submit } >
        <
        UserPlus size = { 42 }
        /> <
        h1 > Lecturer Registration < /h1>

        <
        label >
        Username <
        input name = "username"
        type = "text"
        value = { form.username }
        onChange = { update }
        autoComplete = "username"
        required /
        >
        <
        /label>

        <
        label >
        Password <
        input name = "password"
        type = "password"
        value = { form.password }
        onChange = { update }
        autoComplete = "new-password"
        required /
        >
        <
        /label>

        <
        label >
        Full name <
        input name = "full_name"
        type = "text"
        value = { form.full_name }
        onChange = { update }
        required /
        >
        <
        /label>

        <
        label >
        Title <
        input name = "title"
        type = "text"
        value = { form.title }
        onChange = { update }
        /> <
        /label>

        <
        label >
        Department <
        input name = "department"
        type = "text"
        value = { form.department }
        onChange = { update }
        /> <
        /label>

        <
        label >
        School email <
        input name = "email"
        type = "email"
        value = { form.email }
        onChange = { update }
        autoComplete = "email"
        required /
        >
        <
        /label> <
        p className = "form-help" > Please use your school email address to register. < /p>

        <
        label >
        Phone <
        input name = "phone"
        type = "text"
        value = { form.phone }
        onChange = { update }
        /> <
        /label>

        <
        label >
        Office hours <
        input name = "office_hours"
        type = "text"
        value = { form.office_hours }
        onChange = { update }
        /> <
        /label>

        {
            error && < p className = "error" > { error } < /p>}

            <
            button className = "primary"
            type = "submit"
            disabled = { loading } >
                <
                UserPlus size = { 18 }
            /> { loading ? "Registering..." : "Create lecturer account" } <
            /button>

            <
            Link to = "/login" > Back to login < /Link> <
                /form> <
                /main>
        );
    }