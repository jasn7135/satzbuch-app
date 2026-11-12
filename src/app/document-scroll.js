const TEXT_ENTRY_SELECTOR = "input, select, textarea";

function isEnteringText() {
  return document.activeElement?.matches(TEXT_ENTRY_SELECTOR) ?? false;
}

function resetDocumentScroll() {
  if (isEnteringText() || (window.scrollX === 0 && window.scrollY === 0)) return;
  window.scrollTo(0, 0);
}

/**
 * Only the screens scroll; the document itself must stay at the origin. iOS can leave it shifted
 * after the keyboard closes or restore a shifted position on relaunch, which puts taps off target.
 */
export function keepDocumentAtOrigin() {
  history.scrollRestoration = "manual";
  resetDocumentScroll();
  window.addEventListener("pageshow", resetDocumentScroll);
  document.addEventListener("visibilitychange", resetDocumentScroll);
  document.addEventListener("focusout", () => requestAnimationFrame(resetDocumentScroll));
  window.visualViewport?.addEventListener("resize", resetDocumentScroll);
}
