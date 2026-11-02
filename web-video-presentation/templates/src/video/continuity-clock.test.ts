import assert from 'node:assert/strict';
import test from 'node:test';
import { actionsIn, bindChapterEvents, buildChapterTimingIndex, clockAtStep, progressAt, type TimelineStep } from './continuity-clock';

const steps: TimelineStep[] = [
  { chapter: 'intro', stepIndex: 0, startFrame: 0, durationInFrames: 35 },
  { chapter: 'flow', stepIndex: 0, startFrame: 35, durationInFrames: 60 },
  { chapter: 'flow', stepIndex: 1, startFrame: 95, durationInFrames: 90 },
  { chapter: 'outro', stepIndex: 0, startFrame: 185, durationInFrames: 40 },
];
const index = buildChapterTimingIndex(steps);

test('unequal steps preserve local frame and expose continuous chapter/timeline clocks', () => {
  const before = clockAtStep(steps[1]!, 59, index);
  const boundary = clockAtStep(steps[2]!, 0, index);
  assert.equal(before.frame, 59);
  assert.equal(before.chapterFrame, 59);
  assert.equal(boundary.frame, 0);
  assert.equal(boundary.durationInFrames, 90);
  assert.equal(boundary.chapterFrame, 60);
  assert.equal(boundary.timelineFrame, 95);
  assert.equal(boundary.chapterStartFrame, 35);
  assert.equal(boundary.chapterDurationInFrames, 150);
  assert.equal(boundary.clockScope, 'chapter');
});

test('chapters have independent origins and durations, not one global scene', () => {
  assert.equal(clockAtStep(steps[3]!, 7, index).chapterFrame, 7);
  assert.equal(clockAtStep(steps[3]!, 7, index).timelineFrame, 192);
  assert.equal(clockAtStep(steps[3]!, 7, index).chapterDurationInFrames, 40);
});

test('out-of-order seek and unsorted input produce identical values without mutation', () => {
  const before = JSON.stringify(steps);
  const shuffled = buildChapterTimingIndex([steps[2]!, steps[0]!, steps[3]!, steps[1]!]);
  const a = clockAtStep(steps[2]!, 70, index);
  clockAtStep(steps[1]!, 1, index);
  clockAtStep(steps[3]!, 0, index);
  assert.deepEqual(clockAtStep(steps[2]!, 70, shuffled), a);
  assert.equal(JSON.stringify(steps), before);
});

test('re-timing moves named visual events with the same source', () => {
  const bindings = { cross: { start: { step: 0, at: 0.5 }, end: { step: 1, at: 0.5 } } };
  assert.deepEqual(bindChapterEvents(index.get('flow')!.chapterStepTimings, bindings).cross, { startFrame: 30, endFrame: 105 });
  const changed = buildChapterTimingIndex([
    { chapter: 'flow', stepIndex: 0, startFrame: 35, durationInFrames: 100 },
    { chapter: 'flow', stepIndex: 1, startFrame: 135, durationInFrames: 90 },
  ]);
  assert.deepEqual(bindChapterEvents(changed.get('flow')!.chapterStepTimings, bindings).cross, { startFrame: 50, endFrame: 145 });
});

test('after, parallel and stagger have distinct completion/start relations; holds do not restart', () => {
  const window = { startFrame: 20, endFrame: 140 };
  const after = actionsIn(window, 3, 'after');
  const parallel = actionsIn(window, 3, 'parallel');
  const stagger = actionsIn(window, 3, 'stagger', 0.5);
  assert.equal(after[1]!.startFrame, after[0]!.endFrame);
  assert.deepEqual(parallel, [window, window, window]);
  assert.ok(stagger[1]!.startFrame < stagger[0]!.endFrame);
  assert.equal(stagger[1]!.startFrame - stagger[0]!.startFrame, stagger[2]!.startFrame - stagger[1]!.startFrame);
  assert.equal(stagger[2]!.endFrame, window.endFrame);
  assert.equal(progressAt(140, window), 1);
  assert.equal(progressAt(200, window), 1);
});

test('bad/stale timing and nonexistent named anchors fail explicitly', () => {
  assert.throws(() => buildChapterTimingIndex([steps[0]!, steps[0]!]));
  assert.throws(() => buildChapterTimingIndex([{ ...steps[0]!, durationInFrames: 0 }]));
  assert.throws(() => clockAtStep({ ...steps[2]!, startFrame: 96 }, 0, index), /Stale/);
  assert.throws(() => clockAtStep(steps[2]!, NaN, index));
  assert.throws(() => bindChapterEvents(index.get('flow')!.chapterStepTimings, { typo: { start: { step: 8, at: 0 }, end: { step: 8, at: 1 } } }));
  assert.throws(() => actionsIn({ startFrame: 10, endFrame: 0 }, 2, 'after'));
});

test('finite but unsafe frames and arithmetic overflow fail closed', () => {
  for (const n of [1e308, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN]) {
    assert.throws(() => buildChapterTimingIndex([{ chapter: 'c', stepIndex: 0, startFrame: n, durationInFrames: 1 }]));
    assert.throws(() => progressAt(n, { startFrame: 0, endFrame: 10 }));
  }
  assert.throws(() => buildChapterTimingIndex([{ chapter: 'c', stepIndex: 0, startFrame: Number.MAX_SAFE_INTEGER, durationInFrames: 1 }]));
  assert.throws(() => clockAtStep(steps[2]!, Number.MAX_SAFE_INTEGER, index));
  assert.throws(() => progressAt(0, { startFrame: -1e308, endFrame: 1e308 }));
  assert.throws(() => actionsIn({ startFrame: -Number.MAX_SAFE_INTEGER, endFrame: Number.MAX_SAFE_INTEGER }, 2, 'parallel'));
  assert.throws(() => actionsIn({ startFrame: 0, endFrame: 1 }, Number.MAX_SAFE_INTEGER, 'parallel'));
  assert.throws(() => bindChapterEvents([{ stepIndex: 0, startFrame: Number.MAX_SAFE_INTEGER, durationInFrames: 1 }], { a: { start: { step: 0, at: 0 }, end: { step: 0, at: 1 } } }));
});

test('safe frame edges, fractional seeks and zero windows preserve deterministic semantics', () => {
  const edge = Number.MAX_SAFE_INTEGER;
  const timing = { chapter: 'edge', stepIndex: 0, startFrame: edge - 10, durationInFrames: 10 };
  assert.equal(clockAtStep(timing, 10, buildChapterTimingIndex([timing])).timelineFrame, edge);
  assert.equal(progressAt(0.5, { startFrame: 0, endFrame: 1 }), 0.5);
  assert.equal(progressAt(2, { startFrame: 2, endFrame: 2 }), 1);
  assert.equal(progressAt(-edge, { startFrame: 0, endFrame: edge }), 0);
  assert.equal(progressAt(edge, { startFrame: 0, endFrame: edge }), 1);
});
