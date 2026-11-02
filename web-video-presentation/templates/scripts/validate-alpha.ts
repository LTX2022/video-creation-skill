import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { basename, dirname, extname, relative, resolve } from "node:path";

export interface AlphaSample {
  frame: number;
  transparentPixels: number;
  visiblePixels: number;
  partialAlphaPixels: number;
  sampledPixels: number;
  transparentFraction: number;
  partialAlphaFraction: number;
  minAlpha: number;
  maxAlpha: number;
}
export interface AlphaValidationResult {
  schema: 1;
  generatedAt: string;
  pass: boolean;
  pixFmt: string;
  frameCount: number;
  sourceWidth: number;
  sourceHeight: number;
  sampleWidth: number;
  sampleHeight: number;
  samples: AlphaSample[];
  errors: string[];
  warnings: string[];
  edgeReview: {
    status: "pending-human-review" | "unavailable";
    previews: Array<{ frame: number; background: "black" | "white"; path: string }>;
    instruction: string;
  };
  limitations: string;
}
export interface AlphaValidationOptions {
  evidenceDir?: string;
  /** Decoded output frame indices, not original composition frame indices. */
  sampleFrames?: number[];
  ffmpegPath?: string;
  ffprobePath?: string;
}
const MAX_SAMPLE_SIDE = 256;
const TIMEOUT_MS = 120_000;
const MAX_SAMPLES = 32;
function parseRate(value: unknown): number {
  const [a, b = 1] = String(value ?? "").split("/").map(Number);
  return Number.isFinite(a) && Number.isFinite(b) && b > 0 ? a / b : 0;
}
function errorText(result: ReturnType<typeof spawnSync>): string {
  return String(result.error?.message ?? result.stderr ?? `process exit ${result.status}`).trim().slice(-4000);
}

/** Local-only bounded-memory alpha evidence, not whole-film edge certification. */
export function validateAlphaMedia(inputPath: string, options: AlphaValidationOptions = {}): AlphaValidationResult {
  const result: AlphaValidationResult = {
    schema: 1, generatedAt: new Date().toISOString(), pass: false, pixFmt: "",
    frameCount: 0, sourceWidth: 0, sourceHeight: 0, sampleWidth: 0, sampleHeight: 0,
    samples: [], errors: [], warnings: [],
    edgeReview: {
      status: "unavailable", previews: [],
      instruction: "Review original-size black and white composites for halos, dark/light fringes, clipped shadows, and unintended full-frame backgrounds. Record human approval separately; pass does not certify edge quality.",
    },
    limitations: "Temporal samples only; alpha is nearest-neighbor downsampled to a longest side of 256 pixels. Small details or defects between samples may be missed. Preview PNGs retain source dimensions. Transparency/visibility thresholds are alpha <= 1 and alpha > 1 on an 8-bit scale; partial alpha means 1 < alpha < 254.",
  };
  try {
    const source = resolve(inputPath);
    if (!existsSync(source) || !statSync(source).isFile()) throw new Error(`Local alpha file does not exist: ${inputPath}`);
    const ffmpeg = options.ffmpegPath ?? process.env.FFMPEG_PATH ?? "ffmpeg";
    const ffprobe = options.ffprobePath ?? process.env.FFPROBE_PATH ?? "ffprobe";
    const probe = spawnSync(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries",
      "stream=pix_fmt,width,height,nb_frames,avg_frame_rate,r_frame_rate,duration:format=duration", "-of", "json", "-protocol_whitelist", "file,pipe", source],
      { encoding: "utf8", timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 });
    if (probe.error || probe.status !== 0) throw new Error(`ffprobe failed: ${errorText(probe)}`);
    const metadata = JSON.parse(probe.stdout);
    const video = metadata.streams?.[0];
    if (!video) throw new Error("No video stream was found");
    result.pixFmt = String(video.pix_fmt ?? "").toLowerCase();
    result.sourceWidth = Number(video.width);
    result.sourceHeight = Number(video.height);
    if (!/^(yuva|gbrap|rgba|bgra|argb|abgr|ya\d)/.test(result.pixFmt)) throw new Error(`Decoded pixel format ${result.pixFmt || "unknown"} has no supported alpha channel`);
    if (![result.sourceWidth, result.sourceHeight].every((n) => Number.isInteger(n) && n > 0)) throw new Error("Invalid video dimensions");
    result.frameCount = Number(video.nb_frames);
    // Count actual decoded frames when metadata is absent: duration * FPS can
    // overshoot short smoke renders or VFR files and produce an empty tail sample.
    if (!Number.isInteger(result.frameCount) || result.frameCount < 1) {
      const count = spawnSync(ffprobe, ["-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=nb_read_frames", "-of", "default=nw=1:nk=1", "-protocol_whitelist", "file,pipe", source],
        { encoding: "utf8", timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 });
      if (count.error || count.status !== 0) throw new Error(`Could not count decoded frames: ${errorText(count)}`);
      result.frameCount = Number(count.stdout.trim());
    }
    if (!Number.isInteger(result.frameCount) || result.frameCount < 1) throw new Error("Could not establish a positive decoded frame count");
    const requested = options.sampleFrames ?? [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round((result.frameCount - 1) * fraction));
    if (!Array.isArray(requested) || requested.length < 1 || requested.length > MAX_SAMPLES || requested.some((n) => !Number.isInteger(n) || n < 0 || n >= result.frameCount)) throw new Error(`sampleFrames must contain 1-${MAX_SAMPLES} integer output frame indices in 0-${result.frameCount - 1}`);
    const frames = [...new Set(requested)].sort((a, b) => a - b);
    const ratio = Math.min(1, MAX_SAMPLE_SIDE / Math.max(result.sourceWidth, result.sourceHeight));
    result.sampleWidth = Math.max(1, Math.round(result.sourceWidth * ratio));
    result.sampleHeight = Math.max(1, Math.round(result.sourceHeight * ratio));
    const select = frames.map((frame) => `eq(n,${frame})`).join("+");
    const decode = spawnSync(ffmpeg, ["-v", "error", "-nostdin", "-threads", "1", "-protocol_whitelist", "file,pipe", "-i", source, "-an", "-vf",
      `select='${select}',alphaextract,scale=${result.sampleWidth}:${result.sampleHeight}:flags=neighbor,format=gray`,
      "-fps_mode", "passthrough", "-frames:v", String(frames.length), "-threads", "1", "-f", "rawvideo", "-pix_fmt", "gray", "pipe:1"],
      { timeout: TIMEOUT_MS, maxBuffer: MAX_SAMPLE_SIDE * MAX_SAMPLE_SIDE * MAX_SAMPLES + 1024 * 1024 });
    if (decode.error || decode.status !== 0) throw new Error(`Alpha decoding failed: ${errorText(decode)}`);
    const pixels = result.sampleWidth * result.sampleHeight;
    const data = decode.stdout;
    if (data.length !== pixels * frames.length) throw new Error(`Expected ${frames.length} decoded alpha samples, got ${data.length / pixels}`);
    for (let i = 0; i < frames.length; i++) {
      let transparent = 0, visible = 0, partial = 0, min = 255, max = 0;
      for (const value of data.subarray(i * pixels, (i + 1) * pixels)) {
        min = Math.min(min, value); max = Math.max(max, value);
        if (value <= 1) transparent++; else visible++;
        if (value > 1 && value < 254) partial++;
      }
      result.samples.push({ frame: frames[i]!, transparentPixels: transparent, visiblePixels: visible, partialAlphaPixels: partial,
        sampledPixels: pixels, transparentFraction: transparent / pixels, partialAlphaFraction: partial / pixels, minAlpha: min, maxAlpha: max });
    }
    const mixed = result.samples.filter((sample) => sample.transparentPixels > 0 && sample.visiblePixels > 0);
    if (mixed.length === 0) result.errors.push("No sampled frame contains BOTH transparent and visible pixels; this may be an empty export or an opaque video in an alpha-capable container");
    const opaque = result.samples.filter((sample) => sample.minAlpha >= 254);
    if (opaque.length) result.errors.push(`Fully opaque sampled frame(s): ${opaque.map((sample) => sample.frame).join(", ")}; inspect unintended scene/root backgrounds`);
    if (!result.samples.some((sample) => sample.partialAlphaPixels > 0)) result.warnings.push("No partial alpha was sampled. This is valid for hard-edged artwork, but anti-aliasing and shadows still require original-size review.");
    const evidenceDir = resolve(options.evidenceDir ?? resolve(dirname(source), "alpha-validation", basename(source, extname(source))));
    mkdirSync(evidenceDir, { recursive: true });
    const visibleSamples = result.samples.filter((sample) => sample.visiblePixels > 0);
    // Up to three original-resolution review frames: first, middle, last visible.
    const previewFrames = [...new Set([visibleSamples[0]?.frame, visibleSamples[Math.floor(visibleSamples.length / 2)]?.frame, visibleSamples.at(-1)?.frame])].filter((frame): frame is number => frame !== undefined);
    const fps = parseRate(video.avg_frame_rate) || parseRate(video.r_frame_rate) || 30;
    for (const frame of previewFrames) {
      for (const background of ["black", "white"] as const) {
        const output = resolve(evidenceDir, `frame-${String(frame).padStart(6, "0")}-${background}.png`);
        const preview = spawnSync(ffmpeg, ["-v", "error", "-nostdin", "-y", "-threads", "1", "-protocol_whitelist", "file,pipe", "-i", source, "-filter_complex_threads", "1", "-filter_complex",
          `[0:v]select='eq(n,${frame})',setpts=PTS-STARTPTS,format=rgba[fg];color=c=${background}:s=${result.sourceWidth}x${result.sourceHeight}:r=${fps}[bg];[bg][fg]overlay=shortest=1:format=auto:alpha=straight,format=rgb24[out]`,
          "-map", "[out]", "-frames:v", "1", "-threads", "1", output], { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 });
        if (preview.error || preview.status !== 0 || !existsSync(output) || statSync(output).size === 0) {
          result.errors.push(`Could not create ${background} edge preview for frame ${frame}: ${errorText(preview)}`); continue;
        }
        result.edgeReview.previews.push({ frame, background, path: relative(process.cwd(), output).replaceAll("\\", "/") });
      }
    }
    if (result.edgeReview.previews.length > 0) result.edgeReview.status = "pending-human-review";
    result.pass = result.errors.length === 0;
  } catch (error) { result.errors.push(String((error as Error)?.message ?? error)); }
  return result;
}
