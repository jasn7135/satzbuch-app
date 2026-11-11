import { nutritionView } from "../../app/dom.js";
import { saveState, state } from "../../app/state.js";
import { CALORIE_GOAL_MAX, CALORIE_GOAL_MIN, MAX_NUTRITION_ENTRIES, PROTEIN_GOAL_MAX, PROTEIN_GOAL_MIN } from "../../config/limits.js";
import { GOAL_OPTIONS, MACROS } from "../../config/options.js";
import { describeExpenditureSource, nutritionRecommendation } from "../../model/energy.js";
import { nutritionEntriesOn } from "../../model/nutrition-log.js";
import { compareEntriesByTime, isValidCalorieGoal, isValidProteinGoal, totalsOf } from "../../model/nutrition.js";
import { renderHome } from "../home.js";
import { describeCalorieBalance, describeEntryDetails, mealLabel } from "./nutrition-labels.js";
import { ICONS } from "../../svg/icons.js";
import { playAnimation } from "../../ui/animation.js";
import { renderCardMessage, renderInfoRow, renderMiniRing, renderProgressBar, setCardHtml } from "../../ui/components.js";
import { showToast } from "../../ui/toast.js";
import { addDays, parseIsoDate, todayIso, toIsoDate } from "../../utils/dates.js";
import { describeRelativeDay, formatInteger, formatNumber, formatWeeklyChange, fullDateFormat } from "../../utils/format.js";
import { parseWholeNumber, roundToStep } from "../../utils/numbers.js";
import { escapeHtml } from "../../utils/text.js";

const NUTRITION_HISTORY_DAYS = 365;
export const nutritionElements = {};

const GOAL_FIELDS = {
  kcal: { isValid: isValidCalorieGoal, error: `Gib ein Kalorienziel zwischen ${formatInteger(CALORIE_GOAL_MIN)} und ${formatInteger(CALORIE_GOAL_MAX)} kcal ein.` },
  protein: { isValid: isValidProteinGoal, error: `Gib ein Proteinziel zwischen ${PROTEIN_GOAL_MIN} und ${PROTEIN_GOAL_MAX} g ein.` },
};

function earliestNutritionDate() {
  return toIsoDate(addDays(new Date(), -NUTRITION_HISTORY_DAYS));
}

export function buildNutritionView() {
  nutritionView.innerHTML = `
    <h1 class="large-title">Ernährung</h1>
    <div class="group date-switcher" role="group" aria-label="Tag auswählen">
      <button class="date-switcher-button" type="button" data-action="nutrition-previous-day" id="nutrition-previous-day" aria-label="Vorheriger Tag">${ICONS.chevronLeft}</button>
      <p class="date-switcher-label" aria-live="polite">
        <span class="date-switcher-title" id="nutrition-day-title"></span>
        <span class="date-switcher-sub" id="nutrition-day-date"></span>
      </p>
      <button class="date-switcher-button" type="button" data-action="nutrition-next-day" id="nutrition-next-day" aria-label="Nächster Tag">${ICONS.chevron}</button>
    </div>
    <section class="group nutrition-summary" id="nutrition-summary" aria-label="Tagesübersicht"></section>
    <h2 class="section-title">Einträge</h2>
    <section class="group has-leads" id="nutrition-entries" aria-label="Einträge"></section>
    <h2 class="section-title">Tagesziele</h2>
    <div class="group">
      <label class="form-row" for="goal-kcal">
        <span class="form-label">Kalorien</span>
        <span class="input-with-unit">
          <input class="form-input" id="goal-kcal" data-goal-field="kcal" inputmode="numeric" placeholder="Kein Ziel" autocomplete="off" enterkeyhint="done">
          <span class="input-unit">kcal</span>
        </span>
      </label>
      <label class="form-row" for="goal-protein">
        <span class="form-label">Protein</span>
        <span class="input-with-unit">
          <input class="form-input" id="goal-protein" data-goal-field="protein" inputmode="numeric" placeholder="Kein Ziel" autocomplete="off" enterkeyhint="done">
          <span class="input-unit">g</span>
        </span>
      </label>
    </div>
    <div id="nutrition-guidance"></div>`;
  Object.assign(nutritionElements, {
    previousDay: document.getElementById("nutrition-previous-day"),
    nextDay: document.getElementById("nutrition-next-day"),
    dayTitle: document.getElementById("nutrition-day-title"),
    dayDate: document.getElementById("nutrition-day-date"),
    summary: document.getElementById("nutrition-summary"),
    entries: document.getElementById("nutrition-entries"),
    goalInputs: [...nutritionView.querySelectorAll("[data-goal-field]")],
    guidance: document.getElementById("nutrition-guidance"),
  });
}

export function renderCalorieRing(kcal, goal) {
  if (!goal) return renderMiniRing({ fraction: 0, label: "kcal", ariaLabel: "Kein Kalorienziel gesetzt" });
  const percent = Math.round((kcal / goal) * 100);
  return renderMiniRing({ fraction: kcal / goal, label: `${percent} %`, ariaLabel: `${percent} Prozent des Kalorienziels` });
}

function renderMacroRow(macro, grams) {
  const goal = macro.key === "protein" ? state.nutrition.goals.protein : null;
  const goalText = goal ? `<span class="macro-goal"> / ${formatInteger(goal)} g</span>` : "";
  return `
    <li class="macro-row">
      <span class="macro-label">${macro.label}</span>
      <span class="macro-value">${formatNumber(grams)} g${goalText}</span>
      ${goal ? renderProgressBar(grams / goal) : ""}
    </li>`;
}

function renderNutritionSummary(totals) {
  const goal = state.nutrition.goals.kcal;
  return `
    <div class="today-main">
      ${renderCalorieRing(totals.kcal, goal)}
      <div class="today-text">
        <p class="today-title">${formatInteger(totals.kcal)} kcal</p>
        <p class="today-meta">${escapeHtml(goal ? describeCalorieBalance(totals.kcal, goal) : "Kein Kalorienziel gesetzt")}</p>
      </div>
    </div>
    <ul class="macro-list">${MACROS.map((macro) => renderMacroRow(macro, totals[macro.key])).join("")}</ul>
    <button class="button-filled" type="button" data-action="add-nutrition-entry">Eintrag hinzufügen</button>`;
}

function renderEntryRow(entry) {
  return `
    <button class="entry-row" type="button" data-action="edit-nutrition-entry" data-id="${escapeHtml(entry.id)}">
      <span class="entry-lead">${escapeHtml(entry.time)}</span>
      <span class="entry-text">
        <span class="entry-title">${escapeHtml(entry.name || mealLabel(entry.time))}</span>
        <span class="entry-sub">${escapeHtml(describeEntryDetails(entry))}</span>
      </span>
      <span class="entry-value">${formatInteger(entry.kcal)} kcal</span>
      <span class="chevron" aria-hidden="true">${ICONS.chevron}</span>
    </button>`;
}

function renderNutritionEntries(entries) {
  if (entries.length === 0) {
    return renderCardMessage(state.nutritionDate === todayIso() ? "Heute ist noch nichts eingetragen." : "An diesem Tag ist nichts eingetragen.");
  }
  return entries.map(renderEntryRow).join("");
}

function describeGoalForGuidance(recommendation) {
  const goalType = state.profile.goal.type;
  if (!goalType) return "Kein Ziel, Gewicht halten";
  if (recommendation.goalType === "maintain" && goalType !== "maintain") return "Zielgewicht erreicht, halten";
  const label = GOAL_OPTIONS.find((option) => option.value === goalType).label;
  return recommendation.weeklyChange === 0 ? label : `${label}, ${formatWeeklyChange(recommendation.weeklyChange)}`;
}

function renderGuidanceRows(recommendation) {
  const rows = [];
  const { expenditure, protein } = recommendation;
  if (expenditure) {
    rows.push(renderInfoRow("Gesamtumsatz", `ca. ${formatInteger(roundToStep(expenditure.value, 10))} kcal`));
    rows.push(renderInfoRow("Ziel", describeGoalForGuidance(recommendation)));
    rows.push(renderInfoRow("Kalorien", `${formatInteger(recommendation.kcal)} kcal`));
  }
  if (protein) {
    rows.push(renderInfoRow("Protein", `${formatInteger(protein.suggested)} g (${protein.low}–${protein.high} g)`));
    rows.push(renderInfoRow("Fett", `mindestens ${formatInteger(recommendation.fat)} g`));
  }
  if (recommendation.carbs !== null) rows.push(renderInfoRow("Kohlenhydrate", `ca. ${formatInteger(recommendation.carbs)} g`));
  return rows.join("");
}

function describeGuidanceNotes(recommendation) {
  const notes = [];
  if (recommendation.expenditure) notes.push(`${describeExpenditureSource(recommendation.expenditure)}.`);
  else notes.push("Für Kalorien fehlen noch Größe oder Geburtsdatum im Profil.");
  if (recommendation.isFloored) notes.push("Das Kalorienziel liegt bewusst nicht unter deinem Grundumsatz, auch wenn das Tempo dadurch langsamer wird.");
  notes.push("Ziel und Tempo legst du im Profil fest. Übernommen werden Kalorien und Protein.");
  return notes.join(" ");
}

function renderNutritionGuidance() {
  const recommendation = nutritionRecommendation();
  if (!recommendation) {
    return '<p class="note">Mit Gewicht, Größe und Geburtsdatum im Profil schlägt dir Satzbuch passende Tagesziele vor.</p>';
  }
  return `
    <h2 class="section-title">Empfehlung</h2>
    <div class="group">
      ${renderGuidanceRows(recommendation)}
      <div class="card-actions"><button class="button-tinted" type="button" data-action="apply-nutrition-guidance">Als Tagesziele übernehmen</button></div>
    </div>
    <p class="note">${escapeHtml(describeGuidanceNotes(recommendation))}</p>`;
}

function syncNutritionGoalInputs() {
  for (const input of nutritionElements.goalInputs) {
    if (document.activeElement === input) continue;
    input.value = state.nutrition.goals[input.dataset.goalField] ?? "";
  }
}

function updateDateSwitcher() {
  const date = parseIsoDate(state.nutritionDate);
  nutritionElements.dayTitle.textContent = describeRelativeDay(state.nutritionDate);
  nutritionElements.dayDate.textContent = fullDateFormat.format(date);
  nutritionElements.nextDay.disabled = state.nutritionDate >= todayIso();
  nutritionElements.previousDay.disabled = state.nutritionDate <= earliestNutritionDate();
}

export function renderNutrition() {
  const entries = nutritionEntriesOn(state.nutritionDate);
  updateDateSwitcher();
  setCardHtml(nutritionElements.summary, renderNutritionSummary(totalsOf(entries)));
  setCardHtml(nutritionElements.entries, renderNutritionEntries(entries));
  syncNutritionGoalInputs();
  setCardHtml(nutritionElements.guidance, renderNutritionGuidance());
}

export function shiftNutritionDate(days) {
  const nextDate = toIsoDate(addDays(parseIsoDate(state.nutritionDate), days));
  if (nextDate > todayIso() || nextDate < earliestNutritionDate()) return;
  state.nutritionDate = nextDate;
  renderNutrition();
  const animation = days > 0 ? "slide-in-from-right" : "slide-in-from-left";
  playAnimation(nutritionElements.summary, animation);
  playAnimation(nutritionElements.entries, animation);
}

function setNutritionGoals(goals) {
  state.nutrition = { ...state.nutrition, goals: { ...state.nutrition.goals, ...goals } };
  saveState();
  renderNutrition();
}

function updateNutritionGoal(input) {
  const key = input.dataset.goalField;
  const field = GOAL_FIELDS[key];
  if (!field) return;
  const text = input.value.trim();
  const value = text === "" ? null : parseWholeNumber(text);
  if (value !== null && !field.isValid(value)) {
    input.value = state.nutrition.goals[key] ?? "";
    showToast(field.error);
    return;
  }
  if (value === state.nutrition.goals[key]) return;
  setNutritionGoals({ [key]: value });
}

export function applyNutritionGuidance() {
  const recommendation = nutritionRecommendation();
  const goals = {};
  if (isValidCalorieGoal(recommendation?.kcal)) goals.kcal = recommendation.kcal;
  if (isValidProteinGoal(recommendation?.protein?.suggested)) goals.protein = recommendation.protein.suggested;
  if (Object.keys(goals).length === 0) return;
  setNutritionGoals(goals);
  showToast("Richtwerte übernommen");
}

export function replaceNutritionEntries(entries) {
  state.nutrition = { ...state.nutrition, entries: [...entries].sort(compareEntriesByTime).slice(-MAX_NUTRITION_ENTRIES) };
  saveState();
}

export function renderAfterNutritionChange() {
  renderNutrition();
  if (state.activeTab === "home") renderHome();
}

export function handleNutritionChange(event) {
  if (event.target.dataset.goalField) updateNutritionGoal(event.target);
}
