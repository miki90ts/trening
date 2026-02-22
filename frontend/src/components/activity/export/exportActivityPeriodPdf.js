import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
  if (!Number.isFinite(pace) || pace <= 0) return "-";
  const minutes = Math.floor(pace / 60);
  const seconds = Math.round(pace % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")} /km`;
};

export function exportActivityPeriodPdf({
  periodLabel,
  summary,
  rows,
  byType,
  virtualKmRows,
  virtualKmSourceName,
}) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Activity pregled", 14, 18);
  doc.setFontSize(10);
  doc.text(`Datum izvoza: ${new Date().toLocaleString("sr-RS")}`, 14, 24);
  doc.text(`Period: ${periodLabel}`, 14, 30);

  autoTable(doc, {
    startY: 36,
    head: [
      [
        "Aktivnosti",
        "Distanca (km)",
        "Vreme",
        "Avg pace",
        "Ascent (m)",
        "Kalorije",
      ],
    ],
    body: [
      [
        parseInt(summary?.total_activities || 0, 10),
        formatDistanceKm(summary?.total_distance_meters),
        formatDuration(summary?.total_duration_seconds),
        formatPace(summary?.avg_pace_seconds_per_km),
        parseInt(summary?.total_ascent_meters || 0, 10),
        parseInt(summary?.total_calories || 0, 10),
      ],
    ],
    theme: "grid",
  });

  const tableRows = (rows || []).map((row) => [
    row.bucket_key,
    formatDistanceKm(row.total_distance_meters),
    formatDuration(row.total_duration_seconds),
    formatPace(row.avg_pace_seconds_per_km),
    parseInt(row.total_ascent_meters || 0, 10),
    parseInt(row.activity_count || 0, 10),
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [
      ["Dan", "Dist. (km)", "Vreme", "Avg pace", "Ascent", "Broj aktivnosti"],
    ],
    body: tableRows,
    theme: "striped",
  });

  const byTypeRows = (byType || []).map((row) => [
    row.activity_type_name,
    parseInt(row.activity_count || 0, 10),
    formatDistanceKm(row.total_distance_meters),
    formatDuration(row.total_duration_seconds),
    formatPace(row.avg_pace_seconds_per_km),
  ]);

  if (byTypeRows.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Tip", "Aktivnosti", "Dist. (km)", "Vreme", "Avg pace"]],
      body: byTypeRows,
      theme: "grid",
    });
  }

  const virtualRows = (virtualKmRows || []).map((row) => [
    row.km_label,
    formatDistanceKm(row.distance_meters),
    formatDuration(row.duration_seconds),
    formatPace(row.avg_pace_seconds_per_km),
  ]);

  if (virtualRows.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Virtual km", "Dist. (km)", "Vreme", "Pace"]],
      body: virtualRows,
      theme: "striped",
    });

    doc.setFontSize(9);
    const source = virtualKmSourceName ? ` (${virtualKmSourceName})` : "";
    doc.text(
      `Virtualni km pace je simulacija iz splitova${source}. * oznacava parcijalni km.`,
      14,
      doc.lastAutoTable.finalY + 6,
    );
  }

  doc.save(`activity-period-${new Date().toISOString().slice(0, 10)}.pdf`);
}
