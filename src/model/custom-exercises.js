import { EXERCISE_NAME_MAX_LENGTH } from "../config/limits.js";
import { CUSTOM_ID_PREFIX, GROUP_LABELS, MAX_CUSTOM_EXERCISES } from "./exercise-lookup.js";
import { uniqueMuscles } from "./muscles.js";
import { SAFE_ID_PATTERN } from "../utils/ids.js";
import { sanitizeName } from "../utils/text.js";

export function normalizeCustomExercises(rawExercises) {
  if (!Array.isArray(rawExercises)) return [];
  const byId = new Map();
  for (const raw of rawExercises) {
    const isValidId = SAFE_ID_PATTERN.test(raw?.id) && raw.id.startsWith(CUSTOM_ID_PREFIX);
    const name = typeof raw?.name === "string" ? sanitizeName(raw.name, EXERCISE_NAME_MAX_LENGTH) : "";
    if (!isValidId || !name || !Object.hasOwn(GROUP_LABELS, raw.group)) continue;
    const primary = uniqueMuscles(raw.primary);
    byId.set(raw.id, { id: raw.id, name, group: raw.group, equipment: "", primary, secondary: uniqueMuscles(raw.secondary, primary), aliases: [], isCustom: true });
  }
  return [...byId.values()].slice(-MAX_CUSTOM_EXERCISES);
}
