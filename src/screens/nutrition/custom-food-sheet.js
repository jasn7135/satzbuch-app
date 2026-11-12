import { sheet } from "../../app/dom.js";
import { saveState, state } from "../../app/state.js";
import { FOOD_NAME_MAX_LENGTH, MAX_ENTRY_GRAMS } from "../../config/limits.js";
import { MACROS } from "../../config/options.js";
import {
  CUSTOM_FOOD_ID_PREFIX, customFoodNamed, isValidGramsPer100Grams, isValidKcalPer100Grams, MAX_CUSTOM_FOODS, MAX_KCAL_PER_100_GRAMS,
  normalizeCustomFood, normalizeCustomFoods, PORTION_LABEL_MAX_LENGTH,
} from "../../model/custom-foods.js";
import { isValidEntryGrams } from "../../model/nutrition.js";
import { returnToEntryForm } from "./food-entry-sheet.js";
import { describeEntryMacros } from "./nutrition-labels.js";
import { renderNutrition } from "./nutrition-screen.js";
import { ICONS } from "../../svg/icons.js";
import { playAnimation } from "../../ui/animation.js";
import { renderCardMessage } from "../../ui/components.js";
import { renderSheetHeader, showSheet } from "../../ui/sheet.js";
import { showToast } from "../../ui/toast.js";
import { formatInteger, formatOptionalGrams } from "../../utils/format.js";
import { createId } from "../../utils/ids.js";
import { sum, parseNumber, parseWholeNumber } from "../../utils/numbers.js";
import { escapeHtml, sanitizeName } from "../../utils/text.js";

function describePer100(food) {
  const hasMacros = MACROS.some((macro) => food.per100[macro.key] > 0);
  const macros = hasMacros ? ` · ${describeEntryMacros(food.per100)}` : "";
  return `${formatInteger(food.per100.kcal)} kcal${macros} pro 100 g`;
}

function renderCustomFoodRow(food) {
  return `
    <button class="entry-row" type="button" data-action="edit-custom-food" data-id="${escapeHtml(food.id)}">
      <span class="entry-text">
        <span class="entry-title">${escapeHtml(food.name)}</span>
        <span class="entry-sub">${escapeHtml(describePer100(food))}</span>
      </span>
      <span class="chevron" aria-hidden="true">${ICONS.chevron}</span>
    </button>`;
}

function renderCustomFoodList() {
  const foods = [...state.customFoods].sort((first, second) => first.name.localeCompare(second.name, "de"));
  const list = foods.length
    ? `<div class="group">${foods.map(renderCustomFoodRow).join("")}</div>`
    : `<div class="group">${renderCardMessage("Noch keine eigenen Lebensmittel. Leg Produkte an, die du oft isst, dann findest du sie beim Eintragen in den Vorschlägen.")}</div>`;
  sheet.innerHTML = `
    ${renderSheetHeader({ title: "Eigene Lebensmittel" })}
    <div class="sheet-body">
      ${list}
      <div class="sheet-actions"><button class="button-filled" type="button" data-action="new-custom-food">Neues Lebensmittel</button></div>
    </div>`;
}

export function openCustomFoods() {
  state.customFoodDraft = null;
  renderCustomFoodList();
  showSheet();
}

function renderTextField(id, label, value, maxLength, placeholder) {
  return `
    <label class="form-row" for="${id}">
      <span class="form-label">${label}</span>
      <input class="form-input" id="${id}" value="${escapeHtml(value)}" placeholder="${placeholder}" maxlength="${maxLength}" autocomplete="off" enterkeyhint="done">
    </label>`;
}

function renderNumberField(id, label, unit, value, inputMode) {
  return `
    <label class="form-row" for="${id}">
      <span class="form-label">${label}</span>
      <span class="input-with-unit">
        <input class="form-input" id="${id}" value="${escapeHtml(value)}" inputmode="${inputMode}" placeholder="0" autocomplete="off" enterkeyhint="done">
        <span class="input-unit">${unit}</span>
      </span>
    </label>`;
}

function renderCustomFoodForm(food, name) {
  const per100 = food?.per100;
  const macroFields = MACROS.map((macro) => renderNumberField(`custom-food-${macro.key}`, macro.label, "g", per100 ? formatOptionalGrams(per100[macro.key]) : "", "decimal")).join("");
  const deleteButton = food ? '<button class="button-destructive" type="button" data-action="delete-custom-food">Lebensmittel löschen</button>' : "";
  sheet.innerHTML = `
    ${renderSheetHeader({ title: food ? "Lebensmittel bearbeiten" : "Neues Lebensmittel", confirmAction: "save-custom-food", confirmLabel: "Lebensmittel sichern", backAction: "custom-food-back" })}
    <div class="sheet-body">
      <div class="group">${renderTextField("custom-food-name", "Name", food?.name ?? name, FOOD_NAME_MAX_LENGTH, "Pflichtfeld")}</div>
      <p class="group-label">Nährwerte pro 100 g</p>
      <div class="group">
        ${renderNumberField("custom-food-kcal", "Kalorien", "kcal", per100 ? per100.kcal : "", "numeric")}
        ${macroFields}
      </div>
      <p class="group-label">Portion (freiwillig)</p>
      <div class="group">
        ${renderTextField("custom-food-portion-label", "Bezeichnung", food?.portion?.label ?? "", PORTION_LABEL_MAX_LENGTH, "z. B. 1 Riegel")}
        ${renderNumberField("custom-food-portion-grams", "Menge", "g", food?.portion?.grams ?? "", "numeric")}
      </div>
      <p class="note">Die Werte stehen auf der Verpackung in der Spalte „pro 100 g“. Mit einer Portion schlägt Formline beim Eintragen gleich die passende Menge vor.</p>
      <div class="sheet-actions">${deleteButton}</div>
    </div>`;
}

/** Opens the custom food form; `returnTo` is "list" or "entry" (the nutrition entry form that is waiting for the food). */
export function openCustomFoodForm({ foodId = null, name = "", returnTo }) {
  const food = foodId ? state.customFoods.find((candidate) => candidate.id === foodId) ?? null : null;
  state.customFoodDraft = { id: food?.id ?? null, returnTo, isConfirmingDelete: false };
  renderCustomFoodForm(food, sanitizeName(name, FOOD_NAME_MAX_LENGTH));
  playAnimation(sheet.querySelector(".sheet-body"), "slide-in-from-right");
}

function readPer100Grams(id, label) {
  const text = document.getElementById(id).value.trim();
  if (text === "") return { value: 0 };
  const grams = parseNumber(text);
  return isValidGramsPer100Grams(grams) ? { value: Math.round(grams * 10) / 10 } : { error: `${label}: Gib einen Wert zwischen 0 und 100 g ein.` };
}

function readPortion() {
  const label = sanitizeName(document.getElementById("custom-food-portion-label").value, PORTION_LABEL_MAX_LENGTH);
  const gramsText = document.getElementById("custom-food-portion-grams").value.trim();
  if (!label && gramsText === "") return { portion: null };
  const grams = parseWholeNumber(gramsText);
  if (!label || !isValidEntryGrams(grams)) return { error: `Portion: Gib eine Bezeichnung und eine Menge zwischen 1 und ${formatInteger(MAX_ENTRY_GRAMS)} g ein, oder lass beides leer.` };
  return { portion: { label, grams } };
}

function readCustomFoodForm() {
  const name = sanitizeName(document.getElementById("custom-food-name").value, FOOD_NAME_MAX_LENGTH);
  if (!name) return { error: "Gib dem Lebensmittel einen Namen." };
  const kcal = parseWholeNumber(document.getElementById("custom-food-kcal").value);
  if (!isValidKcalPer100Grams(kcal)) return { error: `Gib die Kalorien pro 100 g ein, zwischen 0 und ${MAX_KCAL_PER_100_GRAMS} kcal.` };
  const per100 = { kcal };
  for (const macro of MACROS) {
    const result = readPer100Grams(`custom-food-${macro.key}`, macro.label);
    if (result.error) return { error: result.error };
    per100[macro.key] = result.value;
  }
  if (sum(MACROS.map((macro) => per100[macro.key])) > 100) return { error: "Protein, Kohlenhydrate und Fett ergeben zusammen mehr als 100 g pro 100 g." };
  const portion = readPortion();
  if (portion.error) return { error: portion.error };
  return { fields: { name, per100, portion: portion.portion } };
}

function describeSaveError(fields, draft) {
  if (customFoodNamed(state.customFoods, fields.name, draft.id)) return `„${fields.name}“ gibt es schon bei deinen eigenen Lebensmitteln.`;
  if (!draft.id && state.customFoods.length >= MAX_CUSTOM_FOODS) return `Du kannst bis zu ${MAX_CUSTOM_FOODS} eigene Lebensmittel anlegen.`;
  return "";
}

export function saveCustomFood() {
  const draft = state.customFoodDraft;
  if (!draft) return;
  const form = readCustomFoodForm();
  const error = form.error ?? describeSaveError(form.fields, draft);
  if (error) {
    showToast(error);
    return;
  }
  const food = normalizeCustomFood({ id: draft.id ?? `${CUSTOM_FOOD_ID_PREFIX}${createId()}`, ...form.fields });
  if (!food) {
    showToast("Das Lebensmittel konnte nicht gespeichert werden.");
    return;
  }
  const isNew = !state.customFoods.some((existing) => existing.id === food.id);
  state.customFoods = normalizeCustomFoods(isNew ? [...state.customFoods, food] : state.customFoods.map((existing) => (existing.id === food.id ? food : existing)));
  saveState();
  renderNutrition();
  leaveCustomFoodForm(food);
  showToast(isNew ? `„${food.name}“ angelegt` : `„${food.name}“ gesichert`);
}

export function deleteCustomFood(button) {
  const draft = state.customFoodDraft;
  if (!draft?.id) return;
  if (!draft.isConfirmingDelete) {
    draft.isConfirmingDelete = true;
    button.textContent = "Zum Löschen erneut tippen";
    return;
  }
  state.customFoods = state.customFoods.filter((food) => food.id !== draft.id);
  saveState();
  renderNutrition();
  leaveCustomFoodForm();
  showToast("Lebensmittel gelöscht");
}

/** Leaves the form towards where it was opened from; `food` is handed to a waiting entry form. */
export function leaveCustomFoodForm(food = null) {
  const draft = state.customFoodDraft;
  if (!draft) return;
  state.customFoodDraft = null;
  if (draft.returnTo === "entry") {
    returnToEntryForm(food);
    return;
  }
  renderCustomFoodList();
  playAnimation(sheet.querySelector(".sheet-body"), "slide-in-from-left");
}
