import { MUSCLES } from "../data/exercises.js";

export function isMuscleId(value) {
  return typeof value === "string" && Object.hasOwn(MUSCLES, value);
}

export function uniqueMuscles(rawMuscles, excluded = []) {
  if (!Array.isArray(rawMuscles)) return [];
  return [...new Set(rawMuscles.filter((muscle) => isMuscleId(muscle) && !excluded.includes(muscle)))];
}

export function describeMuscles(muscles) {
  return muscles.map((muscle) => MUSCLES[muscle].label).join(", ");
}
