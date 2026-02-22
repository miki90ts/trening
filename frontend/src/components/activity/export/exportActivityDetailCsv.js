const formatDistanceKm = (meters) =>
  (parseFloat(meters || 0) / 1000).toFixed(2);

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

export function exportActivityDetailCsv({ activity, virtualKmRows = [] }) {
  if (!activity) return;

  const safeName = String(activity.name || "activity")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  const summaryRows = [
    ["Sekcija", "Polje", "Vrednost"],
    ["activity", "id", activity.id],
    ["activity", "naziv", activity.name || ""],
    ["activity", "tip", activity.activity_type_name || ""],
    ["activity", "datum", activity.performed_at || ""],
    ["activity", "distanca_m", activity.distance_meters ?? ""],
    ["activity", "distanca_km", formatDistanceKm(activity.distance_meters)],
    ["activity", "vreme_sec", activity.duration_seconds ?? ""],
    ["activity", "vreme_hms", formatDuration(activity.duration_seconds)],
    ["activity", "pace_sec_km", activity.avg_pace_seconds_per_km ?? ""],
    ["activity", "pace", formatPace(activity.avg_pace_seconds_per_km)],
    ["activity", "avg_hr", activity.avg_heart_rate ?? ""],
    ["activity", "ascent_m", activity.ascent_meters ?? ""],
    ["activity", "opis", activity.description || ""],
  ];

  const splitRows = (activity.splits || []).map((split) => [
    "split",
    split.split_order,
    split.label || "",
    split.distance_meters ?? "",
    formatDistanceKm(split.distance_meters),
    split.duration_seconds ?? "",
    formatDuration(split.duration_seconds),
    split.avg_pace_seconds_per_km ?? "",
    formatPace(split.avg_pace_seconds_per_km),
  ]);

  const virtualRows = (virtualKmRows || []).map((row) => [
    "virtual_km",
    row.km_label,
    row.distance_meters ?? "",
    formatDistanceKm(row.distance_meters),
    row.duration_seconds ?? "",
    formatDuration(row.duration_seconds),
    row.avg_pace_seconds_per_km ?? "",
    formatPace(row.avg_pace_seconds_per_km),
  ]);

  const fullRows = [
    ...summaryRows,
    [],
    [
      "Sekcija",
      "Split #",
      "Label",
      "Distanca_m",
      "Distanca_km",
      "Vreme_sec",
      "Vreme_hms",
      "Pace_sec_km",
      "Pace",
    ],
    ...splitRows,
    [],
    [
      "Sekcija",
      "Virtual km",
      "Distanca_m",
      "Distanca_km",
      "Vreme_sec",
      "Vreme_hms",
      "Pace_sec_km",
      "Pace",
    ],
    ...virtualRows,
  ];

  downloadCsv(
    `activity-detail-${safeName || "export"}-${new Date().toISOString().slice(0, 10)}.csv`,
    fullRows,
  );
}
