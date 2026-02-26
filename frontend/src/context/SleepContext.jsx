import React, { createContext, useContext, useState, useCallback } from "react";
import {
  getSleepEntries,
  createSleepEntry,
  updateSleepEntry,
  deleteSleepEntry,
  getSleepPeriodStats,
  getSleepSummary,
  getSleepRecords,
  getSleepStreak,
} from "../services/api";

const SleepContext = createContext();

export function SleepProvider({ children }) {
  const [entries, setEntries] = useState([]);
  const [periodStats, setPeriodStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState(null);
  const [streak, setStreak] = useState(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingPeriodStats, setLoadingPeriodStats] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const loadEntries = useCallback(async (params = {}) => {
    setLoadingEntries(true);
    try {
      const data = await getSleepEntries(params);
      setEntries(data);
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  const loadPeriodStats = useCallback(async (params = {}) => {
    setLoadingPeriodStats(true);
    try {
      const data = await getSleepPeriodStats(params);
      setPeriodStats(data);
    } finally {
      setLoadingPeriodStats(false);
    }
  }, []);

  const loadSummary = useCallback(async (params = {}) => {
    setLoadingSummary(true);
    try {
      const data = await getSleepSummary(params);
      setSummary(data);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    const data = await getSleepRecords();
    setRecords(data);
  }, []);

  const loadStreak = useCallback(async () => {
    const data = await getSleepStreak();
    setStreak(data);
  }, []);

  const addEntry = useCallback(async (data) => {
    return await createSleepEntry(data);
  }, []);

  const editEntry = useCallback(async (id, data) => {
    return await updateSleepEntry(id, data);
  }, []);

  const removeEntry = useCallback(async (id) => {
    return await deleteSleepEntry(id);
  }, []);

  return (
    <SleepContext.Provider
      value={{
        entries,
        periodStats,
        summary,
        records,
        streak,
        loadingEntries,
        loadingPeriodStats,
        loadingSummary,
        loadEntries,
        loadPeriodStats,
        loadSummary,
        loadRecords,
        loadStreak,
        addEntry,
        editEntry,
        removeEntry,
      }}
    >
      {children}
    </SleepContext.Provider>
  );
}

export function useSleep() {
  const ctx = useContext(SleepContext);
  if (!ctx) throw new Error("useSleep mora biti korišćen unutar SleepProvider");
  return ctx;
}
