import React, { useEffect, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiCalendar } from "react-icons/fi";
import Loading from "../components/common/Loading";
import MealTypeTabs from "../components/nutrition/MealTypeTabs";
import DailyTotalsCard from "../components/nutrition/DailyTotalsCard";
import MealSection from "../components/nutrition/MealSection";
import { useNutrition } from "../context/NutritionContext";
import { MEAL_ORDER } from "../components/nutrition/nutritionUtils";

function NutritionIntakePage() {
  const {
    selectedDate,
    setSelectedDate,
    dayData,
    foods,
    loadingDay,
    loadingFoods,
    loadFoods,
    loadDay,
    saveMealEntry,
    removeMealEntry,
    toYmd,
  } = useNutrition();

  const [activeMeal, setActiveMeal] = useState("breakfast");

  useEffect(() => {
    loadFoods();
  }, []);

  useEffect(() => {
    loadDay(selectedDate);
  }, [selectedDate]);

  const mealMap = useMemo(() => {
    const entries = dayData?.meals || [];
    return Object.fromEntries(entries.map((entry) => [entry.meal_type, entry]));
  }, [dayData]);

  const handleShiftDate = (days) => {
    const base = new Date(selectedDate);
    base.setDate(base.getDate() + days);
    setSelectedDate(toYmd(base));
  };

  if (loadingDay && !dayData) return <Loading />;

  return (
    <div className="page nutrition-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🍽️ Unos hrane i kalorija</h1>
          <p className="page-subtitle">
            Unesi obroke po danu i prati dnevne makronutrijente
          </p>
        </div>
      </div>

      <div className="card nutrition-date-card">
        <div className="nutrition-date-controls">
          <button
            className="btn btn-outline"
            onClick={() => handleShiftDate(-1)}
          >
            <FiChevronLeft /> Prethodni dan
          </button>
          <div className="nutrition-date-picker">
            <FiCalendar />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <button
            className="btn btn-outline"
            onClick={() => handleShiftDate(1)}
          >
            Sledeći dan <FiChevronRight />
          </button>
        </div>
      </div>

      <DailyTotalsCard totals={dayData?.dailyTotals} />

      <MealTypeTabs activeMeal={activeMeal} onMealChange={setActiveMeal} />

      {MEAL_ORDER.map((mealType) => {
        const meal = mealMap[mealType] || {
          meal_type: mealType,
          entry_id: null,
          notes: "",
          items: [],
          totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
        };

        if (activeMeal !== mealType) return null;

        return (
          <MealSection
            key={mealType}
            meal={meal}
            foods={foods}
            selectedDate={selectedDate}
            onSaveMeal={saveMealEntry}
            onDeleteMeal={removeMealEntry}
          />
        );
      })}

      {(loadingFoods || loadingDay) && (
        <p className="empty-state-small">Osvežavanje podataka...</p>
      )}
    </div>
  );
}

export default NutritionIntakePage;
