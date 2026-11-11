import { CALORIE_GOAL_MAX, CALORIE_GOAL_MIN, FOOD_NAME_MAX_LENGTH, MAX_ENTRY_GRAMS, MAX_ENTRY_KCAL, MAX_ENTRY_MACRO_GRAMS, MAX_NUTRITION_ENTRIES, PROTEIN_GOAL_MAX, PROTEIN_GOAL_MIN } from "../config/limits.js";
import { MACROS } from "../config/options.js";
import { isIsoDate } from "../utils/dates.js";
import { SAFE_ID_PATTERN } from "../utils/ids.js";
import { sum } from "../utils/numbers.js";
import { sanitizeName } from "../utils/text.js";

export function isValidClockTime(text) {
  return typeof text === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(text);
}

export function isValidEntryCalories(kcal) {
  return Number.isInteger(kcal) && kcal >= 0 && kcal <= MAX_ENTRY_KCAL;
}

export function isValidMacroGrams(grams) {
  return Number.isFinite(grams) && grams >= 0 && grams <= MAX_ENTRY_MACRO_GRAMS;
}

export function isValidCalorieGoal(kcal) {
  return Number.isInteger(kcal) && kcal >= CALORIE_GOAL_MIN && kcal <= CALORIE_GOAL_MAX;
}

export function isValidProteinGoal(grams) {
  return Number.isInteger(grams) && grams >= PROTEIN_GOAL_MIN && grams <= PROTEIN_GOAL_MAX;
}

export function caloriesFromMacros(macros) {
  return Math.round(sum(MACROS.map((macro) => (macros[macro.key] ?? 0) * macro.kcalPerGram)));
}

export function isValidEntryGrams(grams) {
  return Number.isInteger(grams) && grams >= 1 && grams <= MAX_ENTRY_GRAMS;
}

export function normalizeNutritionEntry(rawEntry) {
  if (!SAFE_ID_PATTERN.test(rawEntry?.id) || !isIsoDate(rawEntry.date) || !isValidClockTime(rawEntry.time)) return null;
  if (!isValidEntryCalories(rawEntry.kcal)) return null;
  const entry = {
    id: rawEntry.id,
    date: rawEntry.date,
    time: rawEntry.time,
    name: typeof rawEntry.name === "string" ? sanitizeName(rawEntry.name, FOOD_NAME_MAX_LENGTH) : "",
    grams: isValidEntryGrams(rawEntry.grams) ? rawEntry.grams : null,
    kcal: rawEntry.kcal,
  };
  for (const macro of MACROS) {
    const grams = rawEntry[macro.key];
    entry[macro.key] = isValidMacroGrams(grams) ? Math.round(grams * 10) / 10 : 0;
  }
  return entry;
}

export function compareEntriesByTime(first, second) {
  return `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`);
}

export function normalizeNutrition(rawNutrition) {
  const rawGoals = rawNutrition?.goals ?? {};
  const rawEntries = Array.isArray(rawNutrition?.entries) ? rawNutrition.entries : [];
  const entriesById = new Map();
  for (const rawEntry of rawEntries) {
    const entry = normalizeNutritionEntry(rawEntry);
    if (entry) entriesById.set(entry.id, entry);
  }
  return {
    goals: {
      kcal: isValidCalorieGoal(rawGoals.kcal) ? rawGoals.kcal : null,
      protein: isValidProteinGoal(rawGoals.protein) ? rawGoals.protein : null,
    },
    entries: [...entriesById.values()].sort(compareEntriesByTime).slice(-MAX_NUTRITION_ENTRIES),
  };
}

export function createEmptyNutrition() {
  return normalizeNutrition(null);
}

export function totalsOf(entries) {
  const totals = { kcal: sum(entries.map((entry) => entry.kcal)) };
  for (const macro of MACROS) totals[macro.key] = Math.round(sum(entries.map((entry) => entry[macro.key])) * 10) / 10;
  return totals;
}
