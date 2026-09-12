import React, { useEffect, useMemo, useState } from "react";
import { Bell, BookOpen, ClipboardList, LayoutDashboard, LogOut, Moon, QrCode, ScanLine, Settings, Sun, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";

const adminLinks = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/students", label: "Students", icon: Users },
    { to: "/scanner", label: "Scanner", icon: ScanLine },
    { to: "/scans", label: "Scan Logs", icon: ClipboardList },
    { to: "/admin/settings", label: "Settings", icon: Settings },
];

const lecturerLinks = [
    { to: "/lecturer", label: "Dashboard", icon: LayoutDashboard },
    { to: "/lecturer/courses", label: "Courses", icon: BookOpen },
    { to: "/lecturer/attendance", label: "Attendance", icon: ClipboardList },
];

const normalizeList = (payload) => payload?.results ?? payload ?? [];

export default function Layout() {
    const { logout, user, darkMode, setDarkMode } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        api.get("/notifications/")
            .then((response) => {
                setNotifications(normalizeList(response.data));
            })
            .catch(() => {
                setNotifications([]);
            });
    }, [user]);

    const role = user?.role || "admin";
    const visibleLinks = role === "student"
        ? [{ to: "/portal", label: "Student Portal", icon: Users }]
        : role === "lecturer"
            ? lecturerLinks
            : adminLinks;
    const label = role === "lecturer" ? "Lecturer" : role === "student" ? "Student" : "Administrator";

    const unreadNotifications = useMemo(
        () => notifications.filter((item) => !item.is_read).length,
        [notifications]
    );

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
                    {visibleLinks.map(({ to, label: linkLabel, icon: Icon }) => (
                        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
                            <Icon size={18} />
                            {linkLabel}
                        </NavLink>
                    ))}
                </nav>

                <button className="logout-button" onClick={logout} type="button">
                    <LogOut size={18} />
                    Logout
                </button>
            </aside>

            <main className="main">
                <header className="topbar">
                    <div>
                        <span className="eyebrow">{label}</span>
                        <h1>Smart Student Identification System</h1>
                    </div>

                    <div className="topbar-actions">
                        {role === "lecturer" ? (
                            <div className="notification-wrapper">
                                <button
                                    className="icon-button notification-button"
                                    onClick={() => setShowNotifications((current) => !current)}
                                    title="View notifications"
                                    type="button"
                                >
                                    <Bell size={18} />
                                    {unreadNotifications > 0 ? (
                                        <span className="notification-count">{unreadNotifications}</span>
                                    ) : null}
                                </button>

                                {showNotifications ? (
                                    <div className="notification-popover">
                                        <div className="notification-header">
                                            <strong>Notifications</strong>
                                            <span>{unreadNotifications} unread</span>
                                        </div>

                                        {notifications.length ? (
                                            notifications.slice(0, 5).map((item) => (
                                                <div key={item.id || item.title} className={`notification-item ${item.is_read ? "" : "unread"}`}>
                                                    <strong>{item.title}</strong>
                                                    <p>{item.message}</p>
                                                    <span>{item.created_at ? new Date(item.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Just now"}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="empty-state">No notifications yet.</p>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        <button
                            className="icon-button"
                            onClick={() => setDarkMode(!darkMode)}
                            title="Toggle dark mode"
                            type="button"
                        >
                            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <div className="user-pill">{user ? user.username : "Admin"}</div>
                    </div>
                </header>

                <Outlet />
            </main>
        </div>
    );
}