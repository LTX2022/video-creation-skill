import { spawnSync } from 'node:child_process';
import { constants, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, relative, resolve } from 'node:path';
import { hashLocalFile, safeLocalPath } from './input-revision';

/** Render destinations are artifacts, never source/config/user media paths. */
export function safeRenderOutput(root: string, output: string, protectedPaths: readonly string[] = []): string {
  const target = safeLocalPath(root, output);
  const rel = relative(resolve(root), target).replaceAll('\\', '/');
  if (!/\.(mp4|mov|webm|mkv)$/i.test(rel) || /^(?:public|src|scripts|node_modules|examples|\.[^/]+)(?:\/|$)/i.test(rel)) {
    throw new Error('Render output must be a video artifact outside source/media/internal directories');
  }
  if (protectedPaths.some((path) => resolve(root, path) === target)) throw new Error('Render output collides with a bound input file');
  if (existsSync(target)) {
    if (!statSync(target).isFile() || statSync(target).nlink > 1) throw new Error('Render output must not be a directory or multiply-linked file');
    // Canonical output/ artifacts are replaceable; elsewhere require a matching
    // prior receipt so an arbitrary user-supplied video can never be overwritten.
    if (!rel.startsWith('output/')) {
      const receipts = safeLocalPath(root, 'output/render-results');
      const known = existsSync(receipts) && readdirSync(receipts).filter((name) => name.endsWith('.json')).some((name) => {
        try {
          const receipt = JSON.parse(readFileSync(safeLocalPath(root, `output/render-results/${name}`), 'utf8'));
          return resolve(root, receipt.output) === target && receipt.sha256?.toUpperCase() === hashLocalFile(root, rel);
        } catch { return false; }
      });
      if (!known) throw new Error('Existing custom output is not a verified prior render; choose a new path to preserve user media');
    }
  }
  return target;
}

/** Full audiovisual decode, not metadata-only evidence. Does not certify visual content. */
export function validateDecodedMedia(source: string, ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg') {
  const decode = spawnSync(ffmpeg, ['-v', 'error', '-nostdin', '-xerror', '-err_detect', 'explode', '-threads', '1',
    '-protocol_whitelist', 'file,pipe', '-i', source, '-map', '0:v:0', '-map', '0:a?',
    '-progress', 'pipe:1', '-nostats', '-f', 'null', '-'],
    { encoding: 'utf8', timeout: 30 * 60 * 1000, maxBuffer: 4 * 1024 * 1024 });
  if (decode.error || decode.status !== 0) throw new Error(`Full audiovisual decode failed: ${String(decode.error?.message ?? decode.stderr).slice(-4000)}`);
  const frames = [...decode.stdout.matchAll(/^frame=(\d+)\s*$/gm)].map((m) => Number(m[1])).at(-1) ?? 0;
  if (frames < 1 || !decode.stdout.includes('progress=end')) throw new Error('Full audiovisual decode produced no completed video frames');
  return { pass: true, decodedVideoFrames: frames, scope: 'all frames of the primary video stream and all audio streams', limitations: 'Decodability only; does not prove overlays, captions, correct mixing, or perceptual quality.' };
}

/** No renderer ever opens the destination itself; preserve existing artifacts on failure. */
export function stagedRenderOutput(root: string, output: string, protectedPaths: readonly string[] = []) {
  const target = safeRenderOutput(root, output, protectedPaths);
  mkdirSync(dirname(target), { recursive: true });
  const directory = mkdtempSync(resolve(dirname(target), '.render-staging-'));
  const temporary = resolve(directory, `media${extname(target)}`);
  const backup = resolve(directory, `previous${extname(target)}`);
  let committed = false;
  let recoveryRequired = false;
  return {
    temporary,
    commit() {
      safeRenderOutput(root, output, protectedPaths);
      safeOutputFile(root, relative(resolve(root), temporary));
      if (!existsSync(temporary) || !statSync(temporary).isFile() || statSync(temporary).size === 0) throw new Error(`Rendered artifact missing or empty: ${basename(output)}`);
      if (existsSync(target)) copyFileSync(target, backup, constants.COPYFILE_EXCL | constants.COPYFILE_FICLONE);
      try { renameSync(temporary, target); committed = true; }
      catch (error) { if (existsSync(backup)) renameSync(backup, target); throw error; }
    },
    rollback() {
      if (!committed) return;
      try {
        safeLocalPath(root, output);
        if (existsSync(backup)) renameSync(backup, target);
        else rmSync(target, { force: true });
        committed = false;
      } catch(error) {
        recoveryRequired = true;
        throw new Error(`Artifact rollback failed; recovery files retained at ${directory}: ${String(error)}`);
      }
    },
    cleanup() { if (!recoveryRequired) rmSync(directory, { recursive: true, force: true }); },
  };
}


/** Validate a generated receipt/state/log file before reading or writing it. */
export function safeOutputFile(root: string, path: string): string {
  const full = safeLocalPath(root, path);
  if (existsSync(full) && (!statSync(full).isFile() || statSync(full).nlink !== 1)) throw new Error(`Unsafe output file (nonregular or hardlinked): ${path}`);
  return full;
}
export function atomicOutputWrite(root: string, path: string, data: string | Buffer) {
  const full = safeOutputFile(root, path);
  mkdirSync(dirname(full), {recursive:true});
  const temporaryDir = mkdtempSync(resolve(dirname(full), '.receipt-staging-'));
  try {
    const temporary = resolve(temporaryDir, 'data');
    writeFileSync(temporary, data, {flag:'wx'});
    safeOutputFile(root, path);
    renameSync(temporary, full);
  } finally { rmSync(temporaryDir, {recursive:true,force:true}); }
}
/** Roll back multi-file receipt/state changes if any later write or log fails. */
export function withOutputRollback<T>(root: string, paths: readonly string[], action: () => T): T {
  const snapshots = paths.map((path) => {
    const full = safeOutputFile(root,path);
    if (existsSync(full) && statSync(full).size > 32*1024*1024) throw new Error(`Output transaction file too large: ${path}`);
    return {path, data:existsSync(full)?readFileSync(full):null};
  });
  try { return action(); }
  catch(error) {
    for(const {path,data} of snapshots) {
      if(data===null)rmSync(safeOutputFile(root,path),{force:true});
      else atomicOutputWrite(root,path,data);
    }
    throw error;
  }
}
