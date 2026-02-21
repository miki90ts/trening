import React, { createContext, useContext, useMemo, useState } from "react";
import * as api from "../services/api";

const MetricsContext = createContext();

export const toYmd = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date();
    fallback.setHours(0, 0, 0, 0);
    return fallback.toISOString().slice(0, 10);
  }

  date.setHours(0, 0, 0, 0);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export function MetricsProvider({ children }) {
  const [entries, setEntries] = useState([]);
  const [periodStats, setPeriodStats] = useState(null);
  const [summary, setSummary] = useState(null);

  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingPeriodStats, setLoadingPeriodStats] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const loadEntries = async (params = {}) => {
    setLoadingEntries(true);
    try {
      const data = await api.getWeightEntries(params);
      setEntries(data);
      return data;
    } finally {
      setLoadingEntries(false);
    }
  };

  const loadPeriodStats = async (params = {}) => {
    setLoadingPeriodStats(true);
    try {
      const data = await api.getWeightPeriodStats(params);
      setPeriodStats(data);
      return data;
    } finally {
      setLoadingPeriodStats(false);
    }
  };

  const loadSummary = async (params = {}) => {
    setLoadingSummary(true);
    try {
      const data = await api.getWeightSummary(params);
      setSummary(data);
      return data;
    } finally {
      setLoadingSummary(false);
    }
  };

  const addEntry = async (payload) => {
    const data = await api.createWeightEntry(payload);
    return data;
  };

  const editEntry = async (id, payload) => {
    const data = await api.updateWeightEntry(id, payload);
    return data;
  };

  const removeEntry = async (id) => {
    const data = await api.deleteWeightEntry(id);
    return data;
  };

  const value = useMemo(
    () => ({
      entries,
      periodStats,
      summary,
      loadingEntries,
      loadingPeriodStats,
      loadingSummary,
      loadEntries,
      loadPeriodStats,
      loadSummary,
      addEntry,
      editEntry,
      removeEntry,
    }),
    [
      entries,
      periodStats,
      summary,
      loadingEntries,
      loadingPeriodStats,
      loadingSummary,
    ],
  );

  return (
    <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>
  );
}

export function useMetrics() {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error("useMetrics must be used within MetricsProvider");
  }
  return context;
}
