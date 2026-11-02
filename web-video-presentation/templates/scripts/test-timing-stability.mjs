/** Real offline generator subprocesses: no-op writes skipped, recomputation and invalid-input checks retained. */
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync, statSync, utimesSync, unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const here = dirname(fileURLToPath(import.meta.url));
const loader = createRequire(import.meta.url).resolve('tsx');
const root = mkdtempSync(join(tmpdir(), 'timing-stability-'));
let count = 0;
const state = {timingMode: 'explicit', audioRequested: false, subtitlesRequested: true,
  stepTimings: [{chapter: 'test', step: 1, durationInFrames: 120}, {chapter: 'test', step: 2, durationInFrames: 180}]};
const run = (name, expected = true) => {
  const result = spawnSync(process.execPath, ['--import', loader, join(root, 'scripts', name)], {cwd: root, encoding: 'utf8'});
  assert.equal(result.status === 0, expected, `${name}\n${result.stdout}\n${result.stderr}`); return result;
};
const all = () => {run('build-timing-manifest.ts'); run('build-render-timing.ts'); run('export-subtitles.ts');};
const pass = (label) => {count++; console.log(`PASS ${label}`);};
try {
  for (const path of ['scripts', 'src/video', 'src/config', 'src/registry', 'src/chapters/01-test', 'public/audio']) mkdirSync(join(root, path), {recursive: true});
  for (const name of ['stable-generated-file.ts', 'build-timing-manifest.ts', 'build-render-timing.ts', 'export-subtitles.ts']) copyFileSync(join(here, name), join(root, 'scripts', name));
  writeFileSync(join(root, 'package.json'), JSON.stringify({type: 'module'}));
  writeFileSync(join(root, 'src/config/videoFormat.ts'), 'export const VIDEO_FORMAT = {fps: 60};\n');
  writeFileSync(join(root, 'src/registry/chapters.ts'), `import {narrations} from '../chapters/01-test/narrations';\nexport const CHAPTERS = [{id: 'test', narrations}];\n`);
  writeFileSync(join(root, 'src/chapters/01-test/narrations.ts'), 'export const narrations = ["First sentence.", "Second sentence."];\n');
  writeFileSync(join(root, 'project-state.json'), JSON.stringify(state));
  all(); pass('real timing/render-TS/subtitle generators complete offline');
  const paths = ['timing-manifest.json', 'src/video/render-timing.generated.ts', 'output/subtitles/subtitles.vtt', 'output/subtitles/subtitles.srt'];
  const snapshot = new Map(paths.map((path) => {utimesSync(join(root, path), 946684800, 946684800); return [path, {text: readFileSync(join(root, path), 'utf8'), mtime: statSync(join(root, path), {bigint: true}).mtimeNs}];}));
  all();
  for (const [path, before] of snapshot) {assert.equal(readFileSync(join(root, path), 'utf8'), before.text); assert.equal(statSync(join(root, path), {bigint: true}).mtimeNs, before.mtime);}
  pass('semantic no-op retains generatedAt, bytes and mtime across all four outputs');
  state.stepTimings[0].durationInFrames = 150; writeFileSync(join(root, 'project-state.json'), JSON.stringify(state)); all();
  for (const [path, before] of snapshot) assert.notEqual(readFileSync(join(root, path), 'utf8'), before.text);
  assert.match(readFileSync(join(root, 'src/video/render-timing.generated.ts'), 'utf8'), /TOTAL_FRAMES = 330/); pass('duration mutation rebuilds timing, TS and subtitle times despite existing files');
  state.stepTimings[0].durationInFrames = 0; writeFileSync(join(root, 'project-state.json'), JSON.stringify(state));
  run('build-timing-manifest.ts', false); pass('existing output does not skip validation of invalid input');
  state.stepTimings[0].durationInFrames = 150; writeFileSync(join(root, 'project-state.json'), JSON.stringify(state));
  writeFileSync(join(root, 'timing-manifest.json'), '{broken'); run('build-timing-manifest.ts');
  assert.equal(JSON.parse(readFileSync(join(root, 'timing-manifest.json'), 'utf8')).steps.length, 2); pass('corrupt timing output is rebuilt rather than reused');
  unlinkSync(join(root, 'src/video/render-timing.generated.ts')); run('build-render-timing.ts');
  assert.match(readFileSync(join(root, 'src/video/render-timing.generated.ts'), 'utf8'), /TOTAL_FRAMES = 330/); pass('deleted generated TS is rebuilt');
  console.log(`Timing stability: ${count} passed; actual local generator invocations, no browser/TTS or render speed claim.`);
} finally {rmSync(root, {recursive: true, force: true});}
