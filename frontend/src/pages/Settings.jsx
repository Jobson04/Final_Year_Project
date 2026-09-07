import React, { useEffect, useState } from "react";
import { Save, Settings as SettingsIcon } from "lucide-react";
import api from "../services/api.js";
const h = React.createElement;
const initial = { name: "Your Institution", logo_url: "", header_color: "#123b63", accent_color: "#d49a27", background_color: "#ffffff", font_family: "Arial, sans-serif", additional_id_label: "Additional ID", accommodation_label: "Accommodation", signatory_name: "Registrar", office: "the Administration Office" };
const fields = [
    ["name", "Institution name"],
    ["logo_url", "Institution logo path or URL"],
    ["signatory_name", "ID card signatory"],
    ["office", "Return or collection office"],
    ["additional_id_label", "Additional ID label"],
    ["accommodation_label", "Accommodation label"]
];
export default function Settings() {
    const [form, setForm] = useState(initial);
    const [id, setId] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    useEffect(() => {
        api.get("/settings/").then((response) => {
            const item = response.data.results && response.data.results[0];
            if (item) {
                setId(item.id);
                setForm({...initial, ...item });
            }
        }).catch(() => setError("Settings could not be loaded."));
    }, []);
    const update = (event) => setForm({...form, [event.target.name]: event.target.value });
    const save = async(event) => {
        event.preventDefault();
        setError("");
        try {
            const response = id ? await api.put(`/settings/${id}/`, form) : await api.post("/settings/", form);
            setId(response.data.id);
            setForm({...initial, ...response.data });
            setMessage("Settings saved and applied to future ID cards.");
        } catch (requestError) { const data = requestError.response && requestError.response.data; setError(data && data.detail ? data.detail : "Settings could not be saved."); }
    };
    return h("section", { className: "page-section narrow" }, h("div", { className: "section-heading" }, h("div", null, h("span", { className: "eyebrow" }, "Administrator"), h("h2", null, "Institution Settings"))), h("form", { className: "panel settings-form", onSubmit: save }, h(SettingsIcon, { size: 28 }), h("h3", null, "Institution identity"), fields.slice(0, 4).map(([name, label]) => h("label", { key: name }, label, h("input", { name, value: form[name], onChange: update }))), h("h3", null, "ID card appearance"), h("label", null, "Header color", h("input", { type: "color", name: "header_color", value: form.header_color, onChange: update })), h("label", null, "Accent color", h("input", { type: "color", name: "accent_color", value: form.accent_color, onChange: update })), h("label", null, "Card background color", h("input", { type: "color", name: "background_color", value: form.background_color, onChange: update })), h("label", null, "Font family", h("select", { name: "font_family", value: form.font_family, onChange: update }, ["Arial, sans-serif", "Georgia, serif", "Verdana, sans-serif", "Trebuchet MS, sans-serif", "Courier New, monospace"].map((font) => h("option", { key: font, value: font }, font)))), h("h3", null, "ID card field labels"), fields.slice(4).map(([name, label]) => h("label", { key: name }, label, h("input", { name, value: form[name], onChange: update }))), error && h("p", { className: "error" }, error), message && h("p", { className: "success" }, message), h("div", { className: "actions" }, h("button", { className: "primary", type: "submit" }, h(Save, { size: 18 }), "Save and apply to all ID cards"))));
}