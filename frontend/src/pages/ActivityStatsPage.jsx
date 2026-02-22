import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
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
import { exportActivityPeriodPdf } from "../components/activity/export/exportActivityPeriodPdf";
import { exportActivityPeriodCsv } from "../components/activity/export/exportActivityPeriodCsv";
import {
  formatDistanceKm,
  formatDuration,
  formatPace,
  formatPeriodLabel,
  shiftAnchor,
  toYmd,
} from "../components/activity/activityUtils";

function ActivityStatsPage() {
  const navigate = useNavigate();
  const {
    periodStats,
    summary,
    loadingPeriodStats,
    loadPeriodStats,
    loadPeriodExportData,
    loadSummary,
  } = useActivity();

  const [granularity, setGranularity] = useState("week");
  const [anchor, setAnchor] = useState(toYmd(new Date()));
  const [periodExportLoading, setPeriodExportLoading] = useState(false);

  const periodLabel = useMemo(
    () => formatPeriodLabel(granularity, anchor),
    [granularity, anchor],
  );

  useEffect(() => {
    const loadInitial = async () => {
      try {
        await loadSummary();
      } catch (err) {
        toast.error(err.response?.data?.error || err.message);
      }
    };
    loadInitial();
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        await loadPeriodStats({ granularity, anchor });
      } catch (err) {
        toast.error(err.response?.data?.error || err.message);
      }
    };
    loadStats();
  }, [granularity, anchor]);

  const chartData = useMemo(
    () =>
      (periodStats?.data || []).map((row) => ({
        label: new Date(`${row.bucket_key}T00:00:00`).toLocaleDateString(
          "sr-RS",
          {
            day: "2-digit",
            month: "2-digit",
          },
        ),
        distanceKm: parseFloat(row.total_distance_meters || 0) / 1000,
      })),
    [periodStats],
  );

  const periodSummary = periodStats?.summary || {};

  const withServerPeriodExportData = async (onReady) => {
    setPeriodExportLoading(true);
    try {
      const payload = await loadPeriodExportData({ granularity, anchor });
      onReady(payload);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setPeriodExportLoading(false);
    }
  };

  const handleExportPdf = () => {
    withServerPeriodExportData((payload) => {
      exportActivityPeriodPdf({
        periodLabel: payload?.period_label || periodLabel,
        summary: payload?.summary || {},
        rows: payload?.data || [],
        byType: payload?.by_type || [],
      });
    });
  };

  const handleExportPeriodCsv = () => {
    withServerPeriodExportData((payload) => {
      exportActivityPeriodCsv({
        periodLabel: payload?.period_label || periodLabel,
        summary: payload?.summary || {},
        rows: payload?.data || [],
        byType: payload?.by_type || [],
      });
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📈 Activity Stats</h1>
          <p className="page-subtitle">
            Grafikon i statistika po tipu aktivnosti
          </p>
        </div>
        <div className="metrics-header-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate("/activity")}
          >
            Nazad na listu
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportPdf}
            disabled={periodExportLoading}
          >
            {periodExportLoading
              ? "Priprema exporta..."
              : "Export perioda (PDF)"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportPeriodCsv}
            disabled={periodExportLoading}
          >
            {periodExportLoading
              ? "Priprema exporta..."
              : "Export perioda (CSV)"}
          </button>
        </div>
      </div>

      <div className="cards-grid stats-grid">
        <Card>
          <h4>Ukupna distanca (all-time)</h4>
          <p>{formatDistanceKm(summary?.total_distance_meters)} km</p>
        </Card>
        <Card>
          <h4>Ukupno vreme (all-time)</h4>
          <p>{formatDuration(summary?.total_duration_seconds)}</p>
        </Card>
        <Card>
          <h4>Avg pace (period)</h4>
          <p>{formatPace(periodSummary.avg_pace_seconds_per_km)}</p>
        </Card>
        <Card>
          <h4>Aktivnosti (period)</h4>
          <p>{parseInt(periodSummary.total_activities || 0, 10)}</p>
        </Card>
      </div>

      <Card>
        <div className="analytics-period-controls">
          <div className="analytics-period-toggle">
            <button
              type="button"
              className={`analytics-period-btn ${granularity === "week" ? "active" : ""}`}
              onClick={() => setGranularity("week")}
            >
              Nedelja
            </button>
            <button
              type="button"
              className={`analytics-period-btn ${granularity === "month" ? "active" : ""}`}
              onClick={() => setGranularity("month")}
            >
              Mesec
            </button>
          </div>

          <div className="analytics-period-nav">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() =>
                setAnchor((prev) => shiftAnchor(prev, granularity, -1))
              }
            >
              <FiChevronLeft /> Nazad
            </button>
            <span className="analytics-period-label">
              Period: {periodLabel}
            </span>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() =>
                setAnchor((prev) => shiftAnchor(prev, granularity, 1))
              }
            >
              Napred <FiChevronRight />
            </button>
          </div>
        </div>
      </Card>

      <Card className="chart-card">
        <h3>Pređena distanca kroz period</h3>
        {chartData.length === 0 ? (
          <p className="empty-state-small">Nema podataka za prikaz.</p>
        ) : (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                />
                <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [
                    `${Number(value).toFixed(2)} km`,
                    "Distanca",
                  ]}
                />
                <Line
                  dataKey="distanceKm"
                  stroke="var(--accent-primary)"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card>
        <h3>Po tipu aktivnosti (period)</h3>
        {(periodStats?.by_type || []).length === 0 ? (
          <p className="empty-state-small">Nema podataka za prikaz.</p>
        ) : (
          <div className="results-table-wrapper">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Tip</th>
                  <th>Aktivnosti</th>
                  <th>Distanca</th>
                  <th>Vreme</th>
                  <th>Avg pace</th>
                </tr>
              </thead>
              <tbody>
                {periodStats.by_type.map((row) => (
                  <tr key={row.activity_type_id}>
                    <td>{row.activity_type_name}</td>
                    <td>{row.activity_count}</td>
                    <td>{formatDistanceKm(row.total_distance_meters)} km</td>
                    <td>{formatDuration(row.total_duration_seconds)}</td>
                    <td>{formatPace(row.avg_pace_seconds_per_km)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {loadingPeriodStats && (
        <p className="empty-state-small">Učitavanje activity statistike...</p>
      )}
    </div>
  );
}

export default ActivityStatsPage;
