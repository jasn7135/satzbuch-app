import { describeMuscles } from "../model/muscles.js";
import { renderCardMessage } from "./components.js";
import { renderMuscleFigures } from "./muscle-figures.js";
import { escapeHtml } from "../utils/text.js";

export const MUSCLE_LEVEL_LABELS = { primary: "Hauptsächlich", secondary: "Unterstützend" };

function describeMuscleAria({ primary, secondary }) {
  const parts = [];
  if (primary.length) parts.push(`Hauptsächlich beansprucht: ${describeMuscles(primary)}.`);
  if (secondary.length) parts.push(`Unterstützend: ${describeMuscles(secondary)}.`);
  return parts.length ? `Muskelkarte. ${parts.join(" ")}` : "Muskelkarte ohne markierte Muskeln.";
}

function renderMuscleLegend(info) {
  const rows = ["primary", "secondary"]
    .filter((level) => info[level].length > 0)
    .map((level) => `
      <li class="muscle-legend-row">
        <span class="muscle-swatch is-${level}" aria-hidden="true"></span>
        <span class="muscle-legend-label">${MUSCLE_LEVEL_LABELS[level]}</span>
        <span class="muscle-legend-value">${escapeHtml(describeMuscles(info[level]))}</span>
      </li>`).join("");
  return rows ? `<ul class="muscle-legend">${rows}</ul>` : renderCardMessage("Noch keine Muskeln markiert.");
}

export function renderMuscleCard(info) {
  return `
    <div class="muscle-figures" role="img" aria-label="${escapeHtml(describeMuscleAria(info))}">${renderMuscleFigures(info)}</div>
    ${renderMuscleLegend(info)}`;
}

export function renderMuscleSection(info) {
  if (!info) return "";
  return `<h3 class="section-title">Muskeln</h3><section class="group muscle-section">${renderMuscleCard(info)}</section>`;
}
