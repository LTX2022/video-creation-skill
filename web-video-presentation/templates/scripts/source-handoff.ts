/** Explicit, bounded source selection; never a recursive project archiver. */
import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, readSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { hashLocalFile, safeLocalPath } from './input-revision';
import { localPath } from './delivery-contract';

const MANIFEST = 'source-delivery-manifest.json';
const REPORT = 'source-handoff-report.json';
const LIMITS = { files: 512, fileBytes: 32 * 1024 * 1024, totalBytes: 256 * 1024 * 1024, manifestBytes: 1024 * 1024 };
export const MINIMUM_SOURCE_INPUTS = ['package.json', 'package-lock.json', 'tsconfig.json',
  'src/video/index.ts', 'src/video/RemotionRoot.tsx', 'src/config/videoFormat.ts',
  'src/registry/chapters.ts', 'src/video/render-timing.generated.ts', 'timing-manifest.json'] as const;
const ROOT_FILES = new Set(['package.json', 'package-lock.json', 'tsconfig.json', 'remotion.config.ts',
  'remotion.config.js', 'vite.config.ts', 'vite.config.js', 'index.html', 'project-state.json',
  'composition-manifest.json', 'timing-manifest.json', 'provided-audio-manifest.json',
  'asset-manifest.json', 'README.md', 'LICENSE', 'LICENSE.md', 'LICENSE.txt', 'NOTICE', 'NOTICE.md']);
const SENSITIVE = /(?:^|[._-])(?:secrets?|credentials?|passwords?|(?:access|refresh|auth)[-_]?tokens?|private[-_]?keys?|api[-_]?keys?|service[-_]?accounts?)(?:[._-]|$)|^(?:id_rsa|id_ed25519|auth\.json)$|\.(?:pem|key|p12|pfx|p8|jks|keystore)$/i;
const EXCLUDED_DIRS = /^(?:node_modules|cache|caches|__pycache__|coverage|dist|build|output|tmp|temp)$/i;

export interface SourceHandoffReport {
  schema: 1;
  kind: 'selected-source-snapshot';
  status: 'partial' | 'minimum-inputs-present-not-verified';
  manifest: { path: string; sha256: string };
  rationale: string;
  authorization: { request: string; authenticated: false };
  files: Array<{ path: string; packagePath: string; sha256: string; bytes: number }>;
  minimumInputs: { required: string[]; missing: string[]; met: boolean };
  referencedScriptsNotSelected: string[];
  declaredExclusions: Array<{ path: string; reason: string }>;
  limitations: string[];
}

function textField(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length < 12 || value.length > 4000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) {
    throw new Error(`Source handoff ${label} must be a meaningful recorded text description (12-4000 characters), not an approval boolean`);
  }
  return value.trim();
}

function selectedPath(value: unknown): string {
  if (typeof value !== 'string' || value.length > 512 || /[\\\x00-\x1f\x7f:*?"<>|]/.test(value)) throw new Error('Source handoff requires canonical relative file paths');
  const parts = value.split('/');
  if (parts.some(part => !part || part.startsWith('.') || SENSITIVE.test(part) || EXCLUDED_DIRS.test(part))) throw new Error(`Unsafe, sensitive, or excluded source path: ${value}`);
  if (!ROOT_FILES.has(value) && !(parts.length > 1 && ['src', 'scripts', 'public', 'docs'].includes(parts[0]!))) {
    throw new Error(`Source path is outside the bounded project-source scope: ${value}`);
  }
  return value;
}

/** Checks each component before opening. No directory walk and no link targets. */
function checkedPath(root: string, path: string): string {
  const full = localPath(root, path);
  safeLocalPath(root, path);
  let current = resolve(root);
  for (const part of relative(current, full).split(/[\\/]/)) {
    current = join(current, part);
    try {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink() || (!stat.isDirectory() && (!stat.isFile() || stat.nlink !== 1))) {
        throw new Error(`Linked or nonregular source handoff path rejected: ${path}`);
      }
    } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
  }
  return full;
}

function readBounded(root: string, path: string, maxBytes: number): { bytes: Buffer; sha256: string } {
  const full = checkedPath(root, path);
  const fd = openSync(full, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1 || before.size > maxBytes) throw new Error(`Source file is nonregular, linked, or too large: ${path}`);
    const chunks: Buffer[] = [];
    let size = 0;
    while (true) {
      const chunk = Buffer.allocUnsafe(Math.min(1024 * 1024, maxBytes - size + 1));
      const count = readSync(fd, chunk, 0, chunk.length, null);
      if (count === 0) break;
      size += count;
      if (size > maxBytes) throw new Error(`Source file exceeds byte limit: ${path}`);
      chunks.push(chunk.subarray(0, count));
    }
    const after = fstatSync(fd);
    checkedPath(root, path);
    const current = lstatSync(full);
    if (before.ino !== current.ino || before.dev !== current.dev || before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || current.nlink !== 1) {
      throw new Error(`Source file changed while reading: ${path}`);
    }
    const bytes = Buffer.concat(chunks);
    const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
    if (hashLocalFile(root, path) !== sha256) throw new Error(`Source hash changed before staging: ${path}`);
    return { bytes, sha256 };
  } finally { closeSync(fd); }
}

function assertAbsent(root: string, path: string): void {
  const full = checkedPath(root, path);
  try { lstatSync(full); } catch (error: any) { if (error.code === 'ENOENT') return; throw error; }
  throw new Error(`Source handoff refuses to overwrite an existing package path: ${path}`);
}

function writeNew(root: string, path: string, bytes: Buffer | string): void {
  const full = checkedPath(root, path);
  mkdirSync(dirname(full), { recursive: true });
  checkedPath(root, path);
  writeFileSync(full, bytes, { flag: 'wx', mode: 0o600 });
  checkedPath(root, path);
}

/** Only the exact --include-source opt-in should set includeSource=true. */
export function stageSourceHandoff(root: string, stageDir: string, options: { includeSource: boolean }): SourceHandoffReport | null {
  if (!options.includeSource) return null; // In particular, do not read a stray manifest by default.
  const stage = relative(resolve(root), resolve(stageDir)).replaceAll('\\', '/');
  if (!stage || stage === '..' || stage.startsWith('../') || isAbsolute(stage)) throw new Error('Source staging directory must be inside the project');
  checkedPath(root, stage);
  assertAbsent(root, `${stage}/source-project`);
  assertAbsent(root, `${stage}/${REPORT}`);
  const manifestFile = readBounded(root, MANIFEST, LIMITS.manifestBytes);
  const manifest = JSON.parse(manifestFile.bytes.toString('utf8').replace(/^\uFEFF/, ''));
  if (manifest?.schema !== 1 || manifest?.scope !== 'selected-source-snapshot') throw new Error('Source handoff requires schema 1 and scope selected-source-snapshot');
  const rationale = textField(manifest.rationale, 'rationale');
  const request = textField(manifest.authorization?.request, 'authorization.request');
  if (!Array.isArray(manifest.files) || manifest.files.length === 0 || manifest.files.length > LIMITS.files) throw new Error(`Source files must explicitly select 1-${LIMITS.files} files; directories/globs are unsupported`);
  const paths = manifest.files.map(selectedPath) as string[];
  if (new Set(paths.map(path => path.toLowerCase())).size !== paths.length) throw new Error('Duplicate or case-colliding source selection');
  const declaredExclusions: Array<{path: string; reason: string}> = [];
  if (manifest.excluded !== undefined) {
    if (!Array.isArray(manifest.excluded) || manifest.excluded.length > LIMITS.files) throw new Error('Source excluded must be a bounded array');
    for (const item of manifest.excluded) {
      // Descriptive only: exclusions are never opened, resolved, or copied.
      if (typeof item?.path !== 'string' || !item.path.trim() || item.path.length > 512 || /[\x00-\x1f\x7f]/.test(item.path)) throw new Error('Source excluded path/category must be nonempty descriptive text');
      const path = item.path.trim();
      if (paths.includes(path)) throw new Error(`Source path cannot be both selected and excluded: ${path}`);
      declaredExclusions.push({ path, reason: textField(item?.reason, 'excluded reason') });
    }
  }
  let totalBytes = 0;
  // Validate and snapshot the complete requested selection before creating files.
  const snapshots = paths.map(path => {
    if (resolve(root, path) === resolve(stageDir) || relative(resolve(stageDir), resolve(root, path)).split(/[\\/]/)[0] !== '..') throw new Error('Source selection cannot read from its own package staging tree');
    const snapshot = readBounded(root, path, LIMITS.fileBytes);
    totalBytes += snapshot.bytes.length;
    if (totalBytes > LIMITS.totalBytes) throw new Error('Selected source snapshot exceeds 256 MiB total bound');
    return { path, ...snapshot };
  });
  const missing = MINIMUM_SOURCE_INPUTS.filter(path => !paths.includes(path));
  const scriptReferences = new Set<string>();
  const packageFile = snapshots.find(file => file.path === 'package.json');
  if (packageFile) {
    const pkg = JSON.parse(packageFile.bytes.toString('utf8').replace(/^\uFEFF/, ''));
    // Advisory only: shell parsing/dynamic commands and dependency closure are not proven.
    for (const command of Object.values(pkg.scripts ?? {})) if (typeof command === 'string') {
      for (const match of command.matchAll(/(?:^|[\s"'=])(?:\.\/)?(scripts\/[A-Za-z0-9_./-]+\.(?:[cm]?[jt]sx?|sh|py|json))(?=$|[\s"';&|])/g)) scriptReferences.add(match[1]!);
    }
  }
  const referencedScriptsNotSelected = [...scriptReferences].filter(path => !paths.includes(path)).sort();
  const report: SourceHandoffReport = {
    schema: 1, kind: 'selected-source-snapshot',
    status: missing.length || referencedScriptsNotSelected.length ? 'partial' : 'minimum-inputs-present-not-verified',
    manifest: { path: MANIFEST, sha256: manifestFile.sha256 }, rationale,
    authorization: { request, authenticated: false },
    files: snapshots.map(file => ({ path: file.path, packagePath: `source-project/${file.path}`, sha256: file.sha256, bytes: file.bytes.length })),
    minimumInputs: { required: [...MINIMUM_SOURCE_INPUTS], missing, met: missing.length === 0 },
    referencedScriptsNotSelected, declaredExclusions,
    limitations: [
      'Only explicitly selected files are included. Unselected project files were not enumerated; there is no complete-project or dependency-closure claim.',
      'Minimum inputs are a presence check only. Imports, npm scripts, assets, fonts, runtime versions, browsers, system tools, and remote resources may be missing or require separate installation/authorization.',
      'Offline execution, rendering, and reproducibility of this source snapshot are not verified. No install, script execution, network access, or credential read was performed by this helper.',
      'Authorization text records the task scope; it does not authenticate permission or prove copyright/license clearance. The sender must review selected file contents for secrets and redistribution rights.',
      'Hidden paths, secrets/keys, dependency caches, build/output folders, links, nonregular files, absolute paths and traversal are prohibited. Name checks are not a comprehensive secret detector.',
      'Script-reference diagnostics cover literal scripts/ paths in package.json only; dynamic shell commands and transitive imports are not analyzed.',
      `Bounds: at most ${LIMITS.files} selected files, 32 MiB per file, 256 MiB total. Source bytes and hashes are preserved; original modes/timestamps are not.`,
    ],
  };
  for (const file of snapshots) {
    const target = `${stage}/source-project/${file.path}`;
    writeNew(root, target, file.bytes);
    if (hashLocalFile(root, target) !== file.sha256) throw new Error(`Staged source hash mismatch: ${file.path}`);
  }
  writeNew(root, `${stage}/${REPORT}`, JSON.stringify(report, null, 2) + '\n');
  return report;
}
