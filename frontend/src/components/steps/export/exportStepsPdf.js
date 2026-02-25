import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function exportStepsPdf({ summary, periodStats, records, rows, periodLabel }) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Steps - Pregled koraka", 14, 18);
  doc.setFontSize(10);
  doc.text(`Datum izvoza: ${new Date().toLocaleString("sr-RS")}`, 14, 24);
  doc.text(`Period: ${periodLabel}`, 14, 30);

  // Summary KPI
  autoTable(doc, {
    startY: 36,
    head: [["KPI", "Vrednost"]],
    body: [
      ["Ukupno koraka", summary?.total_steps?.toLocaleString("sr-RS") || "-"],
      ["Prosečno dnevno", summary?.avg_steps?.toLocaleString("sr-RS") || "-"],
      ["Maksimum u danu", summary?.max_steps_day?.toLocaleString("sr-RS") || "-"],
      ["Dani sa ispunjenim ciljem", `${summary?.days_goal_met || 0}/${summary?.total_days || 0}`],
      ["Ukupno pređeno", summary?.total_meters ? `${(summary.total_meters / 1000).toFixed(1)} km` : "-"],
      ["Prosečno dnevno (km)", summary?.avg_meters ? `${(summary.avg_meters / 1000).toFixed(1)} km` : "-"],
    ],
    theme: "grid",
  });

  // Records
  if (records) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Rekord", "Vrednost", "Period"]],
      body: [
        ["Najviše u danu", records.daily?.step_count?.toLocaleString("sr-RS") || "-", records.daily?.step_date || "-"],
        ["Najviše u nedelji", records.weekly?.total?.toLocaleString("sr-RS") || "-",
          records.weekly ? `${records.weekly.week_start} - ${records.weekly.week_end}` : "-"],
        ["Najviše u mesecu", records.monthly?.total?.toLocaleString("sr-RS") || "-", records.monthly?.month_key || "-"],
        ["Najviše u godini", records.yearly?.total?.toLocaleString("sr-RS") || "-",
          records.yearly?.year_key ? `${records.yearly.year_key}` : "-"],
        ["Prosečno dnevno (svi)", records.avg_daily?.toLocaleString("sr-RS") || "-",
          `${records.total_days_tracked} dana ukupno`],
      ],
      theme: "grid",
    });
  }

  // Period daily data
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Datum", "Koraci", "Cilj", "Status", "Rastojanje"]],
    body: (periodStats?.data || []).map((row) => [
      new Date(row.bucket_key).toLocaleDateString("sr-RS"),
      parseInt(row.step_count).toLocaleString("sr-RS"),
      parseInt(row.goal).toLocaleString("sr-RS"),
      parseInt(row.step_count) >= parseInt(row.goal) ? "Da" : "Ne",
      `${((parseInt(row.step_count) * 0.75) / 1000).toFixed(1)} km`,
    ]),
    theme: "striped",
  });

  // Full entries
  if (rows && rows.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Datum", "Koraci", "Cilj", "Napomena"]],
      body: rows.slice(0, 200).map((row) => [
        new Date(row.step_date).toLocaleDateString("sr-RS"),
        parseInt(row.step_count).toLocaleString("sr-RS"),
        parseInt(row.goal).toLocaleString("sr-RS"),
        row.notes || "",
      ]),
      theme: "grid",
    });
  }

  doc.save(`steps-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
