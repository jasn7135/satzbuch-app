import { handleClick } from "./app/actions.js";
import { keepDocumentAtOrigin } from "./app/document-scroll.js";
import { nutritionView, profileView, screens, sheet, sheetLayer, statsView, trainingScreen, trainingView } from "./app/dom.js";
import { buildTabBar, render, renderTab, updateCompactNav, updateNav, updateTabBar } from "./app/navigation.js";
import { requestPersistentStorage, storageProblem } from "./app/persistence.js";
import { handleSheetChange, handleSheetFocus, handleSheetInput } from "./app/sheet-events.js";
import { state } from "./app/state.js";
import { buildHomeView } from "./screens/home.js";
import { buildNutritionView, handleNutritionChange } from "./screens/nutrition/nutrition-screen.js";
import { handleOnboardingInput, handleOnboardingKeydown, maybeStartOnboarding, onboardingBack, onboardingPage } from "./screens/onboarding.js";
import { handleImportFile } from "./screens/profile/backup.js";
import { handlePhotoFile } from "./screens/profile/profile-photo.js";
import { buildProfileView, handleProfileChange, profileElements } from "./screens/profile/profile-screen.js";
import { buildStatsView, handleStatsChange } from "./screens/stats/stats-screen.js";
import { handleEditorChange, handleEditorKeydown } from "./screens/training/plan-editor.js";
import { buildTrainingView, handleSwipeEnd, handleSwipeStart, renderTraining } from "./screens/training/training-screen.js";
import { ICONS } from "./svg/icons.js";
import { handleScrubOut, handleScrubRelease, scrubChart } from "./ui/charts.js";
import { handleFormKeydown } from "./ui/forms.js";
import { closeSheet, endSheetDrag, moveSheetDrag, startSheetDrag } from "./ui/sheet.js";
import { showToast } from "./ui/toast.js";

function handleKeydown(event) {
  if (event.key === "Escape" && sheetLayer.classList.contains("is-open")) closeSheet();
}

function handleVisibilityChange() {
  if (!document.hidden && !state.isEditing) render();
}

function buildViews() {
  buildTabBar();
  onboardingBack.innerHTML = ICONS.chevronLeft;
  buildHomeView();
  buildTrainingView();
  buildNutritionView();
  buildStatsView();
  buildProfileView();
}

function attachEventListeners() {
  document.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  document.addEventListener("pointerdown", scrubChart);
  document.addEventListener("pointermove", scrubChart);
  document.addEventListener("pointerout", handleScrubOut);
  document.addEventListener("pointerup", handleScrubRelease);
  document.addEventListener("pointercancel", handleScrubRelease);
  for (const screen of screens) screen.addEventListener("scroll", updateCompactNav, { passive: true });
  trainingView.addEventListener("change", handleEditorChange);
  trainingView.addEventListener("keydown", handleEditorKeydown);
  trainingScreen.addEventListener("touchstart", handleSwipeStart, { passive: true });
  trainingScreen.addEventListener("touchend", handleSwipeEnd, { passive: true });
  nutritionView.addEventListener("change", handleNutritionChange);
  nutritionView.addEventListener("keydown", handleFormKeydown);
  statsView.addEventListener("change", handleStatsChange);
  profileView.addEventListener("change", handleProfileChange);
  profileView.addEventListener("keydown", handleFormKeydown);
  profileElements.importInput.addEventListener("change", handleImportFile);
  profileElements.photoInput.addEventListener("change", handlePhotoFile);
  onboardingPage.addEventListener("input", handleOnboardingInput);
  onboardingPage.addEventListener("change", handleOnboardingInput);
  onboardingPage.addEventListener("keydown", handleOnboardingKeydown);
  sheet.addEventListener("input", handleSheetInput);
  sheet.addEventListener("change", handleSheetChange);
  sheet.addEventListener("focusin", handleSheetFocus);
  sheet.addEventListener("keydown", handleFormKeydown);
  sheet.addEventListener("pointerdown", startSheetDrag);
  sheet.addEventListener("pointermove", moveSheetDrag);
  sheet.addEventListener("pointerup", endSheetDrag);
  sheet.addEventListener("pointercancel", endSheetDrag);
}

function startApp() {
  keepDocumentAtOrigin();
  buildViews();
  attachEventListeners();
  updateTabBar();
  renderTraining();
  renderTab(state.activeTab, { isEntering: true });
  updateNav();
  requestPersistentStorage();
  if (storageProblem) showToast(storageProblem);
  maybeStartOnboarding();
}

startApp();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}
