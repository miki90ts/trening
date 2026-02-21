import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/common/Modal";
import Loading from "../components/common/Loading";
import { toast } from "react-toastify";
import { FiPlus } from "react-icons/fi";
import ExerciseCardsView from "../components/exercises/ExerciseCardsView";
import CategoriesDataTableView from "../components/exercises/CategoriesDataTableView";
import CategoryFormModal from "../components/exercises/CategoryFormModal";

function ExercisesPage() {
  const {
    exercises,
    categories,
    loading,
    addExercise,
    editExercise,
    removeExercise,
    addCategory,
    editCategory,
    removeCategory,
  } = useApp();
  const { isAdmin } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState("card");
  const [editingExercise, setEditingExercise] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", icon: "💪" });
  const [catForm, setCatForm] = useState({
    exercise_id: "",
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
    setEditingCategory(null);
    setSelectedExercise(ex);
    setCatForm({
      exercise_id: String(ex.id),
      name: "",
      value_type: "reps",
      has_weight: false,
      description: "",
      color: "#6366f1",
    });
    setCategoryModalOpen(true);
  };

  const openEditCategory = (category) => {
    setEditingCategory(category);
    setSelectedExercise(
      exercises.find((ex) => ex.id === category.exercise_id) || null,
    );
    setCatForm({
      exercise_id: String(category.exercise_id),
      name: category.name || "",
      value_type: category.value_type || "reps",
      has_weight: Boolean(category.has_weight),
      description: category.description || "",
      color: category.color || "#6366f1",
    });
    setCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (!catForm.exercise_id) {
        toast.error("Izaberite vežbu za kategoriju.");
        return;
      }

      if (editingCategory) {
        await editCategory(editingCategory.id, {
          name: catForm.name,
          value_type: catForm.value_type,
          has_weight: catForm.has_weight,
          description: catForm.description,
          color: catForm.color,
        });
        toast.success("Kategorija ažurirana!");
      } else {
        await addCategory({
          ...catForm,
          exercise_id: parseInt(catForm.exercise_id, 10),
        });
        toast.success("Kategorija dodata!");
      }
      setCategoryModalOpen(false);
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Obrisati kategoriju "${category.name}"?`)) return;
    try {
      await removeCategory(category.id);
      toast.success("Kategorija obrisana!");
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <Loading />;

  const iconOptions = ["💪", "🦵", "🧘", "🏋️", "🔥", "🤸", "⚡", "🎯", "🏃"];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🏋️ Vežbe</h1>
        <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
          <div className="input-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${viewMode === "card" ? "active" : ""}`}
              onClick={() => setViewMode("card")}
            >
              Card prikaz
            </button>
            <button
              type="button"
              className={`mode-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
            >
              Tabelarni prikaz
            </button>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={openCreate}>
              <FiPlus /> Dodaj vežbu
            </button>
          )}
        </div>
      </div>

      {viewMode === "card" ? (
        <ExerciseCardsView
          exercises={exercises}
          isAdmin={isAdmin}
          onAddCategory={openAddCategory}
          onEditExercise={openEdit}
          onDeleteExercise={handleDelete}
          onEditCategory={openEditCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      ) : (
        <CategoriesDataTableView
          categories={categories}
          isAdmin={isAdmin}
          onEditCategory={openEditCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      )}

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

      <CategoryFormModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSubmit={handleCategorySubmit}
        isEditing={Boolean(editingCategory)}
        form={catForm}
        onChange={setCatForm}
        exercises={exercises}
        selectedExerciseName={selectedExercise?.name}
      />
    </div>
  );
}

export default ExercisesPage;
