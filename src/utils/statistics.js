import { daysBetween, parseIsoDate } from "./dates.js";
import { sum } from "./numbers.js";

export function linearTrend(points, referenceDate) {
  const xs = points.map((point) => daysBetween(referenceDate, parseIsoDate(point.date)) / 7);
  const ys = points.map((point) => point.value);
  const meanX = sum(xs) / xs.length;
  const meanY = sum(ys) / ys.length;
  const spreadX = sum(xs.map((x) => (x - meanX) ** 2));
  const slope = spreadX === 0 ? 0 : sum(xs.map((x, index) => (x - meanX) * (ys[index] - meanY))) / spreadX;
  const valueAtReference = meanY - slope * meanX;
  const squaredErrors = xs.map((x, index) => (ys[index] - (valueAtReference + slope * x)) ** 2);
  const residualSd = Math.sqrt(sum(squaredErrors) / Math.max(1, points.length - 2));
  const slopeError = spreadX === 0 ? Number.POSITIVE_INFINITY : residualSd / Math.sqrt(spreadX);
  return { slope, valueAtReference, residualSd, slopeError, spreadX };
}

export function pointsWithin(points, lastDate, days) {
  return points.filter((point) => daysBetween(parseIsoDate(point.date), lastDate) <= days);
}

export function spanInDays(points) {
  return points.length < 2 ? 0 : daysBetween(parseIsoDate(points[0].date), parseIsoDate(points.at(-1).date));
}

export function combineEstimates(estimates) {
  const usable = estimates.filter((estimate) => estimate && Number.isFinite(estimate.value) && estimate.error > 0);
  if (usable.length === 0) return null;
  const weights = usable.map((estimate) => 1 / estimate.error ** 2);
  const totalWeight = sum(weights);
  return {
    value: sum(usable.map((estimate, index) => estimate.value * weights[index])) / totalWeight,
    error: Math.sqrt(1 / totalWeight),
  };
}
