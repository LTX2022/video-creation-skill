import { captureInputRevision, revisionErrors, hashLocalFile } from "./input-revision";
import { requiredDecisionChecks, readFeedbackEvents, latestDecision, subjectForDecision } from "./workflow-evidence";
import { contractErrors, finalOutputs, outputMode, localPath } from "./delivery-contract";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  openSync,
  closeSync,
  fstatSync,
  ftruncateSync,
  constants,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { basename, dirname, join, resolve, relative, isAbsolute, sep, parse } from "node:path";
import { appendFeedbackEvent } from "./feedback-event";
import { coverDeliveryErrors } from "./cover-contract";
import { resolveAudioSource, PROVIDED_AUDIO_MANIFEST } from "./audio-source";
import { stageSourceHandoff } from "./source-handoff";

const ROOT = process.cwd();
const args = process.argv.slice(2);

function readFlag(name: string, fallback: string | null = null): string | null {
  const prefix = `${name}=`;
  const value = args.filter((arg) => arg.startsWith(prefix)).at(-1);
  if (value) return value.slice(prefix.length);
  const index = args.lastIndexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1]!.startsWith("--")) return args[index + 1]!;
  return fallback;
}

function readJson(path: string): any | null {
  const full = resolve(ROOT, path);
  assertSafeProjectPath(full);
  if (!existsSync(full)) return null;
  try {
    return JSON.parse(readFileSync(full, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    console.error(`x could not parse required JSON: ${path}`);
    console.error(error);
    process.exit(1);
  }
}

function readOptionalJson(path: string): any | null {
  const full = resolve(ROOT, path);
  assertSafeProjectPath(full);
  if (!existsSync(full)) return null;
  try {
    return JSON.parse(readFileSync(full, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

function sanitizeName(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "video-project";
}

function normalizedOutputPath(value: unknown): string {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function sha256(path: string): string { return hashLocalFile(ROOT, relative(ROOT,path)); }

// Packaging must not follow project links into unrelated data. Essential unsafe
// evidence is an error; optional diagnostic callers catch and report it separately.
function assertSafeProjectPath(full: string): void {
  const rel = relative(ROOT, full);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error("Package path escapes project");
  let current = ROOT;
  for (const part of rel.split(sep)) {
    current = join(current, part);
    try {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink() || (!stat.isDirectory() && (!stat.isFile() || stat.nlink !== 1))) throw new Error("Unsafe linked/nonregular package path");
    } catch (error: any) { if (error.code !== "ENOENT") throw error; }
  }
}
function prepareDestination(to: string): void {
  assertSafeProjectPath(to);
  mkdirSync(dirname(to), { recursive: true });
  assertSafeProjectPath(to);
}
function copyFileRobust(from: string, to: string) {
  assertSafeProjectPath(from);
  prepareDestination(to);
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      assertSafeProjectPath(from); assertSafeProjectPath(to);
      copyFileSync(from, to);
      assertSafeProjectPath(to);
      return;
    } catch (error) { lastError = error; }
  }
  throw lastError;
}
function copyDirectoryRobust(from: string, to: string) {
  assertSafeProjectPath(from); assertSafeProjectPath(to);
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const source = join(from, entry.name), target = join(to, entry.name);
    assertSafeProjectPath(source);
    if (entry.isDirectory()) copyDirectoryRobust(source, target);
    else if (entry.isFile()) copyFileRobust(source, target);
    else throw new Error("Unsafe directory entry in delivery evidence");
  }
}
function copyIfExists(from: string, toDir: string, label?: string) {
  const full = resolve(ROOT, from);
  assertSafeProjectPath(full);
  if (!existsSync(full)) return false;
  const target = join(toDir, label ?? basename(from));
  if (lstatSync(full).isDirectory()) copyDirectoryRobust(full, target);
  else copyFileRobust(full, target);
  return true;
}
function copyDiagnosticFile(from: string, stageDir: string): boolean {
  const full = resolve(ROOT, from);
  assertSafeProjectPath(full);
  if (!existsSync(full)) return false;
  const descriptor = openSync(full, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = fstatSync(descriptor);
    if (!before.isFile() || before.nlink !== 1 || before.size > 16 * 1024 * 1024) throw new Error("Unsafe or oversized diagnostic");
    const bytes = readFileSync(descriptor), after = fstatSync(descriptor);
    assertSafeProjectPath(full);
    const current = lstatSync(full);
    if (before.ino !== current.ino || before.dev !== current.dev || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) throw new Error("Diagnostic changed while copying");
    const target = join(stageDir, from);
    prepareDestination(target);
    writeFileSync(target, bytes, {flag: "wx", mode: 0o600});
    return true;
  } finally { closeSync(descriptor); }
}
// Derived diagnostics are useful only when their frozen references still match.
// A valid media package may omit them, but must not advertise a stale handoff.
function coherentReviewSnapshot(stageDir: string, reviewDirectory: string, expectedId: string | null): boolean {
  try {
    const readStaged = (name: string) => {
      const full = join(stageDir, reviewDirectory, name);
      assertSafeProjectPath(full);
      return readFileSync(full, "utf8");
    };
    const summary = JSON.parse(readStaged("summary.json"));
    const handoff = JSON.parse(readStaged("fix-agent-handoff.json"));
    const {summaryId, ...summaryBody} = summary;
    if (!expectedId || summaryId !== expectedId || handoff.summaryId !== expectedId
      || summary.kind !== "deterministic-review-summary" || handoff.kind !== "fix-agent-handoff"
      || handoff.runId !== summary.runId || handoff.synthetic !== summary.synthetic
      || handoff.summaryPath !== `${reviewDirectory}/summary.json`
      || createHash("sha256").update(JSON.stringify(summaryBody)).digest("hex") !== expectedId
      || !readStaged("summary.md").includes(expectedId)) return false;
    if (!Array.isArray(summary.evidence) || !Array.isArray(handoff.allowedEvidence)) return false;
    const expected = summary.evidence.filter((item: any) => item.status === "present")
      .map(({path, sha256}: any) => ({path, sha256}));
    if (JSON.stringify(expected) !== JSON.stringify(handoff.allowedEvidence)) return false;
    const allowed = new Set(["project-state.json", "output/render-result.json", "output/delivery-validation.json",
      "feedback-events.jsonl", "feedback-log.md", "output/metrics/stage-events.jsonl", "output/metrics/active-run.json"]);
    for (const item of expected) {
      if (!allowed.has(item.path) || typeof item.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(item.sha256)) return false;
      const full = join(stageDir, item.path);
      assertSafeProjectPath(full);
      if (!existsSync(full) || hashLocalFile(stageDir, item.path) !== item.sha256.toUpperCase()) return false;
    }
    return true;
  } catch { return false; }
}

function assertSafeStagingTree(directory: string): void {
  assertSafeProjectPath(directory);
  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const full = join(directory, entry.name);
    assertSafeProjectPath(full);
    if (entry.isDirectory()) assertSafeStagingTree(full);
  }
}

function writeSafeProjectFile(full: string, contents: string): void {
  assertSafeProjectPath(full);
  const descriptor = openSync(full, constants.O_WRONLY | constants.O_CREAT | (constants.O_NOFOLLOW ?? 0), 0o600);
  try {
    const stat = fstatSync(descriptor);
    if (!stat.isFile() || stat.nlink !== 1) throw new Error("Unsafe package summary output");
    ftruncateSync(descriptor, 0);
    writeFileSync(descriptor, contents, "utf8");
  } finally { closeSync(descriptor); }
}
function desktopDir(): string {
  const explicit = readFlag("--desktop");
  if (explicit) return resolve(explicit);

  return join(ROOT, "output");
}

function powershellQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function zipStage(stageDir: string, zipPath: string) {
  // The archive destination may be explicitly outside ROOT, but never a linked
  // path or an existing file that zip could update/overwrite unexpectedly.
  let current = parse(resolve(zipPath)).root;
  for (const part of relative(current, resolve(zipPath)).split(sep)) {
    current = join(current, part);
    try { const stat = lstatSync(current); if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("Archive destination must be a new file under unlinked directories"); }
    catch (error: any) { if (error.code !== "ENOENT") throw error; }
  }
  mkdirSync(dirname(zipPath), { recursive: true });
  if (process.platform === "win32") {
    const command = [
      "$ErrorActionPreference = 'Stop';",
      `$source = Join-Path ${powershellQuote(stageDir)} '*';`,
      `Compress-Archive -Path $source -DestinationPath ${powershellQuote(zipPath)} -Force;`,
    ].join(" ");
    execFileSync("powershell.exe", ["-NoProfile", "-Command", command], { stdio: "inherit" });
    return;
  }
  execFileSync("zip", ["-r", zipPath, "."], { cwd: stageDir, stdio: "inherit" });
}

const packageJson = readJson("package.json") ?? {};
const projectState = readJson("project-state.json") ?? {};
const audioSource = resolveAudioSource(projectState);
const providedAudioManifest = audioSource === 'provided' ? readOptionalJson(PROVIDED_AUDIO_MANIFEST) : null;
const marker = readJson(".web-video-presentation-project.json") ?? {};
const renderResult = readOptionalJson("output/render-result.json");
const deliveryValidation = readOptionalJson("output/delivery-validation.json");
const ttsManifest = audioSource === 'tts' ? readOptionalJson("output/tts-manifest.json") : null;
const goldenManifest = readOptionalJson("output/golden/manifest.json");
const overlayReviewFiles: string[] = [...new Set<string>((readOptionalJson('shot-manifest.json')?.steps ?? [])
  .map((item: any) => String(item.overlaySafety?.reviewEvidence ?? '').replaceAll('\\','/'))
  .filter((path: string) => /^output\/.+\.(png|jpe?g|webp)$/i.test(path)))];
for (const path of overlayReviewFiles) localPath(ROOT, path);
const motionStripsManifest = readOptionalJson("output/motion-strips/manifest.json");
const referenceVideoAnalysis = readOptionalJson("output/reference-video-analysis/manifest.json");
const referenceStyleComparison = readOptionalJson("output/reference-style-comparison/manifest.json");
const coverReport = readOptionalJson("output/cover/cover-report.json");
const allowIncomplete = args.includes("--allow-incomplete");
const outputs = finalOutputs(renderResult);
const detectedFinalOutput = outputs[0]?.output ?? '';
if (!allowIncomplete) {
  if (!renderResult) throw new Error('Final render-result.json is required');
  const currentRevision = captureInputRevision(ROOT);
  const errors = contractErrors(projectState, renderResult, currentRevision);
  errors.push(...revisionErrors(currentRevision, deliveryValidation));
  for(const check of requiredDecisionChecks(ROOT,{state:projectState,includeFinal:true,revision:currentRevision}))if(check.status!=='accepted')errors.push(`${check.gate}/${check.scope}: ${check.detail}`);
  if(readFeedbackEvents(ROOT).some((event)=>event.parseError))errors.push('Feedback log has invalid JSON; current decisions cannot be trusted as complete');
  const alphaOutput=outputs.find((item:any)=>item.kind==='alpha');
  if(alphaOutput) {
    const decision=latestDecision(readFeedbackEvents(ROOT),subjectForDecision(ROOT,'alpha-edge-review',{scope:'output:alpha',target:alphaOutput.sha256,state:projectState,revision:currentRevision}));
    if(decision.status!=='accepted')errors.push(`Alpha edge review is ${decision.status}`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  if (deliveryValidation?.pass !== true) throw new Error('A passing delivery-validation.json is required; run validate:delivery');
  for (const item of outputs) {
    const full = localPath(ROOT, item.output);
    if (!existsSync(full) || sha256(full) !== String(item.sha256).toUpperCase()) throw new Error(`Missing or changed final output: ${item.output}`);
    if (deliveryValidation.mediaHashes?.[item.output] !== item.sha256) throw new Error(`Delivery validation is stale for ${item.output}; revalidate`);
  }
  if (projectState.coverRequired === true) { const coverErrors = coverDeliveryErrors(ROOT); if (coverErrors.length) throw new Error(coverErrors.join('\n')); }
}

const projectName = sanitizeName(
  readFlag("--project-name") ?? packageJson.name ?? marker.projectName ?? basename(resolve(ROOT, "..")),
);
const skillName = "web-video-presentation";
const skillVersion = String(projectState.projectVersion ?? marker.projectVersion ?? readFlag("--skill-version") ?? "unknown");
const packageName = `${projectName}-${skillName}-v${skillVersion}-${timestamp()}`;
const stageDir = resolve(ROOT, "output", "delivery-package", packageName);
const zipPath = join(desktopDir(), `${packageName}.zip`);

assertSafeProjectPath(stageDir);
mkdirSync(dirname(stageDir), { recursive: true });
assertSafeProjectPath(stageDir);
mkdirSync(stageDir); // Never merge leftovers from an earlier package or a pre-existing staging tree.

// Lightweight local diagnostic only: never a QA gate, approval, repair or deep-agent call.
// This is intentionally a pre-package snapshot: the enclosing package metric is still open.
let reviewDirectory: string | null = null;
let reviewSummaryId: string | null = null;
try {
  const runId = process.env.VWP_METRICS_RUN_ID;
  const summaryArgs = [resolve(ROOT, "scripts/review-summary.mjs"), "--status=partial", "--json"];
  if (runId && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(runId)) summaryArgs.push(`--run-id=${runId}`);
  const result = JSON.parse(execFileSync(process.execPath, summaryArgs, {cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000, maxBuffer: 4 * 1024 * 1024}));
  const selected = result?.summary?.runId ?? "unselected";
  if (typeof selected !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(selected)) throw new Error("Invalid summary selection");
  reviewDirectory = `output/review/${selected}`;
  reviewSummaryId = typeof result?.summary?.summaryId === "string" ? result.summary.summaryId : null;
} catch {
  console.warn("! Local review snapshot unavailable; packaging/QA status is unchanged (no automatic fix-agent).");
}

const copied: string[] = [];
const diagnosticPaths = ["output/metrics/stage-events.jsonl", "output/metrics/active-run.json"];
if (reviewDirectory) {
  const selected = basename(reviewDirectory);
  if (selected !== "unselected") diagnosticPaths.push(`output/metrics/runs/${selected}.json`);
  diagnosticPaths.push(...["summary.json", "summary.md", "fix-agent-handoff.json"].map(name => `${reviewDirectory}/${name}`));
}
for (const file of diagnosticPaths) {
  try { if (copyDiagnosticFile(file, stageDir)) copied.push(file); }
  catch { console.warn("! An unsafe/unavailable optional diagnostic was omitted; packaging/QA status is unchanged."); }
}
for (const file of [
  ...outputs.map((item: any) => item.output),
  "output/render-result.json",
  "output/render-results",
  "output/delivery-validation.json",
  ...(audioSource === 'tts' ? ["output/tts-manifest.json"] : []),
  ...(audioSource === 'provided' ? [PROVIDED_AUDIO_MANIFEST] : []),
  "output/golden",
  ...overlayReviewFiles,
  "output/motion-strips",
  "output/reference-video-analysis",
  "output/reference-style-comparison",
  "output/subtitles",
  "output/cover",
  "script.md",
  "outline.md",
  "shot-design.md",
  "shot-manifest.json",
  "asset-manifest.json",
  "composition-manifest.json",
  "output/alpha-validation",
  "project-state.json",
  "feedback-log.md",
  "feedback-events.jsonl",
]) {
  if (copyIfExists(file, join(stageDir, dirname(file)))) copied.push(file);
}

// Verify against final staged bytes, not mutable live project files. Optional
// diagnostic failure stays nonfatal and never changes media/acceptance checks.
if (reviewDirectory && !coherentReviewSnapshot(stageDir, reviewDirectory, reviewSummaryId)) {
  for (const name of ["summary.json", "summary.md", "fix-agent-handoff.json"]) {
    const relativePath = `${reviewDirectory}/${name}`;
    const full = join(stageDir, relativePath);
    assertSafeProjectPath(full);
    if (existsSync(full)) unlinkSync(full);
    const index = copied.indexOf(relativePath);
    if (index >= 0) copied.splice(index, 1);
  }
  reviewDirectory = null;
  console.warn("! Local review evidence changed or is unavailable in the package; derived review files omitted. Metrics coverage is unknown; packaging/QA status is unchanged.");
}

// v3.1 decision subjects and delivery inputs are project-local. Do not scan/copy parent projects.
// Source redistribution is a separate explicit opt-in with a bounded file list.
// The default media/evidence package is not an editable/reproducible project.
const sourceHandoff = stageSourceHandoff(ROOT, stageDir, {includeSource: args.includes('--include-source')});

const summaryPath = resolve(ROOT, "output", "delivery-summary.md");
const finalOutput = detectedFinalOutput;
const finalSha = finalOutput && existsSync(resolve(ROOT, finalOutput)) ? sha256(resolve(ROOT, finalOutput)) : renderResult?.sha256 ?? "";
const summary = `# Delivery Summary

## Package

- Project name: ${projectName}
- Skill: ${skillName}
- Skill version: ${skillVersion}
- Generated at: ${new Date().toISOString()}
- Package name: ${packageName}.zip
- Package scope: ${sourceHandoff ? `media/evidence + selected source snapshot (${sourceHandoff.status}; not a complete/offline-runnable project guarantee)` : 'media/evidence only; editable source project and original assets are not included'}
- Source handoff: ${sourceHandoff ? `source-handoff-report.json; ${sourceHandoff.files.length} explicitly selected files under source-project/; minimum inputs ${sourceHandoff.minimumInputs.met ? 'present, not runtime-verified' : `missing: ${sourceHandoff.minimumInputs.missing.join(', ')}`}` : 'not requested; use --include-source only with an authorized source-delivery-manifest.json'}

## Video

- Profile: ${projectState.videoProfile ?? marker.videoProfile ?? "unknown"}
- Format: ${projectState.videoFormat ?? marker.format ?? "unknown"}
- Size: ${projectState.videoWidth ?? marker.width ?? "unknown"}x${projectState.videoHeight ?? marker.height ?? "unknown"}
- FPS: ${projectState.videoFps ?? marker.fps ?? "unknown"}
- Subtitles requested: ${String(projectState.subtitlesRequested ?? marker.subtitlesRequested ?? false)}
- Audio requested: ${String(projectState.audioRequested ?? marker.audioRequested ?? false)}
- Output mode: ${outputMode(projectState.outputMode)}
- Final outputs: ${outputs.map((item: any) => `${item.kind}: ${item.output} (SHA256 ${item.sha256})`).join("; ") || "missing"}
- SHA256: ${finalSha || "missing"}

## Evidence

- render-result.json: ${existsSync(resolve(ROOT, "output/render-result.json")) ? "included" : "missing"}
- delivery validation: ${deliveryValidation?.pass === true ? "included and passed" : allowIncomplete ? "missing or failed (draft package allowed)" : "missing or failed"}
- Audio source: ${audioSource}
- TTS manifest: ${audioSource === 'tts' ? ttsManifest ? `included (${ttsManifest.provider ?? "unknown"} / ${ttsManifest.voice ?? "unknown"})` : "missing" : audioSource === 'provided' ? "not required (provided narration)" : "not required"}
- Provided audio manifest: ${audioSource === 'provided' ? providedAudioManifest ? "included (local source declaration, not authenticated approval); referenced recordings are not redistributed automatically" : "missing" : "not required"}
- golden manifest: ${goldenManifest ? "included" : "missing"}
- motion strips manifest: ${motionStripsManifest ? "included" : "missing"}
- reference video analysis: ${referenceVideoAnalysis ? "included" : "missing or not required"}
- reference style comparison: ${referenceStyleComparison ? String(referenceStyleComparison.verdict ?? "included") : "missing or not required"}
- feedback log: ${existsSync(resolve(ROOT, "feedback-log.md")) ? "included" : "missing"}
- douyin cover: ${coverReport?.pass === true ? "included and validated" : projectState.videoProfile === "douyin" ? "missing or failed" : "not required"}
- local review: ${reviewDirectory ? "included; partial pre-package snapshot, not QA/acceptance" : "unavailable; metrics coverage unknown"}
- copied files: ${copied.length}

## Agent Feedback

This package contains the selected media and review evidence, not an implicit editable source project. It should contain the rendered video, render metadata, delivery-validation evidence, subtitle output when available, golden-frame evidence, motion-strip evidence when applicable, reference-video analysis when applicable, the shot manifest, asset manifest, and feedback records. Source files and original assets are included only when separately selected and authorized via --include-source; see its partial/verification limits above. If any required item above is marked missing, treat this package as incomplete and fix the workflow before customer delivery.
`;
writeSafeProjectFile(summaryPath, summary);
copyFileRobust(summaryPath, join(stageDir, "delivery-summary.md"));

try {
  if(!allowIncomplete) {
    const stale=revisionErrors(captureInputRevision(ROOT),renderResult);
    if(stale.length)throw new Error(`Inputs changed while preparing delivery: ${stale.join('; ')}`);
    for(const item of outputs)if(hashLocalFile(stageDir,item.output)!==item.sha256)throw new Error(`Copied output hash differs: ${item.output}`);
    for(const check of requiredDecisionChecks(ROOT,{includeFinal:true}))if(check.status!=='accepted')throw new Error(`Decision changed while preparing delivery: ${check.gate}/${check.scope}: ${check.status}`);
  }
  assertSafeStagingTree(stageDir);
  zipStage(stageDir, zipPath);
} catch (error) {
  console.error(`x could not create zip. Staging folder is still available: ${stageDir}`);
  console.error(error);
  process.exit(1);
}

appendFeedbackEvent({
  eventType: "gate-result",
  phase: "delivery-package",
  target: "desktop-delivery-zip",
  agentAction: "npm run package:delivery",
  validation: [{ command: "npm run package:delivery", status: "pass", evidence: zipPath }],
  userResolution: "pending",
  notes: `Delivery package created: ${zipPath}`,
});

console.log(`v delivery package created: ${zipPath}`);
