import { sheet } from "../../app/dom.js";
import { state } from "../../app/state.js";
import { FOOD_NAME_MAX_LENGTH, MAX_ENTRY_GRAMS, MAX_ENTRY_KCAL, MAX_ENTRY_MACRO_GRAMS } from "../../config/limits.js";
import { MACROS } from "../../config/options.js";
import { FOODS } from "../../data/foods.js";
import { caloriesFromMacros, isValidClockTime, isValidEntryCalories, isValidEntryGrams, isValidMacroGrams, normalizeNutritionEntry } from "../../model/nutrition.js";
import { renderFoodSuggestions } from "./food-suggestions.js";
import { nutritionElements, renderAfterNutritionChange, replaceNutritionEntries } from "./nutrition-screen.js";
import { ICONS } from "../../svg/icons.js";
import { playAnimation } from "../../ui/animation.js";
import { closeSheet, renderSheetHeader, showSheet } from "../../ui/sheet.js";
import { showToast } from "../../ui/toast.js";
import { currentClockTime, parseIsoDate, todayIso } from "../../utils/dates.js";
import { describeRelativeDay, formatInteger, formatOptionalGrams, fullDateFormat } from "../../utils/format.js";
import { createId } from "../../utils/ids.js";
import { parseNumber, parseWholeNumber } from "../../utils/numbers.js";
import { escapeHtml, sanitizeName } from "../../utils/text.js";

function renderEntryField(id, label, unit, value, inputMode) {
  return `
    <label class="form-row" for="${id}">
      <span class="form-label">${label}</span>
      <span class="input-with-unit">
        <input class="form-input" id="${id}" data-nutrition-field value="${value}" inputmode="${inputMode}" placeholder="0" autocomplete="off" enterkeyhint="done">
        <span class="input-unit">${unit}</span>
      </span>
    </label>`;
}

const NUTRIENT_KEYS = ["kcal", ...MACROS.map((macro) => macro.key)];

function renderNutritionEntrySheet(entry) {
  const values = entry ?? { name: "", grams: null, kcal: "", protein: "", carbs: "", fat: "", time: state.nutritionDate === todayIso() ? currentClockTime() : "12:00" };
  const macroFields = MACROS.map((macro) => renderEntryField(`entry-${macro.key}`, macro.label, "g", formatOptionalGrams(values[macro.key]), "decimal")).join("");
  const deleteButton = entry ? '<button class="button-destructive" id="delete-entry" type="button" data-action="delete-nutrition-entry">Eintrag löschen</button>' : "";
  sheet.innerHTML = `
    ${renderSheetHeader({ title: entry ? "Eintrag bearbeiten" : "Neuer Eintrag", confirmAction: "save-nutrition-entry", confirmLabel: "Sichern" })}
    <div class="sheet-body">
      <p class="sheet-context">${escapeHtml(describeRelativeDay(state.nutritionDate))}, ${escapeHtml(fullDateFormat.format(parseIsoDate(state.nutritionDate)))}</p>
      <label class="search-field food-field">
        ${ICONS.search}
        <input id="entry-name" type="search" value="${escapeHtml(values.name)}" placeholder="Was hast du gegessen?" maxlength="${FOOD_NAME_MAX_LENGTH}" autocomplete="off" enterkeyhint="done" aria-label="Lebensmittel oder Gericht">
      </label>
      <div id="food-suggestions">${entry ? "" : renderFoodSuggestions("")}</div>
      <div class="group">
        ${renderEntryField("entry-grams", "Menge", "g", values.grams ?? "", "numeric")}
        ${renderEntryField("entry-kcal", "Kalorien", "kcal", entry ? entry.kcal : "", "numeric")}
        ${macroFields}
        <label class="form-row" for="entry-time">
          <span class="form-label">Uhrzeit</span>
          <input class="form-input" id="entry-time" type="time" value="${escapeHtml(values.time)}">
        </label>
      </div>
      <p class="note">Wählst du einen Vorschlag, rechnet Satzbuch Kalorien und Makros passend zur Menge. Die Nährwerte der Liste sind Durchschnittswerte, genauer ist die Packungsangabe. Lässt du Kalorien leer, werden sie aus den Makros berechnet.</p>
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
  state.nutritionDraft = { id: entry?.id ?? null, isConfirmingDelete: false, basis: basisFromEntry(entry) };
  renderNutritionEntrySheet(entry);
  showSheet();
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

export function pickFood(button) {
  const draft = state.nutritionDraft;
  if (!draft) return;
  const isRecent = button.dataset.source === "recent";
  const item = isRecent
    ? state.nutrition.entries.find((entry) => entry.id === button.dataset.key)
    : FOODS.find((food) => food.id === button.dataset.key);
  if (!item) return;
  document.getElementById("entry-name").value = item.name;
  document.getElementById("food-suggestions").innerHTML = "";
  if (isRecent) {
    draft.basis = basisFromEntry(item);
    document.getElementById("entry-grams").value = item.grams ?? "";
    document.getElementById("entry-kcal").value = formatInteger(item.kcal);
    for (const macro of MACROS) document.getElementById(`entry-${macro.key}`).value = formatOptionalGrams(item[macro.key]);
    return;
  }
  const grams = item.portion?.grams ?? 100;
  draft.basis = item.per100;
  document.getElementById("entry-grams").value = grams;
  writeNutrientFields(draft.basis, grams);
  playAnimation(document.getElementById("entry-grams").closest(".group"), "fade-in");
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

function readNutritionForm() {
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
  fields.time = document.getElementById("entry-time").value;
  if (!isValidClockTime(fields.time)) return { error: "Wähle eine Uhrzeit aus." };
  const gramsText = document.getElementById("entry-grams").value.trim();
  fields.grams = gramsText === "" ? null : parseWholeNumber(gramsText);
  if (fields.grams !== null && !isValidEntryGrams(fields.grams)) return { error: `Menge: Gib zwischen 1 und ${formatInteger(MAX_ENTRY_GRAMS)} g ein.` };
  fields.name = sanitizeName(document.getElementById("entry-name").value, FOOD_NAME_MAX_LENGTH);
  return { fields };
}

export function saveNutritionEntry() {
  const draft = state.nutritionDraft;
  if (!draft) return;
  const form = readNutritionForm();
  if (form.error) {
    showToast(form.error);
    return;
  }
  const entry = normalizeNutritionEntry({ id: draft.id ?? createId(), date: state.nutritionDate, ...form.fields });
  if (!entry) {
    showToast("Der Eintrag konnte nicht gespeichert werden.");
    return;
  }
  replaceNutritionEntries([...state.nutrition.entries.filter((existing) => existing.id !== entry.id), entry]);
  closeSheet();
  renderAfterNutritionChange();
  const row = nutritionElements.entries.querySelector(`[data-id="${CSS.escape(entry.id)}"]`);
  if (row) playAnimation(row, "fade-in");
}

export function deleteNutritionEntry(button) {
  const draft = state.nutritionDraft;
  if (!draft?.id) return;
  if (!draft.isConfirmingDelete) {
    draft.isConfirmingDelete = true;
    button.textContent = "Zum Löschen erneut tippen";
    return;
  }
  replaceNutritionEntries(state.nutrition.entries.filter((entry) => entry.id !== draft.id));
  closeSheet();
  renderAfterNutritionChange();
  showToast("Eintrag gelöscht");
}
