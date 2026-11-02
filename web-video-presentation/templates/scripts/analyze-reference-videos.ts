import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const DEFAULT_OUT = resolve(ROOT, "output/reference-video-analysis");
const DEFAULT_SAMPLES = 12;

interface VideoAnalysis {
  id: string;
  source: string;
  width: number | null;
  height: number | null;
  durationSec: number;
  fps: number | null;
  frames: Array<{
    index: number;
    timeSec: number;
    path: string;
    sha256: string;
    bytes: number;
  }>;
  distinctFrameHashes: number;
}

function usage(): never {
  console.error(`Usage:
  tsx scripts/analyze-reference-videos.ts <video...> [--out=output/reference-video-analysis] [--samples=12]

Examples:
  npm run analyze:references -- "C:/path/reference-a.mp4" "C:/path/reference-b.mp4"
  npm run analyze:references -- --samples=16 "C:/path/reference.mp4"

This script samples real frames from reference videos and writes:
  output/reference-video-analysis/manifest.json
  output/reference-video-analysis/index.html

It intentionally extracts timestamp stills instead of using ffmpeg fps/tile filters,
because some Remotion-bundled ffmpeg builds are minimal.
`);
  process.exit(1);
}

function parseArgs() {
  let outDir = DEFAULT_OUT;
  let samples = DEFAULT_SAMPLES;
  const videos: string[] = [];
  for (const arg of process.argv.slice(2)) {
    if (arg === "-h" || arg === "--help") usage();
    if (arg.startsWith("--out=")) {
      outDir = resolve(ROOT, arg.slice("--out=".length));
    } else if (arg.startsWith("--samples=")) {
      samples = Number(arg.slice("--samples=".length));
    } else {
      videos.push(resolve(arg));
    }
  }
  if (!Number.isFinite(samples) || samples < 6 || samples > 48) {
    throw new Error("--samples must be an integer from 6 to 48");
  }
  if (videos.length === 0) usage();
  return { outDir, samples: Math.round(samples), videos };
}

function commandCandidates(base: "ffmpeg" | "ffprobe"): string[] {
  const env = [
    process.env[`${base.toUpperCase()}_PATH`],
    base === "ffprobe" ? process.env.FFMPEG_FFPROBE_PATH : "",
    base === "ffprobe" ? process.env.REMOTION_FFPROBE_PATH : process.env.REMOTION_FFMPEG_PATH,
  ].filter(Boolean) as string[];
  const packages = [
    "compositor-win32-x64-msvc",
    "compositor-linux-x64-gnu",
    "compositor-linux-x64-musl",
    "compositor-darwin-x64",
    "compositor-darwin-arm64",
  ];
  const exe = process.platform === "win32" ? `${base}.exe` : base;
  return [
    ...env,
    base,
    ...packages.map((pkg) => resolve(ROOT, `node_modules/@remotion/${pkg}/${exe}`)),
  ];
}

function findCommand(base: "ffmpeg" | "ffprobe"): string {
  for (const candidate of commandCandidates(base)) {
    if (candidate === base || existsSync(candidate)) {
      try {
        execFileSync(candidate, ["-version"], { stdio: "ignore" });
        return candidate;
      } catch {
        continue;
      }
    }
  }
  throw new Error(`${base} not found. Run npm install in the project, or set ${base.toUpperCase()}_PATH to a working binary.`);
}

function readVideoMeta(ffprobe: string, video: string) {
  const raw = execFileSync(ffprobe, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_streams",
    "-show_format",
    video,
  ], { encoding: "utf8" });
  const json = JSON.parse(raw);
  const stream = (json.streams ?? []).find((item: any) => item.codec_type === "video") ?? {};
  const durationSec = Number(json.format?.duration ?? stream.duration ?? 0);
  const fpsText = String(stream.avg_frame_rate ?? stream.r_frame_rate ?? "");
  const fpsParts = fpsText.split("/").map(Number);
  const fps = fpsParts.length === 2 && fpsParts[1] ? fpsParts[0] / fpsParts[1] : Number(fpsText);
  return {
    width: Number.isFinite(Number(stream.width)) ? Number(stream.width) : null,
    height: Number.isFinite(Number(stream.height)) ? Number(stream.height) : null,
    durationSec: Number.isFinite(durationSec) ? durationSec : 0,
    fps: Number.isFinite(fps) && fps > 0 ? Number(fps.toFixed(3)) : null,
  };
}

function slugFor(video: string, index: number): string {
  return `${String(index + 1).padStart(2, "0")}-${basename(video).replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-").slice(0, 70)}`;
}

function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

function rel(path: string): string {
  return relative(DEFAULT_OUT, path).replaceAll("\\", "/");
}

function htmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}

function analyzeVideo(ffmpeg: string, ffprobe: string, video: string, outDir: string, samples: number, index: number): VideoAnalysis {
  if (!existsSync(video)) throw new Error(`reference video not found: ${video}`);
  const meta = readVideoMeta(ffprobe, video);
  if (!meta.durationSec || meta.durationSec <= 0) throw new Error(`could not read duration for ${video}`);

  const id = slugFor(video, index);
  const frameDir = resolve(outDir, id, "frames");
  mkdirSync(frameDir, { recursive: true });

  const frames: VideoAnalysis["frames"] = [];
  for (let i = 0; i < samples; i++) {
    const timeSec = Math.max(0, Math.min(meta.durationSec - 0.05, (meta.durationSec * (i + 0.5)) / samples));
    const output = resolve(frameDir, `frame-${String(i + 1).padStart(3, "0")}.png`);
    execFileSync(ffmpeg, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      timeSec.toFixed(3),
      "-i",
      video,
      "-frames:v",
      "1",
      output,
    ], { stdio: "inherit" });
    frames.push({
      index: i + 1,
      timeSec: Number(timeSec.toFixed(3)),
      path: rel(output),
      sha256: hashFile(output),
      bytes: readFileSync(output).byteLength,
    });
  }

  return {
    id,
    source: video,
    ...meta,
    durationSec: Number(meta.durationSec.toFixed(3)),
    frames,
    distinctFrameHashes: new Set(frames.map((frame) => frame.sha256)).size,
  };
}

function writeHtml(outDir: string, videos: VideoAnalysis[]) {
  const sections = videos.map((video) => `
    <section>
      <h2>${htmlEscape(video.id)}</h2>
      <p>${video.width}x${video.height}, ${video.fps ?? "?"}fps, ${video.durationSec}s, distinct frames: ${video.distinctFrameHashes}/${video.frames.length}</p>
      <div class="grid">
        ${video.frames.map((frame) => `
          <figure>
            <img src="${htmlEscape(frame.path)}" />
            <figcaption>${frame.index} / ${frame.timeSec}s</figcaption>
          </figure>
        `).join("")}
      </div>
    </section>
  `).join("\n");
  writeFileSync(resolve(outDir, "index.html"), `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Reference Video Motion Analysis</title>
  <style>
    body { margin: 24px; font-family: Inter, Arial, sans-serif; background: #101114; color: #f4f4f2; }
    section { margin-bottom: 40px; }
    h1, h2 { font-weight: 700; letter-spacing: 0; }
    p { color: #b9babf; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    figure { margin: 0; padding: 8px; background: #1a1c21; border: 1px solid #30333b; }
    img { width: 100%; display: block; background: #000; }
    figcaption { margin-top: 6px; font-size: 12px; color: #c8c9ce; }
  </style>
</head>
<body>
  <h1>Reference Video Motion Analysis</h1>
  <p>Inspect these sampled frames as a time sequence. A reference-video style shot must map entry, progression, focus highlight, readable hold, and settle/exit into its own Remotion motion plan.</p>
  ${sections}
</body>
</html>
`, "utf8");
}

function main() {
  const { outDir, samples, videos } = parseArgs();
  mkdirSync(outDir, { recursive: true });
  const ffmpeg = findCommand("ffmpeg");
  const ffprobe = findCommand("ffprobe");
  const analyses = videos.map((video, index) => analyzeVideo(ffmpeg, ffprobe, video, outDir, samples, index));
  const manifest = {
    version: 1,
    strategy: "timestamp-reference-video-analysis",
    generatedAt: new Date().toISOString(),
    ffmpeg,
    ffprobe,
    samplesPerVideo: samples,
    requiredMotionMapping: ["entry", "progression", "focus-highlight", "readable-hold", "settle-or-exit"],
    videos: analyses,
  };
  writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  writeHtml(outDir, analyses);
  console.error(`v reference video analysis written to ${outDir}`);
}

try {
  main();
} catch (error: any) {
  console.error(`x ${error?.message ?? error}`);
  process.exit(1);
}
