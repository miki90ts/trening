import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import {
  formatDuration,
  formatTime,
  formatQuality,
  formatNumber,
  getPhasePercentages,
  toYmd,
} from "./sleepUtils";

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

function SleepTable({ rows, periodStats, granularity, onEdit, onDelete }) {
  const isYear = granularity === "year";

  if (isYear) {
    const yearFromPeriod = parseInt(
      periodStats?.period?.start?.slice(0, 4),
      10,
    );
    const selectedYear = Number.isFinite(yearFromPeriod)
      ? yearFromPeriod
      : new Date().getFullYear();

    const monthly = Array.from({ length: 12 }, (_, monthIndex) => ({
      monthIndex,
      count: 0,
      durationSum: 0,
      qualitySum: 0,
      qualityCount: 0,
      hrSum: 0,
      hrCount: 0,
      hrvSum: 0,
      hrvCount: 0,
      deepSum: 0,
      deepCount: 0,
      lightSum: 0,
      lightCount: 0,
      remSum: 0,
      remCount: 0,
      awakeSum: 0,
      awakeCount: 0,
    }));

    (periodStats?.data || []).forEach((row) => {
      const bucket = getYearMonthFromBucket(row.bucket_key);
      if (!bucket || bucket.year !== selectedYear) return;

      const month = monthly[bucket.monthIndex];
      month.count += 1;

      const duration = parseFloat(row.duration_min);
      if (Number.isFinite(duration)) month.durationSum += duration;

      const quality = parseFloat(row.sleep_quality);
      if (Number.isFinite(quality)) {
        month.qualitySum += quality;
        month.qualityCount += 1;
      }

      const avgHr = parseFloat(row.avg_hr);
      if (Number.isFinite(avgHr)) {
        month.hrSum += avgHr;
        month.hrCount += 1;
      }

      const avgHrv = parseFloat(row.avg_hrv);
      if (Number.isFinite(avgHrv)) {
        month.hrvSum += avgHrv;
        month.hrvCount += 1;
      }

      const deep = parseFloat(row.deep_min);
      if (Number.isFinite(deep)) {
        month.deepSum += deep;
        month.deepCount += 1;
      }

      const light = parseFloat(row.light_min);
      if (Number.isFinite(light)) {
        month.lightSum += light;
        month.lightCount += 1;
      }

      const rem = parseFloat(row.rem_min);
      if (Number.isFinite(rem)) {
        month.remSum += rem;
        month.remCount += 1;
      }

      const awake = parseFloat(row.awake_min);
      if (Number.isFinite(awake)) {
        month.awakeSum += awake;
        month.awakeCount += 1;
      }
    });

    return (
      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th>Mesec</th>
              <th>Prosek trajanja</th>
              <th>Prosek kvaliteta</th>
              <th>Avg HR</th>
              <th>Avg HRV</th>
              <th>Deep</th>
              <th>Light</th>
              <th>REM</th>
              <th>Awake</th>
              <th>Noći</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((month) => {
              const duration =
                month.count > 0 ? month.durationSum / month.count : 0;
              const quality =
                month.qualityCount > 0
                  ? month.qualitySum / month.qualityCount
                  : 0;
              const avgHr = month.hrCount > 0 ? month.hrSum / month.hrCount : 0;
              const avgHrv =
                month.hrvCount > 0 ? month.hrvSum / month.hrvCount : 0;
              const deep =
                month.deepCount > 0 ? month.deepSum / month.deepCount : 0;
              const light =
                month.lightCount > 0 ? month.lightSum / month.lightCount : 0;
              const rem =
                month.remCount > 0 ? month.remSum / month.remCount : 0;
              const awake =
                month.awakeCount > 0 ? month.awakeSum / month.awakeCount : 0;

              return (
                <tr key={`${selectedYear}-${month.monthIndex + 1}`}>
                  <td>
                    {MONTH_NAMES[month.monthIndex]} {selectedYear}
                  </td>
                  <td>{formatDuration(duration)}</td>
                  <td>{formatQuality(quality)}</td>
                  <td>{avgHr > 0 ? formatNumber(avgHr.toFixed(1)) : "-"}</td>
                  <td>
                    {avgHrv > 0 ? `${formatNumber(avgHrv.toFixed(1))} ms` : "-"}
                  </td>
                  <td>{formatDuration(deep)}</td>
                  <td>{formatDuration(light)}</td>
                  <td>{formatDuration(rem)}</td>
                  <td>{formatDuration(awake)}</td>
                  <td>{month.count}</td>
                </tr>
              );
            })}
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
            const met =
              row.duration_min &&
              row.target_min &&
              row.duration_min >= row.target_min;
            const phases = getPhasePercentages(row);

            return (
              <tr key={row.id} className={met ? "steps-row-success" : ""}>
                <td>
                  {new Date(`${normalizedDate}T00:00:00`).toLocaleDateString(
                    "sr-RS",
                  )}
                </td>
                <td>{formatTime(row.bedtime)}</td>
                <td>{formatTime(row.wake_time)}</td>
                <td>
                  <strong>{formatDuration(row.duration_min)}</strong>
                </td>
                <td>{formatDuration(row.target_min)}</td>
                <td>
                  <span
                    className={`steps-status-badge ${met ? "steps-met" : "steps-not-met"}`}
                  >
                    {met ? "✅ Ispunjeno" : "⬜ Nije"}
                  </span>
                </td>
                <td>
                  {phases ? (
                    <div className="sleep-phase-bar-mini">
                      {phases.deep > 0 && (
                        <div
                          className="sleep-phase-deep"
                          style={{ width: `${phases.deep}%` }}
                          title={`Deep ${phases.deep}%`}
                        />
                      )}
                      {phases.light > 0 && (
                        <div
                          className="sleep-phase-light"
                          style={{ width: `${phases.light}%` }}
                          title={`Light ${phases.light}%`}
                        />
                      )}
                      {phases.rem > 0 && (
                        <div
                          className="sleep-phase-rem"
                          style={{ width: `${phases.rem}%` }}
                          title={`REM ${phases.rem}%`}
                        />
                      )}
                      {phases.awake > 0 && (
                        <div
                          className="sleep-phase-awake"
                          style={{ width: `${phases.awake}%` }}
                          title={`Awake ${phases.awake}%`}
                        />
                      )}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{formatQuality(row.sleep_quality)}</td>
                <td>
                  {row.avg_hr ? `${row.avg_hr}/${row.min_hr || "-"}` : "-"}
                </td>
                <td>{row.avg_hrv ? `${row.avg_hrv} ms` : "-"}</td>
                <td>
                  <div className="table-actions">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() =>
                        onEdit({ ...row, sleep_date: normalizedDate })
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

export default SleepTable;
