import React, { useMemo, useState } from "react";
import { FiTrash2 } from "react-icons/fi";

function FoodItemRow({ item, foods, onChange, onRemove }) {
  const [catalogQuery, setCatalogQuery] = useState("");

  const filteredFoods = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    if (!query) return foods;
    return foods.filter((food) => food.name.toLowerCase().includes(query));
  }, [foods, catalogQuery]);

  const selectedFood = useMemo(
    () => foods.find((food) => String(food.id) === String(item.food_item_id)),
    [foods, item.food_item_id],
  );

  return (
    <div className="nutrition-item-row card">
      <div className="input-mode-toggle nutrition-mode-toggle">
        <button
          type="button"
          className={`mode-btn ${item.mode === "catalog" ? "active" : ""}`}
          onClick={() =>
            onChange({ ...item, mode: "catalog", custom_name: "" })
          }
        >
          Iz liste
        </button>
        <button
          type="button"
          className={`mode-btn ${item.mode === "manual" ? "active" : ""}`}
          onClick={() =>
            onChange({
              ...item,
              mode: "manual",
              food_item_id: "",
            })
          }
        >
          Ručni unos
        </button>
      </div>

      <div className="form-row nutrition-item-main-row">
        {item.mode === "catalog" ? (
          <>
            <div className="form-group">
              <label>Pretraga kataloga</label>
              <input
                type="text"
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                placeholder="Traži namirnicu ili jelo..."
              />
            </div>

            <div className="form-group">
              <label>Namirnica / jelo</label>
              <select
                value={item.food_item_id}
                onChange={(e) =>
                  onChange({ ...item, food_item_id: e.target.value })
                }
              >
                <option value="">Izaberi iz kataloga...</option>
                {filteredFoods.map((food) => (
                  <option key={food.id} value={food.id}>
                    {food.name} ({food.kcal_per_100g} kcal / 100g)
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div className="form-group">
            <label>Naziv (ručni unos)</label>
            <input
              type="text"
              value={item.custom_name}
              onChange={(e) =>
                onChange({ ...item, custom_name: e.target.value })
              }
              placeholder="npr. Domaća pita sa sirom"
            />
          </div>
        )}

        <div className="form-group">
          <label>Količina (g)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={item.amount_grams}
            onChange={(e) =>
              onChange({ ...item, amount_grams: e.target.value })
            }
          />
        </div>
      </div>

      {item.mode === "catalog" && selectedFood && (
        <div className="nutrition-food-preview">
          <span>{selectedFood.kcal_per_100g} kcal / 100g</span>
          <span>P {selectedFood.protein_per_100g} g</span>
          <span>UH {selectedFood.carbs_per_100g} g</span>
          <span>M {selectedFood.fat_per_100g} g</span>
        </div>
      )}

      {item.mode === "manual" && (
        <div className="form-row nutrition-item-macros-row">
          <div className="form-group">
            <label>Kcal / 100g</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={item.kcal_per_100g}
              onChange={(e) =>
                onChange({ ...item, kcal_per_100g: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Proteini / 100g</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={item.protein_per_100g}
              onChange={(e) =>
                onChange({ ...item, protein_per_100g: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>UH / 100g</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={item.carbs_per_100g}
              onChange={(e) =>
                onChange({ ...item, carbs_per_100g: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Masti / 100g</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={item.fat_per_100g}
              onChange={(e) =>
                onChange({ ...item, fat_per_100g: e.target.value })
              }
            />
          </div>
        </div>
      )}

      <div className="nutrition-item-actions">
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={onRemove}
        >
          <FiTrash2 /> Ukloni
        </button>
      </div>
    </div>
  );
}

export default FoodItemRow;
