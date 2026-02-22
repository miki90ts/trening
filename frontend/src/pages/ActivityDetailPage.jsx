import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import Card from "../components/common/Card";
import { useActivity } from "../context/ActivityContext";
import { exportActivityDetailPdf } from "../components/activity/export/exportActivityDetailPdf";
import { exportActivityDetailCsv } from "../components/activity/export/exportActivityDetailCsv";
import {
  formatDistanceKm,
  formatDuration,
  formatPace,
} from "../components/activity/activityUtils";

function ActivityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loadActivityExportData } = useActivity();

  const [activity, setActivity] = useState(null);
  const [virtualKmRows, setVirtualKmRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const payload = await loadActivityExportData(id);
        setActivity(payload?.activity || null);
        setVirtualKmRows(payload?.virtual_km_rows || []);
      } catch (err) {
        toast.error(err.response?.data?.error || err.message);
        navigate("/activity");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const virtualKmChartData = useMemo(
    () =>
      virtualKmRows.map((row) => ({
        label: row.km_label,
        paceSec: parseFloat(row.avg_pace_seconds_per_km || 0),
      })),
    [virtualKmRows],
  );

  const refreshAndExport = async (handler) => {
    setExportLoading(true);
    try {
      const payload = await loadActivityExportData(id);
      const nextActivity = payload?.activity || activity;
      const nextVirtualRows = payload?.virtual_km_rows || [];
      setActivity(nextActivity);
      setVirtualKmRows(nextVirtualRows);
      handler(nextActivity, nextVirtualRows);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p className="empty-state-small">Učitavanje detalja aktivnosti...</p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="page">
        <p className="empty-state-small">Nema detalja za prikaz.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Detalji aktivnosti</h1>
          <p className="page-subtitle">
            Pregled aktivnosti, splitova i virtualnog pace-a po kilometru.
          </p>
        </div>
        <div className="metrics-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              refreshAndExport((nextActivity, nextVirtualRows) => {
                exportActivityDetailPdf({
                  activity: nextActivity,
                  virtualKmRows: nextVirtualRows,
                });
              })
            }
            disabled={exportLoading}
          >
            {exportLoading
              ? "Priprema exporta..."
              : "Export detalja aktivnosti (PDF)"}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() =>
              refreshAndExport((nextActivity, nextVirtualRows) => {
                exportActivityDetailCsv({
                  activity: nextActivity,
                  virtualKmRows: nextVirtualRows,
                });
              })
            }
            disabled={exportLoading}
          >
            {exportLoading
              ? "Priprema exporta..."
              : "Export detalja aktivnosti (CSV)"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(`/activity/${activity.id}/edit`)}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate("/activity")}
          >
            Nazad
          </button>
        </div>
      </div>

      <Card>
        <div className="form-grid two-cols">
          <div>
            <strong>Naziv:</strong> {activity.name}
          </div>
          <div>
            <strong>Tip:</strong> {activity.activity_type_name}
          </div>
          <div>
            <strong>Datum:</strong>{" "}
            {new Date(activity.performed_at).toLocaleString("sr-RS")}
          </div>
          <div>
            <strong>Distanca:</strong>{" "}
            {formatDistanceKm(activity.distance_meters)} km
          </div>
          <div>
            <strong>Vreme:</strong> {formatDuration(activity.duration_seconds)}
          </div>
          <div>
            <strong>Pace:</strong>{" "}
            {formatPace(activity.avg_pace_seconds_per_km)}
          </div>
          <div>
            <strong>Avg HR:</strong> {activity.avg_heart_rate ?? "-"}
          </div>
          <div>
            <strong>Ascent:</strong> {activity.ascent_meters ?? 0} m
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <strong>Opis:</strong> {activity.description || "-"}
          </div>
        </div>
      </Card>

      <Card>
        <h3>Splitovi</h3>
        {(activity.splits || []).length === 0 ? (
          <p className="empty-state-small">Nema splitova.</p>
        ) : (
          <div className="results-table-wrapper">
            <table className="results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Label</th>
                  <th>Distanca</th>
                  <th>Vreme</th>
                  <th>Pace</th>
                </tr>
              </thead>
              <tbody>
                {activity.splits.map((split) => (
                  <tr
                    key={
                      split.id ||
                      `${split.split_order}-${split.label || "split"}`
                    }
                  >
                    <td>{split.split_order}</td>
                    <td>{split.label || "-"}</td>
                    <td>{formatDistanceKm(split.distance_meters)} km</td>
                    <td>{formatDuration(split.duration_seconds)}</td>
                    <td>{formatPace(split.avg_pace_seconds_per_km)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h3>Virtualni pace po km (simulacija)</h3>
        {virtualKmRows.length === 0 ? (
          <p className="empty-state-small">
            Nije moguće izračunati km breakdown bez splitova.
          </p>
        ) : (
          <>
            <div className="chart-wrapper" style={{ marginBottom: "12px" }}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={virtualKmChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-color)"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [formatPace(value), "Pace"]}
                    labelFormatter={(label) => `Km: ${label}`}
                  />
                  <Line
                    dataKey="paceSec"
                    stroke="var(--accent-primary)"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="results-table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Km</th>
                    <th>Distanca</th>
                    <th>Vreme</th>
                    <th>Pace</th>
                  </tr>
                </thead>
                <tbody>
                  {virtualKmRows.map((row) => (
                    <tr key={row.km_label}>
                      <td>{row.km_label}</td>
                      <td>{formatDistanceKm(row.distance_meters)} km</td>
                      <td>{formatDuration(row.duration_seconds)}</td>
                      <td>{formatPace(row.avg_pace_seconds_per_km)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="empty-state-small">
              * Poslednji red sa zvezdicom je parcijalni kilometar.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}

export default ActivityDetailPage;
