export function exportMetricsCsv(rows = []) {
  const headers = ["Datum", "Vreme", "Kilaža (kg)", "Napomena"];

  const csvRows = rows.map((row) => {
    const date = new Date(row.metric_datetime);
    return [
      date.toLocaleDateString("sr-RS"),
      date.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" }),
      parseFloat(row.weight_kg || 0).toFixed(2),
      row.notes || "",
    ];
  });

  const csvContent = [headers, ...csvRows]
    .map((line) =>
      line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `metrics-weight-${new Date().toISOString().slice(0, 10)}.csv`,
  );

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
