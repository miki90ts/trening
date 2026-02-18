import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";
import * as api from "../services/api";

const CalendarContext = createContext();

const initialState = {
  currentMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
  calendarData: {}, // { 'YYYY-MM-DD': { workouts: [], scheduled: [] } }
  selectedDate: null, // 'YYYY-MM-DD' ili null
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "SET_MONTH":
      return { ...state, currentMonth: action.payload };
    case "SET_CALENDAR_DATA":
      return { ...state, calendarData: action.payload, loading: false };
    case "SET_SELECTED_DATE":
      return { ...state, selectedDate: action.payload };
    case "ADD_SCHEDULED": {
      const dateKey =
        action.payload.scheduled_date?.slice(0, 10) ||
        new Date(action.payload.scheduled_date).toISOString().slice(0, 10);
      const existing = state.calendarData[dateKey] || {
        workouts: [],
        scheduled: [],
      };
      return {
        ...state,
        calendarData: {
          ...state.calendarData,
          [dateKey]: {
            ...existing,
            scheduled: [...existing.scheduled, action.payload],
          },
        },
      };
    }
    case "UPDATE_SCHEDULED": {
      const data = { ...state.calendarData };
      for (const dateKey of Object.keys(data)) {
        data[dateKey] = {
          ...data[dateKey],
          scheduled: data[dateKey].scheduled.map((s) =>
            s.id === action.payload.id ? action.payload : s,
          ),
        };
      }
      return { ...state, calendarData: data };
    }
    case "REMOVE_SCHEDULED": {
      const data = { ...state.calendarData };
      for (const dateKey of Object.keys(data)) {
        data[dateKey] = {
          ...data[dateKey],
          scheduled: data[dateKey].scheduled.filter(
            (s) => s.id !== action.payload,
          ),
        };
      }
      return { ...state, calendarData: data };
    }
    default:
      return state;
  }
}

export function CalendarProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadMonth = useCallback(async (month) => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_MONTH", payload: month });
    try {
      const data = await api.getCalendarMonth(month);
      dispatch({ type: "SET_CALENDAR_DATA", payload: data });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  }, []);

  const goToPrevMonth = useCallback(() => {
    const [year, monthNum] = state.currentMonth.split("-").map(Number);
    const d = new Date(year, monthNum - 2, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    loadMonth(newMonth);
  }, [state.currentMonth, loadMonth]);

  const goToNextMonth = useCallback(() => {
    const [year, monthNum] = state.currentMonth.split("-").map(Number);
    const d = new Date(year, monthNum, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    loadMonth(newMonth);
  }, [state.currentMonth, loadMonth]);

  const goToToday = useCallback(() => {
    const today = new Date().toISOString().slice(0, 7);
    loadMonth(today);
    dispatch({
      type: "SET_SELECTED_DATE",
      payload: new Date().toISOString().slice(0, 10),
    });
  }, [loadMonth]);

  const selectDate = useCallback((date) => {
    dispatch({ type: "SET_SELECTED_DATE", payload: date });
  }, []);

  const addScheduledWorkout = useCallback(async (data) => {
    const result = await api.createScheduledWorkout(data);
    dispatch({ type: "ADD_SCHEDULED", payload: result });
    return result;
  }, []);

  const editScheduledWorkout = useCallback(
    async (id, data) => {
      const result = await api.updateScheduledWorkout(id, data);
      // Ako se datum promenio, reload ceo mesec
      await loadMonth(state.currentMonth);
      return result;
    },
    [state.currentMonth, loadMonth],
  );

  const removeScheduledWorkout = useCallback(async (id) => {
    await api.deleteScheduledWorkout(id);
    dispatch({ type: "REMOVE_SCHEDULED", payload: id });
  }, []);

  const markComplete = useCallback(async (id) => {
    const result = await api.completeScheduledWorkout(id);
    dispatch({ type: "UPDATE_SCHEDULED", payload: result });
    return result;
  }, []);

  const value = {
    ...state,
    loadMonth,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    selectDate,
    addScheduledWorkout,
    editScheduledWorkout,
    removeScheduledWorkout,
    markComplete,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context)
    throw new Error("useCalendar must be used within CalendarProvider");
  return context;
}
