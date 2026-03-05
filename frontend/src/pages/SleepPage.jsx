import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Card from "../components/common/Card";
import Modal from "../components/common/Modal";
import SleepPeriodControls from "../components/sleep/SleepPeriodControls";
import SleepSummaryCards from "../components/sleep/SleepSummaryCards";
import SleepChart from "../components/sleep/SleepChart";
import SleepTable from "../components/sleep/SleepTable";
import SleepRecords from "../components/sleep/SleepRecords";
import SleepStreakCard from "../components/sleep/SleepStreakCard";
import SleepEntryForm from "../components/sleep/SleepEntryForm";
import {
  formatSleepPeriodTitle,
  getPeriodBounds,
  shiftSleepAnchor,
  toYmd,
} from "../components/sleep/sleepUtils";
import { useSleep } from "../context/SleepContext";
import { exportSleepPdf } from "../components/sleep/export/exportSleepPdf";
import { exportSleepCsv } from "../components/sleep/export/exportSleepCsv";

function SleepPage() {
  const {
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
  } = useSleep();

  const [granularity, setGranularity] = useState("7d");
  const [anchor, setAnchor] = useState(toYmd(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [saving, setSaving] = useState(false);

  const periodLabel = useMemo(
    () => formatSleepPeriodTitle(granularity, anchor),
    [granularity, anchor],
  );

  const loadAll = async () => {
    try {
      const periodParams = { granularity, anchor };
      const bounds = getPeriodBounds(granularity, anchor);
      await Promise.all([
        loadPeriodStats(periodParams),
        loadSummary(periodParams),
        loadEntries({
          start_date: bounds.start,
          end_date: bounds.end,
          limit: 1000,
        }),
        loadRecords(),
        loadStreak(),
      ]);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  useEffect(() => {
    loadAll();
  }, [granularity, anchor]);

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
        toast.success("Unos je uspešno izmenjen.");
      } else {
        await addEntry(payload);
        toast.success("San je uspešno dodat.");
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
    if (!window.confirm("Da li ste sigurni da želite da obrišete ovaj unos?"))
      return;
    try {
      await removeEntry(entry.id);
      toast.success("Unos je obrisan.");
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleExportPdf = () => {
    exportSleepPdf({
      summary,
      periodStats,
      records,
      streak,
      rows: entries,
      periodLabel,
    });
  };

  const handleExportCsv = () => {
    exportSleepCsv({
      rows: entries,
      periodStats,
      granularity,
    });
  };

  return (
    <div className="page sleep-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🌙 Sleep - Praćenje sna</h1>
          <p className="page-subtitle">
            Praćenje spavanja, faza sna, HR/HRV biometrije i ličnih rekorda
          </p>
        </div>
        <div className="metrics-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCsv}
          >
            Export (CSV)
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleExportPdf}
          >
            Export (PDF)
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAdd}
          >
            + Dodaj san
          </button>
        </div>
      </div>

      <SleepSummaryCards summary={summary} />

      <SleepStreakCard streak={streak} />

      <Card className="nutrition-period-card">
        <SleepPeriodControls
          granularity={granularity}
          periodLabel={periodLabel}
          onGranularityChange={setGranularity}
          onPrevious={() =>
            setAnchor(shiftSleepAnchor(anchor, granularity, -1))
          }
          onNext={() => setAnchor(shiftSleepAnchor(anchor, granularity, 1))}
        />
      </Card>

      <SleepChart
        periodStats={periodStats}
        summary={summary}
        granularity={granularity}
      />

      <SleepRecords records={records} />

      <Card>
        <h3>Istorija unosa</h3>
        <SleepTable
          rows={entries}
          periodStats={periodStats}
          granularity={granularity}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
        />
      </Card>

      {(loadingEntries || loadingPeriodStats || loadingSummary) && (
        <p className="empty-state-small">Učitavanje podataka...</p>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingEntry ? "Izmeni unos sna" : "Dodaj san"}
      >
        <SleepEntryForm
          initialData={editingEntry}
          isSubmitting={saving}
          onSubmit={handleSave}
          onCancel={handleCloseModal}
          currentTarget={summary?.current_target || 480}
        />
      </Modal>
    </div>
  );
}

export default SleepPage;
