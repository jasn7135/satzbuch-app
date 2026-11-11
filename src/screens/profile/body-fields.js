import { ACTIVITY_OPTIONS, EXPERIENCE_OPTIONS, SEX_OPTIONS } from "../../config/options.js";
import { renderMenuSelect, renderUnitInput } from "../../ui/forms.js";
import { formatNumber } from "../../utils/format.js";

export function renderWeightInput(prefix, attributeName, bodyWeight) {
  return renderUnitInput({ id: `${prefix}-weight`, label: "Körpergewicht", attributes: `${attributeName}="bodyWeight"`, value: bodyWeight === null ? "" : formatNumber(bodyWeight), unit: "kg" });
}

export function renderBodyFields(prefix, attributeName, values) {
  return `
    <label class="form-row" for="${prefix}-height">
      <span class="form-label">Größe</span>
      <span class="input-with-unit">
        <input class="form-input" id="${prefix}-height" ${attributeName}="height" value="${values.height ?? ""}" inputmode="numeric" placeholder="0" autocomplete="off" enterkeyhint="done">
        <span class="input-unit">cm</span>
      </span>
    </label>
    <div class="form-row">
      <span class="form-label">Geschlecht</span>
      ${renderMenuSelect(`${prefix}-sex`, `${attributeName}="sex"`, SEX_OPTIONS, values.sex, "Geschlecht")}
    </div>
    <div class="form-row">
      <span class="form-label">Trainingserfahrung</span>
      ${renderMenuSelect(`${prefix}-experience`, `${attributeName}="experience"`, EXPERIENCE_OPTIONS, values.experience, "Trainingserfahrung")}
    </div>
    <div class="form-row">
      <span class="form-label">Alltag</span>
      ${renderMenuSelect(`${prefix}-activity`, `${attributeName}="activity"`, ACTIVITY_OPTIONS, values.activity, "Alltagsaktivität ohne Training")}
    </div>`;
}
