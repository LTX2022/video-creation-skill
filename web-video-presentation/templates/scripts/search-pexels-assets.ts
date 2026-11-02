import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

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
  npm run assets:pexels -- --query="office team" --type=photos --orientation=landscape
  npm run assets:pexels -- --query="AI robot" --type=videos --orientation=portrait --per-page=12

Required env:
  PEXELS_API_KEY or PEXELS_API_TOKEN

Notes:
  - This script writes metadata candidates to asset-candidates/.
  - It does not download files or mutate asset-manifest.json.
  - After choosing an asset, record source/license/usage in asset-manifest.json.`);
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  help();
  process.exit(0);
}

const key = process.env.PEXELS_API_KEY || process.env.PEXELS_API_TOKEN || "";
if (!key) {
  console.error("x missing PEXELS_API_KEY or PEXELS_API_TOKEN. Ask the user for a Pexels API key and set it only in the current environment.");
  process.exit(1);
}

const query = arg("query");
if (!query.trim()) {
  console.error("x missing --query");
  process.exit(1);
}

const type = arg("type", "photos");
if (!["photos", "videos"].includes(type)) {
  console.error("x --type must be photos or videos");
  process.exit(1);
}

const orientation = arg("orientation", "landscape");
const perPage = Number(arg("per-page", "10"));
if (!Number.isInteger(perPage) || perPage < 1 || perPage > 40) {
  console.error("x --per-page must be 1..40");
  process.exit(1);
}

function endpoint() {
  const params = new URLSearchParams({
    query,
    orientation,
    per_page: String(perPage),
  });
  return type === "photos"
    ? `https://api.pexels.com/v1/search?${params.toString()}`
    : `https://api.pexels.com/videos/search?${params.toString()}`;
}

function normalize(data: any) {
  if (type === "photos") {
    return (data.photos ?? []).map((item: any) => ({
      id: `pexels-photo-${item.id}`,
      type: "photo",
      title: item.alt || query,
      source: item.url,
      author: item.photographer,
      authorUrl: item.photographer_url,
      width: item.width,
      height: item.height,
      preview: item.src?.large2x ?? item.src?.large ?? item.src?.original,
      downloadCandidate: item.src?.original,
      licenseNote: "Pexels License. Verify current license and commercial suitability before final delivery.",
    }));
  }
  return (data.videos ?? []).map((item: any) => {
    const files = [...(item.video_files ?? [])].sort((a: any, b: any) => (b.width ?? 0) - (a.width ?? 0));
    const best = files[0];
    return {
      id: `pexels-video-${item.id}`,
      type: "video",
      title: query,
      source: item.url,
      author: item.user?.name ?? "",
      authorUrl: item.user?.url ?? "",
      width: item.width,
      height: item.height,
      duration: item.duration,
      preview: item.image,
      downloadCandidate: best?.link ?? "",
      licenseNote: "Pexels License. Verify current license and commercial suitability before final delivery.",
    };
  });
}

async function main() {
  const response = await fetch(endpoint(), {
    headers: { Authorization: key },
  });
  if (!response.ok) {
    console.error(`x Pexels API failed: ${response.status} ${response.statusText}`);
    process.exit(1);
  }
  const data = await response.json();
  const candidates = normalize(data);
  mkdirSync(OUT_DIR, { recursive: true });
  const slug = query.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-").replace(/^-|-$/g, "").slice(0, 48) || "query";
  const out = resolve(OUT_DIR, `pexels-${type}-${slug}.json`);
  writeFileSync(
    out,
    JSON.stringify(
      {
        schema: 1,
        provider: "pexels",
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
