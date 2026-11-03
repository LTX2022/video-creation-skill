/** Pure runtime-contract regression tests. No render, downloads, TTS, or file writes. */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import {
  assetRightsErrors, OUTPUT_MODES, OUTPUTS, outputMode, outputKinds, finalOutputs,
  isDouyinProfile, localPath, contractErrors, adaptationErrors, mergeFinalOutput, overlaySafetyErrors,
  type OutputKind, type OutputMode,
} from './delivery-contract';

let passed = 0;
let failed = 0;
function test(name: string, run: () => void) {
  try { run(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${String((error as Error)?.message ?? error)}`); }
}
function state(mode: OutputMode = 'opaque') {
  return { outputMode: mode, audioRequested: false, subtitlesRequested: false, videoProfile: 'custom' };
}
function artifact(kind: OutputKind): any {
  return {
    kind, contentRevision: 'B'.repeat(64), renderVariant: 'C'.repeat(64), ...OUTPUTS[kind], preset: 'quality', draft: false, frames: null,
    sha256: 'A'.repeat(64), mediaProbe: { ok: true, videoStreamCount: 1 },
    ...(kind === 'alpha' ? { alpha: true, alphaValidation: { pass: true } } : {}),
  };
}
function manifest(mode: OutputMode): any {
  return { schema: 3, contentRevision: 'B'.repeat(64), outputMode: mode, outputs: outputKinds(mode).map(artifact) };
}
function valid(s: any, r?: any) { assert.deepEqual(contractErrors(s, r), []); }
function invalid(s: any, r: any, pattern?: RegExp) {
  const errors = contractErrors(s, r);
  assert(errors.length > 0, 'expected at least one contract error');
  if (pattern) assert.match(errors.join('; '), pattern);
}

test('both final writer collects alpha and composite without losing either', () => {
  const a = mergeFinalOutput(state('both'), artifact('alpha'));
  assert.equal(a.complete, false); assert.equal(a.outputs.length, 1);
  const b = mergeFinalOutput(state('both'), artifact('composite'), a);
  assert.equal(b.complete, true); assert.deepEqual(b.outputs.map((x: any) => x.kind), ['alpha', 'composite']);
  valid(state('both'), b);
});
test('draft and smoke cannot overwrite canonical final evidence', () => {
  for (const update of [{draft:true}, {frames:'0-2'}, {everyNthFrame:2}, {output:'output/smoke.mov'}]) {
    assert.equal(mergeFinalOutput(state('alpha'), {...artifact('alpha'),...update}, manifest('alpha')), null);
  }
});
test('changing modes discards stale outputs and unselected exports are not final', () => {
  const a = mergeFinalOutput(state('alpha'), artifact('alpha'), manifest('both'));
  assert.deepEqual(a.outputs.map((x: any) => x.kind), ['alpha']);
  assert.equal(mergeFinalOutput(state('opaque'), artifact('alpha'), manifest('opaque')), null);
});
const smallOverlay = { visualCoverage: 0.1, onScreenText: ['LUMA', '¥299'], overlaySafety: {
  coordinateSystem:'normalized', bounds:{x:0.5,y:0.65,width:0.45,height:0.3}, minTextPx:26,
  readabilityReviewed:true, edgePaddingReviewed:true, reviewEvidence:'output/golden/price.png',
}};
test('small overlay keeps truthful coverage and actual text size, not full-screen 55%/120px', () => assert.deepEqual(overlaySafetyErrors(smallOverlay), []));
test('overlay missing review or bounds is not exempt from QA', () => {
  for (const update of [{bounds:null},{readabilityReviewed:false},{edgePaddingReviewed:false},{reviewEvidence:''}]) assert.ok(overlaySafetyErrors({...smallOverlay,overlaySafety:{...smallOverlay.overlaySafety,...update}}).length);
});
test('overlay coverage must be bounded and cannot exceed its foreground bounds', () => {
  for (const coverage of [-0.1,1.1,'0.1',0.6,NaN]) assert.ok(overlaySafetyErrors({...smallOverlay,visualCoverage:coverage}).length);
});
test('overlay foreground bounds must remain in frame', () => assert.ok(overlaySafetyErrors({...smallOverlay,overlaySafety:{...smallOverlay.overlaySafety,bounds:{x:0.9,y:0.9,width:0.5,height:0.5}}}).length));
test('shape-only overlay does not invent a title font requirement', () => assert.deepEqual(overlaySafetyErrors({...smallOverlay,onScreenText:[],overlaySafety:{...smallOverlay.overlaySafety,minTextPx:undefined}}),[]));
test('real overlay labels still require measured positive text size', () => assert.ok(overlaySafetyErrors({...smallOverlay,overlaySafety:{...smallOverlay.overlaySafety,minTextPx:0}}).length));
test('default and null output modes preserve ordinary opaque delivery', () => {
  assert.equal(outputMode(), 'opaque');
  assert.equal(outputMode(undefined), 'opaque');
  assert.equal(outputMode(null), 'opaque');
  valid({});
});
test('only four output modes are accepted', () => {
  assert.deepEqual([...OUTPUT_MODES], ['opaque', 'alpha', 'composite', 'both']);
  for (const mode of OUTPUT_MODES) assert.equal(outputMode(mode), mode);
  for (const mode of ['transparent', '', false, 4, {}, []]) assert.throws(() => outputMode(mode));
});
test('both means alpha plus composite, not an extra opaque export', () => {
  assert.deepEqual(outputKinds('both'), ['alpha', 'composite']);
  assert.deepEqual(outputKinds('alpha'), ['alpha']);
  assert.deepEqual(outputKinds('opaque'), ['opaque']);
  assert.deepEqual(outputKinds('composite'), ['composite']);
});
test('canonical outputs and compositions are stable', () => {
  assert.deepEqual(OUTPUTS.opaque, { output: 'output/full.mp4', composition: 'full-video' });
  assert.deepEqual(OUTPUTS.alpha, { output: 'output/full-alpha.mov', composition: 'full-video-alpha' });
  assert.deepEqual(OUTPUTS.composite, { output: 'output/full-composite.mp4', composition: 'full-video-composite' });
});
test('schema 3 exact outputs pass for all modes', () => {
  for (const mode of OUTPUT_MODES) valid(state(mode), manifest(mode));
});
test('schema 1 ordinary opaque result remains readable but unbound', () => {
  const old = { schema: 1, ...artifact('opaque'), alpha: false };
  delete old.kind;
  invalid({}, old, /Legacy|unbound/i);
  assert.equal(finalOutputs(old)[0].kind, 'opaque');
  assert.equal(finalOutputs({ schema: 1, output: 'output/full-alpha.mov', alpha: true })[0].kind, 'alpha');
});
test('unsupported render-result schema is rejected', () => {
  invalid(state(), { ...manifest('opaque'), schema: 999 }, /schema/i);
});
test('alpha-only accepts silent graphics without subtitles', () => valid(state('alpha'), manifest('alpha')));
test('alpha-only does not silently discard requested audio or subtitles', () => {
  invalid({ ...state('alpha'), audioRequested: true }, manifest('alpha'), /silent|audio/i);
  invalid({ ...state('alpha'), subtitlesRequested: true }, manifest('alpha'), /subtitle|silent/i);
});
test('both may retain audio and subtitles on composite output', () => valid({ ...state('both'), audioRequested: true, subtitlesRequested: true }, manifest('both')));
test('new alpha output needs decoded pixel evidence, opaque does not', () => {
  const alpha = manifest('alpha'); delete alpha.outputs[0].alphaValidation;
  invalid(state('alpha'), alpha, /alpha.*validation/i);
  valid(state(), manifest('opaque'));
});
test('failed decoded alpha evidence is not deliverable', () => {
  const alpha = manifest('alpha'); alpha.outputs[0].alphaValidation.pass = false;
  invalid(state('alpha'), alpha, /alpha.*validation/i);
});
test('missing and duplicate outputs fail even with valid hashes', () => {
  const missing = manifest('both'); missing.outputs.pop(); invalid(state('both'), missing);
  const duplicate = manifest('both'); duplicate.outputs = [artifact('alpha'), artifact('alpha')]; invalid(state('both'), duplicate);
});
test('stale unrelated outputs cannot remain in final manifest', () => {
  const extra = manifest('alpha'); extra.outputs.push(artifact('opaque')); invalid(state('alpha'), extra, /stale|Unexpected/i);
});
test('state and result mode mismatch fails', () => invalid(state('alpha'), manifest('opaque'), /outputMode|alpha/i));
test('custom or stale paths do not masquerade as canonical finals', () => {
  const r = manifest('opaque'); r.outputs[0].output = 'output/draft.mp4'; invalid(state(), r, /output must/i);
});
test('draft, frame range, skipped frames, and draft preset are not finals', () => {
  for (const update of [{ draft: true }, { frames: '0-10' }, { everyNthFrame: 2 }, { preset: 'draft' }]) {
    const r = manifest('opaque'); Object.assign(r.outputs[0], update); invalid(state(), r, /quality|final/i);
  }
});
test('missing hash or failed ffprobe evidence fails', () => {
  const noHash = manifest('opaque'); delete noHash.outputs[0].sha256; invalid(state(), noHash, /hash|probe/i);
  const noProbe = manifest('opaque'); noProbe.outputs[0].mediaProbe.ok = false; invalid(state(), noProbe, /hash|probe/i);
});
test('empty or absent final output lists are not valid results', () => {
  assert.deepEqual(finalOutputs(null), []);
  invalid(state(), { schema: 2, outputMode: 'opaque', outputs: [] });
});
test('five supported profiles map to their correct Douyin family', () => {
  for (const profile of ['douyin', 'douyin-laon', 'douyin-skill']) assert.equal(isDouyinProfile(profile), true);
  for (const profile of ['bilibili', 'custom']) assert.equal(isDouyinProfile(profile), false);
  for (const profile of ['douyin-unknown', undefined, '']) assert.equal(isDouyinProfile(profile), false);
});

const format = { width: 1080, height: 1920, fps: 60 };
const same = { width: 1080, height: 1920, fps: 60, durationSec: 10 };
const plate = { width: 1920, height: 1080, fps: 24, durationSec: 10 };
test('matching source dimensions and FPS need no conversion', () => assert.deepEqual(adaptationErrors(same, format), []));
test('different dimensions and FPS pass with explicit cover + resample', () => assert.deepEqual(adaptationErrors({ ...plate, adaptation: { fit: 'cover', fpsPolicy: 'resample', trimStartSec: 1, trimEndSec: 5 } }, format), []));
test('contain plus resample is also explicit valid adaptation', () => assert.deepEqual(adaptationErrors({ ...plate, adaptation: { fit: 'contain', fpsPolicy: 'resample' } }, format), []));
test('different source metadata without adaptation fails', () => assert.equal(adaptationErrors(plate, format).length, 2));
test('fit alone does not authorize FPS adaptation', () => assert.match(adaptationErrors({ ...plate, adaptation: { fit: 'cover' } }, format).join('; '), /FPS/i));
test('resampling alone does not authorize cropping or letterboxing', () => assert.match(adaptationErrors({ ...plate, adaptation: { fpsPolicy: 'resample' } }, format).join('; '), /dimensions/i));
test('optical flow is never the implicit FPS policy', () => assert.match(adaptationErrors({ ...plate, adaptation: { fit: 'cover', fpsPolicy: 'minterpolate' } }, format).join('; '), /resample/i));
test('reference-only clips are not forced into the render output geometry', () => assert.deepEqual(adaptationErrors({ ...plate, referenceVideo: true }, format), []));
test('negative, nonfinite, reversed and out-of-source trim points fail', () => {
  for (const adaptation of [{ trimStartSec: -1 }, { trimStartSec: NaN }, { trimStartSec: 11 }, { trimStartSec: 4, trimEndSec: 3 }, { trimEndSec: 11 }]) assert(adaptationErrors({ ...same, adaptation }, format).length > 0, JSON.stringify(adaptation));
});

const root = resolve('contract-fixture-root');
test('relative local asset path stays in project', () => assert.equal(localPath(root, 'public/plates/clip.mov'), resolve(root, 'public/plates/clip.mov')));
test('safe internal normalization is allowed', () => assert.equal(localPath(root, 'public/plates/../clip.mov'), resolve(root, 'public/clip.mov')));
test('path traversal rejects both Unix and Windows separator styles', () => {
  for (const path of ['../outside.mov', 'public/../../outside.mov', '..\\outside.mov', 'public\\..\\..\\outside.mov']) assert.throws(() => localPath(root, path), path);
});
test('URLs, absolute paths, network shares and drive paths are rejected', () => {
  for (const path of ['https://example.invalid/clip.mov', 'file:///tmp/clip.mov', 'data:video/mp4;base64,AAAA', 'custom+remote://clip.mov', '/tmp/clip.mov', '\\server\\share\\clip.mov', 'C:\\clips\\clip.mov']) assert.throws(() => localPath(root, path), path);
});
test('empty and non-string paths are rejected', () => {
  for (const path of ['', null, undefined, false, 5]) assert.throws(() => localPath(root, path));
});
const personalAsset = {commercialUse:false, authorization:{allowedUses:['personal'],basis:'Synthetic owner grant for personal use only',evidence:'Synthetic permission fixture — not a real user grant'}};
test('legacy commercial declarations and placeholders retain existing behavior',()=>{
  assert.deepEqual(assetRightsErrors({commercialUse:true},{}),[]);
  assert.deepEqual(assetRightsErrors({placeholder:true},{}),[]);
});
test('legacy commercial flag cannot swallow new explicit personal restrictions',()=>{
  assert.ok(assetRightsErrors({...personalAsset,commercialUse:true},{intendedUse:'commercial'}).length);
  assert.ok(assetRightsErrors({...personalAsset,commercialUse:true},{}).length);
  assert.deepEqual(assetRightsErrors({...personalAsset,commercialUse:true},{intendedUse:'personal'}),[]);
});
test('explicit personal grant passes without changing commercialUse=false',()=>{
  const before=JSON.stringify(personalAsset);
  assert.deepEqual(assetRightsErrors(personalAsset,{intendedUse:'personal'}),[]);
  assert.equal(JSON.stringify(personalAsset),before);
  assert.deepEqual(assetRightsErrors({...personalAsset,commercialUse:undefined},{intendedUse:'personal'}),[]);
});
test('noncommercial use needs its exact explicitly recorded scope',()=>{
  assert.ok(assetRightsErrors(personalAsset,{intendedUse:'noncommercial'}).length);
  assert.deepEqual(assetRightsErrors({...personalAsset,authorization:{...personalAsset.authorization,allowedUses:['noncommercial']}},{intendedUse:'noncommercial'}),[]);
});
test('missing, unknown and commercial project uses cannot use a personal grant',()=>{
  for(const intendedUse of [undefined,null,'','unknown','commercial',true]) assert.ok(assetRightsErrors(personalAsset,{intendedUse}).length);
});
test('missing or unknown permission evidence and malformed scopes stay blocked',()=>{
  for(const authorization of [undefined,null,{},[],{...personalAsset.authorization,basis:''},{...personalAsset.authorization,evidence:'unknown'},{...personalAsset.authorization,evidence:'未知'},{...personalAsset.authorization,allowedUses:[]},{...personalAsset.authorization,allowedUses:['commercial']},{...personalAsset.authorization,allowedUses:'personal'}]) assert.ok(assetRightsErrors({...personalAsset,authorization},{intendedUse:'personal'}).length);
  for(const commercialUse of ['false','true',null,0]) assert.ok(assetRightsErrors({...personalAsset,commercialUse},{intendedUse:'personal'}).length);
});
test('invalid explicit intendedUse is rejected even for otherwise legacy contracts',()=>{
  for(const intendedUse of [null,'','unknown',false]) assert.ok(contractErrors({...state(),intendedUse}).length);
  for(const intendedUse of ['personal','noncommercial','commercial']) assert.deepEqual(contractErrors({...state(),intendedUse}),[]);
});
console.log(`\nContract tests: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
