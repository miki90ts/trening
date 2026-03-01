import React, { useRef, useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import NotificationItem from "./NotificationItem";
import GenericNotificationItem from "./GenericNotificationItem";
import { Link } from "react-router-dom";
import { FiCalendar, FiCheck } from "react-icons/fi";

function NotificationDropdown() {
  const {
    todayItems,
    notifications,
    dropdownOpen,
    closeDropdown,
    markComplete,
    markAsRead,
    markAllRead,
    activeDropdownTab,
    setActiveDropdownTab,
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

  const pending = todayItems.filter((i) => !i.is_completed);
  const completed = todayItems.filter((i) => i.is_completed);
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
        <button
          type="button"
          className={`notification-dropdown-tab ${activeDropdownTab === "notifications" ? "active" : ""}`}
          onClick={() => setActiveDropdownTab("notifications")}
        >
          Obaveštenja
          {unreadNotifs.length > 0 && (
            <span className="notification-tab-badge">
              {unreadNotifs.length}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`notification-dropdown-tab ${activeDropdownTab === "schedule" ? "active" : ""}`}
          onClick={() => setActiveDropdownTab("schedule")}
        >
          Treninzi
          {pending.length > 0 && (
            <span className="notification-tab-badge">{pending.length}</span>
          )}
        </button>
      </div>

      <div className="notification-dropdown-body">
        {activeDropdownTab === "notifications" ? (
          <>
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
          </>
        ) : (
          <>
            {todayItems.length === 0 ? (
              <p className="notification-dropdown-empty">
                Nema zakazanih treninga za danas.
              </p>
            ) : (
              <>
                {pending.map((item) => (
                  <NotificationItem
                    key={item.id}
                    item={item}
                    onComplete={markComplete}
                  />
                ))}
                {completed.length > 0 && (
                  <>
                    <div className="notification-dropdown-divider">
                      Završeno
                    </div>
                    {completed.map((item) => (
                      <NotificationItem
                        key={item.id}
                        item={item}
                        onComplete={markComplete}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      <div className="notification-dropdown-footer">
        {activeDropdownTab === "notifications" ? (
          <button
            className="btn btn-secondary btn-sm btn-full"
            onClick={() => {
              markAllRead();
            }}
          >
            <FiCheck /> Označi sve kao pročitane
          </button>
        ) : (
          <Link
            to="/calendar"
            className="btn btn-secondary btn-sm btn-full"
            onClick={closeDropdown}
          >
            <FiCalendar /> Otvori kalendar
          </Link>
        )}
      </div>
    </div>
  );
}

export default NotificationDropdown;
