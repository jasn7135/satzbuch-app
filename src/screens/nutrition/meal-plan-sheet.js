import { sheet } from "../../app/dom.js";
import { saveState, state } from "../../app/state.js";
import { MAX_PLANNED_ITEMS_PER_DAY, MEALS, normalizeMealPlanItem } from "../../model/meal-plan.js";
import { totalsOf } from "../../model/nutrition.js";
import { openPlannedItem } from "./food-entry-sheet.js";
import { describeEntryDetails } from "./nutrition-labels.js";
import { renderNutrition } from "./nutrition-screen.js";
import { ICONS } from "../../svg/icons.js";
import { playAnimation } from "../../ui/animation.js";
import { renderSheetHeader, showSheet } from "../../ui/sheet.js";
import { showToast } from "../../ui/toast.js";
import { parseIsoDate, WEEKDAY_LABELS, WEEKDAYS, weekdayIndex } from "../../utils/dates.js";
import { formatInteger } from "../../utils/format.js";
import { createId } from "../../utils/ids.js";
import { escapeHtml } from "../../utils/text.js";

function plannedItems(weekday) {
  return state.mealPlan.days[weekday];
}

function renderDayChips(selectedDay) {
  return WEEKDAY_LABELS.map((label, day) => {
    const isSelected = day === selectedDay;
    const count = plannedItems(day).length;
    return `<button class="chip${isSelected ? " is-selected" : ""}" type="button" data-action="select-meal-plan-day" data-day="${day}" aria-pressed="${isSelected}" aria-label="${WEEKDAYS[day]}, ${count} geplant">${label}</button>`;
  }).join("");
}

function describeDayTotals(items) {
  if (items.length === 0) return "Noch nichts geplant";
  const totals = totalsOf(items);
  return `Geplant: ${formatInteger(totals.kcal)} kcal · Protein ${formatInteger(totals.protein)} g`;
}

function renderPlannedRow(item) {
  return `
    <button class="entry-row" type="button" data-action="edit-meal-plan-item" data-id="${escapeHtml(item.id)}">
      <span class="entry-text">
        <span class="entry-title">${escapeHtml(item.name)}</span>
        <span class="entry-sub">${escapeHtml(describeEntryDetails(item))}</span>
      </span>
      <span class="entry-value">${formatInteger(item.kcal)} kcal</span>
      <span class="chevron" aria-hidden="true">${ICONS.chevron}</span>
    </button>`;
}

function renderMealSection(meal, items) {
  const rows = items.filter((item) => item.meal === meal.id).map(renderPlannedRow).join("");
  return `
    <p class="group-label">${meal.label}</p>
    <div class="group">
      ${rows}
      <div class="add-row">
        <button class="add-row-button" type="button" data-action="add-meal-plan-item" data-meal="${meal.id}">
          <span class="add-badge" aria-hidden="true">${ICONS.plus}</span>
          <span>Hinzufügen</span>
        </button>
      </div>
    </div>`;
}

function renderMealPlanSheet() {
  const { weekday } = state.mealPlanView;
  const items = plannedItems(weekday);
  const copyButton = items.length ? '<button class="button-tinted" type="button" data-action="copy-meal-plan-day">Für alle Wochentage übernehmen</button>' : "";
  sheet.innerHTML = `
    ${renderSheetHeader({ title: "Essensplan" })}
    <div class="sheet-body">
      <div class="chip-row meal-plan-days" role="group" aria-label="Wochentag">${renderDayChips(weekday)}</div>
      <p class="sheet-context">${escapeHtml(`${WEEKDAYS[weekday]} · ${describeDayTotals(items)}`)}</p>
      ${MEALS.map((meal) => renderMealSection(meal, items)).join("")}
      <div class="sheet-actions">${copyButton}</div>
      <p class="note">Unter Ernährung trägst du geplantes Essen mit einem Tipp ein. Was du davon wirklich isst, entscheidest du jeden Tag neu.</p>
    </div>`;
}

export function openMealPlan() {
  state.mealPlanView = { weekday: weekdayIndex(parseIsoDate(state.nutritionDate)), isConfirmingCopy: false };
  renderMealPlanSheet();
  showSheet();
}

export function selectMealPlanDay(day) {
  if (!state.mealPlanView || !Number.isInteger(day) || day < 0 || day >= WEEKDAYS.length) return;
  Object.assign(state.mealPlanView, { weekday: day, isConfirmingCopy: false });
  renderMealPlanSheet();
}

export function backToMealPlan() {
  if (!state.mealPlanView) return;
  state.nutritionDraft = null;
  state.mealPlanView.isConfirmingCopy = false;
  renderMealPlanSheet();
  playAnimation(sheet.querySelector(".sheet-body"), "slide-in-from-left");
}

export function addPlannedItem(meal) {
  if (!state.mealPlanView || !MEALS.some((candidate) => candidate.id === meal)) return;
  if (plannedItems(state.mealPlanView.weekday).length >= MAX_PLANNED_ITEMS_PER_DAY) {
    showToast(`Pro Tag kannst du bis zu ${MAX_PLANNED_ITEMS_PER_DAY} Essen planen.`);
    return;
  }
  openPlannedItem({ weekday: state.mealPlanView.weekday, meal });
}

export function editPlannedItem(itemId) {
  if (state.mealPlanView) openPlannedItem({ weekday: state.mealPlanView.weekday, itemId });
}

function replacePlannedDay(weekday, items) {
  const days = state.mealPlan.days.map((dayItems, day) => (day === weekday ? items : dayItems));
  state.mealPlan = { days };
  saveState();
  renderNutrition();
}

/** Stores the item from the entry form in the meal plan and returns to the plan. */
export function savePlannedItem(draft, fields) {
  if (!fields.name) {
    showToast("Gib dem geplanten Essen einen Namen.");
    return;
  }
  const item = normalizeMealPlanItem({ ...fields, id: draft.id ?? createId() });
  if (!item) {
    showToast("Das geplante Essen konnte nicht gespeichert werden.");
    return;
  }
  const current = plannedItems(draft.weekday);
  const isNew = !current.some((existing) => existing.id === item.id);
  const items = isNew ? [...current, item] : current.map((existing) => (existing.id === item.id ? item : existing));
  replacePlannedDay(draft.weekday, items);
  backToMealPlan();
}

export function removePlannedItem(weekday, itemId) {
  replacePlannedDay(weekday, plannedItems(weekday).filter((item) => item.id !== itemId));
  backToMealPlan();
  showToast("Aus dem Plan entfernt");
}

export function copyMealPlanDayToAll(button) {
  const view = state.mealPlanView;
  const items = view ? plannedItems(view.weekday) : [];
  if (items.length === 0) return;
  if (!view.isConfirmingCopy) {
    view.isConfirmingCopy = true;
    button.textContent = "Ersetzt die anderen Tage. Erneut tippen";
    return;
  }
  const days = WEEKDAYS.map((_, day) => (day === view.weekday ? items : items.map((item) => ({ ...item, id: createId() }))));
  state.mealPlan = { days };
  saveState();
  renderNutrition();
  renderMealPlanSheet();
  showToast(`${WEEKDAYS[view.weekday]} gilt jetzt für alle Wochentage`);
}
