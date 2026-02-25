import React, { useMemo } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { formatMl, getDrinkType } from "./hydrationUtils";

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

const toLocalYmd = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return typeof value === "string" ? value.slice(0, 10) : "";
  }
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatYmdLabel = (ymd) => {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "-";
  const [y, m, d] = ymd.split("-");
  const monthIdx = Number(m) - 1;
  const monthShort = MONTH_NAMES[monthIdx]?.slice(0, 3) || m;
  return `${Number(d)}. ${monthShort.toLowerCase()} ${y}.`;
};

function HydrationTable({ rows, periodStats, granularity, onEdit, onDelete }) {
  // ──── YEAR VIEW: 12 monthly rows from periodStats ────
  const monthlyRows = useMemo(() => {
    if (granularity !== "year" || !periodStats?.data) return [];
    return periodStats.data.map((row) => {
      const monthIdx = parseInt(row.month_key?.split("-")[1]) - 1;
      return {
        label: `${MONTH_NAMES[monthIdx]} ${row.month_key?.split("-")[0]}`,
        total_ml: parseInt(row.total_ml) || 0,
        days_tracked: parseInt(row.days_tracked) || 0,
        entry_count: parseInt(row.entry_count) || 0,
      };
    });
  }, [granularity, periodStats]);

  // ──── MONTH VIEW: daily aggregated rows ────
  const dailyRows = useMemo(() => {
    if (granularity !== "month" || !rows || rows.length === 0) return [];
    const byDate = {};
    rows.forEach((row) => {
      const date = toLocalYmd(row.entry_date);
      if (!date) return;
      if (!byDate[date]) byDate[date] = { total: 0, goal: 2500, count: 0 };
      byDate[date].total += parseInt(row.amount_ml);
      byDate[date].goal = Math.max(
        byDate[date].goal,
        parseInt(row.goal_ml || 2500),
      );
      byDate[date].count += 1;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => ({
        date,
        label: formatYmdLabel(date),
        total_ml: data.total,
        goal_ml: data.goal,
        met: data.total >= data.goal,
        entry_count: data.count,
      }));
  }, [granularity, rows]);

  // ──── 7D VIEW: raw entries (original) ────
  const rawTotals = useMemo(() => {
    if (granularity !== "7d" || !rows) return {};
    const totals = {};
    rows.forEach((row) => {
      const date = toLocalYmd(row.entry_date);
      if (!date) return;
      if (!totals[date]) totals[date] = { total: 0, goal: row.goal_ml || 2500 };
      totals[date].total += parseInt(row.amount_ml);
      totals[date].goal = Math.max(
        totals[date].goal,
        parseInt(row.goal_ml || 2500),
      );
    });
    return totals;
  }, [granularity, rows]);

  // ──── YEAR VIEW ────
  if (granularity === "year") {
    if (monthlyRows.length === 0) {
      return <p className="empty-state-small">Nema podataka za prikaz.</p>;
    }
    return (
      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th>Mesec</th>
              <th>Ukupno popijeno</th>
              <th>Dana praćeno</th>
              <th>Broj unosa</th>
            </tr>
          </thead>
          <tbody>
            {monthlyRows.map((row, i) => (
              <tr key={i}>
                <td>
                  <strong>{row.label}</strong>
                </td>
                <td>{formatMl(row.total_ml)}</td>
                <td>{row.days_tracked}</td>
                <td>{row.entry_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ──── MONTH VIEW ────
  if (granularity === "month") {
    if (dailyRows.length === 0) {
      return <p className="empty-state-small">Nema podataka za prikaz.</p>;
    }
    return (
      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Ukupno</th>
              <th>Cilj</th>
              <th>Status</th>
              <th>Br. unosa</th>
            </tr>
          </thead>
          <tbody>
            {dailyRows.map((row) => (
              <tr
                key={row.date}
                className={row.met ? "hydration-row-success" : ""}
              >
                <td>
                  <strong>{row.label}</strong>
                </td>
                <td>{formatMl(row.total_ml)}</td>
                <td>{formatMl(row.goal_ml)}</td>
                <td>
                  <span
                    className={`hydration-status-badge ${row.met ? "hydration-met" : "hydration-not-met"}`}
                  >
                    {row.met ? "✅ Ispunjeno" : "⬜ Nije"}
                  </span>
                </td>
                <td>{row.entry_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ──── 7D VIEW: all individual entries with edit/delete ────
  if (!rows || rows.length === 0) {
    return <p className="empty-state-small">Nema unosa za prikaz.</p>;
  }

  return (
    <div className="results-table-wrapper">
      <table className="results-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Količina</th>
            <th>Tip</th>
            <th>Dnevni ukupno</th>
            <th>Status</th>
            <th>Napomena</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const dateKey = toLocalYmd(row.entry_date);
            const dayTotal = rawTotals[dateKey]?.total || 0;
            const dayGoal = rawTotals[dateKey]?.goal || 2500;
            const met = dayTotal >= dayGoal;
            const drink = getDrinkType(row.drink_type);

            return (
              <tr key={row.id} className={met ? "hydration-row-success" : ""}>
                <td>{new Date(row.entry_date).toLocaleDateString("sr-RS")}</td>
                <td>
                  <strong>{formatMl(row.amount_ml)}</strong>
                </td>
                <td>
                  <span className="hydration-type-badge">
                    {drink.emoji} {drink.label}
                  </span>
                </td>
                <td>
                  {formatMl(dayTotal)} / {formatMl(dayGoal)}
                </td>
                <td>
                  <span
                    className={`hydration-status-badge ${met ? "hydration-met" : "hydration-not-met"}`}
                  >
                    {met ? "✅ Ispunjeno" : "⬜ Nije"}
                  </span>
                </td>
                <td>{row.notes || "-"}</td>
                <td>
                  <div className="table-actions">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => onEdit(row)}
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

export default HydrationTable;
