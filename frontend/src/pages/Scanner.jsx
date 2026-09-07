import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { ScanLine } from "lucide-react";

import api from "../services/api.js";

export default function Scanner() {
  const scannerRef = useRef(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scannerRef.current = scanner;
    scanner.render(
      async (decodedText) => {
        try {
          await scanner.clear();
          const response = await api.post("/scanner/scan/", { token: decodedText.trim() });
          setResult(response.data.student);
          setError("");
        } catch (err) {
          setError(err.response?.data?.detail || "Could not verify this QR code.");
        }
      },
      () => {}
    );

    return () => {
      scannerRef.current?.clear().catch(() => {});
    };
  }, []);

  const reset = () => window.location.reload();

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Verification</span>
          <h2>QR Scanner</h2>
        </div>
      </div>
      <div className="scanner-layout">
        <article className="panel scanner-panel">
          <ScanLine size={28} />
          <div id="qr-reader"></div>
          {error && <p className="error">{error}</p>}
        </article>
        {result && (
          <article className="panel verified">
            <h3>Student Verified</h3>
            <dl>
              <dt>Name</dt><dd>{result.first_name} {result.last_name}</dd>
              <dt>Student Number</dt><dd>{result.student_number}</dd>
              <dt>Programme</dt><dd>{result.programme}</dd>
              <dt>Year</dt><dd>{result.year_of_study}</dd>
              <dt>Status</dt><dd><span className={`status ${result.status}`}>{result.status}</span></dd>
            </dl>
            <button className="primary" onClick={reset}>Scan Again</button>
          </article>
        )}
      </div>
    </section>
  );
}

