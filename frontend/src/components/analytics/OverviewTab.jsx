import React from "react";
import { FiTrendingUp, FiActivity, FiZap, FiTarget } from "react-icons/fi";
import Card from "../common/Card";

function OverviewTab({ streak, analyticsSummary }) {
  return (
    <div className="analytics-content">
      {streak && (
        <div className="analytics-streak-section">
          <div className="streak-cards-grid">
            <Card className="streak-card streak-current">
              <div className="streak-icon">🔥</div>
              <div className="streak-value">{streak.current_streak}</div>
              <div className="streak-label">Trenutni streak (dana)</div>
            </Card>
            <Card className="streak-card streak-best">
              <div className="streak-icon">🏆</div>
              <div className="streak-value">{streak.longest_streak}</div>
              <div className="streak-label">Najduži streak (dana)</div>
            </Card>
            <Card className="streak-card streak-total">
              <div className="streak-icon">📅</div>
              <div className="streak-value">{streak.total_training_days}</div>
              <div className="streak-label">Ukupno dana treniranja</div>
            </Card>
          </div>
        </div>
      )}

      {analyticsSummary && (
        <div className="analytics-stats-grid">
          <Card className="stat-card analytics-stat">
            <FiTarget className="stat-icon" />
            <div className="stat-info">
              <span className="stat-number">
                {analyticsSummary.total_workouts}
              </span>
              <span className="stat-label">Ukupno treninga</span>
            </div>
          </Card>
          <Card className="stat-card analytics-stat">
            <FiActivity className="stat-icon" />
            <div className="stat-info">
              <span className="stat-number">
                {parseFloat(analyticsSummary.total_volume).toLocaleString()}
              </span>
              <span className="stat-label">Ukupan volumen (kg)</span>
            </div>
          </Card>
          <Card className="stat-card analytics-stat">
            <FiZap className="stat-icon" />
            <div className="stat-info">
              <span className="stat-number">{analyticsSummary.total_reps}</span>
              <span className="stat-label">Ukupno ponavljanja</span>
            </div>
          </Card>
          <Card className="stat-card analytics-stat">
            <FiTrendingUp className="stat-icon" />
            <div className="stat-info">
              <span className="stat-number">
                {parseFloat(analyticsSummary.heaviest_weight)} kg
              </span>
              <span className="stat-label">Najteži teg</span>
            </div>
          </Card>
        </div>
      )}

      {analyticsSummary?.last_workout && (
        <Card className="last-workout-card">
          <h3>Poslednji trening</h3>
          <p>
            {analyticsSummary.last_workout.exercise_icon}{" "}
            {analyticsSummary.last_workout.exercise_name} —{" "}
            {analyticsSummary.last_workout.category_name}
          </p>
          <p className="last-workout-date">
            {new Date(
              analyticsSummary.last_workout.attempt_date,
            ).toLocaleDateString("sr-RS", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </Card>
      )}
    </div>
  );
}

export default OverviewTab;
