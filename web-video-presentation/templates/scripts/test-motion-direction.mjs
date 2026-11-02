#!/usr/bin/env node
/** Synthetic structure tests only: no footage was rendered, inspected, approved or benchmarked. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validateMotionDirection} from './check-motion-direction.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, 'check-motion-direction.mjs');
const examplePath = path.join(here, '../examples/motion-direction.example.json');
const example = () => JSON.parse(fs.readFileSync(examplePath, 'utf8'));
const proof = () => [{artifact: 'synthetic://test-only/observation', note: 'Invented fixture metadata, not actual media evidence.'}];
const completed = () => {
  const d = example();
  for (const r of d.requirements) { r.status = 'verified'; r.evidence = proof(); }
  d.review = {status: 'reviewed', issues: [], samples: [{
    id: 'review-synthetic-full', kind: 'full', atSec: 0, endSec: d.scope.durationSec,
    result: 'pass', evidence: proof(), requirementIds: d.requirements.map((r) => r.id),
    keyframeIds: d.keyframes.map((k) => k.id),
  }]};
  return d;
};
const invalid = (d, pattern) => {
  const r = validateMotionDirection(d);
  assert.equal(r.structuralValid, false, JSON.stringify(r));
  assert.equal(r.status, 'invalid');
  if (pattern) assert.match(JSON.stringify(r.errors), pattern);
  return r;
};
const pending = (d, pattern) => {
  const r = validateMotionDirection(d);
  assert.equal(r.structuralValid, true, JSON.stringify(r.errors));
  assert.equal(r.status, 'pending');
  if (pattern) assert.match(JSON.stringify(r.pending), pattern);
  return r;
};
const roots = [];
const run = (d, flags = []) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'synthetic-motion-direction-')); roots.push(root);
  fs.writeFileSync(path.join(root, 'motion-direction.json'), typeof d === 'string' ? d : JSON.stringify(d));
  return spawnSync(process.execPath, [script, '--json', ...flags], {cwd: root, encoding: 'utf8'});
};
process.on('exit', () => { for (const root of roots) fs.rmSync(root, {recursive: true, force: true}); });

test('bundled fixture is structurally valid, explicitly synthetic and pending, never a production pass', () => {
  const r = pending(example(), /Actual review/);
  assert.equal(r.synthetic, true); assert.equal(r.notAnAcceptanceRecord, true);
  assert.equal(r.counts.reviewSamples, 0); assert.equal(Object.hasOwn(r, 'pass'), false);
});
test('completed synthetic declarations remain an unverified non-acceptance record', () => {
  const r = validateMotionDirection(completed());
  assert.equal(r.structuralValid, true, JSON.stringify(r.errors)); assert.equal(r.status, 'recorded-review-complete');
  assert.equal(r.notAnAcceptanceRecord, true); assert.equal(r.synthetic, true);
  assert.match(r.limits.join(' '), /not proof of aesthetic quality/);
});
test('minimal targeted contract omits irrelevant optional sections', () => {
  const d = example(); delete d.direction; delete d.objects; delete d.transformations; delete d.keyframes; delete d.review;
  pending(d); assert.equal(validateMotionDirection(d).counts.transformations, 0);
});
test('none/provided/tts and legal output modes are independent; no FPS, music or opaque background required', () => {
  for (const audioMode of ['none', 'provided', 'tts']) for (const outputMode of ['opaque', 'alpha', 'composite', 'both']) {
    const d = example(); Object.assign(d.scope, {audioMode, outputMode}); pending(d);
  }
  const d = example(); d.scope.audioMode = 'music-default'; invalid(d, /audioMode/);
});
test('reject malformed numeric timing including strings, null, NaN, Infinity and overflow JSON', () => {
  for (const value of ['8', null, NaN, Infinity, -1, 0]) { const d = example(); d.scope.durationSec = value; invalid(d, /durationSec/); }
  for (const value of ['1.2', null, NaN, Infinity, -0.1]) { const d = example(); d.transformations[0].source.atSec = value; invalid(d, /source.atSec/); }
  const d = example(); d.scope.durationSec = 1; invalid(JSON.parse(JSON.stringify(d).replace('"durationSec":1', '"durationSec":1e309')), /durationSec/);
});
test('concrete direction values require valid color, finite size/spacing/timing and type weight', () => {
  for (const mutate of [
    (d) => { d.direction.palette[0].value = 'blue-ish'; },
    (d) => { d.direction.type[0].sizePx = '44'; },
    (d) => { d.direction.type[0].weight = 1001; },
    (d) => { d.direction.whitespace.gapPx = -1; },
    (d) => { d.direction.motion.holdSec = Infinity; },
    (d) => { d.direction.motion.easing = ''; },
  ]) { const d = example(); mutate(d); invalid(d); }
});
test('global duplicate IDs cannot ambiguously refer to requirements, objects, transitions or keyframes', () => {
  for (const field of ['requirements', 'objects', 'transformations', 'keyframes']) {
    const d = example(); d[field].push(structuredClone(d[field][0])); invalid(d, /Duplicate ID/);
  }
  const d = example(); d.objects[0].id = d.requirements[0].id; invalid(d, /Duplicate ID/);
});
test('review and issue duplicate IDs are rejected too', () => {
  const d = completed(); d.review.samples.push(structuredClone(d.review.samples[0])); invalid(d, /Duplicate ID/);
  const i = completed(); i.review.issues = [
    {id: 'issue-one', atSec: 1, description: 'Synthetic issue', status: 'open'},
    {id: 'issue-one', atSec: 1, description: 'Duplicate', status: 'open'},
  ]; i.review.samples[0].result = 'issues'; i.review.samples[0].issueIds = ['issue-one']; invalid(i, /Duplicate ID/);
});
test('transitions require stable object identity, mechanism, conservation and known requirement references', () => {
  for (const mutate of [
    (d) => { d.transformations[0].objectId = 'missing'; },
    (d) => { d.transformations[0].preserve = ''; },
    (d) => { d.transformations[0].mechanism = ''; },
    (d) => { d.transformations[0].requirementIds = ['missing']; },
  ]) { const d = example(); mutate(d); invalid(d); }
});
test('out-of-range, reversed and zero-duration transitions are rejected; endpoint equal to duration is legal', () => {
  for (const [start, end] of [[-1, 2], [1, 9], [2, 1], [2, 2]]) {
    const d = example(); d.transformations[0].source.atSec = start; d.transformations[0].target.atSec = end; invalid(d);
  }
  const d = example(); d.transformations[0].target.atSec = d.scope.durationSec; pending(d);
});
test('keyframes and actual observation moments must be real in-range timestamps, not duration endpoint', () => {
  for (const atSec of [-1, 8, 9, '1', Infinity]) { const d = example(); d.keyframes[0].atSec = atSec; invalid(d, /atSec/); }
  for (const atSec of [-1, 8, 9, null]) { const d = completed(); d.review.samples[0].atSec = atSec; invalid(d, /atSec|full review/); }
});
test('review intervals cannot run outside the composition, reverse time, omit end or mislabel full coverage', () => {
  for (const mutate of [
    (d) => { d.review.samples[0].endSec = 9; },
    (d) => { d.review.samples[0].kind = 'segment'; d.review.samples[0].atSec = 2; d.review.samples[0].endSec = 1; },
    (d) => { delete d.review.samples[0].endSec; },
    (d) => { d.review.samples[0].endSec = 7; },
  ]) { const d = completed(); mutate(d); invalid(d); }
});
test('a keyframe observation cannot claim another timestamp or a video interval', () => {
  const d = completed(); d.review.samples = [{id: 'single', kind: 'keyframe', atSec: 0, result: 'pass', evidence: proof(), keyframeIds: ['kf-target']}];
  invalid(d, /outside the observed/);
  d.review.samples[0].keyframeIds = ['kf-opening']; d.review.samples[0].endSec = 1; invalid(d, /one actual timestamp/);
});
test('required planned/implemented/blocked requirements remain unresolved, not a pass', () => {
  for (const status of ['planned', 'implemented', 'blocked']) {
    const d = completed(); d.requirements[0].status = status;
    if (status === 'blocked') d.requirements[0].reason = 'Awaiting actual evidence';
    pending(d, /not declared verified/);
  }
});
test('verified requirements require actual evidence references with nonblank observations', () => {
  for (const evidence of [undefined, [], [{artifact: '', note: 'test'}], [{artifact: 'frame.png', note: ''}]]) {
    const d = completed(); d.requirements[0].evidence = evidence; invalid(d, /evidence/);
  }
});
test('declared actual review without samples, timestamp or evidence is invalid', () => {
  for (const mutate of [
    (d) => { d.review.samples = []; },
    (d) => { delete d.review.samples[0].atSec; },
    (d) => { delete d.review.samples[0].evidence; },
    (d) => { d.review.samples[0].evidence = []; },
    (d) => { d.review.samples[0].evidence[0].note = ''; },
  ]) { const d = completed(); mutate(d); invalid(d); }
});
test('unreviewed cannot contain fabricated claimed review; unfinished review remains pending', () => {
  const d = completed(); d.review.status = 'unreviewed'; invalid(d, /Unreviewed/);
  d.review.status = 'in-progress'; pending(d, /unfinished/);
});
test('unknown or duplicated references and claimed review without traceability are rejected', () => {
  for (const mutate of [
    (d) => { d.review.samples[0].requirementIds = ['missing']; },
    (d) => { d.review.samples[0].keyframeIds = ['missing']; },
    (d) => { d.review.samples[0].requirementIds.push(d.requirements[0].id); },
    (d) => { d.review.samples[0].requirementIds = []; d.review.samples[0].keyframeIds = []; },
  ]) { const d = completed(); mutate(d); invalid(d); }
});
test('missing required coverage and planned keyframe coverage remain pending', () => {
  const d = completed(); d.review.samples[0].requirementIds = [d.requirements[0].id]; d.review.samples[0].keyframeIds = [];
  pending(d, /No actual review sample|Planned keyframe/);
});
test('still keyframes alone cannot declare the motion transformation reviewed', () => {
  const d = completed(); d.review.samples = d.keyframes.map((k, i) => ({id: `frame-${i}`, kind: 'keyframe', atSec: k.atSec, result: 'pass', evidence: proof(), keyframeIds: [k.id], requirementIds: d.requirements.map((r) => r.id)}));
  pending(d, /actual motion-range review/);
});
test('open issues remain pending; resolved issues require resolution and evidence', () => {
  const d = completed(); d.review.samples[0].result = 'issues'; d.review.samples[0].issueIds = ['issue-label'];
  d.review.issues = [{id: 'issue-label', atSec: 2, description: 'Synthetic label overlap', status: 'open'}];
  pending(d, /issue remains open/);
  d.review.issues[0].status = 'resolved'; invalid(d, /resolution|evidence/);
  d.review.issues[0].resolution = 'Invented test-only correction'; d.review.issues[0].evidence = proof();
  assert.equal(validateMotionDirection(d).status, 'recorded-review-complete');
});
test('issue result needs a known issue; pass cannot hide issues; orphan issue cannot pass', () => {
  const d = completed(); d.review.samples[0].result = 'issues'; invalid(d, /issueIds/);
  d.review.samples[0].issueIds = ['unknown']; invalid(d, /Unknown issue/);
  d.review.samples[0].result = 'pass'; invalid(d, /pass sample/);
  const orphan = completed(); orphan.review.issues = [{id: 'orphan', atSec: 2, description: 'Unlinked issue', status: 'open'}]; invalid(orphan, /linked from an actual/);
});
test('an issue must occur inside its linked actual observation, even if declared resolved', () => {
  for (const kind of ['keyframe', 'segment']) {
    const d = completed(); delete d.transformations;
    d.review.samples = [{id: 'review-at-zero', kind, atSec: 0, ...(kind === 'segment' ? {endSec: 1} : {}), result: 'issues', evidence: proof(), requirementIds: [d.requirements[0].id], issueIds: ['issue-at-seven']}];
    d.review.issues = [{id: 'issue-at-seven', atSec: 7, description: 'Issue is outside this observation', status: 'resolved', resolution: 'Synthetic correction', evidence: proof()}];
    invalid(d, /Linked issue time lies outside/);
  }
});
test('production declaration cannot reuse synthetic URI evidence', () => {
  const d = completed(); d.synthetic = false; invalid(d, /Synthetic evidence/);
});
test('missing top-level required fields, unknown schema fields and malformed objects are rejected without throwing', () => {
  for (const value of [null, [], 'wrong', 3, {}, {schema: 2}]) invalid(value);
  for (const mutate of [
    (d) => { d.direction = null; },
    (d) => { d.requirements[0] = null; },
    (d) => { d.transformations[0].source = null; },
    (d) => { d.review.samples[0].requirementIds = {}; },
    (d) => { d.scope.fps = 60; },
  ]) { const d = completed(); mutate(d); invalid(d); }
});
test('duplicate palette/type roles and duplicate per-sample references are invalid', () => {
  const d = example(); d.direction.palette.push({...d.direction.palette[0]}); invalid(d, /Duplicate role/);
  const t = example(); t.direction.type.push({...t.direction.type[0]}); invalid(t, /Duplicate role/);
});
test('CLI default passes structure only; opt-in completeness rejects pending with exit 2', () => {
  const ordinary = run(example()); assert.equal(ordinary.status, 0, ordinary.stderr);
  assert.equal(JSON.parse(ordinary.stdout).status, 'pending');
  const strict = run(example(), ['--require-reviewed']); assert.equal(strict.status, 2, strict.stderr);
  assert.equal(JSON.parse(strict.stdout).notAnAcceptanceRecord, true);
  assert.equal(run(completed(), ['--require-reviewed']).status, 0);
});
test('CLI rejects malformed JSON, nonfinite JSON and invalid input with exit 1', () => {
  assert.equal(run('{broken').status, 1);
  assert.equal(run('{"schema":1,"duration":1e309}').status, 1);
  assert.equal(run({}).status, 1);
});
test('CLI checks only JSON and never opens cited artifact paths or writes project state', () => {
  const d = completed();
  for (const r of d.requirements) r.evidence[0].artifact = '/not/a/real/or/readable/file';
  d.review.samples[0].evidence[0].artifact = 'https://example.invalid/never-request-this';
  const result = run(d); assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, 'recorded-review-complete');
  assert.deepEqual(fs.readdirSync(roots.at(-1)), ['motion-direction.json']);
});

 test('shape-only direction keeps concrete palette/motion without inventing typography',()=>{
  const d=example();delete d.direction.type;delete d.direction.whitespace;pending(d);
  d.direction.type=[];invalid(d,/direction.type/);
  d.direction={palette:[{role:'subject',value:'#123456'}]};pending(d);
  d.direction={motion:{behavior:'hold',easing:'linear',durationSec:0,holdSec:1}};pending(d);
 });
