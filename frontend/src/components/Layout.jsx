import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ClipboardList, LayoutDashboard, LogOut, Moon, QrCode, ScanLine, Settings, Sun, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const h = React.createElement;
const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/students", label: "Students", icon: Users },
    { to: "/scanner", label: "Scanner", icon: ScanLine },
    { to: "/scans", label: "Scan Logs", icon: ClipboardList },
    { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function Layout() {
    const { logout, user, darkMode, setDarkMode } = useAuth();
    const visibleLinks = user && user.role === "student" ? [{ to: "/portal", label: "Student Portal", icon: Users }] : links;
    const nav = visibleLinks.map(({ to, label, icon: Icon }) => h(NavLink, { key: to, to, className: ({ isActive }) => isActive ? "active" : "" }, h(Icon, { size: 18 }), label));
    return h("div", { className: "app-shell" },
        h("aside", { className: "sidebar" },
            h("div", { className: "brand" }, h(QrCode, { size: 28 }), h("div", null, h("strong", null, "Smart ID"), h("span", null, "Student Verification"))),
            h("nav", null, nav),
            h("button", { className: "logout-button", onClick: logout }, h(LogOut, { size: 18 }), "Logout")
        ),
        h("main", { className: "main" },
            h("header", { className: "topbar" }, h("div", null, h("span", { className: "eyebrow" }, "Administrator"), h("h1", null, "Smart Student Identification System")), h("div", { className: "topbar-actions" }, h("button", { className: "icon-button", onClick: () => setDarkMode(!darkMode), title: "Toggle dark mode" }, darkMode ? h(Sun, { size: 18 }) : h(Moon, { size: 18 })), h("div", { className: "user-pill" }, user ? user.username : "Admin"))),
            h(Outlet)
        )
    );
}