import { renderReviewFrames, reviewEnvironment, reviewPort, continuousReviewRange } from "./review-render";
import { captureInputRevision } from "./input-revision";
import { outputMode, readState, OUTPUTS } from "./delivery-contract";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { appendFeedbackEvent } from "./feedback-event";

const ROOT = resolve(process.cwd());
const RENDER_TIMING = resolve(ROOT, "src/video/render-timing.generated.ts");
const SHOT_MANIFEST = resolve(ROOT, "shot-manifest.json");
const OUT_DIR = resolve(ROOT, "output/motion-strips");
const args = process.argv.slice(2);

interface RenderStepTiming {
  chapter: string;
  stepIndex: number;
  startFrame: number;
  durationInFrames: number;
  text: string;
}

interface ShotStep {
  chapter?: string;
  step?: number;
  visualRecipe?: string;
  motionStyle?: string;
  referenceVideo?: string;
  referenceVideoStyle?: string;
}

interface MotionStripFrame {
  frame: number;
  localOffsetFrame: number;
  path: string;
  sha256?: string;
  bytes?: number;
}

interface MotionStripStep {
  chapter: string;
  step: number;
  startFrame: number;
  durationInFrames: number;
  visualRecipe: string;
  motionStyle: string;
  requiredByReferenceStyle: boolean;
  frames: MotionStripFrame[];
  distinctFrameHashes?: number;
  continuousReview?: {frameRange: [number, number]; command: string; evidence: "not-rendered"};
}

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
  console.log(`Usage: tsx scripts/render-motion-strips.ts [options]

Options:
  --max-steps=<n>        Maximum steps to render. Default: all steps
  --frames-per-step=<n>  Sparse sample frames per step. Default: 5
  --parallel=<n>         Actual renderer concurrency, 1-6. Default: 2
  --only-reference       Render only reference-video recipe/style steps
  --composition=<id>     Remotion composition id. Default: project output mode
  --port=<number>        Optional renderer port. Default: renderer-selected free port
  --browser-executable=<path>  Use installed Chrome/Edge instead of downloading one

Examples:
  npm run render:motion-strips
  npm run render:motion-strips:fast
  npm run render:motion-strips -- --only-reference --frames-per-step=6
  npm run render:segment -- --frames=120-360 --acknowledge-draft

Motion strips are sparse samples, NOT continuous motion, audio-sync or final-video evidence.`);
  process.exit(0);
}

function readJsonIfExists(path: string): any | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

function parseStepTimings(): RenderStepTiming[] {
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
  return steps;
}

const REFERENCE_RECIPES = new Set(["kinetic-prompt-to-product", "annotated-flow-diagram"]);
const REFERENCE_STYLES = new Set(["prompt-product-kinetic", "whiteboard-engineering-flow"]);

function isReferenceShot(step: ShotStep | undefined): boolean {
  if (!step) return false;
  return (
    REFERENCE_RECIPES.has(String(step.visualRecipe ?? "")) ||
    REFERENCE_STYLES.has(String(step.motionStyle ?? "")) ||
    Boolean(step.referenceVideo || step.referenceVideoStyle)
  );
}

function shotKey(chapter: string, stepNumber: number): string {
  return `${chapter}/${stepNumber}`;
}

function loadShotMap(): Map<string, ShotStep> {
  const shot = readJsonIfExists(SHOT_MANIFEST);
  const map = new Map<string, ShotStep>();
  for (const item of Array.isArray(shot?.steps) ? shot.steps : []) {
    if (!item?.chapter || !item?.step) continue;
    map.set(shotKey(String(item.chapter), Number(item.step)), item);
  }
  return map;
}

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "step";
}

function frameOffsets(count: number): number[] {
  if (count <= 1) return [0.5];
  return Array.from({ length: count }, (_, index) => {
    if (count === 2) return index === 0 ? 0.25 : 0.75;
    return 0.08 + (index * 0.84) / (count - 1);
  });
}

function framesForStep(step: RenderStepTiming, count: number): number[] {
  const maxLocal = Math.max(0, step.durationInFrames - 1);
  const frames = frameOffsets(count).map((ratio) => step.startFrame + Math.min(maxLocal, Math.max(0, Math.round(maxLocal * ratio))));
  return [...new Set(frames)].sort((a, b) => a - b);
}

function pickSteps(steps: RenderStepTiming[], shotMap: Map<string, ShotStep>): RenderStepTiming[] {
  const onlyReference = hasFlag("--only-reference");
  const maxStepsRaw = readFlag("--max-steps", process.env.MOTION_STRIP_MAX_STEPS ?? null);
  const maxSteps = maxStepsRaw === null ? null : Number(maxStepsRaw);
  if (maxSteps !== null && (!Number.isInteger(maxSteps) || maxSteps < 1)) {
    console.error("x --max-steps must be a positive integer");
    process.exit(1);
  }

  const withMeta = steps.map((step, index) => {
    const stepNumber = step.stepIndex + 1;
    const shot = shotMap.get(shotKey(step.chapter, stepNumber));
    return { step, index, reference: isReferenceShot(shot) };
  });
  const filtered = onlyReference ? withMeta.filter((item) => item.reference) : withMeta;
  const ordered = [...filtered].sort((a, b) => {
    if (a.reference !== b.reference) return a.reference ? -1 : 1;
    return a.index - b.index;
  });
  return (maxSteps === null ? ordered : ordered.slice(0, maxSteps)).map((item) => item.step);
}

function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

function writeReviewHtml(manifest: any) {
  const cards = manifest.steps
    .map((step: any) => {
      const imgs = step.frames
        .map((frame: any) => `<img src="${frame.path.replaceAll("\\", "/")}" alt="${step.chapter} step ${step.step} frame ${frame.frame}" />`)
        .join("");
      return `<section><h2>${step.chapter} / step ${step.step}</h2><p>${step.visualRecipe || ""} ${step.motionStyle || ""}</p><div class="strip">${imgs}</div></section>`;
    })
    .join("\n");
  writeFileSync(
    resolve(OUT_DIR, "index.html"),
    `<!doctype html>
<meta charset="utf-8">
<title>Sparse Motion Samples</title>
<style>
body{margin:0;background:#101114;color:#f5f5f5;font-family:Inter,system-ui,sans-serif;padding:24px}
section{margin:0 0 28px}
h2{font-size:18px;margin:0 0 4px}
p{margin:0 0 10px;color:#b8bdc7}
.strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
img{width:100%;height:auto;border:1px solid #30343d;background:#000}
</style>
<h1>Sparse motion samples</h1><p>These images do not establish continuous motion, absence of flicker, audio sync or full-video quality. Render the suggested continuous ranges separately.</p>
${cards}
`,
    "utf8",
  );
}

async function main() {
  const timings = parseStepTimings();
  const shotMap = loadShotMap();
  const selected = pickSteps(timings, shotMap);
  const framesPerStep = Number(readFlag("--frames-per-step", process.env.MOTION_STRIP_FRAMES_PER_STEP ?? "5"));
  if (!Number.isInteger(framesPerStep) || framesPerStep < 3 || framesPerStep > 10) {
    console.error("x --frames-per-step must be an integer from 3 to 10");
    process.exit(1);
  }
  const parallel = Number(readFlag("--parallel", process.env.MOTION_STRIP_PARALLEL ?? "2"));
  if (!Number.isInteger(parallel) || parallel < 1 || parallel > 6) {
    console.error("x --parallel must be an integer from 1 to 6");
    process.exit(1);
  }
  if (selected.length === 0) {
    console.error("x no steps selected for motion strip rendering");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const targetMode = outputMode(readState().outputMode);
  const composition = readFlag("--composition", OUTPUTS[targetMode === "both" ? "composite" : targetMode].composition)!;
  const browserExecutable = readFlag("--browser-executable");
  const port = reviewPort(readFlag("--port", process.env.REMOTION_PORT ?? null));
  const renderedSteps: MotionStripStep[] = [];
  const renderJobs: Array<{ out: string; frame: number }> = [];
  const timingManifest = readJsonIfExists(resolve(ROOT, "timing-manifest.json"));
  const fps = Number(timingManifest?.fps ?? 60);
  const totalFrames = Math.max(...timings.map((step) => step.startFrame + step.durationInFrames));

  for (const step of selected) {
    const stepNumber = step.stepIndex + 1;
    const key = shotKey(step.chapter, stepNumber);
    const shot = shotMap.get(key);
    const dirName = `${slugPart(step.chapter)}-step-${String(stepNumber).padStart(2, "0")}`;
    const stepDir = resolve(OUT_DIR, dirName);
    mkdirSync(stepDir, { recursive: true });
    const frameNumbers = framesForStep(step, framesPerStep);
    const frames: MotionStripFrame[] = [];
    for (const frame of frameNumbers) {
      const outName = `frame-${String(frame).padStart(6, "0")}.png`;
      const out = resolve(stepDir, outName);
      renderJobs.push({ out, frame });
      frames.push({
        frame,
        localOffsetFrame: frame - step.startFrame,
        path: `${dirName}/${outName}`,
      });
    }
    renderedSteps.push({
      chapter: step.chapter,
      step: stepNumber,
      startFrame: step.startFrame,
      durationInFrames: step.durationInFrames,
      visualRecipe: shot?.visualRecipe ?? "",
      motionStyle: shot?.motionStyle ?? "",
      requiredByReferenceStyle: isReferenceShot(shot),
      frames,
      continuousReview: continuousReviewRange(step.startFrame, step.durationInFrames, totalFrames, Math.ceil(fps * 0.25)),
    });
  }

  const revision = captureInputRevision(ROOT);
  if (revision.status !== 'bound') throw new Error(`Review input revision is unknown: ${revision.issues.join('; ')}`);
  rmSync(resolve(OUT_DIR, "manifest.json"), {force: true});
  const renderer = await renderReviewFrames({root: ROOT, composition, jobs: renderJobs, browserExecutable, port,
    concurrency: parallel, envVariables: reviewEnvironment()});
  const after = captureInputRevision(ROOT);
  if (after.status !== 'bound' || after.contentRevision !== revision.contentRevision) throw new Error('Inputs changed during motion sampling; review evidence was not published');

  for (const step of renderedSteps) {
    for (const frame of step.frames) {
      const fullPath = resolve(OUT_DIR, frame.path);
      frame.sha256 = hashFile(fullPath);
      frame.bytes = readFileSync(fullPath).byteLength;
    }
    step.distinctFrameHashes = new Set(step.frames.map((frame: MotionStripFrame) => frame.sha256)).size;
  }

  const manifest = {
    strategy: "sparse-step-motion-strips",
    generatedBy: "scripts/render-motion-strips.ts",
    generatedAt: new Date().toISOString(),
    composition,
    framesPerStep,
    parallel,
    contentRevision: revision.contentRevision,
    renderer,
    sampling: {kind: "sparse", continuous: false, audioSyncVerified: false, finalVideoVerified: false},
    envVariables: reviewEnvironment(),
    steps: renderedSteps,
  };
  writeFileSync(resolve(OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  writeReviewHtml(manifest);
  appendFeedbackEvent({
    eventType: "gate-result",
    phase: "motion-strips",
    target: "sparse-motion-evidence",
    agentAction: "npm run render:motion-strips",
    validation: [{ command: "npm run render:motion-strips", status: "pass", evidence: "output/motion-strips/manifest.json" }],
    userResolution: "pending",
    notes: "Sparse motion samples generated. They do not prove continuous motion, flicker absence, audio sync or final-video quality; render affected continuous ranges separately. Not user acceptance.",
  });
  console.error(`v wrote motion strips for ${renderedSteps.length} step(s) to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  appendFeedbackEvent({
    eventType: "gate-result",
    phase: "motion-strips",
    target: "sparse-motion-evidence",
    problem: String(error?.message ?? error),
    agentAction: "npm run render:motion-strips",
    validation: [{ command: "npm run render:motion-strips", status: "fail" }],
    userResolution: "pending",
  });
  process.exitCode = process.exitCode || 1;
});
