// Node 24 strips model.ts types directly; no test runner or installation required.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CAPACITY, REQUEST_TIMES, evaluateDiscreteBucket, modelAtFrame } from './model.ts';

test('initial state and capacity bounds across the full eight seconds', () => {
  assert.equal(modelAtFrame(0, 30).tokens, 2);
  for (let frame = 0; frame <= 480; frame++) {
    const m = modelAtFrame(frame, 60);
    assert.ok(m.tokens >= 0 && m.tokens <= CAPACITY);
    assert.ok(m.events.every((event) => event.before >= 0 && event.before <= CAPACITY && event.after >= 0 && event.after <= CAPACITY));
    assert.equal(m.slots.filter((slot) => slot.occupied).length, m.tokens);
    assert.ok(m.gateOpen >= 0 && m.gateOpen <= 1);
  }
});

test('the specified four requests consume the same tokens used by readouts', () => {
  const m = modelAtFrame(8 * 30, 30);
  assert.deepEqual(m.events.filter((event) => event.kind === 'request').map(({ at, before, after, outcome }) => ({ at, before, after, outcome })), [
    { at: 0.5, before: 2, after: 1, outcome: 'passed' },
    { at: 0.7, before: 1, after: 0, outcome: 'passed' },
    { at: 0.9, before: 0, after: 0, outcome: 'rejected' },
    { at: 2.4, before: 2, after: 1, outcome: 'passed' },
  ]);
  assert.deepEqual([m.passedCount, m.rejectedCount, m.tokens], [3, 1, 2]);
  assert.equal(modelAtFrame(27, 30).gateOpen, 0);
  assert.equal(modelAtFrame(27, 30).status, 'empty');
  assert.equal(modelAtFrame(30, 30).tokens, 1);
  assert.equal(modelAtFrame(60, 30).tokens, 2);
});

test('exact event boundaries and same-time refill-before-request ordering', () => {
  assert.equal(modelAtFrame(14, 30).passedCount, 0);
  assert.equal(modelAtFrame(15, 30).passedCount, 1);
  assert.equal(modelAtFrame(21, 24).rejectedCount, 0);
  assert.equal(modelAtFrame(22, 24).rejectedCount, 1);
  const tie = evaluateDiscreteBucket(1, [0.5, 1]);
  assert.deepEqual(tie.events.map((event) => [event.kind, event.before, event.after]), [
    ['request', 2, 1], ['refill', 1, 2], ['request', 2, 1],
  ]);
  const fullTie = evaluateDiscreteBucket(1, [1, 1, 1]);
  assert.equal(fullTie.events[0].kind, 'refill');
  assert.equal(fullTie.events[0].added, false);
  assert.deepEqual([fullTie.passed, fullTie.rejected, fullTie.tokens], [2, 1, 0]);
});

test('negative frames clamp; different fps agree at identical sample times', () => {
  assert.deepEqual(modelAtFrame(-30, 30), modelAtFrame(0, 30));
  for (const seconds of [0, 0.5, 0.7, 0.9, 1, 2, 2.4, 3, 7.5, 8]) {
    assert.deepEqual(modelAtFrame(seconds * 30, 30), modelAtFrame(seconds * 60, 60));
    // Fractional frames are permitted for validation; renders still sample integer frames.
    assert.deepEqual(modelAtFrame(seconds * 30, 30), modelAtFrame(seconds * 24, 24));
  }
  assert.deepEqual(modelAtFrame(900, 30), modelAtFrame(240, 30));
  for (const fps of [0, -1, NaN, Infinity]) assert.throws(() => modelAtFrame(1, fps), RangeError);
  assert.throws(() => modelAtFrame(NaN, 30), RangeError);
});

test('out-of-order seeks and repeated calls are independent, with no shared mutation', () => {
  const baseline = new Map([0, 15, 21, 27, 30, 72, 151, 239].map((frame) => [frame, modelAtFrame(frame, 30)]));
  for (const frame of [239, 27, 0, 151, 21, 72, 15, 27, 30, 239, 0]) {
    assert.deepEqual(modelAtFrame(frame, 30), baseline.get(frame));
  }
  const changed = modelAtFrame(27, 30);
  changed.events[0].after = 999;
  changed.slots[0].occupied = true;
  assert.deepEqual(modelAtFrame(27, 30), baseline.get(27));
  assert.deepEqual(REQUEST_TIMES, [0.5, 0.7, 0.9, 2.4]);
  assert.ok(Object.isFrozen(REQUEST_TIMES));
});

test('the pure model has no imports, wall-clock calls, randomness, timers, or ambient effects', () => {
  const source = readFileSync(new URL('./model.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:import|setTimeout|setInterval|requestAnimationFrame|fetch|window|document|process|console)\b/);
  assert.doesNotMatch(source, /Date\.now|Math\.random/);
});
