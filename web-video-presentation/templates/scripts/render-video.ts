import { atomicOutputWrite, safeOutputFile, safeRenderOutput, stagedRenderOutput, validateDecodedMedia, withOutputRollback } from './render-output-safety';
import { bothChildArgs, parseAlphaSampleFrames, resolveRenderOutput } from './render-route-args';
import { captureInputRevision, hashLocalFile, renderVariantDigest, revisionErrors, safeLocalPath, type InputRevision } from "./input-revision";
import { requiredDecisionChecks } from "./workflow-evidence";
import { installedBrowser } from "./browser";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { contractErrors, finalOutputs, mergeFinalOutput, outputKinds, outputMode, OUTPUTS, readState, type OutputKind } from './delivery-contract';
import { validateComposition } from './validate-composition';
import { validateAlphaMedia } from './validate-alpha';
import { appendFeedbackEvent } from "./feedback-event";

const require = createRequire(import.meta.url);
const REMOTION_CLI = resolve(dirname(require.resolve("@remotion/cli/package.json")), "remotion-cli.js");

const args = process.argv.slice(2);

function readFlag(name: string, fallback: string | null = null): string | null {
  const prefix = `${name}=`;
  const value = args.filter((arg) => arg.startsWith(prefix)).at(-1);
  if (value) return value.slice(prefix.length);
  const index = args.lastIndexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1]!.startsWith("--")) return args[index + 1]!;
  const envName = name.slice(2).toUpperCase().replaceAll("-", "_");
  const envValue = process.env[`REMOTION_${envName}`] ?? process.env[`PRESENTATION_${envName}`];
  if (envValue) return envValue;
  return fallback;
}

function hasFlag(name: string): boolean {
  return args.includes(name);
}

if (hasFlag("--help") || hasFlag("-h")) {
  console.log(`Usage: tsx scripts/render-video.ts [options]

Quality presets:
  --preset=quality        Commercial final output. Defaults to h264 CRF 16.
  --preset=draft|--fast   Faster review output. Writes lower-bitrate draft unless overridden.

Common options:
  --output=<path>         Single-mode output override (not valid for both).
                          Defaults follow mode; drafts: output/draft-<mode>[-subtitles].mov|mp4
  --frames=<range>        Render only a frame range, for example 0-180
  --subtitles             Burn subtitles into the video
  --output-mode=<mode>   opaque | alpha | composite | both (defaults to project-state)
  --alpha-sample-frames=0,10,59  Explicit decoded output frames for transient Alpha QA (1-32 indices)
  --alpha                 Legacy alias for alpha; set project-state.outputMode for final delivery
                          Render full-video-alpha to ProRes 4444 with alpha channel
  --codec=<codec>         Remotion codec. Default: h264
  --crf=<number>          H.264 CRF. Default: 16 quality, 20 draft
  --concurrency=<n|%>     Forwarded to Remotion. Example: 4 or 70%
  --x264-preset=<name>    Example: medium, fast, veryfast, ultrafast
  --hardware-acceleration=<mode>  disable, if-possible, required
  --pixel-format=<fmt>    Example: yuv420p
  --audio-codec=<codec>   Example: aac
  --scale=<number>        Optional lower device scale for draft checks
  --port=<number>         Remotion internal preview port. Default: free random port
  --browser-executable=<path>  Use installed Chrome/Edge instead of downloading one
  --every-nth-frame=<n>   Draft-only diagnostic; skips frames and can look choppy
  --acknowledge-draft     Allow draft/smoke/alpha:draft when workflow gates are incomplete (iteration only)
  --quiet                 Reduce Remotion progress output

Env aliases are also accepted, for example REMOTION_CONCURRENCY=70%.`);
  process.exit(0);
}

const preset = readFlag("--preset", hasFlag("--fast") ? "draft" : "quality")!;
const isDraft = preset === "draft" || preset === "fast";
if (!["quality", "draft", "fast"].includes(preset)) {
  console.error(`x unknown render preset: ${preset}`);
  process.exit(1);
}

const projectState = readState();
const contractMode = outputMode(projectState.outputMode);
const selectedMode = outputMode(hasFlag('--alpha') ? 'alpha' : readFlag('--output-mode', contractMode));
if (selectedMode === 'alpha' && (hasFlag('--subtitles') || hasFlag('--captions'))) throw new Error('Alpha-only exports do not burn subtitles; choose composite/both for captioned media');
const kind: OutputKind = selectedMode === 'both' ? 'alpha' : selectedMode;
const alpha = kind === 'alpha';
const composition = OUTPUTS[kind].composition;
const frames = readFlag('--frames');
const codec = alpha ? 'prores' : readFlag('--codec', 'h264')!;
const crf = readFlag('--crf', isDraft ? '20' : '16')!;
const subtitles = !alpha && (hasFlag('--subtitles') || hasFlag('--captions') || projectState.subtitlesRequested === true);
const output = resolveRenderOutput(selectedMode, isDraft, subtitles, readFlag('--output'), OUTPUTS[kind].output);
const alphaSampleFrames=parseAlphaSampleFrames(readFlag('--alpha-sample-frames'));
let alphaValidation: ReturnType<typeof validateAlphaMedia> | null = null;
let decodeValidation: ReturnType<typeof validateDecodedMedia> | null = null;
const concurrency = readFlag("--concurrency");
const x264Preset = readFlag("--x264-preset", isDraft ? "veryfast" : null);
const pixelFormat = readFlag("--pixel-format");
const hardwareAcceleration = readFlag("--hardware-acceleration");
const audioCodec = readFlag("--audio-codec");
const scale = readFlag("--scale");
const requestedPort = readFlag("--port", process.env.REMOTION_PORT ?? null);
const browserExecutable = readFlag("--browser-executable", process.env.REMOTION_BROWSER_EXECUTABLE ?? null);
const everyNthFrame = readFlag("--every-nth-frame");
const quiet = hasFlag("--quiet") || process.env.REMOTION_QUIET === "1";

const detectedBrowser = installedBrowser(browserExecutable);

let inputRevision: InputRevision;
function getMissingWorkflowGates(): Array<[string, string]> {
  return requiredDecisionChecks(process.cwd(), {state: projectState, revision: inputRevision})
    .filter((check) => check.status !== 'accepted').map((check) => [check.gate, `${check.scope}: ${check.detail}`]);
}

function assertWorkflowAllowed() {
  if (isDraft || frames) return;
  const missing = getMissingWorkflowGates();
  if (missing.length > 0) {
    console.error(`x final render blocked. Missing workflow evidence: ${missing.map(([, label]) => label).join(", ")}.`);
    console.error("  Record evidence with npm run feedback after the user actually confirms each gate.");
    process.exit(1);
  }
}

function assertDraftAcknowledged() {
  if (!isDraft && !frames) return;
  const missing = getMissingWorkflowGates();
  if (missing.length === 0) return;
  if (hasFlag("--acknowledge-draft")) {
    console.error(`! draft/smoke render with missing gates acknowledged: ${missing.map(([, label]) => label).join(", ")}`);
    return;
  }
  console.error(`x draft/smoke render blocked. Missing workflow evidence: ${missing.map(([, label]) => label).join(", ")}.`);
  console.error("  Fix gates with npm run feedback, or pass --acknowledge-draft for intentional iteration only.");
  process.exit(1);
}


function normalizedOutputPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function renderResultName(value: string): string {
  const base = basename(normalizedOutputPath(value), extname(value));
  return (base || "render")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "render";
}

function renderCommandLabel(): string {
  if (frames) return "npm run render:smoke";
  if (kind === "composite" && !isDraft) return "npm run render:video:composite";
  if (alpha && isDraft) return "npm run render:video:alpha:draft";
  if (alpha) return "npm run render:video:alpha";
  if (isDraft && subtitles) return "npm run render:video:draft:subtitles";
  if (isDraft) return "npm run render:video:draft";
  if (subtitles) return "npm run render:video:subtitles";
  return "npm run render:video";
}

function readVideoFormat() {
  const path = resolve(process.cwd(), "src/config/videoFormat.ts");
  if (!existsSync(path)) return null;
  const src = readFileSync(path, "utf8");
  return {
    id: src.match(/id:\s*["']([^"']+)["']/)?.[1] ?? null,
    width: Number(src.match(/width:\s*(\d+)/)?.[1] ?? NaN),
    height: Number(src.match(/height:\s*(\d+)/)?.[1] ?? NaN),
    fps: Number(src.match(/fps:\s*(\d+(?:\.\d+)?)/)?.[1] ?? NaN),
  };
}

function readRenderFrames() {
  const path = resolve(process.cwd(), "src/video/render-timing.generated.ts");
  if (!existsSync(path)) return null;
  const src = readFileSync(path, "utf8");
  const match = src.match(/export const TOTAL_FRAMES\s*=\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

function ffprobePath(): string {
  return process.env.FFPROBE_PATH || "ffprobe";
}

function parseRate(value: string | undefined): number | null {
  if (!value) return null;
  const [a, b] = value.split("/").map(Number);
  if (!Number.isFinite(a)) return null;
  if (!Number.isFinite(b) || b === 0) return a;
  return a / b;
}

function probeMedia(path: string) {
  const probe = spawnSync(
    ffprobePath(),
    [
      "-v",
      "error",
      "-protocol_whitelist", "file,pipe",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      path,
    ],
    { encoding: "utf8" },
  );
  if (probe.error || probe.status !== 0 || !probe.stdout) {
    return {
      ok: false,
      error: String(probe.error?.message ?? probe.stderr ?? "ffprobe failed"),
      ffprobe: ffprobePath(),
    };
  }
  try {
    const data = JSON.parse(probe.stdout);
    const streams = Array.isArray(data.streams) ? data.streams : [];
    const videoStreams = streams.filter((stream: any) => stream.codec_type === "video");
    const audioStreams = streams.filter((stream: any) => stream.codec_type === "audio");
    const firstVideo = videoStreams[0] ?? {};
    const firstAudio = audioStreams[0] ?? {};
    return {
      ok: true,
      ffprobe: ffprobePath(),
      durationSec: Number(data.format?.duration ?? firstVideo.duration ?? 0) || null,
      bitRate: Number(data.format?.bit_rate ?? 0) || null,
      streamCount: streams.length,
      videoStreamCount: videoStreams.length,
      audioStreamCount: audioStreams.length,
      video: videoStreams.length > 0 ? {
        codec: firstVideo.codec_name ?? null,
        pixelFormat: firstVideo.pix_fmt ?? null,
        width: Number(firstVideo.width ?? 0) || null,
        height: Number(firstVideo.height ?? 0) || null,
        fps: parseRate(firstVideo.avg_frame_rate) ?? parseRate(firstVideo.r_frame_rate),
        frames: Number(firstVideo.nb_frames ?? 0) || null,
      } : null,
      audio: audioStreams.length > 0 ? {
        codec: firstAudio.codec_name ?? null,
        sampleRate: Number(firstAudio.sample_rate ?? 0) || null,
        channels: Number(firstAudio.channels ?? 0) || null,
        durationSec: Number(firstAudio.duration ?? data.format?.duration ?? 0) || null,
      } : null,
    };
  } catch (error) {
    return {
      ok: false,
      error: `could not parse ffprobe JSON: ${String((error as Error)?.message ?? error)}`,
      ffprobe: ffprobePath(),
    };
  }
}

function writeRenderResult(port: number, validatedProbe?: ReturnType<typeof probeMedia>) {
  const after = captureInputRevision();
  const stale = revisionErrors(after, inputRevision);
  if (stale.length) throw new Error(`Inputs changed during rendering; no final receipt recorded: ${stale.join('; ')}`);
  const outputPath = safeLocalPath(process.cwd(), output);
  if (!existsSync(outputPath)) {
    throw new Error(`render finished but output file is missing: ${output}`);
  }
  const stat = statSync(outputPath);
  const mediaProbe = validatedProbe ?? probeMedia(outputPath);
  if (mediaProbe.ok !== true) throw new Error(`ffprobe failed; no final evidence recorded: ${JSON.stringify(mediaProbe)}`);
  const result = {
    schema: 3,
    contentRevision: inputRevision.contentRevision,
    renderVariant: renderVariantDigest({kind,composition,subtitles,codec,crf:alpha?null:crf,preset,frames,totalFrames:readRenderFrames(),videoFormat:readVideoFormat(),pixelFormat:alpha?'yuva444p10le':pixelFormat,audioCodec,scale:scale??'1',everyNthFrame,x264Preset,hardwareAcceleration,alphaSampleFrames}),
    inputBinding: {scope: 'project-local-allowlist', schema: inputRevision.schema, status: inputRevision.status, files: inputRevision.files.map(({path,sha256}) => ({path,sha256}))},
    kind,
    outputMode: contractMode,
    alphaValidation,
    decodeValidation,
    generatedAt: new Date().toISOString(),
    output,
    absoluteOutput: outputPath,
    sha256: hashLocalFile(process.cwd(), output),
    bytes: stat.size,
    preset,
    draft: isDraft,
    alpha,
    acknowledgedDraft: hasFlag("--acknowledge-draft") && (isDraft || Boolean(frames)),
    subtitles,
    codec,
    crf: alpha ? null : crf,
    frames,
    totalFrames: readRenderFrames(),
    videoFormat: readVideoFormat(),
    concurrency,
    x264Preset,
    pixelFormat: alpha ? "yuva444p10le" : pixelFormat,
    hardwareAcceleration,
    audioCodec,
    scale,
    browserExecutable: detectedBrowser ?? browserExecutable,
    everyNthFrame,
    port,
    composition,
    mediaProbe,
  };
  const resultDir = resolve(process.cwd(), "output/render-results");
  const perOutputResult = `output/render-results/${renderResultName(output)}.json`;
  const isFinalEvidence = !isDraft && !frames && normalizedOutputPath(output) === OUTPUTS[kind].output && outputKinds(contractMode).includes(kind);
  mkdirSync(resultDir, { recursive: true });
  atomicOutputWrite(process.cwd(), perOutputResult, `${JSON.stringify(result, null, 2)}\n`);
  if (isFinalEvidence) {
    const finalPath = resolve(process.cwd(), 'output/render-result.json');
    const previous = existsSync(finalPath) ? JSON.parse(readFileSync(finalPath, 'utf8')) : null;
    const manifest = mergeFinalOutput(projectState, result, previous);
    if (!manifest) throw new Error('Output cannot be recorded as final evidence');
    atomicOutputWrite(process.cwd(), 'output/render-result.json', `${JSON.stringify(manifest, null, 2)}\n`);
    const currentState = readState();
    currentState.finalRenderApproved = false; // A newly encoded artifact always needs fresh review.
    atomicOutputWrite(process.cwd(), 'project-state.json', `${JSON.stringify(currentState, null, 2)}\n`);
  }
  safeOutputFile(process.cwd(), "feedback-events.jsonl");
  appendFeedbackEvent({
    eventType: "gate-result",
    phase: "render-video",
    target: "video-render",
    agentAction: `tsx scripts/render-video.ts --preset=${preset}${subtitles ? " --subtitles" : ""}`,
    validation: [{
      command: renderCommandLabel(),
      status: "pass",
      evidence: `${isFinalEvidence ? "output/render-result.json" : perOutputResult} sha256=${result.sha256}`,
    }],
    userResolution: "pending",
    notes: isFinalEvidence
      ? "Selected final-quality output rendered. User acceptance must still be recorded separately."
      : "Draft/smoke/custom/alternate output rendered. It did not replace final evidence for the project output contract.",
  });
  console.error(`v wrote ${perOutputResult} (sha256 ${result.sha256})`);
  if (isFinalEvidence) console.error("v updated output/render-result.json final evidence");
  else console.error("v kept output/render-result.json unchanged because this is not a canonical final output for the selected project mode");
}

async function findFreePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address?.port) {
        const port = address.port;
        server.close(() => resolvePort(port));
      } else {
        server.close(() => reject(new Error("Could not allocate a free port")));
      }
    });
  });
}

async function resolvePort(): Promise<number> {
  if (requestedPort) {
    const port = Number(requestedPort);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      throw new Error("--port must be an integer from 1024 to 65535");
    }
    return port;
  }
  return findFreePort();
}

const renderArgs = [
  REMOTION_CLI,
  "render",
  "src/video/index.ts",
  composition,
  output,
];

if (alpha) {
  renderArgs.push(
    "--codec",
    "prores",
    "--prores-profile",
    "4444",
    "--image-format",
    "png",
    "--pixel-format",
    "yuva444p10le",
  );
} else {
  renderArgs.push("--codec", codec, "--crf", crf);
}

if (frames) {
  renderArgs.push("--frames", frames);
}
if (concurrency) renderArgs.push("--concurrency", concurrency);
if (!alpha && x264Preset) renderArgs.push("--x264-preset", x264Preset);
if (!alpha && pixelFormat) renderArgs.push("--pixel-format", pixelFormat);
if (hardwareAcceleration) renderArgs.push("--hardware-acceleration", hardwareAcceleration);
if (audioCodec) renderArgs.push("--audio-codec", audioCodec);
if (scale) renderArgs.push("--scale", scale);
const effectiveBrowser = detectedBrowser ?? browserExecutable;
if (effectiveBrowser) renderArgs.push("--browser-executable", effectiveBrowser);
if (everyNthFrame) renderArgs.push("--every-nth-frame", everyNthFrame);
if (quiet) renderArgs.push("--quiet");

async function main() {
  inputRevision = captureInputRevision();
  safeRenderOutput(process.cwd(), output, inputRevision.files.map((file) => file.path));
  if (inputRevision.status !== 'bound') throw new Error(`Cannot render with unknown input revision: ${inputRevision.issues.join('; ')}`);
  assertDraftAcknowledged();
  assertWorkflowAllowed();
  for (const error of contractErrors(projectState)) throw new Error(error);
  if (selectedMode === 'both') {
    if (readFlag('--output')) throw new Error('--output cannot be used with both; render the two named outputs separately');
    if (contractMode !== 'both') throw new Error('Set project-state.outputMode="both" before rendering both deliverables');
    for (const childKind of outputKinds('both')) {
      const childArgs = bothChildArgs(args, childKind as 'alpha' | 'composite');
      execFileSync(process.execPath, ['--import', 'tsx',
        resolve(process.cwd(), 'scripts/render-video.ts'), ...childArgs], { stdio: 'inherit' });
    }
    const finalRevision=captureInputRevision();
    const errors=revisionErrors(finalRevision,inputRevision);
    if(errors.length)throw new Error(`both render interrupted by changed inputs: ${errors.join('; ')}`);
    const manifestPath=resolve(process.cwd(),'output/render-result.json');
    if(!isDraft&&!frames)for(const error of contractErrors(readState(),JSON.parse(readFileSync(manifestPath,'utf8')),finalRevision))throw new Error(error);
    return;
  }
  if (kind === 'composite') {
    const errors = validateComposition(process.cwd(), selectedMode);
    if (errors.length) throw new Error(errors.join('\n'));
  }
  if (alpha && pixelFormat && pixelFormat !== 'yuva444p10le') throw new Error('Alpha pixel format is fixed to yuva444p10le');
  if (!alpha && pixelFormat?.includes("yuva") && codec !== "prores") {
    console.error("x yuva pixel format with non-prores codec is blocked. Use --alpha for transparent export.");
    process.exit(1);
  }
  const port = await resolvePort();
  renderArgs.push("--port", String(port));

  console.error(
    `rendering ${output} (${preset}, ${alpha ? "prores+alpha" : codec}${alpha ? "" : `, crf ${crf}`}${concurrency ? `, concurrency ${concurrency}` : ""}${!alpha && x264Preset ? `, x264 ${x264Preset}` : ""}, port ${port}${subtitles ? ", burned subtitles" : ""})`,
  );

  const metadataPaths = [`output/render-results/${renderResultName(output)}.json`, 'output/render-result.json', 'project-state.json', 'feedback-events.jsonl'];
  for (const path of metadataPaths) safeOutputFile(process.cwd(), path);
  const existingManifest = safeOutputFile(process.cwd(), 'output/render-result.json');
  if (existsSync(existingManifest)) JSON.parse(readFileSync(existingManifest, 'utf8'));
  safeLocalPath(process.cwd(), 'output/alpha-validation');
  const staged = stagedRenderOutput(process.cwd(), output, inputRevision.files.map((file) => file.path));
  try {
    renderArgs[4] = staged.temporary;
    execFileSync(process.execPath, renderArgs, {
      stdio: "inherit",
      env: { ...process.env, REMOTION_SUBTITLES: subtitles ? "1" : "0" },
    });
    safeOutputFile(process.cwd(), relative(process.cwd(), staged.temporary));
    decodeValidation = validateDecodedMedia(staged.temporary);
    if (alpha) {
      const evidenceDir = safeLocalPath(process.cwd(), `output/alpha-validation/${renderResultName(output)}-${basename(dirname(staged.temporary))}`);
      alphaValidation = validateAlphaMedia(staged.temporary, { evidenceDir, sampleFrames:alphaSampleFrames });
      if (!alphaValidation.pass) throw new Error(`Decoded alpha validation failed: ${JSON.stringify(alphaValidation)}`);
    }
    const stale = revisionErrors(captureInputRevision(), inputRevision);
    if (stale.length) throw new Error(`Inputs changed during rendering; destination preserved: ${stale.join('; ')}`);
    const stagedProbe = probeMedia(staged.temporary);
    if (stagedProbe.ok !== true) throw new Error(`ffprobe failed; destination preserved: ${JSON.stringify(stagedProbe)}`);
    withOutputRollback(process.cwd(), metadataPaths, () => {
      staged.commit();
      writeRenderResult(port, stagedProbe);
    });
  } catch (error) {
    staged.rollback();
    throw error;
  } finally { staged.cleanup(); }
}

main().catch((error) => {
  console.error(error);
  try {
    safeOutputFile(process.cwd(), "feedback-events.jsonl");
    appendFeedbackEvent({
      eventType: "gate-result",
      phase: "render-video",
      target: "video-render",
      problem: String(error?.message ?? error),
      agentAction: `tsx scripts/render-video.ts --preset=${preset}${subtitles ? " --subtitles" : ""}`,
      validation: [{ command: "npm run render:video", status: "fail" }],
      userResolution: "pending",
    });
  } catch (loggingError) { console.error(`Failure log not written safely: ${String(loggingError)}`); }
  process.exit(1);
});
