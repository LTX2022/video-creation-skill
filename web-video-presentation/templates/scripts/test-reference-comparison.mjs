// Dependency-free source-level regression: Node 24 native TypeScript stripping.
// Executes the actual comparison functions and actual delivery-validation function
// with isolated read/hash/event adapters. No npm, browser, image or render claims.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('./compare-reference-style.ts', import.meta.url), 'utf8');
const comparisonCode = source.replace(/^import .*;\r?\n/gm, '').replace(/\nmain\(\);\s*$/, '\n');
function comparisonContext(extra = {}) {
  return runInNewContext(`${stripTypeScriptTypes(comparisonCode)}\n({buildReferenceComparison, writeMarkdown, main});`, {
    process: {cwd: () => '/test-project', exit: (code) => { throw new Error(`exit ${code}`); }},
    resolve: (...parts) => parts.join('/'),
    console: {error() {}},
    ...extra,
  });
}
const { buildReferenceComparison } = comparisonContext();
const hash = (prefix, i) => `${prefix}${String(i).padStart(63, '0')}`;
function fixture() {
  return {
    analysis: {strategy: 'timestamp-reference-video-analysis', videos: [{id: 'ref', durationSec: 10, frames: [0, 3, 6, 9].map((timeSec, i) => ({timeSec, bytes: 100 + 200 * i, sha256: hash('A', i)}))}]},
    strips: {strategy: 'sparse-step-motion-strips', steps: [{chapter: 'c1', step: 's1', durationInFrames: 100, requiredByReferenceStyle: true, frames: [0, 33, 66, 99].map((localOffsetFrame, i) => ({localOffsetFrame, frame: localOffsetFrame, path: `${i}.png`, bytes: 100 + 200 * i, sha256: hash('B', i)}))}]},
    shot: {steps: [{chapter: 'c1', step: 's1', visualRecipe: 'kinetic-prompt-to-product', referenceVideo: 'ref.mp4'}]},
  };
}
function report(f = fixture()) { return buildReferenceComparison(f.analysis, f.strips, f.shot); }

const validatorSource = readFileSync(new URL('./validate-delivery.ts', import.meta.url), 'utf8');
const start = validatorSource.indexOf('function validateMotionEvidence(');
const end = validatorSource.indexOf('\nfunction validateCover(', start);
assert.ok(start >= 0 && end > start, 'actual validator function is discoverable');
const validatorCode = stripTypeScriptTypes(validatorSource.slice(start, end));
function validate(comparison, f = fixture()) {
  const checks = [];
  const run = runInNewContext(`${validatorCode}\nvalidateMotionEvidence`, {
    ROOT: '/test-project', checks,
    pass: (name, detail) => checks.push({name, status: 'pass', detail}),
    fail: (name, detail) => checks.push({name, status: 'fail', detail}),
    needsMotionStrip: () => true,
    isReferenceStyleShot: () => true,
    readJson: (path) => path.includes('reference-style-comparison') ? comparison : path.includes('reference-video-analysis') ? f.analysis : f.strips,
    captureInputRevision: () => ({}), revisionErrors: () => [],
    hashLocalFile: (_root, path) => f.strips.steps[0].frames.find((frame) => path.endsWith(frame.path))?.sha256,
  });
  run(f.shot);
  return checks.filter((check) => check.name === 'reference style comparison');
}

test('four synthetic hash/size records cannot approve visuals or claim motion grammar', () => {
  const r = report();
  assert.equal(r.pass, true, 'metadata-only checks may pass');
  assert.equal(r.schema, 3);
  assert.equal(r.passScope, 'sparse-artifact-metadata-only');
  assert.equal(r.visualReview.accepted, false);
  assert.equal(r.visualReview.status, 'not-performed');
  assert.equal(r.visualReview.continuity, 'not-assessed');
  assert.equal(r.visualReview.motionGrammar, 'not-assessed');
  assert.equal(r.visualReview.aestheticSimilarity, 'not-assessed');
  assert.equal(r.dynamicSimilarity.generated.averageDynamicScore, null);
  assert.equal(r.dynamicSimilarity.generated.steps[0].dynamicScore, null);
  assert.doesNotMatch(JSON.stringify(r), /same-motion-grammar-different-execution|time-sequence-has-continuous-visual-change|dynamic-structure-evidence-present/);
});

test('sample positions do not invent entry/reveal/hold/exit roles', () => {
  const step = report().dynamicSimilarity.generated.steps[0];
  assert.equal('sampledMotionRoles' in step, false);
  assert.equal('coveredMotionRoles' in step, false);
  assert.equal(step.declaredMotionIntent, '');
  assert.equal(step.declarationsVerified, false);
});

test('even explicit motion declarations remain unverified', () => {
  const f = fixture();
  f.shot.steps[0].motionIntent = 'entry reveal focus readable hold settle exit';
  f.shot.steps[0].visualStages = ['entry', 'reveal', 'hold', 'exit'];
  const r = report(f);
  assert.equal(r.dynamicSimilarity.generated.steps[0].declarationsVerified, false);
  assert.equal(r.visualReview.accepted, false);
  assert.equal(r.dynamicSimilarity.verdict, 'not-assessed-from-sparse-metadata');
});

test('legitimate holds do not fail because sampled hashes or bytes repeat', () => {
  const f = fixture();
  for (const frame of f.analysis.videos[0].frames) { frame.sha256 = hash('A', 0); frame.bytes = 100; }
  for (const frame of f.strips.steps[0].frames) { frame.sha256 = hash('B', 0); frame.bytes = 100; }
  const r = report(f);
  assert.equal(r.pass, true);
  assert.equal(r.dynamicSimilarity.generated.steps[0].sampleHashObservation, 'sample-hashes-repeat');
  assert.equal(r.visualReview.accepted, false);
});

test('fabricated distinct-count summaries are ignored', () => {
  const f = fixture();
  f.analysis.videos[0].distinctFrameHashes = 900;
  f.strips.steps[0].distinctFrameHashes = 900;
  const r = report(f);
  assert.equal(r.dynamicSimilarity.reference.videos[0].distinctFrameHashes, 4);
  assert.equal(r.dynamicSimilarity.generated.steps[0].distinctFrameHashes, 4);
});

test('duplicate or missing sample positions cannot pass sparse sampling checks', () => {
  for (const mode of ['same', 'missing']) {
    const f = fixture();
    for (const frame of f.strips.steps[0].frames) {
      if (mode === 'same') { frame.localOffsetFrame = 0; frame.frame = 0; }
      else { delete frame.localOffsetFrame; delete frame.frame; }
    }
    assert.equal(report(f).pass, false);
  }
  const f = fixture();
  for (const frame of f.analysis.videos[0].frames) delete frame.timeSec;
  assert.equal(report(f).pass, false);
});

test('shared sample hashes remain a review flag, case-insensitive', () => {
  const f = fixture();
  f.strips.steps[0].frames[0].sha256 = f.analysis.videos[0].frames[0].sha256.toLowerCase();
  const r = report(f);
  assert.equal(r.pass, false);
  assert.equal(r.exactSharedFrameHashes.length, 1);
  assert.equal(r.verdict, 'shared-sample-hashes-require-review');
  assert.equal(r.visualReview.accepted, false);
});

test('missing/empty metadata, missing hashes and missing reference markers fail', () => {
  assert.equal(buildReferenceComparison(null, null, null).pass, false);
  assert.equal(buildReferenceComparison({videos: []}, {steps: []}, {}).pass, false);
  const f = fixture();
  for (const frame of f.strips.steps[0].frames) delete frame.sha256;
  assert.equal(report(f).pass, false);
  const partial = fixture(); delete partial.strips.steps[0].frames[0].sha256;
  assert.equal(report(partial).pass, false);
  const invalid = fixture(); invalid.analysis.videos[0].frames[0].sha256 = 'not-a-digest';
  assert.equal(report(invalid).pass, false);
  const g = fixture();
  g.strips.steps[0].requiredByReferenceStyle = false;
  assert.equal(report(g).pass, false);
});

test('delivery caller accepts scoped diagnostics without conferring visual acceptance', () => {
  const r = report();
  const checks = validate(r);
  assert.equal(checks.length, 1);
  assert.equal(checks[0].status, 'pass');
  assert.match(checks[0].detail, /not assessed here/);
  assert.equal(r.visualReview.accepted, false);
});

test('delivery caller rejects legacy 100/100 and same-grammar reports', () => {
  const old = {schema: 2, pass: true, exactCopyDetected: false, dynamicSimilarity: {verdict: 'same-motion-grammar-different-execution', generated: {averageDynamicScore: 100}}};
  const checks = validate(old);
  assert.equal(checks[0].status, 'fail');
  assert.match(checks[0].detail, /rerun npm run compare:references/);
});

test('delivery caller rejects visual acceptance or score injected into this metadata report', () => {
  const accepted = report(); accepted.visualReview.accepted = true;
  assert.equal(validate(accepted)[0].status, 'fail');
  const scored = report(); scored.dynamicSimilarity.generated.averageDynamicScore = 100;
  assert.equal(validate(scored)[0].status, 'fail');
  const missing = report(); delete missing.passScope;
  assert.equal(validate(missing)[0].status, 'fail');
});

test('existing actual workflow acceptance checks remain intact', () => {
  assert.match(validatorSource, /validateWorkflowEvidence\(projectState\)/);
  assert.match(validatorSource, /requiredDecisionChecks/);
  assert.match(validatorSource, /validateFinalRender\(projectState\)/);
});

test('actual CLI body writes explicit non-acceptance and only a pending feedback event', () => {
  const f = fixture(); const files = new Map(); const events = [];
  const reads = {'output/reference-video-analysis/manifest.json': f.analysis, 'output/motion-strips/manifest.json': f.strips, 'shot-manifest.json': f.shot};
  const ctx = comparisonContext({
    existsSync: () => true, mkdirSync() {},
    readFileSync: (path) => JSON.stringify(reads[path.replace('/test-project/', '')]),
    writeFileSync: (path, text) => files.set(path, text),
    appendFeedbackEvent: (event) => events.push(event),
  });
  ctx.main();
  const json = JSON.parse(files.get('/test-project/output/reference-style-comparison/manifest.json'));
  const md = files.get('/test-project/output/reference-style-comparison/report.md');
  assert.equal(json.visualReview.accepted, false);
  assert.equal(events.length, 1);
  assert.equal(events[0].userResolution, 'pending');
  assert.match(events[0].notes, /visual review not performed/);
  assert.match(md, /Visual review: not-performed; accepted: false/);
  assert.doesNotMatch(md, /100\/100|same-motion-grammar-different-execution|reuses the motion grammar/);
});
