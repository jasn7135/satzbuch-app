import { state } from "../app/state.js";
import { ageInYears } from "./body-metrics.js";
import { estimateOneRepMax } from "./strength.js";
import { addDays, daysBetween, parseIsoDate, toIsoDate } from "../utils/dates.js";
import { linearTrend } from "../utils/statistics.js";

export const MIN_FORECAST_POINTS = 4;
const MIN_FORECAST_SPAN_DAYS = 21;
const TREND_WINDOW_WEEKS = 12;
const FORECAST_WEEKS = 12;
export const FORECAST_HISTORY_WEEKS = 16;
const MIN_SPREAD_SHARE = 0.015;
const ABOVE_CEILING_SHARE = 0.25;
export const NEAR_CEILING_SHARE = 0.9;

const EXPERIENCE_SETTINGS = {
  beginner: { maxWeeklyGain: 0.02, decayWeeks: 12 },
  intermediate: { maxWeeklyGain: 0.0075, decayWeeks: 20 },
  advanced: { maxWeeklyGain: 0.003, decayWeeks: 30 },
};

const STRENGTH_RATIOS = {
  male: { bench: 1.5, squat: 2, deadlift: 2.5, press: 1 },
  female: { bench: 0.9, squat: 1.5, deadlift: 1.9, press: 0.6 },
};

const LIFT_TYPES = [
  { type: "bench", label: "Bankdrücken (Langhantel)", include: /bankdr|bench/, exclude: /schräg|schraeg|negativ|kurzhantel|\bkh\b|incline|decline|dumbbell|maschine|machine|multipresse|eng/ },
  { type: "squat", label: "Kniebeuge (Langhantel)", include: /kniebeug|squat/, exclude: /front|goblet|bulgar|hack|split|smith|multipresse|maschine|einbein|pendel|belt|zercher|pistol|sissy/ },
  { type: "deadlift", label: "Kreuzheben", include: /kreuzheb|deadlift/, exclude: /rumän|rumaen|romanian|\brdl\b|gestreckt|stiff|einbein|trap|hex/ },
  { type: "press", label: "Schulterdrücken (Langhantel)", include: /schulterdr|military|overhead|\bohp\b/, exclude: /kurzhantel|\bkh\b|maschine|machine|multipresse|dumbbell|arnold/ },
];

function bestEstimate(sets) {
  return sets.reduce((best, set) => {
    const value = estimateOneRepMax(set);
    return value !== null && (!best || value > best.value) ? { value, reps: set.reps } : best;
  }, null);
}

export function forecastCandidates() {
  const planNames = new Map(state.plan.days.flatMap((day) => day.exercises).map((exercise) => [exercise.id, exercise.name]));
  const byId = new Map();
  for (const session of [...state.sessions].reverse()) {
    for (const [exerciseId, entry] of Object.entries(session.exercises)) {
      const best = bestEstimate(entry.sets);
      if (!best) continue;
      const candidate = byId.get(exerciseId) ?? { id: exerciseId, name: entry.name, points: [] };
      const previous = candidate.points.at(-1);
      if (previous?.date === session.date) {
        if (best.value > previous.value) Object.assign(previous, best);
      } else {
        candidate.points.push({ date: session.date, ...best });
      }
      candidate.name = entry.name || candidate.name;
      byId.set(exerciseId, candidate);
    }
  }
  return [...byId.values()]
    .map((candidate) => ({ ...candidate, name: planNames.get(candidate.id) || candidate.name || "Übung" }))
    .sort((first, second) => second.points.length - first.points.length);
}

export function classifyLift(name) {
  const normalized = name.toLowerCase();
  return LIFT_TYPES.find((lift) => lift.include.test(normalized) && !lift.exclude.test(normalized)) ?? null;
}

function ageCeilingFactor(age) {
  if (age === null || (age >= 20 && age < 40)) return 1;
  if (age < 20) return 0.92;
  if (age < 50) return 0.95;
  if (age < 60) return 0.87;
  if (age < 70) return 0.78;
  return 0.68;
}

function ageRateFactor(age) {
  if (age === null || age < 40) return 1;
  if (age < 50) return 0.85;
  if (age < 60) return 0.7;
  return 0.55;
}

function strengthCeiling(lift, age) {
  const ratio = STRENGTH_RATIOS[state.profile.sex]?.[lift?.type];
  if (!ratio || state.profile.bodyWeight === null) return null;
  return ratio * state.profile.bodyWeight * ageCeilingFactor(age);
}

function applyCeiling(current, gain, ceiling) {
  if (!ceiling) return current + gain;
  if (current >= ceiling) return current + gain * ABOVE_CEILING_SHARE;
  const headroom = ceiling - current;
  return current + headroom * (1 - Math.exp(-gain / headroom));
}

function typicalReps(points) {
  const reps = points.slice(-3).map((point) => point.reps).sort((first, second) => first - second);
  return reps[Math.floor(reps.length / 2)];
}

export function forecastStrength(points, lift) {
  const firstDate = parseIsoDate(points[0].date);
  const lastDate = parseIsoDate(points.at(-1).date);
  if (points.length < MIN_FORECAST_POINTS || daysBetween(firstDate, lastDate) < MIN_FORECAST_SPAN_DAYS) return { isReady: false };
  const recent = points.filter((point) => daysBetween(parseIsoDate(point.date), lastDate) <= TREND_WINDOW_WEEKS * 7);
  const trendPoints = recent.length >= MIN_FORECAST_POINTS ? recent : points.slice(-MIN_FORECAST_POINTS);
  const trend = linearTrend(trendPoints, lastDate);
  const current = trend.valueAtReference;
  const age = ageInYears(state.profile);
  const settings = EXPERIENCE_SETTINGS[state.profile.experience] ?? EXPERIENCE_SETTINGS.intermediate;
  const rateCap = current * settings.maxWeeklyGain * ageRateFactor(age);
  const rate = Math.min(Math.max(trend.slope, 0), rateCap);
  const ceiling = strengthCeiling(lift, age);
  const spread = Math.max(trend.residualSd, current * MIN_SPREAD_SHARE);
  const projection = Array.from({ length: FORECAST_WEEKS + 1 }, (_, weeks) => {
    const gain = rate * settings.decayWeeks * (1 - Math.exp(-weeks / settings.decayWeeks));
    const value = applyCeiling(current, gain, ceiling);
    const halfWidth = spread * Math.sqrt(1 + weeks / 4);
    return { date: toIsoDate(addDays(lastDate, weeks * 7)), value, low: Math.max(0, value - halfWidth), high: value + halfWidth };
  });
  return {
    isReady: true,
    current,
    observedRate: trend.slope,
    isCapped: trend.slope > rateCap,
    ceiling,
    projection,
    typicalReps: typicalReps(trendPoints),
  };
}

export function missingForecastInputs() {
  const { bodyWeight, sex, experience, birthDate } = state.profile;
  return [
    bodyWeight === null ? "Körpergewicht" : "",
    sex ? "" : "Geschlecht",
    experience ? "" : "Trainingserfahrung",
    birthDate ? "" : "Geburtsdatum",
  ].filter(Boolean);
}
