import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { appendFeedbackEvent } from "./feedback-event";

const ROOT = process.cwd();
const OUT_DIR = resolve(ROOT, "output/reference-style-comparison");

function readJson(path: string): any | null {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) return null;
  return JSON.parse(readFileSync(full, "utf8").replace(/^\uFEFF/, ""));
}

function frameHashes(frames: any[]): Set<string> {
  return new Set(frames.map((frame: any) => String(frame?.sha256 ?? "").toUpperCase()).filter(Boolean));
}

function shaSetFromReference(analysis: any): Set<string> {
  return frameHashes((analysis?.videos ?? []).flatMap((video: any) => video.frames ?? []));
}

function shaSetFromMotion(strips: any): Set<string> {
  return frameHashes((strips?.steps ?? []).flatMap((step: any) => step.frames ?? []));
}

function exactHashMatches(reference: Set<string>, generated: Set<string>): string[] {
  return [...generated].filter((hash) => reference.has(hash));
}

function round(value: number, digits = 2): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function bytesDeltaRatio(frames: any[]): number {
  let total = 0;
  let pairs = 0;
  for (let i = 1; i < frames.length; i++) {
    const prev = Number(frames[i - 1]?.bytes ?? 0);
    const next = Number(frames[i]?.bytes ?? 0);
    if (!Number.isFinite(prev) || !Number.isFinite(next) || prev <= 0 || next <= 0) continue;
    total += Math.abs(next - prev) / Math.max(prev, next);
    pairs++;
  }
  return pairs === 0 ? 0 : total / pairs;
}

function samplePositions(frames: any[], field: "timeSec" | "localOffsetFrame"): number[] {
  // Positions describe where samples were requested, never what visibly happened there.
  return [...new Set<number>(frames.map((frame: any) => (
    field === "localOffsetFrame" ? frame.localOffsetFrame ?? frame.frame : frame.timeSec
  )).filter((value: any) => typeof value === "number" && Number.isFinite(value) && value >= 0))].sort((a, b) => a - b);
}

function summarizeSamples(frames: any[], field: "timeSec" | "localOffsetFrame") {
  const hashes = frameHashes(frames);
  const positions = samplePositions(frames, field);
  return {
    frameCount: frames.length,
    distinctFrameHashes: hashes.size,
    distinctRatio: frames.length > 0 ? round(hashes.size / frames.length, 3) : 0,
    byteDeltaRatio: round(bytesDeltaRatio(frames), 3),
    samplePositions: positions,
    distinctSamplePositionCount: positions.length,
    samplePositionUnit: field === "timeSec" ? "seconds" : "frames",
    sparseSamplesPresent: frames.length >= 3 && positions.length >= 3 && frames.every((frame: any) => /^[a-f0-9]{64}$/i.test(String(frame?.sha256 ?? ""))),
    // Repeated samples may be an intentional hold. Neither hash diversity nor bytes
    // establish animation, readable holds, motion direction, pacing or similarity.
    sampleHashObservation: hashes.size > 1 ? "sample-hashes-differ" : hashes.size === 1 ? "sample-hashes-repeat" : "sample-hashes-missing",
  };
}

function keyForStep(step: any): string {
  return `${step.chapter}/${step.step}`;
}

function summarizeReferenceDynamics(analysis: any) {
  const videos = (analysis?.videos ?? []).map((video: any) => {
    const frames = Array.isArray(video.frames) ? video.frames : [];
    const samples = summarizeSamples(frames, "timeSec");
    const positions = samples.samplePositions;
    return {
      id: String(video.id ?? "reference"),
      durationSec: Number(video.durationSec ?? 0),
      fps: video.fps ?? null,
      ...samples,
      averageSampleGapSec: positions.length >= 2 ? round((positions.at(-1)! - positions[0]) / (positions.length - 1), 3) : 0,
      motionStructure: "not-assessed-from-sparse-metadata",
    };
  });
  return {
    videos,
    frameCount: videos.reduce((sum: number, video: any) => sum + video.frameCount, 0),
    incompleteSampleVideoIds: videos.filter((video: any) => !video.sparseSamplesPresent).map((video: any) => video.id),
  };
}

function summarizeGeneratedDynamics(strips: any, shot: any) {
  const shots = new Map<string, any>((shot?.steps ?? []).map((step: any) => [keyForStep(step), step]));
  const steps = (strips?.steps ?? []).map((step: any) => {
    const declared = shots.get(keyForStep(step)) ?? step;
    const frames = Array.isArray(step.frames) ? step.frames : [];
    const samples = summarizeSamples(frames, "localOffsetFrame");
    return {
      key: keyForStep(step),
      chapter: step.chapter,
      step: step.step,
      visualRecipe: step.visualRecipe ?? "",
      motionStyle: step.motionStyle ?? "",
      requiredByReferenceStyle: step.requiredByReferenceStyle === true,
      ...samples,
      declaredMotionIntent: declared.motionIntent ?? "",
      declaredVisualStages: Array.isArray(declared.visualStages) ? declared.visualStages : [],
      declarationsVerified: false,
      // Retain legacy score keys as null so old consumers cannot mistake metadata
      // for a passing visual score. Schema 3 consumers use scoped artifact checks.
      dynamicScore: null,
      verdict: samples.sparseSamplesPresent ? "sparse-sample-metadata-present" : "sparse-sample-metadata-incomplete",
    };
  });
  return {
    averageDynamicScore: null,
    incompleteSampleStepKeys: steps.filter((step: any) => !step.sparseSamplesPresent).map((step: any) => step.key),
    steps,
  };
}

function referenceStyleSteps(shot: any): any[] {
  const recipes = new Set(["kinetic-prompt-to-product", "annotated-flow-diagram"]);
  const styles = new Set(["prompt-product-kinetic", "whiteboard-engineering-flow"]);
  return (Array.isArray(shot?.steps) ? shot.steps : []).filter((step: any) => (
    recipes.has(String(step.visualRecipe ?? "")) ||
    styles.has(String(step.motionStyle ?? "")) ||
    Boolean(step.referenceVideo || step.referenceVideoStyle)
  ));
}

function buildReferenceComparison(analysis: any, strips: any, shot: any) {
  const problems: string[] = [];
  const requiredSteps = referenceStyleSteps(shot);
  if (!analysis || !Array.isArray(analysis.videos) || analysis.videos.length === 0) {
    problems.push("reference analysis is missing or has no videos; run npm run analyze:references -- <video...>");
  }
  if (!strips || !Array.isArray(strips.steps) || strips.steps.length === 0) {
    problems.push("motion-strip metadata is missing or has no steps; run npm run render:motion-strips");
  }
  const safeAnalysis = Array.isArray(analysis?.videos) ? analysis : null;
  const safeStrips = Array.isArray(strips?.steps) ? strips : null;
  const referenceHashes = shaSetFromReference(safeAnalysis);
  const generatedHashes = shaSetFromMotion(safeStrips);
  const shared = exactHashMatches(referenceHashes, generatedHashes);
  const reference = summarizeReferenceDynamics(safeAnalysis);
  const generated = summarizeGeneratedDynamics(safeStrips, shot);
  for (const id of reference.incompleteSampleVideoIds) problems.push(`reference ${id} needs metadata for at least three distinct sample times and valid hashes for every sample`);
  for (const key of generated.incompleteSampleStepKeys) problems.push(`generated step ${key} needs metadata for at least three distinct sample positions and valid hashes for every sample`);
  if (requiredSteps.length > 0 && !safeStrips?.steps?.some((step: any) => step.requiredByReferenceStyle === true)) {
    problems.push("shot-manifest declares reference style steps, but motion strips do not mark any requiredByReferenceStyle step");
  }
  if (shared.length > 0) problems.push("reference and generated metadata share exact SHA256 hashes; inspect the matched samples before proceeding (a match alone does not establish copying)");

  return {
    schema: 3,
    generatedAt: new Date().toISOString(),
    // This remains the CLI's artifact-check status, not visual approval.
    pass: problems.length === 0,
    passScope: "sparse-artifact-metadata-only",
    verdict: shared.length > 0 ? "shared-sample-hashes-require-review" : problems.length === 0 ? "sparse-artifact-checks-passed-visual-review-not-performed" : "sparse-artifact-checks-incomplete",
    exactCopyDetected: shared.length > 0, // Legacy key: means shared sample hashes, not a finding of copying.
    referenceVideoCount: safeAnalysis?.videos.length ?? 0,
    referenceFrameCount: reference.frameCount,
    referenceDistinctHashes: referenceHashes.size,
    generatedStepCount: generated.steps.length,
    generatedFrameCount: generated.steps.reduce((sum: number, step: any) => sum + step.frameCount, 0),
    generatedDistinctHashes: generatedHashes.size,
    referenceStyleStepCount: requiredSteps.length,
    exactSharedFrameHashes: shared,
    visualReview: {
      status: "not-performed",
      accepted: false,
      continuity: "not-assessed",
      motionGrammar: "not-assessed",
      aestheticSimilarity: "not-assessed",
      reason: "This command reads sparse sample metadata, not image pixels or continuous video. Use the existing chapter/final visual-review workflow for actual review; this manifest cannot record acceptance.",
    },
    // Preserve the envelope for report/packaging consumers, but not the old claim.
    dynamicSimilarity: {
      verdict: "not-assessed-from-sparse-metadata",
      method: "sparse-artifact-metadata-only",
      limitations: [
        "Hashes and encoded byte counts are metadata diagnostics, not perceptual, aesthetic, motion-grammar or continuity evidence.",
        "Sample positions and declared stages do not establish observed entry, reveal, focus, readable hold or exit.",
        "No shared sampled hashes does not establish originality or rule out copying; shared hashes can also be blank or common frames.",
        "Visual acceptance remains a separate existing workflow decision bound to the actual reviewed clip or final video, not this report.",
      ],
      reference,
      generated,
    },
    problems,
  };
}

function writeMarkdown(report: any) {
  const lines = [
    "# Reference Sample Artifact Diagnostics",
    "",
    "This report inspects sparse sample metadata only. It does not compare image content or watch motion.",
    "",
    `- Sparse artifact metadata checks: ${report.pass ? "pass" : "fail"}`,
    `- Check scope: ${report.passScope}`,
    `- Verdict: ${report.verdict}`,
    `- Visual review: ${report.visualReview.status}; accepted: ${report.visualReview.accepted}`,
    `- Reference videos / sampled frames: ${report.referenceVideoCount} / ${report.referenceFrameCount}`,
    `- Generated steps / sampled frames: ${report.generatedStepCount} / ${report.generatedFrameCount}`,
    `- Exact shared sample hashes: ${report.exactSharedFrameHashes.length}`,
    "",
    "## Interpretation",
    "",
    ...report.dynamicSimilarity.limitations.map((text: string) => `- ${text}`),
    "",
    "## Reference Samples",
    "",
    ...report.dynamicSimilarity.reference.videos.map((video: any) => (
      `- ${video.id}: ${video.sampleHashObservation}; ${video.frameCount} samples at ${video.distinctSamplePositionCount} distinct times; average gap ${video.averageSampleGapSec}s`
    )),
    "",
    "## Generated Samples",
    "",
    ...report.dynamicSimilarity.generated.steps.map((step: any) => (
      `- ${step.key}: ${step.sampleHashObservation}; ${step.frameCount} samples at ${step.distinctSamplePositionCount} distinct positions; ${step.verdict}`
    )),
    "",
    "## Problems",
    "",
    ...(report.problems.length ? report.problems.map((problem: string) => `- ${problem}`) : ["No sparse metadata problems found. Visual quality and continuity remain unassessed."]),
    "",
    "## Actual Review",
    "",
    "Use the existing visual review, not a new metadata gate: watch complete action intervals and the final encoded video; record timestamps for focal hierarchy, spatial continuity/parallax, pace/holds, readability and differences from the reference. Sparse stills can locate defects, not establish continuous motion. Do not claim matching motion grammar, equal quality or originality from this report.",
  ];
  writeFileSync(resolve(OUT_DIR, "report.md"), `${lines.join("\n")}\n`, "utf8");
}

function main() {
  const report = buildReferenceComparison(
    readJson("output/reference-video-analysis/manifest.json"),
    readJson("output/motion-strips/manifest.json"),
    readJson("shot-manifest.json"),
  );
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, "manifest.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeMarkdown(report);
  appendFeedbackEvent({
    eventType: "gate-result",
    phase: "reference-style-comparison",
    target: "reference-vs-generated-sparse-artifacts",
    problem: report.problems.join("; "),
    agentAction: "npm run compare:references",
    validation: [{ command: "npm run compare:references", status: report.pass ? "pass" : "fail", evidence: "output/reference-style-comparison/manifest.json" }],
    userResolution: "pending",
    notes: `${report.passScope}; visual review not performed; ${report.verdict}`,
  });
  if (!report.pass) {
    for (const problem of report.problems) console.error(`x ${problem}`);
    process.exit(1);
  }
  console.error("v sparse reference artifact metadata checks passed; visual review not performed");
}

main();
