import React from "react";
import Card from "../common/Card";
import { formatNumber, formatMeters } from "./stepsUtils";

function StepsSummaryCards({ summary }) {
  if (!summary) return null;

  const todaySteps = summary.today?.step_count || 0;
  const todayGoal = summary.today?.goal || summary.current_goal || 10000;
  const todayPct = todayGoal > 0 ? Math.min(100, Math.round((todaySteps / todayGoal) * 100)) : 0;
  const goalMet = todaySteps >= todayGoal;

  return (
    <div className="steps-summary-grid">
      <Card className={`steps-summary-card steps-today-card ${goalMet ? "steps-goal-met" : ""}`}>
        <div className="steps-today-head">
          <div className="steps-today-ring">
            <svg viewBox="0 0 100 100" className="steps-ring-svg">
              <circle cx="50" cy="50" r="42" className="steps-ring-bg" />
              <circle
                cx="50" cy="50" r="42"
                className="steps-ring-fill"
                strokeDasharray={`${todayPct * 2.64} 264`}
                strokeDashoffset="0"
              />
            </svg>
            <span className="steps-ring-text">👟</span>
          </div>
          <div>
            <h4>Danas</h4>
            <p className="steps-today-count">{formatNumber(todaySteps)}</p>
            <small>Cilj: {formatNumber(todayGoal)} ({todayPct}%)</small>
          </div>
        </div>
      </Card>

      <Card className="steps-summary-card">
        <h4>Prosek perioda</h4>
        <p>{formatNumber(summary.avg_steps)}</p>
        <small>koraka/dan · {formatMeters(summary.avg_meters)}</small>
      </Card>

      <Card className="steps-summary-card">
        <h4>Ukupno u periodu</h4>
        <p>{formatNumber(summary.total_steps)}</p>
        <small>{summary.total_days} dana · {formatMeters(summary.total_meters)}</small>
      </Card>

      <Card className="steps-summary-card">
        <h4>Cilj ispunjen</h4>
        <p>{summary.days_goal_met || 0}/{summary.total_days || 0}</p>
        <small>dana u periodu</small>
      </Card>
    </div>
  );
}

export default StepsSummaryCards;
