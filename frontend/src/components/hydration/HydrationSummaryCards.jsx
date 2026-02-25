import React from "react";
import Card from "../common/Card";
import { formatMl, formatNumber } from "./hydrationUtils";

function HydrationSummaryCards({ summary }) {
  if (!summary) return null;

  const todayMl = summary.today?.total_ml || 0;
  const todayGoal = summary.today?.goal_ml || summary.current_goal || 2500;
  const todayPct =
    todayGoal > 0 ? Math.min(100, Math.round((todayMl / todayGoal) * 100)) : 0;
  const goalMet = todayMl >= todayGoal;

  return (
    <div className="hydration-summary-grid">
      <Card
        className={`hydration-summary-card hydration-today-card ${goalMet ? "hydration-goal-met" : ""}`}
      >
        <div className="hydration-today-head">
          <div className="hydration-today-ring">
            <svg viewBox="0 0 100 100" className="hydration-ring-svg">
              <circle cx="50" cy="50" r="42" className="hydration-ring-bg" />
              <circle
                cx="50"
                cy="50"
                r="42"
                className="hydration-ring-fill"
                strokeDasharray={`${todayPct * 2.64} 264`}
                strokeDashoffset="0"
              />
            </svg>
            <span className="hydration-ring-text">💧</span>
          </div>
          <div>
            <h4>Danas</h4>
            <p className="hydration-today-count">{formatMl(todayMl)}</p>
            <small>
              Cilj: {formatMl(todayGoal)} ({todayPct}%)
            </small>
          </div>
        </div>
      </Card>

      <Card className="hydration-summary-card">
        <h4>Prosek perioda</h4>
        <p className="hydration-stat-value">{formatMl(summary.avg_ml)}</p>
        <small>dnevno</small>
      </Card>

      <Card className="hydration-summary-card">
        <h4>Ukupno u periodu</h4>
        <p className="hydration-stat-value">{formatMl(summary.total_ml)}</p>
        <small>{summary.total_days} dana</small>
      </Card>

      <Card className="hydration-summary-card">
        <h4>Cilj ispunjen</h4>
        <p className="hydration-stat-value">
          {summary.days_goal_met || 0}/{summary.total_days || 0}
        </p>
        <small>dana u periodu</small>
      </Card>
    </div>
  );
}

export default HydrationSummaryCards;
