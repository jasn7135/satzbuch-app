import { sheet } from "../../app/dom.js";
import { render } from "../../app/navigation.js";
import { applyAppData, saveState, state, storedData } from "../../app/state.js";
import { createEmptyData, normalizeAppData } from "../../model/app-data.js";
import { canonicalizeSessions } from "../../model/sessions.js";
import { maybeStartOnboarding } from "../onboarding.js";
import { profileElements } from "./profile-screen.js";
import { renderInfoRow } from "../../ui/components.js";
import { closeSheet, renderSheetHeader, showSheet } from "../../ui/sheet.js";
import { showToast } from "../../ui/toast.js";
import { parseIsoDate, todayIso, toIsoDate, WEEKDAYS } from "../../utils/dates.js";
import { countLabel, csvDateFormat, formatInteger, formatNumber, fullDateFormat } from "../../utils/format.js";
import { escapeHtml } from "../../utils/text.js";

const BACKUP_APP_NAMES = ["Formline", "Satzbuch"];
const EXPORT_FORMAT_VERSION = 1;
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_SESSIONS = 1000;

export function buildJsonExport() {
  const content = {
    app: BACKUP_APP_NAMES[0],
    format: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    profile: state.profile,
    plan: state.plan,
    customExercises: state.customExercises,
    sessions: state.sessions,
    nutrition: state.nutrition,
  };
  return { filename: `formline-sicherung-${toIsoDate(new Date())}.json`, data: JSON.stringify(content, null, 2) };
}

function toCsvField(value) {
  const text = String(value);
  const neutralized = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function buildCsvExport() {
  const header = ["Datum", "Wochentag", "Training", "Übung", "Satz", "Gewicht (kg)", "Wiederholungen"];
  const rows = [...state.sessions].reverse().flatMap((session) =>
    Object.values(session.exercises).flatMap((entry) =>
      entry.sets.map((set, index) => [
        csvDateFormat.format(parseIsoDate(session.date)),
        WEEKDAYS[session.day],
        state.plan.days[session.day].name,
        entry.name,
        index + 1,
        formatNumber(set.kg),
        set.reps,
      ])
    )
  );
  const lines = [header, ...rows].map((row) => row.map(toCsvField).join(";"));
  return { filename: `formline-saetze-${toIsoDate(new Date())}.csv`, data: `\uFEFF${lines.join("\r\n")}` };
}

function describeDownloadError(error) {
  if (error?.name === "AbortError") return null;
  return "Die Datei konnte nicht gespeichert werden.";
}

function exportMimeType(filename) {
  return filename.endsWith(".csv") ? "text/csv" : "application/json";
}

async function saveFileOnDevice({ filename, data }) {
  const file = new File([data], filename, { type: exportMimeType(filename) });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return { status: "saved" };
  }
  const fileUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
  return { status: "saved" };
}

export async function exportFile(buildFile) {
  try {
    const result = await saveFileOnDevice(buildFile());
    if (result.status === "saved") showToast("Datei gesichert");
  } catch (error) {
    const message = describeDownloadError(error);
    if (message) showToast(message);
  }
}

function describePlanSize(plan) {
  const plannedDays = plan.days.filter((day) => day.exercises.length > 0).length;
  return `${countLabel(plannedDays, "Tag", "Tage")}, ${countLabel(countPlannedExercises(plan), "Übung", "Übungen")}`;
}

function countPlannedExercises(plan) {
  return plan.days.reduce((sum, day) => sum + day.exercises.length, 0);
}

function parseBackup(text) {
  let content;
  try {
    content = JSON.parse(text);
  } catch {
    return { error: "Die Datei ist keine gültige Sicherung. Wähle eine JSON-Datei, die Formline erstellt hat." };
  }
  if (!BACKUP_APP_NAMES.includes(content?.app) || content.format !== EXPORT_FORMAT_VERSION || !Array.isArray(content.sessions)) {
    return { error: "Die Datei ist keine Formline-Sicherung. Wähle eine Datei, die du unter „Als Datei sichern“ erstellt hast." };
  }
  if (content.sessions.length > MAX_IMPORT_SESSIONS) {
    return { error: `Die Sicherung enthält mehr als ${formatInteger(MAX_IMPORT_SESSIONS)} Trainings und kann nicht geladen werden.` };
  }
  const exportedAt = new Date(content.exportedAt);
  const data = normalizeAppData(content);
  return {
    backup: {
      ...data,
      exportedAt: Number.isNaN(exportedAt.getTime()) ? null : exportedAt,
      sessions: canonicalizeSessions(data.sessions),
    },
  };
}

export function chooseImportFile() {
  profileElements.importInput.value = "";
  profileElements.importInput.click();
}

export async function handleImportFile() {
  const file = profileElements.importInput.files?.[0];
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES) {
    showToast("Die Datei ist größer als 5 MB und kann nicht geladen werden.");
    return;
  }
  let text;
  try {
    text = await file.text();
  } catch {
    showToast("Die Datei konnte nicht gelesen werden.");
    return;
  }
  const result = parseBackup(text);
  if (result.error) {
    showToast(result.error);
    return;
  }
  state.pendingReplacement = { data: result.backup, successMessage: "Daten wiederhergestellt" };
  renderImportSheet(result.backup);
  showSheet();
}

function renderDataSummary(label, data) {
  return `
    <p class="group-label">${label}</p>
    <div class="group">
      ${renderInfoRow("Name", data.profile.name || "Nicht angegeben")}
      ${renderInfoRow("Trainingsplan", describePlanSize(data.plan))}
      ${renderInfoRow("Eigene Übungen", formatInteger(data.customExercises.length))}
      ${renderInfoRow("Trainings", formatInteger(data.sessions.length))}
      ${renderInfoRow("Ernährung", countLabel(data.nutrition.entries.length, "Eintrag", "Einträge"))}
    </div>`;
}

function renderReplaceSheet({ title, context, summaries, warning, confirmLabel }) {
  sheet.innerHTML = `
    ${renderSheetHeader({ title, closeLabel: "Abbrechen" })}
    <div class="sheet-body">
      <p class="sheet-context">${escapeHtml(context)}</p>
      ${summaries.join("")}
      <p class="sheet-warning">${warning}</p>
      <div class="sheet-actions">
        <button class="button-tinted" type="button" data-action="export-json">Aktuelle Daten zuerst sichern</button>
        <button class="button-filled" id="confirm-replace" type="button" data-action="confirm-replace">${confirmLabel}</button>
        <button class="button-plain" type="button" data-action="close-sheet">Abbrechen</button>
      </div>
    </div>`;
}

function renderImportSheet(backup) {
  const backupDate = backup.exportedAt ? fullDateFormat.format(backup.exportedAt) : "unbekanntem Datum";
  renderReplaceSheet({
    title: "Daten wiederherstellen",
    context: `Sicherung vom ${backupDate}`,
    summaries: [renderDataSummary("In der Sicherung", backup), renderDataSummary("Wird ersetzt", state)],
    warning: "Die Sicherung ersetzt Plan, eigene Übungen, Profil, Trainings und Ernährung. Das lässt sich nicht rückgängig machen.",
    confirmLabel: "Alles überschreiben",
  });
}

export function openResetSheet() {
  state.pendingReplacement = { data: createEmptyData(), successMessage: "Alle Daten gelöscht" };
  renderReplaceSheet({
    title: "Alle Daten löschen",
    context: "Formline startet danach wie beim ersten Öffnen.",
    summaries: [renderDataSummary("Wird gelöscht", state)],
    warning: "Plan, eigene Übungen, Profil mit Gewichtsverlauf, Trainings und Ernährung werden gelöscht. Das lässt sich nicht rückgängig machen.",
    confirmLabel: "Alles löschen",
  });
  showSheet();
}

export function confirmReplacement() {
  const pending = state.pendingReplacement;
  if (!pending) return;
  const previousData = storedData();
  applyAppData(pending.data);
  if (!saveState()) {
    applyAppData(previousData);
    return;
  }
  Object.assign(state, { forecastExerciseId: null, isEditing: false, nutritionDate: todayIso() });
  closeSheet();
  render();
  showToast(pending.successMessage);
  maybeStartOnboarding();
}
