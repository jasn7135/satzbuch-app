import { sheet } from "../app/dom.js";
import { render } from "../app/navigation.js";
import { state } from "../app/state.js";
import { parseBodyWeight } from "../model/profile-input.js";
import { normalizeProfile, withWeightEntry } from "../model/profile.js";
import { daysSinceLastWeighIn, isWeighInDue, lastWeighIn, nextWeighInDate, WEIGH_IN_HISTORY_DAYS, WEIGH_IN_LIST_LIMIT } from "../model/weight.js";
import { renderTodayCardContent } from "./home.js";
import { saveProfile } from "./profile/profile-screen.js";
import { ICONS } from "../svg/icons.js";
import { renderCardMessage } from "../ui/components.js";
import { updateDateDisplay } from "../ui/forms.js";
import { closeSheet, renderSheetHeader, showSheet } from "../ui/sheet.js";
import { showToast } from "../ui/toast.js";
import { addDays, isIsoDate, parseIsoDate, todayIso, toIsoDate } from "../utils/dates.js";
import { describeDaysAgo, formatNumber, formatShortDate, formatSigned } from "../utils/format.js";
import { escapeHtml } from "../utils/text.js";

function describeWeighInStatus() {
  const last = lastWeighIn();
  if (!last) return { title: "Noch kein Eintrag", text: "Einmal pro Woche wiegen reicht für Trend und Prognose." };
  const lastText = `Zuletzt ${formatNumber(last.kg)} kg, ${describeDaysAgo(daysSinceLastWeighIn())}`;
  if (isWeighInDue()) return { title: "Wiegen fällig", text: lastText };
  return { title: `Nächstes Wiegen ${formatShortDate(nextWeighInDate())}`, text: lastText };
}

export function renderWeighInCard() {
  const status = describeWeighInStatus();
  return renderTodayCardContent({
    label: "Wöchentliches Wiegen",
    title: status.title,
    text: status.text,
    action: "open-weigh-in",
    actionLabel: "Gewicht eintragen",
    buttonClass: isWeighInDue() ? "button-filled" : "button-tinted",
  });
}

function earliestWeighInDate() {
  return toIsoDate(addDays(parseIsoDate(todayIso()), -WEIGH_IN_HISTORY_DAYS));
}

function renderWeighInSheet(entry) {
  const kg = entry?.kg ?? lastWeighIn()?.kg ?? state.profile.bodyWeight;
  const date = entry?.date ?? todayIso();
  const deleteButton = entry ? '<button class="button-destructive" id="delete-weigh-in" type="button" data-action="delete-weigh-in">Eintrag löschen</button>' : "";
  sheet.innerHTML = `
    ${renderSheetHeader({ title: entry ? "Wiegen bearbeiten" : "Gewicht eintragen", confirmAction: "save-weigh-in", confirmLabel: "Sichern" })}
    <div class="sheet-body">
      <div class="group">
        <label class="form-row" for="weigh-in-kg">
          <span class="form-label">Gewicht</span>
          <span class="input-with-unit">
            <input class="form-input" id="weigh-in-kg" value="${kg === null ? "" : formatNumber(kg)}" inputmode="decimal" placeholder="0" autocomplete="off" enterkeyhint="done">
            <span class="input-unit">kg</span>
          </span>
        </label>
        <div class="form-row">
          <span class="form-label" id="weigh-in-date-label">Datum</span>
          <span class="date-display" id="weigh-in-date-display" aria-hidden="true"></span>
          <input class="date-input" id="weigh-in-date" type="date" value="${escapeHtml(date)}" min="${earliestWeighInDate()}" max="${todayIso()}" aria-labelledby="weigh-in-date-label">
        </div>
      </div>
      <p class="note">Am genauesten: einmal pro Woche am selben Tag, morgens nach dem Toilettengang und vor dem Frühstück. Schwankungen von bis zu einem Kilo durch Wasser sind normal.</p>
      <div class="sheet-actions">${deleteButton}</div>
    </div>`;
  updateDateDisplay(document.getElementById("weigh-in-date-display"), date);
}

export function openWeighIn(date = null) {
  const entry = date ? state.profile.weightLog.find((candidate) => candidate.date === date) ?? null : null;
  state.weighInDraft = { originalDate: entry?.date ?? null, isConfirmingDelete: false };
  renderWeighInSheet(entry);
  showSheet();
}

function readWeighInForm() {
  const kgText = document.getElementById("weigh-in-kg").value;
  const parsed = parseBodyWeight(kgText);
  if (parsed.error) return { error: parsed.error };
  if (parsed.value === null) return { error: "Trag dein Gewicht ein." };
  const date = document.getElementById("weigh-in-date").value;
  if (!isIsoDate(date) || date > todayIso() || date < earliestWeighInDate()) return { error: "Wähle ein Datum aus dem letzten Jahr, nicht in der Zukunft." };
  return { kg: parsed.value, date };
}

function saveWeightLog(weightLog) {
  saveProfile(normalizeProfile({ ...state.profile, weightLog, bodyWeight: weightLog.at(-1)?.kg ?? null }));
}

function renderAfterWeighIn() {
  closeSheet();
  render();
}

export function saveWeighIn() {
  const draft = state.weighInDraft;
  if (!draft) return;
  const form = readWeighInForm();
  if (form.error) {
    showToast(form.error);
    return;
  }
  const remaining = state.profile.weightLog.filter((entry) => entry.date !== draft.originalDate);
  saveWeightLog(withWeightEntry(remaining, form.date, form.kg));
  renderAfterWeighIn();
  showToast(`${formatNumber(form.kg)} kg gespeichert. Nächstes Wiegen: ${formatShortDate(nextWeighInDate())}`);
}

export function deleteWeighIn(button) {
  const draft = state.weighInDraft;
  if (!draft?.originalDate) return;
  if (!draft.isConfirmingDelete) {
    draft.isConfirmingDelete = true;
    button.textContent = "Zum Löschen erneut tippen";
    return;
  }
  saveWeightLog(state.profile.weightLog.filter((entry) => entry.date !== draft.originalDate));
  renderAfterWeighIn();
  showToast("Eintrag gelöscht");
}

export function handleWeighInChange(event) {
  if (event.target.id === "weigh-in-date") updateDateDisplay(document.getElementById("weigh-in-date-display"), event.target.value);
}

function describeWeightDifference(entry, previous) {
  if (!previous) return "Erster Eintrag";
  const difference = Math.round((entry.kg - previous.kg) * 10) / 10;
  return difference === 0 ? "unverändert" : `${formatSigned(difference, "kg")} zum ${formatShortDate(previous.date)}`;
}

export function renderWeighInList() {
  const log = state.profile.weightLog;
  if (log.length === 0) return renderCardMessage("Noch keine Einträge.");
  return log.map((entry, index) => ({ entry, previous: log[index - 1] }))
    .slice(-WEIGH_IN_LIST_LIMIT)
    .reverse()
    .map(({ entry, previous }) => `
      <button class="entry-row" type="button" data-action="edit-weigh-in" data-date="${escapeHtml(entry.date)}">
        <span class="entry-text">
          <span class="entry-title">${escapeHtml(formatNumber(entry.kg))} kg</span>
          <span class="entry-sub">${escapeHtml(`${formatShortDate(entry.date)} · ${describeWeightDifference(entry, previous)}`)}</span>
        </span>
        <span class="chevron" aria-hidden="true">${ICONS.chevron}</span>
      </button>`).join("");
}
