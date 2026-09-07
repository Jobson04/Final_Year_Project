import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Download, FileSpreadsheet, Plus, Search, Upload } from "lucide-react";

import api from "../services/api.js";

const exportColumns = [
    ["Student Number", "student_number"],
    ["First Name", "first_name"],
    ["Last Name", "last_name"],
    ["Programme", "programme"],
    ["School", "school"],
    ["Year", "year_of_study"],
    ["Email", "email"],
    ["Phone", "phone"],
    ["Status", "status"],
];

const normalize = (value) => String(value || "").trim().toLowerCase();

const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const escapeCsvValue = (value) => {
    const text = String(value == null ? "" : value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const escapeHtmlValue = (value) =>
    String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export default function Students() {
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState("");
    const [programme, setProgramme] = useState("");
    const [year, setYear] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            api.get("/students/").then((response) => {
                setStudents(response.data.results || response.data);
            });
        }, 200);
        return () => clearTimeout(timer);
    }, []);

    const programmes = useMemo(
        () => [...new Set(students.map((student) => student.programme).filter(Boolean))].sort(), [students]
    );

    const years = useMemo(
        () => [...new Set(students.map((student) => String(student.year_of_study)).filter(Boolean))].sort(), [students]
    );

    const filteredStudents = useMemo(() => {
        const query = normalize(search);
        return students.filter((student) => {
            const matchesSearch = !query ||
                normalize(student.student_number).includes(query) ||
                normalize(student.first_name).includes(query) ||
                normalize(student.last_name).includes(query) ||
                normalize(student.programme).includes(query) ||
                normalize(student.school).includes(query);
            const matchesProgramme = !programme || student.programme === programme;
            const matchesYear = !year || String(student.year_of_study) === year;

            return matchesSearch && matchesProgramme && matchesYear;
        });
    }, [students, search, programme, year]);

    const exportCsv = () => {
        const header = exportColumns.map(([label]) => escapeCsvValue(label)).join(",");
        const rows = filteredStudents.map((student) =>
            exportColumns.map(([, key]) => escapeCsvValue(student[key])).join(",")
        );
        downloadFile([header, ...rows].join("\n"), "students.csv", "text/csv;charset=utf-8");
    };

    const exportExcel = () => {
            const head = exportColumns.map(([label]) => `<th>${escapeHtmlValue(label)}</th>`).join("");
            const rows = filteredStudents
                .map((student) => (
                        `<tr>${exportColumns.map(([, key]) => `<td>${escapeHtmlValue(student[key])}</td>`).join("")}</tr>`
      ))
      .join("");
    const workbook = `<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
    downloadFile(workbook, "students.xls", "application/vnd.ms-excel;charset=utf-8");
  };

  const approveStudent = async (student) => {
    await api.post(`/students/${student.id}/approve/`);
    setStudents((current) => current.map((item) => item.id === student.id ? { ...item, approval_status: "approved", status: "active" } : item));
  };

  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const [header, ...rows] = text.trim().split(/\r?\n/).map((row) => row.split(","));
    const keys = header.map((value) => value.trim().toLowerCase().replaceAll(" ", "_"));
    await Promise.all(rows.filter((row) => row.length > 1).map((row) => api.post("/students/", Object.fromEntries(keys.map((key, index) => [key, row[index] || ""])))));
    const response = await api.get("/students/");
    setStudents(response.data.results || response.data);
    event.target.value = "";
  };

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Records</span>
          <h2>Students</h2>
        </div>
        <Link className="button primary" to="/students/new">
          <Plus size={18} />
          Add Student
        </Link>
      </div>
      <div className="toolbar">
        <Search size={18} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, number, or programme" />
        <select value={programme} onChange={(event) => setProgramme(event.target.value)} aria-label="Filter by programme">
          <option value="">All programmes</option>
          {programmes.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <select value={year} onChange={(event) => setYear(event.target.value)} aria-label="Filter by year">
          <option value="">All years</option>
          {years.map((option) => (
            <option key={option} value={option}>Year {option}</option>
          ))}
        </select>
        <button type="button" onClick={exportCsv} disabled={!filteredStudents.length}>
          <Download size={18} />
          CSV
        </button>
        <button type="button" onClick={exportExcel} disabled={!filteredStudents.length}>
          <FileSpreadsheet size={18} />
          Excel
        </button>
        <label className="button import-button"><Upload size={18} /> Import CSV<input type="file" accept=".csv,text/csv" onChange={importCsv} /></label>
      </div>
      <div className="table-wrap">
        <table className="student-table">
          <thead>
            <tr>
              <th>Student Number</th>
              <th>Name</th>
              <th>Programme</th>
              <th>Year</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id}>
                <td data-label="Student Number">{student.student_number}</td>
                <td data-label="Name">{student.first_name} {student.last_name}</td>
                <td data-label="Programme">{student.programme}</td>
                <td data-label="Year">{student.year_of_study}</td>
                <td data-label="Status"><span className={`status ${student.status}`}>{student.status}</span></td>
                <td data-label="Action"><Link to={`/students/${student.id}`}>View</Link>{student.approval_status === "pending" && <button className="small-action" onClick={() => approveStudent(student)} title="Approve registration"><Check size={16} /></button>}</td>
              </tr>
            ))}
            {!filteredStudents.length && (
              <tr>
                <td colSpan="6">No students match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}