import React, { createContext, useContext, useMemo, useState } from "react";
import * as api from "../services/api";

const ActivityContext = createContext();

export function ActivityProvider({ children }) {
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [activityTypes, setActivityTypes] = useState([]);
  const [periodStats, setPeriodStats] = useState(null);
  const [summary, setSummary] = useState(null);

  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingPeriodStats, setLoadingPeriodStats] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const loadActivityTypes = async (params = {}) => {
    setLoadingTypes(true);
    try {
      const data = await api.getActivityTypes(params);
      if (Array.isArray(data)) {
        setActivityTypes(data);
        return data;
      }

      setActivityTypes(data?.data || []);
      return data;
    } finally {
      setLoadingTypes(false);
    }
  };

  const loadActivities = async (params = {}) => {
    setLoadingActivities(true);
    try {
      const response = await api.getActivities(params);

      if (Array.isArray(response)) {
        setActivities(response);
        setPagination({
          page: 1,
          pageSize: response.length,
          total: response.length,
          totalPages: 1,
        });
      } else {
        setActivities(response?.data || []);
        setPagination(
          response?.pagination || {
            page: 1,
            pageSize: 10,
            total: 0,
            totalPages: 0,
          },
        );
      }

      return response;
    } finally {
      setLoadingActivities(false);
    }
  };

  const loadPeriodStats = async (params = {}) => {
    setLoadingPeriodStats(true);
    try {
      const response = await api.getActivityPeriodStats(params);
      setPeriodStats(response);
      return response;
    } finally {
      setLoadingPeriodStats(false);
    }
  };

  const loadPeriodExportData = async (params = {}) => {
    const response = await api.getActivityPeriodExportData(params);
    return response;
  };

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const response = await api.getActivitySummary();
      setSummary(response);
      return response;
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadActivityDetail = async (id) => {
    const detail = await api.getActivityDetail(id);
    return detail;
  };

  const loadActivityExportData = async (id) => {
    const exportData = await api.getActivityExportData(id);
    return exportData;
  };

  const addActivity = async (payload) => {
    const created = await api.createActivity(payload);
    return created;
  };

  const editActivity = async (id, payload) => {
    const updated = await api.updateActivity(id, payload);
    return updated;
  };

  const removeActivity = async (id) => {
    const removed = await api.deleteActivity(id);
    return removed;
  };

  const addActivityType = async (payload) => {
    const created = await api.createActivityType(payload);
    return created;
  };

  const editActivityType = async (id, payload) => {
    const updated = await api.updateActivityType(id, payload);
    return updated;
  };

  const removeActivityType = async (id) => {
    const removed = await api.deleteActivityType(id);
    return removed;
  };

  const value = useMemo(
    () => ({
      activities,
      pagination,
      activityTypes,
      periodStats,
      summary,
      loadingActivities,
      loadingTypes,
      loadingPeriodStats,
      loadingSummary,
      loadActivityTypes,
      loadActivities,
      loadPeriodStats,
      loadPeriodExportData,
      loadSummary,
      loadActivityDetail,
      loadActivityExportData,
      addActivity,
      editActivity,
      removeActivity,
      addActivityType,
      editActivityType,
      removeActivityType,
    }),
    [
      activities,
      pagination,
      activityTypes,
      periodStats,
      summary,
      loadingActivities,
      loadingTypes,
      loadingPeriodStats,
      loadingSummary,
    ],
  );

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error("useActivity must be used within ActivityProvider");
  }
  return context;
}
