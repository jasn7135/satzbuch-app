import { trainingView } from "../../app/dom.js";
import { render, selectTab, updateNav } from "../../app/navigation.js";
import { saveState, state } from "../../app/state.js";
import { createSamplePlan, isPlanEmpty } from "../../model/plan.js";
import { describeSets, liftedVolume } from "../../model/sessions.js";
import { renderEditor, setEditing } from "./plan-editor.js";
import { completedCount, currentSession, isRecentlyCompleted, previousEntry, selectedDayTitle, selectedPlanDay, todaysSets } from "./selected-day.js";
import { ICONS } from "../../svg/icons.js";
import { animateNumber, playAnimation } from "../../ui/animation.js";
import { dateOfWeekday, todayWeekday, WEEKDAY_LABELS, WEEKDAYS } from "../../utils/dates.js";
import { formatInteger, longDateFormat } from "../../utils/format.js";
import { escapeHtml } from "../../utils/text.js";

const SWIPE_DISTANCE = 60;
const RING_RADIUS = 38;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
export const trainingElements = {};

let renderedPanelHtml = "";

let swipeStart = null;

export function buildTrainingView() {
  const weekButtons = WEEKDAY_LABELS.map((label, index) => `
    <button class="week-day" type="button" data-action="select-day" data-day="${index}">
      <span class="week-label">${label}</span>
      <span class="week-date"></span>
      <span class="week-dot" aria-hidden="true"></span>
    </button>`).join("");
  trainingView.innerHTML = `
    <div class="title-text" id="title-text">
      <p class="eyebrow" id="day-eyebrow"></p>
      <h1 class="large-title" id="day-title"></h1>
    </div>
    <div class="group week-strip" role="group" aria-label="Wochentag">
      <span class="week-lens" id="week-lens" aria-hidden="true"></span>
      ${weekButtons}
    </div>
    <section class="group summary-card" id="summary-card" aria-label="Heute" hidden>
      <div class="progress-ring" id="progress-ring" role="img">
        <svg viewBox="0 0 88 88" aria-hidden="true">
          <circle class="ring-track" cx="44" cy="44" r="${RING_RADIUS}"/>
          <circle class="ring-value" id="ring-value" cx="44" cy="44" r="${RING_RADIUS}" stroke-dasharray="${RING_CIRCUMFERENCE}" stroke-dashoffset="${RING_CIRCUMFERENCE}"/>
        </svg>
        <span class="ring-center" aria-hidden="true">
          <span class="ring-count"><span id="ring-done">0</span><span class="ring-total" id="ring-total"></span></span>
          <span class="ring-caption">Übungen</span>
        </span>
      </div>
      <dl class="summary-stats">
        <div><dt>Sätze heute</dt><dd id="stat-sets">0</dd></div>
        <div><dt>Heute bewegt</dt><dd><span id="stat-volume">0</span> <span class="unit">kg</span></dd></div>
      </dl>
    </section>
    <div class="day-panel" id="day-panel"></div>`;
  Object.assign(trainingElements, {
    titleText: document.getElementById("title-text"),
    eyebrow: document.getElementById("day-eyebrow"),
    title: document.getElementById("day-title"),
    weekLens: document.getElementById("week-lens"),
    weekButtons: [...trainingView.querySelectorAll(".week-day")],
    summary: document.getElementById("summary-card"),
    ring: document.getElementById("progress-ring"),
    ringValue: document.getElementById("ring-value"),
    ringDone: document.getElementById("ring-done"),
    ringTotal: document.getElementById("ring-total"),
    statSets: document.getElementById("stat-sets"),
    statVolume: document.getElementById("stat-volume"),
    panel: document.getElementById("day-panel"),
  });
}

export function renderTraining() {
  updateTitleBlock();
  updateWeekStrip();
  updateSummary();
  renderDayPanel();
}

function dayEyebrow() {
  const dateLabel = longDateFormat.format(dateOfWeekday(state.selectedDay));
  return state.selectedDay === todayWeekday() ? `Heute, ${dateLabel}` : dateLabel;
}

export function updateTitleBlock() {
  trainingElements.eyebrow.textContent = dayEyebrow();
  trainingElements.title.textContent = selectedDayTitle();
}

export function updateWeekStrip() {
  const today = todayWeekday();
  const previousIndex = trainingElements.weekLens.style.getPropertyValue("--index");
  if (previousIndex !== "" && Number(previousIndex) !== state.selectedDay) playAnimation(trainingElements.weekLens, "lens-moving");
  trainingElements.weekLens.style.setProperty("--index", state.selectedDay);
  trainingElements.weekButtons.forEach((button, index) => {
    const date = dateOfWeekday(index);
    const isSelected = index === state.selectedDay;
    button.querySelector(".week-date").textContent = date.getDate();
    button.classList.toggle("is-selected", isSelected);
    button.classList.toggle("is-today", index === today);
    button.classList.toggle("has-training", state.plan.days[index].exercises.length > 0);
    button.setAttribute("aria-pressed", String(isSelected));
    button.setAttribute("aria-label", longDateFormat.format(date));
  });
}

function updateSummary() {
  const day = selectedPlanDay();
  const total = day.exercises.length;
  trainingElements.summary.hidden = state.isEditing || total === 0;
  if (trainingElements.summary.hidden) return;
  const done = completedCount(day);
  const wasComplete = trainingElements.ring.dataset.complete === "true";
  const isComplete = done === total;
  const sets = Object.values(currentSession()?.exercises ?? {}).flatMap((entry) => entry.sets);
  trainingElements.ringValue.setAttribute("stroke-dashoffset", String(RING_CIRCUMFERENCE * (1 - done / total)));
  trainingElements.ringValue.classList.toggle("is-empty", done === 0);
  trainingElements.ringTotal.textContent = `/${total}`;
  trainingElements.ring.setAttribute("aria-label", `${done} von ${total} Übungen erledigt`);
  trainingElements.ring.dataset.complete = String(isComplete);
  animateNumber(trainingElements.ringDone, done, formatInteger);
  animateNumber(trainingElements.statSets, sets.length, formatInteger);
  animateNumber(trainingElements.statVolume, liftedVolume(sets), formatInteger);
  if (isComplete && !wasComplete) playAnimation(trainingElements.ring, "pulse");
}

export function renderDayPanel() {
  const html = state.isEditing ? renderEditor() : renderDayContent();
  if (html === renderedPanelHtml) return;
  renderedPanelHtml = html;
  trainingElements.panel.innerHTML = html;
}

function renderDayContent() {
  const day = selectedPlanDay();
  if (isPlanEmpty(state.plan)) return renderEmptyPlan();
  if (day.exercises.length === 0) return renderRestDay();
  return `
    <h2 class="section-title">Übungen</h2>
    <div class="group exercise-list">${day.exercises.map(renderExerciseRow).join("")}</div>`;
}

function renderExerciseRow(exercise) {
  const today = todaysSets(exercise.id);
  const previous = previousEntry(exercise.id);
  const meta = today
    ? `Heute: ${describeSets(today)}`
    : previous ? `Letztes Mal: ${describeSets(previous.sets)}` : "Noch kein Eintrag";
  const circleClasses = ["check-circle", today ? "is-done" : "", isRecentlyCompleted(exercise.id) ? "is-just-done" : ""].filter(Boolean).join(" ");
  return `
    <button class="exercise-row" type="button" data-action="open-exercise" data-id="${escapeHtml(exercise.id)}">
      <span class="${circleClasses}" role="img" aria-label="${today ? "Heute erledigt" : "Offen"}">${ICONS.check}</span>
      <span class="exercise-text">
        <span class="exercise-name">${escapeHtml(exercise.name)}</span>
        <span class="exercise-meta">${escapeHtml(meta)}</span>
      </span>
      <span class="chevron" aria-hidden="true">${ICONS.chevron}</span>
    </button>`;
}

function renderEmptyPlan() {
  return `
    <div class="group empty-card">
      <h2>Leg deinen Wochenplan an</h2>
      <p>Trag einmal ein, was du an welchem Tag trainierst. Im Gym tippst du dann nur noch die Übung an.</p>
      <div class="empty-actions">
        <button class="button-filled" type="button" data-action="start-editing">${escapeHtml(WEEKDAYS[state.selectedDay])} anlegen</button>
        <button class="button-tinted" type="button" data-action="use-sample-plan">Beispielplan laden</button>
      </div>
    </div>`;
}

function renderRestDay() {
  return `
    <div class="group empty-card">
      <h2>Ruhetag</h2>
      <p>Für ${escapeHtml(WEEKDAYS[state.selectedDay])} ist nichts geplant. Wähle oben einen anderen Tag oder wisch zur Seite.</p>
      <div class="empty-actions">
        <button class="button-tinted" type="button" data-action="start-editing">Übungen hinzufügen</button>
      </div>
    </div>`;
}

export function selectDay(dayIndex, direction) {
  if (dayIndex === state.selectedDay) return;
  state.selectedDay = dayIndex;
  renderTraining();
  updateNav();
  const animation = direction > 0 ? "slide-in-from-right" : "slide-in-from-left";
  playAnimation(trainingElements.panel, animation);
  playAnimation(trainingElements.titleText, animation);
}

function selectAdjacentDay(step) {
  selectDay((state.selectedDay + step + WEEKDAYS.length) % WEEKDAYS.length, step);
}

export function useSamplePlan() {
  const plan = createSamplePlan();
  state.plan = plan;
  saveState();
  render();
  playAnimation(trainingElements.panel, "fade-in");
}

export function handleSwipeStart(event) {
  const isSingleTouch = event.touches.length === 1;
  swipeStart = isSingleTouch && !state.isEditing && !event.target.closest("input")
    ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
    : null;
}

export function handleSwipeEnd(event) {
  if (!swipeStart) return;
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - swipeStart.x;
  const deltaY = touch.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.abs(deltaX) < SWIPE_DISTANCE || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;
  selectAdjacentDay(deltaX < 0 ? 1 : -1);
}

export function startTodaysTraining() {
  const today = todayWeekday();
  selectDay(today, today > state.selectedDay ? 1 : -1);
  selectTab("training");
}

export function startPlanSetup() {
  selectTab("training");
  if (!state.isEditing) setEditing(true);
}
