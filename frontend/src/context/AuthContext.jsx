import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { setUnauthorizedHandler } from "../services/api.js";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem("authToken"));
    const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("authUser")) || null; } catch { return null; } });
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");
    const clearAuth = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        setToken(null);
        setUser(null);
    };
    useEffect(() => { setUnauthorizedHandler(clearAuth); return () => setUnauthorizedHandler(null); }, []);
    useEffect(() => {
        document.documentElement.dataset.theme = darkMode ? "dark" : "light";
        localStorage.setItem("darkMode", String(darkMode));
    }, [darkMode]);
    const saveAuth = (data) => {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("authUser", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
    };
    const login = async(credentials) => {
        clearAuth();
        const response = await api.post("/auth/login/", credentials);
        saveAuth(response.data);
        return response.data;
    };
    const register = async(payload) => {
        clearAuth();
        const response = await api.post("/register/", payload, { headers: { "Content-Type": "multipart/form-data" } });
        saveAuth(response.data);
        return response.data;
    };
    const logout = async() => { try { if (token) await api.post("/auth/logout/"); } finally { clearAuth(); } };
    const value = useMemo(() => ({ isAuthenticated: Boolean(token), user, login, register, logout, darkMode, setDarkMode }), [token, user, darkMode]);
    return React.createElement(AuthContext.Provider, { value }, children);
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("useAuth must be used inside AuthProvider"); return context; }