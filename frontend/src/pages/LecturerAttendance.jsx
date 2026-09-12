import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, QrCode, Radio, ShieldCheck, Wifi } from "lucide-react";

import api from "../services/api.js";

const normalizeList = (payload) => payload?.results ?? payload ?? [];

const scanModes = [
    { key: "QR", label: "QR check-in", icon: QrCode, description: "Fast classroom entry scanning" },
    { key: "Bluetooth", label: "Bluetooth", icon: Wifi, description: "Short-range student proximity" },
    { key: "RFID", label: "RFID", icon: ShieldCheck, description: "Secure card badge verification" },
];

export default function LecturerAttendance() {
    const [sessions, setSessions] = useState([]);
    const [courses, setCourses] = useState([]);
    const [records, setRecords] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState("");
    const [scanMode, setScanMode] = useState("QR");
    const [scanStatus, setScanStatus] = useState("Ready for check-ins");
    const [message, setMessage] = useState("");
    const [form, setForm] = useState({
        course_id: "",
        title: "",
        session_date: new Date().toISOString().slice(0, 10),
        notes: "",
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [coursesResponse, sessionsResponse, recordsResponse] = await Promise.all([
                api.get("/courses/"),
                api.get("/attendance-sessions/"),
                api.get("/attendance-records/"),
            ]);

            const nextCourses = normalizeList(coursesResponse.data);
            const nextSessions = normalizeList(sessionsResponse.data);
            const nextRecords = normalizeList(recordsResponse.data);

            setCourses(nextCourses);
            setSessions(nextSessions);
            setRecords(nextRecords);
            setSelectedSessionId((current) => current || nextSessions[0]?.id || "");
        } catch (error) {
            console.error("Failed to load attendance data", error);
            setMessage("Unable to load attendance information right now.");
        }
    };

    const selectedSession = useMemo(
        () => sessions.find((session) => session.id === Number(selectedSessionId)) || sessions[0] || null,
        [selectedSessionId, sessions]
    );

    const selectedSessionRecords = useMemo(() => {
        if (!selectedSession) {
            return [];
        }

        return records.filter((record) => record.attendance_session === selectedSession.id);
    }, [records, selectedSession]);

    const presentCount = selectedSessionRecords.filter((record) => record.attended).length;
    const attendanceRate = selectedSessionRecords.length
        ? Math.round((presentCount / selectedSessionRecords.length) * 100)
        : 0;

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            await api.post("/attendance-sessions/", {
                course_id: form.course_id,
                title: form.title,
                session_date: form.session_date,
                notes: form.notes,
            });

            setMessage("Attendance session created successfully.");
            setForm({
                course_id: "",
                title: "",
                session_date: new Date().toISOString().slice(0, 10),
                notes: "",
            });
            setScanStatus("Session created and ready for check-ins");
            await loadData();
        } catch (error) {
            setMessage(error.response?.data?.detail || "Unable to create attendance session.");
        }
    };

    const toggleAttendance = async (record) => {
        try {
            const response = await api.patch(`/attendance-records/${record.id}/`, {
                attended: !record.attended,
                notes: record.notes || "",
            });

            setRecords((currentRecords) =>
                currentRecords.map((item) => (item.id === record.id ? { ...item, attended: response.data.attended } : item))
            );
        } catch (error) {
            console.error("Failed to update attendance record", error);
            setMessage("Unable to update this attendance entry right now.");
        }
    };

    return (
        <section className="page-section narrow">
            <div className="section-heading">
                <div>
                    <span className="eyebrow">Attendance</span>
                    <h2>Attendance tracking</h2>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: 24 }}>
                <h3>Create session</h3>
                <form className="form-grid" onSubmit={handleSubmit}>
                    <label>
                        Course
                        <select
                            value={form.course_id}
                            onChange={(event) => setForm({ ...form, course_id: event.target.value })}
                            required
                        >
                            <option value="">Select a course</option>
                            {courses.map((course) => (
                                <option key={course.id} value={course.id}>
                                    {course.code} - {course.title}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Session title
                        <input
                            value={form.title}
                            onChange={(event) => setForm({ ...form, title: event.target.value })}
                        />
                    </label>

                    <label>
                        Session date
                        <input
                            type="date"
                            value={form.session_date}
                            onChange={(event) => setForm({ ...form, session_date: event.target.value })}
                            required
                        />
                    </label>

                    <label className="file-field">
                        Notes
                        <textarea
                            rows={4}
                            value={form.notes}
                            onChange={(event) => setForm({ ...form, notes: event.target.value })}
                        />
                    </label>

                    <div className="actions">
                        <button className="primary" type="submit">
                            <CalendarPlus size={18} />
                            Create session
                        </button>
                    </div>
                </form>

                {message ? <p className="notice" style={{ marginTop: 18 }}>{message}</p> : null}
            </div>

            <div className="attendance-shell">
                <div className="panel">
                    <div className="panel-header">
                        <div>
                            <span className="eyebrow">Live controls</span>
                            <h3>Scanning interface</h3>
                        </div>
                    </div>

                    <div className="scan-mode-grid">
                        {scanModes.map(({ key, label, icon: Icon, description }) => (
                            <button
                                key={key}
                                className={`scan-mode-card ${scanMode === key ? "active" : ""}`}
                                onClick={() => {
                                    setScanMode(key);
                                    setScanStatus(`Listening with ${label} mode`);
                                }}
                                type="button"
                            >
                                <Icon size={18} />
                                <strong>{label}</strong>
                                <span>{description}</span>
                            </button>
                        ))}
                    </div>

                    <div className="attendance-hero">
                        <div>
                            <span className="eyebrow">Status</span>
                            <h4>{scanStatus}</h4>
                        </div>
                        <button
                            className="primary"
                            onClick={() => setScanStatus(`Scanning ${scanMode} attendance recordings...`)}
                            type="button"
                        >
                            Start live scan
                        </button>
                    </div>
                </div>

                <div className="panel">
                    <div className="panel-header">
                        <div>
                            <span className="eyebrow">Summary</span>
                            <h3>Attendance overview</h3>
                        </div>
                    </div>

                    <div className="attendance-summary">
                        <div className="mini-status">
                            <span>Present</span>
                            <strong>{presentCount}</strong>
                        </div>
                        <div className="mini-status">
                            <span>Absent</span>
                            <strong>{Math.max(selectedSessionRecords.length - presentCount, 0)}</strong>
                        </div>
                        <div className="mini-status">
                            <span>Completion</span>
                            <strong>{attendanceRate}%</strong>
                        </div>
                    </div>

                    <div className="session-list">
                        {sessions.length ? (
                            sessions.map((session) => (
                                <button
                                    key={session.id}
                                    className={`session-card ${selectedSession?.id === session.id ? "active" : ""}`}
                                    onClick={() => setSelectedSessionId(session.id)}
                                    type="button"
                                >
                                    <div className="session-card-head">
                                        <div>
                                            <strong>{session.title || "Session"}</strong>
                                            <span>{session.session_date}</span>
                                        </div>
                                        <span className="status">{session.records?.length || 0} records</span>
                                    </div>
                                    <small>
                                        {session.course?.code || session.course_code || "Course"} • {session.notes || "No notes added"}
                                    </small>
                                </button>
                            ))
                        ) : (
                            <p className="empty-state">No attendance sessions yet.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="panel" style={{ marginTop: 24 }}>
                <div className="panel-header">
                    <div>
                        <span className="eyebrow">Session board</span>
                        <h3>{selectedSession ? selectedSession.title || "Current session" : "Session records"}</h3>
                    </div>
                    {selectedSession ? <span className="status-badge"><CheckCircle2 size={16} /> {attendanceRate}% complete</span> : null}
                </div>

                {selectedSessionRecords.length ? (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Number</th>
                                    <th>Present</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedSessionRecords.map((record) => (
                                    <tr key={record.id}>
                                        <td>
                                            {record.student?.first_name || "Student"} {record.student?.last_name || ""}
                                        </td>
                                        <td>{record.student?.student_number || "-"}</td>
                                        <td>
                                            <span className={`status ${record.attended ? "active" : "inactive"}`}>
                                                {record.attended ? "Present" : "Absent"}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={record.attended ? "secondary-button" : "primary"}
                                                onClick={() => toggleAttendance(record)}
                                                type="button"
                                            >
                                                {record.attended ? "Mark absent" : "Mark present"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="empty-state">No attendance records available for this session yet.</p>
                )}
            </div>
        </section>
    );
}