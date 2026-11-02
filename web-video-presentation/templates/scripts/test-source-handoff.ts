/** Local synthetic fixtures only: no network, credentials, install, or render. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { hashLocalFile } from './input-revision';
import { MINIMUM_SOURCE_INPUTS, stageSourceHandoff } from './source-handoff';

const roots: string[] = [];
let passed = 0, failed = 0;
function test(name: string, run: () => void) {
  try { run(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${String(error)}`); }
}
function put(root: string, path: string, content: string | Buffer | object = 'synthetic fixture\n') {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), typeof content === 'object' && !Buffer.isBuffer(content) ? JSON.stringify(content) : content as string | Buffer);
}
function fixture(files: string[] = ['src/video/index.ts']) {
  // Stay within the selected workspace, including temporary fixtures.
  const root = mkdtempSync(join(process.cwd(), '.source-handoff-test-')); roots.push(root);
  const stage = join(root, 'output/stage'); mkdirSync(stage, { recursive: true });
  for (const path of files) put(root, path, path === 'package.json' ? { scripts: {} } : `synthetic ${path}\n`);
  const manifest: any = { schema: 1, scope: 'selected-source-snapshot',
    rationale: 'Synthetic test: customer requests the explicitly selected source files only.',
    authorization: { request: 'SYNTHETIC TEST ONLY: include this listed source snapshot; not real user authorization.' }, files };
  const save = () => put(root, 'source-delivery-manifest.json', manifest);
  save(); return { root, stage, manifest, save };
}
const run = (f: { root: string; stage: string }) => stageSourceHandoff(f.root, f.stage, { includeSource: true })!;

try {
  test('default mode neither reads an unsafe manifest nor creates source output', () => {
    const f = fixture(); rmSync(join(f.root, 'source-delivery-manifest.json'));
    symlinkSync('missing-no-read', join(f.root, 'source-delivery-manifest.json'));
    assert.equal(stageSourceHandoff(f.root, f.stage, { includeSource: false }), null);
    assert.deepEqual(readdirSync(f.stage), []);
  });
  test('explicit source mode refuses a missing manifest', () => {
    const f = fixture(); rmSync(join(f.root, 'source-delivery-manifest.json'));
    assert.throws(() => run(f), /ENOENT/); assert.deepEqual(readdirSync(f.stage), []);
  });
  test('copies only selected byte-identical files and emits an honest partial report', () => {
    const f = fixture(['src/video/index.ts', 'public/still.png']);
    const bytes = Buffer.from([0, 255, 1, 128, 10]); put(f.root, 'public/still.png', bytes);
    put(f.root, 'src/not-selected.ts'); put(f.root, 'public/private-unrequested.mp3');
    f.manifest.excluded = [{ path: 'public/audio', reason: 'Synthetic scope excludes redistribution of raw narration audio.' }]; f.save();
    const report = run(f);
    assert.equal(report.status, 'partial'); assert.equal(report.minimumInputs.met, false);
    assert.equal(report.authorization.authenticated, false);
    assert.deepEqual(report.files.map(item => item.path), f.manifest.files);
    assert.deepEqual(readFileSync(join(f.stage, 'source-project/public/still.png')), bytes);
    assert.equal(existsSync(join(f.stage, 'source-project/src/not-selected.ts')), false);
    assert.equal(existsSync(join(f.stage, 'source-project/public/private-unrequested.mp3')), false);
    for (const file of report.files) assert.equal(hashLocalFile(f.stage, file.packagePath), hashLocalFile(f.root, file.path));
    assert.deepEqual(JSON.parse(readFileSync(join(f.stage, 'source-handoff-report.json'), 'utf8')), report);
    assert.match(report.limitations.join(' '), /not authenticate|does not authenticate/);
    assert.match(report.limitations.join(' '), /not verified/);
  });
  test('minimum source inputs never upgrade a selection to complete or offline-reproducible', () => {
    const f = fixture([...MINIMUM_SOURCE_INPUTS]); const report = run(f);
    assert.equal(report.status, 'minimum-inputs-present-not-verified'); assert.equal(report.minimumInputs.met, true);
    assert.deepEqual(report.minimumInputs.missing, []); assert.equal(report.kind, 'selected-source-snapshot');
  });
  test('package scripts referenced but unselected remain explicit partial scope', () => {
    const f = fixture([...MINIMUM_SOURCE_INPUTS]);
    put(f.root, 'package.json', { scripts: { render: 'node --import tsx scripts/render-video.ts --preset quality', helper: 'bash ./scripts/synthesize-audio.sh', test: 'node scripts/test-one.mjs' } });
    const report = run(f); assert.equal(report.status, 'partial');
    assert.deepEqual(report.referencedScriptsNotSelected, ['scripts/render-video.ts', 'scripts/synthesize-audio.sh', 'scripts/test-one.mjs']);
  });
  test('missing selected file fails rather than silently pretending it was included', () => {
    const f = fixture(); f.manifest.files.push('src/missing.ts'); f.save();
    assert.throws(() => run(f), /ENOENT/); assert.deepEqual(readdirSync(f.stage), []);
  });
  test('rejects malformed schema, generic approval boolean, empty selection, and duplicates', () => {
    for (const update of [{ schema: 2 }, { scope: 'complete-project' }, { rationale: '' }, { authorization: { approved: true } }, { files: [] }, { files: ['src/video/index.ts', 'src/video/index.ts'] }, { files: ['src/video/index.ts', 'src/video/INDEX.ts'] }]) {
      const f = fixture(); Object.assign(f.manifest, update); f.save(); assert.throws(() => run(f)); assert.deepEqual(readdirSync(f.stage), []);
    }
  });
  test('rejects traversal, absolute/URL paths, globs, directories, aliases and sensitive names', () => {
    const badPaths = ['../outside.ts', '/etc/passwd', 'file:///tmp/a', 'C:\\data\\a', 'src/../package.json', 'src//x.ts', './package.json', 'src/**/*.ts', 'src', 'src/folder', '.env', 'src/.env.local', 'src/.git/config', 'src/node_modules/x.js', 'src/cache/x.json', 'src/auth-token.json', 'public/private-key.pem', 'src/credentials.json', 'output/full.mp4', 'misc/data.json', 'src/a\n.ts'];
    for (const path of badPaths) {
      const f = fixture(); mkdirSync(join(f.root, 'src/folder')); f.manifest.files = [path]; f.save();
      assert.throws(() => run(f), Error, path); assert.deepEqual(readdirSync(f.stage), [], path);
    }
  });
  test('design-token source filenames remain allowed and are not mistaken for credentials', () => {
    const f = fixture(['src/styles/tokens.css']); assert.equal(run(f).files[0]!.path, 'src/styles/tokens.css');
  });
  test('rejects source symlink, dangling symlink, symlink directory and hardlink without copying', () => {
    for (const kind of ['symlink', 'dangling', 'directory-link', 'hardlink']) {
      const f = fixture(); put(f.root, 'src/original.ts');
      if (kind === 'symlink') symlinkSync('original.ts', join(f.root, 'src/linked.ts'));
      if (kind === 'dangling') symlinkSync('missing.ts', join(f.root, 'src/linked.ts'));
      if (kind === 'hardlink') linkSync(join(f.root, 'src/original.ts'), join(f.root, 'src/linked.ts'));
      if (kind === 'directory-link') symlinkSync('video', join(f.root, 'src/linked'));
      f.manifest.files = [kind === 'directory-link' ? 'src/linked/index.ts' : 'src/linked.ts']; f.save();
      assert.throws(() => run(f), /link|Symlink/i); assert.deepEqual(readdirSync(f.stage), []);
    }
  });
  test('rejects linked manifest and nonregular named pipe before opening', () => {
    const linked = fixture(); linkSync(join(linked.root, 'source-delivery-manifest.json'), join(linked.root, 'manifest-copy.json'));
    assert.throws(() => run(linked), /link/i);
    if (process.platform !== 'win32') {
      const pipe = fixture(); execFileSync('mkfifo', [join(pipe.root, 'src/pipe.ts')]);
      pipe.manifest.files = ['src/pipe.ts']; pipe.save(); assert.throws(() => run(pipe), /nonregular/);
    }
  });
  test('refuses existing source/report, linked staging, and staging outside project', () => {
    for (const path of ['source-project', 'source-handoff-report.json']) {
      const f = fixture(); put(f.stage, path, 'DO NOT OVERWRITE');
      assert.throws(() => run(f), /overwrite/); assert.equal(readFileSync(join(f.stage, path), 'utf8'), 'DO NOT OVERWRITE');
    }
    const f = fixture(); symlinkSync('stage', join(f.root, 'output/linked-stage'));
    assert.throws(() => stageSourceHandoff(f.root, join(f.root, 'output/linked-stage'), { includeSource: true }), /Symlink/i);
    assert.throws(() => stageSourceHandoff(f.root, resolve(f.root, '..'), { includeSource: true }), /inside/);
  });
  test('rejects source selected from own staging tree and contradictory exclusion', () => {
    const f = fixture(['src/index.ts']); f.stage = join(f.root, 'src/stage'); mkdirSync(f.stage);
    put(f.root, 'src/stage/data.ts'); f.manifest.files = ['src/stage/data.ts']; f.save(); assert.throws(() => run(f), /own package/);
    const g = fixture(); g.manifest.excluded = [{ path: 'src/video/index.ts', reason: 'Synthetic contradictory exclusion must be rejected.' }]; g.save();
    assert.throws(() => run(g), /both selected and excluded/);
  });
  test('enforces per-file and selection count bounds before staging', () => {
    const f = fixture(); put(f.root, 'src/oversized.ts', Buffer.alloc(32 * 1024 * 1024 + 1)); f.manifest.files = ['src/oversized.ts']; f.save();
    assert.throws(() => run(f), /too large/); assert.deepEqual(readdirSync(f.stage), []);
    const g = fixture(); g.manifest.files = Array.from({ length: 513 }, (_, i) => `src/file-${i}.ts`); g.save();
    assert.throws(() => run(g), /1-512/); assert.deepEqual(readdirSync(g.stage), []);
  });
} finally { for (const root of roots) rmSync(root, { recursive: true, force: true }); }
console.log(`\nSource handoff tests: ${passed} passed, ${failed} failed. Synthetic scope records only; no user authorization or reproducibility claim.`);
if (failed) process.exitCode = 1;
