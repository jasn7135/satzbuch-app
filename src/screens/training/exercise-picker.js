import { sheet } from "../../app/dom.js";
import { saveState, state } from "../../app/state.js";
import { EXERCISE_NAME_MAX_LENGTH } from "../../config/limits.js";
import { EQUIPMENT, MUSCLE_GROUPS, MUSCLES } from "../../data/exercises.js";
import { allLibraryExercises, CUSTOM_GROUP_FILTER, customExerciseById, exerciseInfo, GROUP_LABELS, libraryExercise } from "../../model/exercise-lookup.js";
import { describeMuscles } from "../../model/muscles.js";
import { normalizePlan, planExerciseFrom } from "../../model/plan.js";
import { renderCustomExercisePage } from "./custom-exercise-form.js";
import { changeSelectedDay } from "./plan-editor.js";
import { selectedPlanDay } from "./selected-day.js";
import { renderDayPanel } from "./training-screen.js";
import { ICONS } from "../../svg/icons.js";
import { playAnimation } from "../../ui/animation.js";
import { renderMuscleCard } from "../../ui/muscle-card.js";
import { renderMuscleThumbnail } from "../../ui/muscle-figures.js";
import { closeSheet, renderSheetHeader, showSheet } from "../../ui/sheet.js";
import { showToast } from "../../ui/toast.js";
import { escapeHtml, normalizeSearchText, sanitizeName } from "../../utils/text.js";

const PICKER_FILTERS = [{ id: "all", label: "Alle" }, ...MUSCLE_GROUPS, { id: CUSTOM_GROUP_FILTER, label: "Eigene" }];
export const NEXT_MUSCLE_LEVEL = { none: "primary", primary: "secondary", secondary: "none" };

function searchScore(exercise, query) {
  if (!query) return 1;
  const name = normalizeSearchText(exercise.name);
  if (name.startsWith(query)) return 4;
  if (name.split(/[\s(-]+/).some((word) => word.startsWith(query))) return 3;
  if (name.includes(query)) return 2;
  const related = [...exercise.aliases, EQUIPMENT[exercise.equipment] ?? "", GROUP_LABELS[exercise.group], ...exercise.primary.map((muscle) => MUSCLES[muscle].label)];
  return related.some((text) => normalizeSearchText(text).includes(query)) ? 1 : 0;
}

function matchesPickerFilter(exercise, filter) {
  if (filter === "all") return true;
  if (filter === CUSTOM_GROUP_FILTER) return Boolean(exercise.isCustom);
  return exercise.group === filter;
}

function pickerResults() {
  const { query, filter } = state.picker;
  const normalizedQuery = normalizeSearchText(query);
  return allLibraryExercises()
    .filter((exercise) => matchesPickerFilter(exercise, filter))
    .map((exercise) => ({ exercise, score: searchScore(exercise, normalizedQuery) }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score);
}

function plannedLibraryIds() {
  return new Set(selectedPlanDay().exercises.map((exercise) => exerciseInfo(exercise)?.id).filter(Boolean));
}

function describeLibraryExercise(exercise) {
  return [exercise.isCustom ? "Eigene Übung" : EQUIPMENT[exercise.equipment], describeMuscles(exercise.primary)].filter(Boolean).join(" · ");
}

function renderPickerMark(isPlanned, isSelected) {
  if (isPlanned) return `<span class="check-circle is-planned" aria-hidden="true">${ICONS.check}</span>`;
  return `<span class="check-circle${isSelected ? " is-done" : ""}" aria-hidden="true">${ICONS.check}</span>`;
}

function renderPickerRow(exercise, plannedIds) {
  const isPlanned = plannedIds.has(exercise.id);
  const isSelected = state.picker.selected.includes(exercise.id);
  const id = escapeHtml(exercise.id);
  const name = escapeHtml(exercise.name);
  const meta = isPlanned ? "Schon im Plan" : describeLibraryExercise(exercise);
  return `
    <div class="picker-row">
      <button class="picker-select" type="button" data-action="toggle-picker-exercise" data-id="${id}" aria-pressed="${isSelected}"${isPlanned ? " disabled" : ""}>
        ${renderPickerMark(isPlanned, isSelected)}
        <span class="picker-thumb" aria-hidden="true">${renderMuscleThumbnail(exercise)}</span>
        <span class="exercise-text">
          <span class="exercise-name">${name}</span>
          <span class="exercise-meta">${escapeHtml(meta)}</span>
        </span>
      </button>
      <button class="picker-info" type="button" data-action="show-picker-detail" data-id="${id}" aria-label="Muskeln und Details: ${name}">${ICONS.info}</button>
    </div>`;
}

function renderPickerSections() {
  const results = pickerResults();
  const plannedIds = plannedLibraryIds();
  const bestScore = (group) => Math.max(0, ...results.filter(({ exercise }) => exercise.group === group.id).map(({ score }) => score));
  return [...MUSCLE_GROUPS]
    .sort((first, second) => bestScore(second) - bestScore(first))
    .map((group) => {
      const rows = results.filter(({ exercise }) => exercise.group === group.id).map(({ exercise }) => renderPickerRow(exercise, plannedIds)).join("");
      return rows ? `<h3 class="picker-section">${escapeHtml(group.label)}</h3><div class="group picker-list">${rows}</div>` : "";
    }).join("");
}

function renderPickerResults() {
  const sections = renderPickerSections();
  const query = sanitizeName(state.picker.query, EXERCISE_NAME_MAX_LENGTH);
  const createLabel = query ? `„${query}“ als eigene Übung anlegen` : "Eigene Übung erstellen";
  const empty = sections ? "" : '<p class="picker-empty">Keine passende Übung gefunden.</p>';
  return `
    ${empty}${sections}
    <div class="group picker-create">
      <button class="add-row-button" type="button" data-action="open-custom-exercise">
        <span class="add-badge" aria-hidden="true">${ICONS.plus}</span>
        <span>${escapeHtml(createLabel)}</span>
      </button>
    </div>`;
}

function renderPickerFilters() {
  const hasCustom = state.customExercises.length > 0;
  return PICKER_FILTERS
    .filter((filter) => filter.id !== CUSTOM_GROUP_FILTER || hasCustom)
    .map((filter) => {
      const isSelected = state.picker.filter === filter.id;
      return `<button class="chip${isSelected ? " is-selected" : ""}" type="button" data-action="filter-picker" data-filter="${filter.id}" aria-pressed="${isSelected}">${escapeHtml(filter.label)}</button>`;
    }).join("");
}

function describeAddButton(count) {
  return count === 1 ? "1 Übung hinzufügen" : `${count} Übungen hinzufügen`;
}

function renderPickerListPage() {
  const count = state.picker.selected.length;
  sheet.innerHTML = `
    ${renderSheetHeader({ title: "Übung hinzufügen", confirmAction: "add-picked-exercises", confirmLabel: "Ausgewählte hinzufügen", isConfirmDisabled: count === 0 })}
    <div class="picker-toolbar">
      <label class="search-field">
        ${ICONS.search}
        <input id="picker-search" type="search" value="${escapeHtml(state.picker.query)}" placeholder="Übung oder Muskel suchen" autocomplete="off" enterkeyhint="search" aria-label="Übungen suchen" data-picker-search>
      </label>
      <div class="chip-row" role="group" aria-label="Nach Muskelgruppe filtern">${renderPickerFilters()}</div>
    </div>
    <div class="sheet-body picker-body" id="picker-body">
      <div id="picker-results">${renderPickerResults()}</div>
    </div>
    <div class="sheet-footer" id="picker-footer"${count === 0 ? " hidden" : ""}>
      <button class="button-filled" id="picker-add" type="button" data-action="add-picked-exercises">${describeAddButton(count)}</button>
    </div>`;
  document.getElementById("picker-body").scrollTop = state.picker.listScroll;
}

function renderPickerDetailPage(exercise) {
  const isPlanned = plannedLibraryIds().has(exercise.id);
  const isSelected = state.picker.selected.includes(exercise.id);
  const context = [GROUP_LABELS[exercise.group], exercise.isCustom ? "Eigene Übung" : EQUIPMENT[exercise.equipment]].join(" · ");
  const selectButton = isPlanned
    ? '<button class="button-tinted" type="button" disabled>Schon im Plan</button>'
    : `<button class="${isSelected ? "button-tinted" : "button-filled"}" type="button" data-action="toggle-picker-detail" data-id="${escapeHtml(exercise.id)}">${isSelected ? "Auswahl aufheben" : "Auswählen"}</button>`;
  const deleteButton = exercise.isCustom ? '<button class="button-destructive" type="button" data-action="delete-custom-exercise">Eigene Übung löschen</button>' : "";
  sheet.innerHTML = `
    ${renderSheetHeader({ title: exercise.name, backAction: "picker-back" })}
    <div class="sheet-body">
      <p class="sheet-context">${escapeHtml(context)}</p>
      <section class="group muscle-section">${renderMuscleCard(exercise)}</section>
      <div class="sheet-actions">${selectButton}${deleteButton}</div>
    </div>`;
}

function renderPickerPage() {
  const { page, detailId } = state.picker;
  const detail = page === "detail" ? libraryExercise(detailId) : null;
  if (detail) renderPickerDetailPage(detail);
  else if (page === "custom") renderCustomExercisePage();
  else renderPickerListPage();
}

export function openExercisePicker() {
  state.picker = { query: "", filter: "all", selected: [], page: "list", detailId: null, custom: null, isConfirmingDelete: false, listScroll: 0 };
  renderPickerPage();
  showSheet();
}

export function goToPickerPage(page, changes = {}) {
  const picker = state.picker;
  if (!picker) return;
  if (picker.page === "list") picker.listScroll = document.getElementById("picker-body")?.scrollTop ?? 0;
  const isForward = page !== "list";
  Object.assign(picker, { page, isConfirmingDelete: false }, changes);
  renderPickerPage();
  playAnimation(sheet.querySelector(".sheet-body"), isForward ? "slide-in-from-right" : "slide-in-from-left");
}

function refreshPickerResults() {
  document.getElementById("picker-results").innerHTML = renderPickerResults();
}

function updatePickerSelectionControls() {
  const count = state.picker.selected.length;
  document.getElementById("picker-footer").hidden = count === 0;
  document.getElementById("picker-add").textContent = describeAddButton(count);
  document.getElementById("sheet-confirm").disabled = count === 0;
}

function toggleSelection(libraryId) {
  const picker = state.picker;
  picker.selected = picker.selected.includes(libraryId) ? picker.selected.filter((id) => id !== libraryId) : [...picker.selected, libraryId];
  return picker.selected.includes(libraryId);
}

export function togglePickerExercise(button) {
  if (!state.picker || !libraryExercise(button.dataset.id)) return;
  const isSelected = toggleSelection(button.dataset.id);
  button.setAttribute("aria-pressed", String(isSelected));
  button.querySelector(".check-circle").classList.toggle("is-done", isSelected);
  updatePickerSelectionControls();
}

export function togglePickerDetail(libraryId) {
  if (!state.picker || !libraryExercise(libraryId)) return;
  toggleSelection(libraryId);
  goToPickerPage("list");
}

export function filterPicker(filterId) {
  if (!state.picker || !PICKER_FILTERS.some((filter) => filter.id === filterId)) return;
  state.picker.filter = filterId;
  sheet.querySelectorAll("[data-action='filter-picker']").forEach((chip) => {
    const isSelected = chip.dataset.filter === filterId;
    chip.classList.toggle("is-selected", isSelected);
    chip.setAttribute("aria-pressed", String(isSelected));
  });
  refreshPickerResults();
  document.getElementById("picker-body").scrollTop = 0;
}

export function addPickedExercises() {
  const plannedIds = plannedLibraryIds();
  const exercises = (state.picker?.selected ?? []).map(libraryExercise).filter((exercise) => exercise && !plannedIds.has(exercise.id));
  if (exercises.length === 0) return;
  closeSheet();
  changeSelectedDay((day) => day.exercises.push(...exercises.map(planExerciseFrom)));
  renderDayPanel();
  showToast(exercises.length === 1 ? `${exercises[0].name} hinzugefügt` : `${exercises.length} Übungen hinzugefügt`);
}

export function deleteCustomExercise(button) {
  const picker = state.picker;
  const libraryId = picker?.detailId;
  if (!libraryId || !customExerciseById(libraryId)) return;
  if (!picker.isConfirmingDelete) {
    picker.isConfirmingDelete = true;
    button.textContent = "Zum Löschen erneut tippen";
    return;
  }
  state.customExercises = state.customExercises.filter((exercise) => exercise.id !== libraryId);
  state.plan = normalizePlan(state.plan, state.customExercises);
  picker.selected = picker.selected.filter((id) => id !== libraryId);
  saveState();
  renderDayPanel();
  const hasCustomLeft = state.customExercises.length > 0;
  goToPickerPage("list", { detailId: null, filter: hasCustomLeft || picker.filter !== CUSTOM_GROUP_FILTER ? picker.filter : "all" });
  showToast("Eigene Übung gelöscht");
}

export function handlePickerSearch(input) {
  state.picker.query = input.value;
  refreshPickerResults();
}
