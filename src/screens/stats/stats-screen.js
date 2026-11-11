import { statsView } from "../../app/dom.js";
import { state } from "../../app/state.js";
import { bodyViewer } from "./body-model-card.js";
import { renderBodyPanel, renderBodyStats } from "./body-stats.js";
import { renderNutritionPanel, renderNutritionStats } from "./nutrition-stats.js";
import { renderForecastCard } from "./strength-forecast-card.js";
import { renderTrainingPanel, renderTrainingStats } from "./training-stats.js";
import { playAnimation } from "../../ui/animation.js";
import { elementsById } from "../../ui/components.js";

const STATS_SEGMENTS = [
  { id: "training", label: "Training" },
  { id: "nutrition", label: "Ernährung" },
  { id: "body", label: "Körper" },
];

export const statsElements = {};

function renderSegmentedControl() {
  const buttons = STATS_SEGMENTS.map((segment) => `
    <button class="segment" type="button" role="tab" id="segment-${segment.id}" data-action="select-stats-segment" data-segment="${segment.id}" aria-controls="stats-panel-${segment.id}">${segment.label}</button>`).join("");
  return `<div class="segmented" role="tablist" aria-label="Statistik-Bereich"><span class="segmented-lens" id="segmented-lens" aria-hidden="true"></span>${buttons}</div>`;
}

export function buildStatsView() {
  statsView.innerHTML = `
    <h1 class="large-title">Statistik</h1>
    ${renderSegmentedControl()}
    ${renderTrainingPanel()}
    ${renderNutritionPanel()}
    ${renderBodyPanel()}`;
  Object.assign(statsElements, {
    lens: document.getElementById("segmented-lens"),
    segmentButtons: [...statsView.querySelectorAll(".segment")],
    panels: Object.fromEntries(STATS_SEGMENTS.map((segment) => [segment.id, document.getElementById(`stats-panel-${segment.id}`)])),
  }, elementsById({
    sinceNote: "since-note",
    frequencyCard: "frequency-card",
    volumeCard: "volume-card",
    recordsCard: "records-card",
    forecastCard: "forecast-card",
    forecastNote: "forecast-note",
    forecastExplainer: "forecast-explainer",
    calorieCard: "calorie-card",
    proteinCard: "protein-card",
    balanceCard: "balance-card",
    macroCard: "macro-card",
    weighInCard: "weigh-in-card",
    weightForecastCard: "weight-forecast-card",
    bodyValuesCard: "body-values-card",
    weighInList: "weigh-in-list",
    bodyStage: "body-stage",
    bodyCanvas: "body-canvas",
    bodyStageHint: "body-stage-hint",
    bodyFatPanel: "body-fat-panel",
    weeklyMuscleCard: "weekly-muscle-card",
  }));
}

const STATS_RENDERERS = {
  training: renderTrainingStats,
  nutrition: renderNutritionStats,
  body: renderBodyStats,
};

function updateSegmentedControl() {
  const activeIndex = STATS_SEGMENTS.findIndex((segment) => segment.id === state.statsSegment);
  statsElements.lens.style.setProperty("--index", activeIndex);
  statsElements.segmentButtons.forEach((button) => button.setAttribute("aria-selected", String(button.dataset.segment === state.statsSegment)));
  for (const [segmentId, panel] of Object.entries(statsElements.panels)) panel.hidden = segmentId !== state.statsSegment;
}

export function renderStats({ isEntering = false } = {}) {
  updateSegmentedControl();
  STATS_RENDERERS[state.statsSegment]();
  if (isEntering && state.statsSegment === "body") bodyViewer?.playIntro();
}

export function selectStatsSegment(segmentId) {
  if (!STATS_RENDERERS[segmentId] || segmentId === state.statsSegment) return;
  state.statsSegment = segmentId;
  renderStats({ isEntering: true });
  playAnimation(statsElements.lens, "lens-moving");
  playAnimation(statsElements.panels[segmentId], "fade-in");
}

export function handleStatsChange(event) {
  if (!event.target.matches("[data-forecast-select]")) return;
  state.forecastExerciseId = event.target.value;
  renderForecastCard();
  playAnimation(document.getElementById("forecast-body"), "fade-in");
}
