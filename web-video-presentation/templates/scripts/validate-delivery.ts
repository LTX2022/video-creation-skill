import { captureInputRevision, hashLocalFile, revisionErrors } from "./input-revision";
import { coverDeliveryErrors } from "./cover-contract";
import { resolveAudioSource, providedAudioErrors } from "./audio-source";
import { requiredDecisionChecks, readFeedbackEvents, latestDecision, subjectForDecision } from "./workflow-evidence";
import { contractErrors, finalOutputs, isDouyinProfile, outputMode, localPath, overlaySafetyErrors } from "./delivery-contract";
import { validateComposition } from "./validate-composition";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { appendFeedbackEvent } from "./feedback-event";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const allowDraft = args.includes("--allow-draft");
let failed = 0;
const checks: Array<{ name: string; status: "pass" | "fail"; detail: string }> = [];

function readText(path: string): string {
  return readFileSync(resolve(ROOT, path), "utf8").replace(/^\uFEFF/, "");
}

function readJson(path: string): any | null {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) return null;
  return JSON.parse(readText(path));
}


function pass(name: string, detail = "") {
  checks.push({ name, status: "pass", detail });
}

function fail(name: string, detail: string) {
  failed++;
  checks.push({ name, status: "fail", detail });
  console.error(`x ${name}: ${detail}`);
}

function requireFile(path: string, name: string) {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) {
    fail(name, `${path} is missing`);
    return false;
  }
  pass(name, path);
  return true;
}

function validateScreenTextGate() {
  const tsxCli = resolve(ROOT, "node_modules/tsx/dist/cli.mjs");
  const command = existsSync(tsxCli)
    ? { bin: process.execPath, args: ["--import", "tsx", "scripts/validate-screen-text.ts"] }
    : null;
  if (!command) { fail("screen text", "Local tsx is missing; install approved dependencies first"); return; }
  const result = spawnSync(command.bin, command.args, {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status === 0) {
    pass("screen text", "validate-screen-text passed");
  } else {
    const output = [result.stdout, result.stderr, result.error?.message].filter(Boolean).join("\n").trim();
    fail("screen text", output || "validate-screen-text failed");
  }
}

function isReferenceStyleShot(item: any): boolean {
  return (
    ["kinetic-prompt-to-product", "annotated-flow-diagram"].includes(String(item?.visualRecipe ?? "")) ||
    ["prompt-product-kinetic", "whiteboard-engineering-flow"].includes(String(item?.motionStyle ?? "")) ||
    Boolean(item?.referenceVideo || item?.referenceVideoStyle)
  );
}

function needsMotionStrip(item: any): boolean {
  return (
    isReferenceStyleShot(item) ||
    item?.motionDensity === "high" ||
    item?.complexMotion === true ||
    item?.assetImportance === "important"
  );
}

function stepKey(step: any): string {
  return `${step.chapter}/${step.step}`;
}

type Box = { id?: string; x?: number; y?: number; width?: number; height?: number; allowSubtitleOverlap?: boolean; allowPlatformOverlap?: boolean };

function validBox(box: any): boolean {
  return [box?.x, box?.y, box?.width, box?.height].every((value) => Number.isFinite(Number(value))) &&
    Number(box.x) >= 0 &&
    Number(box.y) >= 0 &&
    Number(box.width) > 0 &&
    Number(box.height) > 0 &&
    Number(box.x) + Number(box.width) <= 1.001 &&
    Number(box.y) + Number(box.height) <= 1.001;
}

function boxesIntersect(a: Box, b: Box): boolean {
  const ax = Number(a.x), ay = Number(a.y), aw = Number(a.width), ah = Number(a.height);
  const bx = Number(b.x), by = Number(b.y), bw = Number(b.width), bh = Number(b.height);
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function validateSubtitleSafety(shot: any, projectState: any) {
  const steps = Array.isArray(shot?.steps) ? shot.steps : [];
  let issues = 0;
  const isPortrait = projectState.videoFormat === "portrait" || projectState.videoProfile === "douyin" || Number(projectState.videoHeight ?? 0) > Number(projectState.videoWidth ?? 0);
  for (const step of steps) {
    const key = stepKey(step);
    const safety = step.subtitleSafety;
    if (!safety || safety.required !== true || safety.checked !== true) {
      issues++;
      fail("subtitle safety", `${key} missing checked subtitleSafety evidence`);
      continue;
    }
    const subtitleBand = safety.subtitleBand;
    if (!validBox(subtitleBand)) {
      issues++;
      fail("subtitle safety", `${key} subtitleBand is not a normalized box`);
      continue;
    }
    // v2.5.0: 字幕 75% 红线——竖屏/抖音字幕底部不得低于画面 75% 高度处。
    if (isPortrait) {
      const subtitleBottom = Number(subtitleBand.y) + Number(subtitleBand.height);
      if (subtitleBottom > 0.75) {
        issues++;
        fail("subtitle safety", `${key} subtitleBand bottom (y+height=${subtitleBottom.toFixed(3)}) exceeds the 0.75 subtitle redline; subtitles must stay within the top 75% of the frame`);
      }
    }
    const platformBand = safety.platformUiBand;
    if (isPortrait && !validBox(platformBand)) {
      issues++;
      fail("subtitle safety", `${key} portrait/douyin step lacks normalized platformUiBand`);
    }
    const boxes = [
      ...(Array.isArray(safety.textBoxes) ? safety.textBoxes : []),
      ...(Array.isArray(safety.criticalVisualBoxes) ? safety.criticalVisualBoxes : []),
    ];
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const label = String(box?.id ?? `box[${i}]`);
      if (!validBox(box)) {
        issues++;
        fail("subtitle safety", `${key} ${label} is not a normalized box`);
        continue;
      }
      if (boxesIntersect(box, subtitleBand) && box.allowSubtitleOverlap !== true) {
        issues++;
        fail("subtitle safety", `${key} ${label} intersects subtitleBand`);
      }
      if (validBox(platformBand) && boxesIntersect(box, platformBand) && box.allowPlatformOverlap !== true) {
        issues++;
        fail("subtitle safety", `${key} ${label} intersects platformUiBand`);
      }
    }
  }
  if (issues === 0) pass("subtitle safety", `${steps.length} step(s) have checked subtitle/platform safe-area evidence`);
}

function validateWorkflowEvidence(projectState: any) {
  const events=readFeedbackEvents(ROOT);
  if(events.some((event)=>event.parseError))fail('workflow evidence','feedback-events.jsonl contains invalid JSON; repair the log before relying on it');
  for(const check of requiredDecisionChecks(ROOT,{state:projectState,includeFinal:true,revision:captureInputRevision(ROOT)})) {
    if(check.status!=='accepted')fail('workflow evidence',`${check.gate} / ${check.scope}: ${check.detail}`);
  }
  if(!checks.some((check)=>check.name==='workflow evidence'&&check.status==='fail'))pass('workflow evidence','Latest current-scope human decisions recorded; local source declarations are not authenticated');
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").toUpperCase();
}

function sha256File(path: string): string {
  return hashLocalFile(ROOT, relative(ROOT, path));
}

function normalizedOutputPath(value: unknown): string {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function validateTtsManifest(projectState: any, timing: any) {
  let source;
  try { source = resolveAudioSource(projectState); }
  catch (error) { fail('audio source', String((error as Error).message)); return; }
  if (source === 'none') {
    pass("tts manifest", "audio was not requested");
    return;
  }
  if (source === 'provided') {
    const errors = providedAudioErrors(ROOT, timing);
    for (const error of errors) fail('provided audio', error);
    if (!errors.length) pass('provided audio', 'Authorized local per-step recordings match current transcript hashes, file hashes and probed timing; local provenance is not authenticated');
    return;
  }
  const manifest = readJson("output/tts-manifest.json");
  if (!manifest) {
    fail("tts manifest", "output/tts-manifest.json is missing; rerun npm run synthesize-audio after npm run extract-narrations");
    return;
  }
  if (!manifest.provider || !manifest.voice) {
    fail("tts manifest", "provider and provider-internal voice/profile must be recorded");
  }
  const confirmedProvider = typeof projectState.ttsProvider === 'string' ? projectState.ttsProvider.trim() : '';
  const expectedProvider = confirmedProvider === 'auto' ? 'minimax' : confirmedProvider;
  if (expectedProvider && manifest.provider !== expectedProvider) {
    fail('tts manifest', 'Manifest provider differs from the confirmed TTS provider; reconcile the authorized choice and actual audio before delivery');
  }
  const confirmedVoice = typeof projectState.ttsVoice === 'string' ? projectState.ttsVoice.trim() : '';
  const items = Array.isArray(manifest.items) ? manifest.items : [];
  const byKey = new Map(items.map((item: any) => [`${item.chapter}/${item.step}`, item]));
  let missing = 0;
  let narrated = 0;
  for (const step of timing.steps ?? []) {
    const key = stepKey(step);
    // extract-narrations intentionally skips empty hold/transition steps. Do not
    // require fake speech or an invented TTS row to deliver a mixed timeline.
    if (!String(step.text ?? '').trim()) {
      if (step.audio) fail('tts manifest', `${key}: audio without matching narration text is unsupported; provide an accurate per-step transcript`);
      continue;
    }
    narrated++;
    const item = byKey.get(key) as any;
    if (!item) {
      missing++;
      fail("tts manifest", `${key} missing from output/tts-manifest.json`);
      continue;
    }
    const expectedTextHash = sha256Text(String(step.text ?? ""));
    if (item.textHash !== expectedTextHash) {
      fail("tts manifest", `${key} text hash does not match timing-manifest; rerun synthesize-audio`);
    }
    if (String(item.provider ?? "") !== String(manifest.provider ?? "")) {
      fail("tts manifest", `${key} provider differs from manifest provider`);
    }
    if (String(item.voice ?? "") !== String(manifest.voice ?? "")) {
      fail("tts manifest", `${key} voice differs from manifest voice`);
    }
    // A provider may resolve a selected profile name to its stable ID, or an
    // explicitly authorized default to an effective voice. Keep both identities;
    // legacy direct-ID receipts remain usable without inventing an alias map.
    const recordedSelection = Object.prototype.hasOwnProperty.call(item, 'requestedVoice');
    const selectionMatches = recordedSelection && (item.requestedVoice === confirmedVoice ||
      (confirmedVoice === 'provider-default' && item.requestedVoice === null));
    if (confirmedVoice && item.voice !== confirmedVoice && !selectionMatches) {
      fail('tts manifest', `${key}: audio voice differs from the confirmed TTS voice, or its requested-profile mapping is unknown; reconcile approval/provenance, never auto-resynthesize`);
    }
    const audioRel = String(item.audio ?? step.audio ?? "");
    const rootAudioPath = resolve(ROOT, audioRel);
    const publicAudioPath = resolve(ROOT, "public/audio", audioRel);
    const audioPath = existsSync(rootAudioPath) ? rootAudioPath : publicAudioPath;
    if (!audioRel || !existsSync(audioPath)) {
      fail("tts manifest", `${key} audio file is missing: ${item.audio ?? step.audio ?? "unknown"}`);
      continue;
    }
    const actualAudioHash = sha256File(audioPath);
    if (item.audioSha256 !== actualAudioHash) {
      fail("tts manifest", `${key} audioSha256 does not match current file; rerun synthesize-audio`);
    }
    if (Number(item.bytes ?? 0) < 512) {
      fail("tts manifest", `${key} audio file is suspiciously small`);
    }
    if (step.audioDurationMs === null || step.audioDurationMs === undefined) {
      fail("tts manifest", `${key} has no measured audioDurationMs; install ffprobe/ffmpeg or fix audio`);
    }
    if (Array.isArray(step.warnings) && step.warnings.some((warning: string) => /audio missing|ffprobe unavailable/i.test(String(warning)))) {
      fail("tts manifest", `${key} still has audio/ffprobe timing warning`);
    }
  }
  if (narrated === 0) fail('tts manifest', 'TTS narration requires at least one nonempty per-step narration text; use audioSource=none for a silent project');
  if (missing === 0 && !checks.some((check) => check.name === "tts manifest" && check.status === "fail")) {
    pass("tts manifest", `${narrated} narrated segment(s) match current timing text and audio files; silent steps require no TTS row`);
  }
}

function validateTiming(shot: any) {
  const timing = readJson("timing-manifest.json");
  if (!timing) {
    fail("timing manifest", "run npm run build-timing before delivery validation");
    return null;
  }
  let longStaticSubtitleCount = 0;
  const shotByKey = new Map((Array.isArray(shot?.steps) ? shot.steps : []).map((step: any) => [stepKey(step), step]));
  for (const step of timing.steps ?? []) {
    const key = stepKey(step);
    const shotStep = shotByKey.get(key) as any;
    const advance = Number(step.advanceAtMs ?? 0);
    if (timing.timingMode !== "explicit" && advance < 1800) {
      fail("pacing", `${step.chapter}/${step.step} advances too fast (${advance}ms)`);
    }
    if (timing.timingMode !== "explicit" && advance > 8000 && (!Array.isArray(shotStep?.visualStages) || shotStep.visualStages.length < 2)) {
      fail("pacing", `${key} stays too long (${advance}ms) without staged visual movement; split the step or add visualStages`);
    }
    if (readJson("project-state.json")?.subtitlesRequested === true && advance > 6000 && String(step.text ?? "").length > 36 && (step.subtitleCues ?? []).length <= 1) {
      longStaticSubtitleCount++;
      fail("subtitle sync", `${key} has long narration but only one subtitle cue`);
    }
  }
  if (longStaticSubtitleCount === 0) pass("subtitle sync", "long narration uses cue-level subtitle progress");
  return timing;
}

function validateFinalRender(projectState: any) {
  const manifest = readJson('output/render-result.json');
  if (!manifest) { fail('final render', 'output/render-result.json is missing'); return; }
  for (const error of contractErrors(projectState, manifest, captureInputRevision(ROOT))) fail('output contract', error);
  for (const render of finalOutputs(manifest)) {
    try { localPath(ROOT, render.output); } catch (error) { fail('output path', String(error)); continue; }
  if (!render.output || !existsSync(resolve(ROOT, String(render.output)))) {
    fail("final render", `rendered MP4 is missing: ${render.output ?? "unknown"}`);
  } else {
    const outputPath = resolve(ROOT, String(render.output));
    const size = statSync(outputPath).size;
    if (size < 512) fail("final render", `rendered MP4 is suspiciously small (${size} bytes)`);
    else pass("final render", `${render.output} (${size} bytes)`);
    const actualSha = sha256File(outputPath);
    if (!render.sha256) {
      fail("final render", "render-result.json is missing sha256");
    } else if (String(render.sha256).toUpperCase() !== actualSha) {
      fail("final render", `render-result sha256 does not match current MP4 (${actualSha})`);
    }
  }
  if (!allowDraft && render.draft === true) {
    if (render.acknowledgedDraft === true) {
      fail("render quality", "draft was rendered with --acknowledge-draft; not valid for delivery");
    } else {
      fail("render quality", "final delivery cannot use draft render-result; rerun npm run render:video or render:video:subtitles");
    }
  } else if (!allowDraft && render.frames) {
    fail("render quality", `final delivery cannot use a frame-range render-result (${render.frames}); rerun full render:video`);
  } else if (!allowDraft && render.preset && String(render.preset) !== "quality") {
    fail("render quality", `final delivery requires quality preset, got ${render.preset}`);
  } else {
    pass("render quality", `preset=${render.preset ?? "unknown"}`);
  }
  if (render.everyNthFrame) {
    fail("render smoothness", "--every-nth-frame was used; this can make final video look choppy");
  } else {
    pass("render smoothness", "no frame skipping recorded");
  }
  if (render.kind === 'alpha') {
    const review = projectState.alphaEdgeReview;
    if (!review?.accepted || String(review.sha256).toUpperCase() !== String(render.sha256).toUpperCase()) fail('alpha edge review', 'Black/white background edge review must be accepted for this exact alpha SHA256');
    try {
      const subject=subjectForDecision(ROOT,'alpha-edge-review',{scope:'output:alpha',target:render.sha256,state:projectState});
      const decision=latestDecision(readFeedbackEvents(ROOT),subject);
      if(decision.status!=='accepted')fail('alpha edge review',`Current alpha edge review is ${decision.status}; record genuine user decision with source declaration`);
    } catch(error) { fail('alpha edge review',String((error as Error).message)); }
    if (Number(render.mediaProbe?.audioStreamCount ?? 0) !== 0) fail('alpha audio', 'Alpha graphics deliverables must be silent');
  }
  const fps = Number(render.videoFormat?.fps ?? projectState.videoFps ?? 0);
  if (!Number.isFinite(fps) || fps <= 0) {
    fail("render smoothness", `invalid target fps ${fps}`);
  }
  const probe = render.mediaProbe;
  if (!probe || probe.ok !== true) {
    fail("media probe", `render-result.json lacks successful ffprobe evidence (${probe?.error ?? "missing mediaProbe"})`);
  } else {
    const videoCount = Number(probe.videoStreamCount ?? 0);
    const audioCount = Number(probe.audioStreamCount ?? 0);
    if (videoCount < 1) {
      fail("media probe", "final selected output has no video stream");
    }
    if (render.kind !== "alpha" && projectState.audioRequested === true && audioCount < 1) {
      fail("media probe", "audio was requested but final selected output has no audio stream");
    }
    const expectedWidth = Number(render.videoFormat?.width ?? projectState.videoWidth ?? 0);
    const expectedHeight = Number(render.videoFormat?.height ?? projectState.videoHeight ?? 0);
    const actualWidth = Number(probe.video?.width ?? 0);
    const actualHeight = Number(probe.video?.height ?? 0);
    if (expectedWidth > 0 && actualWidth > 0 && expectedWidth !== actualWidth) {
      fail("media probe", `video width mismatch: expected ${expectedWidth}, got ${actualWidth}`);
    }
    if (expectedHeight > 0 && actualHeight > 0 && expectedHeight !== actualHeight) {
      fail("media probe", `video height mismatch: expected ${expectedHeight}, got ${actualHeight}`);
    }
    const actualFps = Number(probe.video?.fps ?? 0);
    if (fps > 0 && actualFps > 0 && Math.abs(actualFps - fps) > 0.75) {
      fail("media probe", `video fps mismatch: expected ${fps}, got ${actualFps.toFixed(3)}`);
    }
    const expectedDurationSec = fps > 0 && Number(render.totalFrames ?? 0) > 0
      ? Number(render.totalFrames) / fps
      : 0;
    const actualDurationSec = Number(probe.durationSec ?? 0);
    if (expectedDurationSec > 0 && actualDurationSec > 0 && Math.abs(actualDurationSec - expectedDurationSec) > Math.max(1.2, expectedDurationSec * 0.04)) {
      fail("media probe", `duration mismatch: expected ${expectedDurationSec.toFixed(2)}s, got ${actualDurationSec.toFixed(2)}s`);
    }
    if (!checks.some((check) => check.name === "media probe" && check.status === "fail")) {
      pass("media probe", `${videoCount} video stream(s), ${audioCount} audio stream(s), ${actualDurationSec ? `${actualDurationSec.toFixed(2)}s` : "duration unknown"}`);
    }
  }
  if (render.kind !== "alpha" && projectState.subtitlesRequested === true && render.subtitles !== true) {
    fail("subtitle burn-in", "subtitles were requested but final render-result says subtitles=false");
  } else if (render.kind !== "alpha" && projectState.subtitlesRequested === true) {
    pass("subtitle burn-in", "subtitles burned into final render");
  }
  }
}

function validateMotionEvidence(shot: any) {
  const steps = Array.isArray(shot?.steps) ? shot.steps : [];
  const motionRequired = steps.filter(needsMotionStrip);
  const referenceSteps = steps.filter(isReferenceStyleShot);
  if (referenceSteps.some((step: any) => step.referenceVideo || step.referenceVideoStyle)) {
    const analysis = readJson("output/reference-video-analysis/manifest.json");
    if (!analysis) {
      fail("reference video analysis", "run npm run analyze:references -- <reference-video...>");
    } else if (analysis.strategy !== "timestamp-reference-video-analysis" || !Array.isArray(analysis.videos)) {
      fail("reference video analysis", "manifest strategy/videos are invalid");
    } else {
      const weak = analysis.videos.filter((video: any) => new Set((video.frames ?? []).map((frame:any)=>frame.timeSec).filter(Number.isFinite)).size < 3);
      if (weak.length > 0) fail("reference video analysis", "source reference video needs at least three distinct sample times; pixel differences do not prove continuity");
      else pass("reference video analysis", `${analysis.videos.length} source video(s) analyzed`);
    }
  }
  if (motionRequired.length === 0) {
    pass("motion evidence", "no high-motion/reference shots require motion strips");
    return;
  }
  const strips = readJson("output/motion-strips/manifest.json");
  if (!strips) {
    fail("motion evidence", "run npm run render:motion-strips before delivery validation");
    return;
  }
  if (!["sparse-step-motion-strips","continuous-step-motion-strips"].includes(strips.strategy) || !Array.isArray(strips.steps)) {
    fail("motion evidence", "output/motion-strips/manifest.json is invalid");
    return;
  }
  for(const error of revisionErrors(captureInputRevision(ROOT),strips))fail('motion evidence freshness',error);
  const byKey = new Map<string, any>(strips.steps.map((step: any) => [`${step.chapter}/${step.step}`, step]));
  for (const step of motionRequired) {
    const key = `${step.chapter}/${step.step}`;
    const evidence = byKey.get(key);
    if (!evidence) {
      fail("motion evidence", `${key} missing from motion-strip manifest`);
      continue;
    }
    for(const frame of evidence.frames ?? []) {
      try {if(hashLocalFile(ROOT,`output/motion-strips/${frame.path}`)!==frame.sha256)fail('motion evidence',`${key}: sparse frame hash changed: ${frame.path}`);}catch(error){fail('motion evidence',`${key}: ${String((error as Error).message)}`);}
    }
    const frameCount = Array.isArray(evidence.frames) ? evidence.frames.length : 0;
    if (frameCount < 3 || new Set((evidence.frames ?? []).map((frame:any)=>frame.frame)).size < 3) {
      fail("motion evidence", `${key} requires at least three distinct-time sparse samples; these cannot establish continuity`);
    }
  }
  if (!checks.some((check) => check.name === "motion evidence" && check.status === "fail")) {
    pass("motion evidence", `${motionRequired.length} high-motion/reference step(s) sampled sparsely; continuity/audio-sync/final-video not established`);
  }
  if (referenceSteps.length > 0) {
    const comparison = readJson("output/reference-style-comparison/manifest.json");
    if (!comparison) {
      fail("reference style comparison", "run npm run compare:references after analyze:references and render:motion-strips");
    } else if (comparison.pass !== true || comparison.exactCopyDetected === true) {
      fail("reference style comparison", "sparse artifact comparison failed or shared sample hashes require review");
    } else if (comparison.schema !== 3 || comparison.passScope !== "sparse-artifact-metadata-only" ||
      comparison.dynamicSimilarity?.verdict !== "not-assessed-from-sparse-metadata" ||
      comparison.dynamicSimilarity?.generated?.averageDynamicScore !== null ||
      comparison.visualReview?.status !== "not-performed" || comparison.visualReview?.accepted !== false) {
      fail("reference style comparison", "comparison is stale or makes unsupported visual claims; rerun npm run compare:references (sparse artifact checks only)");
    } else {
      pass("reference style comparison", "sparse artifact metadata checks passed; continuity, motion grammar and aesthetics not assessed here; existing visual-review decisions remain separate");
    }
  }
}

function validateCover(projectState: any) {
  // Alpha-only does not imply a cover, but an explicit coverRequired is honored in every output mode.
  if (projectState.coverRequired !== true) return;
  const errors = coverDeliveryErrors(ROOT);
  if (errors.length) fail("cover", errors.join("; "));
  else pass("cover", "Current brief/assets/output hashes and separately bound visual approval verified");
}

function main() {
  const startedRevision=captureInputRevision(ROOT);
  const projectState = readJson("project-state.json") ?? {};
  const shot = readJson("shot-manifest.json");
  if (!shot) fail("shot manifest", "shot-manifest.json is missing");
  else pass("shot manifest", `${Array.isArray(shot.steps) ? shot.steps.length : 0} step(s)`);

  validateWorkflowEvidence(projectState);
  validateScreenTextGate();
  requireFile("output/golden/manifest.json", "golden frames");
  const timing = validateTiming(shot);
  if (timing) validateTtsManifest(projectState, timing);
  if (shot && outputMode(projectState.outputMode) !== 'opaque') {
    for (const item of shot.steps ?? []) {
      for (const error of overlaySafetyErrors(item)) fail('overlay safety', `${item.chapter}/${item.step}: ${error}`);
      try {
        const evidence = localPath(ROOT, item.overlaySafety?.reviewEvidence);
        if (!existsSync(evidence) || !statSync(evidence).isFile()) fail('overlay safety', 'review evidence file is missing');
      } catch { fail('overlay safety', 'review evidence path must be local and inside the project'); }
    }
  }
  if (shot && projectState.subtitlesRequested === true) validateSubtitleSafety(shot, projectState);
  for (const error of validateComposition()) fail("composition contract", error);
  validateFinalRender(projectState);
  if (shot) validateMotionEvidence(shot);
  validateCover(projectState);

  const finishedRevision=captureInputRevision(ROOT);
  for(const error of revisionErrors(finishedRevision,startedRevision))fail('validation input freshness',error);
  const report = {
    schema: 3,
    contentRevision: finishedRevision.contentRevision,
    outputMode: outputMode(projectState.outputMode),
    mediaHashes: Object.fromEntries(finalOutputs(readJson('output/render-result.json')).map((item: any) => [item.output, item.sha256])),
    generatedAt: new Date().toISOString(),
    pass: failed === 0,
    failed,
    checks,
  };
  mkdirSync(resolve(ROOT, "output"), { recursive: true });
  writeFileSync(resolve(ROOT, "output/delivery-validation.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  appendFeedbackEvent({
    eventType: "gate-result",
    phase: "delivery-validation",
    target: "enterprise-final-delivery",
    problem: failed > 0 ? `${failed} delivery validation issue(s)` : "",
    agentAction: "npm run validate:delivery",
    validation: [{ command: "npm run validate:delivery", status: failed > 0 ? "fail" : "pass", evidence: "output/delivery-validation.json" }],
    userResolution: "pending",
    notes: failed === 0 ? "Delivery validation passed. This is system evidence, not user acceptance." : "Delivery validation failed and blocked customer handoff.",
  });
  if (failed > 0) process.exit(1);
  console.error("v delivery validation passed");
}

main();
