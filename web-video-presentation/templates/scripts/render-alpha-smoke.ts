import { parseAlphaSampleFrames } from './render-route-args';
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateAlphaMedia } from "./validate-alpha";

const ROOT = resolve(process.cwd());
const OUTPUT = "output/alpha-smoke.mov";
const RESULT = "output/render-results/alpha-smoke.json";
const args = process.argv.slice(2);
function readFlag(name: string): string | undefined {
  const value = args.find((arg) => arg.startsWith(`${name}=`));
  if (value) return value.slice(name.length + 1);
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1]!.startsWith("--") ? args[i + 1] : undefined;
}
function smokeFrames(): string {
  const timingPath = resolve(ROOT, "src/video/render-timing.generated.ts");
  const source = existsSync(timingPath) ? readFileSync(timingPath, "utf8") : "";
  const total = Number(source.match(/export const TOTAL_FRAMES\s*=\s*(\d+)/)?.[1]);
  if (!Number.isInteger(total) || total < 1) throw new Error("Run npm run render:timing first; generated TOTAL_FRAMES is required to bound the smoke range");
  const requested = readFlag("--frames");
  if (!requested) return `0-${Math.min(30, total - 1)}`;
  const match = requested.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) throw new Error("--frames must be a single frame or inclusive start-end range");
  const start = Number(match[1]), end = Number(match[2] ?? match[1]);
  if (end < start || end >= total) throw new Error(`--frames must stay within 0-${total - 1}`);
  return start === end ? String(start) : `${start}-${end}`;
}
let resultWritten = false;
try {
  const tsxCli = resolve(ROOT, "node_modules/tsx/dist/cli.mjs");
  if (!existsSync(tsxCli)) throw new Error("Local tsx is missing. Install approved project dependencies explicitly; this command will not use npx or download packages.");
  const frames = smokeFrames();
  const sampleFrames=parseAlphaSampleFrames(readFlag('--alpha-sample-frames'));
  const browser = readFlag("--browser-executable");
  const childArgs = ["--import", "tsx", resolve(ROOT, "scripts/render-video.ts"), "--alpha", `--frames=${frames}`, "--output", OUTPUT, "--acknowledge-draft"];
  if(sampleFrames)childArgs.push(`--alpha-sample-frames=${sampleFrames.join(',')}`);
  if (browser) childArgs.push(`--browser-executable=${browser}`);
  execFileSync(process.execPath, childArgs, { stdio: "inherit", cwd: ROOT });
  const outputPath = resolve(ROOT, OUTPUT);
  if (!existsSync(outputPath)) throw new Error(`Alpha smoke output is missing: ${OUTPUT}`);
  // Check the encoded artifact again, not a renderer promise or pix_fmt alone.
  const alphaValidation = validateAlphaMedia(outputPath,{sampleFrames});
  const result = {
    schema: 2, generatedAt: new Date().toISOString(), kind: "alpha-smoke", draft: true, frames, output: OUTPUT,
    sha256: createHash("sha256").update(readFileSync(outputPath)).digest("hex").toUpperCase(),
    pixFmt: alphaValidation.pixFmt, pass: alphaValidation.pass, alphaValidation,
  };
  mkdirSync(resolve(ROOT, "output/render-results"), { recursive: true });
  writeFileSync(resolve(ROOT, RESULT), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  resultWritten = true;
  if (!result.pass) throw new Error(`Alpha smoke failed: ${alphaValidation.errors.join("; ")}`);
  console.error(`v alpha smoke numeric checks passed -> ${RESULT}; black/white edge previews still require human review`);
} catch (error) {
  if (!resultWritten) {
    mkdirSync(resolve(ROOT, "output/render-results"), { recursive: true });
    writeFileSync(resolve(ROOT, RESULT), `${JSON.stringify({ schema: 2, generatedAt: new Date().toISOString(), kind: "alpha-smoke", draft: true, output: OUTPUT, pass: false, error: String((error as Error)?.message ?? error) }, null, 2)}\n`, "utf8");
  }
  console.error(`x ${String((error as Error)?.message ?? error)}`);
  process.exit(1);
}
