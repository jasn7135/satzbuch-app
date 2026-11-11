import { state } from "../app/state.js";
import { GOAL_REACHED_MARGIN_KG, plannedWeeklyChange } from "./energy.js";
import { addDays, daysBetween, parseIsoDate, todayIso, toIsoDate } from "../utils/dates.js";
import { linearTrend, pointsWithin, spanInDays } from "../utils/statistics.js";

export function weighInPoints(profile) {
  return profile.weightLog.map((entry) => ({ date: entry.date, value: entry.kg }));
}

const WEIGHT_TREND_DAYS = 56;
export const MIN_WEIGHT_POINTS = 3;
const MIN_WEIGHT_SPAN_DAYS = 14;
const WEIGHT_FORECAST_WEEKS = 12;
export const WEIGHT_FORECAST_MILESTONES = [4, 8, 12];
const ADAPTATION_WEEKS = 45;
const MAX_WEEKLY_WEIGHT_SHARE = 0.015;
export const MIN_WEIGHT_NOISE = 0.5;
const WEIGHT_BAND_Z = 1.28;
const GOAL_SEARCH_WEEKS = 104;
const FLAT_WEEKLY_CHANGE = 0.05;

export function weightTrend(profile = state.profile) {
  const points = weighInPoints(profile);
  if (points.length < MIN_WEIGHT_POINTS) return null;
  const lastDate = parseIsoDate(points.at(-1).date);
  const recent = pointsWithin(points, lastDate, WEIGHT_TREND_DAYS);
  const trendPoints = recent.length >= MIN_WEIGHT_POINTS ? recent : points.slice(-MIN_WEIGHT_POINTS);
  if (spanInDays(trendPoints) < MIN_WEIGHT_SPAN_DAYS) return null;
  const trend = linearTrend(trendPoints, lastDate);
  const limit = trend.valueAtReference * MAX_WEEKLY_WEIGHT_SHARE;
  const noise = Math.max(trend.residualSd, MIN_WEIGHT_NOISE);
  return {
    current: trend.valueAtReference,
    weeklyChange: Math.min(limit, Math.max(-limit, trend.slope)),
    isCapped: Math.abs(trend.slope) > limit,
    noise,
    slopeError: noise / Math.sqrt(trend.spreadX),
    lastDate,
    pointCount: trendPoints.length,
  };
}

function projectWeight(trend, weeks) {
  const value = trend.current + trend.weeklyChange * ADAPTATION_WEEKS * (1 - Math.exp(-weeks / ADAPTATION_WEEKS));
  const halfWidth = WEIGHT_BAND_Z * Math.hypot(trend.noise, trend.slopeError * weeks);
  return { date: toIsoDate(addDays(trend.lastDate, weeks * 7)), value, low: value - halfWidth, high: value + halfWidth };
}

export function weightProjection(trend) {
  return Array.from({ length: WEIGHT_FORECAST_WEEKS + 1 }, (_, weeks) => projectWeight(trend, weeks));
}

export function goalArrival(trend, targetWeight) {
  const direction = Math.sign(targetWeight - trend.current);
  if (Math.abs(targetWeight - trend.current) <= GOAL_REACHED_MARGIN_KG) return { status: "reached" };
  if (Math.abs(trend.weeklyChange) < FLAT_WEEKLY_CHANGE) return { status: "flat" };
  if (Math.sign(trend.weeklyChange) !== direction) return { status: "away" };
  for (let weeks = 1; weeks <= GOAL_SEARCH_WEEKS; weeks += 1) {
    const step = projectWeight(trend, weeks);
    if ((step.value - targetWeight) * direction >= 0) return { status: "eta", weeks, date: step.date };
  }
  return { status: "beyond" };
}

export function plannedArrival(profile) {
  const weeklyChange = plannedWeeklyChange(profile);
  const { targetWeight } = profile.goal;
  if (weeklyChange === 0 || targetWeight === null || profile.bodyWeight === null) return null;
  const weeks = Math.ceil(Math.abs(targetWeight - profile.bodyWeight) / Math.abs(weeklyChange));
  return { weeks, date: toIsoDate(addDays(parseIsoDate(todayIso()), weeks * 7)), weeklyChange };
}

const WEIGH_IN_INTERVAL_DAYS = 7;
export const WEIGH_IN_HISTORY_DAYS = 365;
export const WEIGH_IN_LIST_LIMIT = 5;

export function lastWeighIn() {
  return state.profile.weightLog.at(-1) ?? null;
}

export function nextWeighInDate() {
  const last = lastWeighIn();
  return last ? toIsoDate(addDays(parseIsoDate(last.date), WEIGH_IN_INTERVAL_DAYS)) : todayIso();
}

export function isWeighInDue() {
  return nextWeighInDate() <= todayIso();
}

export function daysSinceLastWeighIn() {
  const last = lastWeighIn();
  return last ? daysBetween(parseIsoDate(last.date), parseIsoDate(todayIso())) : null;
}
