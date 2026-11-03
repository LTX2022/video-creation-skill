import { assetRightsErrors, adaptationErrors, contractErrors, isDouyinProfile, outputMode } from "./delivery-contract";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

const ROOT = resolve(process.cwd());
const PATH = resolve(ROOT, "asset-manifest.json");
const SHOT_PATH = resolve(ROOT, "shot-manifest.json");

// v2.6.0: 读取项目 fps 用于视频素材帧率校验
function readProjectFps(): number | null {
  const vfPath = resolve(ROOT, "src/config/videoFormat.ts");
  if (!existsSync(vfPath)) return null;
  const src = readFileSync(vfPath, "utf8");
  const fps = Number(src.match(/fps:\s*(\d+(?:\.\d+)?)/)?.[1] ?? NaN);
  return Number.isFinite(fps) ? fps : null;
}

function readProjectDimensions(): { width: number | null; height: number | null } {
  const vfPath = resolve(ROOT, "src/config/videoFormat.ts");
  if (!existsSync(vfPath)) return { width: null, height: null };
  const src = readFileSync(vfPath, "utf8");
  const width = Number(src.match(/width:\s*(\d+)/)?.[1] ?? NaN);
  const height = Number(src.match(/height:\s*(\d+)/)?.[1] ?? NaN);
  return {
    width: Number.isFinite(width) ? width : null,
    height: Number.isFinite(height) ? height : null,
  };
}

function readProjectState(): any | null {
  const statePath = resolve(ROOT, "project-state.json");
  if (!existsSync(statePath)) return null;
  return readJson(statePath);
}

function isReferenceVideoAsset(asset: any): boolean {
  return asset.referenceVideo === true || /reference/i.test(String(asset.usage ?? ""));
}

if (!existsSync(PATH)) {
  console.error("x asset-manifest.json not found. Use {\"version\":1,\"assets\":[]} if no external assets are used.");
  process.exit(1);
}

const manifest = readJson(PATH);
const projectFps = readProjectFps();
const projectDimensions = readProjectDimensions();
const projectState = readProjectState();
let failed = 0;
const ids = new Set<string>();

for (const asset of manifest.assets ?? []) {
  const id = asset.id ?? asset.path ?? "?";
  if (ids.has(id)) {
    console.error(`x asset ${id}: duplicate asset id/path`);
    failed++;
  }
  ids.add(id);
  if (!asset.usage) {
    console.error(`x asset ${id}: missing usage`);
    failed++;
  }
  if (!asset.source && asset.placeholder !== true) {
    console.error(`x asset ${id}: missing source (or mark placeholder=true)`);
    failed++;
  }
  for (const error of assetRightsErrors(asset, projectState ?? {})) {
    console.error(`x asset ${id}: ${error}`); failed++;
  }
  // v2.6.0: 视频素材字段校验（与 preflight.ts 同步）
  if (asset.type === "video" && asset.placeholder !== true) {
    for (const key of ["fps", "durationSec", "width", "height"]) {
      if (asset[key] === undefined || asset[key] === null || !Number.isFinite(Number(asset[key])) || Number(asset[key]) <= 0) {
        console.error(`x asset ${id}: video assets must record ${key} (see references/VIDEO-ASSETS.md)`);
        failed++;
      }
    }
    for (const error of adaptationErrors(asset, { ...projectDimensions, fps: projectFps })) {
      console.error(`x asset ${id}: ${error}`); failed++;
    }
    if (asset.orientation && !["landscape", "portrait"].includes(String(asset.orientation))) {
      console.error(`x asset ${id}: video orientation must be "landscape" or "portrait"`);
      failed++;
    }
  }
}

for (const error of contractErrors(projectState ?? {})) { console.error(`x ${error}`); failed++; }
if (isDouyinProfile(projectState?.videoProfile) && projectDimensions.width && projectDimensions.height) {
  const { width, height } = projectDimensions;
  const legacy = width === 1440 && height === 3200;
  if (!legacy && width * 16 !== height * 9) {
    const notes = JSON.stringify(projectState.notes ?? []);
    if (!notes.includes('formatOverrideAccepted')) { console.error('x douyin profile expects 9:16, or an explicitly accepted format override'); failed++; }
  }
  if (legacy) console.error('! legacy 1440x3200 (9:20) retained; no automatic resize');
}

if (existsSync(SHOT_PATH)) {
  const shot = readJson(SHOT_PATH);
  for (const step of shot.steps ?? []) {
    for (const assetId of step.assets ?? []) {
      if (!ids.has(assetId)) {
        console.error(`x shot ${step.chapter ?? "?"}/${step.step ?? "?"}: asset "${assetId}" missing from asset-manifest.json`);
        failed++;
      }
    }
  }
}

if (failed > 0) process.exit(1);
console.error("v assets valid");
