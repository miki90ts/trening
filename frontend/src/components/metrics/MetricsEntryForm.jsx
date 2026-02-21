import React, { useState } from "react";
import { formatDateTimeInputValue } from "./metricsUtils";

function MetricsEntryForm({ initialData, isSubmitting, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    metric_datetime: formatDateTimeInputValue(initialData?.metric_datetime),
    weight_kg:
      initialData?.weight_kg !== undefined && initialData?.weight_kg !== null
        ? String(initialData.weight_kg)
        : "",
    notes: initialData?.notes || "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      metric_datetime: formData.metric_datetime,
      weight_kg: formData.weight_kg,
      notes: formData.notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="metrics-form">
      <div className="form-group">
        <label htmlFor="metric_datetime">Datum i vreme</label>
        <input
          id="metric_datetime"
          name="metric_datetime"
          type="datetime-local"
          value={formData.metric_datetime}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="weight_kg">Kilaža (kg)</label>
        <input
          id="weight_kg"
          name="weight_kg"
          type="number"
          step="0.01"
          min="0"
          placeholder="npr. 82.40"
          value={formData.weight_kg}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="notes">Napomena (opciono)</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Jutarnje merenje, posle treninga..."
          value={formData.notes}
          onChange={handleChange}
        />
      </div>

      <div className="metrics-form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>
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

export default MetricsEntryForm;
