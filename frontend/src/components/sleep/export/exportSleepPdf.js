import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toYmd, formatDuration, formatQuality } from "../sleepUtils";

export function exportSleepPdf({ summary, periodStats, records, streak, rows, periodLabel }) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Sleep - Pregled spavanja", 14, 18);
  doc.setFontSize(10);
  doc.text(`Datum izvoza: ${new Date().toLocaleString("sr-RS")}`, 14, 24);
  doc.text(`Period: ${periodLabel}`, 14, 30);

  // Summary KPI
  autoTable(doc, {
    startY: 36,
    head: [["KPI", "Vrednost"]],
    body: [
      ["Prosecno spavanja", formatDuration(summary?.avg_duration)],
      ["Prosecni kvalitet", formatQuality(summary?.avg_quality)],
      ["Prosecni HR", summary?.avg_hr ? `${summary.avg_hr} bpm` : "-"],
      ["Prosecni HRV", summary?.avg_hrv ? `${summary.avg_hrv} ms` : "-"],
      ["Cilj ispunjen", `${summary?.days_target_met || 0}/${summary?.total_days || 0} dana`],
      ["Prosecno deep", formatDuration(summary?.avg_deep)],
      ["Prosecno REM", formatDuration(summary?.avg_rem)],
      ["Prosecno light", formatDuration(summary?.avg_light)],
    ],
    theme: "grid",
  });

  // Records
  if (records) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Rekord", "Vrednost", "Datum"]],
      body: [
        ["Najduze spavanje", formatDuration(records.longest_sleep?.duration_min), records.longest_sleep?.sleep_date || "-"],
        ["Najbolji kvalitet", formatQuality(records.best_quality?.sleep_quality), records.best_quality?.sleep_date || "-"],
        ["Najnizi HR", records.lowest_hr?.min_hr ? `${records.lowest_hr.min_hr} bpm` : "-", records.lowest_hr?.sleep_date || "-"],
        ["Najbolji HRV", records.best_hrv?.avg_hrv ? `${records.best_hrv.avg_hrv} ms` : "-", records.best_hrv?.sleep_date || "-"],
        ["Najvise deep", formatDuration(records.most_deep?.deep_min), records.most_deep?.sleep_date || "-"],
        ["Najvise REM", formatDuration(records.most_rem?.rem_min), records.most_rem?.sleep_date || "-"],
      ],
      theme: "grid",
    });
  }

  // Streak
  if (streak) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Streak", "Vrednost"]],
      body: [
        ["Trenutni streak", `${streak.current_streak} noci`],
        ["Najduzi streak", `${streak.longest_streak} noci`],
        ["Ukupno sa ciljem", `${streak.total_target_days} noci`],
      ],
      theme: "grid",
    });
  }

  // Period data
  if (periodStats?.data?.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Datum", "Trajanje", "Cilj", "Kvalitet", "HR", "HRV"]],
      body: periodStats.data.map((row) => [
        new Date(`${toYmd(row.bucket_key)}T00:00:00`).toLocaleDateString("sr-RS"),
        formatDuration(row.duration_min),
        formatDuration(row.target_min),
        formatQuality(row.sleep_quality),
        row.avg_hr ? `${row.avg_hr} bpm` : "-",
        row.avg_hrv ? `${row.avg_hrv} ms` : "-",
      ]),
      theme: "striped",
    });
  }

  // Full entries
  if (rows && rows.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Datum", "Lezanje", "Budjenje", "Trajanje", "Kvalitet", "Napomena"]],
      body: rows.slice(0, 200).map((row) => [
        new Date(`${toYmd(row.sleep_date)}T00:00:00`).toLocaleDateString("sr-RS"),
        row.bedtime ? row.bedtime.slice(0, 5) : "-",
        row.wake_time ? row.wake_time.slice(0, 5) : "-",
        formatDuration(row.duration_min),
        formatQuality(row.sleep_quality),
        row.notes || "",
      ]),
      theme: "grid",
    });
  }

  doc.save(`sleep-report-${toYmd(new Date())}.pdf`);
}
