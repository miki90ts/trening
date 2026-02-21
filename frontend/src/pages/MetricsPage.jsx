import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Card from "../components/common/Card";
import Modal from "../components/common/Modal";
import MetricsPeriodControls from "../components/metrics/MetricsPeriodControls";
import MetricsSummaryCards from "../components/metrics/MetricsSummaryCards";
import MetricsChart from "../components/metrics/MetricsChart";
import MetricsTable from "../components/metrics/MetricsTable";
import MetricsEntryForm from "../components/metrics/MetricsEntryForm";
import MetricsExportActions from "../components/metrics/MetricsExportActions";
import {
  formatDelta,
  formatDeltaPercent,
  formatMetricsPeriodTitle,
  getPeriodBounds,
  shiftMetricsAnchor,
  toYmd,
} from "../components/metrics/metricsUtils";
import { useMetrics } from "../context/MetricsContext";
import { exportMetricsCsv } from "../components/metrics/export/exportMetricsCsv";
import { exportMetricsPeriodPdf } from "../components/metrics/export/exportMetricsPeriodPdf";

function MetricsPage() {
  const {
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
  } = useMetrics();

  const [granularity, setGranularity] = useState("7d");
  const [anchor, setAnchor] = useState(toYmd(new Date()));
  const [selectedDate, setSelectedDate] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [saving, setSaving] = useState(false);

  const periodLabel = useMemo(
    () => formatMetricsPeriodTitle(granularity, anchor),
    [granularity, anchor],
  );

  const selectedDateInsight = useMemo(() => {
    if (!selectedDate || entries.length === 0) return null;

    const currentWeight = parseFloat(summary?.current_weight);
    if (!Number.isFinite(currentWeight) || currentWeight <= 0) return null;

    const avg =
      entries.reduce((sum, row) => sum + parseFloat(row.weight_kg || 0), 0) /
      entries.length;
    const diff = avg - currentWeight;

    return {
      avg,
      diff,
      percent: (diff / currentWeight) * 100,
    };
  }, [selectedDate, entries, summary]);

  const loadAll = async () => {
    try {
      const periodParams = { granularity, anchor };
      const bounds = getPeriodBounds(granularity, anchor);

      await Promise.all([
        loadPeriodStats(periodParams),
        loadSummary(periodParams),
        selectedDate
          ? loadEntries({ date: selectedDate, limit: 1000 })
          : loadEntries({
              start_date: bounds.start,
              end_date: bounds.end,
              limit: 1000,
            }),
      ]);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  useEffect(() => {
    loadAll();
  }, [granularity, anchor, selectedDate]);

  const handleOpenAdd = () => {
    setEditingEntry(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (entry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingEntry(null);
  };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editingEntry) {
        await editEntry(editingEntry.id, payload);
        toast.success("Merenje je uspešno izmenjeno.");
      } else {
        await addEntry(payload);
        toast.success("Merenje je uspešno dodato.");
      }

      handleCloseModal();
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    const confirmed = window.confirm(
      "Da li ste sigurni da želite da obrišete ovo merenje?",
    );
    if (!confirmed) return;

    try {
      await removeEntry(entry.id);
      toast.success("Merenje je obrisano.");
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleExportCsv = () => {
    exportMetricsCsv(entries);
  };

  const handleExportPdf = () => {
    exportMetricsPeriodPdf({
      summary,
      periodStats,
      rows: entries,
      periodLabel,
    });
  };

  return (
    <div className="page metrics-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">⚖️ Metrics - Kilaža</h1>
          <p className="page-subtitle">
            Praćenje telesne težine, trendova i promene kroz period
          </p>
        </div>
        <div className="metrics-header-actions">
          <MetricsExportActions
            onExportCsv={handleExportCsv}
            onExportPdf={handleExportPdf}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAdd}
          >
            + Dodaj merenje
          </button>
        </div>
      </div>

      <MetricsSummaryCards summary={summary} periodLabel={periodLabel} />

      <Card className="nutrition-period-card">
        <MetricsPeriodControls
          granularity={granularity}
          periodLabel={periodLabel}
          onGranularityChange={setGranularity}
          onPrevious={() =>
            setAnchor(shiftMetricsAnchor(anchor, granularity, -1))
          }
          onNext={() => setAnchor(shiftMetricsAnchor(anchor, granularity, 1))}
        />
      </Card>

      <Card className="metrics-filter-card">
        <div className="metrics-filter-row">
          <div className="form-group metrics-date-filter">
            <label htmlFor="metrics-date-filter">Pretraga po datumu</label>
            <input
              id="metrics-date-filter"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setSelectedDate("")}
            disabled={!selectedDate}
          >
            Reset datuma
          </button>
        </div>

        {selectedDateInsight && (
          <p className="metrics-date-insight">
            Izabrani datum vs trenutna kilaža:{" "}
            {formatDelta(selectedDateInsight.diff)} (
            {formatDeltaPercent(selectedDateInsight.percent)})
          </p>
        )}
      </Card>

      <MetricsChart periodStats={periodStats} />

      <Card>
        <h3>Istorija merenja</h3>
        <MetricsTable
          rows={entries}
          currentWeight={summary?.current_weight}
          periodAverage={summary?.period_avg_weight}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
        />
      </Card>

      {(loadingEntries || loadingPeriodStats || loadingSummary) && (
        <p className="empty-state-small">Učitavanje metrics podataka...</p>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingEntry ? "Izmeni merenje" : "Dodaj merenje"}
      >
        <MetricsEntryForm
          initialData={editingEntry}
          isSubmitting={saving}
          onSubmit={handleSave}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}

export default MetricsPage;
