import React, { useEffect, useState } from "react";
import {
  MEDICAL_EVENT_TYPE_OPTIONS,
  getMedicalEventDurationDays,
  normalizeMedicalEventDate,
} from "./medicalEventUtils";

function toYmd(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

function MedicalEventForm({ initialData, isSubmitting, onSubmit, onCancel }) {
  const [eventType, setEventType] = useState("illness");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(toYmd());
  const [endDate, setEndDate] = useState(toYmd());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (initialData) {
      setEventType(initialData.event_type || "illness");
      setTitle(initialData.title || "");
      setStartDate(
        normalizeMedicalEventDate(initialData.start_date) || toYmd(),
      );
      setEndDate(
        normalizeMedicalEventDate(initialData.end_date) ||
          normalizeMedicalEventDate(initialData.start_date) ||
          toYmd(),
      );
      setNotes(initialData.notes || "");
      return;
    }

    const today = toYmd();
    setEventType("illness");
    setTitle("");
    setStartDate(today);
    setEndDate(today);
    setNotes("");
  }, [initialData]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!title.trim() || !startDate || !endDate) {
      return;
    }

    onSubmit({
      event_type: eventType,
      title: title.trim(),
      start_date: startDate,
      end_date: endDate,
      notes: notes.trim() || null,
    });
  };

  const durationDays =
    startDate && endDate && startDate <= endDate
      ? getMedicalEventDurationDays(startDate, endDate)
      : null;

  return (
    <form onSubmit={handleSubmit} className="medical-event-form">
      <div className="form-group">
        <label className="form-label">Tip događaja</label>
        <select
          className="form-control"
          value={eventType}
          onChange={(event) => setEventType(event.target.value)}
          required
        >
          {MEDICAL_EVENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.icon} {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Naziv</label>
        <input
          type="text"
          className="form-control"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="npr. Viroza, istegnuće skočnog zgloba, operacija"
          maxLength={160}
          required
        />
      </div>

      <div className="medical-event-form-row">
        <div className="form-group">
          <label className="form-label">Početni datum</label>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(event) => {
              const nextStartDate = event.target.value;
              setStartDate(nextStartDate);
              if (endDate < nextStartDate) {
                setEndDate(nextStartDate);
              }
            }}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Krajnji datum</label>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            min={startDate}
            required
          />
          <span className="form-hint">
            {durationDays
              ? `Trajanje: ${durationDays} ${durationDays === 1 ? "dan" : "dana"}`
              : "Izaberi validan period."}
          </span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Beleške</label>
        <textarea
          className="form-control"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          placeholder="Opiši simptome, ograničenja ili bitne detalje..."
        />
      </div>

      <div className="metrics-form-actions">
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

export default MedicalEventForm;
