import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, Clock3, Search, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";

import api from "../services/api.js";

const normalizeList = (payload) => payload?.results ?? payload ?? [];

export default function LecturerDashboard() {
    const [lecturer, setLecturer] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [query, setQuery] = useState("");
    const [officeHours, setOfficeHours] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [savingHours, setSavingHours] = useState(false);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const [lecturerResponse, analyticsResponse, coursesResponse, studentsResponse] = await Promise.all([
                api.get("/lecturers/me/"),
                api.get("/lecturers/analytics/"),
                api.get("/courses/"),
                api.get("/students/"),
            ]);

            const nextLecturer = lecturerResponse.data || null;
            setLecturer(nextLecturer);
            setOfficeHours(nextLecturer?.office_hours || "");
            setAnalytics(analyticsResponse.data || null);
            setCourses(normalizeList(coursesResponse.data));
            setStudents(normalizeList(studentsResponse.data));
        } catch (error) {
            console.error("Failed to load lecturer dashboard", error);
            setStatusMessage("Unable to load lecturer dashboard data.");
        }
    };

    const filteredStudents = useMemo(() => {
        const trimmed = query.trim().toLowerCase();
        if (!trimmed) {
            return students.slice(0, 5);
        }

        return students.filter((student) => {
            const searchText = `${student.student_number || ""} ${student.first_name || ""} ${student.last_name || ""} ${student.programme || ""}`.toLowerCase();
            return searchText.includes(trimmed);
        }).slice(0, 5);
    }, [query, students]);

    const stats = useMemo(() => {
        const cards = [
            {
                label: "Courses taught",
                value: analytics?.total_courses ?? courses.length,
                icon: BookOpen,
                accent: "teal",
            },
            {
                label: "Enrolled students",
                value: analytics?.total_students ?? 0,
                icon: Users,
                accent: "green",
            },
            {
                label: "Attendance sessions",
                value: analytics?.total_sessions ?? 0,
                icon: CalendarDays,
                accent: "amber",
            },
            {
                label: "Office hours",
                value: lecturer?.office_hours ? "Updated" : "Pending",
                icon: Clock3,
                accent: "purple",
            },
        ];

        return cards;
    }, [analytics, courses.length, lecturer]);

    const topCourses = useMemo(() => {
        return [...courses]
            .sort((left, right) => (right.enrollment_count || 0) - (left.enrollment_count || 0))
            .slice(0, 3);
    }, [courses]);

    const maxEnrollment = Math.max(...topCourses.map((course) => course.enrollment_count || 0), 1);

    const handleOfficeHoursSave = async () => {
        if (!lecturer) {
            return;
        }

        try {
            setSavingHours(true);
            const response = await api.patch(`/lecturers/${lecturer.id}/`, {
                office_hours: officeHours,
                full_name: lecturer.full_name,
                department: lecturer.department,
                title: lecturer.title,
                email: lecturer.email,
                phone: lecturer.phone,
            });

            setLecturer(response.data);
            setStatusMessage("Office hours updated successfully.");
        } catch (error) {
            console.error("Failed to update office hours", error);
            setStatusMessage("Unable to update office hours right now.");
        } finally {
            setSavingHours(false);
        }
    };

    return (
        <section className="page-section dashboard-page">
            <div className="dashboard-shell">
                <div className="panel lecturer-hero">
                    <div className="dashboard-header-copy">
                        <span className="eyebrow">Lecturer portal</span>
                        <h2>Welcome back, {lecturer?.full_name || "Lecturer"}.</h2>
                        <p>
                            Track coursework, student engagement, attendance quality, and office availability from one premium control centre.
                        </p>
                    </div>

                    <div className="dashboard-header-actions">
                        <span className="status-badge">
                            <Sparkles size={16} />
                            Active teaching cycle
                        </span>
                        <Link className="button primary" to="/lecturer/attendance">
                            Launch attendance
                        </Link>
                    </div>
                </div>

                {statusMessage ? <div className="notice dashboard-notice">{statusMessage}</div> : null}

                <div className="stats-grid">
                    {stats.map(({ label, value, icon: Icon, accent }) => (
                        <article key={label} className={`stat-card stat-card-${accent}`}>
                            <div className="stat-card-top">
                                <div className="stat-icon">
                                    <Icon size={20} />
                                </div>
                                <span className="trend-pill">Live</span>
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
                                <span className="eyebrow">Verification</span>
                                <h3>Student search</h3>
                            </div>
                        </div>

                        <div className="toolbar compact-toolbar">
                            <Search size={16} />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search by student number, name, or programme"
                            />
                        </div>

                        <div className="activity-list">
                            {filteredStudents.length ? (
                                filteredStudents.map((student) => (
                                    <div className="activity-item" key={student.id || `${student.student_number}-${student.first_name}`}>
                                        <div className="activity-icon">
                                            <Users size={16} />
                                        </div>

                                        <div className="activity-copy">
                                            <strong>
                                                {student.first_name || "Student"} {student.last_name || ""}
                                            </strong>
                                            <span>
                                                {student.student_number || "No student number"} • {student.programme || "Programme pending"}
                                            </span>
                                        </div>

                                        <span className={`activity-tag ${student.approval_status === "approved" ? "success" : "warning"}`}>
                                            {student.approval_status || student.status || "Active"}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">No matching students found.</div>
                            )}
                        </div>
                    </div>

                    <div className="panel dashboard-panel">
                        <div className="panel-header">
                            <div>
                                <span className="eyebrow">Profile</span>
                                <h3>Office hours</h3>
                            </div>
                        </div>

                        {lecturer ? (
                            <>
                                <dl className="profile-list">
                                    <dt>Lecturer ID</dt>
                                    <dd>{lecturer.lecturer_id || "Not assigned"}</dd>

                                    <dt>Department</dt>
                                    <dd>{lecturer.department || "Not specified"}</dd>

                                    <dt>Email</dt>
                                    <dd>{lecturer.email || "Not specified"}</dd>

                                    <dt>Phone</dt>
                                    <dd>{lecturer.phone || "Not specified"}</dd>
                                </dl>

                                <label className="file-field">
                                    Weekly availability
                                    <textarea
                                        rows={5}
                                        value={officeHours}
                                        onChange={(event) => setOfficeHours(event.target.value)}
                                    />
                                </label>

                                <div className="actions align-left">
                                    <button className="primary" onClick={handleOfficeHoursSave} disabled={savingHours} type="button">
                                        {savingHours ? "Saving..." : "Save availability"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="empty-state">Loading lecturer profile...</p>
                        )}
                    </div>
                </div>

                <div className="dashboard-grid lower-grid">
                    <div className="panel dashboard-panel">
                        <div className="panel-header">
                            <div>
                                <span className="eyebrow">Insights</span>
                                <h3>Course performance</h3>
                            </div>
                        </div>

                        <div className="program-list">
                            {topCourses.length ? (
                                topCourses.map((course) => (
                                    <div className="program-row" key={course.id}>
                                        <div className="program-meta">
                                            <span>
                                                {course.code} • {course.title}
                                            </span>
                                            <strong>{course.enrollment_count || 0}</strong>
                                        </div>
                                        <div className="progress-track">
                                            <span
                                                style={{ width: `${((course.enrollment_count || 0) / maxEnrollment) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">No course data available yet.</div>
                            )}
                        </div>
                    </div>

                    <div className="panel dashboard-panel">
                        <div className="panel-header">
                            <div>
                                <span className="eyebrow">Quick access</span>
                                <h3>Operations</h3>
                            </div>
                        </div>

                        <div className="quick-actions">
                            <Link className="button secondary-button quick-action" to="/lecturer/courses">
                                <BookOpen size={18} />
                                Manage courses
                            </Link>
                            <Link className="button secondary-button quick-action" to="/lecturer/attendance">
                                <CalendarDays size={18} />
                                Attendance centre
                            </Link>
                        </div>

                        <div className="status-stack compact">
                            <div className="system-item">
                                <span className="system-label">
                                    <CalendarDays size={16} />
                                    Sessions
                                </span>
                                <strong>{analytics?.total_sessions ?? 0}</strong>
                            </div>
                            <div className="system-item">
                                <span className="system-label">
                                    <Users size={16} />
                                    Students
                                </span>
                                <strong>{analytics?.total_students ?? 0}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}