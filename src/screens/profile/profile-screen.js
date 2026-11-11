import { profileView } from "../../app/dom.js";
import { saveState, state } from "../../app/state.js";
import { EARLIEST_BIRTH_DATE, NAME_MAX_LENGTH } from "../../config/limits.js";
import { ACTIVITY_OPTIONS, EXPERIENCE_OPTIONS, GOAL_OPTIONS, isOptionValue, MEASUREMENT_FIELDS, PACE_OPTIONS, SEX_OPTIONS } from "../../config/options.js";
import { plannedWeeklyChange } from "../../model/energy.js";
import { parseHeight, parseMeasurement, parseTargetWeight } from "../../model/profile-input.js";
import { ageOn, isBirthday, isValidBirthDate, normalizeProfile } from "../../model/profile.js";
import { renderBodyFields } from "./body-fields.js";
import { ICONS } from "../../svg/icons.js";
import { playAnimation } from "../../ui/animation.js";
import { renderMenuSelect, renderUnitInput, updateDateDisplay } from "../../ui/forms.js";
import { showToast } from "../../ui/toast.js";
import { toIsoDate } from "../../utils/dates.js";
import { formatBodyWeight, formatNumber, formatWeeklyChange } from "../../utils/format.js";
import { escapeHtml, sanitizeName } from "../../utils/text.js";

export const profileElements = {};

export function firstName() {
  return state.profile.name.split(" ")[0] ?? "";
}

function initialsOf(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join("");
}

function renderMeasurementFields() {
  return Object.entries(MEASUREMENT_FIELDS).map(([field, bounds]) => renderUnitInput({
    id: `profile-${field}`,
    label: bounds.label,
    attributes: `data-profile-field="measurement" data-measurement="${field}"`,
    value: "",
    unit: "cm",
    placeholder: "–",
  })).join("");
}

function renderGoalFields() {
  return `
    <div class="form-row">
      <span class="form-label">Ziel</span>
      ${renderMenuSelect("profile-goal", 'data-profile-field="goalType"', GOAL_OPTIONS, state.profile.goal.type, "Ziel")}
    </div>
    ${renderUnitInput({ id: "profile-target-weight", label: "Zielgewicht", attributes: 'data-profile-field="targetWeight"', value: "", unit: "kg", placeholder: "–" })}
    <div class="form-row" id="profile-pace-row">
      <span class="form-label">Tempo</span>
      ${renderMenuSelect("profile-pace", 'data-profile-field="pace"', PACE_OPTIONS, state.profile.goal.pace, "Tempo")}
    </div>`;
}

export function buildProfileView() {
  profileView.innerHTML = `
    <h1 class="large-title">Profil</h1>
    <div class="group profile-card">
      <button class="avatar-button" type="button" data-action="choose-photo" aria-label="Profilbild ändern">
        <span class="avatar" id="profile-avatar" aria-hidden="true"></span>
        <span class="avatar-badge" aria-hidden="true">${ICONS.camera}</span>
      </button>
      <div class="profile-text">
        <p class="profile-name" id="profile-heading"></p>
        <p class="profile-sub" id="profile-sub"></p>
        <button class="text-button" id="remove-photo" type="button" data-action="remove-photo" hidden>Foto entfernen</button>
      </div>
    </div>
    <input class="visually-hidden" id="photo-input" type="file" accept="image/*" tabindex="-1" aria-hidden="true">
    <p class="group-label">Persönlich</p>
    <div class="group">
      <label class="form-row" for="profile-name">
        <span class="form-label">Name</span>
        <input class="form-input" id="profile-name" data-profile-field="name" placeholder="Dein Name" maxlength="${NAME_MAX_LENGTH}" autocomplete="name" enterkeyhint="done">
      </label>
      <div class="form-row">
        <span class="form-label" id="birth-label">Geburtsdatum</span>
        <span class="date-display" id="birth-display" aria-hidden="true"></span>
        <input class="date-input" id="profile-birth" type="date" data-profile-field="birthDate" min="${EARLIEST_BIRTH_DATE}" aria-labelledby="birth-label">
      </div>
    </div>
    <p class="group-label">Körper</p>
    <div class="group">
      <button class="form-row row-button" type="button" data-action="open-weigh-in">
        <span class="form-label">Körpergewicht</span>
        <span class="info-value" id="profile-weight-value"></span>
        <span class="chevron" aria-hidden="true">${ICONS.chevron}</span>
      </button>
      ${renderBodyFields("profile", "data-profile-field", state.profile)}
    </div>
    <p class="note">Alltag meint deinen Tag ohne Training, die Trainings rechnet Satzbuch selbst dazu. Gewicht trägst du am besten einmal pro Woche ein.</p>
    <p class="group-label">Körpermaße</p>
    <div class="group">${renderMeasurementFields()}</div>
    <p class="note">Freiwillig, für eine genauere Körperfett-Schätzung. Taille auf Höhe des Bauchnabels messen, Hals direkt unter dem Kehlkopf, Hüfte an der breitesten Stelle.</p>
    <p class="group-label">Ziel</p>
    <div class="group">${renderGoalFields()}</div>
    <p class="note" id="goal-note"></p>
    <p class="group-label">Sicherung</p>
    <div class="group">
      <button class="action-row" type="button" data-action="export-json">
        <span class="action-icon" aria-hidden="true">${ICONS.document}</span>
        <span class="action-text"><span class="action-title">Als Datei sichern</span><span class="action-sub">Alle Daten, zum Wiederherstellen</span></span>
        <span class="chevron" aria-hidden="true">${ICONS.chevron}</span>
      </button>
      <button class="action-row" type="button" data-action="export-csv">
        <span class="action-icon" aria-hidden="true">${ICONS.table}</span>
        <span class="action-text"><span class="action-title">Als Tabelle exportieren</span><span class="action-sub">Alle Sätze für Numbers oder Excel</span></span>
        <span class="chevron" aria-hidden="true">${ICONS.chevron}</span>
      </button>
      <button class="action-row" type="button" data-action="choose-import-file">
        <span class="action-icon" aria-hidden="true">${ICONS.restore}</span>
        <span class="action-text"><span class="action-title">Aus Datei wiederherstellen</span><span class="action-sub">Ersetzt alle aktuellen Daten</span></span>
        <span class="chevron" aria-hidden="true">${ICONS.chevron}</span>
      </button>
    </div>
    <p class="note">Deine Daten liegen nur auf diesem iPhone. Sichere sie regelmäßig, damit nichts verloren geht.</p>
    <div class="group danger-group">
      <button class="action-row is-destructive" type="button" data-action="open-reset">
        <span class="action-icon" aria-hidden="true">${ICONS.trash}</span>
        <span class="action-text"><span class="action-title">Alle Daten löschen</span><span class="action-sub">Plan, Trainings, Ernährung und Profil</span></span>
        <span class="chevron" aria-hidden="true">${ICONS.chevron}</span>
      </button>
    </div>
    <input class="visually-hidden" id="import-input" type="file" accept="application/json,.json" tabindex="-1" aria-hidden="true">`;
  Object.assign(profileElements, {
    avatar: document.getElementById("profile-avatar"),
    photoInput: document.getElementById("photo-input"),
    removePhotoButton: document.getElementById("remove-photo"),
    heading: document.getElementById("profile-heading"),
    sub: document.getElementById("profile-sub"),
    nameInput: document.getElementById("profile-name"),
    birthInput: document.getElementById("profile-birth"),
    birthDisplay: document.getElementById("birth-display"),
    weightValue: document.getElementById("profile-weight-value"),
    heightInput: document.getElementById("profile-height"),
    sexSelect: document.getElementById("profile-sex"),
    experienceSelect: document.getElementById("profile-experience"),
    activitySelect: document.getElementById("profile-activity"),
    measurementInputs: [...profileView.querySelectorAll("[data-measurement]")],
    goalSelect: document.getElementById("profile-goal"),
    targetWeightInput: document.getElementById("profile-target-weight"),
    paceSelect: document.getElementById("profile-pace"),
    paceRow: document.getElementById("profile-pace-row"),
    goalNote: document.getElementById("goal-note"),
    importInput: document.getElementById("import-input"),
  });
}

export function renderProfile() {
  updateProfileSummary();
  syncProfileInputs();
}

function describeProfileSubline() {
  const { name, birthDate, bodyWeight, height } = state.profile;
  if (!birthDate && bodyWeight === null && height === null) return name ? "Trag noch Geburtsdatum und Körperdaten ein." : "Trag deinen Namen und dein Geburtsdatum ein.";
  const today = new Date();
  const facts = [birthDate ? `${ageOn(birthDate, today)} Jahre` : "", bodyWeight === null ? "" : `${formatNumber(bodyWeight)} kg`, height === null ? "" : `${height} cm`].filter(Boolean).join(", ");
  return birthDate && isBirthday(birthDate, today) ? `${facts}. Alles Gute zum Geburtstag!` : facts;
}

export function renderAvatar(element) {
  const { photo, name } = state.profile;
  const initials = initialsOf(name);
  const content = photo || initials || "placeholder";
  if (element.dataset.content === content) return;
  element.dataset.content = content;
  if (photo) element.innerHTML = `<img src="${escapeHtml(photo)}" alt="">`;
  else element.innerHTML = initials ? escapeHtml(initials) : ICONS.person;
}

function updateProfileSummary() {
  renderAvatar(profileElements.avatar);
  profileElements.removePhotoButton.hidden = !state.profile.photo;
  profileElements.heading.textContent = state.profile.name || "Dein Profil";
  profileElements.sub.textContent = describeProfileSubline();
}

function syncProfileInputs() {
  if (document.activeElement !== profileElements.nameInput) profileElements.nameInput.value = state.profile.name;
  profileElements.birthInput.value = state.profile.birthDate;
  profileElements.birthInput.max = toIsoDate(new Date());
  updateDateDisplay(profileElements.birthDisplay, state.profile.birthDate);
  profileElements.weightValue.textContent = state.profile.bodyWeight === null ? "Eintragen" : formatBodyWeight(state.profile.bodyWeight);
  if (document.activeElement !== profileElements.heightInput) profileElements.heightInput.value = state.profile.height ?? "";
  profileElements.sexSelect.value = state.profile.sex;
  profileElements.experienceSelect.value = state.profile.experience;
  profileElements.activitySelect.value = state.profile.activity;
  syncMeasurementInputs();
  syncProfileGoalInputs();
}

function syncMeasurementInputs() {
  for (const input of profileElements.measurementInputs) {
    const field = input.dataset.measurement;
    input.closest(".form-row").hidden = field === "hip" && state.profile.sex !== "female";
    if (document.activeElement !== input) input.value = state.profile.measurements[field] === null ? "" : formatNumber(state.profile.measurements[field]);
  }
}

function describeGoalNote() {
  const { goal } = state.profile;
  if (goal.type === "lose" || goal.type === "gain") {
    const change = plannedWeeklyChange(state.profile);
    const pace = change === 0 ? "Zielgewicht erreicht, Satzbuch empfiehlt jetzt Kalorien zum Halten." : `Geplant sind ${formatWeeklyChange(change)}.`;
    return `${pace} Das Zielgewicht ist freiwillig und erscheint in der Gewichtsprognose. Empfohlene Tagesziele findest du unter Ernährung.`;
  }
  if (goal.type === "maintain") return "Satzbuch empfiehlt Kalorien, mit denen dein Gewicht stabil bleibt.";
  return "Mit einem Ziel passt Satzbuch Kalorienempfehlung und Prognosen daran an.";
}

function syncProfileGoalInputs() {
  const { goal } = state.profile;
  const hasDirection = goal.type === "lose" || goal.type === "gain";
  profileElements.goalSelect.value = goal.type;
  profileElements.paceSelect.value = goal.pace;
  profileElements.targetWeightInput.closest(".form-row").hidden = !hasDirection;
  profileElements.paceRow.hidden = !hasDirection;
  if (document.activeElement !== profileElements.targetWeightInput) profileElements.targetWeightInput.value = goal.targetWeight === null ? "" : formatNumber(goal.targetWeight);
  profileElements.goalNote.textContent = describeGoalNote();
}

const PROFILE_FIELD_UPDATES = {
  name(input, current) {
    const name = sanitizeName(input.value, NAME_MAX_LENGTH);
    if (!name) return { revert: current.name };
    return { profile: { ...current, name } };
  },
  birthDate(input, current) {
    if (input.value && !isValidBirthDate(input.value)) return { revert: current.birthDate, error: "Wähle ein Datum zwischen 1900 und heute." };
    return { profile: { ...current, birthDate: input.value } };
  },
  height(input, current) {
    const parsed = parseHeight(input.value);
    if (parsed.error) return { revert: current.height ?? "", error: parsed.error };
    return { profile: { ...current, height: parsed.value } };
  },
  sex(input, current) {
    return isOptionValue(SEX_OPTIONS, input.value) ? { profile: { ...current, sex: input.value } } : { revert: current.sex };
  },
  experience(input, current) {
    return isOptionValue(EXPERIENCE_OPTIONS, input.value) ? { profile: { ...current, experience: input.value } } : { revert: current.experience };
  },
  activity(input, current) {
    return isOptionValue(ACTIVITY_OPTIONS, input.value) ? { profile: { ...current, activity: input.value } } : { revert: current.activity };
  },
  measurement(input, current) {
    const field = input.dataset.measurement;
    const parsed = parseMeasurement(field, input.value);
    const currentValue = current.measurements[field];
    if (parsed.error) return { revert: currentValue === null ? "" : formatNumber(currentValue), error: parsed.error };
    return { profile: { ...current, measurements: { ...current.measurements, [field]: parsed.value } } };
  },
  goalType(input, current) {
    if (!isOptionValue(GOAL_OPTIONS, input.value)) return { revert: current.goal.type };
    const keepsTarget = input.value === current.goal.type;
    return { profile: { ...current, goal: { ...current.goal, type: input.value, targetWeight: keepsTarget ? current.goal.targetWeight : null } } };
  },
  targetWeight(input, current) {
    const parsed = parseTargetWeight(input.value, current);
    if (parsed.error) return { revert: current.goal.targetWeight === null ? "" : formatNumber(current.goal.targetWeight), error: parsed.error };
    return { profile: { ...current, goal: { ...current.goal, targetWeight: parsed.value } } };
  },
  pace(input, current) {
    return isOptionValue(PACE_OPTIONS, input.value) ? { profile: { ...current, goal: { ...current.goal, pace: input.value } } } : { revert: current.goal.pace };
  },
};

function updateProfileField(input) {
  const update = PROFILE_FIELD_UPDATES[input.dataset.profileField]?.(input, state.profile);
  if (!update) return;
  if ("revert" in update) {
    input.value = update.revert;
    if (update.error) showToast(update.error);
    return;
  }
  const nextProfile = normalizeProfile(update.profile);
  if (JSON.stringify(nextProfile) === JSON.stringify(state.profile)) {
    syncProfileInputs();
    return;
  }
  saveProfile(nextProfile);
  syncProfileInputs();
  playAnimation(profileElements.avatar, "bounce");
}

export function saveProfile(nextProfile) {
  state.profile = nextProfile;
  updateProfileSummary();
  updateDateDisplay(profileElements.birthDisplay, nextProfile.birthDate);
  saveState();
}

export function handleProfileChange(event) {
  if (event.target.dataset.profileField) updateProfileField(event.target);
}
