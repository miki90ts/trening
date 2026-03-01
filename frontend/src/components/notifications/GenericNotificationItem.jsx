import React from "react";

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "upravo";
  if (diffMin < 60) return `pre ${diffMin} min`;
  if (diffH < 24) return `pre ${diffH}h`;
  if (diffD < 7) return `pre ${diffD}d`;
  return date.toLocaleDateString("sr-RS", { day: "numeric", month: "short" });
}

function GenericNotificationItem({ item, onClick }) {
  return (
    <div
      className={`notification-generic ${item.is_read ? "notification-generic--read" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      <span
        className="notification-generic-icon"
        style={{ backgroundColor: item.color || "#6366f1" }}
      >
        {item.icon || "🔔"}
      </span>
      <div className="notification-generic-body">
        <span className="notification-generic-title">{item.title}</span>
        {item.message && (
          <span className="notification-generic-message">{item.message}</span>
        )}
        <span className="notification-generic-time">
          {timeAgo(item.created_at)}
        </span>
      </div>
      {!item.is_read && <span className="notification-generic-dot" />}
    </div>
  );
}

export default GenericNotificationItem;
