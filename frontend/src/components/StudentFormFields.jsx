export default function StudentFormFields({ form, setForm, photoPreview, setPhotoFile }) {
  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updatePhoto = (event) => {
    const file = event.target.files?.[0] || null;
    setPhotoFile(file);
  };

  return (
    <div className="form-grid">
      <label>
        Student Number
        <input name="student_number" value={form.student_number} onChange={update} required />
      </label>
      <label>
        First Name
        <input name="first_name" value={form.first_name} onChange={update} required />
      </label>
      <label>
        Last Name
        <input name="last_name" value={form.last_name} onChange={update} required />
      </label>
      <label>
        Gender
        <select name="gender" value={form.gender} onChange={update} required>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label>
        Date of Birth
        <input type="date" name="date_of_birth" value={form.date_of_birth || ""} onChange={update} />
      </label>
      <label>
        Programme
        <input name="programme" value={form.programme} onChange={update} required />
      </label>
      <label>
        School
        <input name="school" value={form.school} onChange={update} />
      </label>
      <label>
        Year of Study
        <input type="number" min="1" max="10" name="year_of_study" value={form.year_of_study} onChange={update} required />
      </label>
      <label>
        Email
        <input type="email" name="email" value={form.email} onChange={update} />
      </label>
      <label>
        Phone
        <input name="phone" value={form.phone} onChange={update} />
      </label>
      <label>
        Status
        <select name="status" value={form.status} onChange={update}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
      <label className="file-field">
        ID Image
        <input type="file" accept="image/*" onChange={updatePhoto} />
      </label>
      {photoPreview && (
        <div className="photo-preview">
          <img src={photoPreview} alt="Selected student ID" />
        </div>
      )}
    </div>
  );
}
