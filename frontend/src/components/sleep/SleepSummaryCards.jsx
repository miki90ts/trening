import React from "react";
import Card from "../common/Card";
import { formatDuration, formatQuality, formatNumber } from "./sleepUtils";

function SleepSummaryCards({ summary }) {
  if (!summary) return null;

  const todayDuration = summary.today?.duration_min;
  const target = summary.current_target || 480;
  const todayPct = todayDuration
    ? Math.min(100, Math.round((todayDuration / target) * 100))
    : 0;
  const targetMet = todayDuration && todayDuration >= target;

  return (
    <div className="steps-summary-grid">
      <Card
        className={`steps-summary-card steps-today-card ${targetMet ? "steps-goal-met" : ""}`}
      >
        <div className="steps-today-head">
          <div className="steps-today-ring">
            <svg viewBox="0 0 100 100" className="steps-ring-svg">
              <circle cx="50" cy="50" r="42" className="steps-ring-bg" />
              <circle
                cx="50"
                cy="50"
                r="42"
                className="steps-ring-fill"
                strokeDasharray={`${todayPct * 2.64} 264`}
                style={{
                  stroke: targetMet
                    ? "var(--accent-success)"
                    : "var(--accent-primary)",
                }}
              />
            </svg>
            <span className="steps-ring-text">🌙</span>
          </div>
          <div>
            <small>Noćas</small>
            <p className="steps-today-count">{formatDuration(todayDuration)}</p>
            <small>Cilj: {formatDuration(target)}</small>
          </div>
        </div>
      </Card>

      <Card className="steps-summary-card">
        <small>Prosečno spavanja</small>
        <p>{formatDuration(summary.avg_duration)}</p>

        <small>Prosečan kvalitet</small>
        <p>{formatQuality(summary.avg_quality)}</p>
      </Card>

      <Card className="steps-summary-card">
        <small>Prosečan HR / HRV</small>
        <p>
          {formatNumber(summary.avg_hr)} bpm · {formatNumber(summary.avg_hrv)}{" "}
          ms
        </p>
      </Card>

      <Card className="steps-summary-card">
        <small>Cilj ispunjen</small>
        <p>
          {summary.days_target_met}/{summary.total_days} dana
        </p>
      </Card>
    </div>
  );
}

export default SleepSummaryCards;
