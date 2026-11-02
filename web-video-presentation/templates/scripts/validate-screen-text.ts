import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { editorialText, normalizeScreenText, repeatsNarration, screenTextIntentErrors, substantialProse } from "./screen-quality";

const ROOT = resolve(process.cwd());
const CHAPTERS_DIR = resolve(ROOT, "src/chapters");
const SHOT_PATH = resolve(ROOT, "shot-manifest.json");
const TIMING_PATH = resolve(ROOT, "timing-manifest.json");
const ZERO_WIDTH_TEST_RE = /[\u200B\u200C\u200D\u2060\uFEFF]/;

let failed = 0;

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

const normalizeText = normalizeScreenText;

function hasZeroWidth(value: string): boolean {
  return ZERO_WIDTH_TEST_RE.test(value);
}

function proseChunks(value: string): string[] {
  if (!substantialProse(value)) return [];
  const normalized = normalizeText(value);
  const size = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(value) ? 24 : 40;
  const chunks = new Set<string>();
  for (let i = 0; i <= normalized.length - size; i++) chunks.add(normalized.slice(i, i + size));
  return [...chunks];
}

function readChapterSource(chapterId: string): { source: string; files: Array<{ path: string; source: string }> } {
  if (!existsSync(CHAPTERS_DIR)) return { source: "", files: [] };
  const folder = readdirSync(CHAPTERS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .find((name) => name.endsWith(`-${chapterId}`) || name === chapterId);
  if (!folder) return { source: "", files: [] };

  const dir = join(CHAPTERS_DIR, folder);
  const files = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .filter((entry) => /\.(tsx|jsx|ts|js)$/.test(entry.name))
    .filter((entry) => entry.name !== "narrations.ts")
    .map((entry) => {
      const path = join(dir, entry.name);
      return { path, source: readFileSync(path, "utf8") };
    });
  return { source: files.map((file) => file.source).join("\n"), files };
}

if (!existsSync(SHOT_PATH)) {
  console.error("x shot-manifest.json not found. Run: npm run build-shot-manifest, then edit it.");
  process.exit(1);
}

const statePath = resolve(ROOT, 'project-state.json');
const state = existsSync(statePath) ? readJson(statePath) : {};
// Legacy states remain conservative. Explicitly silent graphics have no spoken
// redundancy, but retain malformed-data/hidden-character checks and density warnings.
const hasSpokenOrCaptionedText = state.audioRequested !== false || state.subtitlesRequested !== false;
const shot = readJson(SHOT_PATH);
const timing = existsSync(TIMING_PATH)
  ? readJson(TIMING_PATH)
  : { steps: [] };

const timingByStep = new Map<string, any>();
if (!Array.isArray(shot?.steps) || !shot.steps.length) {
  console.error("x shot-manifest.json must contain a nonempty steps array");
  process.exit(1);
}
if (!Array.isArray(timing?.steps)) {
  console.error("x timing-manifest.json steps must be an array");
  process.exit(1);
}
for (const step of timing.steps) {
  if (!step || typeof step !== 'object' || Array.isArray(step) || (step.text !== undefined && typeof step.text !== 'string')) {
    console.error('x timing-manifest.json contains a malformed step or non-string text');
    failed++;
    continue;
  }
  timingByStep.set(`${step.chapter}/${step.step}`, step);
}

const shotSteps = Array.isArray(shot.steps) ? shot.steps : [];
const checkedChapters = new Set<string>();

for (let index = 0; index < shotSteps.length; index++) {
  const item = shotSteps[index];
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    console.error(`x shot steps[${index}] must be an object`);
    failed++;
    continue;
  }
  const key = `${item.chapter}/${item.step}`;
  if (item.scriptText !== undefined && typeof item.scriptText !== 'string') {
    console.error(`x shot ${key}: scriptText must be a string`);
    failed++;
  }
  for (const error of screenTextIntentErrors(item)) { console.error(`x shot ${key}: ${error}`); failed++; }
  const text = String(timingByStep.get(key)?.text ?? item.scriptText ?? "");
  const normalizedNarration = normalizeText(text);
  const checkDuplication = hasSpokenOrCaptionedText && normalizedNarration.length > 0;
  const allowSubtitleOverlap = item.allowSubtitleOverlap === true;
  const isOpeningOrEnding = index === 0 || index === shotSteps.length - 1;
  const hasOverlapReason = String(item.overlapReason ?? "").trim().length > 0;
  const allowAuditedOverlap = allowSubtitleOverlap && isOpeningOrEnding && hasOverlapReason;

  if (hasZeroWidth(text) || hasZeroWidth(String(item.scriptText ?? ""))) {
    console.error(`x shot ${key}: scriptText contains zero-width characters. Do not use hidden characters to bypass text checks.`);
    failed++;
  }

  if (allowSubtitleOverlap && !allowAuditedOverlap) {
    console.error(`x shot ${key}: allowSubtitleOverlap is only valid for opening/ending title steps and requires overlapReason`);
    failed++;
  }

  const onScreenText = item.onScreenText;
  if (onScreenText !== undefined && !Array.isArray(onScreenText)) {
    console.error(`x shot ${key}: onScreenText must be an array of strings, or []`);
    failed++;
  }

  // Counts and lengths are review prompts, not a ban on needed data labels or editorial titles.
  const labelCount = Array.isArray(onScreenText) ? onScreenText.filter((v: unknown) => String(v ?? "").trim().length > 0).length : 0;
  const maxLabels = isOpeningOrEnding ? 3 : 2;
  if (labelCount > maxLabels) {
    console.warn(`! heuristic review: shot ${key}: ${labelCount} onScreenText labels exceed the ${maxLabels}-label reference budget; check intent, hierarchy and reading time.`);
  }

  const labels = Array.isArray(onScreenText) ? onScreenText : [];
  for (const value of labels) {
    if (typeof value !== 'string') {
      console.error(`x shot ${key}: onScreenText entries must be strings (write numbers with their units as text)`);
      failed++;
      continue;
    }
    if (hasZeroWidth(String(value))) {
      console.error(`x shot ${key}: onScreenText contains zero-width characters. Remove hidden separators.`);
      failed++;
    }
    const normalizedValue = normalizeText(String(value));
    if (!normalizedValue) continue;
    const maxLabelLength = 12;
    if (normalizedValue.length > maxLabelLength) {
      console.warn(`! heuristic review: shot ${key}: onScreenText "${value}" exceeds the 12-character label guideline; verify needed terms, editorial intent and reading time.`);
    }
  }

  // Evaluate complete declared screen copy, including prose split across labels.
  // Shared names, units, technical terms and empty narration are never a duplicate by themselves.
  const screenCopy = labels.filter((value: unknown): value is string => typeof value === 'string').join(' ');
  const explicitDoubleCaption = state.subtitlesRequested === true && item.screenTextIntent === 'captions' && normalizeText(screenCopy) === normalizedNarration;
  if (checkDuplication && !allowAuditedOverlap && (explicitDoubleCaption || [...labels.filter((value: unknown) => typeof value === 'string'), screenCopy].some((value: string) => repeatsNarration(value, text)))) {
    if (editorialText(item) && state.subtitlesRequested === false && item.screenTextIntent !== 'captions') {
      console.warn(`! heuristic review: shot ${key}: substantial narration is also used as editorial screen copy; review the accepted shot intent and reading time.`);
    } else {
      console.error(`x shot ${key}: onScreenText repeats ${explicitDoubleCaption ? 'explicit caption text' : 'substantial verbatim subtitle/narration prose'}; remove duplicate captions or review an intentional editorial treatment.`);
      failed++;
    }
  }

  const chapterId = String(item.chapter ?? "");
  const chapterSource = readChapterSource(chapterId);
  if (!checkedChapters.has(chapterId)) {
    checkedChapters.add(chapterId);
    for (const file of chapterSource.files) {
      if (hasZeroWidth(file.source)) {
        console.error(`x ${file.path}: zero-width characters are forbidden. They can hide subtitle/narration duplication from validators.`);
        failed++;
      }
    }
  }

  const source = normalizeText(chapterSource.source);
  if (allowAuditedOverlap || !checkDuplication) continue;
  for (const chunk of proseChunks(text)) {
    if (source.includes(chunk)) {
      console.warn(`! heuristic review: shot ${key}: chapter source may quote substantial narration near "${chunk}"; inspect rendered text. A source match alone does not prove visible duplicate captions.`);
      break;
    }
  }
}

if (failed > 0) process.exit(1);
console.error("v screen text valid");
