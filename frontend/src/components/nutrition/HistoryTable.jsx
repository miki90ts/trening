import React from "react";

const mealLabels = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
  snack: "Užina",
};

function HistoryTable({ rows = [] }) {
  return (
    <div className="results-table-wrapper">
      <table className="results-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Obrok</th>
            <th>Namirnica</th>
            <th>Količina</th>
            <th>Kcal</th>
            <th>P</th>
            <th>UH</th>
            <th>M</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="empty-state-small">
                Nema unosa za zadate filtere.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.entry_item_id}>
                <td>{new Date(row.entry_date).toLocaleDateString("sr-RS")}</td>
                <td>{mealLabels[row.meal_type] || row.meal_type}</td>
                <td>{row.item_name}</td>
                <td>
                  {Math.round(parseFloat(row.amount_grams || 0) * 100) / 100} g
                </td>
                <td>
                  {Math.round(parseFloat(row.consumed_kcal || 0) * 100) / 100}
                </td>
                <td>
                  {Math.round(parseFloat(row.consumed_protein || 0) * 100) /
                    100}
                </td>
                <td>
                  {Math.round(parseFloat(row.consumed_carbs || 0) * 100) / 100}
                </td>
                <td>
                  {Math.round(parseFloat(row.consumed_fat || 0) * 100) / 100}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default HistoryTable;
