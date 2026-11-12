import { sheet } from "../../app/dom.js";
import { state } from "../../app/state.js";
import { FOOD_NAME_MAX_LENGTH, MAX_ENTRY_GRAMS, MAX_ENTRY_KCAL, MAX_ENTRY_MACRO_GRAMS } from "../../config/limits.js";
import { MACROS } from "../../config/options.js";
import { FOODS } from "../../data/foods.js";
import { MEALS } from "../../model/meal-plan.js";
import { caloriesFromMacros, isValidClockTime, isValidEntryCalories, isValidEntryGrams, isValidMacroGrams, normalizeNutritionEntry } from "../../model/nutrition.js";
import { openCustomFoodForm } from "./custom-food-sheet.js";
import { renderFoodSuggestions } from "./food-suggestions.js";
import { removePlannedItem, savePlannedItem } from "./meal-plan-sheet.js";
import { nutritionElements, renderAfterNutritionChange, replaceNutritionEntries } from "./nutrition-screen.js";
import { ICONS } from "../../svg/icons.js";
import { playAnimation } from "../../ui/animation.js";
import { renderMenuSelect } from "../../ui/forms.js";
import { closeSheet, renderSheetHeader, showSheet } from "../../ui/sheet.js";
import { showToast } from "../../ui/toast.js";
import { currentClockTime, parseIsoDate, todayIso, WEEKDAYS } from "../../utils/dates.js";
import { describeRelativeDay, formatInteger, formatOptionalGrams, fullDateFormat } from "../../utils/format.js";
import { createId } from "../../utils/ids.js";
import { parseNumber, parseWholeNumber } from "../../utils/numbers.js";
import { escapeHtml, sanitizeName } from "../../utils/text.js";

const NUTRIENT_KEYS = ["kcal", ...MACROS.map((macro) => macro.key)];
const MEAL_OPTIONS = MEALS.map((meal) => ({ value: meal.id, label: meal.label }));

function renderEntryField(id, label, unit, value, inputMode) {
  return `
    <label class="form-row" for="${id}">
      <span class="form-label">${label}</span>
      <span class="input-with-unit">
        <input class="form-input" id="${id}" data-nutrition-field value="${escapeHtml(value)}" inputmode="${inputMode}" placeholder="0" autocomplete="off" enterkeyhint="done">
        <span class="input-unit">${unit}</span>
      </span>
    </label>`;
}

function renderTimeField(time) {
  return `
    <label class="form-row" for="entry-time">
      <span class="form-label">Uhrzeit</span>
      <input class="form-input" id="entry-time" type="time" value="${escapeHtml(time)}">
    </label>`;
}

function renderMealField(meal) {
  return `
    <div class="form-row">
      <span class="form-label">Mahlzeit</span>
      ${renderMenuSelect("entry-meal", "data-entry-meal", MEAL_OPTIONS, meal, "Mahlzeit")}
    </div>`;
}

function isPlanning(draft) {
  return draft.target === "plan";
}

function describeSheetTitle(draft) {
  if (isPlanning(draft)) return draft.id ? "Geplantes Essen" : "Zum Essensplan";
  return draft.id ? "Eintrag bearbeiten" : "Neuer Eintrag";
}

function describeSheetContext(draft) {
  if (isPlanning(draft)) return `${WEEKDAYS[draft.weekday]} · Essensplan`;
  return `${describeRelativeDay(state.nutritionDate)}, ${fullDateFormat.format(parseIsoDate(state.nutritionDate))}`;
}

function emptyFormValues(draft) {
  return { name: "", grams: "", kcal: "", protein: "", carbs: "", fat: "", time: state.nutritionDate === todayIso() ? currentClockTime() : "12:00", meal: draft.meal };
}

function formValuesOf(record) {
  const values = { name: record.name, grams: record.grams ?? "", kcal: record.kcal, time: record.time, meal: record.meal };
  for (const macro of MACROS) values[macro.key] = formatOptionalGrams(record[macro.key]);
  return values;
}

function readFormSnapshot() {
  const snapshot = {
    name: document.getElementById("entry-name").value,
    grams: document.getElementById("entry-grams").value,
    kcal: document.getElementById("entry-kcal").value,
    time: document.getElementById("entry-time")?.value,
    meal: document.getElementById("entry-meal")?.value,
  };
  for (const macro of MACROS) snapshot[macro.key] = document.getElementById(`entry-${macro.key}`).value;
  return snapshot;
}

function renderNutritionEntrySheet(values, { showSuggestions }) {
  const draft = state.nutritionDraft;
  const macroFields = MACROS.map((macro) => renderEntryField(`entry-${macro.key}`, macro.label, "g", values[macro.key], "decimal")).join("");
  const deleteLabel = isPlanning(draft) ? "Aus dem Plan entfernen" : "Eintrag löschen";
  const deleteButton = draft.id ? `<button class="button-destructive" id="delete-entry" type="button" data-action="delete-nutrition-entry">${deleteLabel}</button>` : "";
  const placeholder = isPlanning(draft) ? "Was möchtest du essen?" : "Was hast du gegessen?";
  sheet.innerHTML = `
    ${renderSheetHeader({ title: describeSheetTitle(draft), confirmAction: "save-nutrition-entry", confirmLabel: "Sichern", backAction: isPlanning(draft) ? "back-to-meal-plan" : "" })}
    <div class="sheet-body">
      <p class="sheet-context">${escapeHtml(describeSheetContext(draft))}</p>
      <label class="search-field food-field">
        ${ICONS.search}
        <input id="entry-name" type="search" value="${escapeHtml(values.name)}" placeholder="${placeholder}" maxlength="${FOOD_NAME_MAX_LENGTH}" autocomplete="off" enterkeyhint="done" aria-label="Lebensmittel oder Gericht">
      </label>
      <div id="food-suggestions">${showSuggestions ? renderFoodSuggestions(values.name) : ""}</div>
      <div class="group">
        ${renderEntryField("entry-grams", "Menge", "g", values.grams, "numeric")}
        ${renderEntryField("entry-kcal", "Kalorien", "kcal", values.kcal, "numeric")}
        ${macroFields}
        ${isPlanning(draft) ? renderMealField(values.meal) : renderTimeField(values.time)}
      </div>
      <p class="note">Wählst du einen Vorschlag, rechnet Formline Kalorien und Makros passend zur Menge. Die Nährwerte der Liste sind Durchschnittswerte, genauer ist die Packungsangabe. Lässt du Kalorien leer, werden sie aus den Makros berechnet.</p>
      <div class="sheet-actions">${deleteButton}</div>
    </div>`;
}

function basisFromEntry(entry) {
  if (!entry?.grams) return null;
  return Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, (entry[key] * 100) / entry.grams]));
}

export function openNutritionEntry(entryId = null) {
  const entry = entryId ? state.nutrition.entries.find((candidate) => candidate.id === entryId) ?? null : null;
  if (entry) state.nutritionDate = entry.date;
  state.nutritionDraft = { id: entry?.id ?? null, isConfirmingDelete: false, basis: basisFromEntry(entry), target: "log" };
  renderNutritionEntrySheet(entry ? formValuesOf(entry) : emptyFormValues(state.nutritionDraft), { showSuggestions: !entry });
  showSheet();
}

/** Opens the entry form inside the meal plan sheet, for a new item in `meal` or for the planned item `itemId`. */
export function openPlannedItem({ weekday, meal, itemId = null }) {
  const item = itemId ? state.mealPlan.days[weekday].find((candidate) => candidate.id === itemId) ?? null : null;
  state.nutritionDraft = { id: item?.id ?? null, isConfirmingDelete: false, basis: basisFromEntry(item), target: "plan", weekday, meal: item?.meal ?? meal };
  renderNutritionEntrySheet(item ? formValuesOf(item) : emptyFormValues(state.nutritionDraft), { showSuggestions: !item });
  playAnimation(sheet.querySelector(".sheet-body"), "slide-in-from-right");
}

function readFormGrams() {
  const grams = parseWholeNumber(document.getElementById("entry-grams").value);
  return isValidEntryGrams(grams) ? grams : null;
}

function writeNutrientFields(basis, grams) {
  document.getElementById("entry-kcal").value = formatInteger((basis.kcal * grams) / 100);
  for (const macro of MACROS) {
    document.getElementById(`entry-${macro.key}`).value = formatOptionalGrams(Math.round((basis[macro.key] * grams) / 10) / 10);
  }
}

function readNutrientFields() {
  const values = { kcal: parseWholeNumber(document.getElementById("entry-kcal").value) };
  for (const macro of MACROS) values[macro.key] = parseNumber(document.getElementById(`entry-${macro.key}`).value) ?? 0;
  if (!Number.isFinite(values.kcal)) values.kcal = caloriesFromMacros(values);
  return values;
}

function applyRecentEntry(draft, entry) {
  draft.basis = basisFromEntry(entry);
  document.getElementById("entry-grams").value = entry.grams ?? "";
  document.getElementById("entry-kcal").value = formatInteger(entry.kcal);
  for (const macro of MACROS) document.getElementById(`entry-${macro.key}`).value = formatOptionalGrams(entry[macro.key]);
}

function applyFoodPer100(draft, food) {
  const grams = food.portion?.grams ?? 100;
  draft.basis = food.per100;
  document.getElementById("entry-grams").value = grams;
  writeNutrientFields(draft.basis, grams);
  playAnimation(document.getElementById("entry-grams").closest(".group"), "fade-in");
}

function applyFood(source, item) {
  const draft = state.nutritionDraft;
  document.getElementById("entry-name").value = item.name;
  document.getElementById("food-suggestions").innerHTML = "";
  if (source === "recent") applyRecentEntry(draft, item);
  else applyFoodPer100(draft, item);
}

const FOOD_SOURCES = {
  recent: (key) => state.nutrition.entries.find((entry) => entry.id === key),
  custom: (key) => state.customFoods.find((food) => food.id === key),
  library: (key) => FOODS.find((food) => food.id === key),
};

export function pickFood(button) {
  const findItem = FOOD_SOURCES[button.dataset.source];
  const item = state.nutritionDraft && findItem ? findItem(button.dataset.key) : null;
  if (item) applyFood(button.dataset.source, item);
}

export function createCustomFoodFromEntry() {
  const draft = state.nutritionDraft;
  if (!draft) return;
  draft.formSnapshot = readFormSnapshot();
  openCustomFoodForm({ name: draft.formSnapshot.name, returnTo: "entry" });
}

/** Returns from the custom food form to the entry form as it was left, applying `food` when one was just created. */
export function returnToEntryForm(food = null) {
  const draft = state.nutritionDraft;
  renderNutritionEntrySheet(draft.formSnapshot, { showSuggestions: !food });
  playAnimation(sheet.querySelector(".sheet-body"), "slide-in-from-left");
  if (food) applyFood("custom", food);
}

export function handleNutritionSheetInput(input) {
  const draft = state.nutritionDraft;
  if (!draft) return;
  if (input.id === "entry-name") {
    document.getElementById("food-suggestions").innerHTML = renderFoodSuggestions(input.value);
    return;
  }
  if (!input.matches("[data-nutrition-field]")) return;
  const grams = readFormGrams();
  if (input.id === "entry-grams") {
    if (draft.basis && grams) writeNutrientFields(draft.basis, grams);
    return;
  }
  const values = readNutrientFields();
  draft.basis = grams ? Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, (values[key] * 100) / grams])) : null;
}

export function addNutritionEntryForToday() {
  state.nutritionDate = todayIso();
  openNutritionEntry();
}

function readGrams(id, label) {
  const text = document.getElementById(id).value.trim();
  if (text === "") return { value: 0 };
  const grams = parseNumber(text);
  return isValidMacroGrams(grams) ? { value: Math.round(grams * 10) / 10 } : { error: `${label}: Gib einen Wert zwischen 0 und ${MAX_ENTRY_MACRO_GRAMS} g ein.` };
}

function readWhenField(draft) {
  if (isPlanning(draft)) {
    const meal = document.getElementById("entry-meal").value;
    return MEALS.some((candidate) => candidate.id === meal) ? { meal } : { error: "Wähle eine Mahlzeit aus." };
  }
  const time = document.getElementById("entry-time").value;
  return isValidClockTime(time) ? { time } : { error: "Wähle eine Uhrzeit aus." };
}

function readNutritionForm(draft) {
  const fields = {};
  for (const macro of MACROS) {
    const result = readGrams(`entry-${macro.key}`, macro.label);
    if (result.error) return { error: result.error };
    fields[macro.key] = result.value;
  }
  const kcalText = document.getElementById("entry-kcal").value.trim();
  fields.kcal = kcalText === "" ? caloriesFromMacros(fields) : parseWholeNumber(kcalText);
  if (!isValidEntryCalories(fields.kcal)) return { error: `Gib zwischen 0 und ${formatInteger(MAX_ENTRY_KCAL)} kcal ein.` };
  if (fields.kcal === 0 && caloriesFromMacros(fields) === 0) return { error: "Trag Kalorien oder mindestens einen Makro-Wert ein." };
  const when = readWhenField(draft);
  if (when.error) return { error: when.error };
  Object.assign(fields, when);
  const gramsText = document.getElementById("entry-grams").value.trim();
  fields.grams = gramsText === "" ? null : parseWholeNumber(gramsText);
  if (fields.grams !== null && !isValidEntryGrams(fields.grams)) return { error: `Menge: Gib zwischen 1 und ${formatInteger(MAX_ENTRY_GRAMS)} g ein.` };
  fields.name = sanitizeName(document.getElementById("entry-name").value, FOOD_NAME_MAX_LENGTH);
  return { fields };
}

function saveLoggedEntry(draft, fields) {
  const entry = normalizeNutritionEntry({ id: draft.id ?? createId(), date: state.nutritionDate, ...fields });
  if (!entry) {
    showToast("Der Eintrag konnte nicht gespeichert werden.");
    return;
  }
  const previous = state.nutrition.entries.find((existing) => existing.id === entry.id);
  if (previous?.planItemId) entry.planItemId = previous.planItemId;
  replaceNutritionEntries([...state.nutrition.entries.filter((existing) => existing.id !== entry.id), entry]);
  closeSheet();
  renderAfterNutritionChange();
  const row = nutritionElements.entries.querySelector(`[data-id="${CSS.escape(entry.id)}"]`);
  if (row) playAnimation(row, "fade-in");
}

export function saveNutritionEntry() {
  const draft = state.nutritionDraft;
  if (!draft) return;
  const form = readNutritionForm(draft);
  if (form.error) {
    showToast(form.error);
    return;
  }
  if (isPlanning(draft)) savePlannedItem(draft, form.fields);
  else saveLoggedEntry(draft, form.fields);
}

export function deleteNutritionEntry(button) {
  const draft = state.nutritionDraft;
  if (!draft?.id) return;
  if (!draft.isConfirmingDelete) {
    draft.isConfirmingDelete = true;
    button.textContent = "Zum Löschen erneut tippen";
    return;
  }
  if (isPlanning(draft)) {
    removePlannedItem(draft.weekday, draft.id);
    return;
  }
  replaceNutritionEntries(state.nutrition.entries.filter((entry) => entry.id !== draft.id));
  closeSheet();
  renderAfterNutritionChange();
  showToast("Eintrag gelöscht");
}
