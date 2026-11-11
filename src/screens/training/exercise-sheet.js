import { sheet } from "../../app/dom.js";
import { saveState, state } from "../../app/state.js";
import { exerciseDisplayName, exerciseInfo } from "../../model/exercise-lookup.js";
import { describeSets, normalizeSessions } from "../../model/sessions.js";
import { isBetterRecord, recordsByExercise } from "../../model/strength.js";
import { describeRecordSet } from "../stats/records-card.js";
import { currentSession, currentSessionId, exerciseHistory, findExercise, previousEntry, todaysSets } from "./selected-day.js";
import { renderTraining } from "./training-screen.js";
import { ICONS } from "../../svg/icons.js";
import { playAnimation } from "../../ui/animation.js";
import { describeProgress, renderChart, renderTimeLineChart } from "../../ui/charts.js";
import { renderMuscleSection } from "../../ui/muscle-card.js";
import { closeSheet, renderSheetHeader, showSheet } from "../../ui/sheet.js";
import { showToast } from "../../ui/toast.js";
import { parseIsoDate, toIsoDate } from "../../utils/dates.js";
import { chartDateFormat, formatKilograms, formatNumber, formatShortDate } from "../../utils/format.js";
import { parseNumber, roundToHundredths } from "../../utils/numbers.js";
import { deepCopy } from "../../utils/objects.js";
import { escapeHtml } from "../../utils/text.js";

const WEIGHT_STEP = 2.5;
const REPS_STEP = 1;
const DEFAULT_SET_COUNT = 3;
const CHART_SESSION_LIMIT = 12;
const HISTORY_ROW_LIMIT = 6;
const COMPLETION_ANIMATION_MS = 1600;

let isRemovingSet = false;

function createDraftSets(exerciseId) {
  const source = todaysSets(exerciseId) ?? previousEntry(exerciseId)?.sets;
  if (source?.length) return source.map((set) => ({ kg: set.kg, reps: set.reps }));
  return Array.from({ length: DEFAULT_SET_COUNT }, () => ({ kg: null, reps: null }));
}

export function openExercise(exerciseId) {
  const exercise = findExercise(exerciseId);
  if (!exercise) return;
  state.openExerciseId = exerciseId;
  state.draftSets = createDraftSets(exerciseId);
  renderExerciseSheet(exercise);
  showSheet();
}

function describeSheetContext(exerciseId) {
  if (todaysSets(exerciseId)) return "Heute schon eingetragen. Deine Änderungen ersetzen den Eintrag.";
  const previous = previousEntry(exerciseId);
  if (previous) return `Werte vom letzten Training (${formatShortDate(previous.date)}) übernommen. Ändere nur, was heute anders war.`;
  return "Erster Eintrag für diese Übung.";
}

function renderExerciseSheet(exercise) {
  const history = exerciseHistory(exercise.id);
  sheet.innerHTML = `
    ${renderSheetHeader({ title: exercise.name, confirmAction: "save-exercise", confirmLabel: "Sichern" })}
    <div class="sheet-body">
      <p class="sheet-context">${escapeHtml(describeSheetContext(exercise.id))}</p>
      <section class="group" aria-label="Sätze">
        <div class="sets-head" aria-hidden="true"><span></span><span>Gewicht (kg)</span><span>Wdh.</span></div>
        <div id="set-rows">${renderSetRows()}</div>
        <div class="sets-actions">
          <button type="button" data-action="add-set">Satz hinzufügen</button>
          <button type="button" data-action="remove-set">Letzten entfernen</button>
        </div>
      </section>
      ${renderMuscleSection(exerciseInfo(exercise))}
      <h3 class="section-title">Verlauf</h3>
      <section class="group chart-card">${renderProgressChart(history)}</section>
      ${renderHistoryList(history)}
    </div>`;
}

function renderSetRows(insertedIndex = -1) {
  return state.draftSets.map((set, index) => `
    <div class="set-row${index === insertedIndex ? " is-inserted" : ""}">
      <span class="set-index">${index + 1}</span>
      ${renderStepper(index, "kg", set.kg, "Gewicht", "decimal")}
      ${renderStepper(index, "reps", set.reps, "Wiederholungen", "numeric")}
    </div>`).join("");
}

function renderStepper(index, setField, value, label, inputMode) {
  const setLabel = `${label} in Satz ${index + 1}`;
  const displayValue = value === null ? "" : formatNumber(value);
  return `
    <div class="stepper">
      <button type="button" data-action="step" data-index="${index}" data-set-field="${setField}" data-direction="-1" aria-label="${setLabel} verringern">${ICONS.minus}</button>
      <input id="set-${index}-${setField}" data-index="${index}" data-set-field="${setField}" inputmode="${inputMode}" value="${displayValue}" placeholder="0" autocomplete="off" aria-label="${setLabel}">
      <button type="button" data-action="step" data-index="${index}" data-set-field="${setField}" data-direction="1" aria-label="${setLabel} erhöhen">${ICONS.plus}</button>
    </div>`;
}

function refreshSetRows(insertedIndex) {
  document.getElementById("set-rows").innerHTML = renderSetRows(insertedIndex);
}

export function stepSet(index, setField, direction) {
  const set = state.draftSets[index];
  const step = setField === "kg" ? WEIGHT_STEP : REPS_STEP;
  const nextValue = roundToHundredths(Math.max(0, (set[setField] ?? 0) + direction * step));
  if (nextValue === set[setField]) return;
  set[setField] = nextValue;
  const input = document.getElementById(`set-${index}-${setField}`);
  input.value = formatNumber(nextValue);
  playAnimation(input, direction > 0 ? "roll-up" : "roll-down");
}

export function updateSetFromInput(input) {
  const value = parseNumber(input.value);
  const setField = input.dataset.setField;
  state.draftSets[Number(input.dataset.index)][setField] = value !== null && setField === "reps" ? Math.round(value) : value;
}

export function addSet() {
  const lastSet = state.draftSets.at(-1);
  state.draftSets.push(lastSet ? { ...lastSet } : { kg: null, reps: null });
  refreshSetRows(state.draftSets.length - 1);
}

export function removeLastSet() {
  if (state.draftSets.length <= 1 || isRemovingSet) return;
  const lastRow = document.getElementById("set-rows").lastElementChild;
  isRemovingSet = true;
  lastRow.classList.add("is-removing");
  lastRow.addEventListener("animationend", () => {
    state.draftSets.pop();
    refreshSetRows();
    isRemovingSet = false;
  }, { once: true });
}

export function saveOpenExercise() {
  const exercise = findExercise(state.openExerciseId);
  closeSheet();
  if (!exercise) return;
  const sets = state.draftSets
    .filter((set) => set.reps > 0)
    .map((set) => ({ kg: set.kg ?? 0, reps: set.reps }));
  const sessionId = currentSessionId();
  const exercises = deepCopy(currentSession()?.exercises ?? {});
  if (sets.length) exercises[exercise.id] = { name: exercise.name, sets };
  else delete exercises[exercise.id];
  if (sets.length && !todaysSets(exercise.id)) {
    state.completedExerciseId = exercise.id;
    state.completedUntil = performance.now() + COMPLETION_ANIMATION_MS;
  }
  const session = { date: toIsoDate(new Date()), day: state.selectedDay, exercises };
  const previousSessions = state.sessions;
  applySessionLocally(sessionId, session);
  if (saveState() && sets.length) announceNewRecord(exercise.id, previousSessions);
}

function applySessionLocally(sessionId, session) {
  const others = state.sessions.filter((existing) => existing.id !== sessionId);
  const updated = Object.keys(session.exercises).length ? [...others, { id: sessionId, ...session }] : others;
  state.sessions = normalizeSessions(updated);
  renderTraining();
}

function renderProgressChart(history) {
  const entries = history.slice(0, CHART_SESSION_LIMIT).reverse();
  if (entries.length < 2) {
    return '<p class="chart-empty">Ab dem zweiten Training siehst du hier, wie sich die Übung entwickelt.</p>';
  }
  const usesWeight = entries.some((entry) => entry.sets.some((set) => set.kg > 0));
  const points = entries.map((entry) => ({
    date: entry.date,
    value: Math.max(...entry.sets.map((set) => (usesWeight ? set.kg : set.reps))),
  }));
  const unit = usesWeight ? "kg" : "Wdh.";
  const chart = renderTimeLineChart({
    points,
    readout: (point) => `${chartDateFormat.format(parseIsoDate(point.date))}: ${formatNumber(point.value)} ${unit}`,
    ariaLabel: `Verlauf über ${points.length} Trainings, zuletzt ${formatNumber(points.at(-1).value)} ${unit}`,
  });
  return renderChart({
    headline: describeProgress(points, unit),
    caption: usesWeight ? "Schwerster Satz pro Training in kg" : "Meiste Wiederholungen pro Training",
    ...chart,
  });
}

function renderHistoryList(history) {
  if (history.length === 0) return "";
  const rows = history.slice(0, HISTORY_ROW_LIMIT).map((entry) => `
    <li class="history-row">
      <span class="history-date">${escapeHtml(formatShortDate(entry.date))}</span>
      <span class="history-sets">${escapeHtml(describeSets(entry.sets))}</span>
    </li>`).join("");
  return `<ul class="group history-list">${rows}</ul>`;
}

function newRecordAfterSave(exerciseId, previousSessions) {
  const before = recordsByExercise(previousSessions).get(exerciseId);
  const after = recordsByExercise().get(exerciseId);
  if (!before || !after || !isBetterRecord(after, before)) return null;
  return after;
}

function announceNewRecord(exerciseId, previousSessions) {
  const record = newRecordAfterSave(exerciseId, previousSessions);
  if (!record) return;
  const detail = record.oneRepMax === null ? describeRecordSet(record) : `≈ ${formatKilograms(record.oneRepMax)} Maximum`;
  showToast(`Neue Bestleistung: ${exerciseDisplayName(exerciseId, record.name)}, ${detail}`);
}
