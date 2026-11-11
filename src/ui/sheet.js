import { appShell, sheet, sheetLayer } from "../app/dom.js";
import { state } from "../app/state.js";
import { ICONS } from "../svg/icons.js";
import { dismissToast } from "./toast.js";
import { escapeHtml } from "../utils/text.js";

const SHEET_DISMISS_DISTANCE = 140;
const SHEET_DISMISS_VELOCITY = 0.6;

let sheetDrag = null;

export function showSheet() {
  dismissToast();
  sheetLayer.inert = false;
  sheetLayer.classList.add("is-open");
  appShell.classList.add("is-behind-sheet");
  appShell.inert = true;
}

export function closeSheet() {
  dismissToast();
  sheetLayer.classList.remove("is-open");
  sheetLayer.inert = true;
  appShell.classList.remove("is-behind-sheet");
  appShell.inert = false;
  state.openExerciseId = null;
  state.nutritionDraft = null;
  state.weighInDraft = null;
  state.pendingReplacement = null;
  state.picker = null;
}

export function startSheetDrag(event) {
  if (!event.target.closest("[data-drag-handle]") || event.target.closest("button")) return;
  sheetDrag = { startY: event.clientY, startTime: performance.now(), offset: 0 };
  sheet.classList.add("is-dragging");
  sheet.setPointerCapture(event.pointerId);
}

export function moveSheetDrag(event) {
  if (!sheetDrag) return;
  const distance = event.clientY - sheetDrag.startY;
  sheetDrag.offset = distance > 0 ? distance : distance / 6;
  sheet.style.transform = `translateY(${sheetDrag.offset}px)`;
}

export function endSheetDrag() {
  if (!sheetDrag) return;
  const velocity = sheetDrag.offset / Math.max(1, performance.now() - sheetDrag.startTime);
  const isFarEnough = sheetDrag.offset > SHEET_DISMISS_DISTANCE;
  const isQuickFlick = velocity > SHEET_DISMISS_VELOCITY && sheetDrag.offset > 30;
  const shouldClose = isFarEnough || isQuickFlick;
  sheetDrag = null;
  sheet.classList.remove("is-dragging");
  sheet.style.transform = "";
  if (shouldClose) closeSheet();
}

export function renderSheetHeader({ title, closeLabel = "Schließen", confirmAction = "", confirmLabel = "", isConfirmDisabled = false, backAction = "" }) {
  const confirmButton = confirmAction
    ? `<button class="glass-circle is-accent" id="sheet-confirm" type="button" data-action="${confirmAction}" aria-label="${confirmLabel}"${isConfirmDisabled ? " disabled" : ""}>${ICONS.check}</button>`
    : '<span aria-hidden="true"></span>';
  const leadingButton = backAction
    ? `<button class="glass-circle" type="button" data-action="${backAction}" aria-label="Zurück">${ICONS.chevronLeft}</button>`
    : `<button class="glass-circle" type="button" data-action="close-sheet" aria-label="${closeLabel}">${ICONS.close}</button>`;
  return `
    <div class="sheet-handle" data-drag-handle>
      <span class="grabber" aria-hidden="true"></span>
      <header class="sheet-header">
        ${leadingButton}
        <h2 class="sheet-title" id="sheet-title">${escapeHtml(title)}</h2>
        ${confirmButton}
      </header>
    </div>`;
}
