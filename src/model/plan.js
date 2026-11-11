import { EXERCISE_NAME_MAX_LENGTH, NAME_MAX_LENGTH } from "../config/limits.js";
import { LIBRARY_BY_ID } from "./exercise-lookup.js";
import { WEEKDAYS } from "../utils/dates.js";
import { createId, SAFE_ID_PATTERN } from "../utils/ids.js";
import { sanitizeName } from "../utils/text.js";

const SAMPLE_PLAN = {
  0: { name: "Push", exercises: ["bench-press", "incline-dumbbell-press", "overhead-press", "lateral-raise", "triceps-pushdown"] },
  2: { name: "Pull", exercises: ["pull-up", "barbell-row", "lat-pulldown", "face-pull", "dumbbell-curl"] },
  4: { name: "Beine", exercises: ["squat", "romanian-deadlift", "leg-press", "leg-curl", "calf-raise"] },
};

export function createEmptyPlan() {
  return { days: WEEKDAYS.map(() => ({ name: "", exercises: [] })) };
}

function isKnownLibraryId(libraryId, customExercises) {
  return LIBRARY_BY_ID.has(libraryId) || customExercises.some((exercise) => exercise.id === libraryId);
}

function normalizePlanExercise(exercise, customExercises) {
  const normalized = { id: exercise.id, name: sanitizeName(exercise.name, EXERCISE_NAME_MAX_LENGTH) };
  if (isKnownLibraryId(exercise.libraryId, customExercises)) normalized.libraryId = exercise.libraryId;
  return normalized;
}

export function normalizePlan(rawPlan, customExercises = []) {
  const rawDays = Array.isArray(rawPlan?.days) ? rawPlan.days : [];
  return {
    days: WEEKDAYS.map((_, index) => {
      const rawDay = rawDays[index] ?? {};
      const exercises = Array.isArray(rawDay.exercises) ? rawDay.exercises : [];
      return {
        name: typeof rawDay.name === "string" ? sanitizeName(rawDay.name, NAME_MAX_LENGTH) : "",
        exercises: exercises
          .filter((exercise) => SAFE_ID_PATTERN.test(exercise?.id) && typeof exercise.name === "string")
          .map((exercise) => normalizePlanExercise(exercise, customExercises)),
      };
    }),
  };
}

export function planExerciseFrom(libraryExercise) {
  return { id: createId(), name: libraryExercise.name, libraryId: libraryExercise.id };
}

export function createSamplePlan() {
  const plan = createEmptyPlan();
  for (const [dayIndex, day] of Object.entries(SAMPLE_PLAN)) {
    plan.days[dayIndex] = { name: day.name, exercises: day.exercises.map((libraryId) => planExerciseFrom(LIBRARY_BY_ID.get(libraryId))) };
  }
  return plan;
}

export function isPlanEmpty(plan) {
  return plan.days.every((day) => day.exercises.length === 0 && !day.name);
}
