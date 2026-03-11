import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiPlus,
  FiClock,
  FiClipboard,
  FiPlay,
  FiCheckCircle,
} from "react-icons/fi";
import {
  formatDistanceKm,
  formatDuration,
  formatPace,
} from "../activity/activityUtils";

const DAY_NAMES = [
  "Nedelja",
  "Ponedeljak",
  "Utorak",
  "Sreda",
  "Četvrtak",
  "Petak",
  "Subota",
];
const MONTH_NAMES = [
  "januar",
  "februar",
  "mart",
  "april",
  "maj",
  "jun",
  "jul",
  "avgust",
  "septembar",
  "oktobar",
  "novembar",
  "decembar",
];

function CalendarDayDetail({ selectedDate, calendarData }) {
  const navigate = useNavigate();

  if (!selectedDate) return null;

  const dayData = calendarData[selectedDate] || {
    workouts: [],
    activities: [],
    sessions: [],
    mealSessions: [],
    activitySessions: [],
  };
  const dateObj = new Date(selectedDate + "T00:00:00");
  const dayName = DAY_NAMES[dateObj.getDay()];
  const formattedDate = `${dateObj.getDate()}. ${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  return (
    <div className="calendar-day-detail">
      <div className="calendar-day-detail-header">
        <div>
          <h3>{dayName}</h3>
          <p className="calendar-day-detail-date">{formattedDate}</p>
        </div>
      </div>

      {/* Urađeni treninzi */}
      {dayData.workouts.length > 0 && (
        <div className="calendar-day-section">
          <h4 className="calendar-day-section-title">
            ✅ Urađeno ({dayData.workouts.length})
          </h4>
          <div className="calendar-day-items">
            {dayData.workouts.map((w) => (
              <div key={w.id} className="calendar-workout-item">
                <div
                  className="schedule-item-color"
                  style={{ backgroundColor: w.category_color || "#6366f1" }}
                />
                <div className="calendar-workout-info">
                  <span className="schedule-item-icon">{w.exercise_icon}</span>
                  <div>
                    <span className="schedule-item-exercise">
                      {w.exercise_name}
                    </span>
                    <span className="schedule-item-category">
                      {w.category_name}
                    </span>
                  </div>
                </div>
                <div className="calendar-workout-score">
                  <strong>{parseFloat(w.score).toLocaleString("sr-RS")}</strong>
                  <span>{w.value_type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity za dan */}
      {dayData.activities.length > 0 && (
        <div className="calendar-day-section">
          <h4 className="calendar-day-section-title">
            🏃 Activity ({dayData.activities.length})
          </h4>
          <div className="calendar-day-items">
            {dayData.activities.map((a) => (
              <div
                key={a.id}
                className="calendar-workout-item calendar-workout-item--clickable"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/activity/${a.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/activity/${a.id}`);
                  }
                }}
                title="Otvori detalj aktivnosti"
              >
                <div
                  className="schedule-item-color"
                  style={{ backgroundColor: "var(--accent-success)" }}
                />
                <div className="calendar-workout-info">
                  <span className="schedule-item-icon">🏃</span>

                  <span className="schedule-item-exercise">
                    {a.activity_type_name}
                  </span>
                  <span className="schedule-item-category">
                    {a.name || "Aktivnost"}
                  </span>
                </div>
                <div className="calendar-activity-metrics">
                  <span>{formatDistanceKm(a.distance_meters)} km</span>
                  <span>{formatDuration(a.duration_seconds)}</span>
                  <span>Pace: {formatPace(a.avg_pace_seconds_per_km)}</span>
                  <span>Ascent: {a.ascent_meters ?? 0} m</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan sesije */}
      {dayData.sessions && dayData.sessions.length > 0 && (
        <div className="calendar-day-section">
          <h4 className="calendar-day-section-title">
            <FiClipboard /> Plan sesije ({dayData.sessions.length})
          </h4>
          <div className="calendar-day-items">
            {dayData.sessions.map((ps) => (
              <div
                key={ps.id}
                className="calendar-workout-item calendar-workout-item--clickable"
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (ps.status === "completed")
                    navigate(`/plans/session/${ps.id}/detail`);
                  else if (ps.status === "in_progress")
                    navigate(`/plans/session/${ps.id}`);
                  else navigate("/plans");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (ps.status === "completed")
                      navigate(`/plans/session/${ps.id}/detail`);
                    else if (ps.status === "in_progress")
                      navigate(`/plans/session/${ps.id}`);
                    else navigate("/plans");
                  }
                }}
                title={ps.plan_name}
              >
                <div
                  className="schedule-item-color"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                />
                <div className="calendar-workout-info">
                  <span className="schedule-item-icon">📋</span>
                  <div>
                    <span className="schedule-item-exercise">
                      {ps.plan_name}
                    </span>
                    <span className="schedule-item-category">
                      {ps.exercise_count} vežbi
                    </span>
                  </div>
                </div>
                <div className="calendar-workout-score">
                  {ps.status === "completed" && (
                    <>
                      <FiCheckCircle
                        style={{ color: "var(--accent-success)" }}
                      />{" "}
                      <span>Završeno</span>
                    </>
                  )}
                  {ps.status === "in_progress" && (
                    <>
                      <FiPlay style={{ color: "var(--accent-warning)" }} />{" "}
                      <span>U toku</span>
                    </>
                  )}
                  {ps.status === "scheduled" && (
                    <>
                      <FiClock /> <span>Zakazano</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meal plan sesije */}
      {dayData.mealSessions && dayData.mealSessions.length > 0 && (
        <div className="calendar-day-section">
          <h4 className="calendar-day-section-title">
            🍽️ Plan ishrane ({dayData.mealSessions.length})
          </h4>
          <div className="calendar-day-items">
            {dayData.mealSessions.map((ms) => (
              <div
                key={ms.id}
                className="calendar-workout-item calendar-workout-item--clickable"
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (ms.status === "completed")
                    navigate(`/meal-plans/session/${ms.id}/detail`);
                  else if (ms.status === "in_progress")
                    navigate(`/meal-plans/session/${ms.id}`);
                  else navigate("/meal-plans");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (ms.status === "completed")
                      navigate(`/meal-plans/session/${ms.id}/detail`);
                    else if (ms.status === "in_progress")
                      navigate(`/meal-plans/session/${ms.id}`);
                    else navigate("/meal-plans");
                  }
                }}
                title={ms.plan_name}
              >
                <div
                  className="schedule-item-color"
                  style={{ backgroundColor: "var(--accent-warning)" }}
                />
                <div className="calendar-workout-info">
                  <span className="schedule-item-icon">🍽️</span>
                  <div>
                    <span className="schedule-item-exercise">
                      {ms.plan_name}
                    </span>
                    <span className="schedule-item-category">
                      {ms.meal_count} obroka
                    </span>
                  </div>
                </div>
                <div className="calendar-workout-score">
                  {ms.status === "completed" && (
                    <>
                      <FiCheckCircle
                        style={{ color: "var(--accent-success)" }}
                      />{" "}
                      <span>Završeno</span>
                    </>
                  )}
                  {ms.status === "in_progress" && (
                    <>
                      <FiPlay style={{ color: "var(--accent-warning)" }} />{" "}
                      <span>U toku</span>
                    </>
                  )}
                  {ms.status === "scheduled" && (
                    <>
                      <FiClock /> <span>Zakazano</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity plan sesije */}
      {dayData.activitySessions && dayData.activitySessions.length > 0 && (
        <div className="calendar-day-section">
          <h4 className="calendar-day-section-title">
            🏃 Plan aktivnosti ({dayData.activitySessions.length})
          </h4>
          <div className="calendar-day-items">
            {dayData.activitySessions.map((as) => (
              <div
                key={as.id}
                className="calendar-workout-item calendar-workout-item--clickable"
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (as.status === "completed" && as.activity_id) {
                    navigate(`/activity/${as.activity_id}`);
                  } else {
                    navigate(`/activity-plans/session/${as.id}`);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (as.status === "completed" && as.activity_id) {
                      navigate(`/activity/${as.activity_id}`);
                    } else {
                      navigate(`/activity-plans/session/${as.id}`);
                    }
                  }
                }}
                title={as.plan_name}
              >
                <div
                  className="schedule-item-color"
                  style={{ backgroundColor: "#3b82f6" }}
                />
                <div className="calendar-workout-info">
                  <span className="schedule-item-icon">🏃</span>
                  <div>
                    <span className="schedule-item-exercise">
                      {as.plan_name}
                    </span>
                    <span className="schedule-item-category">
                      {as.activity_type_name} · {as.segment_count} segmenata
                    </span>
                  </div>
                </div>
                <div className="calendar-workout-score">
                  {as.status === "completed" && (
                    <>
                      <FiCheckCircle
                        style={{ color: "var(--accent-success)" }}
                      />{" "}
                      <span>Završeno</span>
                    </>
                  )}
                  {as.status === "in_progress" && (
                    <>
                      <FiPlay style={{ color: "var(--accent-warning)" }} />{" "}
                      <span>U toku</span>
                    </>
                  )}
                  {as.status === "scheduled" && (
                    <>
                      <FiClock /> <span>Zakazano</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dayData.workouts.length === 0 &&
        dayData.activities.length === 0 &&
        (!dayData.sessions || dayData.sessions.length === 0) &&
        (!dayData.mealSessions || dayData.mealSessions.length === 0) &&
        (!dayData.activitySessions ||
          dayData.activitySessions.length === 0) && (
          <p className="empty-state">Nema aktivnosti za ovaj dan.</p>
        )}
    </div>
  );
}

export default CalendarDayDetail;
