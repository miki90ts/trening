import React, { useEffect, useMemo, useState } from "react";
import { FiSearch, FiTrash2 } from "react-icons/fi";

function FoodItemRow({ item, foods, onChange, onRemove }) {
  const [catalogQuery, setCatalogQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const computeForAmount = (per100Value) => {
    const amount = parseFloat(item.amount_grams) || 0;
    const per100 = parseFloat(per100Value) || 0;
    return ((amount / 100) * per100).toFixed(1);
  };

  const filteredFoods = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    if (!query) return foods;
    return foods.filter((food) => food.name.toLowerCase().includes(query));
  }, [foods, catalogQuery]);

  const selectedFood = useMemo(
    () => foods.find((food) => String(food.id) === String(item.food_item_id)),
    [foods, item.food_item_id],
  );

  useEffect(() => {
    if (item.mode !== "catalog") return;
    setCatalogQuery(selectedFood?.name || "");
  }, [selectedFood, item.mode]);

  useEffect(() => {
    if (item.mode !== "catalog") {
      setIsDropdownOpen(false);
    }
  }, [item.mode]);

  const handleSelectFood = (food) => {
    onChange({
      ...item,
      food_item_id: String(food.id),
      custom_name: "",
    });
    setCatalogQuery(food.name);
    setIsDropdownOpen(false);
  };

  const showDropdown =
    item.mode === "catalog" &&
    isDropdownOpen &&
    catalogQuery.trim().length >= 2;

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

      <div className="nutrition-item-main-row">
        {item.mode === "catalog" ? (
          <div
            className="meal-item-search-wrapper"
            style={{ margin: "20px 0" }}
          >
            <div className="food-search-input-wrapper">
              <div className="form-group">
                <FiSearch size={14} className="food-search-icon" />
                <input
                  type="text"
                  className="form-control"
                  value={catalogQuery}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setCatalogQuery(nextValue);
                    setIsDropdownOpen(true);

                    if (!nextValue.trim()) {
                      setIsDropdownOpen(false);
                      onChange({
                        ...item,
                        food_item_id: "",
                      });
                    }
                  }}
                  onFocus={() => {
                    if (catalogQuery.trim().length >= 2) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  placeholder="Traži namirnicu ili jelo..."
                />
              </div>
            </div>

            {showDropdown && (
              <div className="food-search-dropdown">
                {filteredFoods.slice(0, 8).map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    className="food-search-option"
                    onClick={() => handleSelectFood(food)}
                  >
                    <span className="food-option-name">{food.name}</span>
                    <span className="food-option-macros">
                      {parseFloat(food.kcal_per_100g)} kcal/100g
                    </span>
                  </button>
                ))}

                {filteredFoods.length === 0 && (
                  <div
                    className="food-search-option"
                    style={{ cursor: "default" }}
                  >
                    <span className="food-option-name">Nema rezultata</span>
                  </div>
                )}
              </div>
            )}
          </div>
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
          <span>{computeForAmount(selectedFood.kcal_per_100g)} kcal</span>
          <span>P {computeForAmount(selectedFood.protein_per_100g)} g</span>
          <span>UH {computeForAmount(selectedFood.carbs_per_100g)} g</span>
          <span>M {computeForAmount(selectedFood.fat_per_100g)} g</span>
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
