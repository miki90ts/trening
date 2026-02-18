import React, { useState } from "react";
import { FiPlus, FiClock } from "react-icons/fi";
import ScheduleItem from "./ScheduleItem";
import ScheduleForm from "./ScheduleForm";
import ScheduledWorkoutEditModal from "./ScheduledWorkoutEditModal";

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

function CalendarDayDetail({
  selectedDate,
  calendarData,
  onAddScheduled,
  onEditScheduled,
  onDeleteScheduled,
  onCompleteScheduled,
  onClose,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  if (!selectedDate) return null;

  const dayData = calendarData[selectedDate] || { workouts: [], scheduled: [] };
  const dateObj = new Date(selectedDate + "T00:00:00");
  const dayName = DAY_NAMES[dateObj.getDay()];
  const formattedDate = `${dateObj.getDate()}. ${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  const handleAddSubmit = async (data) => {
    await onAddScheduled(data);
    setShowForm(false);
  };

  const handleEditSubmit = async (id, data) => {
    await onEditScheduled(id, data);
    setEditingItem(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Obrisati zakazani trening?")) return;
    await onDeleteScheduled(id);
  };

  return (
    <div className="calendar-day-detail">
      <div className="calendar-day-detail-header">
        <div>
          <h3>{dayName}</h3>
          <p className="calendar-day-detail-date">{formattedDate}</p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowForm(!showForm)}
        >
          <FiPlus /> Zakaži
        </button>
      </div>

      {showForm && (
        <div className="calendar-day-detail-form">
          <ScheduleForm
            selectedDate={selectedDate}
            onSubmit={handleAddSubmit}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Zakazani treninzi */}
      {dayData.scheduled.length > 0 && (
        <div className="calendar-day-section">
          <h4 className="calendar-day-section-title">
            <FiClock /> Zakazano ({dayData.scheduled.length})
          </h4>
          <div className="calendar-day-items">
            {dayData.scheduled.map((item) => (
              <ScheduleItem
                key={item.id}
                item={item}
                onComplete={onCompleteScheduled}
                onEdit={(item) => setEditingItem(item)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

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

      {dayData.workouts.length === 0 &&
        dayData.scheduled.length === 0 &&
        !showForm && (
          <p className="empty-state">Nema aktivnosti za ovaj dan.</p>
        )}

      {/* Edit modal */}
      <ScheduledWorkoutEditModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}

export default CalendarDayDetail;
