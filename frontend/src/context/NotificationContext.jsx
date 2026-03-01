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

  // Stari state (scheduled workouts za today)
  const [todayItems, setTodayItems] = useState([]);

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

  // Učitaj zakazane za danas (stari flow)
  const refreshSchedule = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const items = await api.getTodaySchedule();
      setTodayItems(items);
    } catch {
      // noop
    }
  }, [isAuthenticated]);

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
    await refreshSchedule();
    await refreshNotifications();
  }, [refreshSchedule, refreshNotifications]);

  // Combinovani unread count (notifikacije + pending scheduled)
  const combinedUnreadCount =
    unreadCount + todayItems.filter((i) => !i.is_completed).length;

  // Proveri da li treba poslati browser notifikaciju (za scheduled workouts)
  const checkReminders = useCallback(() => {
    if (!permissionGranted) return;

    const now = new Date();
    todayItems.forEach((item) => {
      if (item.is_completed || !item.scheduled_time) return;
      if (sentReminders.current.has(item.id)) return;

      const [hours, minutes] = item.scheduled_time.split(":").map(Number);
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);

      const diff = scheduledTime.getTime() - now.getTime();

      if (diff <= REMINDER_OFFSET && diff > -60000) {
        sentReminders.current.add(item.id);
        new Notification("🏋️ Podsetnik za trening", {
          body: `${item.exercise_icon} ${item.exercise_name} — ${item.category_name}${item.title ? ` (${item.title})` : ""} u ${item.scheduled_time.slice(0, 5)}`,
          icon: "/favicon.ico",
          tag: `workout-${item.id}`,
          requireInteraction: true,
        });
      }
    });
  }, [todayItems, permissionGranted]);

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

  // Označi zakazani trening kao završen
  const markComplete = useCallback(async (id) => {
    try {
      await api.completeScheduledWorkout(id);
      setTodayItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_completed: 1 } : i)),
      );
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
      setTodayItems([]);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    requestPermission();
    refreshSchedule();
    refreshNotifications();

    intervalRef.current = setInterval(() => {
      refreshSchedule();
      refreshNotifications();
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [
    isAuthenticated,
    requestPermission,
    refreshSchedule,
    refreshNotifications,
  ]);

  // Proveri podsetnike svaki minut
  useEffect(() => {
    if (!isAuthenticated || todayItems.length === 0) return;

    checkReminders();
    const reminderInterval = setInterval(checkReminders, 60000);
    return () => clearInterval(reminderInterval);
  }, [isAuthenticated, todayItems, checkReminders]);

  const value = {
    // Schedule (stari workflow)
    todayItems,
    markComplete,

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
