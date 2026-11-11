import { state } from "../../app/state.js";
import { describeBmi, estimateBodyFat, healthyWeightRange, waistToHeight } from "../../model/body-metrics.js";
import { expenditureEstimate, restingCalories } from "../../model/energy.js";
import { weightTrend } from "../../model/weight.js";
import { renderBodyFatPanel } from "./body-fat-panel.js";
import { describeBodyModel, ensureBodyViewer } from "./body-model-card.js";
import { statsElements } from "./stats-screen.js";
import { renderWeightForecastCard } from "./weight-forecast-card.js";
import { renderWeighInCard, renderWeighInList } from "../weigh-in.js";
import { ICONS } from "../../svg/icons.js";
import { renderInfoRow, renderTileGrid, setCardHtml, setTileValue } from "../../ui/components.js";
import { formatInteger, formatNumber, formatOneDecimal, formatSignedNumber } from "../../utils/format.js";
import { roundToStep } from "../../utils/numbers.js";
import { escapeHtml } from "../../utils/text.js";

const BODY_TILES = [
  { id: "stat-body-weight", label: "Gewicht (kg)" },
  { id: "stat-weight-trend", label: "Trend pro Woche (kg)" },
];

const BODY_EXPLANATION = [
  "Gewichtsprognose: Trend aus deinen Einträgen der letzten 8 Wochen. Sie flacht mit der Zeit ab, weil ein leichterer Körper weniger und ein schwererer mehr Energie verbraucht. Der Bereich zeigt, wo dein Gewicht mit etwa 80 % Wahrscheinlichkeit liegt.",
  "BMI: Gewicht geteilt durch Größe zum Quadrat, eingeordnet nach WHO. Bei viel Muskelmasse nur bedingt aussagekräftig.",
  "Körperfett: Mit Taille und Hals (Frauen zusätzlich Hüfte) nach der Navy-Methode, etwa ±3 bis 4 Prozentpunkte genau. Ohne Maße eine grobe Schätzung aus BMI, Alter und Geschlecht (Deurenberg), die bei Trainierten oft zu hoch liegt.",
  "Grundumsatz nach Mifflin-St Jeor. Gesamtumsatz: Grundumsatz mal Alltagsfaktor plus deine Trainings. Sobald du einige Wochen wiegst und isst, was du einträgst, fließen deine echten Werte mit ein.",
].join(" ");

export function renderBodyPanel() {
  return `
    <div class="stats-panel" id="stats-panel-body" role="tabpanel" aria-labelledby="segment-body" hidden>
      <section class="group body-model-card" aria-label="Körpermodell">
        <div class="body-stage" id="body-stage">
          <canvas class="body-canvas" id="body-canvas" tabindex="0" role="img"></canvas>
          <p class="body-stage-hint" id="body-stage-hint" aria-hidden="true">Ziehen zum Drehen</p>
        </div>
        <div class="body-fat-panel" id="body-fat-panel"></div>
      </section>
      ${renderTileGrid(BODY_TILES)}
      <section class="group today-card" id="weigh-in-card" aria-label="Wöchentliches Wiegen"></section>
      <h2 class="section-title">Verlauf und Prognose</h2>
      <section class="group" id="weight-forecast-card"></section>
      <h2 class="section-title">Körperwerte</h2>
      <section class="group" id="body-values-card"></section>
      <h2 class="section-title">Gewichtseinträge</h2>
      <section class="group" id="weigh-in-list"></section>
      <details class="explainer">
        <summary>${ICONS.chevron}So wird gerechnet</summary>
        <p class="note">${escapeHtml(BODY_EXPLANATION)}</p>
      </details>
    </div>`;
}

function bodyValueRows(profile) {
  const rows = [];
  const bmi = describeBmi(profile);
  if (bmi) rows.push(["BMI", `${formatOneDecimal(bmi.value)} · ${bmi.category}`]);
  const range = healthyWeightRange(profile);
  if (range) rows.push(["Normalgewicht", `${formatInteger(range.low)}–${formatInteger(range.high)} kg`]);
  const waistRatio = waistToHeight(profile);
  if (waistRatio) rows.push(["Taille zu Größe", `${formatNumber(Math.round(waistRatio.value * 100) / 100)} · ${waistRatio.category}`]);
  const resting = restingCalories(profile);
  if (resting !== null) rows.push(["Grundumsatz", `ca. ${formatInteger(roundToStep(resting, 10))} kcal`]);
  const expenditure = expenditureEstimate(profile);
  if (expenditure) rows.push(["Gesamtumsatz", `ca. ${formatInteger(roundToStep(expenditure.value, 10))} kcal`]);
  return rows;
}

function missingBodyInputs(profile) {
  return [
    profile.bodyWeight === null ? "Gewicht" : "",
    profile.height === null ? "Größe" : "",
    profile.birthDate ? "" : "Geburtsdatum",
    profile.sex ? "" : "Geschlecht",
    profile.measurements.waist === null ? "Taille und Hals" : "",
  ].filter(Boolean);
}

function renderBodyValuesCard() {
  const rows = bodyValueRows(state.profile).map(([label, value]) => renderInfoRow(label, value)).join("");
  const missing = missingBodyInputs(state.profile);
  const hint = missing.length === 0 ? "" : `
    <div class="forecast-hint${rows ? " is-separated" : ""}">
      <p>Für alle Werte fehlen noch: ${escapeHtml(missing.join(", "))}.</p>
      <button class="button-tinted" type="button" data-action="open-profile">Im Profil ergänzen</button>
    </div>`;
  return `${rows}${hint}`;
}

export function renderBodyStats() {
  const profile = state.profile;
  const trend = weightTrend();
  const bodyFat = estimateBodyFat(profile);
  ensureBodyViewer()?.setBody({ bodyFat: bodyFat?.percent ?? null, sex: profile.sex });
  statsElements.bodyCanvas.setAttribute("aria-label", describeBodyModel(bodyFat));
  setCardHtml(statsElements.bodyFatPanel, renderBodyFatPanel());
  setTileValue("stat-body-weight", profile.bodyWeight, formatOneDecimal);
  setTileValue("stat-weight-trend", trend ? trend.weeklyChange : null, formatSignedNumber);
  setCardHtml(statsElements.weighInCard, renderWeighInCard());
  setCardHtml(statsElements.weightForecastCard, renderWeightForecastCard());
  setCardHtml(statsElements.bodyValuesCard, renderBodyValuesCard());
  setCardHtml(statsElements.weighInList, renderWeighInList());
}
