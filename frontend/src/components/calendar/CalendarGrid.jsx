import React from "react";
import WorkoutDot from "./WorkoutDot";

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
    const dayData = calendarData[dateStr] || { workouts: [], scheduled: [] };
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
          const hasScheduled = cell.scheduled && cell.scheduled.length > 0;
          const hasEvents = hasWorkouts || hasScheduled;

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
                {(cell.workouts?.length > 3 || cell.scheduled?.length > 3) && (
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
