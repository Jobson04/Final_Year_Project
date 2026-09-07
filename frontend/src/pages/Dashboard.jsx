import { useEffect, useState } from "react";
import { ClipboardCheck, QrCode, ScanLine, Users } from "lucide-react";

import api from "../services/api.js";

export default function Dashboard() {
  const [students, setStudents] = useState([]);
  const [scans, setScans] = useState([]);

  useEffect(() => {
    Promise.all([api.get("/students/"), api.get("/scans/")]).then(([studentsRes, scansRes]) => {
      setStudents(studentsRes.data.results || studentsRes.data);
      setScans(scansRes.data.results || scansRes.data);
    });
  }, []);

  const activeStudents = students.filter((student) => student.status === "active").length;

  const stats = [
    { label: "Students", value: students.length, icon: Users },
    { label: "Active", value: activeStudents, icon: ClipboardCheck },
    { label: "QR Codes", value: students.filter((student) => student.qr_code).length, icon: QrCode },
    { label: "Scans", value: scans.length, icon: ScanLine },
  ];

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Overview</span>
          <h2>Dashboard</h2>
        </div>
      </div>
      <div className="stats-grid">
        {stats.map(({ label, value, icon: Icon }) => (
          <article className="stat-card" key={label}>
            <Icon size={22} />
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

