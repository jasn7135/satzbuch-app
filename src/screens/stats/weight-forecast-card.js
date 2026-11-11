import { state } from "../../app/state.js";
import { goalArrival, MIN_WEIGHT_POINTS, plannedArrival, weighInPoints, WEIGHT_FORECAST_MILESTONES, weightProjection, weightTrend } from "../../model/weight.js";
import { describeProgress, renderChart, renderProjectionChart, renderTimeLineChart } from "../../ui/charts.js";
import { renderCardMessage, renderInfoRow } from "../../ui/components.js";
import { parseIsoDate } from "../../utils/dates.js";
import { chartDateFormat, countLabel, formatBodyWeight, formatOneDecimal, formatSigned, formatWeeklyChange, fullDateFormat } from "../../utils/format.js";
import { pointsWithin } from "../../utils/statistics.js";

const WEIGHT_HISTORY_DAYS = 112;

function renderWeightHistoryChart(points) {
  const chart = renderTimeLineChart({
    points,
    readout: (point) => `${chartDateFormat.format(parseIsoDate(point.date))}: ${formatBodyWeight(point.value)}`,
    ariaLabel: `Körpergewicht, zuletzt ${formatBodyWeight(points.at(-1).value)}`,
  });
  return renderChart({ headline: describeProgress(points, "kg"), caption: "Körpergewicht in kg", ...chart });
}

function goalReference() {
  const { targetWeight } = state.profile.goal;
  return targetWeight === null ? null : { value: targetWeight, label: "Ziel" };
}

function renderWeightProjectionChart(points, projection) {
  const end = projection.at(-1);
  return renderProjectionChart({
    history: pointsWithin(points, parseIsoDate(points.at(-1).date), WEIGHT_HISTORY_DAYS),
    projection,
    reference: goalReference(),
    formatTick: (tick) => formatOneDecimal(tick),
    formatValue: formatBodyWeight,
    ariaLabel: `Gewichtsverlauf und Prognose, in 12 Wochen etwa ${formatBodyWeight(end.value)}`,
    headline: `In 12 Wochen etwa ${formatBodyWeight(end.value)}`,
    caption: "Körpergewicht in kg, Trend der letzten 8 Wochen",
    historyReadout: (point) => `${chartDateFormat.format(parseIsoDate(point.date))}: ${formatBodyWeight(point.value)}`,
  });
}

function describeGoalArrival(trend, targetWeight) {
  const arrival = goalArrival(trend, targetWeight);
  if (arrival.status === "reached") return "erreicht";
  if (arrival.status === "flat") return "Trend zu flach für eine Schätzung";
  if (arrival.status === "away") return "Trend geht in die andere Richtung";
  if (arrival.status === "beyond") return "nicht in den nächsten 2 Jahren";
  return `ca. ${fullDateFormat.format(parseIsoDate(arrival.date))}`;
}

function describeWeeklyShare(trend) {
  const percent = Math.round((trend.weeklyChange / trend.current) * 1000) / 10;
  return percent === 0 ? "" : ` (${formatSigned(percent, "%")})`;
}

function renderWeightForecastRows(trend, projection) {
  const rows = [renderInfoRow("Trend", `${formatWeeklyChange(trend.weeklyChange)}${describeWeeklyShare(trend)}`)];
  for (const weeks of WEIGHT_FORECAST_MILESTONES) {
    const step = projection[weeks];
    rows.push(renderInfoRow(`In ${weeks} Wochen`, `${formatBodyWeight(step.value)} (${formatOneDecimal(step.low)}–${formatOneDecimal(step.high)})`));
  }
  const { targetWeight } = state.profile.goal;
  if (targetWeight !== null) {
    rows.push(renderInfoRow(`Ziel ${formatBodyWeight(targetWeight)}`, describeGoalArrival(trend, targetWeight)));
    const planned = plannedArrival(state.profile);
    if (planned) rows.push(renderInfoRow("Mit deinem Zieltempo", `ca. ${countLabel(planned.weeks, "Woche", "Wochen")}`));
  }
  return rows.join("");
}

function describeTrendRequirement(points) {
  const remaining = Math.max(0, MIN_WEIGHT_POINTS - points.length);
  if (remaining > 0) return `Für eine Prognose fehlen noch ${countLabel(remaining, "Eintrag", "Einträge")}. Wieg dich dafür einmal pro Woche.`;
  return "Für eine Prognose brauchen deine Einträge mindestens zwei Wochen Abstand.";
}

export function renderWeightForecastCard() {
  const points = weighInPoints(state.profile);
  if (points.length === 0) return renderCardMessage("Sobald du dich wiegst, siehst du hier deinen Verlauf und wohin er führt.");
  const trend = weightTrend();
  if (!trend) {
    const history = points.length > 1 ? `<div class="forecast-body">${renderWeightHistoryChart(points)}</div>` : "";
    return `${history}${renderCardMessage(describeTrendRequirement(points))}`;
  }
  const projection = weightProjection(trend);
  const capNote = trend.isCapped ? renderCardMessage("Dein Tempo zuletzt war sehr hoch. Die Prognose rechnet mit höchstens 1,5 % pro Woche, weil mehr meist Wasser ist und sich nicht halten lässt.") : "";
  return `
    <div class="forecast-body">${renderWeightProjectionChart(points, projection)}</div>
    <div class="forecast-details">${renderWeightForecastRows(trend, projection)}</div>
    ${capNote}`;
}
