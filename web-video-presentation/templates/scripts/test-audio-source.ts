/** Offline synthetic fixtures only: local WAV/probe/timing, no TTS/network/render/user approval. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { audioSourceErrors, providedAudioErrors, resolveAudioSource } from './audio-source';
import { captureInputRevision, hashLocalFile } from './input-revision';
import { decisionContentState, requiredDecisionChecks, subjectForDecision } from './workflow-evidence';

let passed = 0, failed = 0;
const roots: string[] = [], scripts = dirname(fileURLToPath(import.meta.url));
const synthetic = {allowSynthetic:true};
function test(name: string, run: () => void) { try { run(); passed++; console.log(`PASS ${name}`); } catch (error) { failed++; console.error(`FAIL ${name}: ${String((error as Error).stack ?? error)}`); } }
function put(root: string, path: string, value: string | object | Buffer) { const file = resolve(root,path); mkdirSync(dirname(file),{recursive:true}); writeFileSync(file,typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value,null,2)); }
function wav(seconds = 2): Buffer { const rate=8000, samples=rate*seconds, data=Buffer.alloc(44+samples*2); data.write('RIFF',0); data.writeUInt32LE(data.length-8,4); data.write('WAVEfmt ',8); data.writeUInt32LE(16,16); data.writeUInt16LE(1,20); data.writeUInt16LE(1,22); data.writeUInt32LE(rate,24); data.writeUInt32LE(rate*2,28); data.writeUInt16LE(2,32); data.writeUInt16LE(16,34); data.write('data',36); data.writeUInt32LE(samples*2,40); for(let i=0;i<samples;i++)data.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/rate)*2000),44+i*2); return data; }
function fixture() {
  const root=mkdtempSync(resolve(tmpdir(),'synthetic-provided-audio-')); roots.push(root);
  const text='Synthetic test.', audio='public/audio/intro/1.wav';
  const state={outputMode:'opaque',audioRequested:true,audioSource:'provided',subtitlesRequested:true,timingMode:'narration'};
  const timing={fps:30,timingMode:'narration',steps:[{chapter:'intro',step:1,text,audio:'intro/1.wav',audioDurationMs:2000,advanceAtMs:2000,warnings:[]}]};
  put(root,'project-state.json',state); put(root,'package.json',{type:'module'}); put(root,'package-lock.json',{lockfileVersion:3,packages:{}});
  put(root,'outline.md','# Synthetic outline'); put(root,'script.md',text); put(root,'shot-design.md','# Synthetic design');
  put(root,'src/config/videoFormat.ts','export const VIDEO_FORMAT = {fps:30};');
  put(root,'src/registry/chapters.ts',"import {narrations} from '../chapters/01-intro/narrations';\nexport const CHAPTERS=[{id:'intro',narrations}];");
  put(root,'src/chapters/01-intro/narrations.ts',`export const narrations = [${JSON.stringify(text)}];`);
  put(root,'src/video/index.ts','// Synthetic fixture');
  put(root,'src/video/render-timing.generated.ts','// Replaced by timing build in integration test');
  put(root,'timing-manifest.json',timing); put(root,audio,wav());
  const manifest={schema:1,source:'provided',authorization:{kind:'synthetic',userQuote:'SYNTHETIC TEST ONLY: use these local recordings.',reference:null,declaration:'Offline regression fixture; not actual user approval.'},items:[{chapter:'intro',step:1,audio,textHash:createHash('sha256').update(text).digest('hex').toUpperCase(),audioSha256:hashLocalFile(root,audio),source:'Synthetic locally generated tone, not speech'}]};
  put(root,'provided-audio-manifest.json',manifest);
  return {root,state,timing,manifest,audio};
}
function runScript(root: string, name: string) {
  mkdirSync(resolve(root,'scripts'),{recursive:true}); copyFileSync(resolve(scripts,name),resolve(root,'scripts',name));
  copyFileSync(resolve(scripts,'stable-generated-file.ts'),resolve(root,'scripts/stable-generated-file.ts'));
  const execArgs=process.execArgv.map(arg=>arg==='tsx'?resolve(process.cwd(),'node_modules/tsx/dist/loader.mjs'):arg);
  return spawnSync(process.execPath,[...execArgs,resolve(root,'scripts',name)],{cwd:root,encoding:'utf8'});
}
try {
  test('legacy source defaults preserve requested TTS and silent semantics',()=>{assert.equal(resolveAudioSource({audioRequested:true}),'tts');assert.equal(resolveAudioSource({audioRequested:false}),'none');assert.equal(resolveAudioSource({}),'none');});
  test('explicit unknown/inconsistent routes fail closed',()=>{for(const state of [{audioRequested:true,audioSource:'none'},{audioRequested:false,audioSource:'tts'},{audioRequested:false,audioSource:'provided'},{audioRequested:true,audioSource:'remote'},{audioRequested:'true',audioSource:'provided'}])assert.equal(audioSourceErrors(state).length,1);assert.equal(resolveAudioSource({audioRequested:true,audioSource:'provided'}),'provided');});
  test('real local WAV has matching hash and measured timing only in synthetic test context',()=>{const {root,timing}=fixture();assert.deepEqual(providedAudioErrors(root,timing,synthetic),[]);assert.match(providedAudioErrors(root,timing).join(';'),/synthetic provenance cannot authorize production/);});
  test('missing authorization, narration text hash, origin and duplicate segments are rejected',()=>{for(const kind of ['authorization','text','source','duplicate']){const {root,timing,manifest}=fixture();if(kind==='authorization')manifest.authorization.userQuote='';if(kind==='text')manifest.items[0]!.textHash='0'.repeat(64);if(kind==='source')manifest.items[0]!.source='';if(kind==='duplicate')manifest.items.push({...manifest.items[0]!});put(root,'provided-audio-manifest.json',manifest);assert.ok(providedAudioErrors(root,timing,synthetic).length,kind);}});
  test('missing, altered and non-audio recordings never pass',()=>{for(const kind of ['missing','changed','invalid']){const {root,timing,manifest,audio}=fixture();if(kind==='missing')rmSync(resolve(root,audio));else put(root,audio,kind==='changed'?wav(3):Buffer.alloc(4000));if(kind==='invalid'){manifest.items[0]!.audioSha256=hashLocalFile(root,audio);put(root,'provided-audio-manifest.json',manifest);}assert.ok(providedAudioErrors(root,timing,synthetic).length,kind);}});
  test('unknown timing, stale measured duration and truncation are rejected',()=>{for(const kind of ['null','stale','truncation']){const {root,timing}=fixture();if(kind==='null')timing.steps[0]!.audioDurationMs=null as any;if(kind==='stale')timing.steps[0]!.audioDurationMs=7000;if(kind==='truncation')timing.steps[0]!.advanceAtMs=500;assert.ok(providedAudioErrors(root,timing,synthetic).length,kind);}});
  test('remote, traversal and symlink input paths fail rather than importing external audio',()=>{for(const kind of ['remote','traversal','symlink']){const {root,timing,manifest,audio}=fixture();if(kind==='remote')manifest.items[0]!.audio='https://example.invalid/audio.wav';if(kind==='traversal'){timing.steps[0]!.audio='../outside.wav';manifest.items[0]!.audio='public/audio/../outside.wav';}if(kind==='symlink'){put(root,'public/source.wav',wav());rmSync(resolve(root,audio));symlinkSync(resolve(root,'public/source.wav'),resolve(root,audio));}put(root,'provided-audio-manifest.json',manifest);assert.ok(providedAudioErrors(root,timing,synthetic).length,kind);}});
  test('existing timing/render/subtitle pipeline reads supplied WAV without TTS',()=>{const {root}=fixture();for(const name of ['build-timing-manifest.ts','build-render-timing.ts','validate-subtitles.ts','export-subtitles.ts']){const result=runScript(root,name);assert.equal(result.status,0,`${name}: ${result.stderr}`);}const timing=JSON.parse(readFileSync(resolve(root,'timing-manifest.json'),'utf8'));assert.equal(timing.steps[0].audio,'intro/1.wav');assert.equal(timing.steps[0].audioDurationMs,2000);assert.ok(timing.steps[0].subtitleCues.length);assert.match(readFileSync(resolve(root,'src/video/render-timing.generated.ts'),'utf8'),/audio\/intro\/1.wav/);assert.match(readFileSync(resolve(root,'output/subtitles/subtitles.srt'),'utf8'),/Synthetic test/);assert.deepEqual(providedAudioErrors(root,timing,synthetic),[]);assert.equal(existsSync(resolve(root,'output/tts-manifest.json')),false);});
  test('provided source skips only TTS choice and binds source manifest into current plan/design',()=>{const {root,state,manifest}=fixture();const checks=requiredDecisionChecks(root,{state,includeGolden:false});assert.equal(checks.some(check=>check.gate==='tts-choice'),false);assert.equal(checks.some(check=>check.gate==='subtitle-change'),true);for(const gate of ['checkpoint-plan','shot-design-review']){const before=subjectForDecision(root,gate,{scope:'project'});manifest.authorization.declaration+=' Changed.';put(root,'provided-audio-manifest.json',manifest);assert.notEqual(subjectForDecision(root,gate,{scope:'project'}).digest,before.digest);}assert.throws(()=>subjectForDecision(root,'tts-choice',{scope:'project'}),/TTS|tts/);const tts=decisionContentState(state,'tts-choice',{provider:'synthetic',voice:'synthetic'});assert.equal(tts.audioSource,'tts');});
  test('delivery CLI takes provided branch but still blocks synthetic provenance and missing final media',()=>{const {root}=fixture();const args=process.execArgv.map(arg=>arg==='tsx'?resolve(process.cwd(),'node_modules/tsx/dist/loader.mjs'):arg);const result=spawnSync(process.execPath,[...args,resolve(scripts,'validate-delivery.ts')],{cwd:root,encoding:'utf8'});assert.equal(result.status,1,result.stderr);const report=JSON.parse(readFileSync(resolve(root,'output/delivery-validation.json'),'utf8'));assert.equal(report.pass,false);assert.equal(report.checks.some((check:any)=>check.name==='tts manifest'),false);assert.ok(report.checks.some((check:any)=>check.name==='provided audio'&&check.status==='fail'&&/synthetic provenance/.test(check.detail)));assert.ok(report.checks.some((check:any)=>check.name==='final render'&&check.status==='fail'));});
  test('audio source and provided provenance changes invalidate content revision',()=>{const {root,state,manifest}=fixture();const initial=captureInputRevision(root);assert.equal(initial.status,'bound',initial.issues.join('; '));manifest.items[0]!.source+=' Changed.';put(root,'provided-audio-manifest.json',manifest);assert.notEqual(captureInputRevision(root).contentRevision,initial.contentRevision);const before=captureInputRevision(root).contentRevision;put(root,'project-state.json',{...state,audioSource:'tts'});assert.notEqual(captureInputRevision(root).contentRevision,before);});
} finally { for(const root of roots)rmSync(root,{recursive:true,force:true}); }
console.log(`\nAudio source tests: ${passed} passed, ${failed} failed. Synthetic local fixtures, no real approval, TTS, render or transcription claims.`);
if(failed)process.exitCode=1;
