import React from "react";

function TopFoodsTable({ foods = [] }) {
  return (
    <div className="results-table-wrapper">
      <table className="results-table">
        <thead>
          <tr>
            <th>Namirnica / jelo</th>
            <th>Puta uneseno</th>
            <th>Kcal</th>
            <th>Proteini</th>
            <th>UH</th>
            <th>Masti</th>
          </tr>
        </thead>
        <tbody>
          {foods.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty-state-small">
                Nema podataka u periodu.
              </td>
            </tr>
          ) : (
            foods.map((row) => (
              <tr key={row.item_name}>
                <td>{row.item_name}</td>
                <td>{row.occurrences}</td>
                <td>
                  {Math.round(parseFloat(row.total_kcal || 0) * 100) / 100}
                </td>
                <td>
                  {Math.round(parseFloat(row.total_protein || 0) * 100) / 100}
                </td>
                <td>
                  {Math.round(parseFloat(row.total_carbs || 0) * 100) / 100}
                </td>
                <td>
                  {Math.round(parseFloat(row.total_fat || 0) * 100) / 100}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TopFoodsTable;
