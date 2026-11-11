import { state } from "../../app/state.js";
import { BODY_FAT_CATEGORIES, bodyFatCategoryIndex, estimateBodyFat, fatFreeMassIndex, leanBodyMass } from "../../model/body-metrics.js";
import { formatInteger, formatOneDecimal } from "../../utils/format.js";
import { escapeHtml } from "../../utils/text.js";

function describeBodyFatMethod(bodyFat) {
  return bodyFat.method === "navy" ? "Navy-Methode, aus Körpermaßen" : "Grobe Schätzung aus BMI und Alter";
}

function describeCategoryRange(categories, index) {
  const category = categories[index];
  return index === categories.length - 1 ? `ab ${category.min} %` : `${category.min}–${category.max - 1} %`;
}

function renderBodyFatGauge(percent, categories, activeIndex) {
  const low = categories[0].min;
  const high = categories.at(-1).max;
  const position = ((Math.min(high, Math.max(low, percent)) - low) / (high - low)) * 100;
  const segments = categories.map((category, index) => `<span class="fat-gauge-segment${index === activeIndex ? " is-active" : ""}" style="flex-grow: ${category.max - category.min}"></span>`).join("");
  return `
    <div class="fat-gauge" aria-hidden="true">
      <div class="fat-gauge-track">${segments}</div>
      <span class="fat-gauge-marker" style="left: ${position.toFixed(1)}%"></span>
    </div>
    <div class="fat-gauge-scale" aria-hidden="true"><span>${low} %</span><span>${high} %</span></div>`;
}

function renderBodyFact(label, value) {
  return `<div class="body-fact"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function renderBodyFatFacts(profile, bodyFat) {
  const leanMass = leanBodyMass(profile, bodyFat);
  if (leanMass === null) return "";
  const facts = [
    renderBodyFact("Fettmasse", `${formatOneDecimal(profile.bodyWeight - leanMass)} kg`),
    renderBodyFact("Fettfreie Masse", `${formatOneDecimal(leanMass)} kg`),
  ];
  if (bodyFat.method === "navy") facts.push(renderBodyFact("FFMI", formatOneDecimal(fatFreeMassIndex(profile, bodyFat))));
  return `<dl class="body-facts">${facts.join("")}</dl>`;
}

function missingBodyFatInputs(profile) {
  return [
    profile.bodyWeight === null ? "Gewicht" : "",
    profile.height === null ? "Größe" : "",
    profile.birthDate ? "" : "Geburtsdatum",
    profile.sex ? "" : "Geschlecht",
  ].filter(Boolean);
}

function renderMissingBodyFat(profile) {
  const missing = missingBodyFatInputs(profile);
  const reason = missing.length ? `Dafür fehlen noch: ${missing.join(", ")}.` : "Mit deinen Angaben ist keine verlässliche Schätzung möglich.";
  return `
    <p class="body-fat-label">Körperfett</p>
    <p class="body-fat-title">Noch nicht geschätzt</p>
    <p class="body-fat-text">${escapeHtml(reason)}</p>
    <button class="button-tinted" type="button" data-action="open-profile">Im Profil ergänzen</button>`;
}

export function renderBodyFatPanel() {
  const profile = state.profile;
  const bodyFat = estimateBodyFat(profile);
  if (!bodyFat) return renderMissingBodyFat(profile);
  const percent = Math.round(bodyFat.percent);
  const categories = BODY_FAT_CATEGORIES[profile.sex];
  const index = bodyFatCategoryIndex(percent, categories);
  return `
    <div class="body-fat-head">
      <div>
        <p class="body-fat-label">Körperfett</p>
        <p class="body-fat-value">${formatInteger(percent)}<span class="unit"> %</span></p>
      </div>
      <div class="body-fat-category">
        <p class="body-fat-category-name">${escapeHtml(categories[index].label)}</p>
        <p class="body-fat-label">${escapeHtml(describeCategoryRange(categories, index))}</p>
      </div>
    </div>
    ${renderBodyFatGauge(percent, categories, index)}
    ${renderBodyFatFacts(profile, bodyFat)}
    <p class="body-fat-method">${escapeHtml(describeBodyFatMethod(bodyFat))}. Einteilung nach ACE-Richtwerten.</p>`;
}
