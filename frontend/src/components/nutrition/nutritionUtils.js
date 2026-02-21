import { FiCoffee, FiSun, FiMoon, FiSmile } from "react-icons/fi";

export const MEAL_CONFIG = {
  breakfast: {
    key: "breakfast",
    label: "Doručak",
    icon: FiCoffee,
  },
  lunch: {
    key: "lunch",
    label: "Ručak",
    icon: FiSun,
  },
  dinner: {
    key: "dinner",
    label: "Večera",
    icon: FiMoon,
  },
  snack: {
    key: "snack",
    label: "Užina",
    icon: FiSmile,
  },
};

export const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];

export const round2 = (value) =>
  Math.round((parseFloat(value || 0) + Number.EPSILON) * 100) / 100;

export const normalizeMealItemsForForm = (items = []) =>
  items.map((item) => ({
    localId: item.id || `${Date.now()}-${Math.random()}`,
    mode: item.food_item_id ? "catalog" : "manual",
    food_item_id: item.food_item_id || "",
    custom_name: item.custom_name || "",
    amount_grams: item.amount_grams || "",
    kcal_per_100g: item.kcal_per_100g || "",
    protein_per_100g: item.protein_per_100g || "",
    carbs_per_100g: item.carbs_per_100g || "",
    fat_per_100g: item.fat_per_100g || "",
  }));

export const emptyMealItem = () => ({
  localId: `${Date.now()}-${Math.random()}`,
  mode: "catalog",
  food_item_id: "",
  custom_name: "",
  amount_grams: "",
  kcal_per_100g: "",
  protein_per_100g: "",
  carbs_per_100g: "",
  fat_per_100g: "",
});
