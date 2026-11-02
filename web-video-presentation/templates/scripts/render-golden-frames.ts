import { renderReviewFrames, reviewEnvironment, reviewPort } from "./review-render";
import { captureInputRevision, hashLocalFile } from "./input-revision";
import { outputMode, readState, OUTPUTS } from "./delivery-contract";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { appendFeedbackEvent } from "./feedback-event";

const ROOT = resolve(process.cwd());
const RENDER_TIMING = resolve(ROOT, "src/video/render-timing.generated.ts");
const modeState = outputMode(readState().outputMode);
const defaultComposition = OUTPUTS[modeState === "both" ? "composite" : modeState].composition;
const OUT_DIR = resolve(ROOT, "output/golden");
const args = process.argv.slice(2);

function readFlag(name: string, fallback: string | null = null): string | null {
  const prefix = `${name}=`;
  const value = args.filter((arg) => arg.startsWith(prefix)).at(-1);
  if (value) return value.slice(prefix.length);
  const index = args.lastIndexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1]!.startsWith("--")) return args[index + 1]!;
  return fallback;
}

function hasFlag(name: string): boolean {
  return args.includes(name);
}

if (hasFlag("--help") || hasFlag("-h")) {
  console.log(`Usage: tsx scripts/render-golden-frames.ts [options]

Options:
  --max=<n>          Maximum sparse still frames. Default: GOLDEN_MAX_FRAMES or 18
  --mode=cli|api     CLI wrapper, shared renderer API underneath (no per-frame CLI).
  --log=<level>      error, warn, info, verbose, trace. Default: warn
  --scale=<number>   Optional render scale for quick checks
  --composition=<id>  Default: project output mode
  --port=<number>    Optional renderer port. Default: renderer-selected free port
  --browser-executable=<path>  Use installed Chrome/Edge instead of downloading one

Examples:
  npm run render:golden
  npm run render:golden -- --max=8
  npm run render:golden -- --mode=cli`);
  process.exit(0);
}

if (!existsSync(RENDER_TIMING)) {
  console.error("x render timing not found. Run: npm run render:timing");
  process.exit(1);
}

const src = readFileSync(RENDER_TIMING, "utf8");
const match = src.match(/export const STEP_TIMINGS:[\s\S]*?=\s*(\[[\s\S]*\]);/);
if (!match) {
  console.error("x could not parse STEP_TIMINGS");
  process.exit(1);
}

const steps = JSON.parse(match[1]);
if (!Array.isArray(steps) || steps.length === 0) {
  console.error("x no render steps found");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

function readableFrameFor(step: { startFrame: number; durationInFrames: number }) {
  const revealOffset = Math.min(
    Math.max(18, Math.floor(step.durationInFrames * 0.35)),
    Math.max(0, step.durationInFrames - 1),
  );
  return step.startFrame + revealOffset;
}

function lateHoldFrameFor(step: { startFrame: number; durationInFrames: number }) {
  const holdOffset = Math.min(
    Math.max(30, Math.floor(step.durationInFrames * 0.72)),
    Math.max(0, step.durationInFrames - 1),
  );
  return step.startFrame + holdOffset;
}

function pickEvenly(values: number[], max: number) {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  if (sorted.length <= max) return sorted;
  if (max === 1) return [sorted[Math.floor((sorted.length - 1) / 2)]!];
  return Array.from({ length: max }, (_, index) => {
    const sourceIndex = Math.round((index * (sorted.length - 1)) / (max - 1));
    return sorted[sourceIndex];
  });
}

const frames = new Set<number>();
for (const step of steps) {
  frames.add(readableFrameFor(step));
  if (step.durationInFrames >= 120) frames.add(lateHoldFrameFor(step));
}

const maxFrames = Number(readFlag("--max", process.env.GOLDEN_MAX_FRAMES ?? "18"));
if (!Number.isInteger(maxFrames) || maxFrames < 1) {
  console.error("x --max must be a positive integer");
  process.exit(1);
}

const selected = pickEvenly([...frames], maxFrames);
const mode = readFlag("--mode", "cli")!;
const logLevel = readFlag("--log", "warn") as "error" | "warn" | "info" | "verbose" | "trace";
const scale = Number(readFlag("--scale", "1"));
const browserExecutable = readFlag("--browser-executable");
const requestedPort = readFlag("--port", process.env.REMOTION_PORT ?? null);
if (!Number.isFinite(scale) || scale <= 0) {
  console.error("x --scale must be a positive number");
  process.exit(1);
}
async function main() {
  if (!["cli", "api"].includes(mode)) throw new Error(`Unsupported golden render mode: ${mode}; use cli or api`);
  const port = reviewPort(requestedPort);
  const composition = readFlag("--composition", defaultComposition)!;
  const revision = captureInputRevision(ROOT);
  if (revision.status !== 'bound') throw new Error(`Review input revision is unknown: ${revision.issues.join('; ')}`);
  rmSync(resolve(OUT_DIR, "manifest.json"), {force: true});
  const renderer = await renderReviewFrames({root: ROOT, composition, browserExecutable, port, scale, logLevel,
    envVariables: reviewEnvironment(), concurrency: 2,
    jobs: selected.map((frame) => ({frame, out: resolve(OUT_DIR, `frame-${String(frame).padStart(5, "0")}.png`)}))});
  const frameFiles = selected.map((frame) => {
    const path = `output/golden/frame-${String(frame).padStart(5, "0")}.png`;
    return {frame, path, sha256: hashLocalFile(ROOT, path), bytes: readFileSync(resolve(ROOT, path)).byteLength};
  });
  const after = captureInputRevision(ROOT);
  if (after.status !== 'bound' || after.contentRevision !== revision.contentRevision) throw new Error('Inputs changed during golden rendering; review evidence was not published');

  writeFileSync(
    resolve(OUT_DIR, "manifest.json"),
    `${JSON.stringify({ strategy: "readable-step-frames", mode, composition, maxFrames, frames: selected, frameFiles, contentRevision: revision.contentRevision, renderer, sampling: {kind: "sparse", continuous: false}, envVariables: reviewEnvironment() }, null, 2)}\n`,
  );
  appendFeedbackEvent({
    eventType: "gate-result",
    phase: "golden-frames",
    target: "golden-frame-generation",
    agentAction: "npm run render:golden",
    validation: [{ command: "npm run render:golden", status: "pass", evidence: "output/golden/manifest.json" }],
    userResolution: "pending",
    notes: "Golden frames generated. This does not set goldenFramesShownToUser; record user-facing review separately with npm run feedback.",
  });

  console.error(`v wrote ${selected.length} golden frames to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  appendFeedbackEvent({
    eventType: "gate-result",
    phase: "golden-frames",
    target: "golden-frame-generation",
    problem: String(error?.message ?? error),
    agentAction: "npm run render:golden",
    validation: [{ command: "npm run render:golden", status: "fail" }],
    userResolution: "pending",
  });
  process.exitCode = process.exitCode || 1;
});
