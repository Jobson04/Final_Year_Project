import { createContext, useContext, useEffect, useMemo, useState } from "react";

import api, { setUnauthorizedHandler } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("authToken"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("authUser");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem("authUser");
      return null;
    }
  });

  const clearAuth = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    setUnauthorizedHandler(clearAuth);
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = async (credentials) => {
    const response = await api.post("/auth/login/", credentials);
    localStorage.setItem("authToken", response.data.token);
    localStorage.setItem("authUser", JSON.stringify(response.data.user));
    setToken(response.data.token);
    setUser(response.data.user);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout/");
    } finally {
      clearAuth();
    }
  };

  const value = useMemo(
    () => ({ isAuthenticated: Boolean(token), user, login, logout }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
