import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import PeriodControls from "../components/analytics/PeriodControls";
import {
  formatPeriodTitle,
  shiftAnchor,
  toYmd,
} from "../components/analytics/periodUtils";
import NutritionFilters from "../components/nutrition/NutritionFilters";
import NutritionSummaryCards from "../components/nutrition/NutritionSummaryCards";
import NutritionCharts from "../components/nutrition/NutritionCharts";
import TopFoodsTable from "../components/nutrition/TopFoodsTable";
import HistoryTable from "../components/nutrition/HistoryTable";
import { useNutrition } from "../context/NutritionContext";
import { exportNutritionHistoryCsv } from "../components/nutrition/export/exportNutritionHistoryCsv";
import { exportNutritionPeriodPdf } from "../components/nutrition/export/exportNutritionPeriodPdf";

const metricLabels = {
  kcal: "Kalorije",
  protein: "Proteini",
  carbs: "Ugljeni hidrati",
  fat: "Masti",
};

function NutritionHistoryPage() {
  const {
    historyRows,
    summary,
    periodStats,
    topFoods,
    loadingHistory,
    loadingAnalytics,
    loadHistory,
    loadAnalytics,
  } = useNutrition();

  const [metric, setMetric] = useState("kcal");
  const [periodGranularity, setPeriodGranularity] = useState("week");
  const [periodAnchor, setPeriodAnchor] = useState(toYmd(new Date()));

  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    meal_type: "",
    food_query: "",
  });

  const periodLabel = useMemo(
    () => formatPeriodTitle(periodGranularity, periodAnchor),
    [periodGranularity, periodAnchor],
  );

  const loadAll = async () => {
    try {
      await Promise.all([
        loadHistory(filters),
        loadAnalytics(
          { granularity: periodGranularity, anchor: periodAnchor },
          { granularity: periodGranularity, anchor: periodAnchor },
        ),
      ]);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  useEffect(() => {
    loadAll();
  }, [periodGranularity, periodAnchor]);

  const handleApplyFilters = async () => {
    try {
      await loadHistory(filters);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleResetFilters = async () => {
    const next = {
      start_date: "",
      end_date: "",
      meal_type: "",
      food_query: "",
    };
    setFilters(next);
    try {
      await loadHistory(next);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleExportCsv = () => {
    exportNutritionHistoryCsv(historyRows);
  };

  const handleExportPdf = () => {
    exportNutritionPeriodPdf({
      summary,
      periodStats,
      topFoods,
      metricLabel: metricLabels[metric],
    });
  };

  return (
    <div className="page nutrition-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Pregled i istorija ishrane</h1>
          <p className="page-subtitle">
            Analiza unosa kalorija i makronutrijenata kroz vreme
          </p>
        </div>
        <div className="nutrition-export-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCsv}
          >
            Export istorije (CSV)
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportPdf}
          >
            Export perioda (PDF)
          </button>
        </div>
      </div>

      <NutritionSummaryCards summary={summary} />

      <div className="card nutrition-period-card">
        <PeriodControls
          granularity={periodGranularity}
          periodLabel={periodLabel}
          onGranularityChange={setPeriodGranularity}
          onPrevious={() =>
            setPeriodAnchor(shiftAnchor(periodAnchor, periodGranularity, -1))
          }
          onNext={() =>
            setPeriodAnchor(shiftAnchor(periodAnchor, periodGranularity, 1))
          }
        />
      </div>

      <NutritionFilters
        filters={filters}
        onChange={setFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        metric={metric}
        onMetricChange={setMetric}
      />

      <NutritionCharts periodStats={periodStats} metric={metric} />

      <div className="card">
        <h3>Najčešće namirnice u periodu</h3>
        <TopFoodsTable foods={topFoods} />
      </div>

      <div className="card">
        <h3>Istorija unosa</h3>
        <HistoryTable rows={historyRows} />
      </div>

      {(loadingHistory || loadingAnalytics) && (
        <p className="empty-state-small">Učitavanje nutrition analitike...</p>
      )}
    </div>
  );
}

export default NutritionHistoryPage;
