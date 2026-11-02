import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const TIMING = resolve(ROOT, "timing-manifest.json");
const MAX = 18;

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

if (!existsSync(TIMING)) {
  console.error("x timing-manifest.json not found. Run: npm run build-timing");
  process.exit(1);
}

const statePath = resolve(ROOT, "project-state.json");
if (existsSync(statePath) && readJson(statePath).subtitlesRequested === false) {
  console.error("v subtitle checks not applicable: subtitlesRequested=false"); process.exit(0);
}
const data = readJson(TIMING);
let failed = 0;

const CLOSING_PUNCT_RE = /^[,.;:!?，。！？；：、)\]\}）】》”’…]+/u;
const LATIN_PUNCT_NO_SPACE_RE = /[A-Za-z][,.;:!?][A-Za-z]/u;
const CJK_RE = /[\u4e00-\u9fff\u3040-\u30ff\p{Script=Hangul}]/u;
const TOKEN_RE = /[A-Za-z0-9]+(?:[’'][A-Za-z0-9]+)*(?:[-/][A-Za-z0-9]+(?:[’'][A-Za-z0-9]+)*)*|[\u4e00-\u9fff]|[\u3040-\u30ff]|\p{Script=Hangul}|[^\s]/gu;

function subtitleWidth(line: string): number {
  return (line.match(TOKEN_RE) ?? []).reduce((sum, token) => {
    if (CJK_RE.test(token)) return sum + [...token].length;
    if (/^[,.;:!?，。！？；：、)\]\}）】》”’…]+$/u.test(token)) return sum + 0.45;
    return sum + Math.max(0.55, [...token].length * 0.58);
  }, 0);
}

function possibleSplitEnglishWord(previous: string, next: string, source: string): boolean {
  if (!/[A-Za-z]$/.test(previous) || !/^[A-Za-z]/.test(next)) return false;
  const left = previous.match(/[A-Za-z]+$/)?.[0] ?? "";
  const right = next.match(/^[A-Za-z]+/)?.[0] ?? "";
  return left.length >= 2 && right.length >= 2 && source.includes(left + right);
}

for (const step of data.steps ?? []) {
  const cues = Array.isArray(step.subtitleCues) ? step.subtitleCues : [];
  const lines = cues.length > 0
    ? cues.flatMap((cue: { chunks?: string[] }) => cue.chunks ?? [])
    : step.subtitleChunks ?? [];

  for (const cue of cues) {
    if ((cue.chunks ?? []).length > 1) {
      console.error(`x ${step.chapter}/${step.step}: subtitles must be single-line by default; split into more cues instead`);
      failed++;
    }
  }

  for (const line of lines) {
    const width = subtitleWidth(line);
    if (width > MAX + 0.5) {
      console.error(`x ${step.chapter}/${step.step}: subtitle line too long (${width.toFixed(1)}) ${line}`);
      failed++;
    }
    if (CLOSING_PUNCT_RE.test(line.trim())) {
      console.error(`x ${step.chapter}/${step.step}: subtitle line starts with punctuation: ${line}`);
      failed++;
    }
    if (LATIN_PUNCT_NO_SPACE_RE.test(line)) {
      console.error(`x ${step.chapter}/${step.step}: English punctuation must keep a space before the next word: ${line}`);
      failed++;
    }
  }

  let previousEnd = 0;
  for (const cue of cues) {
    if (!Number.isFinite(cue.startMs) || !Number.isFinite(cue.endMs) || cue.endMs <= cue.startMs) {
      console.error(`x ${step.chapter}/${step.step}: invalid subtitle cue timing`);
      failed++;
    }
    if (cue.startMs < previousEnd) {
      console.error(`x ${step.chapter}/${step.step}: subtitle cues overlap or go backwards`);
      failed++;
    }
    if (cue.endMs > (step.advanceAtMs ?? 0) + 50) {
      console.error(`x ${step.chapter}/${step.step}: subtitle cue exceeds step duration`);
      failed++;
    }
    const cueLines = cue.chunks ?? [];
    for (let i = 1; i < cueLines.length; i++) {
      if (possibleSplitEnglishWord(cueLines[i - 1] ?? "", cueLines[i] ?? "", step.text ?? "")) {
        console.error(`x ${step.chapter}/${step.step}: subtitle appears to split an English word across lines`);
        failed++;
      }
    }
    if (CLOSING_PUNCT_RE.test(String(cue.text ?? cueLines.join("")).trim())) {
      console.error(`x ${step.chapter}/${step.step}: subtitle cue starts with punctuation`);
      failed++;
    }
    if (LATIN_PUNCT_NO_SPACE_RE.test(String(cue.text ?? ""))) {
      console.error(`x ${step.chapter}/${step.step}: subtitle cue has English punctuation without a following space`);
      failed++;
    }
    previousEnd = cue.endMs;
  }

  if ((step.advanceAtMs ?? 0) > 6000 && (step.text ?? "").length > 36 && cues.length <= 1) {
    console.error(`x ${step.chapter}/${step.step}: long narration must have multiple subtitle cues`);
    failed++;
  }
}

if (failed > 0) process.exit(1);
console.error("v subtitles valid");
