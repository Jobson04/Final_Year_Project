import React, { useEffect, useState } from "react";
import { ClipboardCheck, QrCode, ScanLine, Users } from "lucide-react";
import api from "../services/api.js";
const h = React.createElement;

export default function Dashboard() {
    const [students, setStudents] = useState([]);
    const [scans, setScans] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    useEffect(() => {
        Promise.all([api.get("/students/"), api.get("/scans/"), api.get("/students/analytics/")]).then(([studentsResponse, scansResponse, analyticsResponse]) => {
            setStudents(studentsResponse.data.results || studentsResponse.data);
            setScans(scansResponse.data.results || scansResponse.data);
            setAnalytics(analyticsResponse.data);
        });
    }, []);
    const active = students.filter((student) => student.status === "active").length;
    const stats = [
        { label: "Students", value: analytics && analytics.total_students != null ? analytics.total_students : students.length, icon: Users },
        { label: "Active", value: analytics && analytics.active_students != null ? analytics.active_students : active, icon: ClipboardCheck },
        { label: "QR Codes", value: students.filter((student) => student.qr_code).length, icon: QrCode },
        { label: "Scans today", value: analytics && analytics.scans_today != null ? analytics.scans_today : scans.length, icon: ScanLine },
    ];
    const cards = stats.map(({ label, value, icon: Icon }) => h("article", { className: "stat-card", key: label }, h(Icon, { size: 22 }), h("strong", null, value), h("span", null, label)));
    const notice = analytics && analytics.pending_approvals > 0 ? h("div", { className: "notice" }, analytics.pending_approvals, " student registration(s) awaiting approval.") : null;
    return h("section", { className: "page-section" }, h("div", { className: "section-heading" }, h("div", null, h("span", { className: "eyebrow" }, "Overview"), h("h2", null, "Dashboard"))), notice, h("div", { className: "stats-grid" }, cards));
}