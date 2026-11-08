import * as THREE from 'three';
import {createStudy, timeAtFrame, validateViewport, cameraFit} from './core.mjs';

const vertexShader = `
attribute vec3 particleColor;
attribute float particleSize;
attribute float particleAlpha;
uniform float pixelRatio;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = particleColor; vAlpha = particleAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(particleSize * pixelRatio * 10.0 / max(1.0, -mv.z), 0.5, 20.0);
}`;
const fragmentShader = `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float r = length(gl_PointCoord - vec2(0.5)) * 2.0;
  if (r > 1.0) discard;
  float glow = exp(-4.0 * r * r) * (1.0 - smoothstep(0.75, 1.0, r));
  gl_FragColor = vec4(vColor, glow * vAlpha);
  #include <colorspace_fragment>
}`;

/** Creates GPU resources only when explicitly invoked by a future permitted renderer.
 * No browser/WebGL execution or visual validation has been performed for this rebuild.
 */
export function createParticleScene({canvas, width = 1280, height = 720, pixelRatio = 1,
  count = 2400, seed = 53117, targetAt} = {}) {
  validateViewport(width, height, pixelRatio);
  const study = createStudy({count, seed, targetAt});
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: false, preserveDrawingBuffer: false});
  renderer.setClearColor(0x030810, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(0, 0, 13);
  const material = new THREE.ShaderMaterial({vertexShader, fragmentShader,
    uniforms: {pixelRatio: {value: pixelRatio}}, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending});
  function pointLayer(size) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(size * 3), 3));
    geometry.setAttribute('particleColor', new THREE.BufferAttribute(new Float32Array(size * 3), 3));
    geometry.setAttribute('particleSize', new THREE.BufferAttribute(new Float32Array(size), 1));
    geometry.setAttribute('particleAlpha', new THREE.BufferAttribute(new Float32Array(size), 1));
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false; // Moving buffers; no stale bounding sphere.
    scene.add(points);
    return points;
  }
  const particles = pointLayer(count), trails = pointLayer(count * 5), signal = pointLayer(6);
  const edgeCoordinates = study.graph.edges.flatMap(([a, b]) => [...study.graph.nodes[a], ...study.graph.nodes[b]]);
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgeCoordinates, 3));
  const edgeMaterial = new THREE.LineBasicMaterial({color: 0x155367, transparent: true, opacity: 0.15, depthWrite: false});
  const branches = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  scene.add(branches);
  function write(layer, state, offset = 0, fade = 1) {
    const attrs = layer.geometry.attributes;
    attrs.position.array.set(state.positions, offset * 3);
    attrs.particleColor.array.set(state.colors, offset * 3);
    attrs.particleSize.array.set(state.sizes, offset);
    for (let i = 0; i < state.alphas.length; i++) attrs.particleAlpha.array[offset + i] = state.alphas[i] * fade;
    Object.values(attrs).forEach(attribute => { attribute.needsUpdate = true; });
  }
  let disposed = false;
  function assertLive() { if (disposed) throw new Error('Scene has been disposed'); }
  function resize(w, h, ratio = 1) {
    assertLive(); validateViewport(w, h, ratio);
    renderer.setPixelRatio(ratio); renderer.setSize(w, h, false);
    material.uniforms.pixelRatio.value = ratio;
    const fit = cameraFit(w, h, study.boundsRadius, camera.fov);
    camera.aspect = fit.aspect;
    camera.position.z = fit.distance;
    camera.near = fit.near;
    camera.far = fit.far;
    camera.updateProjectionMatrix();
  }
  function renderAtFrame(frame, fps = 30) {
    assertLive();
    const time = timeAtFrame(frame, fps), history = study.sampleHistory(time);
    write(particles, history[0]);
    // Finite temporal samples, recomputed on every seek. No framebuffer accumulation.
    history.slice(1).forEach((state, i) => write(trails, state, count * i, (1 - (i + 1) / 6) * 0.10));
    history.forEach((state, i) => write(signal, {
      positions: state.signalPosition, colors: [1, 0.68, 0.25], sizes: [i ? 3 : 6],
      alphas: [state.signalAlpha * (1 - i / 6)],
    }, i));
    branches.visible = time < 4;
    renderer.render(scene, camera);
    return {frame, fps, time, stage: history[0].stage};
  }
  function dispose() {
    if (disposed) return;
    [particles, trails, signal].forEach(layer => layer.geometry.dispose());
    edgeGeometry.dispose(); edgeMaterial.dispose(); material.dispose(); renderer.dispose();
    disposed = true;
  }
  resize(width, height, pixelRatio);
  return Object.freeze({renderAtFrame, resize, dispose, study});
}
