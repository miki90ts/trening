import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function exportMetricsPeriodPdf({
  summary,
  periodStats,
  rows,
  periodLabel,
}) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Metrics - Pregled kilaže", 14, 18);

  doc.setFontSize(10);
  doc.text(`Datum izvoza: ${new Date().toLocaleString("sr-RS")}`, 14, 24);
  doc.text(`Period: ${periodLabel}`, 14, 30);

  autoTable(doc, {
    startY: 36,
    head: [["KPI", "Vrednost"]],
    body: [
      [
        "Trenutna kilaža",
        summary?.current_weight
          ? `${parseFloat(summary.current_weight).toFixed(2)} kg`
          : "-",
      ],
      [
        "Početna kilaža perioda",
        summary?.baseline_weight
          ? `${parseFloat(summary.baseline_weight).toFixed(2)} kg`
          : "-",
      ],
      [
        "Promena (kg)",
        Number.isFinite(parseFloat(summary?.difference_kg))
          ? `${parseFloat(summary.difference_kg).toFixed(2)} kg`
          : "-",
      ],
      [
        "Promena (%)",
        Number.isFinite(parseFloat(summary?.difference_percent))
          ? `${parseFloat(summary.difference_percent).toFixed(2)}%`
          : "-",
      ],
      [
        "Prosek perioda",
        summary?.period_avg_weight
          ? `${parseFloat(summary.period_avg_weight).toFixed(2)} kg`
          : "-",
      ],
      ["Broj merenja", `${summary?.total_entries || 0}`],
    ],
    theme: "grid",
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Datum", "Dnevni prosek (kg)", "Broj merenja"]],
    body: (periodStats?.data || []).map((row) => [
      new Date(row.bucket_key).toLocaleDateString("sr-RS"),
      Number.isFinite(parseFloat(row.avg_weight))
        ? parseFloat(row.avg_weight).toFixed(2)
        : "-",
      row.entry_count || 0,
    ]),
    theme: "striped",
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Datum", "Vreme", "Kilaža (kg)", "Napomena"]],
    body: (rows || []).slice(0, 200).map((row) => {
      const date = new Date(row.metric_datetime);
      return [
        date.toLocaleDateString("sr-RS"),
        date.toLocaleTimeString("sr-RS", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        parseFloat(row.weight_kg || 0).toFixed(2),
        row.notes || "",
      ];
    }),
    theme: "grid",
  });

  doc.save(`metrics-period-${new Date().toISOString().slice(0, 10)}.pdf`);
}
