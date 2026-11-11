import { state } from "../../app/state.js";
import { FOODS } from "../../data/foods.js";
import { ICONS } from "../../svg/icons.js";
import { formatInteger } from "../../utils/format.js";
import { escapeHtml, normalizeSearchText } from "../../utils/text.js";

const FOOD_SUGGESTION_LIMIT = 6;
const RECENT_FOOD_LIMIT = 5;

function recentFoods() {
  const byName = new Map();
  for (const entry of [...state.nutrition.entries].reverse()) {
    const key = normalizeSearchText(entry.name);
    if (key && !byName.has(key)) byName.set(key, entry);
  }
  return [...byName.values()];
}

function foodSuggestions(query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return recentFoods().slice(0, RECENT_FOOD_LIMIT).map((entry) => ({ source: "recent", item: entry }));
  const matches = (name) => normalizeSearchText(name).includes(normalizedQuery);
  const startsWith = (name) => normalizeSearchText(name).startsWith(normalizedQuery);
  const recent = recentFoods().filter((entry) => matches(entry.name)).map((entry) => ({ source: "recent", item: entry }));
  const recentNames = new Set(recent.map(({ item }) => normalizeSearchText(item.name)));
  const library = FOODS
    .filter((food) => matches(food.name) && !recentNames.has(normalizeSearchText(food.name)))
    .sort((first, second) => Number(startsWith(second.name)) - Number(startsWith(first.name)))
    .map((food) => ({ source: "library", item: food }));
  return [...recent, ...library].slice(0, FOOD_SUGGESTION_LIMIT);
}

function describeFoodSuggestion({ source, item }) {
  if (source === "recent") return ["Zuletzt", item.grams ? `${formatInteger(item.grams)}\u00a0g` : "", `${formatInteger(item.kcal)}\u00a0kcal`].filter(Boolean).join(" · ");
  const portion = item.portion ? ` · ${item.portion.label} = ${formatInteger(item.portion.grams)} g` : "";
  return `${formatInteger(item.per100.kcal)} kcal pro 100 g${portion}`;
}

export function renderFoodSuggestions(query) {
  const suggestions = foodSuggestions(query);
  if (suggestions.length === 0) return "";
  const heading = normalizeSearchText(query) ? "Vorschläge" : "Zuletzt gegessen";
  const rows = suggestions.map((suggestion) => `
    <button class="entry-row suggestion-row" type="button" data-action="pick-food" data-source="${suggestion.source}" data-key="${escapeHtml(suggestion.item.id)}">
      <span class="entry-text">
        <span class="entry-title">${escapeHtml(suggestion.item.name)}</span>
        <span class="entry-sub">${escapeHtml(describeFoodSuggestion(suggestion))}</span>
      </span>
      <span class="suggestion-add" aria-hidden="true">${ICONS.plus}</span>
    </button>`).join("");
  return `<p class="group-label">${heading}</p><div class="group">${rows}</div>`;
}
