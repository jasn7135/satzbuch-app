import { state } from "../../app/state.js";
import { entryFromPlanItem, itemsInMealOrder, MEALS } from "../../model/meal-plan.js";
import { nutritionEntriesOn } from "../../model/nutrition-log.js";
import { describeEntryDetails } from "./nutrition-labels.js";
import { renderAfterNutritionChange, replaceNutritionEntries } from "./nutrition-screen.js";
import { ICONS } from "../../svg/icons.js";
import { renderCardMessage } from "../../ui/components.js";
import { showToast } from "../../ui/toast.js";
import { parseIsoDate, WEEKDAYS, weekdayIndex } from "../../utils/dates.js";
import { formatInteger } from "../../utils/format.js";
import { escapeHtml } from "../../utils/text.js";

function plannedItemsOn(isoDate) {
  return itemsInMealOrder(state.mealPlan.days[weekdayIndex(parseIsoDate(isoDate))]);
}

function loggedPlanItemIds(isoDate) {
  return new Set(nutritionEntriesOn(isoDate).map((entry) => entry.planItemId).filter(Boolean));
}

function renderLogControl(item, isLogged) {
  if (isLogged) return `<span class="plan-log-button is-logged" role="img" aria-label="Eingetragen">${ICONS.check}</span>`;
  return `<button class="plan-log-button" type="button" data-action="log-meal-plan-item" data-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(`${item.name} eintragen`)}">${ICONS.plus}</button>`;
}

function renderPlannedItemRow(item, isLogged) {
  const meal = MEALS.find((candidate) => candidate.id === item.meal);
  return `
    <div class="entry-row plan-row${isLogged ? " is-logged" : ""}">
      <span class="entry-lead">${meal.time}</span>
      <span class="entry-text">
        <span class="entry-title">${escapeHtml(item.name)}</span>
        <span class="entry-sub">${escapeHtml([meal.label, describeEntryDetails(item)].join(" · "))}</span>
      </span>
      <span class="entry-value">${formatInteger(item.kcal)} kcal</span>
      ${renderLogControl(item, isLogged)}
    </div>`;
}

function renderEmptyPlanDay(isoDate) {
  const hasAnyPlan = state.mealPlan.days.some((items) => items.length > 0);
  const weekday = WEEKDAYS[weekdayIndex(parseIsoDate(isoDate))];
  const text = hasAnyPlan
    ? `Für ${weekday} ist nichts geplant.`
    : "Plane, was du an welchem Wochentag isst. Hier trägst du es dann mit einem Tipp ein.";
  return `
    ${renderCardMessage(text)}
    <div class="card-actions"><button class="button-tinted" type="button" data-action="open-meal-plan">${hasAnyPlan ? "Plan bearbeiten" : "Essensplan erstellen"}</button></div>`;
}

/** The meal plan of the weekday of `isoDate`, with one-tap logging for every item not yet logged that day. */
export function renderMealPlanCard(isoDate) {
  const items = plannedItemsOn(isoDate);
  if (items.length === 0) return renderEmptyPlanDay(isoDate);
  const logged = loggedPlanItemIds(isoDate);
  const openCount = items.filter((item) => !logged.has(item.id)).length;
  const logAllButton = openCount > 0 ? `<button class="button-tinted" type="button" data-action="log-all-meal-plan-items">${openCount === items.length ? "Alle eintragen" : `Restliche ${openCount} eintragen`}</button>` : "";
  return `
    ${items.map((item) => renderPlannedItemRow(item, logged.has(item.id))).join("")}
    <div class="card-actions">
      ${logAllButton}
      <button class="button-plain" type="button" data-action="open-meal-plan">Plan bearbeiten</button>
    </div>`;
}

function logItems(items) {
  const entries = items.map((item) => entryFromPlanItem(item, state.nutritionDate));
  replaceNutritionEntries([...state.nutrition.entries, ...entries]);
  renderAfterNutritionChange();
}

export function logPlannedItem(itemId) {
  const logged = loggedPlanItemIds(state.nutritionDate);
  const item = plannedItemsOn(state.nutritionDate).find((candidate) => candidate.id === itemId);
  if (!item || logged.has(item.id)) return;
  logItems([item]);
  showToast(`„${item.name}“ eingetragen`);
}

export function logAllPlannedItems() {
  const logged = loggedPlanItemIds(state.nutritionDate);
  const open = plannedItemsOn(state.nutritionDate).filter((item) => !logged.has(item.id));
  if (open.length === 0) return;
  logItems(open);
  showToast(open.length === 1 ? `„${open[0].name}“ eingetragen` : `${open.length} geplante Essen eingetragen`);
}
