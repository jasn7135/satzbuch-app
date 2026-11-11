import { state } from "./state.js";
import { handleNutritionSheetInput } from "../screens/nutrition/food-entry-sheet.js";
import { updateCustomField } from "../screens/training/custom-exercise-form.js";
import { handlePickerSearch } from "../screens/training/exercise-picker.js";
import { updateSetFromInput } from "../screens/training/exercise-sheet.js";
import { handleWeighInChange } from "../screens/weigh-in.js";

export function handleSheetInput(event) {
  const input = event.target;
  if (input.dataset.setField) updateSetFromInput(input);
  if (input.matches("[data-picker-search]") && state.picker) handlePickerSearch(input);
  if (input.dataset.customField === "name") updateCustomField(input);
  if (state.nutritionDraft) handleNutritionSheetInput(input);
}

export function handleSheetChange(event) {
  handleWeighInChange(event);
  if (event.target.dataset.customField === "group") updateCustomField(event.target);
}

export function handleSheetFocus(event) {
  if (event.target.matches("input[data-set-field]")) event.target.select();
}
