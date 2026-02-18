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
  const [todayItems, setTodayItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
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

  // Učitaj zakazane za danas
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const items = await api.getTodaySchedule();
      setTodayItems(items);
      setUnreadCount(items.filter((i) => !i.is_completed).length);
    } catch {
      // Tiho propusti — ne treba crashovati app ako schedule API ne radi
    }
  }, [isAuthenticated]);

  // Proveri da li treba poslati browser notifikaciju
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

      // Pošalji notifikaciju 15 min pre ili ako je vreme
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

  // Označi kao pročitano (vizuelno)
  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Označi kao završen
  const markComplete = useCallback(async (id) => {
    try {
      await api.completeScheduledWorkout(id);
      setTodayItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_completed: 1 } : i)),
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
      setTodayItems([]);
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

  // Proveri podsetnike svaki minut
  useEffect(() => {
    if (!isAuthenticated || todayItems.length === 0) return;

    checkReminders(); // Odmah proveri
    const reminderInterval = setInterval(checkReminders, 60000);
    return () => clearInterval(reminderInterval);
  }, [isAuthenticated, todayItems, checkReminders]);

  const value = {
    todayItems,
    unreadCount,
    permissionGranted,
    dropdownOpen,
    refreshNotifications,
    markAllRead,
    markComplete,
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
