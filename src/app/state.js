import { loadAppData } from "./persistence.js";
import { LOCAL_STORAGE_KEY } from "../config/limits.js";
import { showToast } from "../ui/toast.js";
import { todayWeekday, toIsoDate } from "../utils/dates.js";

export function storedData() {
  return { plan: state.plan, customExercises: state.customExercises, profile: state.profile, sessions: state.sessions, nutrition: state.nutrition, mealPlan: state.mealPlan, customFoods: state.customFoods };
}

function describeStorageError(error) {
  if (error?.name === "QuotaExceededError") return "Der Speicher ist voll. Sichere deine Daten und entferne das Profilbild, um Platz zu schaffen.";
  return "Nicht gespeichert. Dieser Browser blockiert das Speichern.";
}

export function saveState() {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storedData()));
    return true;
  } catch (error) {
    showToast(describeStorageError(error));
    return false;
  }
}

export const state = {
  ...loadAppData(),
  activeTab: "home",
  statsSegment: "training",
  selectedDay: todayWeekday(),
  nutritionDate: toIsoDate(new Date()),
  isEditing: false,
  openExerciseId: null,
  draftSets: [],
  completedExerciseId: null,
  completedUntil: 0,
  nutritionDraft: null,
  mealPlanView: null,
  customFoodDraft: null,
  weighInDraft: null,
  picker: null,
  onboarding: null,
  pendingReplacement: null,
  forecastExerciseId: null,
};

export function applyAppData(data) {
  Object.assign(state, {
    plan: data.plan,
    customExercises: data.customExercises,
    profile: data.profile,
    sessions: data.sessions,
    nutrition: data.nutrition,
    mealPlan: data.mealPlan,
    customFoods: data.customFoods,
  });
}
