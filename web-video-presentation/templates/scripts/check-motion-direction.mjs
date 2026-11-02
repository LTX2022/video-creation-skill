#!/usr/bin/env node
/** Optional, read-only schema-1 bookkeeping. Not visual QA, approval, or evidence authentication. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const LIMITS = [
  'Checks structure, declared references and timing only; evidence files are not opened or authenticated.',
  'Recorded review is a declaration, not proof of aesthetic quality, render correctness, user approval or delivery readiness.',
  'Does not replace project-state, existing feedback/alpha/audio gates or the actual-media review workflow.',
];

export function validateMotionDirection(input) {
  const errors = [], pending = [], ids = new Map();
  const error = (at, message) => errors.push({path: at, message});
  const wait = (at, message) => pending.push({path: at, message});
  const object = (value, at, keys) => {
    if (!isObject(value)) { error(at, 'Expected an object.'); return {}; }
    for (const key of Object.keys(value)) if (!keys.includes(key)) error(`${at}.${key}`, 'Unknown schema-1 field.');
    return value;
  };
  const array = (value, at, {optional = false, min = 0} = {}) => {
    if (optional && value === undefined) return [];
    if (!Array.isArray(value)) { error(at, 'Expected an array.'); return []; }
    if (value.length < min) error(at, `Expected at least ${min} item(s).`);
    return value;
  };
  const string = (value, at) => { if (!nonempty(value)) error(at, 'Expected a nonblank string.'); };
  const choice = (value, at, values) => { if (!values.includes(value)) error(at, `Expected one of: ${values.join(', ')}.`); };
  const number = (value, at, {min = 0, max = Number.MAX_SAFE_INTEGER, positive = false} = {}) => {
    if (!finite(value) || value < min || value > max || (positive && value === 0)) {
      error(at, `Expected a finite number ${positive ? '>' : '>='} ${min} and <= ${max}.`);
      return false;
    }
    return true;
  };
  const register = (value, at, kind) => {
    if (typeof value !== 'string' || !ID.test(value)) { error(at, 'Expected a safe ID (letters/digits/._-, max 128).'); return; }
    if (ids.has(value)) error(at, `Duplicate ID; first used at ${ids.get(value).path}.`);
    else ids.set(value, {kind, path: at});
  };
  const refs = (value, at, kind, {min = 0} = {}) => {
    const values = array(value, at, {optional: min === 0, min});
    const seen = new Set();
    for (const [i, ref] of values.entries()) {
      if (typeof ref !== 'string' || ids.get(ref)?.kind !== kind) error(`${at}[${i}]`, `Unknown ${kind} ID.`);
      if (seen.has(ref)) error(`${at}[${i}]`, 'Duplicate reference.');
      seen.add(ref);
    }
    return values;
  };
  const document = object(input, '$', ['schema', 'synthetic', 'label', 'scope', 'requirements', 'direction', 'objects', 'transformations', 'keyframes', 'review']);
  if (document.schema !== 1) error('$.schema', 'Expected schema: 1.');
  if (typeof document.synthetic !== 'boolean') error('$.synthetic', 'Explicit synthetic: true or false is required.');
  string(document.label, '$.label');
  const scope = object(document.scope, '$.scope', ['durationSec', 'audioMode', 'outputMode']);
  number(scope.durationSec, '$.scope.durationSec', {positive: true});
  choice(scope.audioMode, '$.scope.audioMode', ['none', 'provided', 'tts']);
  choice(scope.outputMode, '$.scope.outputMode', ['opaque', 'alpha', 'composite', 'both']);
  const time = (value, at) => number(value, at, {max: finite(scope.durationSec) && scope.durationSec > 0 ? scope.durationSec : Number.MAX_SAFE_INTEGER});
  const moment = (value, at) => {
    if (time(value, at) && value === scope.durationSec) error(at, 'A sampled frame must be before durationSec; the endpoint is not a frame.');
  };
  const evidence = (value, at, required = false) => {
    const items = array(value, at, {optional: !required, min: required ? 1 : 0});
    for (const [i, item] of items.entries()) {
      const p = `${at}[${i}]`, e = object(item, p, ['artifact', 'note', 'atSec']);
      string(e.artifact, `${p}.artifact`); string(e.note, `${p}.note`);
      if (e.atSec !== undefined) moment(e.atSec, `${p}.atSec`);
      if (document.synthetic === false && typeof e.artifact === 'string' && e.artifact.startsWith('synthetic:')) error(`${p}.artifact`, 'Synthetic evidence cannot be declared production evidence.');
    }
    return items;
  };
  const requirements = array(document.requirements, '$.requirements', {min: 1}).map((item, i) => {
    const p = `$.requirements[${i}]`, r = object(item, p, ['id', 'text', 'required', 'status', 'reason', 'evidence']);
    register(r.id, `${p}.id`, 'requirement'); string(r.text, `${p}.text`);
    if (typeof r.required !== 'boolean') error(`${p}.required`, 'Expected a boolean.');
    choice(r.status, `${p}.status`, ['planned', 'implemented', 'verified', 'blocked']);
    if (r.reason !== undefined || r.status === 'blocked') string(r.reason, `${p}.reason`);
    evidence(r.evidence, `${p}.evidence`, r.status === 'verified');
    if (r.required === true && r.status !== 'verified') wait(p, 'Required requirement is not declared verified with evidence.');
    return r;
  });

  // Select only useful sections. A targeted edit need not invent a new art direction or transformations.
  if (document.direction !== undefined) {
    const d = object(document.direction, '$.direction', ['palette', 'type', 'whitespace', 'motion', 'bans']);
    const roleNames = (items, at, check) => {
      const seen = new Set();
      for (const [i, item] of items.entries()) {
        const p = `${at}[${i}]`; check(item, p);
        if (nonempty(item?.role) && seen.has(item.role)) error(`${p}.role`, 'Duplicate role.');
        seen.add(item?.role);
      }
    };
    roleNames(array(d.palette, '$.direction.palette', {optional: true, min: 1}), '$.direction.palette', (item, p) => {
      const color = object(item, p, ['role', 'value']); string(color.role, `${p}.role`);
      if (typeof color.value !== 'string' || !/^#[a-f\d]{6}(?:[a-f\d]{2})?$/i.test(color.value)) error(`${p}.value`, 'Use a concrete #RRGGBB or #RRGGBBAA color.');
    });
    roleNames(array(d.type, '$.direction.type', {optional: true, min: 1}), '$.direction.type', (item, p) => {
      const type = object(item, p, ['role', 'family', 'sizePx', 'weight']);
      string(type.role, `${p}.role`); string(type.family, `${p}.family`); number(type.sizePx, `${p}.sizePx`, {positive: true});
      if (type.weight !== undefined && (!Number.isInteger(type.weight) || type.weight < 1 || type.weight > 1000)) error(`${p}.weight`, 'Expected integer font weight 1..1000.');
    });
    if (d.whitespace !== undefined) {
    const w = object(d.whitespace, '$.direction.whitespace', ['safeInsetPx', 'gapPx', 'rationale']);
    number(w.safeInsetPx, '$.direction.whitespace.safeInsetPx'); number(w.gapPx, '$.direction.whitespace.gapPx'); string(w.rationale, '$.direction.whitespace.rationale');
    }
    if (d.motion !== undefined) {
    const m = object(d.motion, '$.direction.motion', ['behavior', 'easing', 'durationSec', 'holdSec']);
    string(m.behavior, '$.direction.motion.behavior'); string(m.easing, '$.direction.motion.easing');
    time(m.durationSec, '$.direction.motion.durationSec'); time(m.holdSec, '$.direction.motion.holdSec');
    }
    array(d.bans, '$.direction.bans', {optional: true}).forEach((ban, i) => string(ban, `$.direction.bans[${i}]`));
  }
  const objects = array(document.objects, '$.objects', {optional: true}).map((item, i) => {
    const p = `$.objects[${i}]`, o = object(item, p, ['id', 'meaning']);
    register(o.id, `${p}.id`, 'object'); string(o.meaning, `${p}.meaning`); return o;
  });
  const transformations = array(document.transformations, '$.transformations', {optional: true}).map((item, i) => {
    const p = `$.transformations[${i}]`, t = object(item, p, ['id', 'objectId', 'source', 'target', 'mechanism', 'preserve', 'requirementIds']);
    register(t.id, `${p}.id`, 'transformation');
    if (ids.get(t.objectId)?.kind !== 'object') error(`${p}.objectId`, 'Unknown stable object ID.');
    const source = object(t.source, `${p}.source`, ['atSec', 'state']), target = object(t.target, `${p}.target`, ['atSec', 'state']);
    time(source.atSec, `${p}.source.atSec`); time(target.atSec, `${p}.target.atSec`);
    if (finite(source.atSec) && finite(target.atSec) && source.atSec >= target.atSec) error(p, 'Transition must have source.atSec < target.atSec.');
    string(source.state, `${p}.source.state`); string(target.state, `${p}.target.state`);
    string(t.mechanism, `${p}.mechanism`); string(t.preserve, `${p}.preserve`);
    refs(t.requirementIds, `${p}.requirementIds`, 'requirement', {min: 1}); return t;
  });
  const keyframes = array(document.keyframes, '$.keyframes', {optional: true}).map((item, i) => {
    const p = `$.keyframes[${i}]`, k = object(item, p, ['id', 'atSec', 'purpose', 'requirementIds']);
    register(k.id, `${p}.id`, 'keyframe'); moment(k.atSec, `${p}.atSec`); string(k.purpose, `${p}.purpose`);
    refs(k.requirementIds, `${p}.requirementIds`, 'requirement', {min: 1}); return k;
  });

  let reviewStatus = 'unreviewed';
  const coveredRequirements = new Set(), coveredKeyframes = new Set(), linkedIssues = new Set();
  let samples = [], issues = [];
  if (document.review !== undefined) {
    const review = object(document.review, '$.review', ['status', 'samples', 'issues']);
    reviewStatus = review.status;
    choice(review.status, '$.review.status', ['unreviewed', 'in-progress', 'reviewed']);
    issues = array(review.issues, '$.review.issues', {optional: true}).map((item, i) => {
      const p = `$.review.issues[${i}]`, issue = object(item, p, ['id', 'atSec', 'description', 'status', 'resolution', 'evidence']);
      register(issue.id, `${p}.id`, 'issue'); moment(issue.atSec, `${p}.atSec`); string(issue.description, `${p}.description`);
      choice(issue.status, `${p}.status`, ['open', 'resolved']);
      if (issue.status === 'resolved' || issue.resolution !== undefined) string(issue.resolution, `${p}.resolution`);
      evidence(issue.evidence, `${p}.evidence`, issue.status === 'resolved');
      if (issue.status === 'open') wait(p, 'Review issue remains open.'); return issue;
    });
    samples = array(review.samples, '$.review.samples', {min: review.status === 'reviewed' ? 1 : 0}).map((item, i) => {
      const p = `$.review.samples[${i}]`, sample = object(item, p, ['id', 'kind', 'atSec', 'endSec', 'result', 'evidence', 'requirementIds', 'keyframeIds', 'issueIds']);
      register(sample.id, `${p}.id`, 'sample');
      choice(sample.kind, `${p}.kind`, ['keyframe', 'motion-strip', 'segment', 'full']);
      moment(sample.atSec, `${p}.atSec`);
      if (sample.endSec !== undefined) {
        time(sample.endSec, `${p}.endSec`);
        if (finite(sample.atSec) && finite(sample.endSec) && sample.endSec < sample.atSec) error(`${p}.endSec`, 'Review interval cannot end before it starts.');
      }
      if (['motion-strip', 'segment', 'full'].includes(sample.kind) && (!finite(sample.endSec) || sample.endSec <= sample.atSec)) error(`${p}.endSec`, 'A motion-range review needs endSec > atSec.');
      if (sample.kind === 'keyframe' && sample.endSec !== undefined && sample.endSec !== sample.atSec) error(`${p}.endSec`, 'A keyframe review represents one actual timestamp.');
      if (sample.kind === 'full' && (sample.atSec !== 0 || sample.endSec !== scope.durationSec)) error(p, 'A declared full review must cover 0..durationSec.');
      choice(sample.result, `${p}.result`, ['pass', 'issues']);
      evidence(sample.evidence, `${p}.evidence`, true);
      const reqs = refs(sample.requirementIds, `${p}.requirementIds`, 'requirement');
      const frames = refs(sample.keyframeIds, `${p}.keyframeIds`, 'keyframe');
      if (!reqs.length && !frames.length) error(p, 'Link the observation to at least one requirement or keyframe.');
      for (const frameId of frames) {
        const frame = keyframes.find((k) => k.id === frameId);
        if (frame && finite(sample.atSec) && (frame.atSec < sample.atSec || frame.atSec > (sample.endSec ?? sample.atSec))) error(`${p}.keyframeIds`, 'Linked keyframe time lies outside the observed timestamp/range.');
      }
      reqs.forEach((id) => coveredRequirements.add(id)); frames.forEach((id) => coveredKeyframes.add(id));
      const issueIds = refs(sample.issueIds, `${p}.issueIds`, 'issue', {min: sample.result === 'issues' ? 1 : 0});
      if (sample.result === 'pass' && issueIds.length) error(`${p}.issueIds`, 'A pass sample cannot declare issue IDs.');
      for (const issueId of issueIds) {
        const issue = issues.find((item) => item.id === issueId);
        if (issue && finite(sample.atSec) && (issue.atSec < sample.atSec || issue.atSec > (sample.endSec ?? sample.atSec))) error(`${p}.issueIds`, 'Linked issue time lies outside the observed timestamp/range.');
      }
      issueIds.forEach((id) => linkedIssues.add(id)); return sample;
    });
    if (review.status === 'unreviewed' && (samples.length || issues.length)) error('$.review', 'Unreviewed cannot contain claimed observations; use in-progress or reviewed.');
    for (const [i, issue] of issues.entries()) if (!linkedIssues.has(issue.id)) error(`$.review.issues[${i}]`, 'Issue must be linked from an actual review sample.');
  }
  if (reviewStatus !== 'reviewed') wait('$.review.status', 'Actual review is unreviewed or unfinished, not a pass.');
  for (const [i, r] of requirements.entries()) if (r.required === true && !coveredRequirements.has(r.id)) wait(`$.requirements[${i}]`, 'No actual review sample is linked to this required requirement.');
  for (const [i, k] of keyframes.entries()) if (!coveredKeyframes.has(k.id)) wait(`$.keyframes[${i}]`, 'Planned keyframe has no linked actual review sample.');
  for (const [i, t] of transformations.entries()) {
    const covered = samples.some((sample) => ['motion-strip', 'segment', 'full'].includes(sample.kind)
      && finite(sample.atSec) && finite(sample.endSec) && sample.atSec <= t.source?.atSec && sample.endSec >= t.target?.atSec
      && Array.isArray(t.requirementIds) && Array.isArray(sample.requirementIds) && t.requirementIds.every((id) => sample.requirementIds.includes(id)));
    if (!covered) wait(`$.transformations[${i}]`, 'Transformation has no linked actual motion-range review; still keyframes alone do not review continuity.');
  }
  return {
    schema: 1, kind: 'motion-direction-structure-check', synthetic: document.synthetic === true,
    status: errors.length ? 'invalid' : pending.length ? 'pending' : 'recorded-review-complete',
    structuralValid: errors.length === 0, notAnAcceptanceRecord: true,
    counts: {requirements: requirements.length, objects: objects.length, transformations: transformations.length, keyframes: keyframes.length, reviewSamples: samples.length, issues: issues.length},
    errors, pending, limits: LIMITS,
  };
}

function main(argv) {
  let filename = 'motion-direction.json', supplied = false, json = false, requireReviewed = false;
  for (const arg of argv) {
    if (arg === '--help') {
      console.log('Usage: node scripts/check-motion-direction.mjs [motion-direction.json] [--json] [--require-reviewed]\nRead-only, no dependencies. Default: structure check; pending is not review pass.\nExit: 0 structurally valid (may be pending); 1 invalid/input error; 2 pending with --require-reviewed.'); return;
    }
    if (arg === '--json') { json = true; continue; }
    if (arg === '--require-reviewed') { requireReviewed = true; continue; }
    if (arg.startsWith('-') || supplied) throw new Error('Invalid arguments; use --help.');
    filename = arg; supplied = true;
  }
  const fd = fs.openSync(filename, 'r');
  let input;
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) throw new Error('Expected a JSON file <= 2 MiB.');
    input = JSON.parse(fs.readFileSync(fd, 'utf8'));
  } finally { fs.closeSync(fd); }
  const report = validateMotionDirection(input);
  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`${report.synthetic ? 'SYNTHETIC — ' : ''}Motion direction: ${report.status}; structure ${report.structuralValid ? 'valid' : 'invalid'}.`);
    for (const item of report.errors) console.log(`ERROR ${item.path}: ${item.message}`);
    for (const item of report.pending) console.log(`PENDING ${item.path}: ${item.message}`);
    console.log('Not an acceptance record. Evidence content, visual quality and existing gates are not verified.');
  }
  process.exitCode = report.structuralValid ? (requireReviewed && report.status === 'pending' ? 2 : 0) : 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`Motion direction input error: ${error.code ?? error.name}. Use --help; no review/approval was recorded.`); process.exitCode = 1; }
}
