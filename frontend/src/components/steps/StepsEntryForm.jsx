import React, { useState, useEffect } from "react";
import { toYmd } from "./stepsUtils";

function StepsEntryForm({
  initialData,
  isSubmitting,
  onSubmit,
  onCancel,
  currentGoal,
}) {
  const [stepDate, setStepDate] = useState(toYmd(new Date()));
  const [stepCount, setStepCount] = useState("");
  const [goal, setGoal] = useState(currentGoal || 10000);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (initialData) {
      setStepDate(
        initialData.step_date
          ? toYmd(initialData.step_date)
          : toYmd(new Date()),
      );
      setStepCount(initialData.step_count ?? "");
      setGoal(initialData.goal ?? currentGoal ?? 10000);
      setNotes(initialData.notes || "");
    } else {
      setStepDate(toYmd(new Date()));
      setStepCount("");
      setGoal(currentGoal || 10000);
      setNotes("");
    }
  }, [initialData, currentGoal]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!stepDate || stepCount === "" || stepCount < 0) return;
    onSubmit({
      step_date: stepDate,
      step_count: parseInt(stepCount, 10),
      goal: parseInt(goal, 10),
      notes: notes.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="steps-entry-form">
      <div className="form-group">
        <label className="form-label">Datum</label>
        <input
          type="date"
          className="form-control"
          value={stepDate}
          onChange={(e) => setStepDate(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label">Broj koraka</label>
        <input
          type="number"
          className="form-control"
          value={stepCount}
          onChange={(e) => setStepCount(e.target.value)}
          min="0"
          step="1"
          placeholder="npr. 8500"
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label">Dnevni cilj</label>
        <input
          type="number"
          className="form-control"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          min="0"
          step="100"
          placeholder="10000"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Napomena</label>
        <textarea
          className="form-control"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Opciono..."
        />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Otkaži
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Čuvanje..." : "Sačuvaj"}
        </button>
      </div>
    </form>
  );
}

export default StepsEntryForm;
