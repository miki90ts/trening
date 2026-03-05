import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { formatDelta, formatKg } from "./metricsUtils";

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Jun",
  "Jul",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

function MetricsTable({
  rows = [],
  periodStats,
  granularity,
  currentWeight,
  periodAverage,
  onEdit,
  onDelete,
}) {
  const isYearView = granularity === "year";

  if (isYearView) {
    const monthlyRows = periodStats?.data || [];

    return (
      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th>Mesec</th>
              <th>Prosečna kilaža</th>
              <th>Broj merenja</th>
            </tr>
          </thead>
          <tbody>
            {monthlyRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="empty-state-small">
                  Nema merenja za izabrani filter.
                </td>
              </tr>
            ) : (
              monthlyRows.map((row) => {
                const monthIndex =
                  parseInt(row.month_key?.split("-")[1], 10) - 1;
                const year = row.month_key?.split("-")[0];
                const monthLabel =
                  monthIndex >= 0 && monthIndex < 12
                    ? `${MONTH_NAMES[monthIndex]} ${year}`
                    : row.month_key;

                return (
                  <tr key={row.month_key || row.bucket_key}>
                    <td>{monthLabel}</td>
                    <td>{formatKg(row.avg_weight)}</td>
                    <td>{row.entry_count || 0}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  }

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
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => onEdit(row)}
                        title="Izmeni"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost btn-danger-ghost"
                        onClick={() => onDelete(row)}
                        title="Obriši"
                      >
                        <FiTrash2 />
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
