import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { formatNumber, formatMeters, toYmd } from "./stepsUtils";

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

const getYearMonthFromBucket = (bucketKey) => {
  if (!bucketKey) return null;

  if (typeof bucketKey === "string") {
    const match = bucketKey.match(/^(\d{4})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const monthIndex = parseInt(match[2], 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return { year, monthIndex };
      }
    }
  }

  const parsed = new Date(bucketKey);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    monthIndex: parsed.getMonth(),
  };
};

function StepsTable({ rows, periodStats, granularity, onEdit, onDelete }) {
  const isYear = granularity === "year";

  if (isYear) {
    const yearFromPeriod = parseInt(
      periodStats?.period?.start?.slice(0, 4),
      10,
    );
    const selectedYear = Number.isFinite(yearFromPeriod)
      ? yearFromPeriod
      : new Date().getFullYear();

    const totalsByMonth = new Array(12).fill(0);

    (periodStats?.data || []).forEach((row) => {
      const bucket = getYearMonthFromBucket(row.bucket_key);
      if (!bucket) return;
      if (bucket.year !== selectedYear) return;
      totalsByMonth[bucket.monthIndex] += parseInt(row.step_count, 10) || 0;
    });

    return (
      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th>Mesec</th>
              <th>Ukupno koraka</th>
              <th>Rastojanje</th>
            </tr>
          </thead>
          <tbody>
            {totalsByMonth.map((total, index) => (
              <tr key={`${selectedYear}-${index + 1}`}>
                <td>
                  {MONTH_NAMES[index]} {selectedYear}
                </td>
                <td>
                  <strong>{formatNumber(total)}</strong>
                </td>
                <td>{formatMeters(Math.round(total * 0.75))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return <p className="empty-state-small">Nema unosa za prikaz.</p>;
  }

  return (
    <div className="results-table-wrapper">
      <table className="results-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Koraci</th>
            <th>Cilj</th>
            <th>Status</th>
            <th>Rastojanje</th>
            <th>Napomena</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const met = row.step_count >= row.goal;
            const normalizedStepDate = toYmd(row.step_date);
            return (
              <tr key={row.id} className={met ? "steps-row-success" : ""}>
                <td>
                  {new Date(
                    `${normalizedStepDate}T00:00:00`,
                  ).toLocaleDateString("sr-RS")}
                </td>
                <td>
                  <strong>{formatNumber(row.step_count)}</strong>
                </td>
                <td>{formatNumber(row.goal)}</td>
                <td>
                  <span
                    className={`steps-status-badge ${met ? "steps-met" : "steps-not-met"}`}
                  >
                    {met ? "✅ Ispunjeno" : "⬜ Nije"}
                  </span>
                </td>
                <td>{formatMeters(Math.round(row.step_count * 0.75))}</td>
                <td>{row.notes || "-"}</td>
                <td>
                  <div className="table-actions">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() =>
                        onEdit({ ...row, step_date: normalizedStepDate })
                      }
                      title="Izmeni"
                    >
                      <FiEdit2 />
                    </button>
                    <button
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
          })}
        </tbody>
      </table>
    </div>
  );
}

export default StepsTable;
