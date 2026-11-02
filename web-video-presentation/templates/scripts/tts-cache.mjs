/** Offline TTS request identity and verified-file cache. Never contacts a provider. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const self = fileURLToPath(import.meta.url);
const SCHEMA = 2;
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const json = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const canonical = (value) => JSON.stringify(sort(value));
function sort(value) {
  if (Array.isArray(value)) return value.map(sort);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sort(value[key])]));
  return value;
}
function writeJson(file, value) {
  const temp = `${file}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', {mode: 0o600});
  fs.renameSync(temp, file);
}

// Only the explicit non-secret request allowlist below is serialized. Endpoint
// credentials/query strings are bound by digest, never logged or stored raw.
function describe(provider, requestedVoice) {
  const env = process.env;
  const common = {schema: 1, provider, voice: requestedVoice || null,
    voiceRevision: env.PRESENTATION_TTS_VOICE_REVISION || null, cacheRevision: env.PRESENTATION_TTS_CACHE_REVISION || null,
    model: null, parameters: {}, outputFormat: 'mp3', adapterVersion: `${provider}-request-v2`,
    identityStatus: 'unknown', identityReason: 'provider-model-or-voice-revision-unresolved'};
  if (provider === 'openai') return {...common,
    voice: requestedVoice || 'alloy', model: env.OPENAI_TTS_MODEL || 'tts-1',
    parameters: {response_format: 'mp3', speed: 1},
    endpointSha256: sha(`${env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}/audio/speech`),
    identityStatus: 'known', identityReason: 'resolved-request-not-provider-internal-weights'};
  if (provider === 'minimax') return {...common,
    parameters: {voiceOmitted: !requestedVoice, cliDefaults: 'unresolved'},
    endpointSha256: null, identityReason: 'mmx-effective-model-and-defaults-unresolved'};
  if (provider === 'voicebox') {
    const rest = env.VOICEBOX_USE_REST === '1';
    const mcp = env.VOICEBOX_MCP_URL || 'http://192.168.31.200:17493/mcp';
    const base = env.VOICEBOX_HTTP_BASE || mcp.replace(/\/mcp$/, '');
    const voice = env.VOICEBOX_RESOLVED_PROFILE_ID || requestedVoice || env.VOICEBOX_DEFAULT_VOICE || null;
    return {...common, voice, transport: rest ? 'rest' : 'mcp',
      parameters: rest ? {language: env.VOICEBOX_LANGUAGE || 'zh', profile_id: voice,
        localConversion: 'ffmpeg-libmp3lame-qscale-2-when-available'} : {
        tool: env.VOICEBOX_MCP_TOOL || 'voicebox.speak',
        textField: env.VOICEBOX_TEXT_FIELD || 'text', voiceField: env.VOICEBOX_VOICE_FIELD || 'profile',
        formatField: env.VOICEBOX_FORMAT_FIELD || null,
        requestedFormat: env.VOICEBOX_FORMAT_FIELD ? 'mp3' : null},
      endpointSha256: sha(canonical({mcp, base,
        statusPath: env.VOICEBOX_STATUS_PATH || '/generate/{id}/status',
        audioPath: env.VOICEBOX_AUDIO_PATH || '/audio/{id}'})),
      identityReason: 'voicebox-model-and-profile-revision-unresolved'};
  }
  return {...common, identityReason: 'adapter-request-descriptor-unavailable'};
}

function request(root, providerFile, descriptorFile, text) {
  const descriptor = json(descriptorFile);
  if (!descriptor || descriptor.schema !== 1 || typeof descriptor.provider !== 'string' ||
      !descriptor.adapterVersion || !descriptor.outputFormat || !descriptor.parameters ||
      !['known', 'unknown'].includes(descriptor.identityStatus)) throw new Error('invalid offline request descriptor');
  const adapterSha256 = sha(fs.readFileSync(providerFile));
  const implementationSha256 = sha(Buffer.concat([fs.readFileSync(self), fs.readFileSync(path.join(root, 'scripts/synthesize-audio.sh'))]));
  const value = {schema: SCHEMA, textHash: sha(text), descriptor, adapterSha256, implementationSha256};
  // A caller cannot turn missing effective model/voice fields into a cache hit by
  // merely setting identityStatus. Adapter code must resolve the real identity.
  const reusable = descriptor.identityStatus === 'known' && typeof descriptor.model === 'string' && !!descriptor.model &&
    typeof descriptor.voice === 'string' && !!descriptor.voice;
  return {...value, requestKey: sha(canonical(value)), reusable};
}

function probeAudio(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.length === 0) throw new Error('empty audio');
  const result = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-f', 'mp3',
    '-select_streams', 'a:0', '-show_entries', 'stream=codec_name,sample_rate,channels:format=duration', '-of', 'json', file],
  {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000}));
  const stream = result.streams?.[0];
  const durationMs = Number(result.format?.duration) * 1000;
  if (stream?.codec_name !== 'mp3' || !Number.isFinite(durationMs) || durationMs <= 0 ||
      !(Number(stream.sample_rate) > 0) || !(Number(stream.channels) > 0)) throw new Error('unverified MP3 audio');
  return {audioSha256: sha(bytes), bytes: bytes.length, audioDurationMs: durationMs,
    audioProbe: {schema: 1, codec: stream.codec_name, sampleRate: Number(stream.sample_rate), channels: Number(stream.channels)}};
}

function rows(root) {
  const data = json(path.join(root, 'audio-segments.json'));
  if (!Array.isArray(data)) throw new Error('audio-segments.json must be an array');
  const seen = new Set();
  return data.map((row) => {
    const chapter = String(row.chapter ?? '');
    const step = Number(row.step);
    const text = String(row.text ?? '');
    if (!chapter || chapter === '.' || chapter === '..' || /[\\/\s\0]/u.test(chapter) ||
        !Number.isSafeInteger(step) || step < 0 || text.includes('\0')) throw new Error('invalid segment identity/text');
    const id = `${chapter}/${step}`;
    if (seen.has(id)) throw new Error('duplicate segment identity');
    seen.add(id);
    return {chapter, step, text};
  });
}

function readManifest(root) {
  try { return json(path.join(root, 'output/tts-manifest.json')); } catch { return null; }
}
function findRow(manifest, row) {
  return (Array.isArray(manifest?.items) ? manifest.items : []).find((item) => String(item.chapter) === row.chapter && Number(item.step) === row.step);
}
function match(manifest, previous, req, audio) {
  if (!previous || manifest?.schema !== SCHEMA || previous.cacheSchema !== SCHEMA) return 'missing-or-legacy-metadata';
  if (previous.status !== 'success') return 'previous-not-successful';
  if (!req.reusable || previous.request?.reusable !== true) return 'request-identity-unknown';
  if (previous.requestKey !== req.requestKey || canonical(previous.request) !== canonical(req)) return 'request-changed';
  if (!Number.isFinite(previous.audioDurationMs) || previous.audioDurationMs <= 0 || !previous.audioProbe) return 'missing-audio-evidence';
  let current;
  try { current = probeAudio(audio); } catch { return 'audio-missing-or-unverified'; }
  if (current.audioSha256 !== previous.audioSha256 || current.bytes !== previous.bytes ||
      current.audioDurationMs !== previous.audioDurationMs || canonical(current.audioProbe) !== canonical(previous.audioProbe)) return 'audio-evidence-changed';
  return null;
}
function plan(root, providerFile, descriptorFile, output, force) {
  const manifest = readManifest(root);
  const planRows = rows(root).map((row) => {
    const req = request(root, providerFile, descriptorFile, row.text);
    const audio = path.join(root, 'public/audio', row.chapter, `${row.step}.mp3`);
    const previous = findRow(manifest, row);
    const reason = force ? 'forced' : match(manifest, previous, req, audio);
    const existed = !!previous || fs.existsSync(audio);
    return {...row, textBase64: Buffer.from(row.text).toString('base64'), action: reason ? (existed && !force ? 'blocked' : 'synthesize') : 'reuse', reason: reason || 'verified-request-and-audio', request: req};
  });
  writeJson(output, {schema: SCHEMA, rows: planRows});
  const counts = Object.fromEntries(['reuse', 'synthesize', 'blocked'].map((action) => [action, planRows.filter((row) => row.action === action).length]));
  console.log(`TTS cache plan: reuse=${counts.reuse} synthesize=${counts.synthesize} blocked=${counts.blocked}`);
  for (const row of planRows.filter((item) => item.action === 'blocked')) console.error(`x ${row.chapter}/${row.step}: ${row.reason}; existing synthesis is not reusable.`);
  if (counts.blocked) {
    console.error('Ask the user to authorize re-synthesis, then rerun with the existing --force flag. This plan requested no synthesis; existing audio was kept. Missing cache proof does not revoke prior approval to use an audio file as material.');
    process.exitCode = 3;
  }
}

function record(root, planFile, chapter, step, status, audioFile, providerFile, descriptorFile, requestedVoice) {
  const row = json(planFile).rows.find((item) => item.chapter === chapter && item.step === Number(step));
  if (!row) throw new Error('segment is absent from the current plan');
  const req = request(root, providerFile, descriptorFile, row.text);
  let evidence = {audioSha256: '', bytes: 0, audioDurationMs: null, audioProbe: null};
  const isSuccess = status === 'synthesized' || status === 'reused';
  if (isSuccess) evidence = probeAudio(audioFile);
  const manifest = readManifest(root) || {items: []};
  if (status === 'reused' && match(manifest, findRow(manifest, row), req, audioFile)) throw new Error('cache changed after plan');
  const voice = req.descriptor.voice || 'provider-default';
  Object.assign(manifest, {schema: SCHEMA, generatedAt: new Date().toISOString(), source: 'audio-segments.json',
    sourceSha256: sha(fs.readFileSync(path.join(root, 'audio-segments.json'))), provider: req.descriptor.provider, voice});
  if (!Array.isArray(manifest.items)) manifest.items = [];
  const result = {chapter, step: Number(step), textHash: req.textHash, provider: req.descriptor.provider, voice,
    // Selection provenance is distinct from the effective request/cache identity.
    // An alias/default may resolve to the same effective voice without a paid retry.
    ...(typeof requestedVoice === 'string' ? {requestedVoice: requestedVoice || null} : {}),
    audio: `public/audio/${chapter}/${step}.mp3`, ...evidence, cacheSchema: SCHEMA,
    requestKey: req.requestKey, request: req, status: isSuccess ? 'success' : status,
    lastAction: status, updatedAt: new Date().toISOString()};
  const index = manifest.items.findIndex((item) => String(item.chapter) === chapter && Number(item.step) === Number(step));
  if (index >= 0) manifest.items[index] = result; else manifest.items.push(result);
  manifest.items.sort((a, b) => String(a.chapter).localeCompare(String(b.chapter)) || Number(a.step) - Number(b.step));
  writeJson(path.join(root, 'output/tts-manifest.json'), manifest);
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'describe') console.log(JSON.stringify(describe(...args)));
  else if (command === 'plan') plan(...args.slice(0, 4), args[4] === 'true');
  else if (command === 'rows') for (const row of json(args[0]).rows) console.log([row.chapter, row.step, `b${row.textBase64}`, row.action].join('\t'));
  else if (command === 'needs-synthesis') process.exitCode = json(args[0]).rows.some((row) => row.action === 'synthesize') ? 0 : 1;
  else if (command === 'record') record(...args);
  else if (command === 'probe') probeAudio(args[0]);
  else throw new Error('unknown cache helper command');
} catch {
  // No exception message/argv: adapters/endpoints may contain private values.
  console.error('x TTS cache validation failed; request or local MP3 evidence is invalid/unavailable.');
  process.exitCode = 1;
}
