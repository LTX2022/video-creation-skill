/** Explicit narration routing. A local authorization declaration is not user authentication. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { hashLocalFile, readLocalJson, safeLocalPath } from './input-revision';

export type AudioSource = 'tts' | 'provided' | 'none';
export const PROVIDED_AUDIO_MANIFEST = 'provided-audio-manifest.json';

/** Missing source retains legacy semantics; an explicit contradictory source is never a bypass. */
export function resolveAudioSource(state: any): AudioSource {
  if (state?.audioRequested !== undefined && typeof state.audioRequested !== 'boolean') throw new Error('audioRequested must be a boolean');
  const source = state?.audioSource === undefined ? (state?.audioRequested === true ? 'tts' : 'none') : state.audioSource;
  if (!['tts', 'provided', 'none'].includes(source)) throw new Error('audioSource must be tts, provided, or none');
  if ((source !== 'none') !== (state?.audioRequested === true)) throw new Error('audioSource must agree with audioRequested: tts/provided require true; none requires false');
  return source;
}

export function audioSourceErrors(state: any): string[] {
  try { resolveAudioSource(state); return []; } catch (error) { return [String((error as Error).message)]; }
}

function probeAudioMs(root: string, path: string): number | null {
  const candidates = [process.env.FFPROBE_PATH, process.env.FFMPEG_FFPROBE_PATH, process.env.REMOTION_FFPROBE_PATH, 'ffprobe',
    ...['win32-x64-msvc/ffprobe.exe','win32-x64-msvc/ffprobe','linux-x64-gnu/ffprobe','linux-x64-musl/ffprobe','darwin-x64/ffprobe','darwin-arm64/ffprobe'].map(suffix => resolve(root, `node_modules/@remotion/compositor-${suffix}`))].filter(Boolean) as string[];
  for (const command of candidates) {
    if (command !== 'ffprobe' && !existsSync(command)) continue;
    try {
      const result = JSON.parse(execFileSync(command, ['-v','error','-select_streams','a','-show_entries','stream=codec_type:format=duration','-of','json',path], {encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:15000,maxBuffer:1024*1024}));
      const duration = Number(result.format?.duration) * 1000;
      if (result.streams?.some((stream: any) => stream.codec_type === 'audio') && Number.isFinite(duration) && duration > 0) return Math.round(duration);
    } catch { /* Try only already-installed local probe candidates; never install/download. */ }
  }
  return null;
}

/** Validate supplied per-step recordings, not arbitrary long-track alignment or transcription.
 * allowSynthetic is solely for isolated regression fixtures; production callers must omit it.
 */
export function providedAudioErrors(root: string, timing: any, options: {allowSynthetic?: boolean} = {}): string[] {
  const errors: string[] = [];
  let manifest: any;
  try { manifest = readLocalJson(root, PROVIDED_AUDIO_MANIFEST); }
  catch (error) { return [`${PROVIDED_AUDIO_MANIFEST}: ${String((error as Error).message)}`]; }
  if (manifest?.schema !== 1 || manifest?.source !== 'provided') errors.push('Provided audio manifest requires schema=1 and source=provided; never relabel it as TTS');
  const authorization = manifest?.authorization;
  const kinds = options.allowSynthetic ? ['agent-transcribed','user-supplied','synthetic'] : ['agent-transcribed','user-supplied'];
  if (!kinds.includes(authorization?.kind) || typeof authorization?.userQuote !== 'string' || !authorization.userQuote.trim() || typeof authorization?.declaration !== 'string' || !authorization.declaration.trim() || !(authorization?.reference === null || (typeof authorization?.reference === 'string' && authorization.reference.trim()))) {
    errors.push('Provided audio requires an actual user authorization quote, source kind/declaration, and reference (or explicit null); synthetic provenance cannot authorize production');
  }
  const rawSteps = Array.isArray(timing?.steps) ? timing.steps : [];
  const steps = rawSteps.filter((step: any) => step && typeof step === 'object');
  if (steps.length !== rawSteps.length) errors.push('Provided audio timing contains an invalid step');
  const narrated = steps.filter((step: any) => typeof step.text === 'string' && step.text.trim());
  if (!narrated.length) errors.push('Provided narration requires at least one nonempty per-step narration text');
  const fps = Number(timing?.fps);
  if (!Number.isFinite(fps) || fps <= 0) errors.push('Provided audio timing requires a positive fps');
  const frameMs = Number.isFinite(fps) && fps > 0 ? 1000 / fps : 0;
  const items: any[] = Array.isArray(manifest?.items) ? manifest.items : [];
  if (!Array.isArray(manifest?.items)) errors.push('Provided audio manifest requires items[]');
  const byKey = new Map<string, any>(), expected = new Set(narrated.map((step: any) => `${step.chapter}/${step.step}`));
  if (expected.size !== narrated.length) errors.push('Provided audio timing contains duplicate narration steps');
  for (const item of items) {
    const key = `${item?.chapter}/${item?.step}`;
    if (!Number.isInteger(item?.step) || item.step < 1 || !expected.has(key) || byKey.has(key)) errors.push(`Provided audio has unknown, invalid, or duplicate step ${key}`);
    byKey.set(key, item);
  }
  for (const step of steps) {
    const key = `${step.chapter}/${step.step}`;
    if (!String(step.text ?? '').trim()) {
      if (step.audio) errors.push(`${key}: audio without matching narration text is unsupported; provide an accurate per-step transcript`);
      continue;
    }
    const item = byKey.get(key);
    if (!item) { errors.push(`${key}: supplied recording is missing from ${PROVIDED_AUDIO_MANIFEST}`); continue; }
    if (typeof item.source !== 'string' || !item.source.trim()) errors.push(`${key}: recording source/origin must be recorded`);
    if (item.textHash !== createHash('sha256').update(String(step.text), 'utf8').digest('hex').toUpperCase()) errors.push(`${key}: provided audio textHash differs from the current per-step narration; reconcile script/transcript, do not synthesize automatically`);
    const expectedPath = `public/audio/${step.audio ?? ''}`;
    if (typeof step.audio !== 'string' || !step.audio || item.audio !== expectedPath || !/\.(?:mp3|wav|m4a|aac|ogg)$/.test(item.audio)) { errors.push(`${key}: supplied audio must match the exact project-local public/audio path selected by build-timing`); continue; }
    try {
      const path = safeLocalPath(root, item.audio);
      const hash = hashLocalFile(root, item.audio);
      if (item.audioSha256 !== hash) errors.push(`${key}: provided audio SHA256 differs from the current local file`);
      if (statSync(path).size < 512) errors.push(`${key}: supplied audio file is suspiciously small`);
      const measured = probeAudioMs(root, path);
      if (measured === null) errors.push(`${key}: real audio stream/duration could not be probed; missing/invalid files or unavailable ffprobe cannot pass`);
      if (!Number.isFinite(step.audioDurationMs) || step.audioDurationMs <= 0) errors.push(`${key}: timing has no positive measured audioDurationMs; run build-timing`);
      else if (measured !== null && Math.abs(step.audioDurationMs - measured) > Math.max(2, frameMs)) errors.push(`${key}: audio duration changed; rebuild timing from current local recordings`);
      if (!Number.isFinite(step.advanceAtMs) || step.advanceAtMs <= 0 || (measured !== null && step.advanceAtMs + frameMs < measured)) errors.push(`${key}: timing truncates or does not cover the supplied narration`);
      if ((step.warnings ?? []).some((warning: unknown) => /audio missing|ffprobe unavailable/i.test(String(warning)))) errors.push(`${key}: unresolved audio/ffprobe timing warning`);
      if (hashLocalFile(root, item.audio) !== hash) errors.push(`${key}: recording changed during validation`);
    } catch (error) { errors.push(`${key}: ${String((error as Error).message)}`); }
  }
  return errors;
}
