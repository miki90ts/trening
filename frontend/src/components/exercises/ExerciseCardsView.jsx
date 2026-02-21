import React from "react";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import Card from "../common/Card";

function ExerciseCardsView({
  exercises,
  isAdmin,
  onAddCategory,
  onEditExercise,
  onDeleteExercise,
  onEditCategory,
  onDeleteCategory,
}) {
  if (exercises.length === 0) {
    return <p className="empty-state">Nema vežbi. Dodajte prvu!</p>;
  }

  return (
    <div className="cards-grid">
      {exercises.map((exercise) => (
        <Card key={exercise.id} className="exercise-card">
          <div className="exercise-header">
            <span className="exercise-icon large">{exercise.icon}</span>
            <div>
              <h3>{exercise.name}</h3>
              {exercise.description && (
                <p className="exercise-desc">{exercise.description}</p>
              )}
            </div>
          </div>

          {exercise.categories && exercise.categories.length > 0 && (
            <div className="exercise-categories">
              <h4>Kategorije:</h4>
              <ul>
                {exercise.categories.map((category) => (
                  <li key={category.id}>
                    <span
                      className="cat-color-dot"
                      style={{ backgroundColor: category.color || "#6366f1" }}
                    />
                    <span className="cat-name">{category.name}</span>
                    <span className="cat-type">{category.value_type}</span>
                    {category.has_weight ? (
                      <span className="cat-weight-badge">⚖️</span>
                    ) : null}
                    {isAdmin && (
                      <span
                        style={{
                          marginLeft: "auto",
                          display: "inline-flex",
                          gap: 6,
                        }}
                      >
                        <button
                          className="btn-icon"
                          onClick={() => onEditCategory(category)}
                          title="Izmeni kategoriju"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => onDeleteCategory(category)}
                          title="Obriši kategoriju"
                        >
                          <FiTrash2 />
                        </button>
                      </span>
                    )}
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
                  onClick={() => onAddCategory(exercise)}
                >
                  <FiPlus /> Kategorija
                </button>
                <button
                  className="btn-icon"
                  onClick={() => onEditExercise(exercise)}
                  title="Izmeni"
                >
                  <FiEdit2 />
                </button>
                <button
                  className="btn-icon btn-danger"
                  onClick={() => onDeleteExercise(exercise)}
                  title="Obriši"
                >
                  <FiTrash2 />
                </button>
              </>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

export default ExerciseCardsView;
