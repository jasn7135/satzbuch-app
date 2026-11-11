import { state } from "../../app/state.js";
import { classifyLift, FORECAST_HISTORY_WEEKS, forecastCandidates, forecastStrength, MIN_FORECAST_POINTS, missingForecastInputs, NEAR_CEILING_SHARE } from "../../model/strength-forecast.js";
import { repMaxFactor } from "../../model/strength.js";
import { statsElements } from "./stats-screen.js";
import { renderProjectionChart } from "../../ui/charts.js";
import { renderCardMessage, renderInfoRow } from "../../ui/components.js";
import { renderMenuSelect } from "../../ui/forms.js";
import { parseIsoDate } from "../../utils/dates.js";
import { chartDateFormat, countLabel, formatInteger, formatKilograms, formatNumber, formatSigned } from "../../utils/format.js";
import { roundToStep } from "../../utils/numbers.js";
import { pointsWithin } from "../../utils/statistics.js";
import { escapeHtml } from "../../utils/text.js";

function renderForecastChart(points, forecast) {
  const lastDate = parseIsoDate(points.at(-1).date);
  const end = forecast.projection.at(-1);
  return renderProjectionChart({
    history: pointsWithin(points, lastDate, FORECAST_HISTORY_WEEKS * 7),
    projection: forecast.projection,
    reference: forecast.ceiling ? { value: forecast.ceiling, label: "Erfahrenes Niveau" } : null,
    formatTick: (tick) => formatNumber(Math.round(tick)),
    formatValue: formatKilograms,
    ariaLabel: `Verlauf und Prognose, in 12 Wochen etwa ${formatKilograms(end.value)}`,
    headline: `In 12 Wochen etwa ${formatKilograms(end.value)}`,
    caption: "Geschätztes Maximum für eine Wiederholung",
    historyReadout: (point) => `${chartDateFormat.format(parseIsoDate(point.date))}: ca. ${formatKilograms(point.value)}`,
  });
}

function renderForecastDetails(forecast, lift) {
  const end = forecast.projection.at(-1);
  const practicalWeight = roundToStep(end.value / repMaxFactor(forecast.typicalReps), 2.5);
  const rate = Math.round(forecast.observedRate * 10) / 10;
  const rows = [
    ["Heute geschätzt", formatKilograms(forecast.current)],
    ["Tempo zuletzt", rate === 0 ? "kein Zuwachs" : `${formatSigned(rate, "kg")} pro Woche`],
    ["In 12 Wochen", `${formatKilograms(end.value)} (${formatInteger(end.low)}–${formatInteger(end.high)} kg)`],
    ["Entspricht etwa", `${formatNumber(practicalWeight)} kg × ${forecast.typicalReps}`],
  ];
  if (lift) rows.push(["Erkannt als", lift.label]);
  if (forecast.ceiling) rows.push(["Erfahrenes Niveau", `ca. ${formatKilograms(forecast.ceiling)}`]);
  return `<div class="forecast-details">${rows.map(([label, value]) => renderInfoRow(label, value)).join("")}</div>`;
}

function renderMissingInputsHint() {
  const missing = missingForecastInputs();
  if (missing.length === 0) return "";
  return `
    <div class="forecast-hint">
      <p>Für eine genauere Einordnung fehlen noch: ${escapeHtml(missing.join(", "))}.</p>
      <button class="button-tinted" type="button" data-action="open-profile">Im Profil ergänzen</button>
    </div>`;
}

function describeForecastNotes(forecast, lift) {
  if (!forecast.isReady) return "";
  const notes = ["Die Prognose schätzt dein Maximum aus Gewicht und Wiederholungen (Mittel aus Epley- und Brzycki-Formel, nur Sätze bis 12 Wiederholungen) und geht davon aus, dass Fortschritt mit der Zeit langsamer wird."];
  if (forecast.observedRate <= 0) notes.push("Zuletzt gab es keinen Zuwachs, deshalb rechnet sie mit gleichbleibendem Niveau.");
  if (forecast.isCapped) notes.push("Dein bisheriges Tempo lässt sich erfahrungsgemäß nicht dauerhaft halten, deshalb rechnet sie vorsichtiger.");
  if (forecast.ceiling && forecast.current >= forecast.ceiling * NEAR_CEILING_SHARE) notes.push("Du bist nah am Niveau erfahrener Trainierender mit deinem Körpergewicht, ab hier geht es deutlich langsamer.");
  if (!lift) notes.push("Für diese Übung gibt es keinen Vergleichswert, sie nutzt nur deinen eigenen Verlauf.");
  if (forecast.ceiling) notes.push("Das erfahrene Niveau ist ein grober Richtwert aus gängigen Kraftstandards für natürlich Trainierende, angepasst an Körpergewicht, Geschlecht und Alter.");
  notes.push("Schlaf, Ernährung, Pausen und Verletzungen kann sie nicht vorhersehen.");
  return notes.join(" ");
}

function showForecastNotes(notes) {
  statsElements.forecastNote.textContent = notes;
  statsElements.forecastExplainer.hidden = !notes;
}

export function renderForecastCard() {
  const candidates = forecastCandidates();
  if (candidates.length === 0) {
    statsElements.forecastCard.innerHTML = `${renderCardMessage("Sobald du Übungen mit Gewicht einträgst, siehst du hier, wie sie sich realistisch weiterentwickeln können.")}${renderMissingInputsHint()}`;
    showForecastNotes("");
    return;
  }
  const selected = candidates.find((candidate) => candidate.id === state.forecastExerciseId) ?? candidates[0];
  state.forecastExerciseId = selected.id;
  const lift = classifyLift(selected.name);
  const forecast = forecastStrength(selected.points, lift);
  const options = candidates.map((candidate) => ({ value: candidate.id, label: candidate.name }));
  const pending = `Für eine Prognose brauchst du mindestens ${MIN_FORECAST_POINTS} Trainings dieser Übung über drei Wochen. Bisher: ${countLabel(selected.points.length, "Training", "Trainings")}.`;
  statsElements.forecastCard.innerHTML = `
    <div class="form-row">
      <span class="form-label">Übung</span>
      ${renderMenuSelect("forecast-exercise", "data-forecast-select", options, selected.id, "Übung für die Prognose")}
    </div>
    <div class="forecast-body" id="forecast-body">${forecast.isReady ? renderForecastChart(selected.points, forecast) : `<p class="chart-empty">${escapeHtml(pending)}</p>`}</div>
    ${forecast.isReady ? renderForecastDetails(forecast, lift) : ""}
    ${renderMissingInputsHint()}`;
  showForecastNotes(describeForecastNotes(forecast, lift));
}
