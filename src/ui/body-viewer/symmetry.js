export const SIDES = [1, -1];

export function mirrored(side, [x, y, z]) {
  return [side * x, y, z];
}
