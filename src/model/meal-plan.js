import { FOOD_NAME_MAX_LENGTH } from "../config/limits.js";
import { WEEKDAYS } from "../utils/dates.js";
import { createId, SAFE_ID_PATTERN } from "../utils/ids.js";
import { sanitizeName } from "../utils/text.js";
import { isValidEntryCalories, isValidEntryGrams, normalizeMacros, normalizeNutritionEntry } from "./nutrition.js";

export const MEALS = [
  { id: "breakfast", label: "Frühstück", time: "08:00" },
  { id: "lunch", label: "Mittagessen", time: "12:30" },
  { id: "snack", label: "Snack", time: "16:00" },
  { id: "dinner", label: "Abendessen", time: "19:00" },
];

export const MAX_PLANNED_ITEMS_PER_DAY = 40;

function mealById(mealId) {
  return MEALS.find((meal) => meal.id === mealId) ?? null;
}

export function normalizeMealPlanItem(rawItem) {
  const name = typeof rawItem?.name === "string" ? sanitizeName(rawItem.name, FOOD_NAME_MAX_LENGTH) : "";
  if (!SAFE_ID_PATTERN.test(rawItem?.id) || !mealById(rawItem.meal) || !name || !isValidEntryCalories(rawItem.kcal)) return null;
  return {
    id: rawItem.id,
    meal: rawItem.meal,
    name,
    grams: isValidEntryGrams(rawItem.grams) ? rawItem.grams : null,
    kcal: rawItem.kcal,
    ...normalizeMacros(rawItem),
  };
}

function normalizeMealPlanDay(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  const byId = new Map();
  for (const rawItem of rawItems) {
    const item = normalizeMealPlanItem(rawItem);
    if (item) byId.set(item.id, item);
  }
  return [...byId.values()].slice(0, MAX_PLANNED_ITEMS_PER_DAY);
}

export function normalizeMealPlan(rawPlan) {
  const rawDays = Array.isArray(rawPlan?.days) ? rawPlan.days : [];
  return { days: WEEKDAYS.map((_, index) => normalizeMealPlanDay(rawDays[index])) };
}

export function createEmptyMealPlan() {
  return normalizeMealPlan(null);
}

/** Planned items of one weekday in meal order (breakfast first), keeping the order within a meal. */
export function itemsInMealOrder(items) {
  const rank = (item) => MEALS.findIndex((meal) => meal.id === item.meal);
  return [...items].sort((first, second) => rank(first) - rank(second));
}

/** A nutrition log entry for `isoDate` built from a planned item, linked back to it. */
export function entryFromPlanItem(item, isoDate) {
  return normalizeNutritionEntry({ ...item, id: createId(), date: isoDate, time: mealById(item.meal).time, planItemId: item.id });
}
