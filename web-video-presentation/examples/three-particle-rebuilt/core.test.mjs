import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createStudy, DURATION, WAVE_EVENTS, waveEnvelope, timeAtFrame, validateViewport, organicTargetAt, cameraFit} from './core.mjs';
const study = createStudy({count: 96, seed: 42});
const equal = (a, b) => assert.deepEqual(a, b);

test('repeat and arbitrary-order seek are identical', () => {
  const expected = [0, 3.9, 4, 5.3, 7.9, 8, 9.2, 12, 14.5, 16].map(t => study.sampleAt(t));
  for (const i of [9, 2, 7, 0, 8, 3, 1, 6, 5, 4, 3, 9]) equal(study.sampleAt(expected[i].time), expected[i]);
});
test('same seed reproduces; different seed changes geometry', () => {
  equal(createStudy({count: 96, seed: 42}).sampleAt(9), study.sampleAt(9));
  assert.notDeepEqual(createStudy({count: 96, seed: 43}).sampleAt(9).positions, study.sampleAt(9).positions);
});
test('physical times agree at 24, 30, 60 and 120 fps', () => {
  for (const t of [0, 0.5, 3.5, 4, 5, 8, 9.5, 12, 15, 16])
    for (const fps of [24, 30, 60, 120]) equal(study.sampleFrame(t * fps, fps), study.sampleAt(t));
});
test('timeline endpoints clamp only beyond duration', () => {
  assert.equal(study.sampleAt(0).stage, 'network');
  equal(study.sampleAt(16), study.sampleAt(1000));
  equal(study.sampleFrame(480, 30), study.sampleAt(DURATION));
  assert.equal(timeAtFrame(100000, 30), 16);
});
test('graph signal includes both route endpoints', () => {
  equal(study.graphSignalAt(0), study.graph.route[0]);
  equal(study.graphSignalAt(1), study.graph.route.at(-1));
  const p = study.graphSignalAt(1 - 1e-8), end = study.graph.route.at(-1);
  assert.ok(Math.hypot(...p.map((x, i) => x - end[i])) < 1e-6);
  equal(study.sampleAt(4).signalPosition, end);
});
test('all frames retain stable IDs and finite bounded buffers', () => {
  equal(study.ids, Array.from({length: 96}, (_, i) => i));
  for (let t = 0; t <= 16; t += 0.125) {
    const s = study.sampleAt(t);
    assert.equal(s.positions.length, 288);
    for (const buffer of [s.positions, s.colors, s.sizes, s.alphas]) assert.ok(buffer.every(Number.isFinite));
    assert.ok(s.alphas.every(x => x >= 0 && x <= 1));
    assert.ok(s.positions.every(x => Math.abs(x) <= 100));
  }
});
test('return-value mutation cannot alter cached state or later results', () => {
  const original = study.sampleAt(9), mutated = study.sampleAt(9);
  for (const key of ['positions', 'colors', 'sizes', 'alphas', 'signalPosition']) mutated[key].fill(999);
  equal(study.sampleAt(9), original);
  assert.throws(() => { study.ids[0] = 99; }, TypeError);
  assert.throws(() => { study.graph.nodes[0][0] = 99; }, TypeError);
});
test('three events are separately ordered gold, cyan, cyan', () => {
  equal(WAVE_EVENTS.map(x => x.start), [4, 5, 6]);
  equal(WAVE_EVENTS.map(x => x.color), ['gold', 'cyan', 'cyan']);
  for (const event of WAVE_EVENTS) {
    const arrival = event.start + 2.6 / event.speed;
    assert.equal(waveEnvelope(arrival - 0.001, 2.6, event), 0);
    assert.equal(waveEnvelope(arrival, 2.6, event), 1);
    assert.ok(waveEnvelope(arrival + 0.2, 2.6, event) < 1);
    assert.ok(waveEnvelope(arrival + 0.8, 2.6, event) < waveEnvelope(arrival + 0.2, 2.6, event));
  }
});
test('each event emits outward and leaves a decaying tail', () => {
  for (const event of WAVE_EVENTS) {
    assert.equal(waveEnvelope(event.start, 0, event), 1);
    assert.equal(waveEnvelope(event.start, 1, event), 0);
    assert.equal(waveEnvelope(event.start + 1, 2.6, event), 1);
    assert.ok(waveEnvelope(event.start + 1, 0, event) < 0.02);
  }
});
test('final target is stable and every ID maps to its own target', () => {
  let calls = 0;
  const custom = createStudy({count: 64, targetAt: (id, count) => { calls++; return [id / count, id / 200, -id / 300]; }});
  assert.equal(calls, 64);
  const a = custom.sampleAt(15), b = custom.sampleAt(16);
  equal(a.positions, b.positions);
  for (let id = 0; id < 64; id++) equal(Array.from(b.positions.slice(id * 3, id * 3 + 3)), Array.from(new Float32Array([id / 64, id / 200, -id / 300])));
  custom.sampleAt(5); assert.equal(calls, 64);
});
test('target callback return arrays are copied; default geometry is original organic curve', () => {
  const shared = [1, 2, 3];
  const custom = createStudy({count: 64, targetAt: () => shared});
  shared.fill(90);
  equal(Array.from(custom.sampleAt(16).positions.slice(0, 3)), [1, 2, 3]);
  for (let id = 0; id < 96; id++) equal(Array.from(study.sampleAt(16).positions.slice(id * 3, id * 3 + 3)), Array.from(new Float32Array(organicTargetAt(id, 96))));
});
test('history is bounded, backward sampled and seek-independent', () => {
  const history = study.sampleHistory(9);
  assert.equal(history.length, 6);
  history.forEach((s, i) => equal(s, study.sampleAt(9 - i / 30)));
  assert.ok(study.sampleHistory(0).every(s => s.time === 0));
  equal(study.sampleHistory(100), study.sampleHistory(16));
  const expected = study.sampleHistory(9); study.sampleHistory(2); equal(study.sampleHistory(9), expected);
});
test('invalid count, seed and target fail explicitly', () => {
  for (const count of [0, 63, 50001, 64.5, NaN, Infinity, '64']) assert.throws(() => createStudy({count}));
  for (const seed of [-1, 2 ** 32, 1.5, NaN, '3']) assert.throws(() => createStudy({seed}));
  for (const targetAt of [null, 3, () => [NaN, 0, 0], () => [0, Infinity, 0], () => [0, 0], () => [101, 0, 0], () => ['1', 0, 0]]) assert.throws(() => createStudy({targetAt}));
});
test('invalid time, progress, frames and fps fail explicitly', () => {
  for (const t of [-1, NaN, Infinity, '1']) assert.throws(() => study.sampleAt(t));
  for (const p of [-0.1, 1.1, NaN, '1']) assert.throws(() => study.graphSignalAt(p));
  for (const frame of [-1, 0.5, NaN, Infinity, '30', Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => study.sampleFrame(frame, 30));
  for (const fps of [0, -1, 241, Infinity, NaN, '30']) assert.throws(() => study.sampleFrame(0, fps));
});
test('viewport validation covers dimensions, ratio and GPU pixel budget', () => {
  equal(validateViewport(1280, 720, 2), {width: 1280, height: 720, pixelRatio: 2});
  for (const args of [[0, 720], [1280, -1], [1.5, 2], [8193, 720], [1280, 720, 0], [1280, 720, NaN], [8192, 8192, 4]]) assert.throws(() => validateViewport(...args));
});
test('history and wave helper validation', () => {
  for (const options of [{samples: 0}, {samples: 17}, {samples: 2.1}, {spacing: 0}, {spacing: 0.2}]) assert.throws(() => study.sampleHistory(9, options));
  assert.throws(() => waveEnvelope(4, 1, {start: 4, speed: 2.6}));
  assert.throws(() => waveEnvelope(4, -1, WAVE_EVENTS[0]));
});

test('bounds include large accepted replacement targets', () => {
  const large = createStudy({count: 64, targetAt: () => [100, -100, 100]});
  assert.ok(large.boundsRadius >= Math.sqrt(30000));
  for (let t = 0; t <= 16; t += 0.5) {
    const {positions} = large.sampleAt(t);
    for (let i = 0; i < positions.length; i += 3)
      assert.ok(Math.hypot(...positions.slice(i, i + 3)) <= large.boundsRadius + 1e-5);
  }
});

test('camera planes and angular fit cover narrow and large-target scenes', () => {
  for (const [w, h] of [[100, 1000], [1, 8192], [8192, 1], [1280, 720], [720, 1280]]) {
    for (const radius of [study.boundsRadius, Math.sqrt(30000)]) {
      const fit = cameraFit(w, h, radius);
      assert.ok(fit.near < fit.distance - radius);
      assert.ok(fit.far > fit.distance + radius);
      const limitingAngle = Math.min(21 * Math.PI / 180, Math.atan(Math.tan(21 * Math.PI / 180) * w / h));
      assert.ok(Math.asin(radius / fit.distance) < limitingAngle);
    }
  }
  assert.ok(cameraFit(100, 1000, 5.5).far > 100);
});
test('custom shader explicitly converts linear working colors to output space', () => {
  const source = readFileSync(new URL('./scene.mjs', import.meta.url), 'utf8');
  assert.match(source, /gl_FragColor = vec4\(vColor, glow \* vAlpha\);\s*#include <colorspace_fragment>/);
  assert.match(source, /renderer.outputColorSpace = THREE.SRGBColorSpace/);
});
