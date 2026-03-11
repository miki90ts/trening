import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as api from "../services/api";
import Loading from "../components/common/Loading";
import {
  FiArrowLeft,
  FiCheck,
  FiCheckCircle,
  FiPlus,
  FiX,
  FiSave,
  FiChevronDown,
  FiChevronUp,
  FiTrash2,
  FiSearch,
} from "react-icons/fi";

const MEAL_TYPE_LABELS = {
  breakfast: "🌅 Doručak",
  lunch: "☀️ Ručak",
  dinner: "🌙 Večera",
  snack: "🍎 Užina",
};

const MEAL_TYPES = [
  { value: "breakfast", label: "🌅 Doručak" },
  { value: "lunch", label: "☀️ Ručak" },
  { value: "dinner", label: "🌙 Večera" },
  { value: "snack", label: "🍎 Užina" },
];

function MealSessionExecutionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState({});

  // Za dodavanje novih stavki
  const [foods, setFoods] = useState([]);
  const [addingItem, setAddingItem] = useState(null); // mealIdx
  const [foodSearch, setFoodSearch] = useState("");
  const [newCustomName, setNewCustomName] = useState("");
  const [newAmount, setNewAmount] = useState("100");
  const [newMacros, setNewMacros] = useState({
    kcal: "0",
    protein: "0",
    carbs: "0",
    fat: "0",
  });

  useEffect(() => {
    api
      .getFoods({ limit: 9999 })
      .then((data) => {
        setFoods(Array.isArray(data) ? data : data.items || []);
      })
      .catch(() => {});
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const data = await api.getMealSession(sessionId);
      setSession(data);

      // Ako je sesija scheduled, automatski startuj
      if (data.status === "scheduled") {
        await api.startMealSession(sessionId);
        data.status = "in_progress";
        data.started_at = new Date().toISOString();
      }

      // Expand sve po default-u
      const expanded = {};
      data.meals?.forEach((m) => {
        expanded[m.id] = true;
      });
      setExpandedMeals(expanded);

      setLoading(false);
    } catch (err) {
      toast.error("Greška pri učitavanju sesije");
      navigate("/meal-plans");
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const computeConsumed = (amountStr, per100Str) => {
    const amount = parseFloat(amountStr) || 0;
    const per100 = parseFloat(per100Str) || 0;
    return ((amount / 100) * per100).toFixed(1);
  };

  const toggleExpand = (mealId) => {
    setExpandedMeals((prev) => ({ ...prev, [mealId]: !prev[mealId] }));
  };

  // Toggle item completion
  const toggleItem = (mealIdx, itemIdx) => {
    setSession((prev) => {
      const updated = { ...prev };
      const meals = [...updated.meals];
      const meal = { ...meals[mealIdx] };
      const items = [...meal.items];
      const item = { ...items[itemIdx] };

      item.is_completed = item.is_completed ? 0 : 1;
      if (item.is_completed && item.actual_amount_grams == null) {
        item.actual_amount_grams = item.amount_grams;
      }

      items[itemIdx] = item;
      meal.items = items;

      // Označi meal kao completed ako su svi ne-removed items completed
      const activeItems = items.filter((it) => !it.is_removed);
      meal.is_completed =
        activeItems.length > 0 && activeItems.every((it) => it.is_completed)
          ? 1
          : 0;

      meals[mealIdx] = meal;
      updated.meals = meals;
      return updated;
    });
  };

  // Toggle all items in a meal
  const toggleAllItems = (mealIdx) => {
    setSession((prev) => {
      const updated = { ...prev };
      const meals = [...updated.meals];
      const meal = { ...meals[mealIdx] };
      const activeItems = meal.items.filter((it) => !it.is_removed);
      const allCompleted = activeItems.every((it) => it.is_completed);
      const newVal = allCompleted ? 0 : 1;

      meal.items = meal.items.map((item) => {
        if (item.is_removed) return item;
        const ns = { ...item, is_completed: newVal };
        if (newVal && ns.actual_amount_grams == null) {
          ns.actual_amount_grams = ns.amount_grams;
        }
        return ns;
      });
      meal.is_completed = newVal;

      meals[mealIdx] = meal;
      updated.meals = meals;
      return updated;
    });
  };

  // Update actual amount
  const updateActualAmount = (mealIdx, itemIdx, value) => {
    setSession((prev) => {
      const updated = { ...prev };
      const meals = [...updated.meals];
      const meal = { ...meals[mealIdx] };
      const items = [...meal.items];
      items[itemIdx] = { ...items[itemIdx], actual_amount_grams: value };
      meal.items = items;
      meals[mealIdx] = meal;
      updated.meals = meals;
      return updated;
    });
  };

  // Remove item (soft delete)
  const removeItem = (mealIdx, itemIdx) => {
    setSession((prev) => {
      const updated = { ...prev };
      const meals = [...updated.meals];
      const meal = { ...meals[mealIdx] };
      const items = [...meal.items];
      items[itemIdx] = { ...items[itemIdx], is_removed: 1, is_completed: 0 };
      meal.items = items;
      meals[mealIdx] = meal;
      updated.meals = meals;
      return updated;
    });
  };

  // Restore removed item
  const restoreItem = (mealIdx, itemIdx) => {
    setSession((prev) => {
      const updated = { ...prev };
      const meals = [...updated.meals];
      const meal = { ...meals[mealIdx] };
      const items = [...meal.items];
      items[itemIdx] = { ...items[itemIdx], is_removed: 0 };
      meal.items = items;
      meals[mealIdx] = meal;
      updated.meals = meals;
      return updated;
    });
  };

  const addMissingMeal = (mealType) => {
    setSession((prev) => {
      if (!prev) return prev;

      const alreadyExists = prev.meals.some(
        (meal) => meal.meal_type === mealType,
      );
      if (alreadyExists) return prev;

      const orderMap = MEAL_TYPES.reduce((acc, meal, index) => {
        acc[meal.value] = index;
        return acc;
      }, {});

      const meals = [
        ...prev.meals,
        {
          id: null,
          meal_type: mealType,
          notes: "",
          is_completed: 0,
          items: [],
        },
      ].sort(
        (a, b) =>
          (orderMap[a.meal_type] ?? Number.MAX_SAFE_INTEGER) -
          (orderMap[b.meal_type] ?? Number.MAX_SAFE_INTEGER),
      );

      return {
        ...prev,
        meals,
      };
    });
  };

  // Add new item from food catalog
  const handleAddFoodItem = (mealIdx, food) => {
    setSession((prev) => {
      const updated = { ...prev };
      const meals = [...updated.meals];
      const meal = { ...meals[mealIdx] };
      meal.items = [
        ...meal.items,
        {
          id: null,
          food_item_id: food.id,
          food_item_name: food.name,
          custom_name: null,
          amount_grams: parseFloat(newAmount) || 100,
          actual_amount_grams: parseFloat(newAmount) || 100,
          kcal_per_100g: parseFloat(food.kcal_per_100g),
          protein_per_100g: parseFloat(food.protein_per_100g),
          carbs_per_100g: parseFloat(food.carbs_per_100g),
          fat_per_100g: parseFloat(food.fat_per_100g),
          is_completed: 1,
          is_removed: 0,
        },
      ];
      meals[mealIdx] = meal;
      updated.meals = meals;
      return updated;
    });
    setAddingItem(null);
    setFoodSearch("");
    setNewAmount("100");
  };

  // Add custom item
  const handleAddCustomItem = (mealIdx) => {
    if (!newCustomName.trim()) {
      toast.warn("Unesite naziv stavke");
      return;
    }
    setSession((prev) => {
      const updated = { ...prev };
      const meals = [...updated.meals];
      const meal = { ...meals[mealIdx] };
      meal.items = [
        ...meal.items,
        {
          id: null,
          food_item_id: null,
          food_item_name: null,
          custom_name: newCustomName.trim(),
          amount_grams: parseFloat(newAmount) || 100,
          actual_amount_grams: parseFloat(newAmount) || 100,
          kcal_per_100g: parseFloat(newMacros.kcal) || 0,
          protein_per_100g: parseFloat(newMacros.protein) || 0,
          carbs_per_100g: parseFloat(newMacros.carbs) || 0,
          fat_per_100g: parseFloat(newMacros.fat) || 0,
          is_completed: 1,
          is_removed: 0,
        },
      ];
      meals[mealIdx] = meal;
      updated.meals = meals;
      return updated;
    });
    setAddingItem(null);
    setNewCustomName("");
    setNewAmount("100");
    setNewMacros({ kcal: "0", protein: "0", carbs: "0", fat: "0" });
  };

  // Save progress
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateMealSession(sessionId, {
        meals: session.meals.map((meal) => ({
          id: meal.id,
          meal_type: meal.meal_type,
          is_completed: meal.is_completed,
          notes: meal.notes,
          items: meal.items.map((item) => ({
            id: item.id,
            food_item_id: item.food_item_id,
            custom_name: item.custom_name,
            amount_grams: parseFloat(item.amount_grams) || 100,
            actual_amount_grams:
              item.actual_amount_grams != null
                ? parseFloat(item.actual_amount_grams)
                : null,
            kcal_per_100g: parseFloat(item.kcal_per_100g) || 0,
            protein_per_100g: parseFloat(item.protein_per_100g) || 0,
            carbs_per_100g: parseFloat(item.carbs_per_100g) || 0,
            fat_per_100g: parseFloat(item.fat_per_100g) || 0,
            is_completed: item.is_completed ? 1 : 0,
            is_removed: item.is_removed ? 1 : 0,
          })),
        })),
        notes: session.notes,
      });
      toast.success("Progres sačuvan");
    } catch (err) {
      toast.error("Greška pri čuvanju");
    } finally {
      setSaving(false);
    }
  };

  // Complete session
  const handleComplete = async () => {
    const anyCompleted = session.meals.some((m) =>
      m.items.some((it) => it.is_completed && !it.is_removed),
    );
    if (!anyCompleted) {
      toast.warning(
        "Nema označenih stavki. Označi bar jednu stavku koju si pojeo.",
      );
      return;
    }

    if (
      !window.confirm(
        "Završi dan ishrane? Sve označene stavke će biti upisane u istoriju ishrane.",
      )
    )
      return;

    setCompleting(true);
    try {
      // Save first
      await api.updateMealSession(sessionId, {
        meals: session.meals.map((meal) => ({
          id: meal.id,
          meal_type: meal.meal_type,
          is_completed: meal.is_completed,
          notes: meal.notes,
          items: meal.items.map((item) => ({
            id: item.id,
            food_item_id: item.food_item_id,
            custom_name: item.custom_name,
            amount_grams: parseFloat(item.amount_grams) || 100,
            actual_amount_grams:
              item.actual_amount_grams != null
                ? parseFloat(item.actual_amount_grams)
                : null,
            kcal_per_100g: parseFloat(item.kcal_per_100g) || 0,
            protein_per_100g: parseFloat(item.protein_per_100g) || 0,
            carbs_per_100g: parseFloat(item.carbs_per_100g) || 0,
            fat_per_100g: parseFloat(item.fat_per_100g) || 0,
            is_completed: item.is_completed ? 1 : 0,
            is_removed: item.is_removed ? 1 : 0,
          })),
        })),
        notes: session.notes,
      });

      const result = await api.completeMealSession(sessionId);
      toast.success(
        `${result.message} (${result.items_written} stavki upisano) 🍽️`,
      );
      navigate("/meal-plans");
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    } finally {
      setCompleting(false);
    }
  };

  // Count completed items
  const getCompletionStats = () => {
    if (!session?.meals) return { done: 0, total: 0 };
    let done = 0,
      total = 0;
    session.meals.forEach((m) => {
      m.items.forEach((item) => {
        if (!item.is_removed) {
          total++;
          if (item.is_completed) done++;
        }
      });
    });
    return { done, total };
  };

  // Daily totals of completed items
  const getDailyTotals = () => {
    if (!session?.meals) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    session.meals.forEach((m) => {
      m.items.forEach((item) => {
        if (item.is_completed && !item.is_removed) {
          const amt =
            item.actual_amount_grams != null
              ? parseFloat(item.actual_amount_grams)
              : parseFloat(item.amount_grams);
          totals.kcal += (amt / 100) * parseFloat(item.kcal_per_100g || 0);
          totals.protein +=
            (amt / 100) * parseFloat(item.protein_per_100g || 0);
          totals.carbs += (amt / 100) * parseFloat(item.carbs_per_100g || 0);
          totals.fat += (amt / 100) * parseFloat(item.fat_per_100g || 0);
        }
      });
    });
    return totals;
  };

  const availableMealTypes = useMemo(() => {
    const usedMealTypes = new Set(
      (session?.meals || []).map((meal) => meal.meal_type),
    );
    return MEAL_TYPES.filter((mealType) => !usedMealTypes.has(mealType.value));
  }, [session]);

  if (loading || !session) return <Loading />;

  const stats = getCompletionStats();
  const progressPct =
    stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const dailyTotals = getDailyTotals();

  return (
    <div className="page session-execution-page meal-session-page">
      {/* Header */}
      <div className="session-exec-header">
        <button
          className="btn btn-ghost"
          onClick={() => navigate("/meal-plans")}
        >
          <FiArrowLeft /> Nazad
        </button>
        <div className="session-exec-title">
          <h1>🍽️ {session.plan_name}</h1>
          <div className="session-exec-meta">
            <span className="session-progress-text">
              {stats.done}/{stats.total} stavki
            </span>
          </div>
        </div>
        <div className="session-exec-actions">
          <button
            className="btn btn-ghost"
            onClick={handleSave}
            disabled={saving}
          >
            <FiSave /> {saving ? "Čuvam..." : "Sačuvaj"}
          </button>
          <button
            className="btn btn-primary btn-complete"
            onClick={handleComplete}
            disabled={completing}
          >
            <FiCheckCircle /> {completing ? "Završavam..." : "Završi dan"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="session-progress-bar">
        <div
          className="session-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Daily totals card */}
      <div className="meal-daily-totals-bar">
        <div className="meal-daily-total">
          <strong>{dailyTotals.kcal.toFixed(0)}</strong>
          <small>kcal</small>
        </div>
        <div className="meal-daily-total">
          <strong>{dailyTotals.protein.toFixed(1)}g</strong>
          <small>Protein</small>
        </div>
        <div className="meal-daily-total">
          <strong>{dailyTotals.carbs.toFixed(1)}g</strong>
          <small>Ugljeni h.</small>
        </div>
        <div className="meal-daily-total">
          <strong>{dailyTotals.fat.toFixed(1)}g</strong>
          <small>Masti</small>
        </div>
      </div>

      {/* Meals */}
      <div className="session-exercises">
        <div className="plan-exercises-header">
          <h3>Obroci ({session.meals.length})</h3>
          {availableMealTypes.length > 0 && (
            <div className="meal-add-buttons">
              {availableMealTypes.map((mealType) => (
                <button
                  key={mealType.value}
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => addMissingMeal(mealType.value)}
                >
                  <FiPlus /> Dodaj {mealType.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {session.meals.map((meal, mealIdx) => {
          const mealKey = meal.id || `new_${mealIdx}`;
          const isExpanded = expandedMeals[mealKey] !== false;
          const activeItems = meal.items.filter((it) => !it.is_removed);
          const mealCompleted =
            activeItems.length > 0 &&
            activeItems.every((it) => it.is_completed);
          const removedItems = meal.items.filter((it) => it.is_removed);

          // Meal totals (completed only)
          const mealTotals = activeItems
            .filter((it) => it.is_completed)
            .reduce(
              (acc, item) => {
                const amt =
                  item.actual_amount_grams != null
                    ? parseFloat(item.actual_amount_grams)
                    : parseFloat(item.amount_grams);
                acc.kcal += (amt / 100) * parseFloat(item.kcal_per_100g || 0);
                acc.protein +=
                  (amt / 100) * parseFloat(item.protein_per_100g || 0);
                return acc;
              },
              { kcal: 0, protein: 0 },
            );

          return (
            <div
              key={mealKey}
              className={`session-exercise-card ${mealCompleted ? "completed" : ""}`}
            >
              <div
                className="session-exercise-header"
                onClick={() => toggleExpand(mealKey)}
              >
                <div className="session-exercise-info">
                  <span className="session-exercise-num">#{mealIdx + 1}</span>
                  <div>
                    <strong>
                      {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
                    </strong>
                    <span className="session-exercise-cat">
                      {mealTotals.kcal.toFixed(0)} kcal · P:{" "}
                      {mealTotals.protein.toFixed(0)}g ·{" "}
                      {activeItems.filter((it) => it.is_completed).length}/
                      {activeItems.length} stavki
                    </span>
                  </div>
                </div>
                <div className="session-exercise-right">
                  {mealCompleted && (
                    <FiCheckCircle className="exercise-done-icon" />
                  )}
                  {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                </div>
              </div>

              {isExpanded && (
                <div className="session-exercise-body">
                  {/* Items table */}
                  <div className="session-sets-table meal-items-table">
                    <div className="session-sets-header">
                      <span>Stavka</span>
                      <span>Plan (g)</span>
                      <span>Stvarno (g)</span>
                      <span>Kcal</span>
                      <span
                        className="session-sets-check-all"
                        onClick={() => toggleAllItems(mealIdx)}
                        title={mealCompleted ? "Poništi sve" : "Označi sve"}
                      >
                        <FiCheckCircle />
                      </span>
                      <span></span>
                    </div>

                    {activeItems.map((item, rawIdx) => {
                      const itemIdx = meal.items.indexOf(item);
                      const actualAmt =
                        item.actual_amount_grams != null
                          ? parseFloat(item.actual_amount_grams)
                          : parseFloat(item.amount_grams);
                      const itemKcal =
                        (actualAmt / 100) * parseFloat(item.kcal_per_100g || 0);

                      return (
                        <div
                          key={item.id || `new_${rawIdx}`}
                          className={`session-set-row ${item.is_completed ? "completed" : ""}`}
                        >
                          <span className="meal-item-name">
                            {item.food_item_name ||
                              item.custom_name ||
                              "Stavka"}
                          </span>

                          <span className="set-target">
                            {parseFloat(item.amount_grams)}g
                          </span>

                          <div className="form-group">
                            <input
                              type="number"
                              className="form-control session-input"
                              placeholder={String(
                                parseFloat(item.amount_grams),
                              )}
                              value={
                                item.actual_amount_grams != null
                                  ? item.actual_amount_grams
                                  : ""
                              }
                              onChange={(e) =>
                                updateActualAmount(
                                  mealIdx,
                                  itemIdx,
                                  e.target.value,
                                )
                              }
                              step="1"
                              min="0"
                            />
                          </div>

                          <span className="meal-item-kcal">
                            {itemKcal.toFixed(0)}
                          </span>

                          <button
                            className={`btn-check ${item.is_completed ? "checked" : ""}`}
                            onClick={() => toggleItem(mealIdx, itemIdx)}
                          >
                            <FiCheck />
                          </button>

                          <button
                            className="btn-remove-set"
                            onClick={() => removeItem(mealIdx, itemIdx)}
                            title="Obriši stavku"
                          >
                            <FiX />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Removed items */}
                  {removedItems.length > 0 && (
                    <div className="meal-removed-items">
                      <small>Obrisane: </small>
                      {removedItems.map((item, i) => {
                        const itemIdx = meal.items.indexOf(item);
                        return (
                          <span
                            key={i}
                            className="meal-removed-badge"
                            onClick={() => restoreItem(mealIdx, itemIdx)}
                            title="Klikni da vratiš"
                          >
                            {item.food_item_name || item.custom_name} ↩
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Add new item */}
                  {addingItem !== mealIdx ? (
                    <button
                      className="btn btn-sm btn-ghost session-add-set"
                      onClick={() => {
                        setAddingItem(mealIdx);
                        setFoodSearch("");
                        setNewCustomName("");
                        setNewAmount("100");
                      }}
                    >
                      <FiPlus /> Dodaj stavku
                    </button>
                  ) : (
                    <div className="session-add-exercise-form card meal-add-item-form">
                      <h4>Dodaj novu stavku</h4>

                      <div
                        className="food-search-input-wrapper form-group"
                        style={{ marginBottom: "0.5rem" }}
                      >
                        <FiSearch size={14} className="food-search-icon" />
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Traži namirnicu iz kataloga..."
                          value={foodSearch}
                          onChange={(e) => setFoodSearch(e.target.value)}
                        />
                      </div>

                      {foodSearch.length >= 2 && (
                        <div
                          className="food-search-dropdown"
                          style={{ position: "relative" }}
                        >
                          {foods
                            .filter((f) =>
                              f.name
                                .toLowerCase()
                                .includes(foodSearch.toLowerCase()),
                            )
                            .slice(0, 8)
                            .map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                className="food-search-option"
                                onClick={() => handleAddFoodItem(mealIdx, f)}
                              >
                                <span className="food-option-name">
                                  {f.name}
                                </span>
                                <span className="food-option-macros">
                                  {parseFloat(f.kcal_per_100g)}kcal/100g
                                </span>
                              </button>
                            ))}
                        </div>
                      )}

                      <div className="meal-item-or-divider">
                        <span>ili ručni unos:</span>
                      </div>

                      <div
                        className="form-row"
                        style={{ gap: "0.5rem", flexWrap: "wrap" }}
                      >
                        <div
                          className="form-group"
                          style={{ flex: 2, minWidth: "120px" }}
                        >
                          <label>Naziv</label>
                          <input
                            type="text"
                            className="form-control"
                            value={newCustomName}
                            onChange={(e) => setNewCustomName(e.target.value)}
                            placeholder="Naziv stavke"
                          />
                        </div>
                        <div
                          className="form-group"
                          style={{ flex: 1, minWidth: "80px" }}
                        >
                          <label>Grama</label>
                          <input
                            type="number"
                            className="form-control"
                            value={newAmount}
                            onChange={(e) => setNewAmount(e.target.value)}
                          />
                        </div>
                        <div
                          className="form-group"
                          style={{ flex: 1, minWidth: "70px" }}
                        >
                          <label>Kcal/100g</label>
                          <input
                            type="number"
                            className="form-control"
                            value={newMacros.kcal}
                            onChange={(e) =>
                              setNewMacros((p) => ({
                                ...p,
                                kcal: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div
                          className="form-group"
                          style={{ flex: 1, minWidth: "70px" }}
                        >
                          <label>P/100g</label>
                          <input
                            type="number"
                            className="form-control"
                            value={newMacros.protein}
                            onChange={(e) =>
                              setNewMacros((p) => ({
                                ...p,
                                protein: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div
                          className="form-group"
                          style={{ flex: 1, minWidth: "70px" }}
                        >
                          <label>C/100g</label>
                          <input
                            type="number"
                            className="form-control"
                            value={newMacros.carbs}
                            onChange={(e) =>
                              setNewMacros((p) => ({
                                ...p,
                                carbs: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div
                          className="form-group"
                          style={{ flex: 1, minWidth: "70px" }}
                        >
                          <label>F/100g</label>
                          <input
                            type="number"
                            className="form-control"
                            value={newMacros.fat}
                            onChange={(e) =>
                              setNewMacros((p) => ({
                                ...p,
                                fat: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="form-actions">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleAddCustomItem(mealIdx)}
                          disabled={!newCustomName.trim()}
                        >
                          <FiPlus /> Dodaj
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => {
                            setAddingItem(null);
                            setFoodSearch("");
                            setNewCustomName("");
                          }}
                        >
                          <FiX /> Otkaži
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MealSessionExecutionPage;
