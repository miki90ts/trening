import React, { useRef, useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import GenericNotificationItem from "./GenericNotificationItem";
import { FiCheck } from "react-icons/fi";

function NotificationDropdown() {
  const {
    notifications,
    dropdownOpen,
    closeDropdown,
    markAsRead,
    markAllRead,
  } = useNotifications();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Zatvori dropdown na klik izvan
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        if (!e.target.closest(".notification-bell")) {
          closeDropdown();
        }
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen, closeDropdown]);

  if (!dropdownOpen) return null;

  const unreadNotifs = notifications.filter((n) => !n.is_read);

  const handleNotifClick = (notif) => {
    markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
      closeDropdown();
    }
  };

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      {/* Tabs */}
      <div className="notification-dropdown-tabs">
        <button type="button" className={`notification-dropdown-tab active`}>
          Obaveštenja
          {unreadNotifs.length > 0 && (
            <span className="notification-tab-badge">
              {unreadNotifs.length}
            </span>
          )}
        </button>
      </div>

      <div className="notification-dropdown-body">
        {notifications.length === 0 ? (
          <p className="notification-dropdown-empty">Nema obaveštenja.</p>
        ) : (
          notifications.map((notif) => (
            <GenericNotificationItem
              key={notif.id}
              item={notif}
              onClick={() => handleNotifClick(notif)}
            />
          ))
        )}
      </div>

      <div className="notification-dropdown-footer">
        <button
          className="btn btn-secondary btn-sm btn-full"
          onClick={() => {
            markAllRead();
          }}
        >
          <FiCheck /> Označi sve kao pročitane
        </button>
      </div>
    </div>
  );
}

export default NotificationDropdown;
