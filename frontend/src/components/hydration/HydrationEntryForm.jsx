import React, { useState, useEffect } from "react";
import { DRINK_TYPES } from "./hydrationUtils";

const toLocalYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getTodayYmd = () => toLocalYmd(new Date());

const normalizeInputDate = (value) => {
  if (!value) return getTodayYmd();

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return toLocalYmd(parsed);
    return value.slice(0, 10);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return getTodayYmd();
  return toLocalYmd(parsed);
};

function HydrationEntryForm({
  initialData,
  isSubmitting,
  onSubmit,
  onCancel,
  currentGoal,
}) {
  const [entryDate, setEntryDate] = useState(getTodayYmd());
  const [amountMl, setAmountMl] = useState("");
  const [drinkType, setDrinkType] = useState("water");
  const [goalMl, setGoalMl] = useState(currentGoal || 2500);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (initialData) {
      setEntryDate(normalizeInputDate(initialData.entry_date));
      setAmountMl(initialData.amount_ml ?? "");
      setDrinkType(initialData.drink_type || "water");
      setGoalMl(initialData.goal_ml ?? currentGoal ?? 2500);
      setNotes(initialData.notes || "");
    } else {
      setEntryDate(getTodayYmd());
      setAmountMl("");
      setDrinkType("water");
      setGoalMl(currentGoal || 2500);
      setNotes("");
    }
  }, [initialData, currentGoal]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!entryDate || amountMl === "" || amountMl < 0) return;
    onSubmit({
      entry_date: entryDate,
      amount_ml: parseInt(amountMl, 10),
      drink_type: drinkType,
      goal_ml: parseInt(goalMl, 10),
      notes: notes.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="hydration-entry-form">
      <div className="form-group">
        <label className="form-label">Datum</label>
        <input
          type="date"
          className="form-control"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label">Količina (ml)</label>
        <input
          type="number"
          className="form-control"
          value={amountMl}
          onChange={(e) => setAmountMl(e.target.value)}
          min="0"
          step="10"
          placeholder="npr. 250"
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label">Tip pića</label>
        <select
          className="form-control"
          value={drinkType}
          onChange={(e) => setDrinkType(e.target.value)}
        >
          {DRINK_TYPES.map((dt) => (
            <option key={dt.key} value={dt.key}>
              {dt.emoji} {dt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Dnevni cilj (ml)</label>
        <input
          type="number"
          className="form-control"
          value={goalMl}
          onChange={(e) => setGoalMl(e.target.value)}
          min="0"
          step="100"
          placeholder="2500"
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
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Čuvam..." : initialData ? "Sačuvaj izmene" : "Dodaj"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Otkaži
        </button>
      </div>
    </form>
  );
}

export default HydrationEntryForm;
