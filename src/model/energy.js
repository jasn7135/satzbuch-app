import { state } from "../app/state.js";
import { ENERGY_PER_KG_BODY_WEIGHT } from "../config/limits.js";
import { ACTIVITY_OPTIONS, optionOf, PACE_OPTIONS } from "../config/options.js";
import { ageInYears, proteinReferenceWeight } from "./body-metrics.js";
import { dailyNutritionTotalsBetween } from "./nutrition-log.js";
import { MIN_WEIGHT_NOISE, weighInPoints } from "./weight.js";
import { addDays, daysBetween, parseIsoDate, todayIso, toIsoDate } from "../utils/dates.js";
import { roundToStep, sum } from "../utils/numbers.js";
import { combineEstimates, linearTrend, pointsWithin, spanInDays } from "../utils/statistics.js";

const PROTEIN_PER_KG = { low: 1.6, high: 2.2 };
const PROTEIN_SUGGESTED_PER_KG = { lose: 2, maintain: 1.8, gain: 1.8 };
const FAT_MIN_PER_KG = 0.8;

const RECOMMENDED_WEEKLY_CHANGE_SHARE = {
  lose: { "": 0.005, beginner: 0.005, intermediate: 0.005, advanced: 0.005 },
  gain: { "": 0.0017, beginner: 0.003, intermediate: 0.0017, advanced: 0.0009 },
};

const TRAINING_NET_MET = 3.5;
const TRAINING_SESSION_HOURS = 1;
const UNKNOWN_SEX_OFFSET = -78;
const FORMULA_ERROR_SHARE = 0.1;
const LOGGING_ERROR_SHARE = 0.05;
const MEASURED_WINDOW_DAYS = 42;
const MIN_MEASURED_WEIGH_INS = 4;
const MIN_MEASURED_SPAN_DAYS = 21;
const MIN_LOGGED_DAY_SHARE = 0.7;
const PLAUSIBLE_EXPENDITURE = { min: 1000, max: 6000 };
const TRAINING_HISTORY_DAYS = 28;
const MIN_TRAINING_HISTORY_DAYS = 14;
const INTAKE_WINDOW_DAYS = 14;
const MIN_INTAKE_DAYS = 7;
const MIN_TARGET_CALORIES = 1200;
export const GOAL_REACHED_MARGIN_KG = 0.5;

export function restingCalories(profile) {
  const age = ageInYears(profile);
  if (profile.bodyWeight === null || profile.height === null || age === null) return null;
  const sexOffset = { male: 5, female: -161 }[profile.sex] ?? UNKNOWN_SEX_OFFSET;
  return 10 * profile.bodyWeight + 6.25 * profile.height - 5 * age + sexOffset;
}

function trainingsPerWeek() {
  const today = parseIsoDate(todayIso());
  const firstDate = state.sessions.at(-1)?.date;
  const historyDays = firstDate ? daysBetween(parseIsoDate(firstDate), today) + 1 : 0;
  if (historyDays < MIN_TRAINING_HISTORY_DAYS) return state.plan.days.filter((day) => day.exercises.length > 0).length;
  const windowDays = Math.min(TRAINING_HISTORY_DAYS, historyDays);
  const since = toIsoDate(addDays(today, 1 - windowDays));
  return (state.sessions.filter((session) => session.date >= since).length / windowDays) * 7;
}

function trainingCaloriesPerDay(profile) {
  if (profile.bodyWeight === null) return 0;
  return (trainingsPerWeek() * TRAINING_NET_MET * profile.bodyWeight * TRAINING_SESSION_HOURS) / 7;
}

function formulaExpenditure(profile) {
  const resting = restingCalories(profile);
  if (resting === null) return null;
  const activityFactor = optionOf(ACTIVITY_OPTIONS, profile.activity).factor;
  const training = trainingCaloriesPerDay(profile);
  const value = resting * activityFactor + training;
  return { value, error: value * FORMULA_ERROR_SHARE, resting, activityFactor, training };
}

function averageIntake(days) {
  const logged = days.filter((day) => day.hasEntries);
  return logged.length ? { kcal: sum(logged.map((day) => day.kcal)) / logged.length, loggedDays: logged.length } : null;
}

function measuredExpenditure(profile) {
  const weighIns = pointsWithin(weighInPoints(profile), parseIsoDate(todayIso()), MEASURED_WINDOW_DAYS);
  if (weighIns.length < MIN_MEASURED_WEIGH_INS || spanInDays(weighIns) < MIN_MEASURED_SPAN_DAYS) return null;
  const days = dailyNutritionTotalsBetween(weighIns[0].date, weighIns.at(-1).date);
  const intake = averageIntake(days);
  if (!intake || intake.loggedDays < days.length * MIN_LOGGED_DAY_SHARE) return null;
  const trend = linearTrend(weighIns, parseIsoDate(weighIns.at(-1).date));
  const energyPerWeek = ENERGY_PER_KG_BODY_WEIGHT / 7;
  const value = intake.kcal - trend.slope * energyPerWeek;
  if (value < PLAUSIBLE_EXPENDITURE.min || value > PLAUSIBLE_EXPENDITURE.max) return null;
  const slopeError = Math.max(trend.slopeError, MIN_WEIGHT_NOISE / Math.sqrt(trend.spreadX));
  const error = Math.hypot(slopeError * energyPerWeek, intake.kcal * LOGGING_ERROR_SHARE);
  return { value, error, intake: intake.kcal, weeklyChange: trend.slope, days: days.length };
}

export function expenditureEstimate(profile = state.profile) {
  const formula = formulaExpenditure(profile);
  const measured = measuredExpenditure(profile);
  const combined = combineEstimates([formula, measured]);
  if (!combined) return null;
  const source = formula && measured ? "combined" : measured ? "measured" : "formula";
  return { ...combined, formula, measured, source };
}

export function describeExpenditureSource(estimate) {
  if (estimate.source === "combined") return "Aus Formel und deinen Gewichts- und Ernährungsdaten der letzten Wochen";
  if (estimate.source === "measured") return "Aus deinen Gewichts- und Ernährungsdaten der letzten Wochen";
  return "Aus Formel, Alltag und deinen Trainings";
}

function activeGoalType(profile) {
  const { type, targetWeight } = profile.goal;
  if (type !== "lose" && type !== "gain") return type;
  if (targetWeight === null || profile.bodyWeight === null) return type;
  const remaining = type === "lose" ? profile.bodyWeight - targetWeight : targetWeight - profile.bodyWeight;
  return remaining <= GOAL_REACHED_MARGIN_KG ? "maintain" : type;
}

export function plannedWeeklyChange(profile) {
  const type = activeGoalType(profile);
  if ((type !== "lose" && type !== "gain") || profile.bodyWeight === null) return 0;
  const share = RECOMMENDED_WEEKLY_CHANGE_SHARE[type][profile.experience] * optionOf(PACE_OPTIONS, profile.goal.pace).factor;
  return (type === "lose" ? -1 : 1) * share * profile.bodyWeight;
}

function calorieFloor(profile) {
  return Math.max(MIN_TARGET_CALORIES, restingCalories(profile) ?? 0);
}

export function nutritionRecommendation(profile = state.profile) {
  const expenditure = expenditureEstimate(profile);
  const referenceWeight = proteinReferenceWeight(profile);
  if (!expenditure && referenceWeight === null) return null;
  const goalType = activeGoalType(profile);
  const weeklyChange = plannedWeeklyChange(profile);
  const recommendation = { expenditure, goalType, weeklyChange, kcal: null, isFloored: false, protein: null, fat: null, carbs: null };
  if (expenditure) {
    const desired = expenditure.value + (weeklyChange * ENERGY_PER_KG_BODY_WEIGHT) / 7;
    const floor = calorieFloor(profile);
    recommendation.isFloored = desired < floor;
    recommendation.kcal = roundToStep(Math.max(desired, floor), 50);
  }
  if (referenceWeight !== null) {
    const proteinPerKg = PROTEIN_SUGGESTED_PER_KG[goalType] ?? PROTEIN_SUGGESTED_PER_KG.maintain;
    recommendation.protein = {
      suggested: roundToStep(referenceWeight * proteinPerKg, 5),
      low: Math.round(referenceWeight * PROTEIN_PER_KG.low),
      high: Math.round(referenceWeight * PROTEIN_PER_KG.high),
    };
    recommendation.fat = roundToStep(referenceWeight * FAT_MIN_PER_KG, 5);
  }
  if (recommendation.kcal !== null && recommendation.protein) {
    const remaining = recommendation.kcal - recommendation.protein.suggested * 4 - recommendation.fat * 9;
    recommendation.carbs = Math.max(0, roundToStep(remaining / 4, 5));
  }
  return recommendation;
}

function recentIntake() {
  const today = todayIso();
  return averageIntake(dailyNutritionTotalsBetween(toIsoDate(addDays(parseIsoDate(today), 1 - INTAKE_WINDOW_DAYS)), today));
}

export function intakeOutlook(profile = state.profile) {
  const intake = recentIntake();
  const expenditure = expenditureEstimate(profile);
  if (!intake || intake.loggedDays < MIN_INTAKE_DAYS || !expenditure) return null;
  const dailyBalance = intake.kcal - expenditure.value;
  const weeklyChange = (dailyBalance * 7) / ENERGY_PER_KG_BODY_WEIGHT;
  return { intake: intake.kcal, loggedDays: intake.loggedDays, expenditure, dailyBalance, weeklyChange };
}
