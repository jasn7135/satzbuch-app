import { MeshBuilder } from "./mesh-builder.js";
import { mirrored, SIDES } from "./symmetry.js";

function addSkull(bones, sockets) {
  bones.addEllipsoid([0, 1.655, -0.01], [0.072, 0.088, 0.094], [0, 0, 0], 16, 22);
  bones.addEllipsoid([0, 1.588, 0.042], [0.05, 0.042, 0.046]);
  bones.addTube([[-0.052, 1.592, -0.004], [-0.05, 1.548, 0.012], [-0.03, 1.533, 0.058], [0, 1.53, 0.07], [0.03, 1.533, 0.058], [0.05, 1.548, 0.012], [0.052, 1.592, -0.004]], [0.008, 0.01, 0.01, 0.011, 0.01, 0.01, 0.008], { sides: 8 });
  for (const side of SIDES) {
    bones.addEllipsoid(mirrored(side, [0.052, 1.612, 0.04]), [0.014, 0.01, 0.024]);
    sockets.addEllipsoid(mirrored(side, [0.03, 1.636, 0.069]), [0.018, 0.015, 0.007]);
  }
  sockets.addEllipsoid([0, 1.603, 0.084], [0.009, 0.013, 0.005]);
}

function spineDepthAt(y) {
  const curve = [[1.56, -0.012], [1.47, -0.03], [1.33, -0.062], [1.19, -0.05], [1.1, -0.03], [1.03, -0.036]];
  for (let index = 0; index < curve.length - 1; index += 1) {
    const [upperY, upperZ] = curve[index];
    const [lowerY, lowerZ] = curve[index + 1];
    if (y <= upperY && y >= lowerY) return upperZ + ((upperY - y) / (upperY - lowerY)) * (lowerZ - upperZ);
  }
  return curve.at(-1)[1];
}

function addSpine(bones) {
  const sections = [
    { count: 7, top: 1.555, bottom: 1.47, size: [0.016, 0.009, 0.014] },
    { count: 12, top: 1.45, bottom: 1.19, size: [0.019, 0.011, 0.017] },
    { count: 5, top: 1.168, bottom: 1.04, size: [0.025, 0.013, 0.021] },
  ];
  for (const section of sections) {
    for (let index = 0; index < section.count; index += 1) {
      const y = section.top - (index / (section.count - 1)) * (section.top - section.bottom);
      const z = spineDepthAt(y);
      bones.addEllipsoid([0, y, z], section.size, [0, 0, 0], 8, 12);
      bones.addEllipsoid([0, y - 0.006, z - section.size[2] - 0.012], [0.005, 0.008, 0.012], [0.4, 0, 0], 6, 8);
    }
  }
  bones.addEllipsoid([0, 0.985, -0.058], [0.045, 0.055, 0.02], [-0.35, 0, 0]);
  bones.addEllipsoid([0, 0.925, -0.05], [0.012, 0.018, 0.008], [-0.5, 0, 0], 6, 8);
}

function ribPoint(rib, side, theta) {
  return [side * rib.halfWidth * Math.sin(theta), rib.backY - rib.drop * (1 - Math.cos(theta)) / 2, rib.centerZ - rib.halfDepth * Math.cos(theta)];
}

function describeRib(index) {
  const growth = Math.sin(Math.min(1, (index + 1) / 8) * (Math.PI / 2));
  const halfWidth = index <= 8 ? 0.058 + 0.087 * growth : 0.145 - (index - 8) * 0.012;
  const halfDepth = 0.08 + 0.016 * growth;
  const isFloating = index >= 10;
  const isFalse = index >= 7 && !isFloating;
  const endAngle = isFloating ? Math.PI * 0.55 : isFalse ? Math.PI - 0.16 - (index - 6) * 0.2 : Math.PI - 0.16;
  return { halfWidth, halfDepth, backY: 1.445 - index * 0.0235, drop: 0.05 + 0.045 * (index / 11), centerZ: -0.07 + halfDepth, endAngle, isFalse };
}

function addRibcage(bones) {
  for (let index = 0; index < 12; index += 1) {
    const rib = describeRib(index);
    for (const side of SIDES) {
      const samples = Array.from({ length: 16 }, (_, step) => ribPoint(rib, side, 0.2 + (step / 15) * (rib.endAngle - 0.2)));
      bones.addTube(samples, samples.map(() => [0.0055, 0.0045]), { sides: 6, reference: [0, 1, 0] });
      if (rib.isFalse) {
        const end = samples.at(-1);
        bones.addTube([end, [side * 0.045, 1.245 + (9 - index) * 0.012, 0.096], [side * 0.016, 1.235 + (9 - index) * 0.014, 0.1]], [0.005, 0.0045, 0.0045], { sides: 6 });
      }
    }
  }
  bones.addEllipsoid([0, 1.31, 0.094], [0.019, 0.088, 0.009], [-0.18, 0, 0]);
}

function addShoulderGirdle(bones) {
  for (const side of SIDES) {
    const at = (point) => mirrored(side, point);
    bones.addTube([at([0.018, 1.44, 0.085]), at([0.07, 1.455, 0.07]), at([0.12, 1.462, 0.036]), at([0.166, 1.466, -0.012])], [0.008, 0.007, 0.007, 0.009], { sides: 8 });
    bones.addEllipsoid(at([0.094, 1.35, -0.1]), [0.054, 0.074, 0.008], [0, -0.42 * side, 0], 10, 14);
    bones.addTube([at([0.07, 1.4, -0.11]), at([0.12, 1.43, -0.085]), at([0.165, 1.462, -0.035])], [0.006, 0.008, 0.009], { sides: 8 });
  }
}

function addArms(bones) {
  for (const side of SIDES) {
    const at = (point) => mirrored(side, point);
    bones.addEllipsoid(at([0.18, 1.425, -0.02]), [0.024, 0.024, 0.024]);
    bones.addTube([at([0.185, 1.41, -0.02]), at([0.205, 1.27, -0.025]), at([0.222, 1.135, -0.02])], [0.017, 0.012, 0.014], { sides: 10 });
    bones.addEllipsoid(at([0.224, 1.125, -0.02]), [0.026, 0.014, 0.015]);
    bones.addEllipsoid(at([0.22, 1.128, -0.036]), [0.012, 0.012, 0.012], [0, 0, 0], 8, 10);
    bones.addTube([at([0.218, 1.12, -0.03]), at([0.245, 0.98, -0.005]), at([0.258, 0.875, 0.012])], [0.011, 0.008, 0.007], { sides: 8 });
    bones.addTube([at([0.232, 1.112, -0.005]), at([0.255, 0.99, 0.015]), at([0.272, 0.88, 0.022])], [0.008, 0.008, 0.012], { sides: 8 });
    addHand(bones, side);
  }
}

function addHand(bones, side) {
  const at = (point) => mirrored(side, point);
  bones.addEllipsoid(at([0.268, 0.86, 0.02]), [0.014, 0.013, 0.023], [0, 0, 0], 8, 12);
  const fingerLengths = [0.115, 0.13, 0.122, 0.1];
  fingerLengths.forEach((length, finger) => {
    const z = 0.002 + finger * 0.0125;
    const top = 0.846;
    bones.addTube(
      [at([0.272, top, z]), at([0.277, top - length * 0.45, z + 0.001]), at([0.278, top - length * 0.75, z + 0.004]), at([0.275, top - length, z + 0.009])],
      [0.0055, 0.0048, 0.0042, 0.0036],
      { sides: 6 }
    );
  });
  bones.addTube([at([0.266, 0.855, 0.034]), at([0.27, 0.822, 0.054]), at([0.269, 0.79, 0.064]), at([0.266, 0.765, 0.067])], [0.0065, 0.0055, 0.0048, 0.004], { sides: 6 });
}

function iliacWing(side) {
  const columns = 10;
  const rows = 7;
  return Array.from({ length: rows }, (_, row) => {
    const height = row / (rows - 1);
    const spread = 0.35 + 0.65 * height;
    const radiusX = 0.072 + 0.07 * height;
    const radiusZ = 0.05 + 0.03 * height;
    return Array.from({ length: columns }, (_, column) => {
      const angle = 1.35 + (0.45 + (column / (columns - 1)) * 1.45 - 1.35) * spread;
      const crestLift = 0.03 * Math.sin(angle) * height;
      return [side * Math.sin(angle) * radiusX, 0.95 + height * 0.1 + crestLift, -0.01 - Math.cos(angle) * radiusZ];
    });
  });
}

function addPelvis(bones) {
  for (const side of SIDES) {
    const at = (point) => mirrored(side, point);
    const wing = iliacWing(side);
    bones.addSurface(wing);
    bones.addTube(wing.at(-1), wing.at(-1).map(() => 0.0065), { sides: 8 });
    bones.addEllipsoid(at([0.082, 0.94, 0.004]), [0.03, 0.03, 0.03]);
    bones.addTube([at([0.075, 0.946, 0.034]), at([0.03, 0.93, 0.072]), at([0.007, 0.925, 0.078])], [0.011, 0.01, 0.011], { sides: 8 });
    bones.addTube([at([0.08, 0.928, -0.012]), at([0.066, 0.886, -0.024]), at([0.042, 0.898, 0.036]), at([0.01, 0.918, 0.072])], [0.012, 0.012, 0.009, 0.009], { sides: 8 });
  }
}

function addLegs(bones) {
  for (const side of SIDES) {
    const at = (point) => mirrored(side, point);
    bones.addEllipsoid(at([0.085, 0.94, 0]), [0.023, 0.023, 0.023]);
    bones.addTube([at([0.085, 0.94, 0]), at([0.126, 0.915, -0.005])], [0.013, 0.013], { sides: 8 });
    bones.addEllipsoid(at([0.135, 0.92, -0.01]), [0.017, 0.022, 0.018]);
    bones.addTube([at([0.13, 0.91, -0.005]), at([0.115, 0.72, 0.008]), at([0.095, 0.53, 0])], [0.016, 0.014, 0.017], { sides: 10 });
    bones.addEllipsoid(at([0.093, 0.507, -0.005]), [0.03, 0.02, 0.026]);
    bones.addEllipsoid(at([0.093, 0.512, 0.03]), [0.017, 0.022, 0.008]);
    bones.addEllipsoid(at([0.092, 0.478, -0.003]), [0.032, 0.012, 0.027]);
    bones.addTube([at([0.092, 0.48, -0.002]), at([0.09, 0.3, 0.004]), at([0.088, 0.085, -0.005])], [0.022, 0.013, 0.016], { sides: 10 });
    bones.addTube([at([0.118, 0.465, -0.018]), at([0.115, 0.28, -0.015]), at([0.112, 0.08, -0.012])], [0.008, 0.006, 0.009], { sides: 8 });
    addFoot(bones, side);
  }
}

function addFoot(bones, side) {
  const at = (point) => mirrored(side, point);
  bones.addEllipsoid(at([0.09, 0.045, -0.03]), [0.02, 0.025, 0.04]);
  bones.addEllipsoid(at([0.093, 0.04, 0.03]), [0.03, 0.016, 0.035]);
  for (let toe = 0; toe < 5; toe += 1) {
    const x = 0.072 + toe * 0.011;
    const length = 0.15 - toe * 0.012;
    const radius = toe === 0 ? 0.008 : 0.0062;
    bones.addTube([at([x, 0.035, 0.05]), at([x + 0.002, 0.02, length - 0.03]), at([x + 0.003, 0.012, length])], [radius, radius * 0.9, radius * 0.8], { sides: 6 });
  }
}

export function buildSkeleton() {
  const bones = new MeshBuilder();
  const sockets = new MeshBuilder();
  addSkull(bones, sockets);
  addSpine(bones);
  addRibcage(bones);
  addShoulderGirdle(bones);
  addArms(bones);
  addPelvis(bones);
  addLegs(bones);
  return { bones: bones.build(), sockets: sockets.build() };
}
