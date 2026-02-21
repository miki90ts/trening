import React from "react";
import { MEAL_ORDER, MEAL_CONFIG } from "./nutritionUtils";

function MealTypeTabs({ activeMeal, onMealChange }) {
  return (
    <div className="nutrition-meal-tabs">
      {MEAL_ORDER.map((mealKey) => {
        const config = MEAL_CONFIG[mealKey];
        const Icon = config.icon;

        return (
          <button
            key={mealKey}
            className={`nutrition-meal-tab ${activeMeal === mealKey ? "active" : ""}`}
            onClick={() => onMealChange(mealKey)}
            type="button"
          >
            <Icon />
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default MealTypeTabs;
