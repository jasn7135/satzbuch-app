import { state } from "../app/state.js";
import { totalsOf } from "./nutrition.js";
import { addDays, daysBetween, parseIsoDate, toIsoDate } from "../utils/dates.js";

export function nutritionEntriesOn(isoDate) {
  return state.nutrition.entries.filter((entry) => entry.date === isoDate);
}

export function dailyNutritionTotalsBetween(startIso, endIso) {
  const entriesByDate = new Map();
  for (const entry of state.nutrition.entries) {
    if (entry.date < startIso || entry.date > endIso) continue;
    entriesByDate.set(entry.date, [...(entriesByDate.get(entry.date) ?? []), entry]);
  }
  const start = parseIsoDate(startIso);
  const dayCount = daysBetween(start, parseIsoDate(endIso)) + 1;
  return Array.from({ length: Math.max(0, dayCount) }, (_, offset) => {
    const date = toIsoDate(addDays(start, offset));
    const entries = entriesByDate.get(date) ?? [];
    return { date, hasEntries: entries.length > 0, ...totalsOf(entries) };
  });
}
