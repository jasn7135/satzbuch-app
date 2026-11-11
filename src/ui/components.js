import { animateNumber } from "./animation.js";
import { formatInteger } from "../utils/format.js";
import { escapeHtml } from "../utils/text.js";

const MINI_RING_RADIUS = 27;

export function renderMiniRing({ fraction, label, ariaLabel }) {
  const radius = MINI_RING_RADIUS;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, fraction));
  const valueRing = clamped === 0 ? "" : `<circle class="ring-value" cx="32" cy="32" r="${radius}" stroke-dasharray="${circumference.toFixed(2)}" style="stroke-dashoffset: ${(circumference * (1 - clamped)).toFixed(2)}; --ring-circumference: ${circumference.toFixed(2)}"/>`;
  return `
    <div class="mini-ring" role="img" aria-label="${escapeHtml(ariaLabel)}">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="ring-track" cx="32" cy="32" r="${radius}"/>
        ${valueRing}
      </svg>
      <span class="mini-ring-label" aria-hidden="true">${escapeHtml(label)}</span>
    </div>`;
}

export function renderProgressBar(fraction) {
  const clamped = Math.min(1, Math.max(0, fraction));
  return `<span class="progress-bar" aria-hidden="true"><span class="progress-bar-fill" style="width: ${(clamped * 100).toFixed(1)}%"></span></span>`;
}

export function renderInfoRow(label, value) {
  return `<div class="form-row"><span class="form-label">${label}</span><span class="info-value">${escapeHtml(value)}</span></div>`;
}

export function renderCardMessage(text) {
  return `<p class="card-message">${escapeHtml(text)}</p>`;
}

const renderedCardHtml = new WeakMap();

export function setCardHtml(card, html) {
  if (renderedCardHtml.get(card) === html) return;
  renderedCardHtml.set(card, html);
  card.innerHTML = html;
}

export function renderTileGrid(tiles) {
  const items = tiles.map((tile) => `
    <div class="group stat-tile">
      <p class="stat-label">${tile.label}</p>
      <p class="stat-value" id="${tile.id}">–</p>
    </div>`).join("");
  return `<div class="stat-grid">${items}</div>`;
}

export function setTileValue(id, value, format = formatInteger) {
  const element = document.getElementById(id);
  if (value === null) {
    element.dataset.value = "0";
    element.textContent = "–";
    return;
  }
  animateNumber(element, value, format);
}

export function elementsById(ids) {
  return Object.fromEntries(Object.entries(ids).map(([key, id]) => [key, document.getElementById(id)]));
}

export function renderCardHeading(headline, caption) {
  return `
    <div class="card-heading">
      <p class="chart-headline">${escapeHtml(headline)}</p>
      <p class="chart-caption">${escapeHtml(caption)}</p>
    </div>`;
}
