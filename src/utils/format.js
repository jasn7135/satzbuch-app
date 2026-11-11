import { addDays, parseIsoDate, todayIso, toIsoDate, weekdayIndex, WEEKDAYS } from "./dates.js";
import { roundToStep } from "./numbers.js";

const shortDateFormat = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short" });
export const chartDateFormat = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" });
export const longDateFormat = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });
export const fullDateFormat = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" });
export const csvDateFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const numberFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

export function formatShortDate(isoDate) {
  return shortDateFormat.format(parseIsoDate(isoDate));
}

export function formatNumber(value) {
  return numberFormat.format(value);
}

export function formatInteger(value) {
  return numberFormat.format(Math.round(value));
}

export function countLabel(count, singular, plural) {
  return `${formatInteger(count)} ${count === 1 ? singular : plural}`;
}

export function formatKilograms(value) {
  return `${formatNumber(roundToStep(value, 0.5))} kg`;
}

export function formatTonnes(kg) {
  return kg >= 1000 ? `${formatNumber(Math.round(kg / 100) / 10)} t` : `${formatInteger(kg)} kg`;
}

export function formatSigned(value, unit) {
  const sign = value > 0 ? "+" : "−";
  return `${sign}${formatNumber(Math.abs(value))} ${unit}`;
}

export function formatOneDecimal(value) {
  return formatNumber(Math.round(value * 10) / 10);
}

export function formatBodyWeight(kg) {
  return `${formatOneDecimal(kg)} kg`;
}

export function formatSignedNumber(value) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return "±0";
  return `${rounded > 0 ? "+" : "−"}${formatNumber(Math.abs(rounded))}`;
}

export function formatWeeklyChange(kg) {
  const rounded = Math.round(kg * 100) / 100;
  if (Math.abs(rounded) < 0.01) return "±0 kg pro Woche";
  return `${formatSigned(rounded, "kg")} pro Woche`;
}

export function describeRelativeDay(isoDate) {
  if (isoDate === todayIso()) return "Heute";
  if (isoDate === toIsoDate(addDays(new Date(), -1))) return "Gestern";
  return WEEKDAYS[weekdayIndex(parseIsoDate(isoDate))];
}

export function formatOptionalGrams(grams) {
  return typeof grams === "number" && grams > 0 ? formatNumber(grams) : "";
}

export function describeDaysAgo(days) {
  if (days === 0) return "heute";
  if (days === 1) return "gestern";
  return `vor ${days} Tagen`;
}
