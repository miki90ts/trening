import React from "react";
import Card from "../common/Card";

function HydrationStreakCard({ streak }) {
  if (!streak) return null;

  const { current_streak, longest_streak, total_goal_days } = streak;

  // Fire intensity grows with streak
  const getFlameSize = (count) => {
    if (count >= 30) return "hydration-flame-epic";
    if (count >= 14) return "hydration-flame-hot";
    if (count >= 7) return "hydration-flame-warm";
    if (count >= 3) return "hydration-flame-start";
    return "";
  };

  return (
    <Card className="hydration-streak-card">
      <h3>🔥 Streak</h3>
      <div className="hydration-streak-grid">
        <div
          className={`hydration-streak-item hydration-streak-current ${getFlameSize(current_streak)}`}
        >
          <div className="hydration-streak-flame">
            <span className="hydration-streak-emoji">🔥</span>
          </div>
          <div className="hydration-streak-info">
            <span className="hydration-streak-count">{current_streak}</span>
            <span className="hydration-streak-label">
              {current_streak === 1 ? "dan" : "dana"} zaredom
            </span>
          </div>
        </div>

        <div className="hydration-streak-item">
          <div className="hydration-streak-flame">
            <span className="hydration-streak-emoji">🏆</span>
          </div>
          <div className="hydration-streak-info">
            <span className="hydration-streak-count">{longest_streak}</span>
            <span className="hydration-streak-label">najduži streak</span>
          </div>
        </div>

        <div className="hydration-streak-item">
          <div className="hydration-streak-flame">
            <span className="hydration-streak-emoji">✅</span>
          </div>
          <div className="hydration-streak-info">
            <span className="hydration-streak-count">{total_goal_days}</span>
            <span className="hydration-streak-label">
              ukupno dana sa ciljem
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default HydrationStreakCard;
