import React from "react";
import Card from "../common/Card";
import { formatDelta, formatDeltaPercent, formatKg } from "./metricsUtils";

function ScaleIcon() {
  return (
    <svg
      className="metrics-scale-icon"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="10"
        y="10"
        width="44"
        height="44"
        rx="12"
        className="metrics-scale-body"
      />
      <path d="M32 22C26.5 22 22 26.5 22 32" className="metrics-scale-arc" />
      <path d="M32 32L39 25" className="metrics-scale-needle" />
      <circle cx="32" cy="32" r="2.8" className="metrics-scale-center" />
    </svg>
  );
}

function MetricsSummaryCards({ summary, periodLabel }) {
  const diffPercent = summary?.difference_percent;
  const indicatorClass =
    Number.isFinite(parseFloat(diffPercent)) && parseFloat(diffPercent) !== 0
      ? parseFloat(diffPercent) > 0
        ? "metrics-indicator-up"
        : "metrics-indicator-down"
      : "";

  return (
    <div className="metrics-summary-grid">
      <Card className="metrics-summary-card metrics-summary-main">
        <div className="metrics-summary-head">
          <ScaleIcon />
          <div>
            <h4>Trenutna kilaža</h4>
            <p>{formatKg(summary?.current_weight)}</p>
            <small>
              Poslednji unos:{" "}
              {summary?.current_datetime
                ? new Date(summary.current_datetime).toLocaleString("sr-RS")
                : "-"}
            </small>
          </div>
        </div>
      </Card>

      <Card className="metrics-summary-card">
        <h4>Promena vs početak perioda</h4>
        <p className={indicatorClass}>{formatDelta(summary?.difference_kg)}</p>
        <small>
          {formatDeltaPercent(summary?.difference_percent)} u periodu (
          {periodLabel})
        </small>
      </Card>

      <Card className="metrics-summary-card">
        <h4>Prosek perioda</h4>
        <p>{formatKg(summary?.period_avg_weight)}</p>
        <small>Broj merenja: {summary?.total_entries || 0}</small>
      </Card>

      <Card className="metrics-summary-card">
        <h4>Početna vrednost perioda</h4>
        <p>{formatKg(summary?.baseline_weight)}</p>
        <small>
          Datum:{" "}
          {summary?.baseline_datetime
            ? new Date(summary.baseline_datetime).toLocaleString("sr-RS")
            : "-"}
        </small>
      </Card>
    </div>
  );
}

export default MetricsSummaryCards;
