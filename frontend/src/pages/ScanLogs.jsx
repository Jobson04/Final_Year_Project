import { useEffect, useState } from "react";

import api from "../services/api.js";

export default function ScanLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get("/scans/").then((response) => setLogs(response.data.results || response.data));
  }, []);

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">History</span>
          <h2>Scan Logs</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Student Number</th>
              <th>Scanned By</th>
              <th>Date and Time</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.student.first_name} {log.student.last_name}</td>
                <td>{log.student.student_number}</td>
                <td>{log.scanned_by_username || "Unknown"}</td>
                <td>{new Date(log.scanned_at).toLocaleString()}</td>
                <td>{log.ip_address || "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

