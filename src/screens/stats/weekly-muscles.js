import { state } from "../../app/state.js";
import { MUSCLES } from "../../data/exercises.js";
import { exerciseInfoForSession } from "../../model/exercise-lookup.js";
import { renderCardMessage } from "../../ui/components.js";
import { renderMuscleLevels } from "../../ui/muscle-figures.js";
import { startOfWeek, toIsoDate } from "../../utils/dates.js";
import { formatNumber } from "../../utils/format.js";
import { roundToStep } from "../../utils/numbers.js";
import { escapeHtml } from "../../utils/text.js";

const WEEKLY_SET_LEVELS = [
  { below: 4, level: "low", label: "1–3 Sätze" },
  { below: 10, level: "mid", label: "4–9 Sätze" },
  { below: Number.POSITIVE_INFINITY, level: "high", label: "10+ Sätze" },
];

function weeklyMuscleSets() {
  const weekStartIso = toIsoDate(startOfWeek(new Date()));
  const totals = {};
  for (const session of state.sessions) {
    if (session.date < weekStartIso) continue;
    for (const [exerciseId, entry] of Object.entries(session.exercises)) {
      const info = exerciseInfoForSession(exerciseId, entry.name);
      if (!info) continue;
      for (const muscle of info.primary) totals[muscle] = (totals[muscle] ?? 0) + entry.sets.length;
      for (const muscle of info.secondary) totals[muscle] = (totals[muscle] ?? 0) + entry.sets.length / 2;
    }
  }
  return Object.entries(totals).filter(([, sets]) => sets > 0).sort((first, second) => second[1] - first[1]);
}

function describeWeeklyMuscles(totals) {
  return totals.map(([muscle, sets]) => `${MUSCLES[muscle].label} ${formatNumber(roundToStep(sets, 0.5))}`).join(", ");
}

export function renderWeeklyMuscleCard() {
  const totals = weeklyMuscleSets();
  if (totals.length === 0) return renderCardMessage("Sobald du diese Woche trainierst, siehst du hier, welche Muskeln wie viel gearbeitet haben.");
  const levels = Object.fromEntries(totals.map(([muscle, sets]) => [muscle, WEEKLY_SET_LEVELS.find((level) => sets < level.below).level]));
  const legend = WEEKLY_SET_LEVELS.map((level) => `
    <li class="level-legend-item"><span class="muscle-swatch is-${level.level}" aria-hidden="true"></span>${level.label}</li>`).join("");
  return `
    <div class="muscle-figures" role="img" aria-label="${escapeHtml(`Sätze pro Muskel diese Woche: ${describeWeeklyMuscles(totals)}`)}">${renderMuscleLevels(levels)}</div>
    <ul class="level-legend">${legend}</ul>
    <p class="card-footnote">Meiste Sätze: ${escapeHtml(describeWeeklyMuscles(totals.slice(0, 4)))}</p>`;
}
