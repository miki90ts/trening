import React from "react";
import Modal from "../common/Modal";
import ColorPicker from "../common/ColorPicker";

function CategoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  isEditing,
  form,
  onChange,
  exercises,
  selectedExerciseName,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditing
          ? `Izmeni kategoriju${selectedExerciseName ? ` (${selectedExerciseName})` : ""}`
          : `Nova kategorija${selectedExerciseName ? ` za: ${selectedExerciseName}` : ""}`
      }
    >
      <form onSubmit={onSubmit} className="form">
        <div className="form-group">
          <label>Vežba *</label>
          <select
            value={form.exercise_id}
            onChange={(e) => onChange({ ...form, exercise_id: e.target.value })}
            required
            disabled={isEditing}
          >
            <option value="">Izaberi vežbu...</option>
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.icon} {exercise.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Naziv kategorije *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            required
            placeholder="npr. Iz jedne serije"
          />
        </div>

        <div className="form-group">
          <label>Tip vrednosti</label>
          <select
            value={form.value_type}
            onChange={(e) => onChange({ ...form, value_type: e.target.value })}
          >
            <option value="reps">Ponavljanja (reps)</option>
            <option value="seconds">Sekunde</option>
            <option value="minutes">Minuti</option>
            <option value="meters">Metri</option>
            <option value="kg">Kilogrami</option>
          </select>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.has_weight}
              onChange={(e) =>
                onChange({ ...form, has_weight: e.target.checked })
              }
            />
            <span>Koristi tegove (kg) ⚖️</span>
          </label>
          <small className="form-hint">
            Uključite za vežbe sa tegom (bench press, squat, deadlift...)
          </small>
        </div>

        <div className="form-group">
          <label>Opis</label>
          <textarea
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            placeholder="Opis kategorije"
            rows={2}
          />
        </div>

        <div className="form-group">
          <label>Boja kategorije</label>
          <ColorPicker
            value={form.color}
            onChange={(color) => onChange({ ...form, color })}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-full">
          {isEditing ? "Sačuvaj izmene" : "Dodaj kategoriju"}
        </button>
      </form>
    </Modal>
  );
}

export default CategoryFormModal;
