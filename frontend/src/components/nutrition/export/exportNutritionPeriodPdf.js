import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function exportNutritionPeriodPdf({
  summary,
  periodStats,
  topFoods,
  metricLabel,
}) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Nutrition pregled", 14, 18);

  doc.setFontSize(10);
  doc.text(`Datum izvoza: ${new Date().toLocaleString("sr-RS")}`, 14, 24);
  doc.text(`Metrika: ${metricLabel}`, 14, 30);

  const totals = summary?.totals || {};
  const today = summary?.today || {};

  autoTable(doc, {
    startY: 36,
    head: [["Sekcija", "Kalorije", "Proteini", "UH", "Masti"]],
    body: [
      [
        "Ukupno",
        Math.round(parseFloat(totals.total_kcal || 0)),
        Math.round(parseFloat(totals.total_protein || 0)),
        Math.round(parseFloat(totals.total_carbs || 0)),
        Math.round(parseFloat(totals.total_fat || 0)),
      ],
      [
        "Danas",
        Math.round(parseFloat(today.total_kcal || 0)),
        Math.round(parseFloat(today.total_protein || 0)),
        Math.round(parseFloat(today.total_carbs || 0)),
        Math.round(parseFloat(today.total_fat || 0)),
      ],
    ],
    theme: "grid",
  });

  const startY = doc.lastAutoTable.finalY + 8;

  const periodRows = (periodStats?.data || []).map((row) => [
    row.bucket_key,
    Math.round(parseFloat(row.total_kcal || 0)),
    Math.round(parseFloat(row.total_protein || 0)),
    Math.round(parseFloat(row.total_carbs || 0)),
    Math.round(parseFloat(row.total_fat || 0)),
  ]);

  autoTable(doc, {
    startY,
    head: [["Period", "Kcal", "Proteini", "UH", "Masti"]],
    body: periodRows,
    theme: "striped",
  });

  const foodsStartY = doc.lastAutoTable.finalY + 8;
  const foodRows = (topFoods || [])
    .slice(0, 15)
    .map((row) => [
      row.item_name,
      row.occurrences,
      Math.round(parseFloat(row.total_kcal || 0)),
    ]);

  autoTable(doc, {
    startY: foodsStartY,
    head: [["Top namirnica", "Puta uneseno", "Kcal"]],
    body: foodRows,
    theme: "grid",
  });

  doc.save(`nutrition-period-${new Date().toISOString().slice(0, 10)}.pdf`);
}
