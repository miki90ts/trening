import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Card from "../components/common/Card";
import { useActivity } from "../context/ActivityContext";

const formatDuration = (totalSeconds) => {
  if (!totalSeconds || totalSeconds <= 0) return "-";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatDistance = (meters) => {
  if (!meters || meters <= 0) return "-";
  const km = (meters / 1000).toFixed(2);
  return `${km} km`;
};

const formatPace = (secPerKm) => {
  if (!secPerKm || secPerKm <= 0) return "-";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
};

function ImportActivityPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { activityTypes, loadingTypes, loadActivityTypes, imporActivityFiles } =
    useActivity();

  const [files, setFiles] = useState([]);
  const [activityTypeId, setActivityTypeId] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadActivityTypes().catch((err) =>
      toast.error(err.response?.data?.error || err.message),
    );
  }, []);

  const handleFileSelect = (event) => {
    const selected = Array.from(event.target.files || []);
    const valid = selected.filter((f) => {
      const ext = f.name.split(".").pop().toLowerCase();
      return ext === "fit";
    });

    if (valid.length < selected.length) {
      toast.warn("Neki fajlovi su preskočeni — prihvataju se samo .fit");
    }

    setFiles((prev) => [...prev, ...valid]);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    setResult(null);
  };

  const handleImport = async () => {
    if (files.length === 0) {
      toast.warn("Izaberite bar jedan .fit fajl");
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      if (activityTypeId) {
        formData.append("activity_type_id", activityTypeId);
      }

      const response = await imporActivityFiles(formData);
      setResult(response);

      if (response.imported_count > 0) {
        toast.success(
          `Uspešno importovano ${response.imported_count} aktivnost(i)!`,
        );
      }
      if (response.error_count > 0) {
        toast.warn(`${response.error_count} fajl(ova) nije uspešno obrađeno.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dropped = Array.from(e.dataTransfer.files || []);
    const valid = dropped.filter((f) => {
      const ext = f.name.split(".").pop().toLowerCase();
      return ext === "fit";
    });
    if (valid.length < dropped.length) {
      toast.warn(
        "Neki fajlovi su preskočeni — prihvataju se samo .fit i .json",
      );
    }
    setFiles((prev) => [...prev, ...valid]);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">⌚ Import</h1>
          <p className="page-subtitle">
            Importujte .fit fajlove eksportovane iz aplikacija (Suunto, Garmin i
            ostali)
          </p>
        </div>
        <div className="metrics-header-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate("/activity")}
          >
            ← Nazad na Activity
          </button>
        </div>
      </div>

      <Card>
        <h3>📁 Izaberite fajlove</h3>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
          Podržani formati: <strong>.fit</strong> (Garmin/ANT+ FIT) i . Možete
          uploadovati više fajlova odjednom.
        </p>

        {/* Drag & drop zone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed var(--border-color)",
            borderRadius: "var(--radius-md, 8px)",
            padding: "2rem",
            textAlign: "center",
            cursor: "pointer",
            marginBottom: "1rem",
            transition: "border-color 0.2s",
            background: "var(--bg-secondary, #f9fafb)",
          }}
        >
          <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
            📂 Kliknite ili prevucite fajlove ovde
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            .fit — max 50 MB po fajlu
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".fit"
          multiple
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        {/* Optional: override activity type */}
        <div
          className="form-group"
          style={{ maxWidth: "320px", marginBottom: "1rem" }}
        >
          <label>Tip aktivnosti (opciono — override)</label>
          <select
            value={activityTypeId}
            onChange={(e) => setActivityTypeId(e.target.value)}
            disabled={loadingTypes}
          >
            <option value="">Auto-detekcija iz fajla</option>
            {activityTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div className="section-header" style={{ marginBottom: "0.5rem" }}>
              <h4>Izabrani fajlovi ({files.length})</h4>
              <button
                type="button"
                className="btn btn-outline"
                onClick={clearAll}
                style={{ fontSize: "0.8rem" }}
              >
                Obriši sve
              </button>
            </div>
            <div className="results-table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Naziv fajla</th>
                    <th>Format</th>
                    <th>Veličina</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file, index) => {
                    const ext = file.name.split(".").pop().toLowerCase();
                    const sizeKb = (file.size / 1024).toFixed(1);
                    return (
                      <tr key={`${file.name}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{file.name}</td>
                        <td>
                          <span
                            className={`badge ${ext === "fit" ? "badge-info" : "badge-warning"}`}
                            style={{
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              background:
                                ext === "fit"
                                  ? "var(--accent-blue, #3b82f6)"
                                  : "var(--accent-yellow, #f59e0b)",
                              color: "#fff",
                            }}
                          >
                            .{ext}
                          </span>
                        </td>
                        <td>{sizeKb} KB</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => removeFile(index)}
                            style={{ fontSize: "0.8rem", padding: "2px 8px" }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import button */}
        <div className="metrics-form-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={importing || files.length === 0}
          >
            {importing
              ? "⏳ Importovanje..."
              : `⬆️ Importuj ${files.length > 0 ? `(${files.length} fajl${files.length > 1 ? "ova" : ""})` : ""}`}
          </button>
        </div>
      </Card>

      {/* Import results */}
      {result && (
        <Card>
          <h3>📊 Rezultat importa</h3>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                padding: "0.75rem 1.25rem",
                borderRadius: "var(--radius-md, 8px)",
                background: "var(--success-bg, #dcfce7)",
                color: "var(--success-text, #166534)",
                fontWeight: 600,
              }}
            >
              ✅ Uspešno: {result.imported_count}
            </div>
            {result.error_count > 0 && (
              <div
                style={{
                  padding: "0.75rem 1.25rem",
                  borderRadius: "var(--radius-md, 8px)",
                  background: "var(--danger-bg, #fee2e2)",
                  color: "var(--danger-text, #991b1b)",
                  fontWeight: 600,
                }}
              >
                ❌ Greške: {result.error_count}
              </div>
            )}
          </div>

          {/* Imported activities */}
          {result.imported && result.imported.length > 0 && (
            <>
              <h4 style={{ marginBottom: "0.5rem" }}>Importovane aktivnosti</h4>
              <div className="results-table-wrapper">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Fajl</th>
                      <th>Naziv</th>
                      <th>Distanca</th>
                      <th>Vreme</th>
                      <th>Splitovi</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.imported.map((item) => (
                      <tr key={item.id}>
                        <td>{item.file}</td>
                        <td>{item.name}</td>
                        <td>{formatDistance(item.distance_meters)}</td>
                        <td>{formatDuration(item.duration_seconds)}</td>
                        <td>{item.splits_count}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => navigate(`/activity/${item.id}`)}
                            style={{ fontSize: "0.8rem" }}
                          >
                            Prikaži
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Errors */}
          {result.errors && result.errors.length > 0 && (
            <>
              <h4
                style={{
                  marginTop: "1rem",
                  marginBottom: "0.5rem",
                  color: "var(--danger-text, #991b1b)",
                }}
              >
                Greške pri importu
              </h4>
              <div className="results-table-wrapper">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Fajl</th>
                      <th>Greška</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.file}</td>
                        <td style={{ color: "var(--danger-text, #991b1b)" }}>
                          {item.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Instructions card */}
      <Card>
        <h3>ℹ️ Kako eksportovati iz fajl aplikacije</h3>
        <div style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          <p>
            <strong>FIT fajlovi:</strong>
          </p>
          <ol style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
            <li>Otvorite aplikaciju na telefonu</li>
            <li>Izaberite željenu aktivnost</li>
            <li>
              Tapnite na ⋯ (tri tačke) → <strong>Export original</strong>
            </li>
            <li>
              Izaberite <strong>FIT</strong> format
            </li>
            <li>Sačuvajte fajl i uploadujte ga ovde</li>
          </ol>
          <p>
            <strong>Tip:</strong> Možete uploadovati više fajlova odjednom. Svi
            podaci (distanca, vreme, HR, splitovi, elevacija, kadenca…) će biti
            automatski mapirani u vaš profil.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default ImportActivityPage;
