import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildChapterTimingIndex, clockAtStep, type TimelineStep } from '../../video/continuity-clock';
import { FlowContinuityScene } from './FlowContinuity';
import { FLOW_OBJECTS, flowEventsFor, flowModelAt, stepOnlyFlowModelAt } from './model';

const steps: TimelineStep[] = [
  { chapter: 'flow', stepIndex: 0, startFrame: 50, durationInFrames: 80 },
  { chapter: 'flow', stepIndex: 1, startFrame: 130, durationInFrames: 130 },
  { chapter: 'flow', stepIndex: 2, startFrame: 260, durationInFrames: 90 },
];
const index = buildChapterTimingIndex(steps);
const local = index.get('flow')!.chapterStepTimings;
const at = (step: number, frame: number) => {
  const clock = clockAtStep(steps[step]!, frame, index);
  return flowModelAt(clock.chapterFrame, clock.chapterStepTimings);
};

test('same semantic objects remain continuous before/at/after both narration boundaries', () => {
  for (const boundary of [1, 2]) {
    const previous = steps[boundary - 1]!;
    const frames = [at(boundary - 1, previous.durationInFrames - 1), at(boundary, 0), at(boundary, 1)];
    for (const model of frames) assert.deepEqual(model.objects.map((o) => o.objectId), FLOW_OBJECTS.map((o) => o.objectId));
    for (let i = 0; i < 4; i++) {
      for (let f = 1; f < 3; f++) {
        const a = frames[f - 1]!.objects[i]!;
        const b = frames[f]!.objects[i]!;
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 15, `no reset for ${a.objectId} at step ${boundary}`);
        assert.ok(b.identified >= a.identified);
      }
    }
  }
  assert.ok(at(1, 0).objects.some((object) => object.x > 400));
  assert.ok(at(2, 0).objects.some((object) => !object.arrived));
});

test('seek order is irrelevant and readonly final hold has no cosmetic drift', () => {
  const expected = at(2, 5);
  at(0, 0); at(2, 89); at(1, 43);
  assert.deepEqual(at(2, 5), expected);
  assert.deepEqual(at(2, 40), at(2, 89));
  assert.equal(at(2, 89).phase, 'hold');
});

test('classification, readouts and result derive from the same four objects', () => {
  for (let frame = 0; frame < 300; frame += 3) {
    const model = flowModelAt(frame, local);
    assert.equal(model.counts.A, model.objects.filter((o) => o.group === 'A' && o.arrived).length);
    assert.equal(model.counts.B, model.objects.filter((o) => o.group === 'B' && o.arrived).length);
  }
  assert.deepEqual(at(2, 89).counts, { identified: 4, A: 2, B: 2 });
  assert.ok(flowEventsFor(local).identify.endFrame <= flowEventsFor(local).route.startFrame);
});

test('retiming the source moves the cross-step event instead of using preview constants', () => {
  const changed = [{ stepIndex: 0, startFrame: 0, durationInFrames: 160 }, { stepIndex: 1, startFrame: 160, durationInFrames: 50 }, { stepIndex: 2, startFrame: 210, durationInFrames: 90 }];
  assert.notEqual(flowEventsFor(changed).identify.endFrame, flowEventsFor(local).identify.endFrame);
  assert.ok(flowModelAt(80, changed).objects.some((o) => o.x < at(1, 0).objects[0]!.x));
});

test('manual legacy rendering is explicitly step-only and retains local frame behavior', () => {
  const first = stepOnlyFlowModelAt(0, 0, 60);
  const next = stepOnlyFlowModelAt(1, 0, 90);
  assert.equal(first.clockScope, 'step');
  assert.equal(next.clockScope, 'step');
  assert.equal(first.objects[0]!.x, 190);
  assert.equal(next.objects[0]!.x, 520);
  assert.equal(stepOnlyFlowModelAt(2, 0, 90).phase, 'hold');
});

test('overlay removes only stage, retaining the four faces, identities and shadows; portrait is explicit', () => {
  const model = at(2, 40);
  const opaque = renderToStaticMarkup(createElement(FlowContinuityScene, { model }));
  const alpha = renderToStaticMarkup(createElement(FlowContinuityScene, { model, isOverlay: true, portrait: true }));
  assert.match(opaque, /data-scene-background/);
  assert.doesNotMatch(alpha, /data-scene-background/);
  assert.equal((alpha.match(/data-role="object-face"/g) ?? []).length, 4);
  assert.equal((alpha.match(/data-object-id=/g) ?? []).length, 4);
  assert.equal((alpha.match(/opacity="0.08"/g) ?? []).length, 4);
  assert.match(alpha, /viewBox="0 0 680 1100"/);
});

test('preview routes do not cover another identity in landscape or portrait', () => {
  for (let frame = 0; frame < 300; frame++) {
    const objects = flowModelAt(frame, local).objects;
    for (const portrait of [false, true]) for (let a = 0; a < objects.length; a++) for (let b = a + 1; b < objects.length; b++) {
      const dx = portrait ? Math.abs(objects[a]!.y - objects[b]!.y) * 1.25 : Math.abs(objects[a]!.x - objects[b]!.x);
      const dy = portrait ? Math.abs(objects[a]!.x - objects[b]!.x) * 0.88 : Math.abs(objects[a]!.y - objects[b]!.y);
      assert.ok(dx >= 92 || dy >= 62, `object faces overlap at frame ${frame}, portrait=${portrait}`);
    }
  }
});
