function parseHexColor(text, fallback) {
  const match = /^#([0-9a-f]{6})$/i.exec(text.trim());
  if (!match) return fallback;
  const value = Number.parseInt(match[1], 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

export function readPalette(element) {
  const style = getComputedStyle(element);
  const read = (name, fallback) => parseHexColor(style.getPropertyValue(name), fallback);
  return {
    bone: read("--model-bone", [0.91, 0.88, 0.8]),
    socket: read("--model-socket", [0.25, 0.23, 0.2]),
    shell: read("--model-shell", [0.45, 0.47, 0.52]),
    shadow: read("--model-shadow", [0, 0, 0]),
    shellOpacity: Number.parseFloat(style.getPropertyValue("--model-shell-opacity")) || 0.6,
    shadowOpacity: Number.parseFloat(style.getPropertyValue("--model-shadow-opacity")) || 0.16,
  };
}
