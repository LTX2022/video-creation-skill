/** Offline integration regression: the real shell runner + replaced providers.
 * No real provider health check, voice listing, account key, or TTS call occurs.
 * FFmpeg creates synthetic local tones; these are not speech/performance tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = fs.mkdtempSync(path.join(tmpdir(), 'video-tts-cache-'));
const scripts = path.join(root, 'scripts');
const providers = path.join(scripts, 'tts-providers');
const manifestFile = path.join(root, 'output/tts-manifest.json');
const audioFile = path.join(root, 'public/audio/test/1.mp3');
const logFile = path.join(root, 'mock-calls.jsonl');
const fixture = path.join(root, 'tone.mp3');
const text = 'Synthetic local test only.\n第二行。\n\n';
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const baseEnv = {PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin`, HOME: root, TMPDIR: root,
  MOCK_LOG: logFile, MOCK_AUDIO: fixture, LANG: 'C.UTF-8'};
let passed = 0;
let baseline;
let baselineProvider;

const mocks = `
# Test-only overrides. The adapter above is never allowed to check credentials,
# list profiles, or synthesize; only its offline descriptor implementation runs.
eval "$(declare -f tts_cache_descriptor | sed '1s/tts_cache_descriptor/fixture_original_descriptor/')"
tts_check() {
  node -e 'require("fs").appendFileSync(process.env.MOCK_LOG, JSON.stringify({type:"check"})+"\\n")'
  [[ "\${MOCK_CHECK_FAIL:-0}" != 1 ]]
}
tts_list_voices() { echo 'FORBIDDEN test voice listing' >&2; return 91; }
tts_cache_descriptor() {
  fixture_original_descriptor "\${1:-}" | node -e '
    let s=""; process.stdin.on("data", d=>s+=d); process.stdin.on("end",()=>{
      const d=JSON.parse(s);
      if (d.provider === "openai") d.parameters.speed=Number(process.env.MOCK_SPEED || 1);
      if (process.env.MOCK_FORMAT) d.outputFormat=process.env.MOCK_FORMAT;
      if (process.env.MOCK_ADAPTER_VERSION) d.adapterVersion=process.env.MOCK_ADAPTER_VERSION;
      if (process.env.MOCK_IDENTITY_UNKNOWN === "1") d.identityStatus="unknown";
      if (process.env.MOCK_REMOVE_MODEL === "1") delete d.model;
      process.stdout.write(JSON.stringify(d));
    });'
}
tts_synthesize() {
  MOCK_TEXT="$1" MOCK_VOICE="\${3:-alloy}" node -e '
    require("fs").appendFileSync(process.env.MOCK_LOG,JSON.stringify({type:"synthesize",text:process.env.MOCK_TEXT,
      voice:process.env.MOCK_VOICE,model:process.env.OPENAI_TTS_MODEL||"tts-1",speed:Number(process.env.MOCK_SPEED||1)})+"\\n");'
  if [[ "\${MOCK_FAIL:-0}" == 1 ]]; then printf failed > "$2"; return 7; fi
  if [[ "\${MOCK_NO_FILE:-0}" == 1 ]]; then return 0; fi
  if [[ "\${MOCK_INVALID_AUDIO:-0}" == 1 ]]; then printf not-audio > "$2"; return 0; fi
  cp "$MOCK_AUDIO" "$2"
}
`;

function segments(value = [{chapter: 'test', step: 1, text}]) {
  fs.writeFileSync(path.join(root, 'audio-segments.json'), JSON.stringify(value));
}
function readManifest() { return JSON.parse(fs.readFileSync(manifestFile, 'utf8')); }
function saveManifest(value) { fs.writeFileSync(manifestFile, JSON.stringify(value)); }
function calls() {
  return fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [];
}
function reset() {
  saveManifest(structuredClone(baseline));
  fs.copyFileSync(fixture, audioFile);
  fs.writeFileSync(path.join(providers, 'openai.sh'), baselineProvider);
  fs.writeFileSync(logFile, '');
  segments();
}
function run(label, {env = {}, args = ['--provider=openai', '--voice=alloy'], status = 0, synth = 0, check = 0} = {}) {
  fs.writeFileSync(logFile, '');
  const result = spawnSync('bash', [path.join(scripts, 'synthesize-audio.sh'), ...args], {
    cwd: root, env: {...baseEnv, ...env}, encoding: 'utf8', timeout: 30000,
  });
  assert.equal(result.status, status, `${label}\n${result.stdout}\n${result.stderr}`);
  assert.equal(calls().filter((item) => item.type === 'synthesize').length, synth, `${label}: synthesis calls`);
  assert.equal(calls().filter((item) => item.type === 'check').length, check, `${label}: health calls`);
  assert.ok(!`${result.stdout}${result.stderr}`.includes('FORBIDDEN'), label);
  passed++;
  console.log(`PASS ${label}`);
  return result;
}
function miss(label, edit = () => {}, options = {}) {
  reset(); edit();
  return run(label, {...options, status: 3});
}

try {
  fs.mkdirSync(providers, {recursive: true});
  for (const file of ['synthesize-audio.sh', 'tts-cache.mjs']) fs.copyFileSync(path.join(here, file), path.join(scripts, file));
  for (const provider of ['openai', 'minimax', 'voicebox']) {
    const source = fs.readFileSync(path.join(here, 'tts-providers', `${provider}.sh`), 'utf8');
    fs.writeFileSync(path.join(providers, `${provider}.sh`), source + mocks);
  }
  baselineProvider = fs.readFileSync(path.join(providers, 'openai.sh'), 'utf8');
  // This provider records even being sourced; explicit non-TTS routes must stop earlier.
  fs.writeFileSync(path.join(providers, 'guard.sh'), `node -e 'require("fs").appendFileSync(process.env.MOCK_LOG,JSON.stringify({type:"loaded"})+"\\n")'\ntts_synthesize() { return 99; }\ntts_list_voices() { echo FORBIDDEN; }\n`);
  const statePath = path.join(root, 'project-state.json');
  for (const source of ['provided', 'none']) {
    fs.writeFileSync(statePath, JSON.stringify({audioSource:source,audioRequested:source !== 'none'}));
    for (const flag of ['--force', '--list-voices']) {
      run(`explicit ${source} blocks ${flag} before loading any provider`, {args:['--provider=guard','--voice=synthetic',flag],status:1});
      assert.equal(calls().length,0,'source guard must run before provider load, health, voice list or synthesis');
    }
  }
  for (const state of [{audioSource:'unknown',audioRequested:true},{audioSource:'tts',audioRequested:false},{audioSource:'provided',audioRequested:false},{audioSource:'none',audioRequested:true},{audioSource:'tts',audioRequested:'true'}]) {
    fs.writeFileSync(statePath,JSON.stringify(state));
    run(`invalid explicit route ${JSON.stringify(state)} blocks --force`,{args:['--provider=guard','--voice=synthetic','--force'],status:1});
    assert.equal(calls().length,0);
  }
  for (const state of [{}, {audioRequested:false},{audioRequested:'false'},{audioRequested:0},{audioRequested:null},null,[],false]) {
    const bytes=JSON.stringify(state);fs.writeFileSync(statePath,bytes);
    for (const flag of ['', '--force', '--list-voices']) {
      run(`legacy silent/invalid state ${bytes} blocks ${flag||'normal'} before provider loading`,{args:['--provider=guard','--voice=synthetic',...(flag?[flag]:[])],status:1});
      assert.equal(calls().length,0);
      assert.equal(fs.existsSync(path.join(root,'output')),false,'guard cannot create output directory');
      assert.equal(fs.existsSync(path.join(root,'feedback-events.jsonl')),false,'guard cannot record an event');
      assert.equal(fs.readFileSync(statePath,'utf8'),bytes,'guard cannot rewrite authorization');
    }
  }
  fs.rmSync(statePath);
  for (const flag of ['', '--force', '--list-voices']) {
    run(`missing state blocks ${flag||'normal'} before provider loading`,{args:['--provider=guard','--voice=synthetic',...(flag?[flag]:[])],status:1});
    assert.equal(calls().length,0);
    assert.equal(fs.existsSync(path.join(root,'output')),false);
    assert.equal(fs.existsSync(path.join(root,'feedback-events.jsonl')),false);
    assert.equal(fs.existsSync(statePath),false);
  }
  fs.writeFileSync(statePath,JSON.stringify({audioRequested:true}));
  const ffmpeg = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.25',
    '-codec:a', 'libmp3lame', '-q:a', '5', fixture], {env: baseEnv, encoding: 'utf8'});
  assert.equal(ffmpeg.status, 0, `Local FFmpeg fixture failed: ${ffmpeg.stderr}`);
  segments();
  run('fresh explicit request synthesizes only through isolated mock', {synth: 1, check: 1});
  baseline = readManifest();
  assert.equal(baseline.schema, 2);
  assert.equal(baseline.items[0].request.descriptor.model, 'tts-1');
  assert.equal(baseline.items[0].request.descriptor.voice, 'alloy');
  assert.equal(baseline.items[0].requestedVoice, 'alloy');
  assert.equal(baseline.items[0].status, 'success');
  assert.equal(baseline.items[0].audioSha256, sha(audioFile));
  assert.ok(baseline.items[0].audioDurationMs > 0);
  assert.equal(calls().find((item) => item.type === 'synthesize').text, text, 'actual shell argument preserves trailing newlines');

  run('same input reuses verified MP3 without even a provider health check');
  fs.writeFileSync(statePath,JSON.stringify({audioSource:'tts',audioRequested:true}));
  run('explicit valid TTS source retains verified cache behavior');
  for (const state of [{audioRequested:true}]) {
    fs.writeFileSync(statePath,JSON.stringify(state));
    run(`legacy compatible state ${JSON.stringify(state)} retains verified cache behavior`);
  }
  fs.writeFileSync(statePath,JSON.stringify({audioRequested:true}));
  assert.equal(readManifest().items[0].lastAction, 'reused');
  run('resolved model default equals explicitly configured tts-1', {env: {OPENAI_TTS_MODEL: 'tts-1'}});
  run('approved default voice resolves to the same alloy request', {args: ['--provider=openai', '--allow-provider-default']});
  assert.equal(readManifest().items[0].requestedVoice, null);
  assert.equal(readManifest().items[0].voice, 'alloy');
  assert.equal(readManifest().items[0].requestKey, baseline.items[0].requestKey, 'Requested/default spelling must not change effective cache identity');
  miss('model change invalidates before any provider call', () => {}, {env: {OPENAI_TTS_MODEL: 'tts-1-hd'}});
  miss('voice change invalidates', () => {}, {args: ['--provider=openai', '--voice=nova']});
  miss('text change invalidates', () => segments([{chapter: 'test', step: 1, text: text + 'changed'}]));
  miss('trailing-newline text change invalidates', () => segments([{chapter: 'test', step: 1, text: text.trimEnd()}]));
  miss('effective parameter change invalidates', () => {}, {env: {MOCK_SPEED: '1.25'}});
  miss('output format change invalidates', () => {}, {env: {MOCK_FORMAT: 'wav'}});
  miss('declared adapter version change invalidates', () => {}, {env: {MOCK_ADAPTER_VERSION: 'test-request-v3'}});
  miss('explicit voice revision invalidates', () => {}, {env: {PRESENTATION_TTS_VOICE_REVISION: 'profile-edit-2'}});
  miss('explicit cache revision invalidates', () => {}, {env: {PRESENTATION_TTS_CACHE_REVISION: 'backend-revision-2'}});
  miss('endpoint identity change invalidates without plaintext URL storage', () => {}, {env: {OPENAI_BASE_URL: 'https://fixture.invalid/v1'}});
  miss('adapter source change invalidates', () => fs.appendFileSync(path.join(providers, 'openai.sh'), '\n# adapter revision change\n'));
  miss('modified output bytes invalidate', () => fs.appendFileSync(audioFile, 'changed'));
  miss('missing output file invalidates', () => fs.unlinkSync(audioFile));
  miss('missing audio duration evidence invalidates', () => {const m = readManifest(); delete m.items[0].audioDurationMs; saveManifest(m);});
  miss('missing audio byte-size evidence invalidates', () => {const m = readManifest(); delete m.items[0].bytes; saveManifest(m);});
  miss('mismatched audio duration evidence invalidates', () => {const m = readManifest(); m.items[0].audioDurationMs += 1; saveManifest(m);});
  miss('mismatched codec evidence invalidates', () => {const m = readManifest(); m.items[0].audioProbe.codec = 'aac'; saveManifest(m);});
  miss('previous failed status is never a hit', () => {const m = readManifest(); m.items[0].status = 'failed'; saveManifest(m);});
  miss('interrupted pending status is never a hit', () => {const m = readManifest(); m.items[0].status = 'pending'; saveManifest(m);});
  miss('unknown effective request identity is never a hit', () => {}, {env: {MOCK_IDENTITY_UNKNOWN: '1'}});
  miss('missing effective model cannot be asserted known', () => {}, {env: {MOCK_REMOVE_MODEL: '1'}});
  miss('legacy schema without new request metadata is rejected', () => {const m = readManifest(); m.schema = 1; delete m.items[0].request; delete m.items[0].cacheSchema; saveManifest(m);});
  miss('missing request field is rejected', () => {const m = readManifest(); delete m.items[0].request; saveManifest(m);});
  miss('corrupt manifest does not silently authorize paid synthesis', () => fs.writeFileSync(manifestFile, '{broken'));
  miss('all-segment plan blocks before synthesizing any new segment', () => segments([
    {chapter: 'new', step: 1, text: 'new local synthetic segment'}, {chapter: 'test', step: 1, text: text + 'changed'},
  ]));

  reset();
  run('explicit authorized --force can replace a changed model', {args: ['--provider=openai', '--voice=alloy', '--force'], env: {OPENAI_TTS_MODEL: 'tts-1-hd'}, synth: 1, check: 1});
  assert.equal(readManifest().items[0].request.descriptor.model, 'tts-1-hd');
  assert.equal(calls().find((item) => item.type === 'synthesize').model, 'tts-1-hd');
  run('new successful model request is reusable', {env: {OPENAI_TTS_MODEL: 'tts-1-hd'}});

  for (const [label, env] of [['provider failure', {MOCK_FAIL: '1'}], ['success exit but missing output', {MOCK_NO_FILE: '1'}], ['success exit but invalid audio', {MOCK_INVALID_AUDIO: '1'}]]) {
    reset(); const oldHash = sha(audioFile);
    run(`${label} records failed and preserves previous bytes`, {args: ['--provider=openai', '--voice=alloy', '--force'], env, status: 2, synth: 1, check: 1});
    assert.equal(readManifest().items[0].status, 'failed');
    assert.equal(readManifest().items[0].audioSha256, '');
    assert.equal(sha(audioFile), oldHash);
    run(`${label} cannot become a later cache hit`, {status: 3});
  }

  reset();
  const endpoint = 'https://user:fixture-secret@fixture.invalid/v1?token=fixture-token';
  const result = run('private endpoint and fake credential markers never enter logs/manifest', {
    args: ['--provider=openai', '--voice=alloy', '--force'],
    env: {OPENAI_BASE_URL: endpoint, OPENAI_API_KEY: 'fixture-key-not-a-real-account'}, synth: 1, check: 1,
  });
  const persisted = result.stdout + result.stderr + fs.readFileSync(manifestFile, 'utf8') + fs.readFileSync(path.join(root, 'feedback-events.jsonl'), 'utf8');
  for (const marker of [endpoint, 'fixture-secret', 'fixture-token', 'fixture-key-not-a-real-account']) assert.ok(!persisted.includes(marker));
  run('private endpoint digest permits identical-request reuse', {env: {OPENAI_BASE_URL: endpoint}});

  reset();
  run('auto still selects MMX only, never OpenAI or Voicebox', {args: ['--voice=fixture-voice', '--force'], synth: 1, check: 1});
  assert.equal(readManifest().provider, 'minimax');
  run('MMX unresolved effective defaults honestly block automatic reuse', {args: ['--voice=fixture-voice'], status: 3});
  reset();
  run('MMX unavailability does not silently select another backend', {args: ['--voice=fixture-voice', '--force'], env: {MOCK_CHECK_FAIL: '1'}, status: 1, check: 1});
  reset();
  run('explicit Voicebox route remains available only through mock', {args: ['--provider=voicebox', '--voice=fixture-profile', '--force'], env:{VOICEBOX_RESOLVED_PROFILE_ID:'resolved-fixture-id'}, synth: 1, check: 1});
  assert.equal(readManifest().items[0].requestedVoice, 'fixture-profile');
  assert.equal(readManifest().items[0].voice, 'resolved-fixture-id');
  run('Voicebox unresolved model/profile identity cannot claim persistent reuse', {args: ['--provider=voicebox', '--voice=fixture-profile'], status: 3});

  console.log(`TTS cache integration tests: ${passed} passed (local synthetic MP3; zero external TTS/health/list calls).`);
} finally {
  fs.rmSync(root, {recursive: true, force: true});
}
