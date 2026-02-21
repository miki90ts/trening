import React, { createContext, useContext, useMemo, useState } from "react";
import * as api from "../services/api";

const NutritionContext = createContext();

const toYmd = (value) => {
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

export function NutritionProvider({ children }) {
  const [selectedDate, setSelectedDate] = useState(toYmd(new Date()));
  const [dayData, setDayData] = useState(null);
  const [foods, setFoods] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [periodStats, setPeriodStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [topFoods, setTopFoods] = useState([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const loadFoods = async (params = {}) => {
    setLoadingFoods(true);
    try {
      const data = await api.getFoods(params);
      setFoods(data);
      return data;
    } finally {
      setLoadingFoods(false);
    }
  };

  const loadDay = async (date = selectedDate) => {
    const normalizedDate = toYmd(date);
    setLoadingDay(true);
    try {
      const data = await api.getNutritionDay(normalizedDate);
      setSelectedDate(normalizedDate);
      setDayData(data);
      return data;
    } finally {
      setLoadingDay(false);
    }
  };

  const saveMealEntry = async (payload) => {
    const data = await api.saveNutritionEntry(payload);
    setDayData(data);
    setSelectedDate(data.date);
    return data;
  };

  const removeMealEntry = async (entryId) => {
    const data = await api.deleteNutritionEntry(entryId);
    setDayData(data);
    setSelectedDate(data.date);
    return data;
  };

  const loadHistory = async (params = {}) => {
    setLoadingHistory(true);
    try {
      const data = await api.getNutritionHistory(params);
      setHistoryRows(data);
      return data;
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadAnalytics = async (periodParams = {}, topFoodsParams = {}) => {
    setLoadingAnalytics(true);
    try {
      const [summaryData, periodData, topFoodsData] = await Promise.all([
        api.getNutritionSummary(),
        api.getNutritionPeriodStats(periodParams),
        api.getNutritionTopFoods(topFoodsParams),
      ]);

      setSummary(summaryData);
      setPeriodStats(periodData);
      setTopFoods(topFoodsData?.data || []);

      return {
        summary: summaryData,
        periodStats: periodData,
        topFoods: topFoodsData?.data || [],
      };
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const value = useMemo(
    () => ({
      selectedDate,
      setSelectedDate,
      dayData,
      foods,
      historyRows,
      periodStats,
      summary,
      topFoods,
      loadingDay,
      loadingFoods,
      loadingHistory,
      loadingAnalytics,
      loadFoods,
      loadDay,
      saveMealEntry,
      removeMealEntry,
      loadHistory,
      loadAnalytics,
      toYmd,
    }),
    [
      selectedDate,
      dayData,
      foods,
      historyRows,
      periodStats,
      summary,
      topFoods,
      loadingDay,
      loadingFoods,
      loadingHistory,
      loadingAnalytics,
    ],
  );

  return (
    <NutritionContext.Provider value={value}>
      {children}
    </NutritionContext.Provider>
  );
}

export function useNutrition() {
  const context = useContext(NutritionContext);
  if (!context) {
    throw new Error("useNutrition must be used within NutritionProvider");
  }
  return context;
}
