import { MeshBuilder } from "./mesh-builder.js";
import { mirrored, SIDES } from "./symmetry.js";

const REFERENCE_BODY_FAT = { male: 15, female: 24 };
const FAT_LEVEL_LIMITS = { min: -0.35, max: 1.6 };
const FAT_SPAN = 20;

const TORSO_RINGS = [
  { y: 1.59, z: -0.005, width: 0.05, depth: 0.05, fat: 0.1 },
  { y: 1.53, z: -0.015, width: 0.056, depth: 0.056, fat: 0.14 },
  { y: 1.475, z: -0.015, width: 0.088, depth: 0.075, fat: 0.14, shoulder: true },
  { y: 1.44, z: -0.01, width: 0.168, depth: 0.096, fat: 0.08, shoulder: true },
  { y: 1.39, z: 0, width: 0.18, depth: 0.11, fat: 0.12, chest: true },
  { y: 1.32, z: 0.006, width: 0.172, depth: 0.118, fat: 0.16, chest: true },
  { y: 1.24, z: 0.002, width: 0.155, depth: 0.11, fat: 0.26, belly: 0.3 },
  { y: 1.16, z: 0, width: 0.14, depth: 0.1, fat: 0.4, belly: 0.55, waist: true },
  { y: 1.08, z: 0.002, width: 0.145, depth: 0.1, fat: 0.44, belly: 0.6 },
  { y: 1, z: -0.005, width: 0.16, depth: 0.102, fat: 0.3, hips: true },
  { y: 0.93, z: -0.012, width: 0.165, depth: 0.106, fat: 0.26, hips: true },
  { y: 0.87, z: -0.005, width: 0.14, depth: 0.086, fat: 0.2, hips: true },
];

const ARM_RINGS = [
  { at: [0.185, 1.455, -0.02], radius: 0.056, fat: 0.14 },
  { at: [0.2, 1.38, -0.022], radius: 0.05, fat: 0.24 },
  { at: [0.208, 1.28, -0.025], radius: 0.044, fat: 0.28 },
  { at: [0.222, 1.135, -0.02], radius: 0.036, fat: 0.14 },
  { at: [0.24, 1.03, -0.005], radius: 0.04, fat: 0.12 },
  { at: [0.262, 0.89, 0.015], radius: 0.026, fat: 0.05 },
  { at: [0.27, 0.86, 0.02], radius: 0.025, fat: 0.04 },
];

const LEG_RINGS = [
  { at: [0.09, 0.97, -0.005], radius: 0.088, fat: 0.24, thigh: true },
  { at: [0.1, 0.86, 0], radius: 0.09, fat: 0.28, thigh: true },
  { at: [0.105, 0.72, 0.005], radius: 0.075, fat: 0.28, thigh: true },
  { at: [0.098, 0.6, 0.008], radius: 0.062, fat: 0.2 },
  { at: [0.094, 0.51, 0.008], radius: 0.05, fat: 0.1 },
  { at: [0.092, 0.42, -0.008], radius: 0.052, fat: 0.12 },
  { at: [0.09, 0.33, -0.012], radius: 0.05, fat: 0.12 },
  { at: [0.089, 0.2, -0.005], radius: 0.036, fat: 0.06 },
  { at: [0.089, 0.09, -0.005], radius: 0.03, fat: 0.04 },
  { at: [0.09, 0.06, -0.01], radius: 0.032, fat: 0.04 },
];

function fatLevelFor(bodyFat, sex) {
  if (!Number.isFinite(bodyFat)) return 0;
  const reference = REFERENCE_BODY_FAT[sex] ?? REFERENCE_BODY_FAT.male;
  return Math.min(FAT_LEVEL_LIMITS.max, Math.max(FAT_LEVEL_LIMITS.min, (bodyFat - reference) / FAT_SPAN));
}

function torsoRingShape(ring, fatLevel, isFemale) {
  const growth = 1 + ring.fat * fatLevel;
  const bellyGrowth = 1 + (ring.belly ?? ring.fat) * fatLevel;
  let width = ring.width * growth;
  let depth = ring.depth * bellyGrowth;
  if (isFemale && ring.shoulder) width *= 0.9;
  if (isFemale && ring.chest) depth *= 1.06;
  if (isFemale && ring.waist) width *= 0.95;
  if (isFemale && ring.hips) width *= 1.1;
  const forward = (depth - ring.depth) * 0.45;
  return { point: [0, ring.y, ring.z + forward], radius: [width, depth] };
}

export function buildShell(bodyFat, sex) {
  const fatLevel = fatLevelFor(bodyFat, sex);
  const isFemale = sex === "female";
  const limbFat = isFemale ? 1.2 : 1;
  const shell = new MeshBuilder();
  const torso = TORSO_RINGS.map((ring) => torsoRingShape(ring, fatLevel, isFemale));
  shell.addTube(torso.map((ring) => ring.point), torso.map((ring) => ring.radius), { sides: 28 });
  for (const side of SIDES) {
    const arm = ARM_RINGS.map((ring) => ({ point: mirrored(side, ring.at), radius: ring.radius * (1 + ring.fat * fatLevel) }));
    shell.addTube(arm.map((ring) => ring.point), arm.map((ring) => ring.radius), { sides: 18 });
    const leg = LEG_RINGS.map((ring) => {
      const growth = 1 + ring.fat * fatLevel * (ring.thigh ? limbFat : 1);
      return { point: mirrored(side, ring.at), radius: ring.radius * growth };
    });
    shell.addTube(leg.map((ring) => ring.point), leg.map((ring) => ring.radius), { sides: 20 });
    shell.addEllipsoid(mirrored(side, [0.272, 0.79, 0.022]), [0.022, 0.075, 0.042]);
    shell.addEllipsoid(mirrored(side, [0.092, 0.04, 0.045]), [0.045, 0.04, 0.125]);
  }
  const faceGrowth = 1 + 0.08 * fatLevel;
  shell.addEllipsoid([0, 1.662, -0.006], [0.082, 0.1, 0.104], [0, 0, 0], 16, 24);
  shell.addEllipsoid([0, 1.575, 0.035], [0.06 * faceGrowth, 0.066, 0.072], [0, 0, 0], 14, 20);
  return shell.build();
}
