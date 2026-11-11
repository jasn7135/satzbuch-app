import { statsElements } from "./stats-screen.js";
import { createBodyViewer } from "../../ui/body-viewer/viewer.js";
import { reducedMotion } from "../../ui/preferences.js";
import { formatInteger } from "../../utils/format.js";

export let bodyViewer;

export function describeBodyModel(bodyFat) {
  const stature = bodyFat ? `bei etwa ${formatInteger(bodyFat.percent)} % Körperfett` : "mit durchschnittlicher Statur";
  return `3D-Modell: Skelett in einer durchscheinenden Körperhülle ${stature}. Mit den Pfeiltasten links und rechts drehen.`;
}

function showBodyModelUnsupported() {
  statsElements.bodyStage.classList.add("is-unsupported");
  statsElements.bodyStage.innerHTML = '<p class="body-stage-message">Die 3D-Ansicht braucht WebGL, das dieser Browser gerade nicht bereitstellt.</p>';
}

export function ensureBodyViewer() {
  if (bodyViewer !== undefined) return bodyViewer;
  try {
    bodyViewer = createBodyViewer(statsElements.bodyCanvas, { reducedMotion });
  } catch (error) {
    console.error(error);
    bodyViewer = null;
  }
  if (!bodyViewer) showBodyModelUnsupported();
  return bodyViewer;
}

export function hideBodyStageHint() {
  statsElements.bodyStageHint?.classList.add("is-hidden");
}
