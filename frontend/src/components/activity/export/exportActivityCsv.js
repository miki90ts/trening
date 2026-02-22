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

const formatPace = (pace) => {
  const value = parseFloat(pace);
  if (!Number.isFinite(value) || value <= 0) return "";
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
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

export function exportActivityCsv(rows = []) {
  const header = [
    "ID",
    "Naziv",
    "Tip",
    "Datum",
    "Distanca_m",
    "Distanca_km",
    "Vreme_sec",
    "Vreme_hms",
    "Avg_pace_sec_km",
    "Avg_pace",
    "Avg_HR",
    "Ascent_m",
    "Descent_m",
    "Kalorije",
    "Splitovi",
  ];

  const body = rows.map((row) => [
    row.id,
    row.name,
    row.activity_type_name,
    row.performed_at,
    row.distance_meters,
    (parseFloat(row.distance_meters || 0) / 1000).toFixed(2),
    row.duration_seconds,
    formatDuration(row.duration_seconds),
    row.avg_pace_seconds_per_km,
    formatPace(row.avg_pace_seconds_per_km),
    row.avg_heart_rate ?? "",
    row.ascent_meters ?? "",
    row.descent_meters ?? "",
    row.calories ?? "",
    row.split_count ?? 0,
  ]);

  const csv = [header, ...body]
    .map((line) => line.map(escapeCsv).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `activities-${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
