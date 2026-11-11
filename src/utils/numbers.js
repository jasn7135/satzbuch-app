export function parseNumber(text) {
  const value = Number.parseFloat(String(text).replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function roundToHundredths(value) {
  return Math.round(value * 100) / 100;
}

export function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

export function roundToStep(value, step) {
  return Math.round(value / step) * step;
}

export function parseWholeNumber(text) {
  const compact = String(text).replace(/\s/g, "");
  const withoutGrouping = /^\d{1,3}(\.\d{3})+$/.test(compact) ? compact.replace(/\./g, "") : compact;
  const value = parseNumber(withoutGrouping);
  return value === null ? Number.NaN : Math.round(value);
}
