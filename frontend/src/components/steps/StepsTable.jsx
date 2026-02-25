import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { formatNumber, formatMeters } from "./stepsUtils";

function StepsTable({ rows, onEdit, onDelete }) {
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
            return (
              <tr key={row.id} className={met ? "steps-row-success" : ""}>
                <td>{new Date(row.step_date).toLocaleDateString("sr-RS")}</td>
                <td><strong>{formatNumber(row.step_count)}</strong></td>
                <td>{formatNumber(row.goal)}</td>
                <td>
                  <span className={`steps-status-badge ${met ? "steps-met" : "steps-not-met"}`}>
                    {met ? "✅ Ispunjeno" : "⬜ Nije"}
                  </span>
                </td>
                <td>{formatMeters(Math.round(row.step_count * 0.75))}</td>
                <td>{row.notes || "-"}</td>
                <td>
                  <div className="table-actions">
                    <button className="btn btn-sm btn-ghost" onClick={() => onEdit(row)} title="Izmeni"><FiEdit2 /></button>
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

export default StepsTable;
