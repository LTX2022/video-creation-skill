import { existsSync, readFileSync, readdirSync, statSync, lstatSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const REGISTRY_PATH = resolve(ROOT, "src/registry/chapters.ts");
const CHAPTERS_DIR = resolve(ROOT, "src/chapters");

function readChapterFolders(): string[] {
  const src = readFileSync(REGISTRY_PATH, "utf8");
  return [...src.matchAll(/from\s+["']\.\.\/chapters\/([^"'\/]+)\/narrations["']/g)].map((m) => m[1]!);
}

function normalizeSpokenText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[""'`“”‘’]/g, "")
    .replace(/[，。！？；：、,.!?;:()\[\]{}<>《》【】（）\-\s]/g, "");
}

function readScriptContent(): { path: string; text: string; segments: string[] } | null {
  const candidates = [resolve(ROOT, "script.md")];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const stat = lstatSync(candidate);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) throw new Error("script.md must be a regular project-local file, not a link");
    const raw = readFileSync(candidate, "utf8").replace(/^\uFEFF/, "");
    const segments = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => !line.startsWith("#"))
      .filter((line) => !line.startsWith(">"))
      .filter((line) => line !== "---");
    const text = normalizeSpokenText(segments.join(""));
    return { path: candidate, text, segments };
  }
  return null;
}

async function main() {
  let failed = 0;
  const statePath = resolve(ROOT, 'project-state.json');
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
  const silentExplicit = state.timingMode === 'explicit' && state.audioRequested === false && state.subtitlesRequested === false;
  const registrySource = readFileSync(REGISTRY_PATH, 'utf8');
  const chapterIds = [...registrySource.matchAll(/id:\s*["']([^"']+)["']/g)].map((m) => m[1]!);
  const expectedSilentSteps = new Set<string>();
  const registeredFolders = readChapterFolders();
  const registeredSet = new Set(registeredFolders);
  const onlyExampleChapter =
    registeredFolders.length === 1
    && registeredFolders[0] === "01-example";
  const realFolders = existsSync(CHAPTERS_DIR)
    ? readdirSync(CHAPTERS_DIR).filter((name) => statSync(join(CHAPTERS_DIR, name)).isDirectory() && name !== "01-example")
    : [];
  for (const folder of realFolders) {
    if (!registeredSet.has(folder)) {
      console.error(`x ${folder}: chapter folder exists but is not registered in src/registry/chapters.ts`);
      failed++;
    }
  }
  let narrationTextAll = "";
  for (const folder of registeredFolders) {
    const narrationPath = join(CHAPTERS_DIR, folder, "narrations.ts");
    const chapterDir = join(CHAPTERS_DIR, folder);
    if (!existsSync(narrationPath)) {
      console.error(`x missing ${narrationPath}`);
      failed++;
      continue;
    }
    const mod = await import(pathToFileURL(narrationPath).href + "?t=" + Date.now());
    if (!Array.isArray(mod.narrations)) {
      console.error(`x ${folder}: narrations export must be an array`);
      failed++;
      continue;
    }
    const chapterId = chapterIds[registeredFolders.indexOf(folder)];
    if (silentExplicit && !chapterId) { console.error(`x ${folder}: missing chapter id for explicit timing`); failed++; }
    for (let i = 0; i < mod.narrations.length; i++) expectedSilentSteps.add(`${chapterId}/${i + 1}`);
    const files = ["Chapter.tsx", "Example.tsx"].map((f) => join(chapterDir, f)).filter(existsSync);
    const code = files.map((f) => readFileSync(f, "utf8")).join("\n");
    narrationTextAll += mod.narrations.map((item: unknown) => normalizeSpokenText(String(item ?? ""))).join("");
    const steps = [...code.matchAll(/step\s*={0,2}={0,2}\s*(\d+)/g)].map((m) => Number(m[1]));
    if (steps.length > 0) {
      const expected = Math.max(...steps) + 1;
      if (expected > mod.narrations.length) {
        console.error(`x ${folder}: code references step ${expected - 1}, narrations has ${mod.narrations.length}`);
        failed++;
      } else if (expected < mod.narrations.length) {
        console.error(`! ${folder}: explicit step checks imply ${expected} steps, narrations has ${mod.narrations.length}. This is OK only if the last step is a fallback return.`);
      }
    }
  }
  if (silentExplicit) {
    const timingKeys = new Set<string>();
    for (const item of Array.isArray(state.stepTimings) ? state.stepTimings : []) {
      const key = `${item.chapter}/${item.step}`;
      if (timingKeys.has(key) || !expectedSilentSteps.has(key) || !Number.isInteger(item.durationInFrames) || item.durationInFrames < 1) {
        console.error(`x invalid/duplicate silent explicit timing: ${key}`); failed++;
      }
      timingKeys.add(key);
    }
    const shotPath = resolve(ROOT, 'shot-manifest.json');
    const shot = existsSync(shotPath) ? JSON.parse(readFileSync(shotPath, 'utf8')) : null;
    const shotKeys = new Set((Array.isArray(shot?.steps) ? shot.steps : []).map((item: any) => `${item.chapter}/${item.step}`));
    for (const key of expectedSilentSteps) {
      if (!timingKeys.has(key) || !shotKeys.has(key)) { console.error(`x silent explicit plan lacks shot or exact frame timing: ${key}`); failed++; }
    }
    if (expectedSilentSteps.size === 0) { console.error('x silent explicit plan must contain at least one real step'); failed++; }
    if (failed === 0) console.error('v silent explicit route: real shot plan and exact frame timings replace spoken-script coverage');
  } else if (!onlyExampleChapter) {
    const script = readScriptContent();
    if (!script) {
      console.error("x script coverage check failed: script.md not found (lesson 26 / GPT-5.6 incident).");
      failed++;
    } else if (!script.text.length) {
      console.error(`x script coverage check failed: ${script.path} has no spoken content after normalization.`);
      failed++;
    } else {
      const coverage = narrationTextAll.length / script.text.length;
      if (coverage < 0.9) {
        console.error(`x script coverage ${(coverage * 100).toFixed(2)}% < 90% (lesson 26 / GPT-5.6: script chapter omission).`);
        failed++;
      } else {
        console.error(`v script coverage ${(coverage * 100).toFixed(2)}%`);
      }
    }
  }
  if (failed > 0) process.exit(1);
  console.error("v narrations valid");
}

main().catch((err) => {
  console.error("x " + (err.message ?? err));
  process.exit(1);
});
