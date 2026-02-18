import React from "react";
import { FiCheck, FiClock } from "react-icons/fi";

function NotificationItem({ item, onComplete }) {
  const timeStr = item.scheduled_time ? item.scheduled_time.slice(0, 5) : null;

  return (
    <div
      className={`notification-item ${item.is_completed ? "notification-item--completed" : ""}`}
    >
      <div
        className="notification-item-color"
        style={{ backgroundColor: item.category_color || "#6366f1" }}
      />
      <div className="notification-item-content">
        <div className="notification-item-top">
          <span className="notification-item-icon">{item.exercise_icon}</span>
          <span className="notification-item-name">{item.exercise_name}</span>
        </div>
        <span className="notification-item-category">{item.category_name}</span>
        {item.title && (
          <span className="notification-item-title">{item.title}</span>
        )}
        {timeStr && (
          <span className="notification-item-time">
            <FiClock size={12} /> {timeStr}
          </span>
        )}
      </div>
      {!item.is_completed && (
        <button
          className="btn-icon btn-success-icon btn-sm-icon"
          onClick={(e) => {
            e.stopPropagation();
            onComplete(item.id);
          }}
          title="Završeno"
        >
          <FiCheck />
        </button>
      )}
      {item.is_completed && <span className="notification-item-done">✓</span>}
    </div>
  );
}

export default NotificationItem;
