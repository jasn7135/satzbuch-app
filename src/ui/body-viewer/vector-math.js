export function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

export function scaleVector(vector, factor) {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}

export function addVectors(...vectors) {
  return vectors.reduce((total, vector) => [total[0] + vector[0], total[1] + vector[1], total[2] + vector[2]], [0, 0, 0]);
}

export function rotationMatrix3([pitch, yaw, roll]) {
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(pitch), Math.sin(pitch), Math.cos(yaw), Math.sin(yaw), Math.cos(roll), Math.sin(roll)];
  const rotateX = (v) => [v[0], cx * v[1] - sx * v[2], sx * v[1] + cx * v[2]];
  const rotateY = (v) => [cy * v[0] + sy * v[2], v[1], -sy * v[0] + cy * v[2]];
  const rotateZ = (v) => [cz * v[0] - sz * v[1], sz * v[0] + cz * v[1], v[2]];
  return (vector) => rotateY(rotateZ(rotateX(vector)));
}

export function perspective(fieldOfView, aspect, near, far) {
  const focal = 1 / Math.tan(fieldOfView / 2);
  return new Float32Array([focal / aspect, 0, 0, 0, 0, focal, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0]);
}

export function lookAt(eye, target, up) {
  const zAxis = normalize(subtract(eye, target));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);
  return new Float32Array([
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1,
  ]);
}

export function multiply(a, b) {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let total = 0;
      for (let k = 0; k < 4; k += 1) total += a[k * 4 + row] * b[column * 4 + k];
      out[column * 4 + row] = total;
    }
  }
  return out;
}

export function yawMatrix(angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return new Float32Array([cosine, 0, -sine, 0, 0, 1, 0, 0, sine, 0, cosine, 0, 0, 0, 0, 1]);
}

export function upperLeft3x3(matrix) {
  return new Float32Array([matrix[0], matrix[1], matrix[2], matrix[4], matrix[5], matrix[6], matrix[8], matrix[9], matrix[10]]);
}
