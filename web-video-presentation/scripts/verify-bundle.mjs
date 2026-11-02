#!/usr/bin/env node
/** Read-only verifier for an extracted combined release, not the core skill package. */
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const MANIFEST = 'bundle-manifest.json';
const MAX_MANIFEST_BYTES = 16 * 1024 * 1024;
const fail = (message) => { throw new Error(message); };
const sameFile = (a, b) => a.dev === b.dev && a.ino === b.ino && a.size === b.size
  && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;

function relativeFile(value) {
  if (typeof value !== 'string' || !value || /[\\\x00-\x1f\x7f:]/u.test(value)
    || value.startsWith('/') || value.split('/').some((part) => ['', '.', '..'].includes(part))) {
    fail(`Unsafe manifest path: ${JSON.stringify(value)}`);
  }
  return value;
}

function plainPath(target) {
  let current = path.resolve(target);
  while (true) {
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) fail(`Symbolic links are not allowed: ${current}`);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

/** Open a regular file without following its final symlink; check its identity before/after. */
function readFileSafely(file, consume) {
  plainPath(file);
  const before = fs.lstatSync(file);
  if (!before.isFile()) fail(`Only regular files are allowed: ${file}`);
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || !sameFile(before, opened)) fail(`File changed while opening: ${file}`);
    const result = consume(fd, opened);
    if (!sameFile(opened, fs.fstatSync(fd))) fail(`File changed while reading: ${file}`);
    plainPath(file);
    if (!sameFile(opened, fs.lstatSync(file))) fail(`File changed after reading: ${file}`);
    return result;
  } finally { fs.closeSync(fd); }
}

function fileDigest(file) {
  return readFileSafely(file, (fd) => {
    const hash = createHash('sha256');
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let bytes = 0, count;
    while ((count = fs.readSync(fd, buffer, 0, buffer.length, null)) !== 0) {
      bytes += count;
      hash.update(buffer.subarray(0, count));
    }
    return {bytes, sha256: hash.digest('hex')};
  });
}

function inventory(root) {
  const files = [];
  function walk(relative = '') {
    const directory = path.join(root, relative);
    plainPath(directory);
    const before = fs.lstatSync(directory);
    if (!before.isDirectory()) fail(`Not a regular directory: ${directory}`);
    for (const name of fs.readdirSync(directory).sort()) {
      const rel = relative ? `${relative}/${name}` : name;
      relativeFile(rel);
      const file = path.join(root, rel), stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) fail(`Symbolic links are not allowed: ${rel}`);
      if (stat.isDirectory()) walk(rel);
      else if (stat.isFile()) files.push(rel);
      else fail(`Only regular files/directories are allowed: ${rel}`);
    }
    if (!sameFile(before, fs.lstatSync(directory))) fail(`Directory changed while checking: ${directory}`);
  }
  walk();
  return files.sort();
}

export function verifyBundle(selectedRoot) {
  if (typeof selectedRoot !== 'string' || !selectedRoot.trim()) fail('Select an extracted bundle with --root; there is no default directory');
  if (/[\x00-\x1f\x7f]/u.test(selectedRoot) || selectedRoot.split(/[\\/]/u).includes('..')) fail('Unsafe bundle root');
  if (process.platform !== 'win32' && (/^[A-Za-z]:/u.test(selectedRoot) || selectedRoot.startsWith('\\\\'))) fail('Windows bundle path is not usable on this host');
  const root = path.resolve(selectedRoot);
  plainPath(root);
  if (!fs.lstatSync(root).isDirectory()) fail('Bundle root must be an existing directory');
  const manifestPath = path.join(root, MANIFEST);
  const manifestBytes = readFileSafely(manifestPath, (fd, stat) => {
    if (stat.size > MAX_MANIFEST_BYTES) fail('Bundle manifest exceeds the supported 16 MiB limit');
    return fs.readFileSync(fd);
  });
  let manifest;
  try { manifest = JSON.parse(manifestBytes.toString('utf8').replace(/^\uFEFF/u, '')); }
  catch { fail('Invalid bundle-manifest.json JSON'); }
  if (manifest?.schema !== 1 || !Array.isArray(manifest.files) || !manifest.files.length
    || typeof manifest.version !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(manifest.version)) {
    fail('Unsupported combined bundle manifest; expected schema 1, version and nonempty files[]');
  }
  const expected = new Map();
  for (const entry of manifest.files) {
    const name = relativeFile(entry?.path);
    if (name === MANIFEST || expected.has(name)) fail(`Duplicate or self-referencing manifest entry: ${name}`);
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[0-9a-f]{64}$/u.test(entry.sha256 || '')) fail(`Invalid size/SHA256 entry: ${name}`);
    expected.set(name, entry);
  }
  const actual = inventory(root);
  for (const name of actual) if (name !== MANIFEST && !expected.has(name)) fail(`Unlisted bundle file: ${name}`);
  const present = new Set(actual);
  for (const name of expected.keys()) if (!present.has(name)) fail(`Missing bundle file: ${name}`);
  let totalBytes = 0;
  for (const [name, entry] of expected) {
    const result = fileDigest(path.join(root, name));
    if (result.bytes !== entry.bytes || result.sha256 !== entry.sha256) fail(`Size/SHA256 mismatch: ${name}`);
    totalBytes += result.bytes;
    if (!Number.isSafeInteger(totalBytes)) fail('Bundle byte total exceeds supported range');
  }
  if (JSON.stringify(inventory(root)) !== JSON.stringify(actual)
    || fileDigest(manifestPath).sha256 !== createHash('sha256').update(manifestBytes).digest('hex')) fail('Bundle changed during verification');
  return {schema: 1, status: 'verified', readOnly: true, version: manifest.version,
    bundleRoot: root, fileCount: expected.size, totalBytes, manifest: MANIFEST,
    scope: 'Exact extracted file inventory and SHA256/size against the supplied manifest; ZIP files are hashed as files, not unpacked.',
    limits: 'Integrity only, not a signature, trusted provenance, installation, execution, visual acceptance or target-platform compatibility. Verify a stable directory; this is not a hostile concurrent-filesystem sandbox.'};
}

export function main(args = process.argv.slice(2)) {
  try {
    let root, json = false;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--help' || arg === '-h') {
        console.log('Read-only: node scripts/verify-bundle.mjs --root <extracted-combined-release> [--json]\nChecks bundle-manifest.json with exact file coverage, size and streamed SHA256. No installs, subprocesses or network. Core-only packages use package-skill.ts --verify instead.');
        return 0;
      }
      if (arg === '--json') { if (json) fail('Duplicate --json'); json = true; continue; }
      if (arg === '--root' || arg.startsWith('--root=')) {
        if (root !== undefined) fail('Duplicate --root');
        root = arg === '--root' ? args[++i] : arg.slice(7);
        if (!root || root.startsWith('--')) fail('Missing --root value');
      } else fail(`Unsupported argument: ${arg}`);
    }
    const result = verifyBundle(root);
    console.log(json ? JSON.stringify(result, null, 2) : `Bundle integrity verified: ${result.version}; ${result.fileCount} files; ${result.totalBytes} bytes.\n${result.scope}\n${result.limits}`);
    return 0;
  } catch (error) {
    console.error(`Bundle verification failed: ${error.message}`);
    return 1;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
