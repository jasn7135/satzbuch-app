import { updateNav } from "../../app/navigation.js";
import { saveState, state } from "../../app/state.js";
import { EXERCISE_NAME_MAX_LENGTH, NAME_MAX_LENGTH } from "../../config/limits.js";
import { exerciseInfo, GROUP_LABELS } from "../../model/exercise-lookup.js";
import { findExercise, selectedPlanDay } from "./selected-day.js";
import { renderDayPanel, renderTraining, trainingElements, updateTitleBlock, updateWeekStrip } from "./training-screen.js";
import { ICONS } from "../../svg/icons.js";
import { playAnimation } from "../../ui/animation.js";
import { WEEKDAYS } from "../../utils/dates.js";
import { deepCopy } from "../../utils/objects.js";
import { escapeHtml, sanitizeName } from "../../utils/text.js";

export function renderEditor() {
  const day = selectedPlanDay();
  const weekday = escapeHtml(WEEKDAYS[state.selectedDay]);
  return `
    <label class="group-label" for="day-name">Name des Trainings</label>
    <input class="title-input" id="day-name" data-field="day-name" value="${escapeHtml(day.name)}" placeholder="${weekday}" maxlength="${NAME_MAX_LENGTH}" autocomplete="off" enterkeyhint="done">
    <p class="group-label">Übungen</p>
    <ul class="group edit-list">
      ${day.exercises.map(renderEditRow).join("")}
      <li class="edit-row">
        <button class="add-row-button" type="button" data-action="open-exercise-picker">
          <span class="add-badge" aria-hidden="true">${ICONS.plus}</span>
          <span>Übung hinzufügen</span>
        </button>
      </li>
    </ul>
    <p class="note">Übungen wählst du aus der Liste oder legst eigene an. Der Verlauf einer Übung bleibt erhalten, auch wenn du sie entfernst.</p>`;
}

function renderEditRow(exercise) {
  const name = escapeHtml(exercise.name);
  const id = escapeHtml(exercise.id);
  const info = exerciseInfo(exercise);
  const groupLabel = info ? `<span class="edit-meta">${escapeHtml(GROUP_LABELS[info.group])}</span>` : "";
  return `
    <li class="edit-row">
      <button class="remove-badge" type="button" data-action="remove-exercise" data-id="${id}" aria-label="${name} entfernen">${ICONS.minus}</button>
      <input class="edit-input" id="exercise-${id}" data-field="exercise-name" data-id="${id}" value="${name}" maxlength="${EXERCISE_NAME_MAX_LENGTH}" autocomplete="off" enterkeyhint="done" aria-label="Name der Übung">
      ${groupLabel}
    </li>`;
}

export function setEditing(isEditing) {
  state.isEditing = isEditing;
  renderTraining();
  updateNav();
  playAnimation(trainingElements.panel, "fade-in");
}

export function finishEditing() {
  setEditing(false);
}

export function changeSelectedDay(mutate) {
  const plan = deepCopy(state.plan);
  mutate(plan.days[state.selectedDay]);
  state.plan = plan;
  updateWeekStrip();
  updateTitleBlock();
  saveState();
}

export function removeExercise(exerciseId) {
  changeSelectedDay((day) => {
    day.exercises = day.exercises.filter((exercise) => exercise.id !== exerciseId);
  });
  renderDayPanel();
}

function renameDay(input) {
  const name = sanitizeName(input.value, NAME_MAX_LENGTH);
  if (name === selectedPlanDay().name) return;
  changeSelectedDay((day) => {
    day.name = name;
  });
  updateNav();
}

function renameExercise(input) {
  const exercise = findExercise(input.dataset.id);
  const name = sanitizeName(input.value, EXERCISE_NAME_MAX_LENGTH);
  if (!exercise) return;
  if (!name) {
    input.value = exercise.name;
    return;
  }
  if (name === exercise.name) return;
  changeSelectedDay((day) => {
    day.exercises.find((candidate) => candidate.id === exercise.id).name = name;
  });
}

export function handleEditorChange(event) {
  const field = event.target.dataset.field;
  if (field === "day-name") renameDay(event.target);
  if (field === "exercise-name") renameExercise(event.target);
}

export function handleEditorKeydown(event) {
  if (event.key !== "Enter" || !event.target.matches("input")) return;
  event.preventDefault();
  event.target.blur();
}
