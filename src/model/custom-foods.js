import { FOOD_NAME_MAX_LENGTH } from "../config/limits.js";
import { SAFE_ID_PATTERN } from "../utils/ids.js";
import { sum } from "../utils/numbers.js";
import { normalizeSearchText, sanitizeName } from "../utils/text.js";
import { isValidEntryGrams, normalizeMacros } from "./nutrition.js";

export const CUSTOM_FOOD_ID_PREFIX = "food-";
export const MAX_CUSTOM_FOODS = 300;
export const MAX_KCAL_PER_100_GRAMS = 900;
export const PORTION_LABEL_MAX_LENGTH = 20;

export function isValidKcalPer100Grams(kcal) {
  return Number.isFinite(kcal) && kcal >= 0 && kcal <= MAX_KCAL_PER_100_GRAMS;
}

export function isValidGramsPer100Grams(grams) {
  return Number.isFinite(grams) && grams >= 0 && grams <= 100;
}

function normalizePer100(rawPer100) {
  const macros = normalizeMacros(rawPer100);
  const hasValidMacros = Object.values(macros).every(isValidGramsPer100Grams) && sum(Object.values(macros)) <= 100;
  if (!isValidKcalPer100Grams(rawPer100?.kcal) || !hasValidMacros) return null;
  return { kcal: Math.round(rawPer100.kcal), ...macros };
}

function normalizePortion(rawPortion) {
  const label = typeof rawPortion?.label === "string" ? sanitizeName(rawPortion.label, PORTION_LABEL_MAX_LENGTH) : "";
  return label && isValidEntryGrams(rawPortion.grams) ? { label, grams: rawPortion.grams } : null;
}

export function normalizeCustomFood(rawFood) {
  const name = typeof rawFood?.name === "string" ? sanitizeName(rawFood.name, FOOD_NAME_MAX_LENGTH) : "";
  const isValidId = SAFE_ID_PATTERN.test(rawFood?.id) && rawFood.id.startsWith(CUSTOM_FOOD_ID_PREFIX);
  const per100 = normalizePer100(rawFood?.per100);
  if (!isValidId || !name || !per100) return null;
  return { id: rawFood.id, name, per100, portion: normalizePortion(rawFood.portion) };
}

export function normalizeCustomFoods(rawFoods) {
  if (!Array.isArray(rawFoods)) return [];
  const byId = new Map();
  for (const rawFood of rawFoods) {
    const food = normalizeCustomFood(rawFood);
    if (food) byId.set(food.id, food);
  }
  return [...byId.values()].slice(-MAX_CUSTOM_FOODS);
}

export function customFoodNamed(foods, name, exceptId = null) {
  const key = normalizeSearchText(name);
  return foods.find((food) => food.id !== exceptId && normalizeSearchText(food.name) === key) ?? null;
}
