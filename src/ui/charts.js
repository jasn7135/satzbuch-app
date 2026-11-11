import { daysBetween, parseIsoDate } from "../utils/dates.js";
import { chartDateFormat, formatNumber } from "../utils/format.js";
import { roundToHundredths } from "../utils/numbers.js";
import { escapeHtml } from "../utils/text.js";

const CHART_VIEW_WIDTH = 320;
const BAR_CHART_LAYOUT = { width: CHART_VIEW_WIDTH, height: 150, left: 34, right: 8, top: 12, bottom: 24 };
const LINE_CHART_LAYOUT = { width: CHART_VIEW_WIDTH, height: 150, left: 38, right: 14, top: 22, bottom: 24 };

function chartRange(minimum, maximum) {
  if (minimum === maximum) return [Math.max(0, minimum - 5), maximum + 5];
  const padding = (maximum - minimum) * 0.2;
  return [Math.max(0, Math.floor(minimum - padding)), Math.ceil(maximum + padding)];
}

export function describeProgress(points, unit) {
  const change = roundToHundredths(points.at(-1).value - points[0].value);
  const since = chartDateFormat.format(parseIsoDate(points[0].date));
  if (change === 0) return `Gleich wie am ${since}`;
  const sign = change > 0 ? "+" : "−";
  return `${sign}${formatNumber(Math.abs(change))} ${unit} seit ${since}`;
}

export function niceCeiling(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 3, 4, 5, 6, 8, 10].find((candidate) => value / magnitude <= candidate);
  return step * magnitude;
}

export function evenCeiling(value) {
  return Math.max(2, Math.ceil(value / 2) * 2);
}

function roundedTopBarPath(x, yTop, width, height, radius) {
  const corner = Math.min(radius, height, width / 2);
  const bottom = yTop + height;
  const right = x + width;
  return `M${x.toFixed(1)} ${bottom.toFixed(1)}V${(yTop + corner).toFixed(1)}Q${x.toFixed(1)} ${yTop.toFixed(1)} ${(x + corner).toFixed(1)} ${yTop.toFixed(1)}H${(right - corner).toFixed(1)}Q${right.toFixed(1)} ${yTop.toFixed(1)} ${right.toFixed(1)} ${(yTop + corner).toFixed(1)}V${bottom.toFixed(1)}Z`;
}

function linePath(points) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function renderGrid(ticks, y, layout, formatTick) {
  return ticks.map((tick) => `
    <line class="chart-grid" x1="${layout.left}" x2="${layout.width - layout.right}" y1="${y(tick).toFixed(1)}" y2="${y(tick).toFixed(1)}"/>
    <text class="chart-axis-label" x="${layout.left - 8}" y="${(y(tick) + 4).toFixed(1)}" text-anchor="end">${escapeHtml(formatTick(tick))}</text>`).join("");
}

function renderScrubLine(layout) {
  return `<line class="scrub-line" x1="0" x2="0" y1="${layout.top}" y2="${layout.height - layout.bottom}"/>`;
}

export function renderChart({ headline, caption, svg, scrubPoints }) {
  return `
    <div class="chart" data-scrub="${escapeHtml(JSON.stringify(scrubPoints))}">
      <p class="chart-headline chart-readout" data-default="${escapeHtml(headline)}">${escapeHtml(headline)}</p>
      <p class="chart-caption">${escapeHtml(caption)}</p>
      ${svg}
    </div>`;
}

function renderReferenceLine(reference, y, layout) {
  const lineY = y(reference.value).toFixed(1);
  return `
    <line class="reference-line" x1="${layout.left}" x2="${layout.width - layout.right}" y1="${lineY}" y2="${lineY}"/>
    <text class="chart-tag" x="${layout.width - layout.right}" y="${(y(reference.value) - 5).toFixed(1)}" text-anchor="end">${escapeHtml(reference.label)}</text>`;
}

export function renderBarChart({ values, labels, readouts, scale, formatTick, ariaLabel, reference = null }) {
  const layout = BAR_CHART_LAYOUT;
  const maximum = scale(Math.max(...values, reference?.value ?? 0));
  const baseline = layout.height - layout.bottom;
  const slot = (layout.width - layout.left - layout.right) / values.length;
  const barWidth = Math.min(16, slot * 0.56);
  const y = (value) => layout.top + (1 - value / maximum) * (baseline - layout.top);
  const centers = values.map((_, index) => layout.left + slot * (index + 0.5));
  const bars = values.map((value, index) => {
    const x = centers[index] - barWidth / 2;
    if (value <= 0) return `<rect class="bar-stub" x="${x.toFixed(1)}" y="${baseline - 2}" width="${barWidth.toFixed(1)}" height="2" rx="1"/>`;
    return `<path class="bar" data-index="${index}" d="${roundedTopBarPath(x, y(value), barWidth, baseline - y(value), 4)}"/>`;
  }).join("");
  const lastIndex = values.length - 1;
  const labelIndexes = [0, Math.floor(lastIndex / 2), lastIndex];
  const anchors = ["start", "middle", "end"];
  const xLabels = labelIndexes.map((index, position) => {
    const x = position === 0 ? centers[index] - barWidth / 2 : position === 2 ? centers[index] + barWidth / 2 : centers[index];
    return `<text class="chart-axis-label" x="${x.toFixed(1)}" y="${layout.height - 6}" text-anchor="${anchors[position]}">${escapeHtml(labels[index])}</text>`;
  }).join("");
  const svg = `
    <svg class="chart-svg" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="${escapeHtml(ariaLabel)}">
      ${renderGrid([0, maximum / 2, maximum], y, layout, formatTick)}
      ${renderScrubLine(layout)}
      ${bars}
      ${reference ? renderReferenceLine(reference, y, layout) : ""}
      ${xLabels}
    </svg>`;
  return { svg, scrubPoints: centers.map((x, index) => ({ x: Number(x.toFixed(1)), index, readout: readouts[index] })) };
}

export function renderTimeLineChart({ points, readout, ariaLabel }) {
  const layout = LINE_CHART_LAYOUT;
  const firstDate = parseIsoDate(points[0].date);
  const totalDays = Math.max(1, daysBetween(firstDate, parseIsoDate(points.at(-1).date)));
  const values = points.map((point) => point.value);
  const [low, high] = chartRange(Math.min(...values), Math.max(...values));
  const baseline = layout.height - layout.bottom;
  const x = (isoDate) => layout.left + (daysBetween(firstDate, parseIsoDate(isoDate)) / totalDays) * (layout.width - layout.left - layout.right);
  const y = (value) => layout.top + (1 - (value - low) / (high - low)) * (baseline - layout.top);
  const plotted = points.map((point) => ({ x: x(point.date), y: y(point.value) }));
  const path = linePath(plotted);
  const area = `${path} L${plotted.at(-1).x.toFixed(1)} ${baseline} L${plotted[0].x.toFixed(1)} ${baseline} Z`;
  const lastIndex = points.length - 1;
  const dots = points.length <= 24
    ? plotted.slice(0, -1).map((point, index) => `<circle class="dot" data-index="${index}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4"/>`).join("")
    : "";
  const svg = `
    <svg class="chart-svg" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="${escapeHtml(ariaLabel)}">
      <defs>
        <linearGradient id="line-fill" x1="0" y1="0" x2="0" y2="1">
          <stop class="chart-area-stop" offset="0" stop-opacity="0.18"/>
          <stop class="chart-area-stop" offset="1" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${renderGrid([low, (low + high) / 2, high], y, layout, (tick) => formatNumber(roundToHundredths(tick)))}
      ${renderScrubLine(layout)}
      <path d="${area}" fill="url(#line-fill)"/>
      <path class="chart-line" pathLength="1" d="${path}"/>
      ${dots}
      <circle class="dot is-latest" data-index="${lastIndex}" cx="${plotted.at(-1).x.toFixed(1)}" cy="${plotted.at(-1).y.toFixed(1)}" r="5.5"/>
      <text class="chart-axis-label" x="${layout.left}" y="${layout.height - 6}" text-anchor="start">${chartDateFormat.format(firstDate)}</text>
      <text class="chart-axis-label" x="${layout.width - layout.right}" y="${layout.height - 6}" text-anchor="end">${chartDateFormat.format(parseIsoDate(points.at(-1).date))}</text>
    </svg>`;
  const scrubPoints = points.map((point, index) => ({ x: Number(plotted[index].x.toFixed(1)), index, readout: readout(point) }));
  return { svg, scrubPoints };
}

export function scrubChart(event) {
  const chart = event.target.closest?.(".chart[data-scrub]");
  const svg = chart?.querySelector(".chart-svg");
  if (!svg) return;
  const points = JSON.parse(chart.dataset.scrub);
  if (points.length === 0) return;
  const bounds = svg.getBoundingClientRect();
  const viewX = ((event.clientX - bounds.left) / bounds.width) * CHART_VIEW_WIDTH;
  const nearest = points.reduce((best, point) => (Math.abs(point.x - viewX) < Math.abs(best.x - viewX) ? point : best));
  chart.querySelector(".chart-readout").textContent = nearest.readout;
  const scrubLine = svg.querySelector(".scrub-line");
  scrubLine.setAttribute("x1", nearest.x);
  scrubLine.setAttribute("x2", nearest.x);
  scrubLine.classList.add("is-visible");
  svg.classList.add("is-scrubbing");
  svg.querySelectorAll("[data-index]").forEach((mark) => mark.classList.toggle("is-active", Number(mark.dataset.index) === nearest.index && nearest.index >= 0));
}

function endScrub(chart) {
  const svg = chart.querySelector(".chart-svg");
  const readout = chart.querySelector(".chart-readout");
  readout.textContent = readout.dataset.default;
  svg?.classList.remove("is-scrubbing");
  svg?.querySelector(".scrub-line")?.classList.remove("is-visible");
  svg?.querySelectorAll(".is-active").forEach((mark) => mark.classList.remove("is-active"));
}

export function handleScrubOut(event) {
  const chart = event.target.closest?.(".chart[data-scrub]");
  if (chart && !chart.contains(event.relatedTarget)) endScrub(chart);
}

export function handleScrubRelease(event) {
  const chart = event.target.closest?.(".chart[data-scrub]");
  if (chart && event.pointerType !== "mouse") endScrub(chart);
}

const PROJECTION_CHART_LAYOUT = { width: CHART_VIEW_WIDTH, height: 170, left: 38, right: 16, top: 26, bottom: 24 };
const MIN_REFERENCE_REACH_SHARE = 0.05;

function isReferenceInReach(reference, values) {
  if (!reference) return false;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const reach = Math.max(high - low, high * MIN_REFERENCE_REACH_SHARE);
  return reference.value >= low - reach && reference.value <= high + reach;
}

export function renderProjectionChart({ history, projection, reference = null, formatTick, formatValue, ariaLabel, headline, caption, historyReadout }) {
  const layout = PROJECTION_CHART_LAYOUT;
  const firstDate = parseIsoDate(history[0].date);
  const totalDays = Math.max(1, daysBetween(firstDate, parseIsoDate(projection.at(-1).date)));
  const domainValues = [...history.map((point) => point.value), ...projection.flatMap((step) => [step.low, step.high])];
  const showReference = isReferenceInReach(reference, domainValues);
  if (showReference) domainValues.push(reference.value);
  const [low, high] = chartRange(Math.min(...domainValues), Math.max(...domainValues));
  const baseline = layout.height - layout.bottom;
  const x = (isoDate) => layout.left + (daysBetween(firstDate, parseIsoDate(isoDate)) / totalDays) * (layout.width - layout.left - layout.right);
  const y = (value) => layout.top + (1 - (value - low) / (high - low)) * (baseline - layout.top);
  const historyPoints = history.map((point) => ({ x: x(point.date), y: y(point.value) }));
  const forecastPoints = projection.map((step) => ({ x: x(step.date), y: y(step.value) }));
  const upper = projection.map((step) => ({ x: x(step.date), y: y(step.high) }));
  const lower = projection.map((step) => ({ x: x(step.date), y: y(step.low) })).reverse();
  const divideX = x(projection[0].date);
  const end = forecastPoints.at(-1);
  const lastIndex = historyPoints.length - 1;
  const dots = historyPoints.map((point, index) => `<circle class="dot${index === lastIndex ? " is-latest" : ""}" data-index="${index}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${index === lastIndex ? 5.5 : 4}"/>`).join("");
  const referenceLine = showReference ? `
    <line class="reference-line" x1="${layout.left}" x2="${layout.width - layout.right}" y1="${y(reference.value).toFixed(1)}" y2="${y(reference.value).toFixed(1)}"/>
    <text class="chart-tag" x="${layout.left + 4}" y="${(y(reference.value) - 5).toFixed(1)}">${escapeHtml(reference.label)}</text>` : "";
  const historyLine = historyPoints.length > 1 ? `<path class="chart-line" pathLength="1" d="${linePath(historyPoints)}"/>` : "";
  const svg = `
    <svg class="chart-svg" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="${escapeHtml(ariaLabel)}">
      ${renderGrid([low, (low + high) / 2, high], y, layout, formatTick)}
      ${referenceLine}
      <line class="divider-line" x1="${divideX.toFixed(1)}" x2="${divideX.toFixed(1)}" y1="${layout.top - 6}" y2="${baseline}"/>
      <text class="chart-tag" x="${(divideX + 6).toFixed(1)}" y="${layout.top - 10}">Prognose</text>
      ${renderScrubLine(layout)}
      <path class="forecast-band" d="${linePath([...upper, ...lower])} Z"/>
      ${historyLine}
      <path class="forecast-line" d="${linePath(forecastPoints)}"/>
      ${dots}
      <circle class="forecast-end" cx="${end.x.toFixed(1)}" cy="${end.y.toFixed(1)}" r="5"/>
      <text class="chart-value-label" x="${end.x.toFixed(1)}" y="${(end.y - 12).toFixed(1)}" text-anchor="end">${escapeHtml(formatValue(projection.at(-1).value))}</text>
      <text class="chart-axis-label" x="${layout.left}" y="${layout.height - 6}" text-anchor="start">${chartDateFormat.format(firstDate)}</text>
      <text class="chart-axis-label" x="${layout.width - layout.right}" y="${layout.height - 6}" text-anchor="end">${chartDateFormat.format(parseIsoDate(projection.at(-1).date))}</text>
    </svg>`;
  const historyScrub = history.map((point, index) => ({ x: Number(historyPoints[index].x.toFixed(1)), index, readout: historyReadout(point) }));
  const forecastScrub = projection.slice(1).map((step, index) => ({
    x: Number(forecastPoints[index + 1].x.toFixed(1)),
    index: -1,
    readout: `Prognose ${chartDateFormat.format(parseIsoDate(step.date))}: ca. ${formatValue(step.value)}`,
  }));
  return renderChart({ headline, caption, svg, scrubPoints: [...historyScrub, ...forecastScrub] });
}
