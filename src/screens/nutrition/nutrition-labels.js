import { MACROS } from "../../config/options.js";
import { formatInteger, formatNumber } from "../../utils/format.js";

export function describeCalorieBalance(kcal, goal) {
  const difference = goal - kcal;
  if (difference > 0) return `Noch ${formatInteger(difference)} kcal bis ${formatInteger(goal)}`;
  if (difference === 0) return "Kalorienziel genau erreicht";
  return `${formatInteger(-difference)} kcal über dem Ziel`;
}

function describeEntryMacros(entry) {
  const parts = MACROS.filter((macro) => entry[macro.key] > 0).map((macro) => `${macro.shortLabel}\u00a0${formatNumber(entry[macro.key])}\u00a0g`);
  return parts.length ? parts.join(" · ") : "Ohne Makros";
}

export function mealLabel(time) {
  const hour = Number(time.slice(0, 2));
  if (hour >= 4 && hour < 11) return "Frühstück";
  if (hour >= 11 && hour < 15) return "Mittagessen";
  if (hour >= 17 && hour < 22) return "Abendessen";
  return "Snack";
}

export function describeEntryDetails(entry) {
  const amount = entry.grams ? `${formatInteger(entry.grams)}\u00a0g` : "";
  return [amount, describeEntryMacros(entry)].filter(Boolean).join(" · ");
}
