import { normalizeCustomExercises } from "./custom-exercises.js";
import { createEmptyNutrition, normalizeNutrition } from "./nutrition.js";
import { createEmptyPlan, normalizePlan } from "./plan.js";
import { normalizeProfile } from "./profile.js";
import { normalizeSessions } from "./sessions.js";

export function normalizeAppData(raw) {
  const customExercises = normalizeCustomExercises(raw?.customExercises);
  return {
    plan: normalizePlan(raw?.plan, customExercises),
    customExercises,
    profile: normalizeProfile(raw?.profile),
    sessions: normalizeSessions(Array.isArray(raw?.sessions) ? raw.sessions : []),
    nutrition: normalizeNutrition(raw?.nutrition),
  };
}

export function createEmptyData() {
  return { plan: createEmptyPlan(), customExercises: [], profile: normalizeProfile(null), sessions: [], nutrition: createEmptyNutrition() };
}
