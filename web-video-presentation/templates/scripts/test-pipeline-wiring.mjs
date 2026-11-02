/** Execute the generated npm command graph offline. Timing/export are real; validators/render are explicit stand-ins. */
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {readTestPackage} from './package-test-fixture.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const packageJson = readTestPackage(here);
const loader = createRequire(import.meta.url).resolve('tsx');
const root = mkdtempSync(join(tmpdir(), 'pipeline-wiring-'));
const routes = ['render:video', 'render:video:subtitles', 'render:video:alpha', 'render:video:composite', 'render:video:both',
  'render:video:draft', 'render:video:draft:subtitles', 'render:video:alpha:draft', 'preflight', 'export-subtitles', 'render:timing',
  'render:smoke', 'render:segment', 'render:bundle', 'cover:generate', 'cover'];
try {
  for (const path of ['scripts', 'src/video', 'src/config', 'src/registry', 'src/chapters/01-test', 'public/audio', 'node_modules/@remotion/cli']) mkdirSync(join(root, path), {recursive: true});
  const scripts = Object.fromEntries(Object.entries(packageJson.scripts).map(([name, command]) => [name, command.replaceAll('--import tsx', `--import ${JSON.stringify(loader)}`)]));
  scripts.typecheck = scripts.typecheck.replace('node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit', 'node scripts/stand-in.mjs typecheck');
  writeFileSync(join(root, 'scripts/measure-stage.mjs'), readFileSync(join(here, 'measure-stage.mjs')));
  writeFileSync(join(root, 'scripts/run-cover.mjs'), readFileSync(join(here, 'run-cover.mjs'), 'utf8').replaceAll("'tsx'", JSON.stringify(loader)));
  writeFileSync(join(root, 'package.json'), JSON.stringify({name: 'synthetic-pipeline-wiring-only', type: 'module', scripts}));
  writeFileSync(join(root, 'src/config/videoFormat.ts'), 'export const VIDEO_FORMAT={fps:60};\n');
  writeFileSync(join(root, 'src/registry/chapters.ts'), `import {narrations} from '../chapters/01-test/narrations';\nexport const CHAPTERS=[{id:'test',narrations}];\n`);
  writeFileSync(join(root, 'src/chapters/01-test/narrations.ts'), 'export const narrations=["Synthetic timing only."];\n');
  writeFileSync(join(root, 'project-state.json'), JSON.stringify({timingMode: 'explicit', audioRequested: false, subtitlesRequested: true,
    stepTimings: [{chapter: 'test', step: 1, durationInFrames: 120}]}));
  for (const name of ['build-timing-manifest.ts', 'build-render-timing.ts', 'export-subtitles.ts', 'stable-generated-file.ts', 'render-smoke.ts', 'render-route-args.ts', 'delivery-contract.ts', 'input-revision.ts']) {
    // Child launchers also need the installed loader; the temporary fixture has no node_modules/tsx.
    const text = readFileSync(join(here, name), 'utf8').replaceAll("'tsx'", JSON.stringify(loader));
    const instrumentation = name.startsWith('build-') ? `import {appendFileSync as auditAppend} from 'node:fs';\nauditAppend(${JSON.stringify(join(root, 'calls.jsonl'))}, JSON.stringify({script:${JSON.stringify(name)}})+'\\n');\n` : '';
    writeFileSync(join(root, 'scripts', name), instrumentation + text);
  }
  const standIn = `import {appendFileSync} from 'node:fs'; appendFileSync(${JSON.stringify(join(root, 'stand-ins.jsonl'))}, JSON.stringify({argv:process.argv.slice(1)})+'\\n');\n`;
  for (const name of ['validate-narrations.ts', 'validate-subtitles.ts', 'validate-screen-text.ts', 'validate-assets.ts', 'validate-composition.ts', 'preflight.ts', 'render-video.ts', 'render-review-segment.ts', 'generate-cover.ts', 'validate-cover.ts', 'copy-cover.ts', 'stand-in.mjs']) writeFileSync(join(root, 'scripts', name), standIn);
  writeFileSync(join(root, 'node_modules/@remotion/cli/remotion-cli.js'), standIn);
  const env = {...process.env, VWP_METRICS: '', VWP_METRICS_RUN_ID: '', VWP_METRICS_PARENT_EVENT: ''};
  for (const route of routes) {
    assert.ok(scripts[route], `Missing npm route ${route}`);
    writeFileSync(join(root, 'calls.jsonl'), '');
    const runId = route.replaceAll(':', '-');
    const begin = spawnSync(process.execPath, ['scripts/measure-stage.mjs', '--begin', `--run-id=${runId}`], {cwd: root, encoding: 'utf8', env});
    assert.equal(begin.status, 0, begin.stderr);
    const forwarded = route === 'render:segment' ? ['--', '--frames=3-8', '--output', 'a path with spaces.mp4'] : [];
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', route, ...forwarded], {cwd: root, encoding: 'utf8', shell: process.platform === 'win32', env});
    assert.equal(result.status, 0, `${route}\n${result.stdout}\n${result.stderr}`);
    const calls = readFileSync(join(root, 'calls.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line).script);
    const expected = route.startsWith('cover') ? [] : ['build-timing-manifest.ts', 'build-render-timing.ts'];
    assert.deepEqual(calls, expected, `${route}: timing generators run once only when actually needed`);
    const measured = readFileSync(join(root, 'output/metrics/stage-events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(event => event.runId === runId && event.eventType === 'finished');
    assert.equal(measured.filter(event => event.stage === 'timing').length >= expected.length, true, `${route}: real timing leaves recorded`);
    assert.equal(measured.every(event => event.command === 'node' || event.command === 'node.exe'), true, `${route}: leaf node executables only, no npm chains measured`);
    assert.equal(measured.every(event => event.status === 'success'), true);
    if (route.startsWith('cover')) assert.equal(measured.filter(event => event.stage === 'cover').length, route === 'cover' ? 2 : 1);
    if (route === 'render:segment') {
      const seen = readFileSync(join(root, 'stand-ins.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).at(-1).argv;
      assert.deepEqual(seen.slice(1), ['--frames=3-8', '--output', 'a path with spaces.mp4'], 'npm appended arguments reach the actual leaf unchanged');
    }
    const end = spawnSync(process.execPath, ['scripts/measure-stage.mjs', '--end'], {cwd: root, encoding: 'utf8', env});
    assert.equal(end.status, 0, end.stderr);
    console.log(`PASS ${route}: timing leaves=${expected.length}, measured leaves=${measured.length} (validators/render are stand-ins)`);
  }
  console.log(`Pipeline wiring: ${routes.length} routes passed; no browser, no TTS, no production quality-gate bypass. Stand-ins exist only in the temporary test fixture.`);
} finally {rmSync(root, {recursive: true, force: true});}
