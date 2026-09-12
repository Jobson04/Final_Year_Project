import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, Plus, Search, Users } from "lucide-react";

import api from "../services/api.js";

const normalizeList = (payload) => payload?.results ?? payload ?? [];

export default function LecturerCourses() {
    const [courses, setCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [query, setQuery] = useState("");
    const [form, setForm] = useState({
        code: "",
        title: "",
        department: "",
        level: "",
        semester: "",
        academic_year: "",
        capacity: 0,
        description: "",
    });
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            const [coursesResponse, enrollmentsResponse, studentsResponse] = await Promise.all([
                api.get("/courses/"),
                api.get("/course-enrollments/"),
                api.get("/students/"),
            ]);

            const nextCourses = normalizeList(coursesResponse.data);
            const nextEnrollments = normalizeList(enrollmentsResponse.data);
            const nextStudents = normalizeList(studentsResponse.data);

            setCourses(nextCourses);
            setEnrollments(nextEnrollments);
            setStudents(nextStudents);
            setSelectedCourseId((current) => current || nextCourses[0]?.id || "");
        } catch (error) {
            console.error("Failed to load lecturer courses", error);
            setMessage("Unable to load course information right now.");
        }
    };

    const filteredCourses = useMemo(() => {
        const trimmed = query.trim().toLowerCase();

        if (!trimmed) {
            return courses;
        }

        return courses.filter((course) => {
            const searchText = `${course.code || ""} ${course.title || ""} ${course.department || ""}`.toLowerCase();
            return searchText.includes(trimmed);
        });
    }, [courses, query]);

    const selectedCourse = useMemo(
        () => courses.find((course) => course.id === selectedCourseId) || courses[0] || null,
        [courses, selectedCourseId]
    );

    const selectedRoster = useMemo(() => {
        if (!selectedCourse) {
            return [];
        }

        return enrollments.filter((enrollment) => enrollment.course === selectedCourse.id);
    }, [enrollments, selectedCourse]);

    const studentsById = useMemo(() => {
        return new Map(students.map((student) => [student.id, student]));
    }, [students]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            const courseResponse = await api.post("/courses/", {
                code: form.code,
                title: form.title,
                department: form.department,
                level: form.level,
                semester: form.semester,
                academic_year: form.academic_year,
                capacity: form.capacity,
                description: form.description,
            });

            await api.post("/course-assignments/", {
                course: courseResponse.data.id,
                academic_year: form.academic_year,
                semester: form.semester,
                class_size: form.capacity,
                status: "active",
            });

            setMessage("Course assigned and created successfully.");
            setForm({
                code: "",
                title: "",
                department: "",
                level: "",
                semester: "",
                academic_year: "",
                capacity: 0,
                description: "",
            });

            await loadCourses();
        } catch (error) {
            setMessage(error.response?.data?.detail || "Unable to create course assignment.");
        }
    };

    return (
        <section className="page-section narrow">
            <div className="section-heading">
                <div>
                    <span className="eyebrow">Curriculum</span>
                    <h2>My courses</h2>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: 24 }}>
                <h3>Add course</h3>
                <form className="form-grid" onSubmit={handleSubmit}>
                    <label>
                        Course code
                        <input
                            value={form.code}
                            onChange={(event) => setForm({ ...form, code: event.target.value })}
                            required
                        />
                    </label>

                    <label>
                        Course title
                        <input
                            value={form.title}
                            onChange={(event) => setForm({ ...form, title: event.target.value })}
                            required
                        />
                    </label>

                    <label>
                        Department
                        <input
                            value={form.department}
                            onChange={(event) => setForm({ ...form, department: event.target.value })}
                        />
                    </label>

                    <label>
                        Level
                        <input
                            value={form.level}
                            onChange={(event) => setForm({ ...form, level: event.target.value })}
                        />
                    </label>

                    <label>
                        Semester
                        <input
                            value={form.semester}
                            onChange={(event) => setForm({ ...form, semester: event.target.value })}
                        />
                    </label>

                    <label>
                        Academic year
                        <input
                            value={form.academic_year}
                            onChange={(event) => setForm({ ...form, academic_year: event.target.value })}
                        />
                    </label>

                    <label>
                        Capacity
                        <input
                            min="0"
                            type="number"
                            value={form.capacity}
                            onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })}
                        />
                    </label>

                    <label className="file-field">
                        Description
                        <textarea
                            rows={4}
                            value={form.description}
                            onChange={(event) => setForm({ ...form, description: event.target.value })}
                        />
                    </label>

                    <div className="actions">
                        <button className="primary" type="submit">
                            <Plus size={18} />
                            Save course
                        </button>
                    </div>
                </form>

                {message ? <p className="notice" style={{ marginTop: 18 }}>{message}</p> : null}
            </div>

            <div className="courses-layout">
                <div className="panel">
                    <div className="panel-header">
                        <div>
                            <span className="eyebrow">Catalogue</span>
                            <h3>Current course list</h3>
                        </div>
                    </div>

                    <div className="toolbar compact-toolbar">
                        <Search size={16} />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Filter courses"
                        />
                    </div>

                    <div className="course-list">
                        {filteredCourses.length ? (
                            filteredCourses.map((course) => (
                                <button
                                    key={course.id}
                                    className={`course-card ${selectedCourse?.id === course.id ? "selected" : ""}`}
                                    onClick={() => setSelectedCourseId(course.id)}
                                    type="button"
                                >
                                    <div className="course-card-head">
                                        <div>
                                            <span className="eyebrow">{course.code}</span>
                                            <h4>{course.title}</h4>
                                        </div>
                                        <span className="status">{course.semester || "Semester TBD"}</span>
                                    </div>

                                    <div className="course-meta-grid">
                                        <span>
                                            <Users size={14} />
                                            {course.enrollment_count || 0} students
                                        </span>
                                        <span>
                                            <CalendarDays size={14} />
                                            {course.academic_year || "No year set"}
                                        </span>
                                    </div>

                                    <p>{course.description || "No detailed description has been added yet."}</p>
                                </button>
                            ))
                        ) : (
                            <p className="empty-state">No courses matched your search.</p>
                        )}
                    </div>
                </div>

                <div className="panel">
                    {selectedCourse ? (
                        <>
                            <div className="panel-header">
                                <div>
                                    <span className="eyebrow">Overview</span>
                                    <h3>{selectedCourse.code}</h3>
                                </div>
                                <span className="status-badge">
                                    <BookOpen size={16} />
                                    Active course
                                </span>
                            </div>

                            <div className="course-detail-metrics">
                                <div className="mini-status">
                                    <span>Students</span>
                                    <strong>{selectedCourse.enrollment_count || 0}</strong>
                                </div>
                                <div className="mini-status">
                                    <span>Capacity</span>
                                    <strong>{selectedCourse.capacity || 0}</strong>
                                </div>
                                <div className="mini-status">
                                    <span>Semester</span>
                                    <strong>{selectedCourse.semester || "TBD"}</strong>
                                </div>
                            </div>

                            <dl className="profile-list compact">
                                <dt>Course title</dt>
                                <dd>{selectedCourse.title}</dd>

                                <dt>Department</dt>
                                <dd>{selectedCourse.department || "Not specified"}</dd>

                                <dt>Level</dt>
                                <dd>{selectedCourse.level || "Not specified"}</dd>

                                <dt>Academic year</dt>
                                <dd>{selectedCourse.academic_year || "Not specified"}</dd>
                            </dl>

                            <div className="course-syllabus">
                                <h4>Course syllabus</h4>
                                <p>
                                    {selectedCourse.description || "Add a course description so students can understand learning outcomes, assessment expectations, and materials."}
                                </p>
                            </div>

                            <div className="course-roster">
                                <h4>Student roster</h4>

                                {selectedRoster.length ? (
                                    <div className="table-wrap">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Student</th>
                                                    <th>Number</th>
                                                    <th>Programme</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedRoster.map((enrollment) => {
                                                    const student = studentsById.get(enrollment.student);

                                                    return (
                                                        <tr key={enrollment.id}>
                                                            <td>
                                                                {student ? `${student.first_name || ""} ${student.last_name || ""}`.trim() : "Student"}
                                                            </td>
                                                            <td>{student?.student_number || "-"}</td>
                                                            <td>{student?.programme || "-"}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="empty-state">No enrolled students recorded for this course yet.</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className="empty-state">Choose a course to view its roster.</p>
                    )}
                </div>
            </div>
        </section>
    );
}