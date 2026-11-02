import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRenderSchedule } from './render-schedule';
import { buildChapterTimingIndex, clockAtStep } from './continuity-clock';
const a = { chapter: 'a', stepIndex: 0, startFrame: 0, durationInFrames: 30 };
const b = { chapter: 'a', stepIndex: 1, startFrame: 30, durationInFrames: 70 };
const c = { chapter: 'b', stepIndex: 0, startFrame: 100, durationInFrames: 20 };

test('continuous unequal steps preserve duration and legacy/chapter clocks', () => {
  const schedule = buildRenderSchedule([a,b,c], 90);
  assert.equal(schedule.totalFrames, 120);
  const clock = clockAtStep(b, 0, schedule.chapterTimingIndex);
  assert.equal(clock.frame, 0);
  assert.equal(clock.chapterFrame, 30);
  assert.equal(clock.durationInFrames, 70);
});
test('unsorted steps use maximum end, without reordering or truncating source', () => {
  const steps = [c,b,a];
  const snapshot = JSON.stringify(steps);
  assert.equal(buildRenderSchedule(steps, 90).totalFrames, 120);
  assert.equal(JSON.stringify(steps), snapshot);
  assert.equal(buildRenderSchedule([b,a,c], 90).totalFrames, 120);
});
test('production rejects chapter gaps but generic clock retains gap semantics', () => {
  const later = {...b, startFrame: 40};
  assert.equal(buildChapterTimingIndex([a,later]).get('a')!.chapterDurationInFrames, 110);
  assert.throws(() => buildRenderSchedule([a,later], 90), /gap within chapter a.*silent hold/);
  assert.throws(() => buildRenderSchedule([later,a], 90), /gap within chapter a/);
});
test('explicit silent hold repairs a gap and cross-chapter blank intervals remain supported', () => {
  const hold = {...a, stepIndex: 2, startFrame: 30, durationInFrames: 10};
  assert.equal(buildRenderSchedule([a,hold,{...b,startFrame:40}],90).totalFrames,110);
  assert.equal(buildRenderSchedule([a,{...c,startFrame:50}],90).totalFrames,70);
});
test('empty fallback, invalid durations, overlap, duplicate and unsafe end fail correctly', () => {
  assert.equal(buildRenderSchedule([],90).totalFrames,90);
  for (const n of [0,-1,NaN,Infinity,1.5,Number.MAX_VALUE]) assert.throws(() => buildRenderSchedule([],n));
  assert.throws(() => buildRenderSchedule([a,{...b,startFrame:29}],90));
  assert.throws(() => buildRenderSchedule([a,a],90));
  assert.throws(() => buildRenderSchedule([{...a,startFrame:Number.MAX_SAFE_INTEGER}],90));
});
