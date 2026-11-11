import { addVectors, cross, dot, normalize, rotationMatrix3, scaleVector, subtract } from "./vector-math.js";

export class MeshBuilder {
  constructor() {
    this.positions = [];
    this.indices = [];
  }

  vertexCount() {
    return this.positions.length / 3;
  }

  pushVertex(point) {
    this.positions.push(point[0], point[1], point[2]);
    return this.vertexCount() - 1;
  }

  addEllipsoid(center, radii, rotation = [0, 0, 0], latitudeBands = 12, longitudeBands = 18) {
    const rotate = rotationMatrix3(rotation);
    const place = (unit) => addVectors(center, rotate([unit[0] * radii[0], unit[1] * radii[1], unit[2] * radii[2]]));
    const top = this.pushVertex(place([0, 1, 0]));
    const firstRing = this.vertexCount();
    for (let band = 1; band < latitudeBands; band += 1) {
      const theta = (band / latitudeBands) * Math.PI;
      for (let step = 0; step < longitudeBands; step += 1) {
        const phi = (step / longitudeBands) * Math.PI * 2;
        this.pushVertex(place([Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)]));
      }
    }
    const bottom = this.pushVertex(place([0, -1, 0]));
    const ringIndex = (band, step) => firstRing + band * longitudeBands + (step % longitudeBands);
    for (let step = 0; step < longitudeBands; step += 1) {
      this.indices.push(top, ringIndex(0, step + 1), ringIndex(0, step));
      this.indices.push(bottom, ringIndex(latitudeBands - 2, step), ringIndex(latitudeBands - 2, step + 1));
    }
    for (let band = 0; band < latitudeBands - 2; band += 1) {
      for (let step = 0; step < longitudeBands; step += 1) {
        const a = ringIndex(band, step);
        const b = ringIndex(band, step + 1);
        const c = ringIndex(band + 1, step);
        const d = ringIndex(band + 1, step + 1);
        this.indices.push(a, b, c, b, d, c);
      }
    }
  }

  /** Tube through points; each radius is a number or [across, along reference axis]. */
  addTube(points, radii, { sides = 10, reference = [0, 0, 1], capped = true } = {}) {
    const ringStarts = [];
    points.forEach((point, index) => {
      const previous = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      const tangent = normalize(subtract(next, previous));
      const projected = subtract(reference, scaleVector(tangent, dot(reference, tangent)));
      const normal = normalize(Math.hypot(...projected) < 1e-4 ? [1, 0, 0] : projected);
      const binormal = cross(tangent, normal);
      const radius = Array.isArray(radii[index]) ? radii[index] : [radii[index], radii[index]];
      ringStarts.push(this.vertexCount());
      for (let side = 0; side < sides; side += 1) {
        const angle = (side / sides) * Math.PI * 2;
        this.pushVertex(addVectors(point, scaleVector(binormal, Math.cos(angle) * radius[0]), scaleVector(normal, Math.sin(angle) * radius[1])));
      }
    });
    for (let ring = 0; ring < points.length - 1; ring += 1) {
      for (let side = 0; side < sides; side += 1) {
        const a = ringStarts[ring] + side;
        const b = ringStarts[ring] + ((side + 1) % sides);
        const c = ringStarts[ring + 1] + side;
        const d = ringStarts[ring + 1] + ((side + 1) % sides);
        this.indices.push(a, c, b, b, c, d);
      }
    }
    if (!capped) return;
    this.addCap(points[0], subtract(points[0], points[1]), ringStarts[0], sides, radii[0]);
    this.addCap(points.at(-1), subtract(points.at(-1), points.at(-2)), ringStarts.at(-1), sides, radii.at(-1));
  }

  /** Double-sided sheet through a grid of points (rows of equal length). */
  addSurface(grid) {
    const starts = grid.map((row) => {
      const start = this.vertexCount();
      for (const point of row) this.pushVertex(point);
      return start;
    });
    const columns = grid[0].length;
    for (let row = 0; row < grid.length - 1; row += 1) {
      for (let column = 0; column < columns - 1; column += 1) {
        const a = starts[row] + column;
        const c = starts[row + 1] + column;
        this.indices.push(a, c, a + 1, a + 1, c, c + 1);
      }
    }
  }

  addCap(point, outward, ringStart, sides, radius) {
    const reach = (Array.isArray(radius) ? Math.min(...radius) : radius) * 0.7;
    const tip = this.pushVertex(addVectors(point, scaleVector(normalize(outward), reach)));
    for (let side = 0; side < sides; side += 1) this.indices.push(tip, ringStart + side, ringStart + ((side + 1) % sides));
  }

  build() {
    const normals = new Float32Array(this.positions.length);
    for (let index = 0; index < this.indices.length; index += 3) {
      const [a, b, c] = [this.indices[index], this.indices[index + 1], this.indices[index + 2]];
      const pointA = this.positions.slice(a * 3, a * 3 + 3);
      const pointB = this.positions.slice(b * 3, b * 3 + 3);
      const pointC = this.positions.slice(c * 3, c * 3 + 3);
      const face = cross(subtract(pointB, pointA), subtract(pointC, pointA));
      for (const vertex of [a, b, c]) {
        normals[vertex * 3] += face[0];
        normals[vertex * 3 + 1] += face[1];
        normals[vertex * 3 + 2] += face[2];
      }
    }
    for (let vertex = 0; vertex < normals.length; vertex += 3) {
      const unit = normalize([normals[vertex], normals[vertex + 1], normals[vertex + 2]]);
      normals.set(unit, vertex);
    }
    if (this.vertexCount() > 65535) throw new RangeError("Mesh exceeds 16-bit index range");
    return { positions: new Float32Array(this.positions), normals, indices: new Uint16Array(this.indices) };
  }
}
