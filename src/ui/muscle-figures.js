import { FIGURES, HEAD, MIRROR_TRANSFORM, SILHOUETTE_HALF, VIEW_HEIGHT, VIEW_WIDTH } from "../svg/muscle-regions.js";

const VIEW_LABELS = { front: "Vorne", back: "Hinten" };

function musclesShownIn(view) {
  return new Set(FIGURES[view].map((region) => region.muscle).filter(Boolean));
}

const MUSCLES_BY_VIEW = { front: musclesShownIn("front"), back: musclesShownIn("back") };

function regionClass(muscle, emphasis) {
  if (!muscle) return "mm-region";
  const level = emphasis.get(muscle);
  return level ? `mm-region is-${level}` : "mm-region";
}

function renderRegion(region, emphasis) {
  const className = regionClass(region.muscle, emphasis);
  return `<path class="${className}" d="${region.d}"/><path class="${className}" d="${region.d}" transform="${MIRROR_TRANSFORM}"/>`;
}

function renderFigure(view, emphasis) {
  const regions = FIGURES[view].map((region) => renderRegion(region, emphasis)).join("");
  return `
    <svg class="mm-figure" viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}" aria-hidden="true" focusable="false">
      <g class="mm-body">${HEAD}<path d="${SILHOUETTE_HALF}"/><path d="${SILHOUETTE_HALF}" transform="${MIRROR_TRANSFORM}"/></g>
      <g class="mm-regions">${regions}</g>
    </svg>`;
}

function emphasisFor({ primary = [], secondary = [] }) {
  const emphasis = new Map();
  for (const muscle of secondary) emphasis.set(muscle, "secondary");
  for (const muscle of primary) emphasis.set(muscle, "primary");
  return emphasis;
}

function preferredView(primary) {
  const frontCount = primary.filter((muscle) => MUSCLES_BY_VIEW.front.has(muscle)).length;
  const backCount = primary.filter((muscle) => MUSCLES_BY_VIEW.back.has(muscle)).length;
  return backCount > frontCount ? "back" : "front";
}

function renderFigurePair(emphasis) {
  const figures = ["front", "back"].map((view) => `
    <figure class="mm-view">
      ${renderFigure(view, emphasis)}
      <figcaption class="mm-caption">${VIEW_LABELS[view]}</figcaption>
    </figure>`).join("");
  return `<div class="mm-pair">${figures}</div>`;
}

/** Front and back figures side by side, primary muscles strong, secondary muscles light. */
export function renderMuscleFigures({ primary = [], secondary = [] }) {
  return renderFigurePair(emphasisFor({ primary, secondary }));
}

/** The single view that shows most of the primary muscles, for list thumbnails. */
export function renderMuscleThumbnail({ primary = [], secondary = [] }) {
  return renderFigure(preferredView(primary), emphasisFor({ primary, secondary }));
}

/** Front and back figures with a level per muscle ("low", "mid" or "high"). */
export function renderMuscleLevels(levels) {
  return renderFigurePair(new Map(Object.entries(levels)));
}
