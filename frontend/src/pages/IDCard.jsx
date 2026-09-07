import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import api from "../services/api.js";
const h = React.createElement;

export default function IDCard() {
    const { id } = useParams();
    const [student, setStudent] = useState(null);
    const [qrImage, setQrImage] = useState("");
    const [settings, setSettings] = useState(null);
    useEffect(() => {
        api.get(`/students/${id}/`).then((response) => setStudent(response.data));
        api.get("/settings/").then((response) => setSettings(response.data.results && response.data.results[0] || null));
        api.get(`/students/${id}/qr/`, { responseType: "blob" }).then((response) => setQrImage(URL.createObjectURL(response.data)));
        return () => { if (qrImage) URL.revokeObjectURL(qrImage); };
    }, [id]);
    if (!student) return h("section", { className: "page-section" }, "Loading...");
    const heading = h("div", { className: "section-heading no-print" }, h("div", null, h("span", { className: "eyebrow" }, "Identity card"), h("h2", null, `${student.first_name} ${student.last_name}`)), h("div", { className: "actions" }, h(Link, { className: "button", to: `/students/${id}` }, h(ArrowLeft, { size: 18 }), "Back"), h("button", { className: "primary", onClick: () => window.print() }, h(Printer, { size: 18 }), "Print card")));
    const header = h("div", { className: "id-card-header", style: { background: settings && settings.header_color || "#123b63", fontFamily: settings && settings.font_family || "Arial, sans-serif" } }, settings && settings.logo_url && h("img", { className: "id-card-logo", src: settings.logo_url, alt: "Institution logo" }), h("strong", null, settings && settings.name || "Your Institution"), h("span", null, "STUDENT ID CARD"));
    const photo = student.photo ? h("img", { className: "id-card-photo", src: student.photo, alt: "Student" }) : h("div", { className: "id-card-photo photo-placeholder" }, "PHOTO");
    const credentialRows = [
        ["Name", `${student.first_name} ${student.last_name}`],
        ["School", student.school || ""],
        ["Comp No", student.student_number || ""],
        ["Prog", student.programme || ""],
        ["NRC", student.national_id || ""],
        ["Accom Details", student.accommodation || ""],
    ].map(([label, value]) => h("div", { className: "id-card-credential", key: label }, h("strong", null, `${label}:`), h("span", null, value)));
    const details = h("div", { className: "id-card-details", style: { fontFamily: settings && settings.font_family || "Arial, sans-serif" } }, credentialRows);
    const body = h("div", { className: "id-card-body" }, photo, details, qrImage && h("img", { className: "id-card-qr", src: qrImage, alt: "Verification QR code" }));
    const card = h("article", { className: "id-card", style: { background: settings && settings.background_color || "#ffffff", borderColor: settings && settings.accent_color || "#d49a27" } }, header, body, h("div", { className: "id-card-footer", style: { background: settings && settings.header_color || "#123b63" } }, `${settings && settings.signatory_name || "Registrar"}, ${settings && settings.office || "the Administration Office"}`));
    return h("section", { className: "page-section card-print-page" }, heading, card);
}