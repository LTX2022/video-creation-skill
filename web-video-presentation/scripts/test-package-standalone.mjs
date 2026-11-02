// Real standalone release regression; no dependency installation or browser launch.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const notices = ['LICENSE', 'LICENSE-SCOPE.md', 'THIRD_PARTY_NOTICES.md'];
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {encoding: 'utf8', ...options});
  assert.equal(result.status, 0, `${command}: ${result.error || ''}\n${result.stdout}\n${result.stderr}`);
  return result;
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('standalone legal notices preserve repository originals byte-for-byte', {
  skip: !notices.every(name => existsSync(join(skill, '..', name))) && 'repository originals are not present in a standalone installation',
}, () => {
  for (const name of notices) assert.deepEqual(readFileSync(join(skill, name)), readFileSync(join(skill, '..', name)), name);
});

test('ZIP installs independently with notices, working entry links, and a repackable skill', {
  skip: process.platform === 'win32' && 'real ZIP extraction regression uses Unix zip/unzip; Windows is not validated',
}, t => {
  const root = mkdtempSync(join(tmpdir(), 'standalone-skill-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const delivery = join(root, 'delivery');
  const script = join(skill, 'scripts/package-skill.ts');
  run(process.execPath, [script, '--out-dir', delivery]);
  run(process.execPath, [script, '--verify', delivery]);
  const manifest = JSON.parse(readFileSync(join(delivery, 'delivery-manifest.json'), 'utf8'));
  const extracted = join(root, 'new user');
  run('unzip', ['-q', join(delivery, manifest.zip.name), '-d', extracted]);
  const installed = join(extracted, 'web-video-presentation');
  assert.equal(existsSync(join(extracted, 'README.md')), false);
  for (const entry of manifest.files) {
    const bytes = readFileSync(join(installed, entry.path));
    assert.equal(bytes.length, entry.bytes, entry.path);
    assert.equal(hash(bytes), entry.sha256, entry.path);
  }
  for (const name of [...notices, 'third-party/video-shotcraft-LICENSE.txt']) {
    assert.ok(manifest.files.some(entry => entry.path === name), `missing notice: ${name}`);
    assert.deepEqual(readFileSync(join(installed, name)), readFileSync(join(skill, name)), name);
  }
  for (const name of ['README.md', 'README.zh-CN.md', 'SKILL.md']) {
    const text = readFileSync(join(installed, name), 'utf8');
    assert.doesNotMatch(text, /\]\(\.\.\/README\.md\)/, name);
    for (const [, href] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(?:https?:|#)/.test(href)) continue;
      assert.ok(existsSync(resolve(installed, href.split('#')[0])), `${name}: broken local link ${href}`);
    }
  }
  // Execute the exact documented Bash commands from a separate project cwd,
  // with a Skill path containing spaces (no accidental relative-path success).
  const themeDocs = readFileSync(join(installed, 'references/THEMES.md'), 'utf8');
  const commands = themeDocs.split('\n').filter(line => line.startsWith('node '));
  assert.equal(commands.length, 3);
  for (const command of commands) {
    assert.ok(command.startsWith('node "$SKILL/scripts/theme-summary.mjs"'));
    run('bash', ['-c', command], {cwd: root, env: {...process.env, SKILL: installed}});
  }
  assert.match(readFileSync(join(installed, 'SKILL.md'), 'utf8'), /node "\$SKILL\/scripts\/theme-summary\.mjs"/);
  const repacked = join(root, 'repacked');
  const installedScript = join(installed, 'scripts/package-skill.ts');
  run(process.execPath, [installedScript, '--out-dir', repacked]);
  run(process.execPath, [installedScript, '--verify', repacked]);
  assert.deepEqual(JSON.parse(readFileSync(join(repacked, 'delivery-manifest.json'), 'utf8')).files, manifest.files);
  unlinkSync(join(repacked, 'web-video-presentation/LICENSE-SCOPE.md'));
  const damaged = spawnSync(process.execPath, [installedScript, '--verify', repacked], {encoding: 'utf8'});
  assert.notEqual(damaged.status, 0, 'verification must reject a missing legal notice');
});
