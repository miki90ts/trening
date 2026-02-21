import React from "react";
import { formatDelta, formatKg } from "./metricsUtils";

function MetricsTable({
  rows = [],
  currentWeight,
  periodAverage,
  onEdit,
  onDelete,
}) {
  return (
    <div className="results-table-wrapper">
      <table className="results-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Vreme</th>
            <th>Kilaža</th>
            <th>Δ od trenutne</th>
            <th>Prosek perioda</th>
            <th>Napomena</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="empty-state-small">
                Nema merenja za izabrani filter.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const rowWeight = parseFloat(row.weight_kg);
              const current = parseFloat(currentWeight);
              const diff =
                Number.isFinite(rowWeight) && Number.isFinite(current)
                  ? rowWeight - current
                  : null;

              const metricDate = new Date(row.metric_datetime);

              return (
                <tr key={row.id}>
                  <td>{metricDate.toLocaleDateString("sr-RS")}</td>
                  <td>
                    {metricDate.toLocaleTimeString("sr-RS", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>{formatKg(row.weight_kg)}</td>
                  <td>{formatDelta(diff)}</td>
                  <td>{formatKg(periodAverage)}</td>
                  <td>{row.notes || "-"}</td>
                  <td>
                    <div className="metrics-table-actions">
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => onEdit(row)}
                      >
                        Izmeni
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => onDelete(row)}
                      >
                        Obriši
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default MetricsTable;
