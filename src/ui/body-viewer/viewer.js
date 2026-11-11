import { buildShell } from "./body-shell.js";
import { createProgram, deleteMesh, uploadMesh } from "./gpu.js";
import { MeshBuilder } from "./mesh-builder.js";
import { readPalette } from "./palette.js";
import { buildSkeleton } from "./skeleton.js";
import { lookAt, multiply, perspective, upperLeft3x3, yawMatrix } from "./vector-math.js";

const MODEL_CENTER_Y = 0.9;
const FIELD_OF_VIEW = (22 * Math.PI) / 180;
const FIT_HEIGHT = 1.9;
const FIT_WIDTH = 0.78;
const CAMERA_ELEVATION = 0.07;
const RESTING_YAW = 0.42;
const INTRO_START_YAW = -0.5;
const INTRO_MS = 1400;
const DRAG_SENSITIVITY = 0.011;
const INERTIA_DECAY = 0.92;
const MIN_SPIN_SPEED = 0.0006;
const KEY_STEP = Math.PI / 8;
const MAX_DEVICE_PIXEL_RATIO = 3;

function buildGroundMesh() {
  const ground = new MeshBuilder();
  const center = ground.pushVertex([0, 0, 0]);
  const steps = 32;
  for (let step = 0; step < steps; step += 1) {
    const angle = (step / steps) * Math.PI * 2;
    ground.pushVertex([Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.3]);
  }
  for (let step = 0; step < steps; step += 1) ground.indices.push(center, 1 + step, 1 + ((step + 1) % steps));
  return ground.build();
}

function easeOutCubic(progress) {
  return 1 - (1 - progress) ** 3;
}

/**
 * Interactive skeleton inside a translucent body whose girth follows the body fat estimate.
 * Returns null when WebGL is unavailable.
 */
export function createBodyViewer(canvas, { reducedMotion }) {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) return null;

  const skeleton = buildSkeleton();
  const ground = buildGroundMesh();
  let resources = null;
  let body = { bodyFat: null, sex: "" };
  let yaw = RESTING_YAW;
  let spin = 0;
  let drag = null;
  let intro = null;
  let frame = 0;

  function createResources() {
    resources = {
      program: createProgram(gl),
      bones: uploadMesh(gl, skeleton.bones),
      sockets: uploadMesh(gl, skeleton.sockets),
      ground: uploadMesh(gl, ground),
      shell: uploadMesh(gl, buildShell(body.bodyFat, body.sex)),
    };
  }

  function drawMesh(buffers) {
    const { program } = resources;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.enableVertexAttribArray(program.position);
    gl.vertexAttribPointer(program.position, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.enableVertexAttribArray(program.normal);
    gl.vertexAttribPointer(program.normal, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
    gl.drawElements(gl.TRIANGLES, buffers.count, gl.UNSIGNED_SHORT, 0);
  }

  function cameraFor(aspect) {
    const halfAngle = FIELD_OF_VIEW / 2;
    const distanceForHeight = FIT_HEIGHT / 2 / Math.tan(halfAngle);
    const distanceForWidth = FIT_WIDTH / 2 / (Math.tan(halfAngle) * aspect);
    const distance = Math.max(distanceForHeight, distanceForWidth);
    const eye = [0, MODEL_CENTER_Y + Math.sin(CAMERA_ELEVATION) * distance, Math.cos(CAMERA_ELEVATION) * distance];
    const view = lookAt(eye, [0, MODEL_CENTER_Y, 0], [0, 1, 0]);
    return { eye, viewProjection: multiply(perspective(FIELD_OF_VIEW, aspect, 0.1, distance * 3), view) };
  }

  function draw() {
    frame = 0;
    if (!resources || gl.isContextLost() || canvas.width === 0 || canvas.height === 0) return;
    const palette = readPalette(canvas);
    const { program } = resources;
    const camera = cameraFor(canvas.width / canvas.height);
    const model = yawMatrix(yaw);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program.program);
    gl.uniformMatrix4fv(program.uniforms.uViewProjection, false, camera.viewProjection);
    gl.uniformMatrix4fv(program.uniforms.uModel, false, model);
    gl.uniformMatrix3fv(program.uniforms.uNormalMatrix, false, upperLeft3x3(model));
    gl.uniform3fv(program.uniforms.uCamera, camera.eye);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.disable(gl.DEPTH_TEST);
    gl.uniform1f(program.uniforms.uMode, 2);
    gl.uniform1f(program.uniforms.uOpacity, palette.shadowOpacity);
    gl.uniform3fv(program.uniforms.uColor, palette.shadow);
    drawMesh(resources.ground);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.uniform1f(program.uniforms.uMode, 0);
    gl.uniform3fv(program.uniforms.uColor, palette.bone);
    drawMesh(resources.bones);
    gl.uniform3fv(program.uniforms.uColor, palette.socket);
    drawMesh(resources.sockets);

    gl.colorMask(false, false, false, false);
    drawMesh(resources.shell);
    gl.colorMask(true, true, true, true);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.uniform1f(program.uniforms.uMode, 1);
    gl.uniform1f(program.uniforms.uOpacity, palette.shellOpacity);
    gl.uniform3fv(program.uniforms.uColor, palette.shell);
    drawMesh(resources.shell);
    gl.depthMask(true);
  }

  function requestDraw() {
    if (!frame) frame = requestAnimationFrame(step);
  }

  function step(now) {
    frame = 0;
    if (intro) {
      const progress = Math.min(1, (now - intro.startedAt) / INTRO_MS);
      yaw = INTRO_START_YAW + (RESTING_YAW - INTRO_START_YAW) * easeOutCubic(progress);
      if (progress >= 1) intro = null;
    } else if (!drag && Math.abs(spin) > MIN_SPIN_SPEED) {
      yaw += spin;
      spin *= INERTIA_DECAY;
    }
    draw();
    if (intro || (!drag && Math.abs(spin) > MIN_SPIN_SPEED)) requestDraw();
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
    const width = Math.round(canvas.clientWidth * ratio);
    const height = Math.round(canvas.clientHeight * ratio);
    if (width === canvas.width && height === canvas.height) return;
    canvas.width = width;
    canvas.height = height;
    draw();
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    intro = null;
    spin = 0;
    drag = { x: event.clientX, lastMove: performance.now() };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-dragging");
  }

  function handlePointerMove(event) {
    if (!drag) return;
    const delta = (event.clientX - drag.x) * DRAG_SENSITIVITY;
    drag.x = event.clientX;
    drag.lastMove = performance.now();
    yaw += delta;
    spin = reducedMotion.matches ? 0 : delta;
    requestDraw();
  }

  function handlePointerUp() {
    if (!drag) return;
    if (performance.now() - drag.lastMove > 80) spin = 0;
    drag = null;
    canvas.classList.remove("is-dragging");
    requestDraw();
  }

  function handleKeydown(event) {
    const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!direction) return;
    event.preventDefault();
    intro = null;
    spin = 0;
    yaw += direction * KEY_STEP;
    requestDraw();
  }

  function handleDoubleClick() {
    spin = 0;
    yaw = RESTING_YAW;
    requestDraw();
  }

  function handleContextLost(event) {
    event.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
    resources = null;
  }

  function handleContextRestored() {
    createResources();
    draw();
  }

  createResources();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const listeners = [
    ["pointerdown", handlePointerDown],
    ["pointermove", handlePointerMove],
    ["pointerup", handlePointerUp],
    ["pointercancel", handlePointerUp],
    ["keydown", handleKeydown],
    ["dblclick", handleDoubleClick],
    ["webglcontextlost", handleContextLost],
    ["webglcontextrestored", handleContextRestored],
  ];
  for (const [type, listener] of listeners) canvas.addEventListener(type, listener);

  return {
    setBody(nextBody) {
      if (nextBody.bodyFat === body.bodyFat && nextBody.sex === body.sex) return;
      body = { bodyFat: nextBody.bodyFat, sex: nextBody.sex };
      if (!resources) return;
      deleteMesh(gl, resources.shell);
      resources.shell = uploadMesh(gl, buildShell(body.bodyFat, body.sex));
      requestDraw();
    },
    playIntro() {
      if (reducedMotion.matches) {
        yaw = RESTING_YAW;
        requestDraw();
        return;
      }
      spin = 0;
      intro = { startedAt: performance.now() };
      requestDraw();
    },
    redraw() {
      resize();
      requestDraw();
    },
    destroy() {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      for (const [type, listener] of listeners) canvas.removeEventListener(type, listener);
    },
  };
}
