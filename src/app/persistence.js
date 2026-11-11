import { LOCAL_STORAGE_KEY } from "../config/limits.js";
import { normalizeAppData } from "../model/app-data.js";

const UNREADABLE_STORAGE_KEY = "satzbuch-v1-unreadable";

export let storageProblem = "";

function preserveUnreadableData(rawText) {
  try {
    localStorage.setItem(UNREADABLE_STORAGE_KEY, rawText);
    return true;
  } catch {
    return false;
  }
}

function readStoredData() {
  let rawText;
  try {
    rawText = localStorage.getItem(LOCAL_STORAGE_KEY);
  } catch {
    storageProblem = "Dieser Browser blockiert das Speichern. Einträge gehen beim Schließen verloren.";
    return {};
  }
  if (!rawText) return {};
  try {
    const parsed = JSON.parse(rawText);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    storageProblem = preserveUnreadableData(rawText)
      ? "Gespeicherte Daten waren beschädigt und wurden beiseitegelegt. Stell bei Bedarf eine Sicherung wieder her."
      : "Gespeicherte Daten waren beschädigt. Stell bei Bedarf eine Sicherung wieder her.";
    return {};
  }
}

export function loadAppData() {
  return normalizeAppData(readStoredData());
}

export function requestPersistentStorage() {
  if (navigator.storage?.persist) navigator.storage.persist();
}
