import { homeView } from "../app/dom.js";
import { state } from "../app/state.js";
import { nutritionEntriesOn } from "../model/nutrition-log.js";
import { totalsOf } from "../model/nutrition.js";
import { isPlanEmpty } from "../model/plan.js";
import { allSets, liftedVolume } from "../model/sessions.js";
import { missingForecastInputs } from "../model/strength-forecast.js";
import { isWeighInDue } from "../model/weight.js";
import { describeCalorieBalance } from "./nutrition/nutrition-labels.js";
import { renderCalorieRing } from "./nutrition/nutrition-screen.js";
import { firstName, renderAvatar } from "./profile/profile-screen.js";
import { renderWeighInCard } from "./weigh-in.js";
import { ICONS } from "../svg/icons.js";
import { playAnimation } from "../ui/animation.js";
import { renderInfoRow, renderMiniRing, setCardHtml } from "../ui/components.js";
import { addDays, startOfWeek, todayIso, todayWeekday, toIsoDate, WEEKDAY_LABELS, WEEKDAYS } from "../utils/dates.js";
import { countLabel, formatInteger, formatShortDate, formatTonnes, longDateFormat } from "../utils/format.js";
import { escapeHtml } from "../utils/text.js";

const homeElements = {};

export function greeting(now) {
  const hour = now.getHours();
  if (hour >= 5 && hour < 11) return "Guten Morgen";
  if (hour >= 11 && hour < 18) return "Guten Tag";
  if (hour >= 18 && hour < 23) return "Guten Abend";
  return "Hallo";
}

function timeOfDayIcon(now) {
  const hour = now.getHours();
  if (hour >= 5 && hour < 11) return ICONS.sunrise;
  if (hour >= 11 && hour < 18) return ICONS.sun;
  if (hour >= 18 && hour < 21) return ICONS.sunset;
  return ICONS.moon;
}

export function buildHomeView() {
  homeView.innerHTML = `
    <div class="home-hero">
      <div class="home-hero-top">
        <span class="time-symbol" id="time-symbol" aria-hidden="true"></span>
        <button class="home-avatar" type="button" data-action="open-profile" aria-label="Profil öffnen">
          <span class="avatar" id="home-avatar" aria-hidden="true"></span>
        </button>
      </div>
      <p class="eyebrow" id="home-date"></p>
      <h1 class="home-greeting" id="home-greeting"></h1>
    </div>
    <h2 class="section-title">Heute</h2>
    <div class="card-stack">
      <section class="group today-card" id="today-card" aria-label="Training heute"></section>
      <section class="group today-card" id="nutrition-today-card" aria-label="Ernährung heute"></section>
      <section class="group today-card" id="weigh-in-today-card" aria-label="Wöchentliches Wiegen" hidden></section>
    </div>
    <h2 class="section-title">Diese Woche</h2>
    <div class="card-stack">
      <section class="group" id="week-overview" aria-label="Trainings diese Woche"></section>
      <div class="group" id="home-facts"></div>
    </div>
    <div id="home-hint"></div>`;
  Object.assign(homeElements, {
    symbol: document.getElementById("time-symbol"),
    avatar: document.getElementById("home-avatar"),
    date: document.getElementById("home-date"),
    greeting: document.getElementById("home-greeting"),
    todayCard: document.getElementById("today-card"),
    nutritionCard: document.getElementById("nutrition-today-card"),
    weighInCard: document.getElementById("weigh-in-today-card"),
    weekOverview: document.getElementById("week-overview"),
    facts: document.getElementById("home-facts"),
    hint: document.getElementById("home-hint"),
  });
}

function updateGreeting(shouldAnimate) {
  const now = new Date();
  const name = firstName();
  const text = name ? `${greeting(now)}, ${name}` : greeting(now);
  homeElements.date.textContent = longDateFormat.format(now);
  homeElements.symbol.innerHTML = timeOfDayIcon(now);
  renderAvatar(homeElements.avatar);
  if (shouldAnimate) playAnimation(homeElements.symbol, "symbol-in");
  if (!shouldAnimate && homeElements.greeting.dataset.text === text) return;
  homeElements.greeting.dataset.text = text;
  homeElements.greeting.setAttribute("aria-label", text);
  homeElements.greeting.innerHTML = text.split(" ")
    .map((word, index) => `<span class="greeting-word" style="--order: ${index}" aria-hidden="true">${escapeHtml(word)}</span>`)
    .join(" ");
}

function sessionOn(dayIndex) {
  const sessionId = `${toIsoDate(new Date())}_${dayIndex}`;
  return state.sessions.find((session) => session.id === sessionId) ?? null;
}

function nextPlannedDay(fromDay) {
  for (let offset = 1; offset <= WEEKDAYS.length; offset += 1) {
    const dayIndex = (fromDay + offset) % WEEKDAYS.length;
    if (state.plan.days[dayIndex].exercises.length > 0) return dayIndex;
  }
  return null;
}

export function renderTodayCardContent({ visual = "", label, title, text, action, actionLabel, buttonClass = "button-filled" }) {
  return `
    <div class="today-main">
      ${visual}
      <div class="today-text">
        <p class="today-label">${escapeHtml(label)}</p>
        <p class="today-title">${escapeHtml(title)}</p>
        ${text ? `<p class="today-meta">${escapeHtml(text)}</p>` : ""}
      </div>
    </div>
    <button class="${buttonClass}" type="button" data-action="${action}">${escapeHtml(actionLabel)}</button>`;
}

function describeNextTraining(today) {
  const nextDay = nextPlannedDay(today);
  if (nextDay === null) return "";
  const name = state.plan.days[nextDay].name;
  return `Nächstes Training: ${WEEKDAYS[nextDay]}${name ? `, ${name}` : ""}`;
}

function renderTodayCard() {
  if (isPlanEmpty(state.plan)) {
    return renderTodayCardContent({ label: "Training", title: "Noch kein Plan", text: "Leg einmal fest, was du an welchem Tag trainierst.", action: "start-plan", actionLabel: "Plan anlegen" });
  }
  const today = todayWeekday();
  const day = state.plan.days[today];
  if (day.exercises.length === 0) {
    return renderTodayCardContent({ label: "Training", title: "Ruhetag", text: describeNextTraining(today), action: "open-training", actionLabel: "Plan ansehen", buttonClass: "button-tinted" });
  }
  const session = sessionOn(today);
  const total = day.exercises.length;
  const done = day.exercises.filter((exercise) => session?.exercises[exercise.id]?.sets?.length).length;
  const actionLabel = done === 0 ? "Training starten" : done < total ? "Weiter trainieren" : "Training ansehen";
  return renderTodayCardContent({
    visual: renderMiniRing({ fraction: done / total, label: `${done}/${total}`, ariaLabel: `${done} von ${total} Übungen erledigt` }),
    label: done === total ? "Training erledigt" : "Training",
    title: day.name || WEEKDAYS[today],
    text: `${countLabel(total, "Übung", "Übungen")}${done > 0 ? `, ${done} erledigt` : ""}`,
    action: "start-training",
    actionLabel,
  });
}

function describeTodayNutrition(totals) {
  const { kcal: calorieGoal, protein: proteinGoal } = state.nutrition.goals;
  if (totals.kcal === 0) return calorieGoal ? `Noch nichts eingetragen · Ziel ${formatInteger(calorieGoal)} kcal` : "Noch nichts eingetragen";
  const parts = [calorieGoal ? describeCalorieBalance(totals.kcal, calorieGoal) : ""];
  if (proteinGoal) parts.push(`Protein ${formatInteger(totals.protein)} von ${formatInteger(proteinGoal)} g`);
  else if (totals.protein > 0) parts.push(`Protein ${formatInteger(totals.protein)} g`);
  return parts.filter(Boolean).join(" · ") || "Noch nichts eingetragen";
}

function renderNutritionTodayCard() {
  const totals = totalsOf(nutritionEntriesOn(todayIso()));
  return renderTodayCardContent({
    visual: renderCalorieRing(totals.kcal, state.nutrition.goals.kcal),
    label: "Ernährung",
    title: `${formatInteger(totals.kcal)} kcal`,
    text: describeTodayNutrition(totals),
    action: "add-nutrition-today",
    actionLabel: "Eintrag hinzufügen",
    buttonClass: "button-tinted",
  });
}

function trainedDatesThisWeek() {
  const weekStartIso = toIsoDate(startOfWeek(new Date()));
  const today = todayIso();
  return new Set(state.sessions.map((session) => session.date).filter((date) => date >= weekStartIso && date <= today));
}

function renderWeekOverview() {
  const today = todayWeekday();
  const monday = startOfWeek(new Date());
  const trainedDates = trainedDatesThisWeek();
  const plannedDays = state.plan.days.filter((day) => day.exercises.length > 0).length;
  const cells = WEEKDAYS.map((weekday, index) => {
    const isDone = trainedDates.has(toIsoDate(addDays(monday, index)));
    const isPlanned = state.plan.days[index].exercises.length > 0;
    const status = isDone ? "is-done" : isPlanned ? "is-planned" : "is-rest";
    const statusLabel = isDone ? "trainiert" : isPlanned ? "geplant" : "Ruhetag";
    return `
      <li class="week-cell ${status}${index === today ? " is-today" : ""}" style="--order: ${index}" aria-label="${weekday}: ${statusLabel}">
        <span class="week-cell-label" aria-hidden="true">${WEEKDAY_LABELS[index]}</span>
        <span class="week-cell-mark" aria-hidden="true">${isDone ? ICONS.check : ""}</span>
      </li>`;
  }).join("");
  const caption = plannedDays > 0
    ? `${trainedDates.size} von ${countLabel(plannedDays, "geplantem Training", "geplanten Trainings")} erledigt`
    : `${countLabel(trainedDates.size, "Training", "Trainings")} diese Woche`;
  return `<ol class="week-cells">${cells}</ol><p class="week-caption">${escapeHtml(caption)}</p>`;
}

function describeLastTraining() {
  const last = state.sessions[0];
  if (!last) return "Noch keins";
  const planName = state.plan.days[last.day].name;
  return `${formatShortDate(last.date)}${planName ? `, ${planName}` : ""}`;
}

function renderHomeFacts() {
  const weekStartIso = toIsoDate(startOfWeek(new Date()));
  const weekVolume = liftedVolume(allSets(state.sessions.filter((session) => session.date >= weekStartIso)));
  return [
    renderInfoRow("Letztes Training", describeLastTraining()),
    renderInfoRow("Bewegt diese Woche", formatTonnes(weekVolume)),
    renderInfoRow("Trainings gesamt", formatInteger(state.sessions.length)),
  ].join("");
}

function renderProfileHint() {
  if (missingForecastInputs().length === 0) return "";
  return `
    <section class="group home-hint">
      <div class="forecast-hint">
        <p>Mit deinen Körperdaten werden Prognose und Richtwerte genauer.</p>
        <button class="button-tinted" type="button" data-action="open-profile">Profil vervollständigen</button>
      </div>
    </section>`;
}

export function renderHome({ animateGreeting = false } = {}) {
  updateGreeting(animateGreeting);
  setCardHtml(homeElements.todayCard, renderTodayCard());
  setCardHtml(homeElements.nutritionCard, renderNutritionTodayCard());
  homeElements.weighInCard.hidden = !isWeighInDue();
  if (!homeElements.weighInCard.hidden) setCardHtml(homeElements.weighInCard, renderWeighInCard());
  setCardHtml(homeElements.weekOverview, renderWeekOverview());
  setCardHtml(homeElements.facts, renderHomeFacts());
  setCardHtml(homeElements.hint, renderProfileHint());
}
