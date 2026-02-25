import React, { createContext, useContext, useState, useCallback } from "react";
import * as api from "../services/api";

const StepsContext = createContext();

export function StepsProvider({ children }) {
  const [entries, setEntries] = useState([]);
  const [periodStats, setPeriodStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingPeriodStats, setLoadingPeriodStats] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const loadEntries = useCallback(async (params) => {
    setLoadingEntries(true);
    try {
      const data = await api.getStepEntries(params);
      setEntries(data);
      return data;
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  const loadPeriodStats = useCallback(async (params) => {
    setLoadingPeriodStats(true);
    try {
      const data = await api.getStepPeriodStats(params);
      setPeriodStats(data);
      return data;
    } finally {
      setLoadingPeriodStats(false);
    }
  }, []);

  const loadSummary = useCallback(async (params) => {
    setLoadingSummary(true);
    try {
      const data = await api.getStepSummary(params);
      setSummary(data);
      return data;
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const data = await api.getStepRecords();
      setRecords(data);
      return data;
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  const addEntry = useCallback(async (payload) => {
    return await api.createStepEntry(payload);
  }, []);

  const editEntry = useCallback(async (id, payload) => {
    return await api.updateStepEntry(id, payload);
  }, []);

  const removeEntry = useCallback(async (id) => {
    return await api.deleteStepEntry(id);
  }, []);

  const value = {
    entries,
    periodStats,
    summary,
    records,
    loadingEntries,
    loadingPeriodStats,
    loadingSummary,
    loadingRecords,
    loadEntries,
    loadPeriodStats,
    loadSummary,
    loadRecords,
    addEntry,
    editEntry,
    removeEntry,
  };

  return (
    <StepsContext.Provider value={value}>{children}</StepsContext.Provider>
  );
}

export const useSteps = () => {
  const context = useContext(StepsContext);
  if (!context) throw new Error("useSteps mora biti korišćen unutar StepsProvider");
  return context;
};
