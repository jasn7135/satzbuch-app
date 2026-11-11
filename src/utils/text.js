export function escapeHtml(text) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(text).replace(/[&<>"']/g, (character) => entities[character]);
}

export function sanitizeName(text, maxLength) {
  return String(text).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function normalizeSearchText(text) {
  return String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/\s+/g, " ").trim();
}
