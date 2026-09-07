import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Edit, RotateCcw, Trash2 } from "lucide-react";

import api from "../services/api.js";

export default function StudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [qrImage, setQrImage] = useState("");

  const loadStudent = () => {
    api.get(`/students/${id}/`).then((response) => setStudent(response.data));
  };

  useEffect(() => {
    loadStudent();
    api.get(`/students/${id}/qr/`, { responseType: "blob" }).then((response) => {
      setQrImage((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(response.data);
      });
    });

    return () => {
      setQrImage((current) => {
        if (current) URL.revokeObjectURL(current);
        return "";
      });
    };
  }, [id]);

  if (!student) {
    return <section className="page-section">Loading...</section>;
  }

  const deactivate = async () => {
    await api.delete(`/students/${id}/`);
    loadStudent();
  };

  const regenerateQr = async () => {
    const response = await api.post(`/students/${id}/regenerate-qr/`);
    setStudent(response.data);
    const qrResponse = await api.get(`/students/${id}/qr/`, { responseType: "blob" });
    setQrImage((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(qrResponse.data);
    });
  };

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Profile</span>
          <h2>{student.first_name} {student.last_name}</h2>
        </div>
        <div className="actions">
          <Link className="button" to={`/students/${id}/edit`}><Edit size={18} /> Edit</Link>
          <button onClick={regenerateQr}><RotateCcw size={18} /> Regenerate QR</button>
          <button className="danger" onClick={deactivate}><Trash2 size={18} /> Deactivate</button>
        </div>
      </div>
      <div className="details-grid">
        <article className="panel">
          <dl>
            <dt>Student Number</dt><dd>{student.student_number}</dd>
            <dt>Programme</dt><dd>{student.programme}</dd>
            <dt>School</dt><dd>{student.school || "Not provided"}</dd>
            <dt>Year of Study</dt><dd>{student.year_of_study}</dd>
            <dt>Email</dt><dd>{student.email || "Not provided"}</dd>
            <dt>Phone</dt><dd>{student.phone || "Not provided"}</dd>
            <dt>Status</dt><dd><span className={`status ${student.status}`}>{student.status}</span></dd>
          </dl>
        </article>
        {student.photo && (
          <article className="panel id-image-panel">
            <h3>ID Image</h3>
            <img src={student.photo} alt={`ID for ${student.first_name} ${student.last_name}`} />
          </article>
        )}
        <article className="panel qr-panel">
          {qrImage && <img src={qrImage} alt={`QR code for ${student.student_number}`} />}
          <code>{student.qr_code?.token}</code>
        </article>
      </div>
    </section>
  );
}
