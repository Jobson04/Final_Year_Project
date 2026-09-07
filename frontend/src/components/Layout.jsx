import { NavLink, Outlet } from "react-router-dom";
import { ClipboardList, LayoutDashboard, LogOut, QrCode, ScanLine, Users } from "lucide-react";

import { useAuth } from "../context/AuthContext.jsx";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
  { to: "/scanner", label: "Scanner", icon: ScanLine },
  { to: "/scans", label: "Scan Logs", icon: ClipboardList },
];

export default function Layout() {
  const { logout, user } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <QrCode size={28} />
          <div>
            <strong>Smart ID</strong>
            <span>Student Verification</span>
          </div>
        </div>
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="logout-button" onClick={logout}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">Administrator</span>
            <h1>Smart Student Identification System</h1>
          </div>
          <div className="user-pill">{user?.username || "Admin"}</div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

