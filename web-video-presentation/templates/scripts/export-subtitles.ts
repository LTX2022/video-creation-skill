import {writeTextIfChanged} from "./stable-generated-file";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const TIMING = resolve(ROOT, "timing-manifest.json");
const OUT_DIR = resolve(ROOT, "output/subtitles");

if (!existsSync(TIMING)) {
  console.error("x timing-manifest.json not found. Run: npm run build-timing");
  process.exit(1);
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

const manifest = readJson(TIMING);
mkdirSync(OUT_DIR, { recursive: true });

function timeVtt(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const n = Math.floor(ms % 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(n).padStart(3, "0")}`;
}

function timeSrt(ms: number): string {
  return timeVtt(ms).replace(".", ",");
}

let cursor = 0;
const vtt: string[] = ["WEBVTT", ""];
const srt: string[] = [];
let index = 1;

for (const step of manifest.steps ?? []) {
  const stepStart = cursor;
  const stepDuration = step.advanceAtMs ?? 1800;
  const stepEnd = stepStart + stepDuration;
  cursor = stepEnd;

  const cues = Array.isArray(step.subtitleCues) && step.subtitleCues.length > 0
    ? step.subtitleCues
    : [{ startMs: 0, endMs: stepDuration, chunks: step.subtitleChunks ?? [] }];

  for (const cue of cues) {
    const text = (cue.chunks ?? []).join("\n").trim();
    if (!text) continue;
    const cueStart = stepStart + Math.max(0, cue.startMs ?? 0);
    const minCueEnd = cueStart + 500;
    const cueEnd = Math.min(stepEnd, Math.max(minCueEnd, stepStart + (cue.endMs ?? stepDuration)));
    vtt.push(`${timeVtt(cueStart)} --> ${timeVtt(cueEnd)}`, text, "");
    srt.push(String(index++), `${timeSrt(cueStart)} --> ${timeSrt(cueEnd)}`, text, "");
  }
}

writeTextIfChanged(resolve(OUT_DIR, "subtitles.vtt"), vtt.join("\n"));
writeTextIfChanged(resolve(OUT_DIR, "subtitles.srt"), srt.join("\n"));
console.error(`v wrote ${resolve(OUT_DIR, "subtitles.vtt")}`);
console.error(`v wrote ${resolve(OUT_DIR, "subtitles.srt")}`);
