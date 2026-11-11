import { state } from "../app/state.js";
import { exerciseDisplayName } from "./exercise-lookup.js";

const MAX_FORMULA_REPS = 12;

export function repMaxFactor(reps) {
  if (reps <= 1) return 1;
  const epley = 1 + reps / 30;
  const brzycki = 36 / (37 - reps);
  return (epley + brzycki) / 2;
}

export function estimateOneRepMax(set) {
  if (set.kg <= 0 || set.reps < 1 || set.reps > MAX_FORMULA_REPS) return null;
  return set.kg * repMaxFactor(set.reps);
}

export function isBetterRecord(candidate, best) {
  if (!best) return true;
  if (candidate.oneRepMax !== null || best.oneRepMax !== null) return (candidate.oneRepMax ?? 0) > (best.oneRepMax ?? 0);
  return candidate.reps > best.reps;
}

export function recordsByExercise(sessions = state.sessions) {
  const records = new Map();
  for (const session of [...sessions].reverse()) {
    for (const [exerciseId, entry] of Object.entries(session.exercises)) {
      for (const set of entry.sets) {
        const candidate = { kg: set.kg, reps: set.reps, oneRepMax: estimateOneRepMax(set), date: session.date, name: entry.name };
        if (set.reps > 0 && isBetterRecord(candidate, records.get(exerciseId))) records.set(exerciseId, candidate);
      }
    }
  }
  return records;
}

export function personalRecords() {
  const planOrder = state.plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.id));
  const rank = (exerciseId) => {
    const index = planOrder.indexOf(exerciseId);
    return index === -1 ? planOrder.length : index;
  };
  return [...recordsByExercise()]
    .map(([exerciseId, record]) => ({ ...record, exerciseId, name: exerciseDisplayName(exerciseId, record.name) }))
    .sort((first, second) => rank(first.exerciseId) - rank(second.exerciseId) || second.date.localeCompare(first.date));
}
