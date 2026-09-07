import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Save } from "lucide-react";

import StudentFormFields from "../components/StudentFormFields.jsx";
import api from "../services/api.js";

const emptyForm = {
  student_number: "",
  first_name: "",
  last_name: "",
  gender: "female",
  date_of_birth: "",
  programme: "",
  school: "",
  year_of_study: 1,
  email: "",
  phone: "",
  status: "active",
};

export default function StudentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  useEffect(() => {
    if (id) {
      api.get(`/students/${id}/`).then((response) => {
        setForm({ ...emptyForm, ...response.data, date_of_birth: response.data.date_of_birth || "" });
        setPhotoPreview(response.data.photo || "");
      });
    }
  }, [id]);

  useEffect(() => {
    if (!photoFile) {
      return undefined;
    }

    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const payload = new FormData();
    Object.entries({ ...form, date_of_birth: form.date_of_birth || "" }).forEach(([key, value]) => {
      if (["id", "photo", "qr_code", "qr_image_url", "created_at", "updated_at"].includes(key)) {
        return;
      }
      payload.append(key, value ?? "");
    });
    if (photoFile) {
      payload.append("photo", photoFile);
    }

    try {
      const config = { headers: { "Content-Type": "multipart/form-data" } };
      const response = id
        ? await api.put(`/students/${id}/`, payload, config)
        : await api.post("/students/", payload, config);
      navigate(`/students/${response.data.id}`);
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        return;
      }
      setError("Please check the student details and try again.");
    }
  };

  return (
    <section className="page-section narrow">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Student</span>
          <h2>{id ? "Edit Student" : "Register Student"}</h2>
        </div>
      </div>
      <form className="panel" onSubmit={submit}>
        <StudentFormFields
          form={form}
          setForm={setForm}
          photoPreview={photoPreview}
          setPhotoFile={setPhotoFile}
        />
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <Link className="button" to="/students">Cancel</Link>
          <button className="primary" type="submit">
            <Save size={18} />
            Save Student
          </button>
        </div>
      </form>
    </section>
  );
}
