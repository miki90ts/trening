import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";

const PRESET_COLORS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
  "#84cc16",
  "#d946ef",
  "#0ea5e9",
  "#e11d48",
  "#a855f7",
  "#78716c",
];

function ScheduleForm({ selectedDate, onSubmit, initialData, onCancel }) {
  const { exercises } = useApp();
  const [form, setForm] = useState({
    category_id: "",
    scheduled_date: selectedDate || "",
    scheduled_time: "",
    title: "",
    notes: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        category_id: initialData.category_id || "",
        scheduled_date:
          initialData.scheduled_date?.slice(0, 10) || selectedDate || "",
        scheduled_time: initialData.scheduled_time?.slice(0, 5) || "",
        title: initialData.title || "",
        notes: initialData.notes || "",
      });
    } else {
      setForm((f) => ({
        ...f,
        scheduled_date: selectedDate || f.scheduled_date,
      }));
    }
  }, [initialData, selectedDate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.category_id || !form.scheduled_date) return;
    onSubmit({
      ...form,
      category_id: parseInt(form.category_id),
      scheduled_time: form.scheduled_time || null,
    });
  };

  // Grupiši kategorije po vežbi
  const groupedCategories = exercises
    .map((ex) => ({
      exercise: ex,
      categories: ex.categories || [],
    }))
    .filter((g) => g.categories.length > 0);

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Vežba / Kategorija *</label>
        <select
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          required
        >
          <option value="">Izaberi kategoriju</option>
          {groupedCategories.map((g) => (
            <optgroup
              key={g.exercise.id}
              label={`${g.exercise.icon} ${g.exercise.name}`}
            >
              {g.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.value_type})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Datum *</label>
          <input
            type="date"
            value={form.scheduled_date}
            onChange={(e) =>
              setForm({ ...form, scheduled_date: e.target.value })
            }
            required
          />
        </div>
        <div className="form-group">
          <label>Vreme</label>
          <input
            type="time"
            value={form.scheduled_time}
            onChange={(e) =>
              setForm({ ...form, scheduled_time: e.target.value })
            }
          />
        </div>
      </div>

      <div className="form-group">
        <label>Naslov</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="npr. Jutarnji trening"
          maxLength={200}
        />
      </div>

      <div className="form-group">
        <label>Beleške</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Opcione beleške..."
          rows={2}
        />
      </div>

      <div className="schedule-form-actions">
        <button type="submit" className="btn btn-primary">
          {initialData ? "Sačuvaj izmene" : "Zakaži trening"}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Otkaži
          </button>
        )}
      </div>
    </form>
  );
}

export { PRESET_COLORS };
export default ScheduleForm;
