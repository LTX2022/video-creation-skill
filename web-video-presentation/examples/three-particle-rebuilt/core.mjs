/** Pure, seeded, seekable particle trajectories. Units: seconds and scene units. */
export const DURATION = 16;
export const WAVE_EVENTS = Object.freeze([
  Object.freeze({start: 4, speed: 2.6, color: 'gold'}),
  Object.freeze({start: 5, speed: 2.6, color: 'cyan'}),
  Object.freeze({start: 6, speed: 2.6, color: 'cyan'}),
]);
// RGB constants are linear working-space values; scene shader encodes output color space.
const CYAN = [0.12, 0.63, 0.79], GOLD = [1, 0.59, 0.16];
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const mix = (a, b, u) => u === 0 ? a : u === 1 ? b : a + (b - a) * u;
const smooth = u => { const x = clamp(u); return x * x * (3 - 2 * x); };
const blend = (a, b, u) => a.map((x, i) => mix(x, b[i], u));
function finite(value, name, lo, hi) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < lo || value > hi)
    throw new RangeError(`${name} must be finite in [${lo}, ${hi}]`);
  return value;
}
function integer(value, name, lo, hi) {
  finite(value, name, lo, hi);
  if (!Number.isSafeInteger(value)) throw new RangeError(`${name} must be an integer`);
  return value;
}
export function validateViewport(width, height, pixelRatio = 1) {
  integer(width, 'width', 1, 8192); integer(height, 'height', 1, 8192);
  finite(pixelRatio, 'pixelRatio', 0.25, 4);
  if (width * height * pixelRatio ** 2 > 33554432) throw new RangeError('viewport exceeds 32M physical pixels');
  return {width, height, pixelRatio};
}
/** Conservative camera fit; pure math, independently testable without WebGL. */
export function cameraFit(width, height, boundsRadius, verticalFov = 42) {
  integer(width, 'width', 1, 8192); integer(height, 'height', 1, 8192);
  finite(boundsRadius, 'boundsRadius', 0.01, 1000); finite(verticalFov, 'verticalFov', 1, 175);
  const aspect = width / height, radius = boundsRadius * 1.12;
  const halfVertical = verticalFov * Math.PI / 360;
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect);
  const distance = radius / Math.sin(Math.min(halfVertical, halfHorizontal));
  return {aspect, distance, near: Math.max(0.01, distance - radius * 2), far: distance + radius * 2};
}
export function timeAtFrame(frame, fps) {
  integer(frame, 'frame', 0, Number.MAX_SAFE_INTEGER);
  finite(fps, 'fps', 1, 240);
  return Math.min(DURATION, frame / fps);
}
function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let n = Math.imul(state ^ state >>> 15, state | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
/** Independent envelope at a fixed radius. No brightness before front arrival. */
export function waveEnvelope(time, radius, event) {
  finite(time, 'time', 0, Number.MAX_VALUE); finite(radius, 'radius', 0, 100);
  if (!event || !WAVE_EVENTS.includes(event)) throw new TypeError('event must be a WAVE_EVENTS entry');
  const age = time - event.start - radius / event.speed;
  return age < 0 ? 0 : Math.exp(-age / 0.24);
}
/** Our own closed, asymmetric organic leaf outline, unrelated to the reference symbol. */
export function organicTargetAt(id, count) {
  const a = id / count * Math.PI * 2;
  const r = 1.55 * (1 + 0.26 * Math.sin(a) + 0.11 * Math.sin(3 * a));
  return [Math.cos(a) * r * 0.72, Math.sin(a) * r, 0];
}
function validPoint(point) {
  return (Array.isArray(point) || ArrayBuffer.isView(point)) && point.length === 3 &&
    Array.from(point).every(x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 100);
}
export function createStudy({count = 2400, seed = 53117, targetAt = organicTargetAt} = {}) {
  integer(count, 'count', 64, 50000); integer(seed, 'seed', 0, 0xFFFFFFFF);
  if (typeof targetAt !== 'function') throw new TypeError('targetAt must be a function');
  const random = randomGenerator(seed);
  // Route nodes are deliberately constructed first; side branches share these anchors.
  const route = Array.from({length: 8}, (_, i) => [
    -3.8 + i * 1.05, Math.sin(i * 0.9) * 0.8, Math.cos(i * 1.1) * 0.55,
  ]);
  const nodes = route.concat(Array.from({length: 16}, (_, i) => {
    const anchor = route[i % route.length];
    return [anchor[0] + (random() - 0.5) * 1.3, anchor[1] + (i % 2 ? 1 : -1) * (0.6 + random()), anchor[2] + (random() - 0.5) * 2];
  }));
  const edges = route.slice(1).map((_, i) => [i, i + 1]).concat(nodes.slice(8).map((_, i) => [i % 8, i + 8]));
  const lengths = route.slice(1).map((p, i) => Math.hypot(...p.map((v, j) => v - route[i][j])));
  const totalLength = lengths.reduce((a, b) => a + b, 0);
  const records = Array.from({length: count}, (_, id) => {
    const target = targetAt(id, count); // Called exactly once. Cache a defensive copy.
    if (!validPoint(target)) throw new TypeError(`targetAt(${id}) must return three finite coordinates within ±100`);
    const radius = 0.45 + 3.5 * Math.cbrt(random());
    const azimuth = random() * Math.PI * 2, z = random() * 2 - 1;
    const latitude = Math.sqrt(1 - z * z);
    const sphere = [radius * latitude * Math.cos(azimuth), radius * z, radius * latitude * Math.sin(azimuth)];
    const arm = id % 2, phase = random(), noise = (random() - 0.5) * 0.13;
    // First 24 stable IDs mark actual nodes; others provide sparse, dim edge grains.
    const edge = edges[id % edges.length];
    const graph = id < nodes.length ? [...nodes[id]] : blend(nodes[edge[0]], nodes[edge[1]], random());
    return {id, radius, sphere, arm, phase, noise, graph, target: Array.from(target)};
  });
  // A conservative origin-centered sphere covers all convex blends, spiral and signal.
  const boundsRadius = records.reduce((radius, r) => Math.max(radius,
    Math.hypot(...r.target), Math.hypot(...r.graph), r.radius), 5.5);
  function graphSignalAt(progress) {
    finite(progress, 'progress', 0, 1);
    if (progress === 1) return [...route.at(-1)]; // Inclusive endpoint, no wrapped last segment.
    let distance = progress * totalLength;
    for (let i = 0; i < lengths.length; i++) {
      if (distance <= lengths[i]) return blend(route[i], route[i + 1], distance / lengths[i]);
      distance -= lengths[i];
    }
    return [...route.at(-1)];
  }
  function spiral(record, time, contraction = 0) {
    const radial = (0.12 + record.phase * 3.9) * (1 - contraction);
    const theta = record.arm * Math.PI + record.phase * 8 - (time - 8) * 0.48 + contraction * 3;
    const x = radial * Math.cos(theta), y = radial * Math.sin(theta);
    return [x, y * 0.63 + record.noise, y * 0.46 + record.noise];
  }
  function incomingSignalAt(time) {
    const u = smooth((time - 8) / 1.8);
    return [-5 * (1 - u), 2.2 * Math.sin(u * Math.PI) * (1 - u), 1.5 * (1 - u)];
  }
  function sampleAt(time) {
    finite(time, 'time', 0, Number.MAX_VALUE);
    const t = Math.min(time, DURATION);
    const stage = t < 4 ? 'network' : t < 8 ? 'waves' : t < 12 ? 'spiral' : 'gather';
    const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count), alphas = new Float32Array(count);
    const signalPosition = t <= 4 ? graphSignalAt(t / 4) : incomingSignalAt(t);
    const gather = smooth((t - 12) / 3); // Stable final identity from 15 seconds onward.
    for (const record of records) {
      const {id} = record;
      let position, color = CYAN, alpha = 0.25, size = 1.6;
      if (t < 4) {
        position = record.graph;
        const distance = Math.hypot(...position.map((v, j) => v - signalPosition[j]));
        const flash = Math.exp(-((distance / 0.30) ** 2));
        color = blend(CYAN, GOLD, flash); alpha = (id < nodes.length ? 0.42 : 0.045) + flash * 0.5;
        size = id < nodes.length ? 3 + flash * 3 : 0.8;
      } else if (t < 8) {
        position = blend(record.graph, record.sphere, smooth((t - 4) / 0.55));
        const levels = WAVE_EVENTS.map(event => waveEnvelope(t, record.radius, event));
        const peak = Math.max(...levels), winner = levels.indexOf(peak);
        color = winner === 0 ? GOLD : CYAN; alpha = 0.035 + 0.9 * peak; size = 1.25 + 2.3 * peak;
      } else if (t < 12) {
        position = blend(record.sphere, spiral(record, t), smooth((t - 8) / 0.8));
        const core = Math.exp(-record.phase * 7);
        color = blend([0.18, 0.32, 0.43], GOLD, core); alpha = 0.2 + core * 0.6; size = 1.1 + core * 2.8;
      } else {
        const moving = spiral(record, t, gather * 0.65);
        position = blend(moving, record.target, gather);
        color = blend([0.2, 0.48, 0.62], GOLD, gather); alpha = 0.24 + 0.42 * gather; size = 1.2 + gather * 0.7;
      }
      positions.set(position, id * 3); colors.set(color, id * 3); sizes[id] = size; alphas[id] = alpha;
    }
    return {time: t, stage, positions, colors, sizes, alphas,
      signalPosition: [...signalPosition], signalAlpha: t < 4 ? 1 : t >= 8 && t <= 9.8 ? 1 : 0};
  }
  function sampleFrame(frame, fps) { return sampleAt(timeAtFrame(frame, fps)); }
  function sampleHistory(time, {samples = 6, spacing = 1 / 30} = {}) {
    finite(time, 'time', 0, Number.MAX_VALUE); integer(samples, 'samples', 1, 16); finite(spacing, 'spacing', 1 / 240, 0.1);
    const end = Math.min(time, DURATION);
    return Array.from({length: samples}, (_, i) => sampleAt(Math.max(0, end - i * spacing)));
  }
  // Returned topology and IDs are frozen copies; output buffers are disposable, never reused.
  const freezePoints = list => Object.freeze(list.map(point => Object.freeze([...point])));
  return Object.freeze({count, seed, boundsRadius, duration: DURATION, ids: Object.freeze(records.map(r => r.id)),
    graph: Object.freeze({nodes: freezePoints(nodes), edges: freezePoints(edges), route: freezePoints(route)}),
    sampleAt, sampleFrame, sampleHistory, graphSignalAt});
}
