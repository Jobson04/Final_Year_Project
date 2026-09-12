import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Palette, Save, Settings as SettingsIcon } from "lucide-react";
import api from "../services/api.js";

const h = React.createElement;

const fieldOptions = [];

const initial = {
    name: "Your Institution",
    logo_url: "",
    logo_image: "",
    signature_image: "",
    header_color: "#123b63",
    accent_color: "#d49a27",
    background_color: "#ffffff",
    font_family: "Arial, sans-serif",
    primary_color: "#123b63",
    secondary_color: "#d49a27",
    additional_id_label: "Additional ID",
    accommodation_label: "Accommodation",
    signatory_name: "Registrar",
    signatory_title: "",
    office: "the Administration Office",
    student_label: "Student",
    card_size: "CR80",
    orientation: "portrait",
    layout_template: "student",
    visible_fields: [],
    field_order: [],
};

const colorPresets = {
    header_color: ["#123b63", "#0d9488", "#1f2937", "#475569"],
    accent_color: ["#d49a27", "#f59e0b", "#ef4444", "#8b5cf6"],
    background_color: ["#ffffff", "#f8fafc", "#fef3c7", "#ecfeff"],
    primary_color: ["#123b63", "#0d9488", "#1f2937", "#475569"],
    secondary_color: ["#d49a27", "#f59e0b", "#ef4444", "#8b5cf6"],
};

function normalizeSettings(item) {
    if (!item) {
        return initial;
    }

    const removedFieldKeys = new Set(["blood_group", "emergency_contact", "expiry_date"]);
    const visibleFields = Array.isArray(item.visible_fields) ?
        item.visible_fields.filter((field) => !removedFieldKeys.has(field)) :
        initial.visible_fields;
    const fieldOrder = Array.isArray(item.field_order) ?
        item.field_order.filter((field) => !removedFieldKeys.has(field)) :
        initial.field_order;

    return {
        ...initial,
        ...item,
        visible_fields: visibleFields.length ? visibleFields : initial.visible_fields,
        field_order: fieldOrder.length ? fieldOrder : initial.field_order,
    };
}

function getContrastRatio(hexA, hexB) {
    const getRgb = (hex) => {
        const normalized = hex.replace("#", "");
        const full = normalized.length === 3 ? normalized.split("").map((value) => value + value).join("") : normalized;
        const num = Number.parseInt(full, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255,
        };
    };

    const lum = ({ r, g, b }) => {
        const values = [r, g, b].map((channel) => {
            const scaled = channel / 255;
            return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
    };

    const rgbA = getRgb(hexA);
    const rgbB = getRgb(hexB);
    const light = lum(rgbA);
    const dark = lum(rgbB);
    const lighter = Math.max(light, dark);
    const darker = Math.min(light, dark);
    return (lighter + 0.05) / (darker + 0.05);
}

export default function Settings() {
    const [form, setForm] = useState(initial);
    const [id, setId] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [logoFile, setLogoFile] = useState(null);
    const [signatureFile, setSignatureFile] = useState(null);

    useEffect(() => {
        api.get("/settings/")
            .then((response) => {
                const payload = response.data;
                const rawSettings = Array.isArray(payload) ?
                    payload[0] :
                    payload.results && Array.isArray(payload.results) ?
                    payload.results[0] :
                    payload;

                if (rawSettings) {
                    setId(rawSettings.id);
                    setForm(normalizeSettings(rawSettings));
                }
            })
            .catch(() => setError("Settings could not be loaded."));
    }, []);

    const update = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const toggleField = (fieldKey) => {
        setForm((current) => {
            const visible = current.visible_fields || [];
            const hasField = visible.includes(fieldKey);
            const nextVisible = hasField ? visible.filter((item) => item !== fieldKey) : [...visible, fieldKey];
            const nextOrder = [...(current.field_order || [])];

            if (!hasField && !nextOrder.includes(fieldKey)) {
                nextOrder.push(fieldKey);
            }

            return {
                ...current,
                visible_fields: nextVisible,
                field_order: nextOrder.filter((item) => nextVisible.includes(item)),
            };
        });
    };

    const moveField = (fieldKey, direction) => {
        setForm((current) => {
            const order = [...(current.field_order || [])];
            const index = order.indexOf(fieldKey);
            const targetIndex = direction === "up" ? index - 1 : index + 1;

            if (index < 0 || targetIndex < 0 || targetIndex >= order.length) {
                return current;
            }

            const nextOrder = [...order];
            nextOrder[index] = order[targetIndex];
            nextOrder[targetIndex] = fieldKey;

            return {
                ...current,
                field_order: nextOrder,
            };
        });
    };

    const save = async(event) => {
        event.preventDefault();
        setError("");
        setMessage("");

        try {
            const payload = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                if (key === "visible_fields" || key === "field_order") {
                    payload.append(key, JSON.stringify(value));
                    return;
                }
                if (value !== null && value !== undefined) {
                    payload.append(key, value);
                }
            });

            if (logoFile) {
                payload.append("logo_image", logoFile);
            }
            if (signatureFile) {
                payload.append("signature_image", signatureFile);
            }

            const response = id ?
                await api.put(`/settings/${id}/`, payload, { headers: { "Content-Type": "multipart/form-data" } }) :
                await api.post("/settings/", payload, { headers: { "Content-Type": "multipart/form-data" } });

            setId(response.data.id);
            setForm(normalizeSettings(response.data));
            setLogoFile(null);
            setSignatureFile(null);
            setMessage("Settings saved and applied to future ID cards.");
        } catch (requestError) {
            const data = requestError.response && requestError.response.data;
            setError(data && data.detail ? data.detail : "Settings could not be saved.");
        }
    };

    const contrastRatio = getContrastRatio(form.header_color, form.background_color);
    const contrastPass = contrastRatio >= 4.5;

    return ( <
            section className = "page-section narrow" >
            <
            div className = "section-heading" >
            <
            div >
            <
            span className = "eyebrow" > Administrator < /span> <
            h2 > Institution Settings < /h2> <
            /div> <
            /div>

            <
            div className = "settings-layout" >
            <
            form className = "panel settings-form"
            onSubmit = { save } >
            <
            div className = "settings-header-row" >
            <
            SettingsIcon size = { 28 }
            /> <
            h3 > Institution identity < /h3> <
            /div>

            <
            label >
            Institution name <
            input name = "name"
            value = { form.name }
            onChange = { update }
            /> <
            /label>

            <
            label >
            Institution logo URL <
            input name = "logo_url"
            value = { form.logo_url }
            onChange = { update }
            /> <
            /label>

            <
            div className = "upload-field" >
            <
            label >
            Direct logo upload <
            input type = "file"
            accept = "image/*"
            onChange = {
                (event) => setLogoFile(event.target.files && event.target.files[0] ? event.target.files[0] : null) }
            /> <
            /label> {
                form.logo_image || form.logo_url ? ( <
                    div className = "upload-preview" >
                    <
                    img src = { form.logo_image || form.logo_url }
                    alt = "Logo preview" / >
                    <
                    /div>
                ) : null
            } <
            /div>

            <
            label >
            ID card signatory <
            input name = "signatory_name"
            value = { form.signatory_name }
            onChange = { update }
            /> <
            /label>

            <
            label >
            Signatory title <
            input name = "signatory_title"
            value = { form.signatory_title }
            onChange = { update }
            /> <
            /label>

            <
            label >
            Return or collection office <
            input name = "office"
            value = { form.office }
            onChange = { update }
            /> <
            /label>

            <
            label >
            Student label <
            input name = "student_label"
            value = { form.student_label }
            onChange = { update }
            /> <
            /label>

            <
            div className = "upload-field" >
            <
            label >
            Digital signature upload <
            input type = "file"
            accept = "image/*"
            onChange = {
                (event) => setSignatureFile(event.target.files && event.target.files[0] ? event.target.files[0] : null) }
            /> <
            /label> {
                form.signature_image ? ( <
                    div className = "upload-preview signature-preview" >
                    <
                    img src = { form.signature_image }
                    alt = "Signature preview" / >
                    <
                    /div>
                ) : null
            } <
            /div>

            <
            div className = "settings-section" >
            <
            h3 > ID card appearance < /h3>

            <
            div className = "color-grid" > {
                [
                    ["header_color", "Header color"],
                    ["accent_color", "Accent color"],
                    ["background_color", "Card background"],
                    ["primary_color", "Primary color"],
                    ["secondary_color", "Secondary color"],
                ].map(([name, label]) => ( <
                    div className = "color-control"
                    key = { name } >
                    <
                    label htmlFor = { name } > { label } < /label> <
                    div className = "color-picker-row" >
                    <
                    input id = { name }
                    type = "color"
                    name = { name }
                    value = { form[name] }
                    onChange = { update }
                    /> <
                    input type = "text"
                    value = { form[name] }
                    onChange = {
                        (event) => setForm((current) => ({...current, [name]: event.target.value })) }
                    /> <
                    /div> <
                    div className = "swatch-row" > {
                        (colorPresets[name] || []).map((preset) => ( <
                            button type = "button"
                            key = { preset }
                            className = "swatch"
                            style = {
                                { background: preset } }
                            onClick = {
                                () => setForm((current) => ({...current, [name]: preset })) }
                            aria-label = { `Use ${preset}` }
                            />
                        ))
                    } <
                    /div> <
                    /div>
                ))
            } <
            /div>

            <
            div className = "contrast-panel" >
            <
            div >
            <
            strong > Contrast checker < /strong> <
            span > { contrastRatio.toFixed(2) }: 1 < /span> <
            /div> <
            span className = { `contrast-pill ${contrastPass ? "pass" : "warn"}` } > { contrastPass ? "WCAG AA pass" : "Low contrast warning" } <
            /span> <
            /div>

            <
            label >
            Font family <
            select name = "font_family"
            value = { form.font_family }
            onChange = { update } > {
                [
                    "Arial, sans-serif",
                    "Georgia, serif",
                    "Verdana, sans-serif",
                    "Trebuchet MS, sans-serif",
                    "Courier New, monospace",
                ].map((font) => ( <
                    option key = { font }
                    value = { font } > { font } <
                    /option>
                ))
            } <
            /select> <
            /label>

            <
            div className = "inline-grid" >
            <
            label >
            Card size <
            select name = "card_size"
            value = { form.card_size }
            onChange = { update } >
            <
            option value = "CR80" > CR80 < /option> <
            option value = "CR100" > CR100 < /option> <
            /select> <
            /label>

            <
            label >
            Orientation <
            select name = "orientation"
            value = { form.orientation }
            onChange = { update } >
            <
            option value = "portrait" > Portrait < /option> <
            option value = "landscape" > Landscape < /option> <
            /select> <
            /label> <
            /div>

            <
            label >
            Layout template <
            select name = "layout_template"
            value = { form.layout_template }
            onChange = { update } >
            <
            option value = "student" > Student < /option> <
            option value = "staff" > Staff < /option> <
            option value = "visitor" > Visitor < /option> <
            /select> <
            /label> <
            /div>

            <
            div className = "settings-section" >
            <
            h3 > ID card field labels < /h3> <
            div className = "inline-grid" >
            <
            label >
            Additional ID label <
            input name = "additional_id_label"
            value = { form.additional_id_label }
            onChange = { update }
            /> <
            /label> <
            label >
            Accommodation label <
            input name = "accommodation_label"
            value = { form.accommodation_label }
            onChange = { update }
            /> <
            /label> <
            /div> <
            /div>

            {
                error && < p className = "error" > { error } < /p>} {
                    message && < p className = "success" > { message } < /p>}

                    <
                    div className = "actions" >
                        <
                        button className = "primary"
                    type = "submit" >
                        <
                        Save size = { 18 }
                    />
                    Save and apply
                        <
                        /button> <
                        /div> <
                        /form>

                    <
                    aside className = "panel settings-preview" >
                        <
                        div className = "settings-header-row" >
                        <
                        Palette size = { 22 }
                    /> <
                    h3 > Live card preview < /h3> <
                        /div>

                    <
                    article
                    className = { `preview-card ${form.orientation}` }
                    style = {
                            {
                                background: form.background_color,
                                borderColor: form.accent_color,
                                fontFamily: form.font_family,
                            }
                        } >
                        <
                        div className = "preview-header"
                    style = {
                            { background: form.header_color } } >
                        <
                        div className = "preview-brand" > {
                            (form.logo_image || form.logo_url) && ( <
                                img src = { form.logo_image || form.logo_url }
                                alt = "Institution logo"
                                className = "preview-logo" / >
                            )
                        } <
                        strong > { form.name || "Your Institution" } < /strong> <
                        /div> <
                        span > { form.student_label || "Student" }
                    ID CARD < /span> <
                        /div>

                    <
                    div className = "preview-body" >
                        <
                        div className = "preview-photo" > PHOTO < /div> <
                        div className = "preview-details" >
                        <
                        div className = "preview-row" > < strong > Name: < /strong><span>Jane Doe</span > < /div> <
                        div className = "preview-row" > < strong > School: < /strong><span>School of Science</span > < /div> <
                        div className = "preview-row" > < strong > Comp No: < /strong><span>2021378535</span > < /div> <
                        div className = "preview-row" > < strong > Program: < /strong><span>Computer Science</span > < /div> <
                        /div> <
                        div className = "preview-qr" > QR < /div> <
                        /div>

                    <
                    div className = "preview-footer"
                    style = {
                            { background: form.header_color } } >
                        <
                        div >
                        <
                        strong > { form.signatory_name || "Registrar" } < /strong> <
                        span > { form.signatory_title || form.office } < /span> <
                        /div> {
                            form.signature_image ? ( <
                                img src = { form.signature_image }
                                alt = "Signature preview"
                                className = "preview-signature" / >
                            ) : null
                        } <
                        /div> <
                        /article> <
                        /aside> <
                        /div> <
                        /section>
                );
            }