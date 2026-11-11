import { reducedMotion } from "./preferences.js";

const COUNT_UP_MS = 650;
const ANIMATION_CLASSES = ["slide-in-from-right", "slide-in-from-left", "tab-enter", "fade-in", "roll-up", "roll-down", "lens-moving", "bounce", "pulse"];

export function playAnimation(element, className) {
  element.classList.remove(...ANIMATION_CLASSES);
  void element.getBoundingClientRect();
  element.classList.add(className);
  element.addEventListener("animationend", () => element.classList.remove(className), { once: true });
}

export function animateNumber(element, target, format) {
  const start = Number(element.dataset.value ?? 0);
  element.dataset.value = String(target);
  if (start === target || reducedMotion.matches) {
    element.textContent = format(target);
    return;
  }
  const startedAt = performance.now();
  const step = (now) => {
    if (element.dataset.value !== String(target)) return;
    const progress = Math.min(1, (now - startedAt) / COUNT_UP_MS);
    const eased = 1 - (1 - progress) ** 3;
    element.textContent = format(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
