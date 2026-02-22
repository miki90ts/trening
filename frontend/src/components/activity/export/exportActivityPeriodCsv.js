const formatDuration = (seconds) => {
  const total = Math.max(0, parseInt(seconds || 0, 10));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  if (hh > 0) {
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const formatPace = (secondsPerKm) => {
  const pace = parseFloat(secondsPerKm);
  if (!Number.isFinite(pace) || pace <= 0) return "";
  const minutes = Math.floor(pace / 60);
  const seconds = Math.round(pace % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
};

const formatDistanceKm = (meters) =>
  (parseFloat(meters || 0) / 1000).toFixed(2);

const escapeCsv = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const downloadCsv = (filename, rows) => {
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export function exportActivityPeriodCsv({
  periodLabel,
  summary,
  rows,
  byType,
}) {
  const headerSummary = ["Sekcija", "Polje", "Vrednost"];
  const summaryRows = [
    ["summary", "period", periodLabel || ""],
    [
      "summary",
      "total_activities",
      parseInt(summary?.total_activities || 0, 10),
    ],
    [
      "summary",
      "total_distance_meters",
      parseInt(summary?.total_distance_meters || 0, 10),
    ],
    [
      "summary",
      "total_distance_km",
      formatDistanceKm(summary?.total_distance_meters || 0),
    ],
    [
      "summary",
      "total_duration_seconds",
      parseInt(summary?.total_duration_seconds || 0, 10),
    ],
    [
      "summary",
      "total_duration_hms",
      formatDuration(summary?.total_duration_seconds || 0),
    ],
    [
      "summary",
      "avg_pace_seconds_per_km",
      summary?.avg_pace_seconds_per_km ?? "",
    ],
    ["summary", "avg_pace", formatPace(summary?.avg_pace_seconds_per_km)],
    [
      "summary",
      "total_ascent_meters",
      parseInt(summary?.total_ascent_meters || 0, 10),
    ],
    ["summary", "total_calories", parseInt(summary?.total_calories || 0, 10)],
  ];

  const dailyHeader = [
    "Sekcija",
    "Dan",
    "Distanca_m",
    "Distanca_km",
    "Vreme_sec",
    "Vreme_hms",
    "Avg_pace_sec_km",
    "Avg_pace",
    "Ascent_m",
    "Aktivnosti",
  ];

  const dailyRows = (rows || []).map((row) => [
    "day",
    row.bucket_key,
    parseInt(row.total_distance_meters || 0, 10),
    formatDistanceKm(row.total_distance_meters),
    parseInt(row.total_duration_seconds || 0, 10),
    formatDuration(row.total_duration_seconds),
    row.avg_pace_seconds_per_km ?? "",
    formatPace(row.avg_pace_seconds_per_km),
    parseInt(row.total_ascent_meters || 0, 10),
    parseInt(row.activity_count || 0, 10),
  ]);

  const byTypeHeader = [
    "Sekcija",
    "Tip",
    "Aktivnosti",
    "Distanca_m",
    "Distanca_km",
    "Vreme_sec",
    "Vreme_hms",
    "Avg_pace_sec_km",
    "Avg_pace",
  ];

  const byTypeRows = (byType || []).map((row) => [
    "type",
    row.activity_type_name,
    parseInt(row.activity_count || 0, 10),
    parseInt(row.total_distance_meters || 0, 10),
    formatDistanceKm(row.total_distance_meters),
    parseInt(row.total_duration_seconds || 0, 10),
    formatDuration(row.total_duration_seconds),
    row.avg_pace_seconds_per_km ?? "",
    formatPace(row.avg_pace_seconds_per_km),
  ]);

  const fullRows = [
    headerSummary,
    ...summaryRows,
    [],
    dailyHeader,
    ...dailyRows,
    [],
    byTypeHeader,
    ...byTypeRows,
  ];

  downloadCsv(
    `activity-period-${new Date().toISOString().slice(0, 10)}.csv`,
    fullRows,
  );
}
