import { state } from "../../app/state.js";
import { ENERGY_PER_KG_BODY_WEIGHT } from "../../config/limits.js";
import { MACROS } from "../../config/options.js";
import { describeExpenditureSource, intakeOutlook } from "../../model/energy.js";
import { dailyNutritionTotalsBetween } from "../../model/nutrition-log.js";
import { weightTrend } from "../../model/weight.js";
import { statsElements } from "./stats-screen.js";
import { niceCeiling, renderBarChart, renderChart } from "../../ui/charts.js";
import { renderCardHeading, renderCardMessage, renderInfoRow, renderTileGrid, setCardHtml, setTileValue } from "../../ui/components.js";
import { addDays, parseIsoDate, todayIso, toIsoDate } from "../../utils/dates.js";
import { chartDateFormat, countLabel, formatBodyWeight, formatInteger, formatShortDate, formatSigned, formatWeeklyChange } from "../../utils/format.js";
import { roundToStep, sum } from "../../utils/numbers.js";
import { escapeHtml } from "../../utils/text.js";

const NUTRITION_CHART_DAYS = 14;
const CALORIE_GOAL_TOLERANCE = 0.1;
const OUTLOOK_WEEKS = 4;

const NUTRITION_TILES = [
  { id: "stat-average-kcal", label: "Ø kcal pro Tag" },
  { id: "stat-average-protein", label: "Ø Protein (g)" },
  { id: "stat-logged-days", label: "Erfasste Tage" },
  { id: "stat-goal-days", label: "Tage im Ziel" },
];

export function renderNutritionPanel() {
  return `
    <div class="stats-panel" id="stats-panel-nutrition" role="tabpanel" aria-labelledby="segment-nutrition" hidden>
      ${renderTileGrid(NUTRITION_TILES)}
      <p class="note">Alle Werte beziehen sich auf die letzten 14 Tage. Durchschnitte zählen nur Tage mit Einträgen, „im Ziel“ heißt höchstens 10 % neben deinem Kalorienziel.</p>
      <h2 class="section-title">Letzte 14 Tage</h2>
      <div class="card-stack">
        <section class="group chart-card" id="calorie-card"></section>
        <section class="group chart-card" id="protein-card"></section>
      </div>
      <h2 class="section-title">Energiebilanz</h2>
      <section class="group" id="balance-card"></section>
      <h2 class="section-title">Makros</h2>
      <section class="group chart-card" id="macro-card"></section>
    </div>`;
}

function recentNutritionDays() {
  const today = todayIso();
  return dailyNutritionTotalsBetween(toIsoDate(addDays(parseIsoDate(today), 1 - NUTRITION_CHART_DAYS)), today);
}

function averageOfLoggedDays(days, key) {
  const logged = days.filter((day) => day.hasEntries);
  return logged.length ? sum(logged.map((day) => day[key])) / logged.length : null;
}

function countDaysInCalorieGoal(days) {
  const goal = state.nutrition.goals.kcal;
  if (!goal) return null;
  return days.filter((day) => day.hasEntries && Math.abs(day.kcal - goal) <= goal * CALORIE_GOAL_TOLERANCE).length;
}

function dayLabels(days) {
  return days.map((day, index) => (index === days.length - 1 ? "Heute" : chartDateFormat.format(parseIsoDate(day.date))));
}

function renderDailyNutritionChart(days, { key, unit, goal, emptyText, headlineSuffix, caption }) {
  const average = averageOfLoggedDays(days, key);
  if (average === null) return renderCardMessage(emptyText);
  const chart = renderBarChart({
    values: days.map((day) => day[key]),
    labels: dayLabels(days),
    readouts: days.map((day) => `${formatShortDate(day.date)}: ${day.hasEntries ? `${formatInteger(day[key])} ${unit}` : "nichts eingetragen"}`),
    scale: niceCeiling,
    formatTick: formatInteger,
    ariaLabel: `${caption}, im Schnitt ${formatInteger(average)} ${unit}`,
    reference: goal ? { value: goal, label: "Ziel" } : null,
  });
  return renderChart({ headline: `Ø ${formatInteger(average)} ${headlineSuffix}`, caption, ...chart });
}

function renderCalorieChart(days) {
  return renderDailyNutritionChart(days, {
    key: "kcal",
    unit: "kcal",
    goal: state.nutrition.goals.kcal,
    emptyText: "Sobald du Mahlzeiten einträgst, siehst du hier deine Kalorien der letzten 14 Tage.",
    headlineSuffix: "kcal pro Tag",
    caption: "Kalorien pro Tag, letzte 14 Tage",
  });
}

function renderProteinChart(days) {
  return renderDailyNutritionChart(days, {
    key: "protein",
    unit: "g",
    goal: state.nutrition.goals.protein,
    emptyText: "Hier erscheint dein Protein pro Tag, sobald du es mit einträgst.",
    headlineSuffix: "g Protein pro Tag",
    caption: "Protein pro Tag, letzte 14 Tage",
  });
}

function renderMacroSplitCard(days) {
  const logged = days.filter((day) => day.hasEntries);
  const macroCalories = MACROS.map((macro) => sum(logged.map((day) => day[macro.key])) * macro.kcalPerGram);
  const totalCalories = sum(macroCalories);
  if (totalCalories === 0) return renderCardMessage("Trag Makros ein, um zu sehen, wie sich deine Kalorien verteilen.");
  const shares = macroCalories.map((calories) => calories / totalCalories);
  const segments = MACROS.map((macro, index) => `<span class="macro-segment macro-segment-${macro.key}" style="flex-grow: ${shares[index].toFixed(4)}"></span>`).join("");
  const legend = MACROS.map((macro, index) => `
    <li class="legend-row">
      <span class="legend-swatch macro-segment-${macro.key}" aria-hidden="true"></span>
      <span class="legend-label">${macro.label}</span>
      <span class="legend-value">Ø ${formatInteger(sum(logged.map((day) => day[macro.key])) / logged.length)} g · ${Math.round(shares[index] * 100)} %</span>
    </li>`).join("");
  return `
    <p class="chart-headline">Verteilung der Kalorien</p>
    <p class="chart-caption">Ø der letzten 14 Tage mit Einträgen</p>
    <div class="macro-bar" role="img" aria-label="${MACROS.map((macro, index) => `${macro.label} ${Math.round(shares[index] * 100)} Prozent`).join(", ")}">${segments}</div>
    <ul class="legend-list">${legend}</ul>`;
}

function describeBalanceHeadline(outlook) {
  const change = Math.round(outlook.weeklyChange * 10) / 10;
  if (change === 0) return "Gewicht etwa stabil";
  return `${formatSigned(change, "kg")} pro Woche erwartet`;
}

function renderBalanceRows(outlook) {
  const { expenditure, dailyBalance } = outlook;
  const rows = [
    renderInfoRow("Ø gegessen", `${formatInteger(outlook.intake)} kcal`),
    renderInfoRow("Gesamtumsatz", `ca. ${formatInteger(roundToStep(expenditure.value, 10))} kcal (± ${formatInteger(roundToStep(expenditure.error, 10))})`),
    renderInfoRow("Bilanz", `${formatSigned(roundToStep(dailyBalance, 10), "kcal")} pro Tag`),
  ];
  const trend = weightTrend();
  if (trend) rows.push(renderInfoRow("Gewichtstrend", formatWeeklyChange(trend.weeklyChange)));
  if (state.profile.bodyWeight !== null) {
    rows.push(renderInfoRow(`In ${OUTLOOK_WEEKS} Wochen`, `ca. ${formatBodyWeight(state.profile.bodyWeight + outlook.weeklyChange * OUTLOOK_WEEKS)}`));
  }
  return rows.join("");
}

function renderBalanceCard() {
  const outlook = intakeOutlook();
  if (!outlook) {
    return renderCardMessage("Hier siehst du, wohin deine Ernährung dein Gewicht bewegt. Dafür brauchst du mindestens 7 erfasste Tage in den letzten 14 Tagen sowie Gewicht, Größe und Geburtsdatum im Profil.");
  }
  return `
    ${renderCardHeading(describeBalanceHeadline(outlook), `Bei deinem Schnitt aus ${countLabel(outlook.loggedDays, "Tag", "Tagen")} mit Einträgen`)}
    <div class="forecast-details">${renderBalanceRows(outlook)}</div>
    <p class="card-footnote">${escapeHtml(describeExpenditureSource(outlook.expenditure))}. 1 kg Körpergewicht entspricht etwa ${formatInteger(ENERGY_PER_KG_BODY_WEIGHT)} kcal.</p>`;
}

export function renderNutritionStats() {
  const days = recentNutritionDays();
  setTileValue("stat-average-kcal", averageOfLoggedDays(days, "kcal"));
  setTileValue("stat-average-protein", averageOfLoggedDays(days, "protein"));
  setTileValue("stat-logged-days", days.filter((day) => day.hasEntries).length);
  setTileValue("stat-goal-days", countDaysInCalorieGoal(days));
  setCardHtml(statsElements.calorieCard, renderCalorieChart(days));
  setCardHtml(statsElements.proteinCard, renderProteinChart(days));
  setCardHtml(statsElements.balanceCard, renderBalanceCard());
  setCardHtml(statsElements.macroCard, renderMacroSplitCard(days));
}
