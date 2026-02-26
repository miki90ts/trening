import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { formatDuration, formatTime, formatQuality, formatNumber, getPhasePercentages, toYmd } from "./sleepUtils";

function SleepTable({ rows, onEdit, onDelete }) {
  if (!rows || rows.length === 0) {
    return <p className="empty-state-small">Nema unosa za prikaz.</p>;
  }

  return (
    <div className="results-table-wrapper">
      <table className="results-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Ležanje</th>
            <th>Buđenje</th>
            <th>Trajanje</th>
            <th>Cilj</th>
            <th>Status</th>
            <th>Faze</th>
            <th>Kvalitet</th>
            <th>HR</th>
            <th>HRV</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const normalizedDate = toYmd(row.sleep_date);
            const met = row.duration_min && row.target_min && row.duration_min >= row.target_min;
            const phases = getPhasePercentages(row);

            return (
              <tr key={row.id} className={met ? "steps-row-success" : ""}>
                <td>{new Date(`${normalizedDate}T00:00:00`).toLocaleDateString("sr-RS")}</td>
                <td>{formatTime(row.bedtime)}</td>
                <td>{formatTime(row.wake_time)}</td>
                <td><strong>{formatDuration(row.duration_min)}</strong></td>
                <td>{formatDuration(row.target_min)}</td>
                <td>
                  <span className={`steps-status-badge ${met ? "steps-met" : "steps-not-met"}`}>
                    {met ? "✅ Ispunjeno" : "⬜ Nije"}
                  </span>
                </td>
                <td>
                  {phases ? (
                    <div className="sleep-phase-bar-mini">
                      {phases.deep > 0 && <div className="sleep-phase-deep" style={{ width: `${phases.deep}%` }} title={`Deep ${phases.deep}%`} />}
                      {phases.light > 0 && <div className="sleep-phase-light" style={{ width: `${phases.light}%` }} title={`Light ${phases.light}%`} />}
                      {phases.rem > 0 && <div className="sleep-phase-rem" style={{ width: `${phases.rem}%` }} title={`REM ${phases.rem}%`} />}
                      {phases.awake > 0 && <div className="sleep-phase-awake" style={{ width: `${phases.awake}%` }} title={`Awake ${phases.awake}%`} />}
                    </div>
                  ) : "-"}
                </td>
                <td>{formatQuality(row.sleep_quality)}</td>
                <td>{row.avg_hr ? `${row.avg_hr}/${row.min_hr || "-"}` : "-"}</td>
                <td>{row.avg_hrv ? `${row.avg_hrv} ms` : "-"}</td>
                <td>
                  <div className="table-actions">
                    <button className="btn btn-sm btn-ghost" onClick={() => onEdit({ ...row, sleep_date: normalizedDate })} title="Izmeni"><FiEdit2 /></button>
                    <button className="btn btn-sm btn-ghost btn-danger-ghost" onClick={() => onDelete(row)} title="Obriši"><FiTrash2 /></button>
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

export default SleepTable;
