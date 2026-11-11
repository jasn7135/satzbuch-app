import { selectTab } from "./navigation.js";
import { state } from "./state.js";
import { addNutritionEntryForToday, deleteNutritionEntry, openNutritionEntry, pickFood, saveNutritionEntry } from "../screens/nutrition/food-entry-sheet.js";
import { applyNutritionGuidance, shiftNutritionDate } from "../screens/nutrition/nutrition-screen.js";
import { advanceOnboarding, chooseOnboardingPlan, goToOnboardingStep, skipOnboardingStep } from "../screens/onboarding.js";
import { buildCsvExport, buildJsonExport, chooseImportFile, confirmReplacement, exportFile, openResetSheet } from "../screens/profile/backup.js";
import { choosePhoto, removePhoto } from "../screens/profile/profile-photo.js";
import { selectStatsSegment } from "../screens/stats/stats-screen.js";
import { cycleCustomMuscle, openCustomExercise, saveCustomExercise } from "../screens/training/custom-exercise-form.js";
import { addPickedExercises, deleteCustomExercise, filterPicker, goToPickerPage, openExercisePicker, togglePickerDetail, togglePickerExercise } from "../screens/training/exercise-picker.js";
import { addSet, openExercise, removeLastSet, saveOpenExercise, stepSet } from "../screens/training/exercise-sheet.js";
import { finishEditing, removeExercise, setEditing } from "../screens/training/plan-editor.js";
import { selectDay, startPlanSetup, startTodaysTraining, useSamplePlan } from "../screens/training/training-screen.js";
import { deleteWeighIn, openWeighIn, saveWeighIn } from "../screens/weigh-in.js";
import { openDatePicker } from "../ui/forms.js";
import { closeSheet } from "../ui/sheet.js";

const CLICK_ACTIONS = {
  "select-tab": (element) => selectTab(element.dataset.tab),
  "select-day": (element) => {
    const dayIndex = Number(element.dataset.day);
    selectDay(dayIndex, dayIndex > state.selectedDay ? 1 : -1);
  },
  "start-editing": () => setEditing(true),
  "stop-editing": () => finishEditing(),
  "use-sample-plan": () => useSamplePlan(),
  "remove-exercise": (element) => removeExercise(element.dataset.id),
  "open-exercise-picker": () => openExercisePicker(),
  "toggle-picker-exercise": (element) => togglePickerExercise(element),
  "show-picker-detail": (element) => goToPickerPage("detail", { detailId: element.dataset.id }),
  "toggle-picker-detail": (element) => togglePickerDetail(element.dataset.id),
  "picker-back": () => goToPickerPage("list", { custom: null }),
  "filter-picker": (element) => filterPicker(element.dataset.filter),
  "add-picked-exercises": () => addPickedExercises(),
  "open-custom-exercise": () => openCustomExercise(),
  "cycle-custom-muscle": (element) => cycleCustomMuscle(element.dataset.muscle),
  "save-custom-exercise": () => saveCustomExercise(),
  "delete-custom-exercise": (element) => deleteCustomExercise(element),
  "pick-food": (element) => pickFood(element),
  "open-exercise": (element) => openExercise(element.dataset.id),
  "close-sheet": () => closeSheet(),
  "save-exercise": () => saveOpenExercise(),
  "step": (element) => stepSet(Number(element.dataset.index), element.dataset.setField, Number(element.dataset.direction)),
  "add-set": () => addSet(),
  "remove-set": () => removeLastSet(),
  "nutrition-previous-day": () => shiftNutritionDate(-1),
  "nutrition-next-day": () => shiftNutritionDate(1),
  "add-nutrition-entry": () => openNutritionEntry(),
  "add-nutrition-today": () => addNutritionEntryForToday(),
  "edit-nutrition-entry": (element) => openNutritionEntry(element.dataset.id),
  "save-nutrition-entry": () => saveNutritionEntry(),
  "delete-nutrition-entry": (element) => deleteNutritionEntry(element),
  "apply-nutrition-guidance": () => applyNutritionGuidance(),
  "open-weigh-in": () => openWeighIn(),
  "edit-weigh-in": (element) => openWeighIn(element.dataset.date),
  "save-weigh-in": () => saveWeighIn(),
  "delete-weigh-in": (element) => deleteWeighIn(element),
  "select-stats-segment": (element) => selectStatsSegment(element.dataset.segment),
  "export-json": () => exportFile(buildJsonExport),
  "export-csv": () => exportFile(buildCsvExport),
  "choose-import-file": () => chooseImportFile(),
  "confirm-replace": () => confirmReplacement(),
  "open-reset": () => openResetSheet(),
  "open-profile": () => selectTab("profile"),
  "choose-photo": () => choosePhoto(),
  "remove-photo": () => removePhoto(),
  "open-training": () => selectTab("training"),
  "start-training": () => startTodaysTraining(),
  "start-plan": () => startPlanSetup(),
  "onboarding-next": () => advanceOnboarding(),
  "onboarding-back": () => goToOnboardingStep(-1),
  "onboarding-skip": () => skipOnboardingStep(),
  "onboarding-choose": (element) => chooseOnboardingPlan(element.dataset.choice),
};

export function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (target && !target.disabled) CLICK_ACTIONS[target.dataset.action]?.(target);
  if (event.target.matches?.(".date-input")) openDatePicker(event.target);
}
