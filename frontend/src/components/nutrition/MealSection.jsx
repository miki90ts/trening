import React, { useEffect, useMemo, useState } from "react";
import { FiPlus, FiSave, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import Card from "../common/Card";
import FoodItemRow from "./FoodItemRow";
import {
  emptyMealItem,
  MEAL_CONFIG,
  normalizeMealItemsForForm,
  round2,
} from "./nutritionUtils";

function MealSection({ meal, foods, selectedDate, onSaveMeal, onDeleteMeal }) {
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setItems(normalizeMealItemsForForm(meal?.items || []));
    setNotes(meal?.notes || "");
  }, [meal]);

  const config = MEAL_CONFIG[meal.meal_type];
  const Icon = config.icon;

  const mealTotals = useMemo(() => {
    const totals = meal?.totals || {};
    return {
      kcal: round2(totals.kcal),
      protein: round2(totals.protein),
      carbs: round2(totals.carbs),
      fat: round2(totals.fat),
    };
  }, [meal]);

  const changeItem = (index, nextItem) => {
    setItems((prev) => prev.map((it, i) => (i === index ? nextItem : it)));
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyMealItem()]);
  };

  const validateItems = () => {
    if (items.length === 0) {
      toast.error("Dodaj bar jednu stavku obroka");
      return false;
    }

    for (const row of items) {
      if (!row.amount_grams || parseFloat(row.amount_grams) <= 0) {
        toast.error("Količina (g) mora biti veća od 0");
        return false;
      }

      if (row.mode === "catalog") {
        if (!row.food_item_id) {
          toast.error("Izaberi namirnicu iz liste");
          return false;
        }
      } else {
        if (!row.custom_name?.trim()) {
          toast.error("Unesi naziv ručne stavke");
          return false;
        }

        const macroFields = [
          row.kcal_per_100g,
          row.protein_per_100g,
          row.carbs_per_100g,
          row.fat_per_100g,
        ];

        if (
          macroFields.some(
            (v) => v === "" || v === null || Number.isNaN(parseFloat(v)),
          )
        ) {
          toast.error("Za ručni unos popuni kcal, proteine, UH i masti");
          return false;
        }
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateItems()) return;

    setSaving(true);
    try {
      await onSaveMeal({
        entry_date: selectedDate,
        meal_type: meal.meal_type,
        notes,
        items: items.map((row) => {
          if (row.mode === "catalog") {
            return {
              food_item_id: parseInt(row.food_item_id, 10),
              amount_grams: parseFloat(row.amount_grams),
            };
          }

          return {
            custom_name: row.custom_name.trim(),
            amount_grams: parseFloat(row.amount_grams),
            kcal_per_100g: parseFloat(row.kcal_per_100g),
            protein_per_100g: parseFloat(row.protein_per_100g),
            carbs_per_100g: parseFloat(row.carbs_per_100g),
            fat_per_100g: parseFloat(row.fat_per_100g),
          };
        }),
      });

      toast.success(`${config.label} sačuvan`);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!meal.entry_id) {
      setItems([]);
      setNotes("");
      return;
    }

    if (
      !window.confirm(`Obrisati ceo unos za ${config.label.toLowerCase()}?`)
    ) {
      return;
    }

    setRemoving(true);
    try {
      await onDeleteMeal(meal.entry_id);
      toast.success(`${config.label} obrisan`);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card className="nutrition-meal-section">
      <div className="nutrition-meal-header">
        <h3>
          <Icon /> {config.label}
        </h3>
        <div className="nutrition-meal-summary">
          <span>{mealTotals.kcal} kcal</span>
          <span>P {mealTotals.protein}g</span>
          <span>UH {mealTotals.carbs}g</span>
          <span>M {mealTotals.fat}g</span>
        </div>
      </div>

      <div className="form-group">
        <label>Napomena (opciono)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="npr. obrok pre treninga"
          rows={2}
        />
      </div>

      <div className="nutrition-items-list">
        {items.length === 0 ? (
          <p className="empty-state-small">Nema stavki u ovom obroku.</p>
        ) : (
          items.map((item, index) => (
            <FoodItemRow
              key={item.localId}
              item={item}
              foods={foods}
              onChange={(nextItem) => changeItem(index, nextItem)}
              onRemove={() => removeItem(index)}
            />
          ))
        )}
      </div>

      <div className="nutrition-meal-actions">
        <button type="button" className="btn btn-secondary" onClick={addItem}>
          <FiPlus /> Dodaj stavku
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          <FiSave /> {saving ? "Čuvanje..." : "Sačuvaj obrok"}
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={handleDelete}
          disabled={removing}
        >
          <FiTrash2 /> Obriši obrok
        </button>
      </div>
    </Card>
  );
}

export default MealSection;
