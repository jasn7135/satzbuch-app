import { homeScreen, navActions, navBar, navTitle, nutritionScreen, profileScreen, screens, statsScreen, tabTrack, trainingScreen } from "./dom.js";
import { state } from "./state.js";
import { renderHome } from "../screens/home.js";
import { renderNutrition } from "../screens/nutrition/nutrition-screen.js";
import { renderProfile } from "../screens/profile/profile-screen.js";
import { renderStats } from "../screens/stats/stats-screen.js";
import { selectedDayTitle } from "../screens/training/selected-day.js";
import { renderTraining } from "../screens/training/training-screen.js";
import { ICONS } from "../svg/icons.js";
import { playAnimation } from "../ui/animation.js";

const COMPACT_TITLE_OFFSET = 44;

const TAB_SCREENS = {
  home: homeScreen,
  training: trainingScreen,
  nutrition: nutritionScreen,
  stats: statsScreen,
  profile: profileScreen,
};

const TABS = [
  { id: "home", label: "Start", icon: ICONS.home },
  { id: "training", label: "Training", icon: ICONS.training },
  { id: "nutrition", label: "Ernährung", icon: ICONS.nutrition },
  { id: "stats", label: "Statistik", icon: ICONS.stats },
  { id: "profile", label: "Profil", icon: ICONS.person },
];

let tabLens = null;

let tabButtons = [];

const TAB_TITLES = {
  home: "Start",
  nutrition: "Ernährung",
  stats: "Statistik",
  profile: "Profil",
};

const NAV_ACTION_BUTTONS = {
  edit: '<button class="glass-button" type="button" data-action="start-editing">Bearbeiten</button>',
  done: '<button class="glass-button is-prominent" type="button" data-action="stop-editing">Fertig</button>',
  none: "",
};

export function buildTabBar() {
  const buttons = TABS.map((tab) => `
    <button class="tab" type="button" data-action="select-tab" data-tab="${tab.id}">
      ${tab.icon}
      <span>${tab.label}</span>
    </button>`).join("");
  tabTrack.innerHTML = `<span class="tab-lens" id="tab-lens" aria-hidden="true"></span>${buttons}`;
  tabLens = document.getElementById("tab-lens");
  tabButtons = [...tabTrack.querySelectorAll(".tab")];
}

function activeScreen() {
  return TAB_SCREENS[state.activeTab];
}

function navActionMode() {
  if (state.activeTab !== "training") return "none";
  return state.isEditing ? "done" : "edit";
}

export function updateNav() {
  navTitle.textContent = state.activeTab === "training" ? selectedDayTitle() : TAB_TITLES[state.activeTab];
  const mode = navActionMode();
  if (navActions.dataset.mode === mode) return;
  navActions.dataset.mode = mode;
  navActions.innerHTML = NAV_ACTION_BUTTONS[mode];
  if (mode !== "none") playAnimation(navActions, "fade-in");
}

export function updateCompactNav() {
  navBar.classList.toggle("is-compact", activeScreen().scrollTop > COMPACT_TITLE_OFFSET);
}

export function updateTabBar() {
  const activeIndex = tabButtons.findIndex((button) => button.dataset.tab === state.activeTab);
  tabLens.style.setProperty("--index", activeIndex);
  tabButtons.forEach((button) => {
    if (button.dataset.tab === state.activeTab) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

export function renderTab(tab, { isEntering = false } = {}) {
  if (tab === "home") renderHome({ animateGreeting: isEntering });
  if (tab === "nutrition") renderNutrition();
  if (tab === "stats") renderStats({ isEntering });
  if (tab === "profile") renderProfile();
}

export function selectTab(tab) {
  if (!TAB_SCREENS[tab]) return;
  if (tab === state.activeTab) {
    activeScreen().scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  state.activeTab = tab;
  for (const screen of screens) {
    const isActive = screen.dataset.tab === tab;
    screen.hidden = !isActive;
    if (isActive) playAnimation(screen, "tab-enter");
  }
  renderTab(tab, { isEntering: true });
  updateTabBar();
  playAnimation(tabLens, "lens-moving");
  updateNav();
  updateCompactNav();
}

export function render() {
  renderTraining();
  renderTab(state.activeTab);
  updateNav();
}
