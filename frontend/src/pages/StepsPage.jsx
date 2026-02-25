import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Card from "../components/common/Card";
import Modal from "../components/common/Modal";
import StepsPeriodControls from "../components/steps/StepsPeriodControls";
import StepsSummaryCards from "../components/steps/StepsSummaryCards";
import StepsChart from "../components/steps/StepsChart";
import StepsTable from "../components/steps/StepsTable";
import StepsRecords from "../components/steps/StepsRecords";
import StepsEntryForm from "../components/steps/StepsEntryForm";
import {
  formatStepsPeriodTitle,
  getPeriodBounds,
  shiftStepsAnchor,
  toYmd,
} from "../components/steps/stepsUtils";
import { useSteps } from "../context/StepsContext";
import { exportStepsPdf } from "../components/steps/export/exportStepsPdf";

function StepsPage() {
  const {
    entries,
    periodStats,
    summary,
    records,
    loadingEntries,
    loadingPeriodStats,
    loadingSummary,
    loadEntries,
    loadPeriodStats,
    loadSummary,
    loadRecords,
    addEntry,
    editEntry,
    removeEntry,
  } = useSteps();

  const [granularity, setGranularity] = useState("7d");
  const [anchor, setAnchor] = useState(toYmd(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [saving, setSaving] = useState(false);

  const periodLabel = useMemo(
    () => formatStepsPeriodTitle(granularity, anchor),
    [granularity, anchor]
  );

  const loadAll = async () => {
    try {
      const periodParams = { granularity, anchor };
      const bounds = getPeriodBounds(granularity, anchor);
      await Promise.all([
        loadPeriodStats(periodParams),
        loadSummary(periodParams),
        loadEntries({ start_date: bounds.start, end_date: bounds.end, limit: 1000 }),
        loadRecords(),
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
        toast.success("Koraci su uspešno dodati.");
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
    if (!window.confirm("Da li ste sigurni da želite da obrišete ovaj unos?")) return;
    try {
      await removeEntry(entry.id);
      toast.success("Unos je obrisan.");
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleExportPdf = () => {
    exportStepsPdf({
      summary,
      periodStats,
      records,
      rows: entries,
      periodLabel,
    });
  };

  return (
    <div className="page steps-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">👟 Steps - Koraci</h1>
          <p className="page-subtitle">
            Praćenje dnevnih koraka, ciljeva i ličnih rekorda
          </p>
        </div>
        <div className="metrics-header-actions">
          <button type="button" className="btn btn-secondary" onClick={handleExportPdf}>
            Export (PDF)
          </button>
          <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
            + Dodaj korake
          </button>
        </div>
      </div>

      <StepsSummaryCards summary={summary} />

      <Card className="nutrition-period-card">
        <StepsPeriodControls
          granularity={granularity}
          periodLabel={periodLabel}
          onGranularityChange={setGranularity}
          onPrevious={() => setAnchor(shiftStepsAnchor(anchor, granularity, -1))}
          onNext={() => setAnchor(shiftStepsAnchor(anchor, granularity, 1))}
        />
      </Card>

      <StepsChart periodStats={periodStats} summary={summary} />

      <StepsRecords records={records} />

      <Card>
        <h3>Istorija unosa</h3>
        <StepsTable
          rows={entries}
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
        title={editingEntry ? "Izmeni unos" : "Dodaj korake"}
      >
        <StepsEntryForm
          initialData={editingEntry}
          isSubmitting={saving}
          onSubmit={handleSave}
          onCancel={handleCloseModal}
          currentGoal={summary?.current_goal || 10000}
        />
      </Modal>
    </div>
  );
}

export default StepsPage;
