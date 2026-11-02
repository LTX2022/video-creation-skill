import assert from 'node:assert/strict';
import test from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MaterialShape, MechanismShowcase, SHOWCASE_PALETTE, MATERIAL_KINDS,
  containedViewportBounds, frameProgress, geometryPath, interpolateGeometry, materialAtFrame, materialState,
  morphAtFrame, prepareMorph, rotateAround, sampleClosedContour, seededUnit, svgResourceId,
  type MaterialKind, type Point2, type MechanismShowcaseProps} from './index';

const square = [{x: 0, y: 0}, {x: 120, y: 0}, {x: 120, y: 120}, {x: 0, y: 120}];
const triangle = [{x: 60, y: 0}, {x: 120, y: 120}, {x: 0, y: 120}];
const makeTrack = () => prepareMorph({id: 'same-object', from: square, to: triangle,
  pointCount: 48, startFrame: 12, endFrame: 108});
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('closed contours with unequal source counts become equal-count identified shapes', () => {
  const track = makeTrack();
  assert.equal(track.from.points.length, 48); assert.equal(track.to.points.length, 48);
  assert.deepEqual(track.from.points.map(point => point.id), track.to.points.map(point => point.id));
  assert.equal(track.from.id, 'same-object'); assert.equal(track.to.id, 'same-object');
  assert.deepEqual(sampleClosedContour(square, 4), square);
  const duplicateEdges = [square[0]!, ...square, square[0]!];
  assert.deepEqual(sampleClosedContour(duplicateEdges, 48), sampleClosedContour(square, 48));
  assert.ok(Object.isFrozen(track) && Object.isFrozen(track.from.points[0]));
});

test('morph endpoints are exact prepared contours, clamped with stable IDs', () => {
  const track = makeTrack();
  assert.equal(morphAtFrame(track, -500), track.from);
  assert.equal(morphAtFrame(track, 12), track.from);
  assert.equal(morphAtFrame(track, 108), track.to);
  assert.equal(morphAtFrame(track, 500), track.to);
  for (let frame = -10; frame < 140; frame += 2.5) {
    const state = morphAtFrame(track, frame);
    assert.equal(state.id, track.id);
    assert.deepEqual(state.points.map(point => point.id), track.from.points.map(point => point.id));
    for (const point of state.points) assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
  }
  assert.equal(frameProgress(12, 12, 108), 0); assert.equal(frameProgress(108, 12, 108), 1);
  assert.equal(frameProgress(60, 12, 108), .5);
});

test('interpolation rejects accidental identity rematching', () => {
  const track = makeTrack();
  assert.throws(() => interpolateGeometry(track.from, {...track.to, id: 'different-object'}, .5), /share geometry/);
  assert.throws(() => interpolateGeometry(track.from, {...track.to, points: track.to.points.slice(1)}, .5), /share geometry/);
  assert.throws(() => interpolateGeometry(track.from, {...track.to, points: [...track.to.points].reverse()}, .5), /share geometry/);
  const duplicateIds = {...track.to, points: track.to.points.map(point => ({...point, id: 'duplicate'}))};
  assert.throws(() => geometryPath(duplicateIds), /unique/);
});

test('finite validation fails loudly rather than emitting NaN/Infinity SVG', () => {
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.throws(() => frameProgress(invalid, 0, 100), RangeError);
    assert.throws(() => frameProgress(0, invalid, 100), RangeError);
    assert.throws(() => frameProgress(0, 0, invalid), RangeError);
    assert.throws(() => interpolateGeometry(makeTrack().from, makeTrack().to, invalid), RangeError);
    assert.throws(() => sampleClosedContour([{x: invalid, y: 0}, ...square], 48), RangeError);
    assert.throws(() => seededUnit('authored', invalid), RangeError);
  }
  assert.throws(() => frameProgress(0, -1e308, 1e308), /span/);
  for (const count of [0, 2, 3.5, 1025, NaN]) assert.throws(() => sampleClosedContour(square, count), RangeError);
  assert.throws(() => sampleClosedContour([{x: 1e100, y: 0}, ...square], 48), RangeError);
  assert.throws(() => sampleClosedContour([{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}], 48), /perimeter/);
  assert.throws(() => prepareMorph({id: ' ', from: square, to: triangle, startFrame: 0, endFrame: 10}), RangeError);
  assert.throws(() => prepareMorph({id: 'a', from: square, to: triangle, startFrame: 10, endFrame: 10}), RangeError);
  assert.throws(() => seededUnit('', 0), RangeError);
  assert.throws(() => seededUnit('stable', -.5), RangeError);
});

test('texture samples are indexed, bounded, seed-dependent and seek-order independent', () => {
  const sequential = Array.from({length: 256}, (_, i) => seededUnit('shot-7-subject', i));
  for (const index of [255, 0, 23, 1, 128, 23, 255]) assert.equal(seededUnit('shot-7-subject', index), sequential[index]);
  assert.ok(sequential.every(value => value >= 0 && value < 1));
  assert.notEqual(seededUnit('shot-7-subject', 23), seededUnit('shot-8-subject', 23));
  const track = makeTrack(), expected = new Map([0, 12, 35, 79, 108].map(frame => [frame, morphAtFrame(track, frame)]));
  for (const frame of [108, 35, 0, 79, 12, 35, 108]) assert.deepEqual(morphAtFrame(track, frame), expected.get(frame));
});

test('material selection preserves exact geometry and palette references', () => {
  const geometry = morphAtFrame(makeTrack(), 55);
  for (const material of MATERIAL_KINDS) {
    const state = materialState(geometry, SHOWCASE_PALETTE, material, 'stable');
    assert.equal(state.geometry, geometry); assert.equal(state.palette, SHOWCASE_PALETTE);
    assert.equal(geometryPath(state.geometry), geometryPath(geometry));
  }
  assert.deepEqual([0, 25, 50, 75, 100].map(frame => materialAtFrame(frame, 0, 100)), ['flat', 'paper', 'line', 'halftone', 'halftone']);
  assert.equal(materialAtFrame(-40, 0, 100), 'flat'); assert.equal(materialAtFrame(400, 0, 100), 'halftone');
  assert.throws(() => materialState(geometry, SHOWCASE_PALETTE, 'glass' as MaterialKind, 'stable'), /Unknown/);
  assert.throws(() => materialState(geometry, {...SHOWCASE_PALETTE, base: ''}, 'flat', 'stable'), /nonempty/);
});

test('actual MaterialShape SVG keeps identical contour and constrains decorative texture', () => {
  const geometry = morphAtFrame(makeTrack(), 55), path = geometryPath(geometry);
  for (const material of MATERIAL_KINDS) {
    const markup = renderToStaticMarkup(createElement('svg', null, createElement(MaterialShape,
      {geometry, palette: SHOWCASE_PALETTE, material, seed: 'stable', instanceId: `test:${material}`})));
    assert.ok(markup.includes(`data-role="material-contour" d="${path}"`));
    assert.match(markup, /data-object-id="same-object"/);
    assert.match(markup, /data-palette-id="warm-ink-v1"/);
    assert.doesNotMatch(markup, /(?:NaN|Infinity|undefined|stage-background|<filter|<animate)/);
    assert.equal(markup.includes('clip-path="url(#'), material === 'paper' || material === 'halftone');
  }
  assert.notEqual(svgResourceId('a:b', 'c'), svgResourceId('a', 'b:c'));
  assert.equal(svgResourceId('subject/一', 'same-object'), svgResourceId('subject/一', 'same-object'));
  assert.throws(() => svgResourceId('', 'a'), RangeError);
});

test('standalone showcase supports both dimensions and arbitrary seeks with transparent default', () => {
  for (const [width, height] of [[960, 540], [1080, 1920]]) for (const fps of [24, 30, 60]) {
    const render = (frame: number, background?: string) => renderToStaticMarkup(createElement(MechanismShowcase,
      {frame, durationInFrames: fps * 6, fps, width, height, seed: 'shot-007', instanceId: 'seek-probe', background}));
    const first = render(0), middle = render(fps * 3), last = render(fps * 6 - 1);
    for (const [frame, expected] of [[fps * 6 - 1, last], [0, first], [fps * 3, middle], [0, first]] as const) {
      const markup = render(frame);
      assert.equal(markup, expected);
      assert.match(markup, /data-alpha-default="transparent"/);
      assert.doesNotMatch(markup, /data-role="stage-background"|(?:NaN|Infinity|undefined)/);
      assert.equal((markup.match(/data-role="material-comparison"/g) ?? []).length, 4);
      const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
      assert.equal(new Set(ids).size, ids.length, 'SVG resource IDs collide');
    }
    const opaque = render(0, '#f5f1e8');
    assert.match(opaque, /data-role="stage-background"/); assert.match(opaque, /data-alpha-default="opaque"/);
  }
  for (const props of [{frame: NaN}, {width: Infinity}, {height: 0}, {durationInFrames: 1}, {fps: 0}, {fps: NaN}]) {
    assert.throws(() => renderToStaticMarkup(createElement(MechanismShowcase, {frame: 0, seed: 'shot', instanceId: 'invalid-probe', ...props})), RangeError);
  }
});

test('explicit background covers the full contained viewport in portrait and ultrawide', () => {
  for (const [width, height] of [[960, 540], [270, 480], [1920, 400], [540, 540]]) {
    const bounds = containedViewportBounds(width, height, 960, 540);
    const scale = Math.min(width / 960, height / 540);
    const offsetX = (width - 960 * scale) / 2, offsetY = (height - 540 * scale) / 2;
    close(bounds.x * scale + offsetX, 0); close(bounds.y * scale + offsetY, 0);
    close((bounds.x + bounds.width) * scale + offsetX, width);
    close((bounds.y + bounds.height) * scale + offsetY, height);
    const markup = renderToStaticMarkup(createElement(MechanismShowcase, {
      frame: 0, seed: 'background-check', instanceId: 'background-probe', width, height, background: '#fff',
    }));
    assert.ok(markup.includes(`data-role="stage-background" x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}"`));
  }
  for (const invalid of [0, -1, Infinity, NaN]) assert.throws(() => containedViewportBounds(invalid, 480, 960, 540), RangeError);
  for (const background of ['transparent', 'rgba(0,0,0,.5)', '#fff0', '#ffffff00', 'var(--surface)', '']) {
    assert.throws(() => renderToStaticMarkup(createElement(MechanismShowcase, {
      frame: 0, seed: 'background-check', instanceId: 'invalid-background', background,
    })), /opaque #RGB or #RRGGBB/);
  }
});

test('showcase requires an authored namespace and isolates resources across inline SVG instances', () => {
  const props = {frame: 60, seed: 'same-seed'};
  assert.throws(() => renderToStaticMarkup(createElement(MechanismShowcase, props as MechanismShowcaseProps)), /Showcase instance ID/);
  const markup = renderToStaticMarkup(createElement('div', null,
    createElement(MechanismShowcase, {...props, instanceId: 'page:preview:left'}),
    createElement(MechanismShowcase, {...props, instanceId: 'page:preview:right'})));
  const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.ok(ids.length > 0); assert.equal(new Set(ids).size, ids.length);
  const references = [...markup.matchAll(/url\(#([^)]*)\)/g)].map(match => match[1]);
  assert.ok(references.length > 0); assert.ok(references.every(id => ids.includes(id)));
});

test('2D pivot rotation preserves pivot, full-turn endpoint and distance', () => {
  const point: Point2 = {x: 12, y: 20}, pivot: Point2 = {x: 10, y: 20};
  assert.equal(rotateAround(point, pivot, 0), point); assert.equal(rotateAround(point, pivot, 360), point);
  assert.equal(rotateAround(pivot, pivot, 137), pivot);
  const quarter = rotateAround(point, pivot, 90); close(quarter.x, 10); close(quarter.y, 22);
  const half = rotateAround(point, pivot, 180); close(half.x, 8); close(half.y, 20);
  for (const angle of [0, -90, 15, 90, 360, 719]) {
    const rotated = rotateAround(point, pivot, angle); close(Math.hypot(rotated.x - pivot.x, rotated.y - pivot.y), 2);
  }
  assert.throws(() => rotateAround(point, pivot, Infinity), RangeError);
});
