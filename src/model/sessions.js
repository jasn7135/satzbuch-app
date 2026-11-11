import { EXERCISE_NAME_MAX_LENGTH } from "../config/limits.js";
import { isIsoDate, WEEKDAYS } from "../utils/dates.js";
import { formatNumber } from "../utils/format.js";
import { SAFE_ID_PATTERN } from "../utils/ids.js";
import { sanitizeName } from "../utils/text.js";

const MAX_WEIGHT_KG = 1000;
const MAX_REPS = 1000;

function isValidSet(set) {
  return Number.isFinite(set?.kg) && Number.isFinite(set?.reps)
    && set.kg >= 0 && set.kg <= MAX_WEIGHT_KG && set.reps >= 0 && set.reps <= MAX_REPS;
}

export function normalizeSessions(rawSessions) {
  return rawSessions
    .filter((session) => typeof session?.id === "string" && isIsoDate(session.date) && session.exercises && typeof session.exercises === "object")
    .map((session) => ({
      id: session.id,
      date: session.date,
      day: Number.isInteger(session.day) && session.day >= 0 && session.day < WEEKDAYS.length ? session.day : 0,
      exercises: Object.fromEntries(
        Object.entries(session.exercises)
          .filter(([exerciseId, entry]) => SAFE_ID_PATTERN.test(exerciseId) && Array.isArray(entry?.sets))
          .map(([exerciseId, entry]) => [exerciseId, {
            name: typeof entry.name === "string" ? sanitizeName(entry.name, EXERCISE_NAME_MAX_LENGTH) : "",
            sets: entry.sets.filter(isValidSet).map((set) => ({ kg: set.kg, reps: set.reps })),
          }])
      ),
    }))
    .sort((first, second) => second.date.localeCompare(first.date));
}

export function allSets(sessions) {
  return sessions.flatMap((session) => Object.values(session.exercises).flatMap((entry) => entry.sets));
}

export function liftedVolume(sets) {
  return sets.reduce((sum, set) => sum + set.kg * set.reps, 0);
}

function describeWeight(kg) {
  return kg > 0 ? `${formatNumber(kg)} kg` : "Körpergewicht";
}

export function describeSets(sets) {
  const distinctWeights = new Set(sets.map((set) => set.kg));
  if (distinctWeights.size === 1) {
    return `${describeWeight(sets[0].kg)} · ${sets.map((set) => set.reps).join(" / ")}`;
  }
  return sets.map((set) => `${formatNumber(set.kg)} × ${set.reps}`).join(", ");
}

export function canonicalizeSessions(sessions) {
  const byId = new Map();
  for (const session of sessions) {
    const hasSets = Object.values(session.exercises).some((entry) => entry.sets.length > 0);
    if (!hasSets) continue;
    const id = `${session.date}_${session.day}`;
    byId.set(id, { ...session, id });
  }
  return [...byId.values()].sort((first, second) => second.date.localeCompare(first.date));
}
