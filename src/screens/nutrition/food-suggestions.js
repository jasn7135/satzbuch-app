import { state } from "../../app/state.js";
import { FOOD_NAME_MAX_LENGTH } from "../../config/limits.js";
import { FOODS } from "../../data/foods.js";
import { ICONS } from "../../svg/icons.js";
import { formatInteger } from "../../utils/format.js";
import { escapeHtml, normalizeSearchText, sanitizeName } from "../../utils/text.js";

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
  const shownNames = new Set(recent.map(({ item }) => normalizeSearchText(item.name)));
  const byRelevance = (first, second) => Number(startsWith(second.name)) - Number(startsWith(first.name));
  const unseenMatches = (foods, source) => foods
    .filter((food) => matches(food.name) && !shownNames.has(normalizeSearchText(food.name)))
    .sort(byRelevance)
    .map((food) => {
      shownNames.add(normalizeSearchText(food.name));
      return { source, item: food };
    });
  const custom = unseenMatches(state.customFoods, "custom");
  const library = unseenMatches(FOODS, "library");
  return [...recent, ...custom, ...library].slice(0, FOOD_SUGGESTION_LIMIT);
}

function describeFoodSuggestion({ source, item }) {
  if (source === "recent") return ["Zuletzt", item.grams ? `${formatInteger(item.grams)}\u00a0g` : "", `${formatInteger(item.kcal)}\u00a0kcal`].filter(Boolean).join(" · ");
  const portion = item.portion ? ` · ${item.portion.label} = ${formatInteger(item.portion.grams)} g` : "";
  const origin = source === "custom" ? "Eigenes Lebensmittel · " : "";
  return `${origin}${formatInteger(item.per100.kcal)} kcal pro 100 g${portion}`;
}

function renderCreateFoodRow(query) {
  return `
    <div class="group add-row-group">
      <button class="add-row-button" type="button" data-action="create-custom-food-from-entry">
        <span class="add-badge" aria-hidden="true">${ICONS.plus}</span>
        <span>${escapeHtml(`„${query}“ als eigenes Lebensmittel anlegen`)}</span>
      </button>
    </div>`;
}

export function renderFoodSuggestions(query) {
  const suggestions = foodSuggestions(query);
  const trimmedQuery = sanitizeName(query, FOOD_NAME_MAX_LENGTH);
  const createRow = trimmedQuery ? renderCreateFoodRow(trimmedQuery) : "";
  if (suggestions.length === 0) return createRow;
  const heading = trimmedQuery ? "Vorschläge" : "Zuletzt gegessen";
  const rows = suggestions.map((suggestion) => `
    <button class="entry-row suggestion-row" type="button" data-action="pick-food" data-source="${suggestion.source}" data-key="${escapeHtml(suggestion.item.id)}">
      <span class="entry-text">
        <span class="entry-title">${escapeHtml(suggestion.item.name)}</span>
        <span class="entry-sub">${escapeHtml(describeFoodSuggestion(suggestion))}</span>
      </span>
      <span class="suggestion-add" aria-hidden="true">${ICONS.plus}</span>
    </button>`).join("");
  return `<p class="group-label">${heading}</p><div class="group">${rows}</div>${createRow}`;
}
