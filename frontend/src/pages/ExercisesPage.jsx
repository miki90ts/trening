import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/common/Modal";
import Card from "../components/common/Card";
import Loading from "../components/common/Loading";
import { toast } from "react-toastify";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import ColorPicker from "../components/common/ColorPicker";

function ExercisesPage() {
  const {
    exercises,
    loading,
    addExercise,
    editExercise,
    removeExercise,
    addCategory,
  } = useApp();
  const { isAdmin } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", icon: "💪" });
  const [catForm, setCatForm] = useState({
    name: "",
    value_type: "reps",
    has_weight: false,
    description: "",
    color: "#6366f1",
  });
  const [imageFile, setImageFile] = useState(null);

  const openCreate = () => {
    setEditingExercise(null);
    setForm({ name: "", description: "", icon: "💪" });
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (ex) => {
    setEditingExercise(ex);
    setForm({
      name: ex.name,
      description: ex.description || "",
      icon: ex.icon || "💪",
    });
    setImageFile(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form };
      if (imageFile) data.image = imageFile;

      if (editingExercise) {
        await editExercise(editingExercise.id, data);
        toast.success("Vežba ažurirana!");
      } else {
        await addExercise(data);
        toast.success("Vežba dodata!");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error("Greška: " + err.message);
    }
  };

  const handleDelete = async (ex) => {
    if (!window.confirm(`Obrisati vežbu "${ex.name}"?`)) return;
    try {
      await removeExercise(ex.id);
      toast.success("Vežba obrisana!");
    } catch (err) {
      toast.error("Greška: " + err.message);
    }
  };

  const openAddCategory = (ex) => {
    setSelectedExercise(ex);
    setCatForm({
      name: "",
      value_type: "reps",
      has_weight: false,
      description: "",
      color: "#6366f1",
    });
    setCatModalOpen(true);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await addCategory({ ...catForm, exercise_id: selectedExercise.id });
      toast.success("Kategorija dodata!");
      setCatModalOpen(false);
    } catch (err) {
      toast.error("Greška: " + err.message);
    }
  };

  if (loading) return <Loading />;

  const iconOptions = ["💪", "🦵", "🧘", "🏋️", "🔥", "🤸", "⚡", "🎯", "🏃"];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🏋️ Vežbe</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>
            <FiPlus /> Dodaj vežbu
          </button>
        )}
      </div>

      <div className="cards-grid">
        {exercises.map((ex) => (
          <Card key={ex.id} className="exercise-card">
            <div className="exercise-header">
              <span className="exercise-icon large">{ex.icon}</span>
              <div>
                <h3>{ex.name}</h3>
                {ex.description && (
                  <p className="exercise-desc">{ex.description}</p>
                )}
              </div>
            </div>

            {ex.categories && ex.categories.length > 0 && (
              <div className="exercise-categories">
                <h4>Kategorije:</h4>
                <ul>
                  {ex.categories.map((cat) => (
                    <li key={cat.id}>
                      <span
                        className="cat-color-dot"
                        style={{ backgroundColor: cat.color || "#6366f1" }}
                      />
                      <span className="cat-name">{cat.name}</span>
                      <span className="cat-type">{cat.value_type}</span>
                      {cat.has_weight ? (
                        <span className="cat-weight-badge">⚖️</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="card-actions">
              {isAdmin && (
                <>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => openAddCategory(ex)}
                  >
                    <FiPlus /> Kategorija
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => openEdit(ex)}
                    title="Izmeni"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => handleDelete(ex)}
                    title="Obriši"
                  >
                    <FiTrash2 />
                  </button>
                </>
              )}
            </div>
          </Card>
        ))}
        {exercises.length === 0 && (
          <p className="empty-state">Nema vežbi. Dodajte prvu!</p>
        )}
      </div>

      {/* Exercise modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExercise ? "Izmeni vežbu" : "Dodaj vežbu"}
      >
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Naziv *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Naziv vežbe"
            />
          </div>
          <div className="form-group">
            <label>Opis</label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Kratak opis vežbe"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Ikonica</label>
            <div className="icon-picker">
              {iconOptions.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`icon-option ${form.icon === icon ? "selected" : ""}`}
                  onClick={() => setForm({ ...form, icon })}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Slika vežbe</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full">
            {editingExercise ? "Sačuvaj" : "Dodaj"}
          </button>
        </form>
      </Modal>

      {/* Category modal */}
      <Modal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title={`Nova kategorija za: ${selectedExercise?.name}`}
      >
        <form onSubmit={handleAddCategory} className="form">
          <div className="form-group">
            <label>Naziv kategorije *</label>
            <input
              type="text"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              required
              placeholder="npr. Iz jedne serije"
            />
          </div>
          <div className="form-group">
            <label>Tip vrednosti</label>
            <select
              value={catForm.value_type}
              onChange={(e) =>
                setCatForm({ ...catForm, value_type: e.target.value })
              }
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
                checked={catForm.has_weight}
                onChange={(e) =>
                  setCatForm({ ...catForm, has_weight: e.target.checked })
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
              value={catForm.description}
              onChange={(e) =>
                setCatForm({ ...catForm, description: e.target.value })
              }
              placeholder="Opis kategorije"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Boja kategorije</label>
            <ColorPicker
              value={catForm.color}
              onChange={(color) => setCatForm({ ...catForm, color })}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full">
            Dodaj kategoriju
          </button>
        </form>
      </Modal>
    </div>
  );
}

export default ExercisesPage;
