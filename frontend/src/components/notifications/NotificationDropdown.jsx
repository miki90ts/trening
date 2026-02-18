import React, { useRef, useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";
import NotificationItem from "./NotificationItem";
import { Link } from "react-router-dom";
import { FiCalendar } from "react-icons/fi";

function NotificationDropdown() {
  const { todayItems, dropdownOpen, closeDropdown, markComplete } =
    useNotifications();
  const dropdownRef = useRef(null);

  // Zatvori dropdown na klik izvan
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        // Proveri da nije klik na bell dugme
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

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <div className="notification-dropdown-header">
        <h4>Današnji treninzi</h4>
        <span className="notification-dropdown-count">
          {pending.length} preostalo
        </span>
      </div>

      <div className="notification-dropdown-body">
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
                <div className="notification-dropdown-divider">Završeno</div>
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
      </div>

      <div className="notification-dropdown-footer">
        <Link
          to="/calendar"
          className="btn btn-secondary btn-sm btn-full"
          onClick={closeDropdown}
        >
          <FiCalendar /> Otvori kalendar
        </Link>
      </div>
    </div>
  );
}

export default NotificationDropdown;
