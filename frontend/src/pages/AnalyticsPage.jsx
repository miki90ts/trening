import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import Loading from "../components/common/Loading";
import * as api from "../services/api";
import AnalyticsTabs from "../components/analytics/AnalyticsTabs";
import OverviewTab from "../components/analytics/OverviewTab";
import ProgressTab from "../components/analytics/ProgressTab";
import PeriodStatsTab from "../components/analytics/PeriodStatsTab";
import RecordsTab from "../components/analytics/RecordsTab";
import AnalyticsExportActions from "../components/analytics/AnalyticsExportActions";
import {
  formatPeriodTitle,
  formatScore,
  shiftAnchor,
  toYmd,
} from "../components/analytics/periodUtils";
import { exportAllAnalyticsPdf } from "../components/analytics/export/exportAllPdf";
import { exportActivePeriodPdf } from "../components/analytics/export/exportActivePeriodPdf";

function AnalyticsPage() {
  const { exercises, categories, loading } = useApp();

  const [activeTab, setActiveTab] = useState("overview");

  const [selectedExercise, setSelectedExercise] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filteredCategories, setFilteredCategories] = useState([]);

  const [progressGranularity, setProgressGranularity] = useState("week");
  const [progressAnchor, setProgressAnchor] = useState(toYmd(new Date()));
  const [periodGranularity, setPeriodGranularity] = useState("week");
  const [periodAnchor, setPeriodAnchor] = useState(toYmd(new Date()));

  const [progressData, setProgressData] = useState(null);
  const [periodStats, setPeriodStats] = useState(null);
  const [streak, setStreak] = useState(null);
  const [personalRecords, setPersonalRecords] = useState([]);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);

  const [loadingProgress, setLoadingProgress] = useState(false);
  const [loadingPeriodStats, setLoadingPeriodStats] = useState(false);

  useEffect(() => {
    if (selectedExercise) {
      const filtered = categories.filter(
        (c) => c.exercise_id === parseInt(selectedExercise, 10),
      );
      setFilteredCategories(filtered);
      if (
        filtered.length > 0 &&
        !filtered.find((c) => c.id === parseInt(selectedCategory, 10))
      ) {
        setSelectedCategory("");
      }
    } else {
      setFilteredCategories([]);
      setSelectedCategory("");
    }
  }, [selectedExercise, selectedCategory, categories]);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const [streakData, records, summary] = await Promise.all([
          api.getAnalyticsStreak(),
          api.getPersonalRecords(),
          api.getAnalyticsSummary(),
        ]);
        setStreak(streakData);
        setPersonalRecords(records);
        setAnalyticsSummary(summary);
      } catch (err) {
        console.error("Error loading analytics overview:", err);
      }
    };
    loadOverview();
  }, []);

  useEffect(() => {
    const loadPeriodStats = async () => {
      setLoadingPeriodStats(true);
      try {
        const response = await api.getAnalyticsPeriodStats({
          granularity: periodGranularity,
          anchor: periodAnchor,
        });
        setPeriodStats(response);
      } catch (err) {
        console.error("Error loading period stats:", err);
        setPeriodStats({ data: [] });
      } finally {
        setLoadingPeriodStats(false);
      }
    };

    loadPeriodStats();
  }, [periodGranularity, periodAnchor]);

  useEffect(() => {
    if (!selectedCategory) {
      setProgressData(null);
      return;
    }

    const loadProgress = async () => {
      setLoadingProgress(true);
      try {
        const data = await api.getAnalyticsProgress(selectedCategory, {
          granularity: progressGranularity,
          anchor: progressAnchor,
        });
        setProgressData(data);
      } catch (err) {
        console.error("Error loading progress:", err);
        setProgressData({ data: [] });
      } finally {
        setLoadingProgress(false);
      }
    };

    loadProgress();
  }, [selectedCategory, progressGranularity, progressAnchor]);

  const progressPeriodLabel = useMemo(
    () => formatPeriodTitle(progressGranularity, progressAnchor),
    [progressGranularity, progressAnchor],
  );

  const periodStatsLabel = useMemo(
    () => formatPeriodTitle(periodGranularity, periodAnchor),
    [periodGranularity, periodAnchor],
  );

  const handleExportAll = () => {
    exportAllAnalyticsPdf({
      analyticsSummary,
      streak,
      personalRecords,
      periodStats: {
        ...(periodStats || {}),
        data: (periodStats?.data || []).map((row) => ({
          ...row,
          label:
            periodGranularity === "year"
              ? new Date(`${row.bucket_key}-01`).toLocaleDateString("sr-RS", {
                  month: "short",
                })
              : new Date(row.bucket_key).toLocaleDateString("sr-RS"),
        })),
      },
      formatScore,
    });
  };

  const handleExportActive = () => {
    const activeLabel =
      activeTab === "progress"
        ? progressPeriodLabel
        : activeTab === "period"
          ? periodStatsLabel
          : "Nije primenjivo";

    exportActivePeriodPdf({
      activeTab,
      periodLabel: activeLabel,
      progressData,
      periodStats,
      personalRecords,
      formatScore,
    });
  };

  if (loading) return <Loading />;

  return (
    <div className="page analytics-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📈 Analitika treninga</h1>
          <p className="page-subtitle">Prati napredak, analiziraj rezultate</p>
        </div>
        <AnalyticsExportActions
          onExportAll={handleExportAll}
          onExportActive={handleExportActive}
        />
      </div>

      <AnalyticsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "overview" && (
        <OverviewTab streak={streak} analyticsSummary={analyticsSummary} />
      )}

      {activeTab === "progress" && (
        <ProgressTab
          exercises={exercises}
          filteredCategories={filteredCategories}
          selectedExercise={selectedExercise}
          selectedCategory={selectedCategory}
          onExerciseChange={(value) => {
            setSelectedExercise(value);
            setSelectedCategory("");
          }}
          onCategoryChange={setSelectedCategory}
          loadingData={loadingProgress}
          progressData={progressData}
          granularity={progressGranularity}
          periodLabel={progressPeriodLabel}
          onGranularityChange={setProgressGranularity}
          onPreviousPeriod={() =>
            setProgressAnchor(
              shiftAnchor(progressAnchor, progressGranularity, -1),
            )
          }
          onNextPeriod={() =>
            setProgressAnchor(
              shiftAnchor(progressAnchor, progressGranularity, 1),
            )
          }
        />
      )}

      {activeTab === "period" && (
        <PeriodStatsTab
          granularity={periodGranularity}
          periodLabel={periodStatsLabel}
          onGranularityChange={setPeriodGranularity}
          onPreviousPeriod={() =>
            setPeriodAnchor(shiftAnchor(periodAnchor, periodGranularity, -1))
          }
          onNextPeriod={() =>
            setPeriodAnchor(shiftAnchor(periodAnchor, periodGranularity, 1))
          }
          loadingData={loadingPeriodStats}
          periodStats={periodStats}
        />
      )}

      {activeTab === "records" && (
        <RecordsTab
          personalRecords={personalRecords}
          formatScore={formatScore}
        />
      )}
    </div>
  );
}

export default AnalyticsPage;
