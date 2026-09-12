import React, { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Bell, ClipboardCheck, Clock3, QrCode, ScanLine, Sparkles, Users } from "lucide-react";
import api from "../services/api.js";

const formatTimestamp = (value) => {
    if (!value) return "Recently";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

export default function Dashboard() {
    const [students, setStudents] = useState([]);
    const [scans, setScans] = useState([]);
    const [analytics, setAnalytics] = useState(null);

    useEffect(() => {
        Promise.all([api.get("/students/"), api.get("/scans/"), api.get("/students/analytics/")]).then(([studentsResponse, scansResponse, analyticsResponse]) => {
            setStudents(studentsResponse.data.results || studentsResponse.data || []);
            setScans(scansResponse.data.results || scansResponse.data || []);
            setAnalytics(analyticsResponse.data || null);
        });
    }, []);

    const active = students.filter((student) => student.status === "active").length;

    const stats = useMemo(
        () => [
            {
                label: "Students",
                value: analytics?.total_students ?? students.length,
                icon: Users,
                accent: "teal",
                trend: "+12% this month",
            },
            {
                label: "Active",
                value: analytics?.active_students ?? active,
                icon: ClipboardCheck,
                accent: "green",
                trend: "Healthy flow",
            },
            {
                label: "QR Codes",
                value: students.filter((student) => student.qr_code).length,
                icon: QrCode,
                accent: "amber",
                trend: "Issued",
            },
            {
                label: "Scans today",
                value: analytics?.scans_today ?? scans.length,
                icon: ScanLine,
                accent: "purple",
                trend: analytics?.scans_today ? "Live" : "Updated",
            },
        ],
        [active, analytics, scans.length, students]
    );

    const recentScans = useMemo(() => {
        return [...scans]
            .filter((scan) => scan && (scan.scanned_at || scan.created_at))
            .sort((a, b) => new Date(b.scanned_at || b.created_at) - new Date(a.scanned_at || a.created_at))
            .slice(0, 5);
    }, [scans]);

    const programBreakdown = useMemo(() => {
        const items = analytics?.by_programme || [];
        const max = Math.max(...items.map((item) => item.total || 0), 1);
        return items.slice(0, 4).map((item) => ({
            ...item,
            barWidth: Math.max((item.total / max) * 100, 14),
        }));
    }, [analytics]);

    const statusCards = [
        { label: "Pending approvals", value: analytics?.pending_approvals ?? 0, tone: "warning" },
        { label: "Total scans", value: analytics?.total_scans ?? scans.length, tone: "info" },
        { label: "Active students", value: analytics?.active_students ?? active, tone: "success" },
    ];

    return (
        <section className="page-section dashboard-page">
            <div className="dashboard-shell">
                <div className="panel dashboard-header">
                    <div className="dashboard-header-copy">
                        <span className="eyebrow">Overview</span>
                        <h2>Admin dashboard</h2>
                        <p>Monitor student activity, registrations, and verification signals in one premium control centre.</p>
                    </div>

                    <div className="dashboard-header-actions">
                        <div className="status-badge">
                            <Sparkles size={16} />
                            Live system
                        </div>
                        <button type="button" className="primary">
                            Open scanner
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

                {analytics?.pending_approvals > 0 ? (
                    <div className="notice dashboard-notice">
                        {analytics.pending_approvals} student registration(s) awaiting approval.
                    </div>
                ) : null}

                <div className="stats-grid">
                    {stats.map(({ label, value, icon: Icon, accent, trend }) => (
                        <article className={`stat-card stat-card-${accent}`} key={label}>
                            <div className="stat-card-top">
                                <div className="stat-icon">
                                    <Icon size={20} />
                                </div>
                                <span className="trend-pill">{trend}</span>
                            </div>
                            <strong>{value}</strong>
                            <span>{label}</span>
                        </article>
                    ))}
                </div>

                <div className="dashboard-grid">
                    <div className="panel dashboard-panel">
                        <div className="panel-header">
                            <div>
                                <span className="eyebrow">Live feed</span>
                                <h3>Recent activity</h3>
                            </div>
                            <button type="button" className="secondary-button">
                                <Bell size={16} />
                                Alerts
                            </button>
                        </div>

                        <div className="activity-list">
                            {recentScans.length ? (
                                recentScans.map((scan) => (
                                    <div className="activity-item" key={scan.id || `${scan.scanned_at}-${scan.student?.student_number || "scan"}`}>
                                        <div className="activity-icon">
                                            <Activity size={16} />
                                        </div>

                                        <div className="activity-copy">
                                            <strong>
                                                {scan.student?.first_name || "Student"} {scan.student?.last_name || ""}
                                            </strong>
                                            <span>
                                                {scan.student?.student_number || "Student record"} • {formatTimestamp(scan.scanned_at || scan.created_at)}
                                            </span>
                                        </div>

                                        <span className="activity-tag success">Verified</span>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">No scans recorded yet.</div>
                            )}
                        </div>
                    </div>

                    <div className="panel dashboard-panel">
                        <div className="panel-header">
                            <div>
                                <span className="eyebrow">Quick links</span>
                                <h3>Actions</h3>
                            </div>
                        </div>

                        <div className="quick-actions">
                            <button type="button" className="primary quick-action">
                                <Users size={18} />
                                Add student
                            </button>
                            <button type="button" className="secondary-button quick-action">
                                <ScanLine size={18} />
                                Open scanner
                            </button>
                            <button type="button" className="secondary-button quick-action">
                                <ClipboardCheck size={18} />
                                Review approvals
                            </button>
                            <button type="button" className="secondary-button quick-action">
                                <QrCode size={18} />
                                Manage ID cards
                            </button>
                        </div>

                        <div className="status-stack">
                            {statusCards.map(({ label, value, tone }) => (
                                <div className={`mini-status ${tone}`} key={label}>
                                    <span>{label}</span>
                                    <strong>{value}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="dashboard-grid lower-grid">
                    <div className="panel dashboard-panel">
                        <div className="panel-header">
                            <div>
                                <span className="eyebrow">Insights</span>
                                <h3>Program distribution</h3>
                            </div>
                        </div>

                        <div className="program-list">
                            {programBreakdown.length ? (
                                programBreakdown.map(({ programme, total, barWidth }) => (
                                    <div className="program-row" key={programme || "unknown-programme"}>
                                        <div className="program-meta">
                                            <span>{programme || "Unspecified"}</span>
                                            <strong>{total}</strong>
                                        </div>
                                        <div className="progress-track">
                                            <span style={{ width: `${barWidth}%` }} />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">No programme data available.</div>
                            )}
                        </div>
                    </div>

                    <div className="panel dashboard-panel">
                        <div className="panel-header">
                            <div>
                                <span className="eyebrow">Operations</span>
                                <h3>System status</h3>
                            </div>
                        </div>

                        <div className="status-stack compact">
                            <div className="system-item">
                                <span className="system-label">
                                    <Clock3 size={16} />
                                    Last sync
                                </span>
                                <strong>Just now</strong>
                            </div>
                            <div className="system-item">
                                <span className="system-label">
                                    <Activity size={16} />
                                    Verification flow
                                </span>
                                <strong>Stable</strong>
                            </div>
                            <div className="system-item">
                                <span className="system-label">
                                    <Bell size={16} />
                                    Alerts
                                </span>
                                <strong>{analytics?.pending_approvals > 0 ? "Attention needed" : "All clear"}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}