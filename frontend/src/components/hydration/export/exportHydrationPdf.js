import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMl } from "../hydrationUtils";

export function exportHydrationPdf({
  summary,
  periodStats,
  records,
  streak,
  rows,
  periodLabel,
}) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Hidratacija - Pracenje unosa tecnosti", 14, 18);
  doc.setFontSize(10);
  doc.text(`Datum izvoza: ${new Date().toLocaleString("sr-RS")}`, 14, 24);
  doc.text(`Period: ${periodLabel}`, 14, 30);

  // Summary KPI
  autoTable(doc, {
    startY: 36,
    head: [["KPI", "Vrednost"]],
    body: [
      ["Ukupno (ml)", summary?.total_ml?.toLocaleString("sr-RS") || "-"],
      [
        "Ukupno (L)",
        summary?.total_ml ? `${(summary.total_ml / 1000).toFixed(1)} L` : "-",
      ],
      ["Prosecno dnevno", summary?.avg_ml ? `${summary.avg_ml} ml` : "-"],
      [
        "Maksimum u danu",
        summary?.max_day_ml ? `${summary.max_day_ml} ml` : "-",
      ],
      [
        "Dani sa ispunjenim ciljem",
        `${summary?.days_goal_met || 0}/${summary?.total_days || 0}`,
      ],
      ["Trenutni streak", streak ? `${streak.current_streak} dana` : "-"],
      ["Najduzi streak", streak ? `${streak.longest_streak} dana` : "-"],
    ],
    theme: "grid",
  });

  // Records
  if (records) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Rekord", "Vrednost", "Period"]],
      body: [
        [
          "Najvise u danu",
          records.daily?.total_ml ? `${records.daily.total_ml} ml` : "-",
          records.daily?.entry_date
            ? new Date(records.daily.entry_date).toLocaleDateString("sr-RS")
            : "-",
        ],
        [
          "Najvise u nedelji",
          records.weekly?.total_ml
            ? `${(records.weekly.total_ml / 1000).toFixed(1)} L`
            : "-",
          records.weekly
            ? `${new Date(records.weekly.week_start).toLocaleDateString("sr-RS")} - ${new Date(records.weekly.week_end).toLocaleDateString("sr-RS")}`
            : "-",
        ],
        [
          "Najvise u mesecu",
          records.monthly?.total_ml
            ? `${(records.monthly.total_ml / 1000).toFixed(1)} L`
            : "-",
          records.monthly?.month_key || "-",
        ],
        [
          "Najvise u godini",
          records.yearly?.total_ml
            ? `${(records.yearly.total_ml / 1000).toFixed(1)} L`
            : "-",
          records.yearly?.year_key ? `${records.yearly.year_key}` : "-",
        ],
        [
          "Prosecno dnevno (svi)",
          records.avg_daily ? `${records.avg_daily} ml` : "-",
          `${records.total_days_tracked} dana ukupno`,
        ],
      ],
      theme: "grid",
    });
  }

  // Drink type breakdown
  if (summary?.type_breakdown && summary.type_breakdown.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Tip pica", "Ukupno (ml)", "Broj unosa"]],
      body: summary.type_breakdown.map((t) => [
        t.drink_type,
        parseInt(t.total_ml).toLocaleString("sr-RS"),
        t.count,
      ]),
      theme: "striped",
    });
  }

  // Period daily data
  if (periodStats?.data && periodStats.data.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Datum", "Ukupno (ml)", "Cilj (ml)", "Status", "Br. unosa"]],
      body: periodStats.data.map((row) => [
        new Date(row.bucket_key).toLocaleDateString("sr-RS"),
        parseInt(row.total_ml).toLocaleString("sr-RS"),
        parseInt(row.goal_ml).toLocaleString("sr-RS"),
        parseInt(row.total_ml) >= parseInt(row.goal_ml) ? "Da" : "Ne",
        row.entry_count,
      ]),
      theme: "striped",
    });
  }

  // Full entries
  if (rows && rows.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Datum", "Kolicina (ml)", "Tip", "Napomena"]],
      body: rows
        .slice(0, 300)
        .map((row) => [
          new Date(row.entry_date).toLocaleDateString("sr-RS"),
          parseInt(row.amount_ml).toLocaleString("sr-RS"),
          row.drink_type || "water",
          row.notes || "",
        ]),
      theme: "grid",
    });
  }

  doc.save(`hydration-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
