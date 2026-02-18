import React from "react";
import { FiBell } from "react-icons/fi";
import { useNotifications } from "../../context/NotificationContext";
import NotificationDropdown from "./NotificationDropdown";

function NotificationBell() {
  const { unreadCount, toggleDropdown } = useNotifications();

  return (
    <div className="notification-bell-wrapper">
      <button
        className="notification-bell"
        onClick={toggleDropdown}
        title="Notifikacije"
      >
        <FiBell />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      <NotificationDropdown />
    </div>
  );
}

export default NotificationBell;
