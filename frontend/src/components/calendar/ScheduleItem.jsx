import React from "react";
import { FiCheck, FiTrash2, FiEdit2, FiClock } from "react-icons/fi";

function ScheduleItem({ item, onComplete, onEdit, onDelete }) {
  const timeStr = item.scheduled_time ? item.scheduled_time.slice(0, 5) : null;

  return (
    <div
      className={`schedule-item ${item.is_completed ? "schedule-item--completed" : ""}`}
    >
      <div
        className="schedule-item-color"
        style={{ backgroundColor: item.category_color || "#6366f1" }}
      />
      <div className="schedule-item-content">
        <div className="schedule-item-header">
          <span className="schedule-item-icon">{item.exercise_icon}</span>
          <div className="schedule-item-info">
            <span className="schedule-item-exercise">{item.exercise_name}</span>
            <span className="schedule-item-category">{item.category_name}</span>
          </div>
        </div>
        {item.title && <p className="schedule-item-title">{item.title}</p>}
        {timeStr && (
          <span className="schedule-item-time">
            <FiClock /> {timeStr}
          </span>
        )}
        {item.notes && <p className="schedule-item-notes">{item.notes}</p>}
      </div>
      <div className="schedule-item-actions">
        {!item.is_completed && (
          <button
            className="btn-icon btn-success-icon"
            onClick={() => onComplete(item.id)}
            title="Završeno"
          >
            <FiCheck />
          </button>
        )}
        <button
          className="btn-icon"
          onClick={() => onEdit(item)}
          title="Izmeni"
        >
          <FiEdit2 />
        </button>
        <button
          className="btn-icon btn-danger"
          onClick={() => onDelete(item.id)}
          title="Obriši"
        >
          <FiTrash2 />
        </button>
      </div>
    </div>
  );
}

export default ScheduleItem;
