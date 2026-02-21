export function exportNutritionHistoryCsv(rows = []) {
  const headers = [
    "Datum",
    "Obrok",
    "Namirnica",
    "Kolicina(g)",
    "Kcal",
    "Proteini(g)",
    "Ugljeni hidrati(g)",
    "Masti(g)",
  ];

  const mealLabel = {
    breakfast: "Dorucak",
    lunch: "Rucak",
    dinner: "Vecera",
    snack: "Uzina",
  };

  const csvRows = rows.map((row) => [
    new Date(row.entry_date).toLocaleDateString("sr-RS"),
    mealLabel[row.meal_type] || row.meal_type,
    row.item_name || "",
    row.amount_grams || 0,
    row.consumed_kcal || 0,
    row.consumed_protein || 0,
    row.consumed_carbs || 0,
    row.consumed_fat || 0,
  ]);

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
    `nutrition-history-${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
