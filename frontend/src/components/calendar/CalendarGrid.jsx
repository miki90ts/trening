import React from "react";
import WorkoutDot from "./WorkoutDot";
import { getMedicalEventMeta } from "../medicalEvents/medicalEventUtils";

const DAY_NAMES = ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"];

function CalendarGrid({
  currentMonth,
  calendarData,
  selectedDate,
  onSelectDate,
}) {
  const [year, monthNum] = currentMonth.split("-").map(Number);

  // Prvi dan meseca (0=Ned, 1=Pon, ...)
  const firstDay = new Date(year, monthNum - 1, 1);
  const lastDay = new Date(year, monthNum, 0);
  const daysInMonth = lastDay.getDate();

  // Pomeri da nedelja (0=Pon, ..., 6=Ned)
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6;

  const today = new Date().toISOString().slice(0, 10);

  // Generisi niz ćelija
  const cells = [];

  // Prazne ćelije pre prvog dana
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push({ day: null, key: `empty-${i}` });
  }

  // Dani u mesecu
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayData = calendarData[dateStr] || {
      workouts: [],
      activities: [],
      scheduled: [],
      sessions: [],
      mealSessions: [],
      activitySessions: [],
      medicalEvents: [],
    };
    cells.push({ day, dateStr, ...dayData, key: dateStr });
  }

  return (
    <div className="calendar-grid-wrapper">
      {/* Header sa danima */}
      <div className="calendar-grid-header">
        {DAY_NAMES.map((name) => (
          <div key={name} className="calendar-day-name">
            {name}
          </div>
        ))}
      </div>

      {/* Grid ćelija */}
      <div className="calendar-grid">
        {cells.map((cell) => {
          if (cell.day === null) {
            return (
              <div
                key={cell.key}
                className="calendar-cell calendar-cell--empty"
              />
            );
          }

          const isToday = cell.dateStr === today;
          const isSelected = cell.dateStr === selectedDate;
          const hasWorkouts = cell.workouts && cell.workouts.length > 0;
          const hasActivities = cell.activities && cell.activities.length > 0;
          const hasScheduled = cell.scheduled && cell.scheduled.length > 0;
          const hasSessions = cell.sessions && cell.sessions.length > 0;
          const hasMealSessions =
            cell.mealSessions && cell.mealSessions.length > 0;
          const hasActivitySessions =
            cell.activitySessions && cell.activitySessions.length > 0;
          const hasMedicalEvents =
            cell.medicalEvents && cell.medicalEvents.length > 0;
          const hasEvents =
            hasWorkouts ||
            hasActivities ||
            hasScheduled ||
            hasSessions ||
            hasMealSessions ||
            hasActivitySessions ||
            hasMedicalEvents;

          return (
            <div
              key={cell.key}
              className={`calendar-cell ${isToday ? "calendar-cell--today" : ""} ${isSelected ? "calendar-cell--selected" : ""} ${hasEvents ? "calendar-cell--has-events" : ""}`}
              onClick={() => onSelectDate(cell.dateStr)}
            >
              <span className="calendar-cell-day">{cell.day}</span>
              <div className="calendar-cell-dots">
                {hasWorkouts &&
                  cell.workouts
                    .slice(0, 3)
                    .map((w, i) => (
                      <WorkoutDot
                        key={`w-${w.id || i}`}
                        color={w.category_color}
                        title={`${w.exercise_name} — ${w.category_name}`}
                        type="workout"
                      />
                    ))}
                {hasScheduled &&
                  cell.scheduled
                    .slice(0, 3)
                    .map((s, i) => (
                      <WorkoutDot
                        key={`s-${s.id || i}`}
                        color={s.category_color}
                        title={`📅 ${s.exercise_name} — ${s.category_name}`}
                        type="scheduled"
                      />
                    ))}
                {hasActivities &&
                  cell.activities
                    .slice(0, 3)
                    .map((a, i) => (
                      <WorkoutDot
                        key={`a-${a.id || i}`}
                        color="var(--accent-success)"
                        title={`🏃 ${a.activity_type_name} — ${a.name || "Aktivnost"}`}
                        type="activity"
                      />
                    ))}
                {hasSessions &&
                  cell.sessions
                    .slice(0, 3)
                    .map((ps, i) => (
                      <WorkoutDot
                        key={`ps-${ps.id || i}`}
                        color="var(--accent-primary)"
                        title={`📋 ${ps.plan_name} (${ps.status === "completed" ? "završeno" : ps.status === "in_progress" ? "u toku" : "zakazano"})`}
                        type={
                          ps.status === "completed" ? "workout" : "scheduled"
                        }
                      />
                    ))}
                {hasMealSessions &&
                  cell.mealSessions
                    .slice(0, 2)
                    .map((ms, i) => (
                      <WorkoutDot
                        key={`ms-${ms.id || i}`}
                        color="var(--accent-warning)"
                        title={`🍽️ ${ms.plan_name} (${ms.status === "completed" ? "završeno" : ms.status === "in_progress" ? "u toku" : "zakazano"})`}
                        type={
                          ms.status === "completed" ? "workout" : "scheduled"
                        }
                      />
                    ))}
                {hasActivitySessions &&
                  cell.activitySessions
                    .slice(0, 2)
                    .map((activitySession, i) => (
                      <WorkoutDot
                        key={`aps-${activitySession.id || i}`}
                        color="#3b82f6"
                        title={`🏃 ${activitySession.plan_name} (${activitySession.status === "completed" ? "završeno" : activitySession.status === "in_progress" ? "u toku" : "zakazano"})`}
                        type={
                          activitySession.status === "completed"
                            ? "workout"
                            : "scheduled"
                        }
                      />
                    ))}
                {hasMedicalEvents &&
                  cell.medicalEvents.slice(0, 2).map((medicalEvent, i) => {
                    const meta = getMedicalEventMeta(medicalEvent.event_type);
                    return (
                      <WorkoutDot
                        key={`me-${medicalEvent.id || i}`}
                        color={meta.color}
                        title={`${meta.icon} ${meta.label} - ${medicalEvent.title}`}
                        type="medical"
                      />
                    );
                  })}
                {(cell.workouts?.length > 3 ||
                  cell.activities?.length > 3 ||
                  cell.scheduled?.length > 3 ||
                  cell.sessions?.length > 3 ||
                  cell.mealSessions?.length > 2 ||
                  cell.activitySessions?.length > 2 ||
                  cell.medicalEvents?.length > 2) && (
                  <span className="calendar-cell-more">+</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarGrid;
