import { ageOn } from "./profile.js";

const ADULT_AGE = 18;
const HEALTHY_BMI = { low: 18.5, high: 24.9 };
const OBESITY_BMI = 30;
const REFERENCE_BMI = 25;

const BMI_CATEGORIES = [
  { below: 18.5, label: "Untergewicht" },
  { below: 25, label: "Normalgewicht" },
  { below: 30, label: "Übergewicht" },
  { below: 35, label: "Adipositas Grad I" },
  { below: 40, label: "Adipositas Grad II" },
  { below: Number.POSITIVE_INFINITY, label: "Adipositas Grad III" },
];

const WAIST_TO_HEIGHT_CATEGORIES = [
  { below: 0.4, label: "sehr schlank" },
  { below: 0.5, label: "unbedenklich" },
  { below: 0.6, label: "erhöht" },
  { below: Number.POSITIVE_INFINITY, label: "deutlich erhöht" },
];

const BODY_FAT_LIMITS = { min: 3, max: 60 };

function categoryFor(categories, value) {
  return categories.find((category) => value < category.below).label;
}

export function ageInYears(profile) {
  return profile.birthDate ? ageOn(profile.birthDate, new Date()) : null;
}

function heightInMeters(profile) {
  return profile.height === null ? null : profile.height / 100;
}

function bodyMassIndex(profile) {
  const meters = heightInMeters(profile);
  if (profile.bodyWeight === null || meters === null) return null;
  return profile.bodyWeight / meters ** 2;
}

export function describeBmi(profile) {
  const bmi = bodyMassIndex(profile);
  if (bmi === null) return null;
  const age = ageInYears(profile);
  const category = age !== null && age < ADULT_AGE ? "für unter 18-Jährige nicht einzuordnen" : categoryFor(BMI_CATEGORIES, bmi);
  return { value: bmi, category };
}

export function healthyWeightRange(profile) {
  const meters = heightInMeters(profile);
  if (meters === null) return null;
  return { low: HEALTHY_BMI.low * meters ** 2, high: HEALTHY_BMI.high * meters ** 2 };
}

export function proteinReferenceWeight(profile) {
  const bmi = bodyMassIndex(profile);
  if (bmi === null || bmi < OBESITY_BMI) return profile.bodyWeight;
  return REFERENCE_BMI * heightInMeters(profile) ** 2;
}

function navyBodyFat(profile) {
  const { waist, neck, hip } = profile.measurements;
  const height = profile.height;
  if (height === null || waist === null || neck === null) return null;
  if (profile.sex === "male" && waist > neck) {
    return 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
  }
  if (profile.sex === "female" && hip !== null && waist + hip > neck) {
    return 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(height)) - 450;
  }
  return null;
}

function bmiBodyFat(profile) {
  const bmi = bodyMassIndex(profile);
  const age = ageInYears(profile);
  if (bmi === null || age === null || age < ADULT_AGE || !profile.sex) return null;
  return 1.2 * bmi + 0.23 * age - 10.8 * (profile.sex === "male" ? 1 : 0) - 5.4;
}

function isPlausibleBodyFat(percent) {
  return percent !== null && Number.isFinite(percent) && percent >= BODY_FAT_LIMITS.min && percent <= BODY_FAT_LIMITS.max;
}

export function estimateBodyFat(profile) {
  const measured = navyBodyFat(profile);
  if (isPlausibleBodyFat(measured)) return { percent: measured, method: "navy" };
  const estimated = bmiBodyFat(profile);
  if (isPlausibleBodyFat(estimated)) return { percent: estimated, method: "bmi" };
  return null;
}

export function leanBodyMass(profile, bodyFat) {
  if (profile.bodyWeight === null || !bodyFat) return null;
  return profile.bodyWeight * (1 - bodyFat.percent / 100);
}

export function fatFreeMassIndex(profile, bodyFat) {
  const leanMass = leanBodyMass(profile, bodyFat);
  const meters = heightInMeters(profile);
  if (leanMass === null || meters === null) return null;
  return leanMass / meters ** 2 + 6.1 * (1.8 - meters);
}

export function waistToHeight(profile) {
  const { waist } = profile.measurements;
  if (waist === null || profile.height === null) return null;
  const ratio = waist / profile.height;
  return { value: ratio, category: categoryFor(WAIST_TO_HEIGHT_CATEGORIES, ratio) };
}

export const BODY_FAT_CATEGORIES = {
  male: [
    { label: "Essenziell", min: 2, max: 6 },
    { label: "Athletisch", min: 6, max: 14 },
    { label: "Fit", min: 14, max: 18 },
    { label: "Durchschnitt", min: 18, max: 25 },
    { label: "Erhöht", min: 25, max: 40 },
  ],
  female: [
    { label: "Essenziell", min: 10, max: 14 },
    { label: "Athletisch", min: 14, max: 21 },
    { label: "Fit", min: 21, max: 25 },
    { label: "Durchschnitt", min: 25, max: 32 },
    { label: "Erhöht", min: 32, max: 45 },
  ],
};

export function bodyFatCategoryIndex(percent, categories) {
  const index = categories.findIndex((category) => percent < category.max);
  return index === -1 ? categories.length - 1 : index;
}
