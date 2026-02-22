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

export function exportActivityDetailPdf({ activity, virtualKmRows = [] }) {
  if (!activity) return;

  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Activity detalji", 14, 18);
  doc.setFontSize(10);
  doc.text(`Datum izvoza: ${new Date().toLocaleString("sr-RS")}`, 14, 24);

  autoTable(doc, {
    startY: 30,
    head: [["Polje", "Vrednost"]],
    body: [
      ["Naziv", activity.name || "-"],
      ["Tip", activity.activity_type_name || "-"],
      [
        "Datum",
        activity.performed_at
          ? new Date(activity.performed_at).toLocaleString("sr-RS")
          : "-",
      ],
      ["Distanca", `${formatDistanceKm(activity.distance_meters)} km`],
      ["Vreme", formatDuration(activity.duration_seconds)],
      ["Pace", formatPace(activity.avg_pace_seconds_per_km)],
      ["Avg HR", activity.avg_heart_rate ?? "-"],
      ["Ascent", `${activity.ascent_meters ?? 0} m`],
      ["Opis", activity.description || "-"],
    ],
    theme: "grid",
  });

  const splitRows = (activity.splits || []).map((split) => [
    split.split_order,
    split.label || "-",
    `${formatDistanceKm(split.distance_meters)} km`,
    formatDuration(split.duration_seconds),
    formatPace(split.avg_pace_seconds_per_km),
  ]);

  if (splitRows.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["#", "Label", "Distanca", "Vreme", "Pace"]],
      body: splitRows,
      theme: "striped",
    });
  }

  const virtualRows = (virtualKmRows || []).map((row) => [
    row.km_label,
    `${formatDistanceKm(row.distance_meters)} km`,
    formatDuration(row.duration_seconds),
    formatPace(row.avg_pace_seconds_per_km),
  ]);

  if (virtualRows.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Virtual km", "Distanca", "Vreme", "Pace"]],
      body: virtualRows,
      theme: "grid",
    });

    doc.setFontSize(9);
    doc.text(
      "Virtualni km pace je simulacija iz splitova. * oznacava parcijalni km.",
      14,
      doc.lastAutoTable.finalY + 6,
    );
  }

  const safeName = String(activity.name || "activity")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  doc.save(
    `activity-detail-${safeName || "export"}-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}
