const VERTEX_SHADER = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  uniform mat4 uModel;
  uniform mat3 uNormalMatrix;
  uniform mat4 uViewProjection;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vec4 world = uModel * vec4(aPosition, 1.0);
    vWorld = world.xyz;
    vNormal = uNormalMatrix * aNormal;
    gl_Position = uViewProjection * world;
  }`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec3 uColor;
  uniform vec3 uCamera;
  uniform float uMode;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    if (uMode > 1.5) {
      float distance = length(vWorld.xz / vec2(0.34, 0.24));
      float alpha = uOpacity * (1.0 - smoothstep(0.0, 1.0, distance));
      gl_FragColor = vec4(uColor * alpha, alpha);
      return;
    }
    vec3 normal = normalize(vNormal);
    vec3 toCamera = normalize(uCamera - vWorld);
    if (dot(normal, toCamera) < 0.0) normal = -normal;
    vec3 keyLight = normalize(vec3(-0.45, 0.75, 0.9));
    vec3 fillLight = normalize(vec3(0.7, 0.15, 0.5));
    vec3 rimLight = normalize(vec3(0.1, 0.35, -1.0));
    float ambient = mix(0.34, 0.52, normal.y * 0.5 + 0.5);
    float diffuse = max(dot(normal, keyLight), 0.0) * 0.72 + max(dot(normal, fillLight), 0.0) * 0.26 + max(dot(normal, rimLight), 0.0) * 0.3;
    if (uMode > 0.5) {
      float facing = abs(dot(normal, toCamera));
      float fresnel = pow(1.0 - facing, 1.7);
      float alpha = uOpacity * (0.16 + 0.84 * fresnel);
      vec3 color = uColor * (0.62 + 0.5 * diffuse);
      gl_FragColor = vec4(color * alpha, alpha);
      return;
    }
    float specular = pow(max(dot(normal, normalize(keyLight + toCamera)), 0.0), 36.0) * 0.22;
    gl_FragColor = vec4(uColor * (ambient + diffuse) + specular, 1.0);
  }`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    throw new Error(`Shader compile failed: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

export function createProgram(gl) {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
  }
  const uniforms = {};
  for (const name of ["uModel", "uNormalMatrix", "uViewProjection", "uColor", "uCamera", "uMode", "uOpacity"]) uniforms[name] = gl.getUniformLocation(program, name);
  return { program, uniforms, position: gl.getAttribLocation(program, "aPosition"), normal: gl.getAttribLocation(program, "aNormal") };
}

export function uploadMesh(gl, mesh) {
  const buffers = { count: mesh.indices.length, position: gl.createBuffer(), normal: gl.createBuffer(), index: gl.createBuffer() };
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
  return buffers;
}

export function deleteMesh(gl, buffers) {
  if (!buffers) return;
  gl.deleteBuffer(buffers.position);
  gl.deleteBuffer(buffers.normal);
  gl.deleteBuffer(buffers.index);
}
