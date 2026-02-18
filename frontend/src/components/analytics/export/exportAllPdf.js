import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportAllAnalyticsPdf({
  analyticsSummary,
  streak,
  personalRecords,
  periodStats,
  formatScore,
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(20);
  doc.setTextColor(99, 102, 241);
  doc.text("Izvestaj o treningu", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Generisano: ${new Date().toLocaleDateString("sr-RS")}`,
    pageWidth / 2,
    28,
    {
      align: "center",
    },
  );

  let yPos = 40;
  const getNextY = (fallbackY) => {
    const finalY = doc.lastAutoTable?.finalY;
    return (typeof finalY === "number" ? finalY : fallbackY) + 12;
  };

  if (analyticsSummary) {
    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text("Ukupna statistika", 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [["Metrika", "Vrednost"]],
      body: [
        ["Ukupno treninga", String(analyticsSummary.total_workouts)],
        ["Dana treniranja", String(analyticsSummary.total_training_days)],
        ["Ukupno kategorija", String(analyticsSummary.total_categories)],
        [
          "Ukupan volumen",
          `${parseFloat(analyticsSummary.total_volume).toLocaleString()} kg`,
        ],
        ["Ukupno ponavljanja", String(analyticsSummary.total_reps)],
        ["Ukupno setova", String(analyticsSummary.total_sets)],
        ["Najtezi teg", `${parseFloat(analyticsSummary.heaviest_weight)} kg`],
      ],
      theme: "striped",
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: 14, right: 14 },
    });
    yPos = getNextY(yPos);
  }

  if (streak) {
    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text("Streak statistika", 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [["Metrika", "Vrednost"]],
      body: [
        ["Trenutni streak", `${streak.current_streak} dana`],
        ["Najduzi streak", `${streak.longest_streak} dana`],
        ["Ukupno dana treniranja", String(streak.total_training_days)],
      ],
      theme: "striped",
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 14, right: 14 },
    });
    yPos = getNextY(yPos);
  }

  if (personalRecords.length > 0) {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text("Licni rekordi", 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [["Vezba", "Kategorija", "Score", "Max teg", "Est. 1RM", "Datum"]],
      body: personalRecords.map((r) => [
        r.exercise_name,
        r.category_name,
        formatScore(r.score, r.value_type, r.has_weight),
        r.max_weight ? `${parseFloat(r.max_weight)} kg` : "-",
        r.estimated_1rm ? `${r.estimated_1rm} kg` : "-",
        new Date(r.attempt_date).toLocaleDateString("sr-RS"),
      ]),
      theme: "striped",
      headStyles: { fillColor: [245, 158, 11] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
    });
    yPos = getNextY(yPos);
  }

  if (periodStats?.data?.length) {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text("Period statistika", 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [
        ["Period", "Treninzi", "Dani", "Setovi", "Ponavljanja", "Volumen"],
      ],
      body: periodStats.data.map((row) => [
        row.label || row.bucket_key,
        String(row.total_workouts),
        String(row.training_days),
        String(row.total_sets),
        String(row.total_reps),
        `${parseFloat(row.total_volume).toLocaleString()}`,
      ]),
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
    });
  }

  doc.save("trening-izvestaj-sve.pdf");
}
