import { state } from "../app/state.js";
import { EXERCISES, MUSCLE_GROUPS } from "../data/exercises.js";
import { normalizeSearchText } from "../utils/text.js";

export const LIBRARY_BY_ID = new Map(EXERCISES.map((exercise) => [exercise.id, exercise]));
export const GROUP_LABELS = Object.fromEntries(MUSCLE_GROUPS.map((group) => [group.id, group.label]));
export const CUSTOM_GROUP_FILTER = "custom";
export const MAX_CUSTOM_EXERCISES = 200;
export const CUSTOM_ID_PREFIX = "custom-";

export function exerciseDisplayName(exerciseId, fallback) {
  const planned = state.plan.days.flatMap((day) => day.exercises).find((exercise) => exercise.id === exerciseId);
  return planned?.name || fallback || "Übung";
}

const LIBRARY_BY_NAME = new Map([
  ...EXERCISES.flatMap((exercise) => exercise.aliases.map((alias) => [normalizeSearchText(alias), exercise])),
  ...EXERCISES.map((exercise) => [normalizeSearchText(exercise.name), exercise]),
]);

export function customExerciseById(libraryId) {
  return state.customExercises.find((exercise) => exercise.id === libraryId) ?? null;
}

export function libraryExercise(libraryId) {
  return LIBRARY_BY_ID.get(libraryId) ?? customExerciseById(libraryId);
}

export function libraryExerciseByName(name) {
  const key = normalizeSearchText(name);
  return LIBRARY_BY_NAME.get(key) ?? state.customExercises.find((exercise) => normalizeSearchText(exercise.name) === key) ?? null;
}

export function exerciseInfo(planExercise) {
  return (planExercise.libraryId && libraryExercise(planExercise.libraryId)) || libraryExerciseByName(planExercise.name);
}

export function exerciseInfoForSession(exerciseId, fallbackName) {
  const planned = state.plan.days.flatMap((day) => day.exercises).find((exercise) => exercise.id === exerciseId);
  return planned ? exerciseInfo(planned) : libraryExerciseByName(fallbackName);
}

export function allLibraryExercises() {
  return [...EXERCISES, ...state.customExercises];
}
