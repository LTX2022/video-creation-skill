import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ─────────────────────────────────────────────────────────────
// search-pixabay-assets.ts —— Pixabay 图片 / 视频候选检索。
//
// 与 search-pexels-assets.ts 对齐：只输出候选元数据到
// asset-candidates/，不下载文件、不写密钥、不自动改 asset-manifest.json。
// API key 只从环境变量 PIXABAY_API_KEY 读取。
// v2.2.16 新增：作为 Pexels 之外的素材来源，支持图片和视频。
// ─────────────────────────────────────────────────────────────

const ROOT = resolve(process.cwd());
const OUT_DIR = resolve(ROOT, "asset-candidates");

function arg(name: string, fallback = ""): string {
  const prefix = `--${name}=`;
  const direct = process.argv.find((item) => item.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1]!.startsWith("--")) {
    return process.argv[index + 1]!;
  }
  return fallback;
}

function help() {
  console.log(`Usage:
  npm run assets:pixabay -- --query="office team" --type=images --orientation=horizontal
  npm run assets:pixabay -- --query="AI robot" --type=videos --orientation=vertical --per-page=12

Required env:
  PIXABAY_API_KEY

Notes:
  - This script writes metadata candidates to asset-candidates/.
  - It does not download files or mutate asset-manifest.json.
  - After choosing an asset, record source/license/usage in asset-manifest.json.
  - Pixabay orientation: horizontal | vertical (maps to landscape/portrait).`);
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  help();
  process.exit(0);
}

const key = process.env.PIXABAY_API_KEY || "";
if (!key) {
  console.error("x missing PIXABAY_API_KEY. Ask the user for a Pixabay API key and set it only in the current environment.");
  console.error("  Get one at: https://pixabay.com/api/docs/");
  process.exit(1);
}

const query = arg("query");
if (!query.trim()) {
  console.error("x missing --query");
  process.exit(1);
}

const type = arg("type", "images");
if (!["images", "videos"].includes(type)) {
  console.error("x --type must be images or videos");
  process.exit(1);
}

// Pixabay 用 horizontal/vertical；接受 landscape/portrait 别名
const orientationRaw = arg("orientation", "horizontal");
const orientation = orientationRaw === "landscape" ? "horizontal" : orientationRaw === "portrait" ? "vertical" : orientationRaw;
if (!["horizontal", "vertical", "all"].includes(orientation)) {
  console.error("x --orientation must be horizontal, vertical, or all");
  process.exit(1);
}

const perPage = Number(arg("per-page", "10"));
if (!Number.isInteger(perPage) || perPage < 1 || perPage > 50) {
  console.error("x --per-page must be 1..50 (Pixabay max 50/page for free tier, 200 for videos)");
  process.exit(1);
}

function endpoint(): string {
  const params = new URLSearchParams({
    key,
    q: query,
    per_page: String(perPage),
    safesearch: "true",
  });
  if (orientation !== "all") params.set("orientation", orientation);
  return type === "images"
    ? `https://pixabay.com/api/?${params.toString()}`
    : `https://pixabay.com/api/videos/?${params.toString()}`;
}

function normalize(data: any) {
  if (type === "images") {
    return (data.hits ?? []).map((item: any) => ({
      id: `pixabay-image-${item.id}`,
      type: "image",
      title: item.tags || query,
      source: item.pageURL,
      author: item.user,
      authorUrl: `https://pixabay.com/users/${item.user}-${item.user_id}/`,
      width: item.imageWidth,
      height: item.imageHeight,
      preview: item.largeImageURL ?? item.webformatURL,
      downloadCandidate: item.fullHDURL ?? item.largeImageURL,
      licenseNote: "Pixabay Content License. Verify current license and commercial suitability before final delivery. See https://pixabay.com/service/license-summary/",
    }));
  }
  return (data.hits ?? []).map((item: any) => {
    const videos = item.videos ?? {};
    // 选最高分辨率可用版本
    const variants = ["large", "medium", "small", "tiny"]
      .map((k) => ({ k, v: videos[k] }))
      .filter((x) => x.v && x.v.url);
    const best = variants[0]?.v;
    return {
      id: `pixabay-video-${item.id}`,
      type: "video",
      title: item.tags || query,
      source: item.pageURL,
      author: item.user,
      authorUrl: `https://pixabay.com/users/${item.user}-${item.user_id}/`,
      width: best?.width ?? 0,
      height: best?.height ?? 0,
      duration: item.duration,
      preview: item.userImageURL ?? "",
      downloadCandidate: best?.url ?? "",
      licenseNote: "Pixabay Content License. Verify current license and commercial suitability before final delivery. See https://pixabay.com/service/license-summary/",
    };
  });
}

async function main() {
  const response = await fetch(endpoint());
  if (!response.ok) {
    console.error(`x Pixabay API failed: ${response.status} ${response.statusText}`);
    process.exit(1);
  }
  const data = await response.json();
  const candidates = normalize(data);
  mkdirSync(OUT_DIR, { recursive: true });
  const slug = query.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-").replace(/^-|-$/g, "").slice(0, 48) || "query";
  const out = resolve(OUT_DIR, `pixabay-${type}-${slug}.json`);
  writeFileSync(
    out,
    JSON.stringify(
      {
        schema: 1,
        provider: "pixabay",
        query,
        type,
        orientation,
        generatedAt: new Date().toISOString(),
        candidates,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.error(`v wrote ${out} (${candidates.length} candidates)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
