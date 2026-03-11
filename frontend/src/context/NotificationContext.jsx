import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import * as api from "../services/api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext();

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minuta
const REMINDER_OFFSET = 15 * 60 * 1000; // 15 min pre zakazanog vremena

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();

  // Novi state (generičke notifikacije iz notifications tabele)
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeDropdownTab, setActiveDropdownTab] = useState("notifications");

  const sentReminders = useRef(new Set());
  const intervalRef = useRef(null);

  // Zatraži dozvolu za browser notifikacije
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      setPermissionGranted(true);
    } else if (Notification.permission !== "denied") {
      const result = await Notification.requestPermission();
      setPermissionGranted(result === "granted");
    }
  }, []);

  // Učitaj notifikacije i unread count (novi flow)
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [notifs, countData] = await Promise.all([
        api.getNotifications({ limit: 30, unreadOnly: false }),
        api.getUnreadNotificationCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(countData.count);
    } catch {
      // noop
    }
  }, [isAuthenticated]);

  // Refresh sve
  const refreshAll = useCallback(async () => {
    await refreshNotifications();
  }, [refreshNotifications]);

  // Combinovani unread count (notifikacije + pending scheduled)
  const combinedUnreadCount = unreadCount;

  // Označi sve notifikacije kao pročitane
  const markAllRead = useCallback(async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  // Označi jednu notifikaciju kao pročitanu
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: 1 } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // noop
    }
  }, []);

  const toggleDropdown = useCallback(() => {
    setDropdownOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setDropdownOpen(false);
  }, []);

  // Na mount: zatraži dozvolu, učitaj podatke, pokreni polling
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    requestPermission();
    refreshNotifications();

    intervalRef.current = setInterval(() => {
      refreshNotifications();
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, requestPermission, refreshNotifications]);

  const value = {
    // Notifications (novi workflow)
    notifications,
    unreadCount: combinedUnreadCount,
    markAsRead,
    markAllRead,

    // Shared
    permissionGranted,
    dropdownOpen,
    activeDropdownTab,
    setActiveDropdownTab,
    refreshNotifications: refreshAll,
    toggleDropdown,
    closeDropdown,
    requestPermission,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  return context;
}
