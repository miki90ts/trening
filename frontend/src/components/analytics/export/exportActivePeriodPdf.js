import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportActivePeriodPdf({
  activeTab,
  periodLabel,
  progressData,
  periodStats,
  personalRecords,
  formatScore,
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setTextColor(99, 102, 241);
  doc.text("Aktivni period - analitika", pageWidth / 2, 18, {
    align: "center",
  });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Period: ${periodLabel || "-"}`, pageWidth / 2, 26, {
    align: "center",
  });
  doc.text(
    `Generisano: ${new Date().toLocaleDateString("sr-RS")}`,
    pageWidth / 2,
    32,
    {
      align: "center",
    },
  );

  let yPos = 42;

  if (activeTab === "progress" && progressData?.data?.length) {
    doc.setFontSize(13);
    doc.setTextColor(30);
    doc.text("Napredak - detalji", 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [
        [
          "Datum",
          "Score",
          "Setovi",
          "Ponavljanja",
          "Volume",
          "Max teg",
          "Est. 1RM",
        ],
      ],
      body: progressData.data.map((row) => [
        new Date(row.attempt_date).toLocaleDateString("sr-RS"),
        String(row.score),
        String(row.total_sets),
        String(row.total_reps),
        String(row.volume_load),
        row.max_weight ? `${parseFloat(row.max_weight)} kg` : "-",
        row.estimated_1rm ? `${row.estimated_1rm} kg` : "-",
      ]),
      theme: "striped",
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
    });
  } else if (activeTab === "period" && periodStats?.data?.length) {
    doc.setFontSize(13);
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
  } else if (activeTab === "records" && personalRecords?.length) {
    doc.setFontSize(13);
    doc.setTextColor(30);
    doc.text("Lični rekordi", 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [["Vežba", "Kategorija", "Score", "Datum"]],
      body: personalRecords.map((r) => [
        r.exercise_name,
        r.category_name,
        formatScore(r.score, r.value_type, r.has_weight),
        new Date(r.attempt_date).toLocaleDateString("sr-RS"),
      ]),
      theme: "striped",
      headStyles: { fillColor: [245, 158, 11] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
    });
  } else {
    doc.setFontSize(12);
    doc.setTextColor(70);
    doc.text("Nema podataka za aktivni tab i izabrani period.", 14, yPos);
  }

  doc.save("trening-izvestaj-aktivni-period.pdf");
}
