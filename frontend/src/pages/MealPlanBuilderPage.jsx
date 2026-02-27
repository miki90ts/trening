import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import * as api from "../services/api";
import Loading from "../components/common/Loading";
import {
  FiArrowLeft,
  FiPlus,
  FiChevronUp,
  FiChevronDown,
  FiSave,
  FiCopy,
  FiTrash2,
  FiSearch,
  FiX,
} from "react-icons/fi";

const COLORS = [
  "#10b981",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
  "#06b6d4",
];

const MEAL_TYPES = [
  { value: "breakfast", label: "🌅 Doručak" },
  { value: "lunch", label: "☀️ Ručak" },
  { value: "dinner", label: "🌙 Večera" },
  { value: "snack", label: "🍎 Užina" },
];

function MealPlanBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const copyFromId = searchParams.get("copyFrom");
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#10b981");
  const [planMeals, setPlanMeals] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Za food search
  const [foods, setFoods] = useState([]);
  const [foodSearch, setFoodSearch] = useState({});

  // Za copy-from dropdown
  const [allPlans, setAllPlans] = useState([]);
  const [showCopyPicker, setShowCopyPicker] = useState(false);

  // Učitaj food katalog i listu planova
  useEffect(() => {
    api
      .getFoods({ limit: 9999 })
      .then((data) => {
        setFoods(Array.isArray(data) ? data : data.items || []);
      })
      .catch(() => {});
    api
      .getMealPlans()
      .then(setAllPlans)
      .catch(() => {});
  }, []);

  // Učitaj plan za edit ili copy
  const loadPlan = useCallback(async (planId, isCopy) => {
    setLoading(true);
    try {
      const plan = await api.getMealPlan(planId);
      if (isCopy) {
        setName(plan.name + " (kopija)");
      } else {
        setName(plan.name);
      }
      setDescription(plan.description || "");
      setColor(plan.color || "#10b981");
      setPlanMeals(
        plan.meals.map((m) => ({
          meal_type: m.meal_type,
          notes: m.notes || "",
          expanded: true,
          items: (m.items || []).map((item) => ({
            food_item_id: item.food_item_id ? String(item.food_item_id) : "",
            food_item_name: item.food_item_name || "",
            custom_name: item.custom_name || "",
            amount_grams: String(parseFloat(item.amount_grams)),
            kcal_per_100g: String(parseFloat(item.kcal_per_100g)),
            protein_per_100g: String(parseFloat(item.protein_per_100g)),
            carbs_per_100g: String(parseFloat(item.carbs_per_100g)),
            fat_per_100g: String(parseFloat(item.fat_per_100g)),
          })),
        })),
      );
    } catch {
      toast.error("Greška pri učitavanju plana");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isEdit) {
      loadPlan(id, false);
    } else if (copyFromId) {
      loadPlan(copyFromId, true);
    }
  }, [id, copyFromId, isEdit, loadPlan]);

  const handleCopyFrom = async (planId) => {
    await loadPlan(planId, true);
    setShowCopyPicker(false);
    toast.info("Plan kopiran — prilagodi po želji i sačuvaj");
  };

  // ---- Meal CRUD ----
  const addMeal = (mealType) => {
    setPlanMeals((prev) => [
      ...prev,
      {
        meal_type: mealType,
        notes: "",
        expanded: true,
        items: [
          {
            food_item_id: "",
            food_item_name: "",
            custom_name: "",
            amount_grams: "100",
            kcal_per_100g: "0",
            protein_per_100g: "0",
            carbs_per_100g: "0",
            fat_per_100g: "0",
          },
        ],
      },
    ]);
  };

  const removeMeal = (idx) => {
    setPlanMeals((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleExpand = (idx) => {
    setPlanMeals((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, expanded: !m.expanded } : m)),
    );
  };

  const moveMeal = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= planMeals.length) return;
    setPlanMeals((prev) => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const updateMealNotes = (idx, notes) => {
    setPlanMeals((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, notes } : m)),
    );
  };

  // ---- Item CRUD ----
  const addItem = (mealIdx) => {
    setPlanMeals((prev) =>
      prev.map((m, i) =>
        i === mealIdx
          ? {
              ...m,
              items: [
                ...m.items,
                {
                  food_item_id: "",
                  food_item_name: "",
                  custom_name: "",
                  amount_grams: "100",
                  kcal_per_100g: "0",
                  protein_per_100g: "0",
                  carbs_per_100g: "0",
                  fat_per_100g: "0",
                },
              ],
            }
          : m,
      ),
    );
  };

  const removeItem = (mealIdx, itemIdx) => {
    setPlanMeals((prev) =>
      prev.map((m, i) => {
        if (i !== mealIdx) return m;
        return { ...m, items: m.items.filter((_, j) => j !== itemIdx) };
      }),
    );
  };

  const updateItem = (mealIdx, itemIdx, field, value) => {
    setPlanMeals((prev) =>
      prev.map((m, i) => {
        if (i !== mealIdx) return m;
        return {
          ...m,
          items: m.items.map((item, j) =>
            j === itemIdx ? { ...item, [field]: value } : item,
          ),
        };
      }),
    );
  };

  const selectFood = (mealIdx, itemIdx, food) => {
    setPlanMeals((prev) =>
      prev.map((m, i) => {
        if (i !== mealIdx) return m;
        return {
          ...m,
          items: m.items.map((item, j) => {
            if (j !== itemIdx) return item;
            return {
              ...item,
              food_item_id: String(food.id),
              food_item_name: food.name,
              custom_name: "",
              kcal_per_100g: String(parseFloat(food.kcal_per_100g)),
              protein_per_100g: String(parseFloat(food.protein_per_100g)),
              carbs_per_100g: String(parseFloat(food.carbs_per_100g)),
              fat_per_100g: String(parseFloat(food.fat_per_100g)),
            };
          }),
        };
      }),
    );
    setFoodSearch((prev) => ({ ...prev, [`${mealIdx}_${itemIdx}`]: "" }));
  };

  // Compute item consumed values
  const computeConsumed = (amountStr, per100Str) => {
    const amount = parseFloat(amountStr) || 0;
    const per100 = parseFloat(per100Str) || 0;
    return ((amount / 100) * per100).toFixed(1);
  };

  // Meal type options not yet used
  const availableMealTypes = useMemo(() => {
    const usedTypes = planMeals.map((m) => m.meal_type);
    return MEAL_TYPES.filter((mt) => !usedTypes.includes(mt.value));
  }, [planMeals]);

  // ---- Save ----
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Unesite naziv plana");
      return;
    }
    if (planMeals.length === 0) {
      toast.error("Dodajte bar jedan obrok");
      return;
    }

    for (let i = 0; i < planMeals.length; i++) {
      const meal = planMeals[i];
      if (meal.items.length === 0) {
        toast.error(
          `${MEAL_TYPES.find((mt) => mt.value === meal.meal_type)?.label || "Obrok"}: dodajte bar jednu stavku`,
        );
        return;
      }
      for (let j = 0; j < meal.items.length; j++) {
        const item = meal.items[j];
        if (!item.food_item_id && !item.custom_name.trim()) {
          toast.error(
            `Obrok #${i + 1}, stavka #${j + 1}: izaberite namirnicu ili unesite naziv`,
          );
          return;
        }
      }
    }

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      meals: planMeals.map((m) => ({
        meal_type: m.meal_type,
        notes: m.notes || null,
        items: m.items.map((item) => ({
          food_item_id: item.food_item_id ? parseInt(item.food_item_id) : null,
          custom_name: item.custom_name || null,
          amount_grams: parseFloat(item.amount_grams) || 100,
          kcal_per_100g: parseFloat(item.kcal_per_100g) || 0,
          protein_per_100g: parseFloat(item.protein_per_100g) || 0,
          carbs_per_100g: parseFloat(item.carbs_per_100g) || 0,
          fat_per_100g: parseFloat(item.fat_per_100g) || 0,
        })),
      })),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.updateMealPlan(id, data);
        toast.success("Plan ishrane ažuriran!");
      } else {
        await api.createMealPlan(data);
        toast.success("Plan ishrane kreiran!");
      }
      navigate("/meal-plans");
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="page plan-builder-page meal-plan-builder-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <button
            className="btn btn-ghost"
            onClick={() => navigate("/meal-plans")}
          >
            <FiArrowLeft /> Nazad
          </button>
          <h1 className="page-title">
            {isEdit ? "✏️ Izmeni plan ishrane" : "🍽️ Novi plan ishrane"}
          </h1>
        </div>
        <div className="page-header-actions">
          {!isEdit && allPlans.length > 0 && (
            <button
              className="btn btn-outline"
              onClick={() => setShowCopyPicker(!showCopyPicker)}
            >
              <FiCopy /> Kopiraj od postojećeg
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            <FiSave />{" "}
            {saving ? "Čuvanje..." : isEdit ? "Sačuvaj izmene" : "Kreiraj plan"}
          </button>
        </div>
      </div>

      {/* Copy from picker */}
      {showCopyPicker && (
        <div className="copy-plan-picker card">
          <div className="copy-plan-picker-header">
            <h4>
              <FiCopy /> Izaberi plan za kopiranje
            </h4>
            <button
              className="btn-icon-sm"
              onClick={() => setShowCopyPicker(false)}
            >
              <FiTrash2 />
            </button>
          </div>
          <p className="copy-plan-picker-desc">
            Svi podaci će se učitati — samo prilagodi i sačuvaj kao novi plan.
          </p>
          <div className="copy-plan-list">
            {allPlans.map((p) => (
              <button
                key={p.id}
                className="copy-plan-item"
                onClick={() => handleCopyFrom(p.id)}
              >
                <span
                  className="copy-plan-color"
                  style={{ background: p.color || "#10b981" }}
                />
                <span className="copy-plan-name">{p.name}</span>
                <span className="copy-plan-count">{p.meal_count} obroka</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="plan-builder-form-page">
        {/* Basic info */}
        <div className="plan-builder-basics card">
          <div className="plan-builder-basics-grid">
            <div className="form-group">
              <label>Naziv plana *</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="npr. Keto Dan, Visoko Protein..."
              />
            </div>
            <div className="form-group">
              <label>Opis</label>
              <input
                type="text"
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcioni opis plana"
              />
            </div>
            <div className="form-group">
              <label>Boja</label>
              <div className="plan-color-picker">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`plan-color-btn ${color === c ? "active" : ""}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Meals section */}
        <div className="plan-builder-exercises-section">
          <div className="plan-exercises-header">
            <h3>Obroci ({planMeals.length})</h3>
            {availableMealTypes.length > 0 && (
              <div className="meal-add-buttons">
                {availableMealTypes.map((mt) => (
                  <button
                    key={mt.value}
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => addMeal(mt.value)}
                  >
                    <FiPlus /> {mt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {planMeals.length === 0 && (
            <div className="plan-no-exercises">
              <p>Nema obroka. Dodaj doručak, ručak, večeru ili užinu.</p>
            </div>
          )}

          <div className="plan-exercises-list">
            {planMeals.map((meal, mealIdx) => {
              const mealLabel =
                MEAL_TYPES.find((mt) => mt.value === meal.meal_type)?.label ||
                meal.meal_type;

              // Compute meal totals
              const mealTotals = meal.items.reduce(
                (acc, item) => {
                  const amt = parseFloat(item.amount_grams) || 0;
                  acc.kcal +=
                    (amt / 100) * (parseFloat(item.kcal_per_100g) || 0);
                  acc.protein +=
                    (amt / 100) * (parseFloat(item.protein_per_100g) || 0);
                  acc.carbs +=
                    (amt / 100) * (parseFloat(item.carbs_per_100g) || 0);
                  acc.fat += (amt / 100) * (parseFloat(item.fat_per_100g) || 0);
                  return acc;
                },
                { kcal: 0, protein: 0, carbs: 0, fat: 0 },
              );

              return (
                <div key={mealIdx} className="plan-exercise-card meal-card">
                  <div
                    className="plan-exercise-header"
                    onClick={() => toggleExpand(mealIdx)}
                  >
                    <div className="plan-exercise-title">
                      <span className="plan-exercise-num">#{mealIdx + 1}</span>
                      <span>{mealLabel}</span>
                      <span className="plan-exercise-cat meal-totals-badge">
                        {mealTotals.kcal.toFixed(0)} kcal · P:
                        {mealTotals.protein.toFixed(0)}g · C:
                        {mealTotals.carbs.toFixed(0)}g · F:
                        {mealTotals.fat.toFixed(0)}g
                      </span>
                    </div>
                    <div className="plan-exercise-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveMeal(mealIdx, -1);
                        }}
                        disabled={mealIdx === 0}
                        title="Gore"
                      >
                        <FiChevronUp />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveMeal(mealIdx, 1);
                        }}
                        disabled={mealIdx === planMeals.length - 1}
                        title="Dole"
                      >
                        <FiChevronDown />
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMeal(mealIdx);
                        }}
                        title="Ukloni"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>

                  {meal.expanded && (
                    <div className="plan-exercise-body">
                      {/* Items */}
                      {meal.items.map((item, itemIdx) => {
                        const searchKey = `${mealIdx}_${itemIdx}`;
                        const searchTerm = foodSearch[searchKey] || "";
                        const filteredFoods =
                          searchTerm.length >= 2
                            ? foods
                                .filter((f) =>
                                  f.name
                                    .toLowerCase()
                                    .includes(searchTerm.toLowerCase()),
                                )
                                .slice(0, 10)
                            : [];

                        return (
                          <div key={itemIdx} className="meal-item-row">
                            {/* Food selection */}
                            <div className="meal-item-food-select">
                              {item.food_item_id ? (
                                <div className="meal-item-selected-food">
                                  <div className="meal-item-header">
                                    <span className="set-number">
                                      #{itemIdx + 1}
                                    </span>
                                    <span className="selected-food-name">
                                      {item.food_item_name ||
                                        `Namirnica #${item.food_item_id}`}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="meal-item-search-wrapper">
                                  <div className="food-search-input-wrapper">
                                    <div className="form-group">
                                      <FiSearch
                                        size={14}
                                        className="food-search-icon"
                                      />

                                      <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Traži namirnicu iz kataloga..."
                                        value={searchTerm}
                                        onChange={(e) =>
                                          setFoodSearch((prev) => ({
                                            ...prev,
                                            [searchKey]: e.target.value,
                                          }))
                                        }
                                      />
                                    </div>
                                  </div>
                                  {filteredFoods.length > 0 && (
                                    <div className="food-search-dropdown">
                                      {filteredFoods.map((f) => (
                                        <button
                                          key={f.id}
                                          type="button"
                                          className="food-search-option"
                                          onClick={() =>
                                            selectFood(mealIdx, itemIdx, f)
                                          }
                                        >
                                          <span className="food-option-name">
                                            {f.name}
                                          </span>
                                          <span className="food-option-macros">
                                            {parseFloat(f.kcal_per_100g)}kcal ·
                                            P:{parseFloat(f.protein_per_100g)}g
                                            · C:{parseFloat(f.carbs_per_100g)}g
                                            · F:{parseFloat(f.fat_per_100g)}g
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <div className="meal-item-or-divider">
                                    <span>ili ručni unos:</span>
                                  </div>
                                  <div className="form-group">
                                    <input
                                      type="text"
                                      className="form-control"
                                      placeholder="Naziv (ručni unos)"
                                      value={item.custom_name}
                                      onChange={(e) =>
                                        updateItem(
                                          mealIdx,
                                          itemIdx,
                                          "custom_name",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="meal-item-row-actions">
                              <button
                                type="button"
                                className="btn-icon btn-danger"
                                onClick={() => removeItem(mealIdx, itemIdx)}
                                title="Ukloni stavku"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>

                            {/* Amount and macros */}
                            <div className="meal-item-macros-row">
                              <div className="form-group">
                                <label>Grama</label>
                                <input
                                  type="number"
                                  className="form-control"
                                  step="1"
                                  min="1"
                                  value={item.amount_grams}
                                  onChange={(e) =>
                                    updateItem(
                                      mealIdx,
                                      itemIdx,
                                      "amount_grams",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="100"
                                />
                              </div>

                              {!item.food_item_id && (
                                <>
                                  <div className="form-group">
                                    <label>Kcal/100g</label>
                                    <input
                                      type="number"
                                      className="form-control"
                                      step="0.1"
                                      min="0"
                                      value={item.kcal_per_100g}
                                      onChange={(e) =>
                                        updateItem(
                                          mealIdx,
                                          itemIdx,
                                          "kcal_per_100g",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label>Prot/100g</label>
                                    <input
                                      type="number"
                                      className="form-control"
                                      step="0.1"
                                      min="0"
                                      value={item.protein_per_100g}
                                      onChange={(e) =>
                                        updateItem(
                                          mealIdx,
                                          itemIdx,
                                          "protein_per_100g",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label>Carb/100g</label>
                                    <input
                                      type="number"
                                      className="form-control"
                                      step="0.1"
                                      min="0"
                                      value={item.carbs_per_100g}
                                      onChange={(e) =>
                                        updateItem(
                                          mealIdx,
                                          itemIdx,
                                          "carbs_per_100g",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label>Fat/100g</label>
                                    <input
                                      type="number"
                                      className="form-control"
                                      step="0.1"
                                      min="0"
                                      value={item.fat_per_100g}
                                      onChange={(e) =>
                                        updateItem(
                                          mealIdx,
                                          itemIdx,
                                          "fat_per_100g",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="0"
                                    />
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Computed consumed */}
                            <div className="meal-item-computed">
                              <span>
                                {computeConsumed(
                                  item.amount_grams,
                                  item.kcal_per_100g,
                                )}{" "}
                                kcal
                              </span>
                              <span>
                                P:{" "}
                                {computeConsumed(
                                  item.amount_grams,
                                  item.protein_per_100g,
                                )}
                                g
                              </span>
                              <span>
                                C:{" "}
                                {computeConsumed(
                                  item.amount_grams,
                                  item.carbs_per_100g,
                                )}
                                g
                              </span>
                              <span>
                                F:{" "}
                                {computeConsumed(
                                  item.amount_grams,
                                  item.fat_per_100g,
                                )}
                                g
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        className="btn btn-sm btn-ghost plan-add-set-btn"
                        onClick={() => addItem(mealIdx)}
                      >
                        <FiPlus /> Dodaj stavku
                      </button>

                      <div
                        className="form-group"
                        style={{ marginTop: "0.5rem" }}
                      >
                        <label>Napomena za obrok</label>
                        <input
                          type="text"
                          className="form-control"
                          value={meal.notes}
                          onChange={(e) =>
                            updateMealNotes(mealIdx, e.target.value)
                          }
                          placeholder="Opciona napomena za obrok"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom save */}
        <div className="plan-builder-bottom-actions">
          <button
            className="btn btn-ghost"
            onClick={() => navigate("/meal-plans")}
          >
            Otkaži
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            <FiSave />{" "}
            {saving ? "Čuvanje..." : isEdit ? "Sačuvaj izmene" : "Kreiraj plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MealPlanBuilderPage;
