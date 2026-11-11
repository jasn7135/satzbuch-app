import { state } from "../../app/state.js";
import { allSets, liftedVolume } from "../../model/sessions.js";
import { renderRecordsCard } from "./records-card.js";
import { statsElements } from "./stats-screen.js";
import { renderForecastCard } from "./strength-forecast-card.js";
import { renderWeeklyMuscleCard } from "./weekly-muscles.js";
import { ICONS } from "../../svg/icons.js";
import { evenCeiling, niceCeiling, renderBarChart, renderChart } from "../../ui/charts.js";
import { renderCardMessage, renderTileGrid, setCardHtml, setTileValue } from "../../ui/components.js";
import { addDays, daysBetween, parseIsoDate, startOfWeek, toIsoDate } from "../../utils/dates.js";
import { chartDateFormat, countLabel, formatInteger, formatNumber, formatSigned, formatTonnes, fullDateFormat } from "../../utils/format.js";
import { sum } from "../../utils/numbers.js";

const CHART_WEEKS = 12;
const COMPARISON_WEEKS = 4;

const TRAINING_TILES = [
  { id: "stat-total", label: "Trainings" },
  { id: "stat-week", label: "Diese Woche" },
  { id: "stat-all-sets", label: "Sätze" },
  { id: "stat-all-volume", label: "Bewegt (kg)" },
];

function trainingStats() {
  const weekStartIso = toIsoDate(startOfWeek(new Date()));
  const sets = allSets(state.sessions);
  return {
    total: state.sessions.length,
    thisWeek: state.sessions.filter((session) => session.date >= weekStartIso).length,
    sets: sets.length,
    volume: liftedVolume(sets),
    firstDate: state.sessions.at(-1)?.date ?? null,
  };
}

function weeklyTotals() {
  const currentWeek = startOfWeek(new Date());
  const weeks = Array.from({ length: CHART_WEEKS }, (_, index) => ({
    start: addDays(currentWeek, (index - CHART_WEEKS + 1) * 7),
    trainings: 0,
    volume: 0,
  }));
  for (const session of state.sessions) {
    const index = Math.floor(daysBetween(weeks[0].start, parseIsoDate(session.date)) / 7);
    if (index < 0 || index >= CHART_WEEKS) continue;
    weeks[index].trainings += 1;
    weeks[index].volume += liftedVolume(Object.values(session.exercises).flatMap((entry) => entry.sets));
  }
  return weeks;
}

function weekName(week, isCurrent) {
  return isCurrent ? "Diese Woche" : `Woche ab ${chartDateFormat.format(week.start)}`;
}

function weekLabels(weeks) {
  return weeks.map((week, index) => (index === weeks.length - 1 ? "Jetzt" : chartDateFormat.format(week.start)));
}

function renderFrequencyCard(weeks) {
  const values = weeks.map((week) => week.trainings);
  if (sum(values) === 0) return renderCardMessage("Sobald du trainierst, siehst du hier, wie regelmäßig du in den letzten 12 Wochen dabei warst.");
  const average = Math.round((sum(values) / values.length) * 10) / 10;
  const chart = renderBarChart({
    values,
    labels: weekLabels(weeks),
    readouts: weeks.map((week, index) => `${weekName(week, index === weeks.length - 1)}: ${countLabel(week.trainings, "Training", "Trainings")}`),
    scale: evenCeiling,
    formatTick: formatInteger,
    ariaLabel: `Trainings pro Woche, im Schnitt ${formatNumber(average)}`,
  });
  return renderChart({ headline: `Ø ${formatNumber(average)} Trainings pro Woche`, caption: "Trainings pro Woche, letzte 12 Wochen", ...chart });
}

function describeVolumeTrend(values) {
  const completed = values.slice(0, -1);
  const recent = sum(completed.slice(-COMPARISON_WEEKS));
  const before = sum(completed.slice(-2 * COMPARISON_WEEKS, -COMPARISON_WEEKS));
  if (before === 0) return `${formatTonnes(recent)} in den letzten 4 Wochen`;
  const change = Math.round(((recent - before) / before) * 100);
  if (change === 0) return "Gleich viel wie in den 4 Wochen davor";
  return `${formatSigned(change, "%")} zu den 4 Wochen davor`;
}

function renderVolumeCard(weeks) {
  const values = weeks.map((week) => week.volume);
  if (sum(values) === 0) return renderCardMessage("Hier erscheint, wie viel Gewicht du pro Woche bewegst, sobald du Sätze mit Gewicht einträgst.");
  const chart = renderBarChart({
    values,
    labels: weekLabels(weeks),
    readouts: weeks.map((week, index) => `${weekName(week, index === weeks.length - 1)}: ${formatTonnes(week.volume)}`),
    scale: niceCeiling,
    formatTick: formatTonnes,
    ariaLabel: "Bewegtes Gewicht pro Woche, letzte 12 Wochen",
  });
  return renderChart({ headline: describeVolumeTrend(values), caption: "Bewegtes Gewicht pro Woche (Gewicht × Wiederholungen)", ...chart });
}

export function renderTrainingPanel() {
  return `
    <div class="stats-panel" id="stats-panel-training" role="tabpanel" aria-labelledby="segment-training">
      ${renderTileGrid(TRAINING_TILES)}
      <p class="note" id="since-note"></p>
      <h2 class="section-title">Muskeln diese Woche</h2>
      <section class="group muscle-section" id="weekly-muscle-card"></section>
      <h2 class="section-title">Letzte 12 Wochen</h2>
      <div class="card-stack">
        <section class="group chart-card" id="frequency-card"></section>
        <section class="group chart-card" id="volume-card"></section>
      </div>
      <h2 class="section-title">Bestleistungen</h2>
      <section class="group" id="records-card"></section>
      <p class="note">Rechts steht dein geschätztes Maximum für eine Wiederholung, darunter der Satz, aus dem es stammt.</p>
      <h2 class="section-title">Kraftprognose</h2>
      <section class="group" id="forecast-card"></section>
      <details class="explainer" id="forecast-explainer" hidden>
        <summary>${ICONS.chevron}So rechnet die Prognose</summary>
        <p class="note" id="forecast-note"></p>
      </details>
    </div>`;
}

export function renderTrainingStats() {
  const totals = trainingStats();
  const weeks = weeklyTotals();
  setTileValue("stat-total", totals.total);
  setTileValue("stat-week", totals.thisWeek);
  setTileValue("stat-all-sets", totals.sets);
  setTileValue("stat-all-volume", totals.volume);
  statsElements.sinceNote.textContent = totals.firstDate
    ? `Dabei seit ${fullDateFormat.format(parseIsoDate(totals.firstDate))}.`
    : "Deine Statistik füllt sich mit dem ersten Training.";
  setCardHtml(statsElements.weeklyMuscleCard, renderWeeklyMuscleCard());
  setCardHtml(statsElements.frequencyCard, renderFrequencyCard(weeks));
  setCardHtml(statsElements.volumeCard, renderVolumeCard(weeks));
  setCardHtml(statsElements.recordsCard, renderRecordsCard());
  if (!statsElements.forecastCard.contains(document.activeElement)) renderForecastCard();
}
