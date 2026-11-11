import { ICONS } from "../svg/icons.js";
import { parseIsoDate } from "../utils/dates.js";
import { fullDateFormat } from "../utils/format.js";
import { escapeHtml } from "../utils/text.js";

export function renderMenuSelect(id, attributes, options, selectedValue, ariaLabel) {
  const optionTags = options.map((option) => `<option value="${option.value}"${option.value === selectedValue ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
  return `<span class="menu-select-wrap"><select class="menu-select" id="${id}" ${attributes} aria-label="${escapeHtml(ariaLabel)}">${optionTags}</select>${ICONS.updown}</span>`;
}

export function updateDateDisplay(element, isoDate) {
  element.textContent = isoDate ? fullDateFormat.format(parseIsoDate(isoDate)) : "Auswählen";
  element.classList.toggle("is-empty", !isoDate);
}

export function openDatePicker(input) {
  try {
    input.showPicker?.();
  } catch {
    input.focus();
  }
}

export function handleFormKeydown(event) {
  if (event.key === "Enter" && event.target.matches(".form-input, .search-field input")) event.target.blur();
}

export function renderUnitInput({ id, label, attributes, value, unit, inputMode = "decimal", placeholder = "0" }) {
  return `
    <label class="form-row" for="${id}">
      <span class="form-label">${label}</span>
      <span class="input-with-unit">
        <input class="form-input" id="${id}" ${attributes} value="${escapeHtml(value)}" inputmode="${inputMode}" placeholder="${placeholder}" autocomplete="off" enterkeyhint="done">
        <span class="input-unit">${unit}</span>
      </span>
    </label>`;
}
