import { BODY_WEIGHT_MAX, BODY_WEIGHT_MIN, HEIGHT_MAX, HEIGHT_MIN } from "../config/limits.js";
import { MEASUREMENT_FIELDS } from "../config/options.js";
import { isValidBodyWeight, isValidHeight, isValidMeasurement } from "./profile.js";
import { parseNumber, roundToHundredths } from "../utils/numbers.js";

export function parseBodyWeight(text) {
  if (String(text).trim() === "") return { value: null };
  const kg = parseNumber(text);
  return isValidBodyWeight(kg) ? { value: roundToHundredths(kg) } : { error: `Gib ein Gewicht zwischen ${BODY_WEIGHT_MIN} und ${BODY_WEIGHT_MAX} kg ein.` };
}

export function parseHeight(text) {
  if (String(text).trim() === "") return { value: null };
  const cm = Math.round(parseNumber(text) ?? Number.NaN);
  return isValidHeight(cm) ? { value: cm } : { error: `Gib eine Größe zwischen ${HEIGHT_MIN} und ${HEIGHT_MAX} cm ein.` };
}

export function parseMeasurement(field, text) {
  if (String(text).trim() === "") return { value: null };
  const cm = parseNumber(text);
  const bounds = MEASUREMENT_FIELDS[field];
  return isValidMeasurement(field, cm) ? { value: Math.round(cm * 10) / 10 } : { error: `${bounds.label}: Gib einen Wert zwischen ${bounds.min} und ${bounds.max} cm ein.` };
}

export function parseTargetWeight(text, current) {
  const parsed = parseBodyWeight(text);
  if (parsed.error || parsed.value === null || current.bodyWeight === null) return parsed;
  if (current.goal.type === "lose" && parsed.value >= current.bodyWeight) return { error: "Zum Abnehmen muss das Zielgewicht unter deinem aktuellen Gewicht liegen." };
  if (current.goal.type === "gain" && parsed.value <= current.bodyWeight) return { error: "Für Muskelaufbau muss das Zielgewicht über deinem aktuellen Gewicht liegen." };
  return parsed;
}
