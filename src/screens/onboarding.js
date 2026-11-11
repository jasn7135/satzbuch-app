import { appShell } from "../app/dom.js";
import { render, selectTab } from "../app/navigation.js";
import { state } from "../app/state.js";
import { EARLIEST_BIRTH_DATE, NAME_MAX_LENGTH } from "../config/limits.js";
import { ACTIVITY_OPTIONS, EXPERIENCE_OPTIONS, isOptionValue, SEX_OPTIONS } from "../config/options.js";
import { isPlanEmpty } from "../model/plan.js";
import { parseBodyWeight, parseHeight } from "../model/profile-input.js";
import { isValidBirthDate, normalizeProfile } from "../model/profile.js";
import { greeting, renderHome } from "./home.js";
import { renderBodyFields, renderWeightInput } from "./profile/body-fields.js";
import { saveProfile } from "./profile/profile-screen.js";
import { startPlanSetup, useSamplePlan } from "./training/training-screen.js";
import { ICONS } from "../svg/icons.js";
import { playAnimation } from "../ui/animation.js";
import { updateDateDisplay } from "../ui/forms.js";
import { closeSheet } from "../ui/sheet.js";
import { showToast } from "../ui/toast.js";
import { parseIsoDate, toIsoDate } from "../utils/dates.js";
import { fullDateFormat } from "../utils/format.js";
import { escapeHtml, sanitizeName } from "../utils/text.js";

const onboardingLayer = document.getElementById("onboarding");
export const onboardingBack = document.getElementById("onboarding-back");
const onboardingProgress = document.getElementById("onboarding-progress");
export const onboardingPage = document.getElementById("onboarding-page");

function onboardingSteps() {
  const steps = ["welcome", "name", "birth", "body"];
  return isPlanEmpty(state.plan) ? [...steps, "plan", "ready"] : [...steps, "ready"];
}

export function maybeStartOnboarding() {
  if (state.onboarding || state.profile.name) return;
  state.onboarding = { stepIndex: 0, steps: onboardingSteps(), ...normalizeProfile(null), planChoice: "sample" };
  closeSheet();
  onboardingLayer.hidden = false;
  onboardingLayer.classList.remove("is-leaving");
  appShell.inert = true;
  renderOnboardingStep(0);
}

function currentOnboardingStep() {
  return state.onboarding.steps[state.onboarding.stepIndex];
}

function renderOnboardingStep(direction) {
  const { stepIndex, steps } = state.onboarding;
  onboardingBack.hidden = stepIndex === 0;
  onboardingProgress.style.width = `${((stepIndex + 1) / steps.length) * 100}%`;
  onboardingPage.innerHTML = ONBOARDING_TEMPLATES[currentOnboardingStep()]();
  if (direction !== 0) playAnimation(onboardingPage, direction > 0 ? "slide-in-from-right" : "slide-in-from-left");
  focusOnboardingInput();
}

function focusOnboardingInput() {
  const nameInput = document.getElementById("onboarding-name");
  if (nameInput) setTimeout(() => nameInput.focus(), 350);
}

function renderFeature(icon, title, text, order) {
  return `
    <li style="--order: ${order}">
      <span class="feature-icon" aria-hidden="true">${icon}</span>
      <div><p class="feature-title">${title}</p><p class="feature-text">${text}</p></div>
    </li>`;
}

function renderOnboardingFooter(label, { isDisabled = false, secondary = "" } = {}) {
  return `
    <div class="ob-footer">
      <button class="button-filled" id="onboarding-next" type="button" data-action="onboarding-next"${isDisabled ? " disabled" : ""}>${label}</button>
      ${secondary}
    </div>`;
}

const ONBOARDING_TEMPLATES = {
  welcome: () => `
    <div class="ob-body">
      <div class="app-glyph" aria-hidden="true">${ICONS.training}</div>
      <p class="ob-greeting">${greeting(new Date())}.</p>
      <h1 class="ob-title">Willkommen bei Satzbuch</h1>
      <ul class="feature-list">
        ${renderFeature(ICONS.calendar, "Plan für jeden Wochentag", "Übungen wählst du aus einer Liste, samt Muskelkarte.", 0)}
        ${renderFeature(ICONS.repeat, "Werte vom letzten Mal", "Gewicht und Wiederholungen sind vorausgefüllt. Du änderst nur, was anders ist.", 1)}
        ${renderFeature(ICONS.nutrition, "Mahlzeiten und Makros", "Trag ein, was du isst. Vorschläge rechnen Kalorien und Makros mit.", 2)}
        ${renderFeature(ICONS.chart, "Fortschritt im Blick", "Statistik, Prognose und 3D-Körpermodell zeigen deine Entwicklung.", 3)}
      </ul>
    </div>
    ${renderOnboardingFooter("Weiter")}`,
  name: () => `
    <div class="ob-body">
      <h1 class="ob-title">Wie heißt du?</h1>
      <p class="ob-text">Dein Name erscheint in der Begrüßung und in deinem Profil.</p>
      <div class="group">
        <input class="ob-input" id="onboarding-name" value="${escapeHtml(state.onboarding.name)}" placeholder="Vor- und Nachname" maxlength="${NAME_MAX_LENGTH}" autocomplete="name" enterkeyhint="next" aria-label="Name">
      </div>
    </div>
    ${renderOnboardingFooter("Weiter", { isDisabled: !state.onboarding.name })}`,
  birth: () => `
    <div class="ob-body">
      <h1 class="ob-title">Wann hast du Geburtstag?</h1>
      <p class="ob-text">Daraus berechnet dein Profil dein Alter. Du kannst das auch später eintragen.</p>
      <div class="group">
        <div class="form-row">
          <span class="form-label" id="onboarding-birth-label">Geburtsdatum</span>
          <span class="date-display${state.onboarding.birthDate ? "" : " is-empty"}" id="onboarding-birth-display" aria-hidden="true">${state.onboarding.birthDate ? fullDateFormat.format(parseIsoDate(state.onboarding.birthDate)) : "Auswählen"}</span>
          <input class="date-input" id="onboarding-birth" type="date" value="${state.onboarding.birthDate}" min="${EARLIEST_BIRTH_DATE}" max="${toIsoDate(new Date())}" aria-labelledby="onboarding-birth-label">
        </div>
      </div>
    </div>
    ${renderOnboardingFooter("Weiter", { isDisabled: !state.onboarding.birthDate, secondary: '<button class="button-plain" type="button" data-action="onboarding-skip">Später eintragen</button>' })}`,
  body: () => `
    <div class="ob-body">
      <h1 class="ob-title">Ein paar Eckdaten</h1>
      <p class="ob-text">Damit schätzt Satzbuch deine Entwicklung und deinen Kalorienbedarf realistisch ein. Alles ist freiwillig und im Profil änderbar.</p>
      <div class="group">${renderWeightInput("onboarding", "data-onboarding-field", state.onboarding.bodyWeight)}${renderBodyFields("onboarding", "data-onboarding-field", state.onboarding)}</div>
    </div>
    ${renderOnboardingFooter("Weiter", { secondary: '<button class="button-plain" type="button" data-action="onboarding-skip">Später eintragen</button>' })}`,
  plan: () => `
    <div class="ob-body">
      <h1 class="ob-title">Wie möchtest du starten?</h1>
      <p class="ob-text">Du kannst deinen Plan jederzeit unter „Bearbeiten“ ändern.</p>
      <div class="choice-list" role="radiogroup" aria-label="Start">
        ${renderPlanChoice("sample", "Beispielplan", "Push, Pull und Beine am Montag, Mittwoch und Freitag.")}
        ${renderPlanChoice("own", "Eigener Plan", "Du trägst deine Übungen selbst ein.")}
      </div>
    </div>
    ${renderOnboardingFooter("Weiter")}`,
  ready: () => `
    <div class="ob-body ob-centered">
      <div class="ready-mark" aria-hidden="true">${ICONS.check}</div>
      <h1 class="ob-title">Alles bereit, ${escapeHtml(state.onboarding.name.split(" ")[0])}.</h1>
      <p class="ob-text">Deine Startseite begrüßt dich ab jetzt passend zur Tageszeit und zeigt dir, was heute ansteht.</p>
    </div>
    ${renderOnboardingFooter(wantsOwnPlan(state.onboarding) ? "Plan anlegen" : "Zur Startseite")}`,
};

function wantsOwnPlan(onboarding) {
  return onboarding.steps.includes("plan") && onboarding.planChoice === "own";
}

function renderPlanChoice(choice, title, text) {
  const isSelected = state.onboarding.planChoice === choice;
  return `
    <button class="group choice${isSelected ? " is-selected" : ""}" type="button" role="radio" aria-checked="${isSelected}" data-action="onboarding-choose" data-choice="${choice}">
      <span class="choice-text"><span class="choice-title">${title}</span><span class="choice-sub">${text}</span></span>
      <span class="choice-mark" aria-hidden="true"></span>
    </button>`;
}

export function goToOnboardingStep(direction) {
  const nextIndex = state.onboarding.stepIndex + direction;
  if (nextIndex >= state.onboarding.steps.length) {
    finishOnboarding();
    return;
  }
  state.onboarding.stepIndex = Math.max(0, nextIndex);
  renderOnboardingStep(direction);
}

export function advanceOnboarding() {
  if (currentOnboardingStep() === "name" && !state.onboarding.name) return;
  goToOnboardingStep(1);
}

const ONBOARDING_SKIP_RESETS = {
  birth: { birthDate: "" },
  body: { bodyWeight: null, height: null, sex: "", experience: "", activity: "" },
};

export function skipOnboardingStep() {
  Object.assign(state.onboarding, ONBOARDING_SKIP_RESETS[currentOnboardingStep()]);
  goToOnboardingStep(1);
}

export function chooseOnboardingPlan(choice) {
  state.onboarding.planChoice = choice;
  onboardingPage.querySelectorAll(".choice").forEach((button) => {
    const isSelected = button.dataset.choice === choice;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-checked", String(isSelected));
  });
}

export function handleOnboardingInput(event) {
  if (event.target.id === "onboarding-name") {
    state.onboarding.name = sanitizeName(event.target.value, NAME_MAX_LENGTH);
    document.getElementById("onboarding-next").disabled = !state.onboarding.name;
  }
  if (event.target.id === "onboarding-birth") {
    const value = event.target.value;
    state.onboarding.birthDate = isValidBirthDate(value) ? value : "";
    updateDateDisplay(document.getElementById("onboarding-birth-display"), state.onboarding.birthDate);
    document.getElementById("onboarding-next").disabled = !state.onboarding.birthDate;
  }
  const bodyField = event.target.dataset.onboardingField;
  if (bodyField === "bodyWeight") {
    const parsed = parseBodyWeight(event.target.value);
    state.onboarding.bodyWeight = parsed.error ? null : parsed.value;
    if (parsed.error && event.type === "change") showToast(parsed.error);
  }
  if (bodyField === "height") {
    const parsed = parseHeight(event.target.value);
    state.onboarding.height = parsed.error ? null : parsed.value;
    if (parsed.error && event.type === "change") showToast(parsed.error);
  }
  if (bodyField === "sex" && isOptionValue(SEX_OPTIONS, event.target.value)) state.onboarding.sex = event.target.value;
  if (bodyField === "experience" && isOptionValue(EXPERIENCE_OPTIONS, event.target.value)) state.onboarding.experience = event.target.value;
  if (bodyField === "activity" && isOptionValue(ACTIVITY_OPTIONS, event.target.value)) state.onboarding.activity = event.target.value;
}

export function handleOnboardingKeydown(event) {
  if (event.key !== "Enter" || !event.target.matches("input")) return;
  event.preventDefault();
  if (event.target.id === "onboarding-name") advanceOnboarding();
  else event.target.blur();
}

function finishOnboarding() {
  const { name, birthDate, sex, experience, activity, bodyWeight, height, planChoice, steps } = state.onboarding;
  const choosesPlan = steps.includes("plan");
  const startsWithOwnPlan = wantsOwnPlan(state.onboarding);
  const weightLog = bodyWeight === null ? [] : [{ date: toIsoDate(new Date()), kg: bodyWeight }];
  state.onboarding = null;
  saveProfile(normalizeProfile({ name, birthDate, sex, experience, activity, bodyWeight, height, weightLog }));
  if (choosesPlan && planChoice === "sample") useSamplePlan();
  onboardingLayer.classList.add("is-leaving");
  onboardingLayer.addEventListener("animationend", () => {
    onboardingLayer.hidden = true;
    onboardingLayer.classList.remove("is-leaving");
  }, { once: true });
  appShell.inert = false;
  render();
  if (startsWithOwnPlan) startPlanSetup();
  else if (state.activeTab === "home") renderHome({ animateGreeting: true });
  else selectTab("home");
}
