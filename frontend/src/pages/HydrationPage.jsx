import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Card from "../components/common/Card";
import Modal from "../components/common/Modal";
import HydrationPeriodControls from "../components/hydration/HydrationPeriodControls";
import HydrationSummaryCards from "../components/hydration/HydrationSummaryCards";
import HydrationChart from "../components/hydration/HydrationChart";
import HydrationTable from "../components/hydration/HydrationTable";
import HydrationRecords from "../components/hydration/HydrationRecords";
import HydrationStreakCard from "../components/hydration/HydrationStreakCard";
import HydrationQuickAdd from "../components/hydration/HydrationQuickAdd";
import HydrationEntryForm from "../components/hydration/HydrationEntryForm";
import {
  formatHydrationPeriodTitle,
  getPeriodBounds,
  shiftHydrationAnchor,
  toYmd,
} from "../components/hydration/hydrationUtils";
import { useHydration } from "../context/HydrationContext";
import { exportHydrationPdf } from "../components/hydration/export/exportHydrationPdf";

function HydrationPage() {
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
  } = useHydration();

  const [granularity, setGranularity] = useState("7d");
  const [anchor, setAnchor] = useState(toYmd(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [saving, setSaving] = useState(false);

  const periodLabel = useMemo(
    () => formatHydrationPeriodTitle(granularity, anchor),
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
          limit: 2000,
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
        toast.success("Tečnost je uspešno dodana.");
      }
      handleCloseModal();
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAdd = async (option) => {
    try {
      await addEntry({
        entry_date: toYmd(new Date()),
        amount_ml: option.amount,
        drink_type: option.type,
        goal_ml: summary?.current_goal || 2500,
      });
      toast.success(`${option.label} (+${option.amount} ml) ✓`);
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
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
    exportHydrationPdf({
      summary,
      periodStats,
      records,
      streak,
      rows: entries,
      periodLabel,
    });
  };

  return (
    <div className="page hydration-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">💧 Hidratacija</h1>
          <p className="page-subtitle">
            Praćenje dnevnog unosa tečnosti, ciljeva i streak-a
          </p>
        </div>
        <div className="metrics-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportPdf}
          >
            Export (PDF)
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAdd}
          >
            + Ručni unos
          </button>
        </div>
      </div>

      <HydrationSummaryCards summary={summary} />

      <HydrationQuickAdd
        onQuickAdd={handleQuickAdd}
        onManualAdd={handleOpenAdd}
        disabled={saving}
      />

      <HydrationStreakCard streak={streak} />

      <Card className="nutrition-period-card">
        <HydrationPeriodControls
          granularity={granularity}
          periodLabel={periodLabel}
          onGranularityChange={setGranularity}
          onPrevious={() =>
            setAnchor(shiftHydrationAnchor(anchor, granularity, -1))
          }
          onNext={() => setAnchor(shiftHydrationAnchor(anchor, granularity, 1))}
        />
      </Card>

      <HydrationChart
        periodStats={periodStats}
        summary={summary}
        granularity={granularity}
      />

      <HydrationRecords records={records} />

      <Card>
        <h3>Istorija unosa</h3>
        <HydrationTable
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
        title={editingEntry ? "Izmeni unos" : "Novi unos tečnosti"}
      >
        <HydrationEntryForm
          initialData={editingEntry}
          isSubmitting={saving}
          onSubmit={handleSave}
          onCancel={handleCloseModal}
          currentGoal={summary?.current_goal || 2500}
        />
      </Modal>
    </div>
  );
}

export default HydrationPage;
