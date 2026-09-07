import { useState } from "react";
import { Navigate } from "react-router-dom";
import { LogIn, QrCode } from "lucide-react";

import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(credentials);
    } catch (err) {
      setError(err.response?.data?.non_field_errors?.[0] || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <QrCode size={42} />
        <h1>Smart Student Identification</h1>
        <label>
          Username
          <input
            value={credentials.username}
            onChange={(event) => setCredentials({ ...credentials, username: event.target.value })}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={credentials.password}
            onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          <LogIn size={18} />
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </main>
  );
}

