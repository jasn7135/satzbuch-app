import { sheet } from "../../app/dom.js";
import { saveState, state } from "../../app/state.js";
import { EXERCISE_NAME_MAX_LENGTH } from "../../config/limits.js";
import { MUSCLE_GROUPS, MUSCLES } from "../../data/exercises.js";
import { normalizeCustomExercises } from "../../model/custom-exercises.js";
import { CUSTOM_ID_PREFIX, GROUP_LABELS, libraryExerciseByName, MAX_CUSTOM_EXERCISES } from "../../model/exercise-lookup.js";
import { isMuscleId } from "../../model/muscles.js";
import { goToPickerPage, NEXT_MUSCLE_LEVEL } from "./exercise-picker.js";
import { renderMenuSelect } from "../../ui/forms.js";
import { MUSCLE_LEVEL_LABELS, renderMuscleCard } from "../../ui/muscle-card.js";
import { renderSheetHeader } from "../../ui/sheet.js";
import { showToast } from "../../ui/toast.js";
import { createId } from "../../utils/ids.js";
import { escapeHtml, sanitizeName } from "../../utils/text.js";

function customDraftMuscles(draft) {
  const ordered = Object.keys(MUSCLES);
  return {
    primary: ordered.filter((muscle) => draft.muscles[muscle] === "primary"),
    secondary: ordered.filter((muscle) => draft.muscles[muscle] === "secondary"),
  };
}

function defaultMusclesFor(groupId) {
  const group = MUSCLE_GROUPS.find((candidate) => candidate.id === groupId) ?? MUSCLE_GROUPS[0];
  return Object.fromEntries(group.defaultMuscles.map((muscle) => [muscle, "primary"]));
}

function renderMuscleChips(draft) {
  return Object.entries(MUSCLES).map(([muscle, { label }]) => {
    const level = draft.muscles[muscle] ?? "none";
    const stateLabel = level === "none" ? "nicht beansprucht" : MUSCLE_LEVEL_LABELS[level].toLowerCase();
    return `<button class="chip muscle-chip is-${level}" type="button" data-action="cycle-custom-muscle" data-muscle="${muscle}" aria-label="${escapeHtml(`${label}: ${stateLabel}`)}">${escapeHtml(label)}</button>`;
  }).join("");
}

export function renderCustomExercisePage() {
  const draft = state.picker.custom;
  const options = MUSCLE_GROUPS.map(({ id, label }) => ({ value: id, label }));
  sheet.innerHTML = `
    ${renderSheetHeader({ title: "Eigene Übung", backAction: "picker-back", confirmAction: "save-custom-exercise", confirmLabel: "Übung sichern" })}
    <div class="sheet-body">
      <div class="group">
        <label class="form-row" for="custom-name">
          <span class="form-label">Name</span>
          <input class="form-input" id="custom-name" data-custom-field="name" value="${escapeHtml(draft.name)}" placeholder="Pflichtfeld" maxlength="${EXERCISE_NAME_MAX_LENGTH}" autocomplete="off" enterkeyhint="done">
        </label>
        <div class="form-row">
          <span class="form-label">Muskelgruppe</span>
          ${renderMenuSelect("custom-group", 'data-custom-field="group"', options, draft.group, "Muskelgruppe")}
        </div>
      </div>
      <h3 class="section-title">Beanspruchte Muskeln</h3>
      <section class="group muscle-section" id="custom-preview">${renderMuscleCard(customDraftMuscles(draft))}</section>
      <div class="chip-grid" role="group" aria-label="Muskeln markieren" id="custom-muscles">${renderMuscleChips(draft)}</div>
      <p class="note">Einmal tippen: hauptsächlich beansprucht. Zweimal: unterstützend. Dreimal: wieder entfernen.</p>
    </div>`;
}

export function openCustomExercise() {
  const picker = state.picker;
  if (!picker) return;
  const group = MUSCLE_GROUPS.some((candidate) => candidate.id === picker.filter) ? picker.filter : MUSCLE_GROUPS[0].id;
  const name = sanitizeName(picker.query, EXERCISE_NAME_MAX_LENGTH);
  goToPickerPage("custom", { custom: { name, group, muscles: defaultMusclesFor(group), hasCustomMuscles: false } });
}

function refreshCustomPreview() {
  const draft = state.picker.custom;
  document.getElementById("custom-preview").innerHTML = renderMuscleCard(customDraftMuscles(draft));
  document.getElementById("custom-muscles").innerHTML = renderMuscleChips(draft);
}

export function cycleCustomMuscle(muscle) {
  const draft = state.picker?.custom;
  if (!draft || !isMuscleId(muscle)) return;
  const nextLevel = NEXT_MUSCLE_LEVEL[draft.muscles[muscle] ?? "none"];
  if (nextLevel === "none") delete draft.muscles[muscle];
  else draft.muscles[muscle] = nextLevel;
  draft.hasCustomMuscles = true;
  refreshCustomPreview();
  document.querySelector(`[data-action='cycle-custom-muscle'][data-muscle='${muscle}']`)?.focus();
}

export function updateCustomField(input) {
  const draft = state.picker?.custom;
  if (!draft) return;
  if (input.dataset.customField === "name") draft.name = input.value;
  if (input.dataset.customField !== "group" || !Object.hasOwn(GROUP_LABELS, input.value)) return;
  draft.group = input.value;
  if (!draft.hasCustomMuscles) {
    draft.muscles = defaultMusclesFor(draft.group);
    refreshCustomPreview();
  }
}

function describeCustomExerciseError(name, primary) {
  if (!name) return "Gib der Übung einen Namen.";
  if (primary.length === 0) return "Markiere mindestens einen Muskel als hauptsächlich beansprucht.";
  return "";
}

export function saveCustomExercise() {
  const picker = state.picker;
  const draft = picker?.custom;
  if (!draft) return;
  const name = sanitizeName(document.getElementById("custom-name").value, EXERCISE_NAME_MAX_LENGTH);
  const { primary, secondary } = customDraftMuscles(draft);
  const error = describeCustomExerciseError(name, primary);
  if (error) {
    showToast(error);
    return;
  }
  const existing = libraryExerciseByName(name);
  if (existing) {
    if (!picker.selected.includes(existing.id)) picker.selected.push(existing.id);
    goToPickerPage("list", { custom: null, query: "", filter: "all", listScroll: 0 });
    showToast(`„${existing.name}“ gibt es schon und ist ausgewählt.`);
    return;
  }
  if (state.customExercises.length >= MAX_CUSTOM_EXERCISES) {
    showToast(`Du kannst bis zu ${MAX_CUSTOM_EXERCISES} eigene Übungen anlegen.`);
    return;
  }
  const exercise = { id: `${CUSTOM_ID_PREFIX}${createId()}`, name, group: draft.group, primary, secondary };
  state.customExercises = normalizeCustomExercises([...state.customExercises, exercise]);
  saveState();
  picker.selected.push(exercise.id);
  goToPickerPage("list", { custom: null, query: "", filter: "all", listScroll: 0 });
  showToast(`„${name}“ angelegt und ausgewählt`);
}
