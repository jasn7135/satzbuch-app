import { toast } from "../app/dom.js";

const TOAST_DURATION_MS = 4000;

let toastTimer = null;

export function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.remove("is-leaving");
  toast.hidden = false;
  toastTimer = setTimeout(hideToast, TOAST_DURATION_MS);
}

export function dismissToast() {
  clearTimeout(toastTimer);
  toast.hidden = true;
  toast.classList.remove("is-leaving");
}

function hideToast() {
  toast.classList.add("is-leaving");
  toast.addEventListener("animationend", () => {
    toast.hidden = true;
    toast.classList.remove("is-leaving");
  }, { once: true });
}
