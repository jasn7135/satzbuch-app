import { BODY_WEIGHT_MAX, BODY_WEIGHT_MIN, EARLIEST_BIRTH_DATE, HEIGHT_MAX, HEIGHT_MIN, NAME_MAX_LENGTH } from "../config/limits.js";
import { ACTIVITY_OPTIONS, EXPERIENCE_OPTIONS, GOAL_OPTIONS, isOptionValue, MEASUREMENT_FIELDS, PACE_OPTIONS, SEX_OPTIONS } from "../config/options.js";
import { isIsoDate, parseIsoDate, toIsoDate } from "../utils/dates.js";
import { roundToHundredths } from "../utils/numbers.js";
import { sanitizeName } from "../utils/text.js";

const MAX_PHOTO_DATA_LENGTH = 150000;
const PHOTO_DATA_PATTERN = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;
const WEIGHT_LOG_LIMIT = 400;

export function isValidBirthDate(text) {
  return isIsoDate(text) && text >= EARLIEST_BIRTH_DATE && text <= toIsoDate(new Date());
}

export function isValidBodyWeight(kg) {
  return Number.isFinite(kg) && kg >= BODY_WEIGHT_MIN && kg <= BODY_WEIGHT_MAX;
}

export function isValidHeight(cm) {
  return Number.isInteger(cm) && cm >= HEIGHT_MIN && cm <= HEIGHT_MAX;
}

export function isValidPhoto(value) {
  return typeof value === "string" && value.length <= MAX_PHOTO_DATA_LENGTH && PHOTO_DATA_PATTERN.test(value);
}

function normalizeWeightLog(rawLog) {
  if (!Array.isArray(rawLog)) return [];
  const byDate = new Map();
  for (const entry of rawLog) {
    if (isIsoDate(entry?.date) && isValidBodyWeight(entry.kg)) byDate.set(entry.date, { date: entry.date, kg: entry.kg });
  }
  return [...byDate.values()].sort((first, second) => first.date.localeCompare(second.date)).slice(-WEIGHT_LOG_LIMIT);
}

export function withWeightEntry(weightLog, date, kg) {
  return normalizeWeightLog([...weightLog.filter((entry) => entry.date !== date), { date, kg }]);
}

export function isValidMeasurement(field, cm) {
  const bounds = MEASUREMENT_FIELDS[field];
  return Boolean(bounds) && Number.isFinite(cm) && cm >= bounds.min && cm <= bounds.max;
}

function normalizeMeasurements(rawMeasurements) {
  return Object.fromEntries(Object.keys(MEASUREMENT_FIELDS).map((field) => {
    const cm = rawMeasurements?.[field];
    return [field, isValidMeasurement(field, cm) ? Math.round(cm * 10) / 10 : null];
  }));
}

function normalizeGoal(rawGoal) {
  const type = isOptionValue(GOAL_OPTIONS, rawGoal?.type) ? rawGoal.type : "";
  const hasTarget = (type === "lose" || type === "gain") && isValidBodyWeight(rawGoal?.targetWeight);
  return {
    type,
    targetWeight: hasTarget ? roundToHundredths(rawGoal.targetWeight) : null,
    pace: isOptionValue(PACE_OPTIONS, rawGoal?.pace) ? rawGoal.pace : "steady",
  };
}

export function normalizeProfile(rawProfile) {
  const weightLog = normalizeWeightLog(rawProfile?.weightLog);
  const enteredWeight = isValidBodyWeight(rawProfile?.bodyWeight) ? rawProfile.bodyWeight : null;
  return {
    name: typeof rawProfile?.name === "string" ? sanitizeName(rawProfile.name, NAME_MAX_LENGTH) : "",
    birthDate: isValidBirthDate(rawProfile?.birthDate) ? rawProfile.birthDate : "",
    sex: isOptionValue(SEX_OPTIONS, rawProfile?.sex) ? rawProfile.sex : "",
    experience: isOptionValue(EXPERIENCE_OPTIONS, rawProfile?.experience) ? rawProfile.experience : "",
    activity: isOptionValue(ACTIVITY_OPTIONS, rawProfile?.activity) ? rawProfile.activity : "",
    bodyWeight: weightLog.at(-1)?.kg ?? enteredWeight,
    height: isValidHeight(rawProfile?.height) ? rawProfile.height : null,
    measurements: normalizeMeasurements(rawProfile?.measurements),
    goal: normalizeGoal(rawProfile?.goal),
    photo: isValidPhoto(rawProfile?.photo) ? rawProfile.photo : "",
    weightLog,
  };
}

export function ageOn(birthDate, today) {
  const birth = parseIsoDate(birthDate);
  const age = today.getFullYear() - birth.getFullYear();
  const birthdayPassed = today.getMonth() > birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  return birthdayPassed ? age : age - 1;
}

export function isBirthday(birthDate, today) {
  const birth = parseIsoDate(birthDate);
  return birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate();
}
