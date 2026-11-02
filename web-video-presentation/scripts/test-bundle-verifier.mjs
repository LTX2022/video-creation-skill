import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyBundle} from './verify-bundle.mjs';

const script = fileURLToPath(new URL('./verify-bundle.mjs', import.meta.url));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'bundle-verifier-'));
  t.after(() => fs.rmSync(parent, {recursive: true, force: true}));
  const root = path.join(parent, '中文 combined release');
  fs.mkdirSync(path.join(root, 'web-video-presentation'), {recursive: true});
  fs.mkdirSync(path.join(root, 'fix-agent'));
  const data = {'web-video-presentation/VERSION': '3.4.0\n', 'fix-agent/VERSION': '1.8.1\n', 'sample.bin': Buffer.alloc(200000, 37)};
  const manifest = {schema: 1, version: '3.4.0', status: 'validation-candidate', files: []};
  for (const [name, value] of Object.entries(data)) {
    const bytes = Buffer.from(value);
    fs.writeFileSync(path.join(root, name), bytes);
    manifest.files.push({path: name, bytes: bytes.length, sha256: hash(bytes)});
  }
  const write = () => fs.writeFileSync(path.join(root, 'bundle-manifest.json'), JSON.stringify(manifest));
  write();
  return {parent, root, manifest, write};
}
function byteSnapshot(root) {
  const files = {};
  function walk(dir) {
    for (const name of fs.readdirSync(dir).sort()) {
      const file = path.join(dir, name), stat = fs.lstatSync(file);
      if (stat.isDirectory()) walk(file);
      else files[path.relative(root, file)] = hash(fs.readFileSync(file));
    }
  }
  walk(root);
  return files;
}

test('combined bundle verifies streamed binary content, Unicode/spaces and leaves bytes unchanged', (t) => {
  const {root} = fixture(t), before = byteSnapshot(root);
  const result = verifyBundle(root);
  assert.equal(result.status, 'verified');
  assert.equal(result.readOnly, true);
  assert.equal(result.fileCount, 3);
  assert.equal(result.totalBytes, 200012);
  assert.deepEqual(byteSnapshot(root), before);
});
test('missing, extra and tampered files are rejected', async (t) => {
  await t.test('missing', (t) => { const {root} = fixture(t); fs.unlinkSync(path.join(root, 'sample.bin')); assert.throws(() => verifyBundle(root), /Missing bundle file/); });
  await t.test('extra hidden', (t) => { const {root} = fixture(t); fs.writeFileSync(path.join(root, '.unexpected'), 'x'); assert.throws(() => verifyBundle(root), /Unlisted bundle file/); });
  await t.test('same-length tamper', (t) => { const {root} = fixture(t); fs.writeFileSync(path.join(root, 'fix-agent/VERSION'), '1.8.2\n'); assert.throws(() => verifyBundle(root), /Size\/SHA256 mismatch/); });
  await t.test('size tamper', (t) => { const {root} = fixture(t); fs.appendFileSync(path.join(root, 'sample.bin'), 'x'); assert.throws(() => verifyBundle(root), /Size\/SHA256 mismatch/); });
});
test('manifest rejects duplicate, self entry and unsafe paths before hashing', async (t) => {
  await t.test('duplicate', (t) => { const {root, manifest, write} = fixture(t); manifest.files.push(manifest.files[0]); write(); assert.throws(() => verifyBundle(root), /Duplicate/); });
  await t.test('self entry', (t) => { const {root, manifest, write} = fixture(t); manifest.files[0].path = 'bundle-manifest.json'; write(); assert.throws(() => verifyBundle(root), /self-referencing/); });
  for (const unsafe of ['../outside', '/tmp/outside', 'C:/outside', 'a\\outside', 'a//b', './a', 'a/../b', 'a\nfile', 'a\x7ffile']) {
    await t.test(JSON.stringify(unsafe), (t) => { const {root, manifest, write} = fixture(t); manifest.files[0].path = unsafe; write(); assert.throws(() => verifyBundle(root), /Unsafe manifest path/); });
  }
});
test('invalid JSON/schema/size/hash and directory-instead-of-file fail closed', async (t) => {
  await t.test('invalid JSON', (t) => { const {root} = fixture(t); fs.writeFileSync(path.join(root, 'bundle-manifest.json'), '{'); assert.throws(() => verifyBundle(root), /Invalid.*JSON/); });
  for (const mutate of [m => { m.schema = 2; }, m => { m.files = []; }, m => { m.files[0].bytes = -1; }, m => { m.files[0].sha256 = '0'; }]) {
    await t.test('invalid contract', (t) => { const {root, manifest, write} = fixture(t); mutate(manifest); write(); assert.throws(() => verifyBundle(root), /Unsupported|Invalid size/); });
  }
  await t.test('directory for payload', (t) => { const {root} = fixture(t); const file = path.join(root, 'sample.bin'); fs.unlinkSync(file); fs.mkdirSync(file); assert.throws(() => verifyBundle(root), /Missing bundle file/); });
  await t.test('directory for manifest', (t) => { const {root} = fixture(t); const file = path.join(root, 'bundle-manifest.json'); fs.unlinkSync(file); fs.mkdirSync(file); assert.throws(() => verifyBundle(root), /Only regular files/); });
  await t.test('oversize manifest', (t) => { const {root} = fixture(t); const file = path.join(root, 'bundle-manifest.json'); fs.truncateSync(file, 16 * 1024 * 1024 + 1); assert.throws(() => verifyBundle(root), /16 MiB/); });
});
test('symlink roots, directories, payloads and manifests are never followed', {skip: process.platform === 'win32' ? 'Requires symlink permission; not Windows-tested' : false}, async (t) => {
  await t.test('root', (t) => { const {root, parent} = fixture(t); const link = path.join(parent, 'alias'); fs.symlinkSync(root, link); assert.throws(() => verifyBundle(link), /Symbolic links/); });
  await t.test('directory', (t) => { const {root, parent} = fixture(t); fs.mkdirSync(path.join(parent, 'outside')); fs.symlinkSync(path.join(parent, 'outside'), path.join(root, 'alias')); assert.throws(() => verifyBundle(root), /Symbolic links/); });
  for (const name of ['sample.bin', 'bundle-manifest.json']) {
    await t.test(name, (t) => { const {root, parent} = fixture(t); const outside = path.join(parent, 'outside-file'); fs.writeFileSync(outside, 'not read'); fs.unlinkSync(path.join(root, name)); fs.symlinkSync(outside, path.join(root, name)); assert.throws(() => verifyBundle(root), /Symbolic links/); });
  }
});
test('explicit CLI root succeeds and invalid options fail without writes', (t) => {
  const {root} = fixture(t), before = byteSnapshot(root);
  const pass = spawnSync(process.execPath, [script, '--root', root, '--json'], {encoding: 'utf8'});
  assert.equal(pass.status, 0, pass.stderr);
  assert.equal(JSON.parse(pass.stdout).fileCount, 3);
  for (const args of [[], ['--root'], ['--root', root, '--force'], ['--root', root, '--root', root]]) {
    const result = spawnSync(process.execPath, [script, ...args], {encoding: 'utf8'});
    assert.equal(result.status, 1, JSON.stringify(args));
    assert.match(result.stderr, /Bundle verification failed/);
  }
  assert.deepEqual(byteSnapshot(root), before);
});
