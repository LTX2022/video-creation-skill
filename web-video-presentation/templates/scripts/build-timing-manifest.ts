import {writeGeneratedJsonIfChanged} from "./stable-generated-file";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const REGISTRY_PATH = resolve(ROOT, "src/registry/chapters.ts");
const CHAPTERS_DIR = resolve(ROOT, "src/chapters");
const AUDIO_DIR = resolve(ROOT, "public/audio");
const OUT_PATH = resolve(ROOT, "timing-manifest.json");
const VIDEO_FORMAT_PATH = resolve(ROOT, "src/config/videoFormat.ts");

const FALLBACK_FPS = 60;
const MIN_HOLD_MS = 1800;
const MAX_SOFT_MS = 8000;
const SUBTITLE_MAX_CHARS = 18;
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg"];

interface SubtitleCue {
  startMs: number;
  endMs: number;
  text: string;
  chunks: string[];
}

interface StepTiming {
  chapter: string;
  step: number;
  text: string;
  audio: string | null;
  audioDurationMs: number | null;
  minHoldMs: number;
  readableHoldMs: number;
  advanceAtMs: number;
  durationInFrames?: number;
  subtitleChunks: string[];
  subtitleCues: SubtitleCue[];
  warnings: string[];
}

function readFps(): number {
  if (!existsSync(VIDEO_FORMAT_PATH)) return FALLBACK_FPS;
  const src = readFileSync(VIDEO_FORMAT_PATH, "utf8");
  const match = src.match(/fps:\s*(\d+(?:\.\d+)?)/);
  const fps = match ? Number(match[1]) : FALLBACK_FPS;
  return Number.isFinite(fps) && fps > 0 ? fps : FALLBACK_FPS;
}

const TOKEN_RE = /[A-Za-z0-9]+(?:[’'][A-Za-z0-9]+)*(?:[-/][A-Za-z0-9]+(?:[’'][A-Za-z0-9]+)*)*|[\u4e00-\u9fff]|[\u3040-\u30ff]|\p{Script=Hangul}|[^\s]/gu;
const CLOSING_PUNCT_RE = /^[,.;:!?，。！？；：、)\]\}）】》”’…]+$/u;
const OPENING_PUNCT_RE = /^[([{（【《“‘]+$/u;
const LATIN_TOKEN_RE = /^[A-Za-z0-9]/u;
const CJK_RE = /[\u4e00-\u9fff\u3040-\u30ff\p{Script=Hangul}]/u;

function tokenize(text: string): string[] {
  return text.match(TOKEN_RE) ?? [];
}

function tokenWidth(token: string): number {
  if (token === " ") return 0.35;
  if (CJK_RE.test(token)) return [...token].length;
  if (CLOSING_PUNCT_RE.test(token) || OPENING_PUNCT_RE.test(token)) return 0.45;
  return Math.max(0.55, [...token].length * 0.58);
}

function lineWidth(line: string): number {
  return tokenize(line).reduce((sum, token) => sum + tokenWidth(token), 0);
}

function appendToken(base: string, token: string): string {
  if (!base) return token;
  const prev = [...base].at(-1) ?? "";
  if (CLOSING_PUNCT_RE.test(token)) return base + token;
  if (OPENING_PUNCT_RE.test(token)) return base + token;
  if (CLOSING_PUNCT_RE.test(prev) && LATIN_TOKEN_RE.test(token)) return `${base} ${token}`;
  if (LATIN_TOKEN_RE.test(prev) && LATIN_TOKEN_RE.test(token)) return `${base} ${token}`;
  return base + token;
}

function fixLeadingPunctuation(lines: string[]): string[] {
  const fixed: string[] = [];
  for (const rawLine of lines) {
    let line = rawLine.trim();
    const leading = line.match(/^[,.;:!?，。！？；：、)\]\}）】》”’…]+/u)?.[0] ?? "";
    if (leading && fixed.length > 0) {
      fixed[fixed.length - 1] += leading;
      line = line.slice(leading.length).trim();
    }
    if (line) fixed.push(line);
  }
  return fixed;
}

function splitSubtitleLines(text: string, max = SUBTITLE_MAX_CHARS): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const lines: string[] = [];
  let current = "";
  for (const token of tokenize(clean)) {
    if (CLOSING_PUNCT_RE.test(token) && !current && lines.length > 0) {
      lines[lines.length - 1] += token;
      continue;
    }
    const candidate = appendToken(current, token);
    if (current && lineWidth(candidate) > max) {
      lines.push(current);
      current = token;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return fixLeadingPunctuation(lines);
}

function splitCueUnits(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const units: string[] = [];
  let current = "";
  for (const token of tokenize(clean)) {
    current = appendToken(current, token);
    if (/^[。！？!?；;]$/u.test(token)) {
      units.push(current.trim());
      current = "";
    } else if (/^[，,、：:]$/u.test(token) && lineWidth(current) >= 10) {
      units.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) units.push(current.trim());
  return fixLeadingPunctuation(units);
}

function buildSubtitleCues(text: string, durationMs: number): SubtitleCue[] {
  const units = splitCueUnits(text);
  if (units.length === 0) return [];

  const cueTexts: string[] = [];
  let current: string[] = [];
  for (const unit of units) {
    for (const line of splitSubtitleLines(unit)) {
      current.push(line);
      if (current.length >= 1) {
        cueTexts.push(current.join("\n"));
        current = [];
      }
    }
  }
  if (current.length > 0) cueTexts.push(current.join("\n"));

  const totalMs = Math.max(900, durationMs);
  const weights = cueTexts.map((cue) => Math.max(1, [...cue.replace(/\s+/g, "")].length));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let cursor = 0;

  return cueTexts.map((cueText, index) => {
    const isLast = index === cueTexts.length - 1;
    const proportionalMs = Math.round((weights[index]! / totalWeight) * totalMs);
    const endMs = isLast ? totalMs : Math.min(totalMs, cursor + Math.max(700, proportionalMs));
    const cue = {
      startMs: cursor,
      endMs,
      text: cueText.replace(/\n/g, " "),
      chunks: cueText.split("\n").filter(Boolean),
    };
    cursor = endMs;
    return cue;
  });
}

function ffprobeCandidates(): string[] {
  const env = [
    process.env.FFPROBE_PATH,
    process.env.FFMPEG_FFPROBE_PATH,
    process.env.REMOTION_FFPROBE_PATH,
  ].filter(Boolean) as string[];
  return [
    ...env,
    "ffprobe",
    resolve(ROOT, "node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe"),
    resolve(ROOT, "node_modules/@remotion/compositor-win32-x64-msvc/ffprobe"),
    resolve(ROOT, "node_modules/@remotion/compositor-linux-x64-gnu/ffprobe"),
    resolve(ROOT, "node_modules/@remotion/compositor-linux-x64-musl/ffprobe"),
    resolve(ROOT, "node_modules/@remotion/compositor-darwin-x64/ffprobe"),
    resolve(ROOT, "node_modules/@remotion/compositor-darwin-arm64/ffprobe"),
  ];
}

function durationMs(file: string): number | null {
  if (!existsSync(file)) return null;
  for (const ffprobe of ffprobeCandidates()) {
    if (ffprobe !== "ffprobe" && !existsSync(ffprobe)) continue;
    try {
      const out = execFileSync(ffprobe, [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        file,
      ], { encoding: "utf8" });
      const sec = Number.parseFloat(out.trim());
      if (Number.isFinite(sec)) return Math.round(sec * 1000);
    } catch {
      continue;
    }
  }
  return null;
}

function audioCandidates(chapterId: string, stepIndex: number): string[] {
  const baseNames = [
    String(stepIndex),
    String(stepIndex).padStart(2, "0"),
    String(stepIndex).padStart(3, "0"),
  ];
  const candidates: string[] = [];
  for (const base of baseNames) {
    for (const ext of AUDIO_EXTENSIONS) {
      candidates.push(`${chapterId}/${base}${ext}`);
    }
  }
  return candidates;
}

function findAudioRel(chapterId: string, stepIndex: number, text: string): string | null {
  if (!text.trim()) return null;
  for (const rel of audioCandidates(chapterId, stepIndex)) {
    if (existsSync(join(AUDIO_DIR, rel))) return rel;
  }
  return `${chapterId}/${stepIndex}.mp3`;
}

function readChapterOrder(): { id: string; folder: string }[] {
  const src = readFileSync(REGISTRY_PATH, "utf8");
  const ids = [...src.matchAll(/id:\s*["']([^"']+)["']/g)].map((m) => m[1]!);
  const folders = [...src.matchAll(/from\s+["']\.\.\/chapters\/([^"'\/]+)\/narrations["']/g)].map((m) => m[1]!);
  return ids.map((id) => {
    const folder = folders.find((f) => f.endsWith("-" + id)) ?? folders.find((f) => f === id);
    if (!folder) throw new Error(`No narrations import found for chapter ${id}`);
    return { id, folder };
  });
}

async function loadNarrations(folder: string): Promise<string[]> {
  const file = join(CHAPTERS_DIR, folder, "narrations.ts");
  const mod = await import(pathToFileURL(file).href + "?t=" + Date.now());
  if (!Array.isArray(mod.narrations)) throw new Error(`${folder}/narrations.ts must export narrations`);
  return mod.narrations;
}

async function main() {
  const fps = readFps();
  const statePath = resolve(ROOT, "project-state.json");
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
  const explicit = state.timingMode === 'explicit';
  if (state.timingMode && !['narration', 'explicit'].includes(state.timingMode)) throw new Error('timingMode must be narration or explicit');
  if (explicit && !Array.isArray(state.stepTimings)) throw new Error('Explicit timing requires stepTimings[]');
  const explicitByKey = new Map<string, number>();
  for (const entry of explicit ? state.stepTimings : []) {
    const key = `${entry.chapter}/${entry.step}`;
    if (explicitByKey.has(key) || !Number.isInteger(entry.step) || entry.step < 1 || !Number.isInteger(entry.durationInFrames) || entry.durationInFrames < 1) throw new Error(`Invalid or duplicate explicit timing ${key}`);
    explicitByKey.set(key, entry.durationInFrames);
  }
  const steps: StepTiming[] = [];
  for (const { id, folder } of readChapterOrder()) {
    const narrations = await loadNarrations(folder);
    for (let i = 0; i < narrations.length; i++) {
      const text = narrations[i] ?? "";
      const audioRel = state.audioRequested === false ? null : findAudioRel(id, i + 1, text);
      const audioAbs = audioRel ? join(AUDIO_DIR, audioRel) : "";
      const audioMs = audioRel ? durationMs(audioAbs) : null;
      const estimatedMs = Math.max(MIN_HOLD_MS, text.length * 260);
      const durationFrames = explicitByKey.get(`${id}/${i + 1}`);
      if (explicit && durationFrames === undefined) throw new Error(`Missing explicit timing ${id}/${i + 1}`);
      const baseDurationMs = explicit ? durationFrames! / fps * 1000 : audioMs ?? estimatedMs;
      if (explicit && audioMs !== null && audioMs > baseDurationMs + 1000 / fps) throw new Error(`Explicit timing truncates narration ${id}/${i + 1}`);
      const subtitleCues = state.subtitlesRequested === false ? [] : buildSubtitleCues(text, baseDurationMs);
      const readableHoldMs = explicit ? baseDurationMs : Math.max(MIN_HOLD_MS, ...subtitleCues.map((cue) => cue.endMs));
      const advanceAtMs = Math.max(readableHoldMs, baseDurationMs);
      const warnings: string[] = [];
      if (!explicit && advanceAtMs > MAX_SOFT_MS) warnings.push("step longer than 8000ms; consider splitting visual step");
      if (state.subtitlesRequested !== false && text.length > 60) warnings.push("narration is dense; check subtitle readability");
      if (state.subtitlesRequested !== false && subtitleCues.length <= 1 && text.length > 36) warnings.push("subtitle has only one cue; add punctuation or split narration");
      if (audioRel && audioMs === null) warnings.push("audio missing or ffprobe unavailable; using estimate");
      steps.push({
        chapter: id,
        step: i + 1,
        text,
        audio: audioRel,
        audioDurationMs: audioMs,
        minHoldMs: MIN_HOLD_MS,
        readableHoldMs,
        advanceAtMs,
        durationInFrames: explicit ? durationFrames : undefined,
        subtitleChunks: subtitleCues[0]?.chunks ?? [],
        subtitleCues,
        warnings,
      });
    }
  }

  if (explicit && steps.length !== explicitByKey.size) throw new Error('stepTimings contains unknown chapters/steps');
  const manifest = {
    timingMode: explicit ? 'explicit' : 'narration',
    version: 2,
    fps,
    generatedAt: new Date().toISOString(),
    rules: {
      minHoldMs: MIN_HOLD_MS,
      maxSoftMs: MAX_SOFT_MS,
      subtitleMaxChars: SUBTITLE_MAX_CHARS,
      subtitlesUseCues: true,
    },
    steps,
  };
  const changed = writeGeneratedJsonIfChanged(OUT_PATH, manifest);
  console.error(`v ${changed ? "wrote" : "unchanged"} ${OUT_PATH} (${steps.length} steps @ ${fps}fps)`);
}

main().catch((err) => {
  console.error("x " + (err.message ?? err));
  process.exit(1);
});
