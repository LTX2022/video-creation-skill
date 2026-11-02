import { captureInputRevision, revisionErrors, hashLocalFile } from "./input-revision";
import { requiredDecisionChecks } from "./workflow-evidence";
import { layoutQualityIssues } from "./screen-quality";
import ts from "typescript";
import { adaptationErrors, contractErrors, isDouyinProfile, outputMode, overlaySafetyErrors, localPath } from "./delivery-contract";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { appendFeedbackEvent } from "./feedback-event";

const ROOT = resolve(process.cwd());
let failed = 0;

function readText(path: string): string {
  return readFileSync(path, "utf8").replace(/^\uFEFF/, "");
}

function readJson(path: string): any {
  return JSON.parse(readText(path));
}

function fail(message: string) {
  console.error(message);
  failed++;
}

function finish() {
  const status = failed > 0 ? "fail" : "pass";
  appendFeedbackEvent({
    eventType: "gate-result",
    phase: "preflight",
    target: "enterprise-quality-gate",
    problem: failed > 0 ? `${failed} preflight issue(s)` : "",
    agentAction: "npm run preflight",
    validation: [{ command: "npm run preflight", status }],
    userResolution: "pending",
    notes: status === "pass" ? "Preflight passed. This is system evidence, not user acceptance." : "Preflight failed and blocked delivery.",
  });
  if (failed > 0) process.exit(1);
  console.error("v preflight passed");
}

function requireFile(path: string, label: string) {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) {
    fail(`x missing ${label}: ${path}`);
  }
}

requireFile("src/registry/chapters.ts", "chapter registry");
requireFile("src/components/Subtitle.tsx", "subtitle component");
requireFile("src/video/RemotionRoot.tsx", "Remotion root");
requireFile("src/video/index.ts", "Remotion registerRoot entry");
requireFile("src/video/motion.ts", "frame-based motion helpers");
requireFile("src/video/reference-style-scenes.tsx", "reference video style scene presets");
requireFile("project-state.json", "workflow project state");
requireFile("feedback-events.jsonl", "feedback evidence log");

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const output: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      output.push(...walkFiles(full));
    } else {
      output.push(full);
    }
  }
  return output;
}

function relativePath(file: string): string {
  return relative(ROOT, file).replaceAll("\\", "/");
}

function readVideoFormat(): { id: string; width: number | null; height: number | null; fps: number | null } | null {
  const path = resolve(ROOT, "src/config/videoFormat.ts");
  if (!existsSync(path)) return null;
  const src = readText(path);
  const id = src.match(/id:\s*["']([^"']+)["']/)?.[1];
  const width = Number(src.match(/width:\s*(\d+)/)?.[1] ?? NaN);
  const height = Number(src.match(/height:\s*(\d+)/)?.[1] ?? NaN);
  const fps = Number(src.match(/fps:\s*(\d+(?:\.\d+)?)/)?.[1] ?? NaN);
  if (!id) return null;
  return {
    id,
    width: Number.isFinite(width) ? width : null,
    height: Number.isFinite(height) ? height : null,
    fps: Number.isFinite(fps) ? fps : null,
  };
}

for (const file of walkFiles(resolve(ROOT, "src/chapters"))) {
  if (!/\.(css|tsx?|jsx?)$/.test(file)) continue;
  const content = readText(file);
  const rel = relativePath(file);
  const forbiddenPatterns: Array<[RegExp, string]> = [
    [/@keyframes\b/, "CSS @keyframes are forbidden for Remotion-bound chapter motion"],
    [/\banimation(?:-[a-z]+)?\s*:\s*(?!none\b)/, "CSS animation is forbidden; use src/video/motion.ts frame helpers"],
    [/\btransition(?:Duration|Delay|Property|TimingFunction)\b/, "inline transition props are forbidden"],
    [/className\s*=\s*["'`][^"'`]*\banimate-/, "Tailwind animate-* classes are forbidden"],
  ];
  for (const [pattern, message] of forbiddenPatterns) {
    if (pattern.test(content)) {
      fail(`x ${rel}: ${message}`);
    }
  }
  for (const match of content.matchAll(/\btransition(?:-[a-z]+)?\s*:\s*([^;]+);/g)) {
    const value = match[1]!.trim().toLowerCase();
    if (value !== "none" && value !== "none !important") {
      fail(`x ${rel}: CSS transition "${match[1]!.trim()}" is forbidden; use src/video/motion.ts frame helpers`);
    }
  }
}

for (const file of [
  ...walkFiles(resolve(ROOT, "src")),
  resolve(ROOT, "src/styles/tokens.css"),
]) {
  if (!existsSync(file) || !/\.(css|tsx?|jsx?)$/.test(file)) continue;
  const content = readText(file);
  const rel = relativePath(file);
  const renderRiskPatterns: Array<[RegExp, string]> = [
    [/\bbackdrop-filter\s*:/, "backdrop-filter can render differently between Studio and headless/encoded output; use solid or translucent surfaces instead"],
    [/-webkit-backdrop-filter\s*:/, "-webkit-backdrop-filter can render differently between Studio and headless/encoded output; use solid or translucent surfaces instead"],
    [/\bmask-image\s*:/, "mask-image is renderer-sensitive; use SVG masks/clipPath or frame-driven opacity geometry instead"],
    [/-webkit-mask-image\s*:/, "-webkit-mask-image is renderer-sensitive; use SVG masks/clipPath or frame-driven opacity geometry instead"],
  ];
  for (const [pattern, message] of renderRiskPatterns) {
    if (pattern.test(content)) {
      fail(`x ${rel}: render compatibility risk: ${message}`);
    }
  }

  for (const match of content.matchAll(/\bmix-blend-mode\s*:\s*([^;]+);/g)) {
    const value = match[1]!.trim();
    if (value !== "normal" && value !== "var(--surface-pattern-blend, normal)") {
      fail(`x ${rel}: mix-blend-mode "${value}" can render differently; use normal blend and explicit colors`);
    }
  }

  for (const match of content.matchAll(/--surface-pattern-blend\s*:\s*([^;]+);/g)) {
    const value = match[1]!.trim();
    if (value !== "normal") {
      fail(`x ${rel}: --surface-pattern-blend must be normal for render-preview consistency, got "${value}"`);
    }
  }

  if (/(rotateX|rotateY|translateZ)\s*\(/.test(content) && !/\bperspective\s*:|\bperspective\s*\(/.test(content)) {
    fail(`x ${rel}: 3D transforms require an explicit perspective in the same component/style file`);
  }

  for (const block of content.matchAll(/([^{]+::(?:before|after)[^{]*)\{([^}]+)\}/g)) {
    const selector = block[1]!.trim();
    const body = block[2]!;
    const zIndex = Number(body.match(/\bz-index\s*:\s*(-?\d+)/)?.[1] ?? NaN);
    if (
      Number.isFinite(zIndex) &&
      zIndex >= 2 &&
      /\bposition\s*:\s*(absolute|fixed)/.test(body) &&
      /\binset\s*:\s*0\b/.test(body)
    ) {
      fail(`x ${rel}: ${selector} is a full-frame pseudo-element with z-index ${zIndex}; this can cover content in final render`);
    }
  }

  if (/\.(tsx?|jsx?)$/.test(file)) {
    if (/import\.meta\.env\.BASE_URL/.test(content)) {
      fail(`x ${rel}: import.meta.env.BASE_URL is a Vite preview path and can break Remotion render. Use staticFile() for public assets.`);
    }
    if (/(src|href)\s*=\s*["']\/(assets|audio|images|video|videos)\//.test(content)) {
      fail(`x ${rel}: raw public asset path detected. Use staticFile("...") for Remotion-bound assets.`);
    }
    if (/["']\/(assets|audio|images|video|videos)\//.test(content) && !/staticFile\s*\(/.test(content)) {
      fail(`x ${rel}: public asset literals require remotion staticFile().`);
    }
    // Parse real JSX nodes: comments and strings mentioning <video> are not elements.
    const ast = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, /\.[jt]sx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node: ts.Node) => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName) && node.tagName.text === 'video') {
        fail(`x ${rel}: native <video> element is forbidden for frame-accurate playback in Remotion. Use <OffthreadVideo> from remotion instead.`);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
}

const videoFormat = readVideoFormat();
if (!videoFormat) {
  fail("x src/config/videoFormat.ts is missing or does not contain a literal VIDEO_FORMAT.id");
}

if (videoFormat?.width && videoFormat?.height) {
  for (const file of walkFiles(resolve(ROOT, "src/chapters"))) {
    if (!/\.(tsx|jsx)$/.test(file)) continue;
    const content = readText(file);
    const rel = relativePath(file);
    for (const match of content.matchAll(/viewBox\s*=\s*["']\s*0\s+0\s+(\d+)\s+(\d+)\s*["']/g)) {
      const w = Number(match[1]);
      const h = Number(match[2]);
      if (w >= 1000 && h >= 1000) {
        if (w !== videoFormat.width || h !== videoFormat.height) {
          console.warn(`! heuristic review: ${rel}: stage SVG viewBox 0 0 ${w} ${h} != videoFormat ${videoFormat.width}x${videoFormat.height}`);
        }
      }
    }
  }
}

const statePath = resolve(ROOT, "project-state.json");
const workflowState = existsSync(statePath) ? readJson(statePath) : null;
const audioExpected =
  workflowState?.audioRequested === true;

function isAudioMissingWarning(warning: string): boolean {
  return /audio missing|ffprobe unavailable/i.test(warning);
}

function validateChapterRegistry() {
  const registryPath = resolve(ROOT, "src/registry/chapters.ts");
  const chaptersDir = resolve(ROOT, "src/chapters");
  if (!existsSync(registryPath) || !existsSync(chaptersDir)) return;
  const registry = readText(registryPath);
  const registeredFolders = new Set(
    [...registry.matchAll(/from\s+["']\.\.\/chapters\/([^"'\/]+)\/narrations["']/g)].map((m) => m[1]!),
  );
  const realFolders = readdirSync(chaptersDir).filter((name) => {
    const full = resolve(chaptersDir, name);
    return statSync(full).isDirectory() && name !== "01-example";
  });
  for (const folder of realFolders) {
    if (!registeredFolders.has(folder)) {
      fail(`x chapter folder ${folder} is not registered in src/registry/chapters.ts`);
    }
  }
  for (const folder of registeredFolders) {
    if (!existsSync(resolve(chaptersDir, folder, "narrations.ts"))) {
      fail(`x registry imports ${folder}/narrations.ts but the file does not exist`);
    }
  }
}

validateChapterRegistry();

function parseChapterRegistry(): Array<{ id: string; folder: string }> {
  const registryPath = resolve(ROOT, "src/registry/chapters.ts");
  if (!existsSync(registryPath)) return [];
  const registry = readText(registryPath);
  const ids = [...registry.matchAll(/id:\s*["']([^"']+)["']/g)].map((m) => m[1]!);
  const folders = [...registry.matchAll(/from\s+["']\.\.\/chapters\/([^"'\/]+)\/narrations["']/g)].map((m) => m[1]!);
  const chapters: Array<{ id: string; folder: string }> = [];
  for (let i = 0; i < Math.min(ids.length, folders.length); i++) {
    chapters.push({ id: ids[i]!, folder: folders[i]! });
  }
  return chapters.filter((chapter) => chapter.id !== "example");
}

function parseRegisteredChapterIds(): string[] {
  return parseChapterRegistry().map((chapter) => chapter.id);
}

function countOutlineChapters(): number | null {
  for (const path of [resolve(ROOT, "outline.md")]) {
    if (!existsSync(path)) continue;
    const matches = readText(path).match(/^##\s+(?:\d+\.|第)/gm);
    return matches?.length ?? 0;
  }
  return null;
}

function validateChapterAcceptance(state: any) {
  for(const check of requiredDecisionChecks(ROOT,{state,includeGolden:false,revision:captureInputRevision(ROOT)})) {
    if(check.status!=='accepted')fail(`x workflow gate: ${check.gate} / ${check.scope}: ${check.detail}`);
  }
}

function validateChapterDrift(state: any) {
  const registryChapters = parseChapterRegistry();
  const registryCount = registryChapters.length;
  const outlineCount = countOutlineChapters();
  if (outlineCount !== null && registryCount > 0) {
    if (outlineCount > registryCount) {
      fail(`x chapter drift: outline lists ${outlineCount} chapters but registry has ${registryCount}; missing chapter implementation or re-run Shot Design Review (lesson 28)`);
    }
    if (outlineCount < registryCount) {
      fail(`x chapter drift: registry has ${registryCount} chapters but outline lists ${outlineCount}; update outline.md and re-run Shot Design Review (lesson 28)`);
    }
  }
  if (state.fullShotDesignConfirmed === true && existsSync(resolve(ROOT, "shot-manifest.json"))) {
    const shot = readJson(resolve(ROOT, "shot-manifest.json"));
    const registryIds = new Set(registryChapters.map((chapter) => chapter.id));
    const shotChapterIds = new Set<string>(
      (shot.steps ?? [])
        .map((step: any) => String(step.chapter ?? ""))
        .filter((chapterId: string) => chapterId.length > 0),
    );
    for (const chapterId of registryIds) {
      if (!shotChapterIds.has(chapterId)) {
        fail(`x chapter drift: registry chapter '${chapterId}' missing from shot-manifest.json; re-run Shot Design Review (lesson 28)`);
      }
    }
    for (const chapterId of shotChapterIds) {
      if (!registryIds.has(chapterId)) {
        fail(`x chapter drift: shot-manifest chapter '${chapterId}' missing from registry; update outline.md and re-run Shot Design Review (lesson 28)`);
      }
    }
  }
}

const LOW_RGBA_PATTERN = /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\.(?:0?\d|1[0-9]|2[0-4])\s*\)/g;

function validateOverlayChapterQuality(state: any) {
  const overlayIds = Array.isArray(state.overlayChapterIds) ? state.overlayChapterIds : [];
  if (overlayIds.length === 0) return;
  const registry = parseChapterRegistry();
  for (const overlayId of overlayIds) {
    const chapter = registry.find((item) => item.id === overlayId);
    if (!chapter) {
      fail(`x overlayChapterIds includes unknown chapter '${overlayId}'`);
      continue;
    }
    const chapterDir = resolve(ROOT, "src/chapters", chapter.folder);
    for (const file of walkFiles(chapterDir)) {
      if (!/\.(tsx|css)$/.test(file)) continue;
      const rel = relativePath(file);
      const content = readText(file);
      if (LOW_RGBA_PATTERN.test(content)) {
        console.warn(`! heuristic review: ${rel}: overlay rgba opacity must be >=0.25 (lesson 19). Alpha export suggests >=0.3.`);
      }
      LOW_RGBA_PATTERN.lastIndex = 0;
      if (/\.stage-alpha\b/.test(content)) {
        fail(`x ${rel}: .stage-alpha is banned for overlay chapters (lesson 17). Use TransparentFix instead.`);
      }
      const hasLargeText = /fontSize\s*[:=]\s*(?:\{|["'])?\s*(\d{2,})/.test(content) ||
        /font-size\s*:\s*(\d{2,})px/.test(content);
      const largeMatch = content.match(/fontSize\s*[:=]\s*(?:\{|["'])?\s*(\d{2,})/) ??
        content.match(/font-size\s*:\s*(\d{2,})px/);
      const largeSize = largeMatch ? Number(largeMatch[1]) : 0;
      if (largeSize >= 48) {
        const hasStroke = /-webkit-text-stroke|WebkitTextStroke|paintOrder|paint-order/.test(content);
        if (!hasStroke) {
          console.warn(`! heuristic review: ${rel}: overlay text >=48px must include text-stroke for readability on video backgrounds (lesson 18)`);
        }
      } else if (hasLargeText && !/-webkit-text-stroke|WebkitTextStroke|paintOrder|paint-order/.test(content)) {
        // covered above when largeSize >= 48
      }
    }
  }
}

function validateRemotionHookUsage() {
  const hookPattern = /useCurrentFrame\s*\(|useVideoConfig\s*\(/;
  const mapPattern = /\.(map|forEach)\s*\(/;
  for (const dir of [resolve(ROOT, "src/chapters"), resolve(ROOT, "src/video")]) {
    for (const file of walkFiles(dir)) {
      if (!/\.tsx$/.test(file)) continue;
      const rel = relativePath(file);
      if (rel === "src/video/RemotionRoot.tsx") continue;
      const lines = readText(file).split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!mapPattern.test(lines[i]!)) continue;
        const window = lines.slice(i, i + 30).join("\n");
        if (hookPattern.test(window)) {
          console.warn(`! heuristic review: ${rel}:${i + 1}: Remotion Hook inside .map()/.forEach() (lesson 35). Extract a child component like AlphaStep in RemotionRoot.tsx.`);
          break;
        }
      }
    }
  }
}

function isReferenceVideoAsset(asset: any): boolean {
  return asset.referenceVideo === true || /reference/i.test(String(asset.usage ?? ""));
}

function hasStages(item: any, minCount: number, requiredWords: string[]): boolean {
  const stages = Array.isArray(item.visualStages) ? item.visualStages.map((stage: any) => String(stage).toLowerCase()) : [];
  if (stages.length < minCount) return false;
  const joined = `${String(item.motionIntent ?? "").toLowerCase()} ${stages.join(" ")}`;
  return requiredWords.some((word) => joined.includes(word));
}

type Box = { id?: string; x?: number; y?: number; width?: number; height?: number; allowSubtitleOverlap?: boolean; allowPlatformOverlap?: boolean };

function validBox(box: any): box is Required<Pick<Box, "x" | "y" | "width" | "height">> & Box {
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

function boxLabel(box: Box, fallback: string): string {
  return String(box.id ?? fallback);
}

function validateSubtitleSafety(item: any, formatId: string | null) {
  const key = `${item.chapter ?? "?"}/${item.step ?? "?"}`;
  const safety = item.subtitleSafety;
  if (!safety || safety.required !== true) {
    fail(`x shot ${key}: subtitleSafety is required; record subtitle/platform safe areas and visual/text boxes after golden-frame review`);
    return;
  }
  if (safety.coordinateSystem !== "normalized") {
    fail(`x shot ${key}: subtitleSafety.coordinateSystem must be "normalized"`);
  }
  if (safety.checked !== true) {
    fail(`x shot ${key}: subtitleSafety.checked must be true after verifying golden frames against subtitles/platform UI`);
  }
  const subtitleBand = safety.subtitleBand;
  if (!validBox(subtitleBand)) {
    fail(`x shot ${key}: subtitleSafety.subtitleBand must be a normalized box inside the frame`);
    return;
  }
  // v2.5.0: 字幕 75% 红线——竖屏/抖音字幕底部不得低于画面 75% 高度处。
  if (formatId === "portrait") {
    const subtitleBottom = Number(subtitleBand.y) + Number(subtitleBand.height);
    if (subtitleBottom > 0.75) {
      fail(`x shot ${key}: subtitleSafety.subtitleBand bottom (y+height=${subtitleBottom.toFixed(3)}) exceeds the 0.75 subtitle redline; subtitles must stay within the top 75% of the frame (default y=0.60, height=0.13)`);
    }
  }
  const platformBand = safety.platformUiBand;
  if (formatId === "portrait") {
    if (!validBox(platformBand)) {
      fail(`x shot ${key}: portrait/douyin subtitleSafety.platformUiBand must be a normalized bottom UI box`);
    } else if (Number(platformBand.y) < 0.74) {
      fail(`x shot ${key}: portrait platformUiBand should cover the bottom UI area; y must be >= 0.74`);
    }
  }
  const textBoxes = Array.isArray(safety.textBoxes) ? safety.textBoxes : [];
  const visualBoxes = Array.isArray(safety.criticalVisualBoxes) ? safety.criticalVisualBoxes : [];
  for (const [groupName, boxes] of [["textBoxes", textBoxes], ["criticalVisualBoxes", visualBoxes]] as const) {
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const label = boxLabel(box, `${groupName}[${i}]`);
      if (!validBox(box)) {
        fail(`x shot ${key}: subtitleSafety.${label} must be a normalized box inside the frame`);
        continue;
      }
      if (boxesIntersect(box, subtitleBand) && box.allowSubtitleOverlap !== true) {
        fail(`x shot ${key}: subtitleSafety.${label} intersects subtitleBand; move it or record an explicit opening/ending exception`);
      }
      if (validBox(platformBand) && boxesIntersect(box, platformBand) && box.allowPlatformOverlap !== true) {
        fail(`x shot ${key}: subtitleSafety.${label} intersects platformUiBand; move it above the bottom safe area`);
      }
    }
  }
}

const referenceRecipes = new Set(["kinetic-prompt-to-product", "annotated-flow-diagram"]);
const referenceMotionStyles = new Set(["prompt-product-kinetic", "whiteboard-engineering-flow"]);

function isReferenceStyleShot(item: any): boolean {
  return (
    referenceRecipes.has(String(item?.visualRecipe ?? "")) ||
    referenceMotionStyles.has(String(item?.motionStyle ?? "")) ||
    Boolean(item?.referenceVideo || item?.referenceVideoStyle)
  );
}

function sourceMentionsReferencePreset(): boolean {
  const files = walkFiles(resolve(ROOT, "src/chapters"));
  return files.some((file) => {
    if (!/\.(tsx?|jsx?)$/.test(file)) return false;
    const content = readText(file);
    return /reference-style-scenes|KineticPromptToProductScene|AnnotatedFlowDiagramScene/.test(content);
  });
}

function validateReferenceMotionStrips(referenceSteps: any[]) {
  if (referenceSteps.length === 0) return;
  const manifestPath = resolve(ROOT, "output/motion-strips/manifest.json");
  if (!existsSync(manifestPath)) {
    fail("x reference-video style shots require sparse diagnostic samples (not continuity proof). Run: npm run render:motion-strips");
    return;
  }
  const manifest = readJson(manifestPath);
  if (!["sparse-step-motion-strips","continuous-step-motion-strips"].includes(manifest.strategy) || !Array.isArray(manifest.steps)) {
    fail("x output/motion-strips/manifest.json is invalid. Regenerate with: npm run render:motion-strips");
    return;
  }
  for(const error of revisionErrors(captureInputRevision(ROOT),manifest))fail(`x motion-strip freshness: ${error}`);
  const rendered = new Map<string, any>();
  for (const step of manifest.steps) {
    rendered.set(`${step.chapter}/${step.step}`, step);
  }
  for (const shot of referenceSteps) {
    const key = `${shot.chapter}/${shot.step}`;
    const evidence = rendered.get(key);
    if (!evidence) {
      fail(`x reference-video style shot ${key} missing from output/motion-strips/manifest.json. Re-run: npm run render:motion-strips -- --only-reference`);
      continue;
    }
    const frames = Array.isArray(evidence.frames) ? evidence.frames : [];
    if (frames.length < 3) {
      fail(`x reference-video style shot ${key} needs at least 3 motion-strip frames; got ${frames.length}`);
    }
    // Different image hashes do not establish continuity. Deliberate holds may repeat pixels.
    const frameNumbers = frames.map((frame: any) => Number(frame.frame)).filter((frame: number) => Number.isFinite(frame));
    if (new Set(frameNumbers).size < 3) {
      fail(`x reference-video style shot ${key} motion-strip samples must cover three distinct frame times (not continuity proof)`);
    }
    for (const frame of frames) {
      if (!frame.path || !existsSync(resolve(ROOT, "output/motion-strips", String(frame.path)))) {
        fail(`x reference-video style shot ${key} motion-strip frame is missing on disk: ${frame.path ?? "(no path)"}`);
      }
      try {
        if(hashLocalFile(ROOT,`output/motion-strips/${frame.path}`)!==frame.sha256)fail(`x reference-video style shot ${key} sparse frame hash differs: ${frame.path}`);
      } catch(error) {fail(`x reference-video style shot ${key}: ${String((error as Error).message)}`);}
    }
  }
}

function validateReferenceVideoAnalysis(referenceSteps: any[]) {
  const requiresAnalysis = referenceSteps.some((step: any) => Boolean(step.referenceVideo || step.referenceVideoStyle));
  if (!requiresAnalysis) return;
  const manifestPath = resolve(ROOT, "output/reference-video-analysis/manifest.json");
  if (!existsSync(manifestPath)) {
    fail("x referenceVideo/referenceVideoStyle requires timestamped reference samples (not continuity proof). Run: npm run analyze:references -- <reference-video...>");
    return;
  }
  const manifest = readJson(manifestPath);
  if (manifest.strategy !== "timestamp-reference-video-analysis" || !Array.isArray(manifest.videos)) {
    fail("x output/reference-video-analysis/manifest.json is invalid. Regenerate with: npm run analyze:references -- <reference-video...>");
    return;
  }
  if (manifest.videos.length < 1) {
    fail("x reference video analysis must include at least one source video");
  }
  for (const video of manifest.videos) {
    const frames = Array.isArray(video.frames) ? video.frames : [];
    if (frames.length < 6) {
      fail(`x reference video analysis ${video.id ?? "(unknown)"} needs at least 6 sampled frames`);
    }
    if (new Set(frames.map((frame:any)=>frame.timeSec).filter(Number.isFinite)).size < 3) {
      fail(`x reference video analysis ${video.id ?? "(unknown)"} needs at least three distinct sample times; repeated pixels can be a deliberate hold`);
    }
    for (const frame of frames) {
      if (!frame.path || !existsSync(resolve(ROOT, "output/reference-video-analysis", String(frame.path)))) {
        fail(`x reference video analysis frame missing on disk: ${frame.path ?? "(no path)"}`);
      }
    }
  }
}

if (existsSync(resolve(ROOT, "shot-manifest.json"))) {
  const shot = readJson(resolve(ROOT, "shot-manifest.json"));
  const referenceStyleSteps = (Array.isArray(shot.steps) ? shot.steps : []).filter(isReferenceStyleShot);
  const usesReferenceRecipe = referenceStyleSteps.some((item: any) => referenceRecipes.has(String(item.visualRecipe ?? "")));
  if (usesReferenceRecipe && !sourceMentionsReferencePreset()) {
    console.warn("! heuristic review: reference video recipe selected, but no chapter imports/uses src/video/reference-style-scenes.tsx. Use the built-in preset components by default; custom equivalents require a different non-reference recipe or explicit workflow exception.");
  }
  validateReferenceVideoAnalysis(referenceStyleSteps);
  validateReferenceMotionStrips(referenceStyleSteps);
  if (videoFormat) {
    if (!shot.format) {
      fail("x shot-manifest.json missing project format. Set format to landscape or portrait.");
    } else if (shot.format !== videoFormat.id) {
      fail(`x shot-manifest.json format "${shot.format}" does not match src/config/videoFormat.ts "${videoFormat.id}"`);
    }
  }
  const shotSteps = Array.isArray(shot.steps) ? shot.steps : [];
  const seen = new Set<string>();
  for (let index = 0; index < shotSteps.length; index++) {
    const item = shotSteps[index];
    seen.add(`${item.chapter}/${item.step}`);
    for (const key of ["claim", "visualModel", "motionIntent"]) {
      if (!item[key]) {
        fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: missing ${key}`);
      }
    }
    for (const key of ["compositionModel", "finishLevel"]) {
      if (!item[key]) {
        fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: missing ${key}`);
      }
    }
    for (const key of ["visualRecipe", "motionStyle"]) {
      if (!item[key]) {
        fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: missing ${key}. Choose from references/MOTION-PATTERN-LIBRARY.md`);
      }
    }
    if (!item.motionTechnique) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: missing motionTechnique. Choose from references/jitter-motion-techniques/ (01-fade-opacity ~ 12-glass-shader). To auto-fill from narrations, run: npm run build-shot-manifest -- --force`);
    }
    if (!item.source) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: missing source`);
    }
    if (String(item.source ?? "").includes("replace with")) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: source is still the generated draft placeholder`);
    }
    if (String(item.motionIntent ?? "").includes("replace with")) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: motionIntent is still the generated draft placeholder`);
    }
    const validCompositionModels = new Set([
      "hero-theater",
      "product-gallery",
      "dark-preview-stage",
      "metric-strip",
      "module-dashboard",
      "audiogram-waveform",
      "motion-graphic-lab",
      "spatial-3d-stage",
      "comparison-stage",
      "quote-carousel",
      "caption-stage",
      "reaction-pip",
      "timeline-stage",
      "relationship-map",
    ]);
    if (item.compositionModel && !validCompositionModels.has(String(item.compositionModel))) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: unknown compositionModel "${item.compositionModel}"`);
    }
    const validVisualRecipes = new Set([
      "pov-hook-demo",
      "source-to-output-demo",
      "decision-tree-router",
      "kinetic-claim-card",
      "metric-race-strip",
      "nyt-graph-reveal",
      "before-after-wipe",
      "quote-carousel",
      "podcast-waveform-frame",
      "caption-over-motion-bg",
      "reaction-pip-review",
      "product-feature-flythrough",
      "module-dashboard-focus",
      "node-graph-build",
      "timeline-stack",
      "logo-sting-outro",
      "kinetic-prompt-to-product",
      "annotated-flow-diagram",
    ]);
    if (item.visualRecipe && !validVisualRecipes.has(String(item.visualRecipe))) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: unknown visualRecipe "${item.visualRecipe}". Use references/MOTION-PATTERN-LIBRARY.md`);
    }
    const validMotionStyles = new Set([
      "warm-grain",
      "swiss-grid",
      "kinetic-type",
      "decision-tree",
      "product-promo",
      "nyt-data-story",
      "vignelli-headline",
      "caption-first",
      "podcast-frame",
      "before-after",
      "reaction-pip",
      "quote-carousel",
      "announcement-card",
      "logo-sting",
      "shape-system",
      "three-depth",
      "prompt-product-kinetic",
      "whiteboard-engineering-flow",
    ]);
    if (item.motionStyle && !validMotionStyles.has(String(item.motionStyle))) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: unknown motionStyle "${item.motionStyle}". Use references/MOTION-PATTERN-LIBRARY.md`);
    }
    const validMotionTechniques = new Set([
      "01-fade-opacity",
      "02-stagger-offset",
      "03-reveal",
      "04-slide-move",
      "05-scale-rotate",
      "06-stack",
      "07-morph",
      "08-blur",
      "09-gradient",
      "10-counter",
      "11-bento-grid",
      "12-glass-shader",
    ]);
    if (item.motionTechnique && !validMotionTechniques.has(String(item.motionTechnique))) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: unknown motionTechnique "${item.motionTechnique}". Use references/jitter-motion-techniques/ (01-fade-opacity ~ 12-glass-shader)`);
    }
    const finishLevel = String(item.finishLevel ?? "");
    if (finishLevel === "draft") {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: finishLevel is draft; raise to structured/polished/hero after visual design`);
    }
    if (finishLevel && !["draft", "structured", "polished", "hero"].includes(finishLevel)) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: invalid finishLevel "${finishLevel}"`);
    }
    if (String(item.visualModel ?? "").includes("decorative")) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: visualModel cannot be decorative`);
    }
    if (item.onScreenText !== undefined && !Array.isArray(item.onScreenText)) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: onScreenText must be an array`);
    }
    const overlayMode = outputMode(workflowState?.outputMode) !== 'opaque';
    if (overlayMode) {
      for (const error of overlaySafetyErrors(item)) fail(`x shot ${item.chapter}/${item.step}: ${error}`);
      try {
        const evidence = localPath(ROOT, item.overlaySafety?.reviewEvidence);
        if (!existsSync(evidence) || !statSync(evidence).isFile()) fail(`x shot ${item.chapter}/${item.step}: overlay review evidence file is missing`);
      } catch (error) { fail(`x shot ${item.chapter}/${item.step}: invalid overlay review evidence path`); }
    }
    const layoutQuality = layoutQualityIssues(item, {portrait: videoFormat?.id === "portrait", overlay: overlayMode});
    for (const error of layoutQuality.errors) fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: ${error}`);
    for (const warning of layoutQuality.warnings) console.warn(`! heuristic review: shot ${item.chapter ?? "?"}/${item.step ?? "?"}: ${warning}`);
    if (workflowState?.subtitlesRequested === true) validateSubtitleSafety(item, videoFormat?.id ?? null);
    if (item.motionDensity && !["low", "medium", "high"].includes(String(item.motionDensity))) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: motionDensity must be low/medium/high`);
    }
    const assetImportance = String(item.assetImportance ?? "simple");
    if (item.assetImportance && !["simple", "medium", "important"].includes(assetImportance)) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: assetImportance must be simple/medium/important`);
    }
    if ((assetImportance === "medium" || assetImportance === "important" || item.openDesignRequired === true) && !item.openDesignHandoff && !item.openDesignSkipReason) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: medium/important visuals require openDesignHandoff or an explicit openDesignSkipReason`);
    }
    if (String(item.openDesignHandoff ?? "").includes("required for medium/important")) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: openDesignHandoff is still the generated placeholder`);
    }
    if ((stepTextLength(item) > 36 || String(item.claim ?? "").length > 24) && (!Array.isArray(item.visualStages) || item.visualStages.length < 2)) {
      fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: dense narration requires visualStages, not one static screen`);
    }
    if (item.visualRecipe === "kinetic-prompt-to-product") {
      if (!hasStages(item, 4, ["prompt", "input", "product", "panel", "output", "result", "typed", "输入", "产品", "面板", "输出", "结果", "打字"])) {
        fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: kinetic-prompt-to-product must declare 4+ visualStages and motionIntent/stages covering prompt/input/product/output motion`);
      }
      if (!overlayMode && Number(item.visualCoverage ?? item.nonTextVisualCoverage ?? 0) < 0.62) {
        console.warn(`! heuristic review: shot ${item.chapter ?? "?"}/${item.step ?? "?"}: kinetic-prompt-to-product visualCoverage is below the 0.62 recipe guideline; review whether product/UI motion explains the claim`);
      }
    }
    if (item.visualRecipe === "annotated-flow-diagram") {
      if (!hasStages(item, 4, ["node", "arrow", "flow", "highlight", "annotation", "path", "circle", "节点", "箭头", "流程", "高亮", "标注", "路径", "圈选"])) {
        fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: annotated-flow-diagram must declare 4+ visualStages and motionIntent/stages covering node/arrow/highlight/annotation motion`);
      }
      if (!overlayMode && Number(item.visualCoverage ?? item.nonTextVisualCoverage ?? 0) < 0.62) {
        console.warn(`! heuristic review: shot ${item.chapter ?? "?"}/${item.step ?? "?"}: annotated-flow-diagram visualCoverage is below the 0.62 recipe guideline; review whether the diagram explains the claim`);
      }
    }
    if (item.allowSubtitleOverlap === true) {
      const isOpeningOrEnding = index === 0 || index === shotSteps.length - 1;
      if (!isOpeningOrEnding) {
        fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: allowSubtitleOverlap is only allowed for opening or ending title steps`);
      }
      if (!String(item.overlapReason ?? "").trim()) {
        fail(`x shot ${item.chapter ?? "?"}/${item.step ?? "?"}: allowSubtitleOverlap requires overlapReason`);
      }
    }
  }
  if (existsSync(resolve(ROOT, "timing-manifest.json"))) {
    const timing = readJson(resolve(ROOT, "timing-manifest.json"));
    for (const step of timing.steps ?? []) {
      const key = `${step.chapter}/${step.step}`;
      if (!seen.has(key)) {
        fail(`x timing step ${key} missing from shot-manifest.json`);
      }
    }
  }
} else {
  fail("x shot-manifest.json not found. Run: npm run build-shot-manifest, then edit it before enterprise delivery.");
}

function stepTextLength(item: any): number {
  return [...String(item.scriptText ?? item.claim ?? "")].length;
}

if (existsSync(resolve(ROOT, "timing-manifest.json"))) {
  const timing = readJson(resolve(ROOT, "timing-manifest.json"));
  const timingSteps = Array.isArray(timing.steps) ? timing.steps : [];
  // Empty hold/transition steps intentionally have no audio, even in voiced
  // projects. Count only spoken steps so silence does not require fake TTS.
  const narratedSteps = timingSteps.filter((s: any) => String(s.text ?? '').trim());
  const nullAudioCount = narratedSteps.filter((s: any) => s.audioDurationMs === null).length;
  if (audioExpected && narratedSteps.length > 0 && nullAudioCount / narratedSteps.length > 0.5) {
    fail(`x timing-manifest.json: ${nullAudioCount}/${narratedSteps.length} narrated steps have audioDurationMs: null. Prepare/probe the selected narration source (approved TTS or provided local recordings), then rebuild timing before delivery.`);
  }
  for (const step of timingSteps) {
    if (workflowState?.timingMode !== "explicit" && (step.advanceAtMs ?? 0) < 1800) {
      fail(`x ${step.chapter}/${step.step}: advanceAtMs below 1800ms`);
    }
    for (const warning of step.warnings ?? []) {
      if (isAudioMissingWarning(String(warning)) && !audioExpected) continue;
      fail(`x ${step.chapter}/${step.step}: timing warning must be resolved before delivery: ${warning}`);
    }
    if (audioExpected && step.audio && step.audioDurationMs === null) {
      fail(`x ${step.chapter}/${step.step}: audio is expected but missing or unreadable; do not use estimated timing for final workflow`);
    }
    for (const line of workflowState?.subtitlesRequested === true ? step.subtitleChunks ?? [] : []) {
      if ([...line].length > 20) {
        fail(`x ${step.chapter}/${step.step}: subtitle line too long`);
      }
    }
    if (workflowState?.subtitlesRequested === true && (step.advanceAtMs ?? 0) > 6000 && (step.text ?? "").length > 36) {
      const cues = Array.isArray(step.subtitleCues) ? step.subtitleCues : [];
      if (cues.length <= 1) {
        fail(`x ${step.chapter}/${step.step}: long narration must use subtitleCues, not one static subtitle`);
      }
    }
    if (workflowState?.timingMode !== "explicit" && (step.advanceAtMs ?? 0) > 8000) {
      const key = `${step.chapter}/${step.step}`;
      const shot = existsSync(resolve(ROOT, "shot-manifest.json"))
        ? readJson(resolve(ROOT, "shot-manifest.json")).steps?.find((item: any) => `${item.chapter}/${item.step}` === key)
        : null;
      if (!Array.isArray(shot?.visualStages) || shot.visualStages.length < 2) {
        fail(`x ${key}: step longer than 8000ms must be split or declare at least 2 visualStages`);
      }
    }
  }
} else {
  fail("x timing-manifest.json not found; run npm run build-timing after audio/narration changes");
}

if (existsSync(statePath)) {
  const state = workflowState;
  for (const error of contractErrors(state)) fail(`x output contract: ${error}`);
  if (videoFormat) {
    if (!state.videoFormat) {
      fail("x workflow gate: project-state.json missing videoFormat. The chosen landscape/portrait format must be recorded.");
    } else if (state.videoFormat !== videoFormat.id) {
      fail(`x workflow gate: project-state videoFormat "${state.videoFormat}" does not match src/config/videoFormat.ts "${videoFormat.id}"`);
    }
    if (state.videoWidth !== undefined && state.videoWidth !== videoFormat.width) {
      fail(`x workflow gate: project-state videoWidth "${state.videoWidth}" does not match ${videoFormat.width}`);
    }
    if (state.videoHeight !== undefined && state.videoHeight !== videoFormat.height) {
      fail(`x workflow gate: project-state videoHeight "${state.videoHeight}" does not match ${videoFormat.height}`);
    }
  }
  if (!state.videoProfile || !["douyin", "douyin-laon", "douyin-skill", "bilibili", "custom"].includes(String(state.videoProfile))) {
    fail("x workflow gate: project-state.json missing videoProfile. Choose douyin, bilibili, or custom at project start.");
  }
  if (state.finalRenderRequired !== true) {
    fail("x workflow gate: finalRenderRequired must be true. Every profile must render its selected final output contract.");
  }
  // Profiles supply defaults, not immutable mandates. Explicit choices remain part of
  // the revision-bound shot/workflow decisions and the selected output contract.
  for (const key of ["audioRequested", "subtitlesRequested", "coverRequired"] as const) {
    if (typeof state[key] !== "boolean") fail(`x workflow gate: ${key} must be an explicit boolean; a profile name is not a substitute for the chosen contract.`);
  }
  if (isDouyinProfile(state.videoProfile) && outputMode(state.outputMode) === "opaque") {
    if (state.videoFormat !== "portrait" || state.audioRequested === false || state.subtitlesRequested === false || state.coverRequired === false) {
      console.warn("! heuristic review: explicit douyin choices differ from portrait/narration/subtitle/cover defaults; verify the accepted destination and shot design. Explicit choices are not overwritten.");
    }
  }
  if (state.videoProfile === "bilibili" && outputMode(state.outputMode) === "opaque") {
    if (state.videoFormat !== "landscape" || state.audioRequested === false) {
      console.warn("! heuristic review: explicit bilibili choices differ from landscape/narration defaults; verify the accepted destination and shot design. Explicit choices are not overwritten.");
    }
  }
  // Legacy booleans are informational mirrors only. Current scoped decisions are checked below.
  if (state.coverRequired === true && state.coverGenerated === true) {
    if (state.coverValidated !== true) fail("x workflow gate: generated cover must pass npm run cover:validate before delivery.");
  }
  validateChapterAcceptance(state);
  validateChapterDrift(state);
  validateOverlayChapterQuality(state);
}

const assetManifestPath = resolve(ROOT, "asset-manifest.json");
if (!existsSync(assetManifestPath)) {
  fail("x asset-manifest.json not found. Use {\"version\":1,\"assets\":[]} if no external assets are used.");
} else {
  const assets = readJson(assetManifestPath);
  const assetIds = new Set<string>();
  for (const asset of assets.assets ?? []) {
    const id = asset.id ?? asset.path ?? "?";
    if (assetIds.has(id)) {
      fail(`x asset ${id}: duplicate asset id/path`);
    }
    assetIds.add(id);
    if (!asset.usage) {
      fail(`x asset ${id}: missing usage`);
    }
    if (!asset.source && asset.placeholder !== true) {
      fail(`x asset ${id}: missing source or placeholder=true`);
    }
    if (asset.commercialUse !== true && asset.placeholder !== true) {
      fail(`x asset ${id}: commercialUse must be true or placeholder=true`);
    }
    if (asset.type === "lottie" && asset.placeholder !== true) {
      if (!asset.license) fail(`x asset ${id}: lottie assets must record license`);
      if (!asset.author) fail(`x asset ${id}: lottie assets must record author`);
      if (!String(asset.path ?? "").endsWith(".json")) fail(`x asset ${id}: lottie asset path should point to a .json file`);
    }
    // v2.6.0: 视频素材字段校验。事故来源：提示词工程项目 24fps 源直接进 60fps 项目导致一卡一卡。
    if (asset.type === "video" && asset.placeholder !== true) {
      for (const key of ["fps", "durationSec", "width", "height"]) {
        if (asset[key] === undefined || asset[key] === null || !Number.isFinite(Number(asset[key])) || Number(asset[key]) <= 0) {
          fail(`x asset ${id}: video assets must record ${key} (see references/VIDEO-ASSETS.md)`);
        }
      }
      for (const error of adaptationErrors(asset, videoFormat ?? {})) fail(`x asset ${id}: ${error}`);
      // 朝向不匹配仅警告（不阻断，因可裁切），但需在 notes 记录
      if (asset.orientation && !["landscape", "portrait"].includes(String(asset.orientation))) {
        fail(`x asset ${id}: video orientation must be "landscape" or "portrait", got "${asset.orientation}"`);
      }
    }
  }
  if (existsSync(resolve(ROOT, "shot-manifest.json"))) {
    const shot = readJson(resolve(ROOT, "shot-manifest.json"));
    for (const step of shot.steps ?? []) {
      for (const assetId of step.assets ?? []) {
        if (!assetIds.has(assetId)) {
          fail(`x shot ${step.chapter ?? "?"}/${step.step ?? "?"}: asset "${assetId}" missing from asset-manifest.json`);
        }
      }
    }
  }
}

validateRemotionHookUsage();

finish();
