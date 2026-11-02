import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {checkedPath, inspectWorkspace, inventory} from './workspace-preflight.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMP = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'video-workspace-test-'));
let n = 0;
const target = () => path.join(TEMP, `case-${++n}`);
const fresh = () => { const p = target(); fs.mkdirSync(p); return p; };
const write = (p, data) => fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data));
function project(root = fresh()) {
  write(path.join(root, '.web-video-presentation-project.json'), {schema: 2, skill: 'web-video-presentation'});
  write(path.join(root, 'project-state.json'), {schema: 2, projectSkill: 'web-video-presentation'});
  write(path.join(root, 'package.json'), {scripts: {typecheck: 'tsc'}, dependencies: {remotion: '4.0.450'}});
  return root;
}
const run = (...args) => spawnSync(process.execPath, [path.join(HERE, 'workspace-preflight.mjs'), ...args], {encoding: 'utf8'});
const snapshot = (root) => fs.readdirSync(root).sort().map((f) => [f, fs.readFileSync(path.join(root, f), 'utf8')]);
test.after(() => fs.rmSync(TEMP, {recursive: true, force: true}));

test('new explicitly chosen existing empty folder stays empty', () => {
  const root = fresh();
  assert.equal(inspectWorkspace({mode: 'new', projectRoot: root}).rootStatus, 'empty');
  assert.deepEqual(fs.readdirSync(root), []);
});
test('new nonexistent target and parents stay nonexistent', () => {
  const parent = target(); const root = path.join(parent, 'nested', 'video');
  assert.equal(inspectWorkspace({mode: 'new', projectRoot: root}).rootStatus, 'not-created');
  assert.equal(fs.existsSync(parent), false);
});
test('root and mode must be explicit', () => {
  assert.throws(() => inspectWorkspace({mode: 'new'}), /explicitly/);
  assert.throws(() => inspectWorkspace({projectRoot: target()}), /mode/);
});
test('hidden files make folder nonempty; contents retained', () => {
  const root = fresh(); write(path.join(root, '.DS_Store'), 'keep');
  assert.throws(() => inspectWorkspace({mode: 'new', projectRoot: root}), /not empty/);
  assert.equal(fs.readFileSync(path.join(root, '.DS_Store'), 'utf8'), 'keep');
});
test('normal files and empty subdirectories both make folder nonempty', () => {
  for (const directory of [false, true]) {
    const root = fresh(); const item = path.join(root, 'keep');
    directory ? fs.mkdirSync(item) : write(item, 'keep');
    assert.throws(() => inspectWorkspace({mode: 'new', projectRoot: root}), /not empty/);
  }
});
test('file target and file parent are rejected', () => {
  const root = target(); write(root, 'keep');
  assert.throws(() => inspectWorkspace({mode: 'new', projectRoot: root}), /not a directory/);
  assert.throws(() => inspectWorkspace({mode: 'new', projectRoot: path.join(root, 'child')}), /not a directory/);
});
test('symlink target, ancestor and broken link cannot escape', () => {
  const real = fresh(); const link = target(); fs.symlinkSync(real, link, 'dir');
  assert.throws(() => inspectWorkspace({mode: 'new', projectRoot: link}), /symlink/);
  assert.throws(() => inspectWorkspace({mode: 'new', projectRoot: path.join(link, 'child')}), /symlink/);
  const broken = target(); fs.symlinkSync(target(), broken, 'dir');
  assert.throws(() => inspectWorkspace({mode: 'new', projectRoot: broken}), /symlink/);
  assert.deepEqual(fs.readdirSync(real), []);
});
test('traversal/control characters rejected before canonicalization', () => {
  assert.throws(() => checkedPath(`${TEMP}/elsewhere/../child`), /traversal/);
  assert.throws(() => checkedPath(`${TEMP}/line\nbreak`), /control/);
});
test('foreign Windows drive/UNC paths are rejected on non-Windows without creating anything', {skip: process.platform === 'win32'}, () => {
  for (const value of ['C:\\Client\\Video Project', 'C:/Client/Video Project', 'C:relative-project', '\\\\customer-pc\\share\\Video']) {
    assert.throws(() => checkedPath(value), /Windows drive\/UNC path/);
    const result = spawnSync(process.execPath, [path.join(HERE, 'workspace-preflight.mjs'), '--mode=new', '--project-root', value, '--json'], {cwd: TEMP, encoding: 'utf8'});
    assert.equal(result.status, 1); assert.match(result.stderr, /confirmed execution environment/);
    assert.equal(fs.existsSync(path.join(TEMP, value)), false);
  }
});
test('ordinary relative paths and literal non-Windows backslashes are preserved', {skip: process.platform === 'win32'}, () => {
  assert.equal(checkedPath('./relative video'), path.resolve('./relative video'));
  assert.equal(checkedPath('customer\\video'), path.resolve('customer\\video'));
});
test('ZIP packaging dependency is stage-scoped, read-only, and reports missing commands', () => {
  const name = process.platform === 'win32' ? 'powershell.exe' : 'zip';
  const missing = inventory({env: {PATH: ''}}).find((entry) => entry.name === name);
  assert.equal(missing.status, 'missing'); assert.deepEqual(missing.requiredFor, ['delivery-package']);
  const bin = fresh(), trap = path.join(bin, 'must-not-execute');
  const executable = path.join(bin, name);
  write(executable, `#!/bin/sh\ntouch '${trap}'\n`); fs.chmodSync(executable, 0o755);
  const found = inventory({env: {PATH: bin}}).find((entry) => entry.name === name);
  assert.equal(found.status, 'found-not-tested'); assert.equal(found.path, executable);
  assert.equal(fs.existsSync(trap), false);
});
test('nested existing video/npm projects and skill tree rejected', () => {
  const root = project();
  assert.throws(() => inspectWorkspace({mode: 'new', projectRoot: path.join(root, 'child')}), /nested/);
  const npm = fresh(); write(path.join(npm, 'package.json'), '{}');
  assert.throws(() => inspectWorkspace({mode: 'new', projectRoot: path.join(npm, 'child')}), /nested/);
  assert.throws(() => inspectWorkspace({mode: 'new', projectRoot: path.join(HERE, 'child')}), /skill installation/);
});
test('resume recognizes project and is non-destructive, never scaffolds', () => {
  const root = project(); const before = snapshot(root);
  assert.equal(inspectWorkspace({mode: 'resume', projectRoot: root}).rootStatus, 'existing-project');
  assert.deepEqual(snapshot(root), before);
  assert.throws(() => inspectWorkspace({mode: 'new', projectRoot: root}), /not empty/);
});
test('resume rejects nonexistent, empty, foreign and broken projects', () => {
  assert.throws(() => inspectWorkspace({mode: 'resume', projectRoot: target()}), /existing/);
  assert.throws(() => inspectWorkspace({mode: 'resume', projectRoot: fresh()}), /regular/);
  const root = project(); write(path.join(root, 'project-state.json'), {schema: 2, projectSkill: 'foreign'});
  assert.throws(() => inspectWorkspace({mode: 'resume', projectRoot: root}), /identify/);
  write(path.join(root, 'project-state.json'), '{broken');
  assert.throws(() => inspectWorkspace({mode: 'resume', projectRoot: root}), /invalid JSON/);
});
test('resume rejects symlink marker and redirected output/dependencies', () => {
  for (const name of ['output', 'node_modules', '.cache']) {
    const root = project(); fs.symlinkSync(fresh(), path.join(root, name), 'dir');
    assert.throws(() => inspectWorkspace({mode: 'resume', projectRoot: root}), /symlink/);
  }
  const root = project(); const marker = path.join(root, '.web-video-presentation-project.json');
  const elsewhere = target(); fs.renameSync(marker, elsewhere); fs.symlinkSync(elsewhere, marker);
  assert.throws(() => inspectWorkspace({mode: 'resume', projectRoot: root}), /non-symlink/);
});
test('tool root is explicit planning only; no directories created', () => {
  const root = target(), tools = target();
  const report = inspectWorkspace({mode: 'new', projectRoot: root, toolRoot: tools});
  assert.equal(report.externalToolRootExplicit, true);
  assert.equal(report.toolRoot, tools);
  assert.equal(fs.existsSync(tools), false);
  assert.equal(inspectWorkspace({mode: 'new', projectRoot: root}).toolRoot, null);
  assert.equal(inspectWorkspace({mode: 'new', projectRoot: root, toolRoot: path.join(root, '.tools')}).externalToolRootExplicit, false);
});
test('tool root cannot contain project or hijack node_modules/public', () => {
  const root = target();
  for (const tools of [root, TEMP, path.parse(root).root, path.join(root, 'node_modules'), path.join(root, 'public')]) {
    assert.throws(() => inspectWorkspace({mode: 'new', projectRoot: root, toolRoot: tools}), /tool-root/);
  }
});
test('inventory missing executables is explicit and imagegen stays host capability', () => {
  const report = inventory({env: {PATH: ''}, browserExecutable: path.join(TEMP, 'missing-browser')});
  for (const name of ['npm', 'ffmpeg', 'ffprobe']) assert.equal(report.find((r) => r.name === name).status, 'missing');
  assert.equal(report.find((r) => r.name === 'browser').status, 'invalid-explicit-path');
  assert.equal(report.find((r) => r.name === 'imagegen').status, 'host-verification-required');
});
test('inventory detects executable paths but never executes found commands', () => {
  const bin = fresh(); const trap = path.join(bin, 'executed');
  for (const name of ['npm', 'ffmpeg', 'ffprobe', 'chromium']) {
    write(path.join(bin, name), `#!/bin/sh\ntouch '${trap}'\n`); fs.chmodSync(path.join(bin, name), 0o755);
  }
  const report = inventory({env: {PATH: bin}, browserExecutable: path.join(bin, 'chromium')});
  for (const name of ['npm', 'ffmpeg', 'ffprobe', 'browser']) assert.equal(report.find((r) => r.name === name).status, 'found-not-tested');
  assert.equal(fs.existsSync(trap), false);
});
test('project npm inventory does not redirect node_modules into tool/cache root', () => {
  const root = project(); const missing = inventory({env: {PATH: ''}, projectRoot: root}).find((r) => r.name === 'remotion');
  assert.equal(missing.status, 'missing');
  assert.equal(missing.path, path.join(root, 'node_modules/remotion/package.json'));
  const report = inspectWorkspace({mode: 'resume', projectRoot: root});
  assert.equal(report.paths.projectDependencies, path.join(root, 'node_modules'));
  assert.equal(report.paths.npmCache, path.join(root, '.cache/npm'));
});
test('CLI --force, --install-project and duplicate paths fail closed', () => {
  for (const option of ['--force', '--install-project', '--target=extra']) {
    const root = fresh(); const result = run('--mode=new', `--project-root=${root}`, option);
    assert.equal(result.status, 1); assert.deepEqual(fs.readdirSync(root), []);
  }
});
test('CLI JSON and path-only are deterministic and read-only', () => {
  const root = target();
  const args = ['--mode=new', `--project-root=${root}`, '--json'];
  const a = run(...args), b = run(...args);
  assert.equal(a.status, 0); assert.equal(a.stdout, b.stdout);
  assert.equal(JSON.parse(a.stdout).installation.performed, false);
  assert.equal(run('--mode=new', '--target', root, '--path-only').stdout.trim(), root);
  assert.equal(fs.existsSync(root), false);
});
test('compatibility checker no-option inventory and project-only resume routes are nonempty-array safe', () => {
  const inventoryResult = spawnSync('/bin/bash', [path.join(HERE, 'check-dependencies.sh')], {encoding: 'utf8'});
  assert.equal(inventoryResult.status, 0); assert.match(inventoryResult.stdout, /No files changed/);
  const root = project(), before = snapshot(root);
  const resumeResult = spawnSync('/bin/bash', [path.join(HERE, 'check-dependencies.sh'), '--project', root], {encoding: 'utf8'});
  assert.equal(resumeResult.status, 0); assert.match(resumeResult.stdout, /existing-project/);
  assert.deepEqual(snapshot(root), before);
});
test('legacy --install-project rejected before any npm activity', () => {
  const root = project(); const before = snapshot(root);
  const result = spawnSync('/bin/bash', [path.join(HERE, 'check-dependencies.sh'), '--project', root, '--install-project'], {encoding: 'utf8'});
  assert.equal(result.status, 1); assert.match(result.stderr, /removed/); assert.deepEqual(snapshot(root), before);
});
test('legacy duplicate project selection rejected', () => {
  const root = project();
  const result = spawnSync('/bin/bash', [path.join(HERE, 'check-dependencies.sh'), '--project', root, '--project', root], {encoding: 'utf8'});
  assert.equal(result.status, 1); assert.match(result.stderr, /Duplicate/);
});
test('bootstrap reports missing Node without fallback download or target creation', () => {
  const bin = fresh(), root = target();
  const dirname = ['/usr/bin/dirname', '/bin/dirname'].find(fs.existsSync);
  assert.ok(dirname); fs.symlinkSync(dirname, path.join(bin, 'dirname'));
  const result = spawnSync('/bin/bash', [path.join(HERE, 'bootstrap-preflight.sh'), '--mode=new', '--project-root', root],
    {encoding: 'utf8', env: {...process.env, PATH: bin}});
  assert.equal(result.status, 2); assert.match(result.stderr, /Node.js is missing/); assert.equal(fs.existsSync(root), false);
});
test('explicit legacy resume supports unmarked v3.1 projects without modifying bytes', () => {
  const root = project(); fs.unlinkSync(path.join(root, '.web-video-presentation-project.json'));
  write(path.join(root, 'project-state.json'), {schema: 2, projectSkill: 'web-video-presentation', projectVersion: '3.1.0'});
  const before = snapshot(root);
  assert.throws(() => inspectWorkspace({mode: 'resume', projectRoot: root}), /regular/);
  const report = inspectWorkspace({mode: 'resume', projectRoot: root, legacyResume: true});
  assert.equal(report.rootStatus, 'legacy-unmarked');
  assert.equal(report.identityProvenance, 'state-only-legacy');
  assert.match(report.warnings[0], /incomplete/);
  const result = run('--mode=resume', '--project-root', root, '--legacy-resume', '--json');
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).workspace.rootStatus, 'legacy-unmarked');
  assert.deepEqual(snapshot(root), before);
});
test('legacy resume never bypasses wrong identity, invalid marker or symlink guards', () => {
  const root = project(); const marker = path.join(root, '.web-video-presentation-project.json');
  write(marker, {schema: 2, skill: 'foreign'});
  assert.throws(() => inspectWorkspace({mode: 'resume', projectRoot: root, legacyResume: true}), /identify/);
  write(marker, '{broken');
  assert.throws(() => inspectWorkspace({mode: 'resume', projectRoot: root, legacyResume: true}), /invalid JSON/);
  fs.unlinkSync(marker); write(path.join(root, 'project-state.json'), {schema: 2, projectSkill: 'foreign'});
  assert.throws(() => inspectWorkspace({mode: 'resume', projectRoot: root, legacyResume: true}), /identify/);
  write(path.join(root, 'project-state.json'), {schema: 2, projectSkill: 'web-video-presentation'});
  fs.symlinkSync(fresh(), path.join(root, 'public'), 'dir');
  assert.throws(() => inspectWorkspace({mode: 'resume', projectRoot: root, legacyResume: true}), /symlink/);
});
test('legacy resume is not a new-project/installer bypass', () => {
  const root = fresh();
  assert.equal(run('--mode=new', '--project-root', root, '--legacy-resume').status, 1);
  assert.equal(run('--mode=inventory', '--legacy-resume').status, 1);
  assert.deepEqual(fs.readdirSync(root), []);
});
