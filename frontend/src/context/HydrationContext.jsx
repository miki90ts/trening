import React, { createContext, useContext, useState, useCallback } from "react";
import {
  getHydrationEntries,
  createHydrationEntry,
  updateHydrationEntry,
  deleteHydrationEntry,
  getHydrationPeriodStats,
  getHydrationSummary,
  getHydrationRecords,
  getHydrationStreak,
} from "../services/api";

const HydrationContext = createContext();

export function HydrationProvider({ children }) {
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
      const data = await getHydrationEntries(params);
      setEntries(data);
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  const loadPeriodStats = useCallback(async (params = {}) => {
    setLoadingPeriodStats(true);
    try {
      const data = await getHydrationPeriodStats(params);
      setPeriodStats(data);
    } finally {
      setLoadingPeriodStats(false);
    }
  }, []);

  const loadSummary = useCallback(async (params = {}) => {
    setLoadingSummary(true);
    try {
      const data = await getHydrationSummary(params);
      setSummary(data);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    const data = await getHydrationRecords();
    setRecords(data);
  }, []);

  const loadStreak = useCallback(async () => {
    const data = await getHydrationStreak();
    setStreak(data);
  }, []);

  const addEntry = useCallback(async (data) => {
    return await createHydrationEntry(data);
  }, []);

  const editEntry = useCallback(async (id, data) => {
    return await updateHydrationEntry(id, data);
  }, []);

  const removeEntry = useCallback(async (id) => {
    return await deleteHydrationEntry(id);
  }, []);

  return (
    <HydrationContext.Provider
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
    </HydrationContext.Provider>
  );
}

export function useHydration() {
  const ctx = useContext(HydrationContext);
  if (!ctx)
    throw new Error("useHydration must be used within HydrationProvider");
  return ctx;
}
