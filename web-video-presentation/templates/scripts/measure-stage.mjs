#!/usr/bin/env node
/** Local opt-out leaf-command evidence. No argv/env values, output capture, network or background work.
 * --begin [--run-id=ID] / --resume --run-id=ID / --end explicitly delimit a project run.
 * Without an active/explicit run each invocation gets an isolated UUID; old runs are never merged.
 * --best-effort is used by production npm commands: evidence failures do not change their exit status.
 * VWP_METRICS=off disables evidence. Direct manual usage remains fail-closed on unsafe log paths.
 * Started/finished schema 2 records share an eventId; a missing finish is unknown, not zero/success.
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { constants as osConstants } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const LOG_RELATIVE = 'output/metrics/stage-events.jsonl';
const STAGES = new Set(['setup', 'assets', 'audio', 'timing', 'typecheck', 'build', 'preflight', 'qa', 'render', 'validate', 'package', 'cover']);
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const USAGE = 'Usage: measure-stage.mjs --stage=<stage> --label=<safe-label> [--run-id=<safe-id>] [--attempt=1] [--workload-id=<safe-id>] [--best-effort] -- <command> <args...> | --begin [--run-id=ID] | --resume --run-id=ID | --end';
const warn = (message) => process.stderr.write(`[measure-stage] ${message}\n`);

function parseArgs(args) {
  const separator = args.indexOf('--');
  const metadata = separator < 0 ? args : args.slice(0, separator);
  const options = {};
  const allowed = new Set(['stage', 'label', 'run-id', 'attempt', 'workload-id']);
  for (const argument of metadata) {
    if (['--begin', '--resume', '--end', '--best-effort'].includes(argument)) {
      const key = argument.slice(2);
      if (Object.hasOwn(options, key)) throw new Error('Duplicate option.');
      options[key] = true;
      continue;
    }
    const match = /^--([a-z-]+)=(.*)$/.exec(argument);
    if (!match || !allowed.has(match[1])) throw new Error('Unknown or malformed option; use --name=value.');
    const [, key, value] = match;
    if (Object.hasOwn(options, key)) throw new Error('Duplicate option.');
    options[key] = value;
  }
  for (const key of ['label', 'run-id', 'workload-id']) {
    if (Object.hasOwn(options, key) && !SAFE_ID.test(options[key])) {
      throw new Error(`${key} must be 1–128 safe ASCII letters/digits/dots/underscores/hyphens, starting with a letter or digit. Do not use secrets.`);
    }
  }
  const controls = ['begin', 'resume', 'end'].filter((key) => options[key]);
  if (controls.length) {
    const mode = controls[0];
    if (controls.length !== 1 || separator >= 0 || Object.keys(options).some((key) => ![mode, 'run-id'].includes(key)) || (mode === 'resume' && !options['run-id']) || (mode === 'end' && options['run-id'])) throw new Error('Invalid run lifecycle options.');
    return { mode, runId: options['run-id'] };
  }
  if (separator < 0 || separator === args.length - 1) throw new Error('A command after -- is required.');
  if (!STAGES.has(options.stage)) throw new Error(`stage must be one of: ${[...STAGES].join(', ')}.`);
  if (!SAFE_ID.test(options.label ?? '')) throw new Error('A safe label is required.');
  if (options.attempt !== undefined && (!/^[1-9][0-9]*$/.test(options.attempt) || !Number.isSafeInteger(Number(options.attempt)))) throw new Error('attempt must be a positive safe integer.');
  const command = args[separator + 1];
  const commandArgs = args.slice(separator + 2);
  if (!command || command.includes('\0') || commandArgs.some((value) => value.includes('\0'))) throw new Error('The command must be nonempty; command arguments cannot contain NUL.');
  return { stage: options.stage, label: options.label, runId: options['run-id'], attempt: options.attempt === undefined ? null : Number(options.attempt), workloadId: options['workload-id'] ?? null, bestEffort: options['best-effort'] === true, command, commandArgs };
}

// Refuse symlinks/hardlinks in all evidence paths. This does not sandbox authorized child commands.
function metricsDir(create = false, extra = []) {
  let directory = fs.realpathSync(process.cwd());
  for (const segment of ['output', 'metrics', ...extra]) {
    directory = path.join(directory, segment);
    if (create) { try { fs.mkdirSync(directory); } catch (error) { if (error.code !== 'EEXIST') throw error; } }
    const stat = fs.lstatSync(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory() || fs.realpathSync(directory) !== directory) throw new Error('Unsafe metrics directory.');
  }
  return directory;
}
function checkFile(filename) {
  try {
    const stat = fs.lstatSync(filename);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) throw new Error('Unsafe metrics file.');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
function openFile(filename, flags) {
  checkFile(filename);
  const descriptor = fs.openSync(filename, flags | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
  const stat = fs.fstatSync(descriptor);
  if (!stat.isFile() || stat.nlink !== 1) { fs.closeSync(descriptor); throw new Error('Unsafe metrics file.'); }
  return descriptor;
}
function readJson(filename) {
  const descriptor = openFile(filename, fs.constants.O_RDONLY);
  try {
    if (fs.fstatSync(descriptor).size > 16384) throw new Error('Invalid metrics metadata.');
    return JSON.parse(fs.readFileSync(descriptor, 'utf8'));
  } finally { fs.closeSync(descriptor); }
}
function writeJson(filename, data, exclusive = false) {
  const descriptor = openFile(filename, fs.constants.O_WRONLY | fs.constants.O_CREAT | (exclusive ? fs.constants.O_EXCL : fs.constants.O_TRUNC));
  try { fs.writeFileSync(descriptor, `${JSON.stringify(data, null, 2)}\n`); fs.fsyncSync(descriptor); }
  finally { fs.closeSync(descriptor); }
}
function activeRun() {
  try {
    const value = readJson(path.join(metricsDir(), 'active-run.json'));
    if (value?.schema !== 1 || !SAFE_ID.test(value.runId ?? '')) throw new Error('Invalid active run.');
    return value;
  } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
// Lifecycle transitions are exclusive; contenders fail closed rather than
// replacing a run that another caller has just selected. A leftover lock is
// never stolen automatically (PID reuse/host loss cannot prove ownership).
function withLifecycleLock(directory, action) {
  const filename = path.join(directory, '.run-lifecycle.lock');
  let descriptor;
  try { descriptor = openFile(filename, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL); }
  catch (error) {
    if (error.code === 'EEXIST') {
      const locked = new Error('Run lifecycle is locked.');
      locked.code = 'METRICS_LIFECYCLE_LOCKED';
      throw locked;
    }
    throw error;
  }
  const owner = fs.fstatSync(descriptor);
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify({ schema: 1, owner: randomUUID() })}\n`);
    fs.fsyncSync(descriptor);
    return action();
  } finally {
    fs.closeSync(descriptor);
    // Do not unlink a replacement lock if the path was changed externally.
    try {
      const current = fs.lstatSync(filename);
      if (current.isFile() && current.nlink === 1 && current.dev === owner.dev && current.ino === owner.ino) fs.unlinkSync(filename);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
function writeActiveRun(directory, metadata) {
  const filename = path.join(directory, 'active-run.json');
  const temporary = path.join(directory, `.active-run.${randomUUID()}.tmp`);
  try {
    writeJson(temporary, metadata, true);
    checkFile(filename);
    // Readers see the previous whole record or the new whole record, never a
    // truncated JSON file while a same-ID resume publishes its active marker.
    fs.renameSync(temporary, filename);
  } finally {
    try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
function lifecycle(options) {
  const directory = metricsDir(true);
  return withLifecycleLock(directory, () => {
    const active = activeRun();
    if (options.mode === 'end') {
      if (!active) throw new Error('No active run to end.');
      fs.unlinkSync(path.join(directory, 'active-run.json'));
      warn(`ended runId=${active.runId}; later commands are isolated until begin/resume.`);
      return 0;
    }
    const runId = options.runId ?? randomUUID();
    if (active && (options.mode === 'begin' || active.runId !== runId)) throw new Error('An active run exists; end it before selecting another run.');
    const runFile = path.join(metricsDir(true, ['runs']), `${runId}.json`);
    let metadata;
    if (options.mode === 'begin') {
      metadata = { schema: 1, runId, startedAt: new Date().toISOString() };
      writeJson(runFile, metadata, true);
    } else {
      metadata = readJson(runFile);
      if (metadata?.schema !== 1 || metadata.runId !== runId) throw new Error('Invalid saved run.');
    }
    writeActiveRun(directory, metadata);
    warn(`${options.mode === 'begin' ? 'began' : 'resumed'} project runId=${runId}; use --end when this work is finished.`);
    return 0;
  });
}
function safeErrorCode(error) { return typeof error?.code === 'string' && /^[A-Z][A-Z0-9_]{0,31}$/.test(error.code) ? error.code : 'SPAWN_ERROR'; }
function appendEvent(descriptor, event) {
  fs.appendFileSync(descriptor, `${JSON.stringify(event)}\n`, 'utf8');
  fs.fsyncSync(descriptor);
}
async function execute(options, descriptor = null) {
  const eventId = randomUUID();
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const base = { schema: 2, runId: options.runId, scope: options.scope, eventId, stage: options.stage, label: options.label, attempt: options.attempt ?? 1, workloadId: options.workloadId, measurement: 'observed-command', command: path.basename(options.command), startedAt };
  if (descriptor !== null) {
    try { appendEvent(descriptor, { ...base, eventType: 'started', status: 'running', elapsedMs: null, exitCode: null, signal: null, finishedAt: null }); }
    catch {
      warn('Start evidence could not be saved; timing coverage is unknown.');
      if (!options.bestEffort) return 74;
      descriptor = null;
    }
  }
  let requestedSignal = null;
  const handlers = new Map();
  const result = await new Promise((resolve) => {
    let child;
    let spawnError = null;
    try {
      const env = { ...process.env };
      if (options.runId) env.VWP_METRICS_RUN_ID = options.runId;
      if (descriptor !== null) env.VWP_METRICS_PARENT_EVENT = eventId;
      child = spawn(options.command, options.commandArgs, { shell: false, stdio: 'inherit', env });
    } catch (error) { resolve({ exitCode: null, signal: null, error }); return; }
    child.once('error', (error) => { spawnError = error; });
    child.once('close', (exitCode, signal) => resolve({ exitCode: spawnError ? null : exitCode, signal, error: spawnError }));
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
      const handler = () => { requestedSignal ??= signal; try { child.kill(signal); } catch { /* direct child, best effort */ } };
      handlers.set(signal, handler); process.on(signal, handler);
    }
  });
  for (const [signal, handler] of handlers) process.removeListener(signal, handler);
  const signal = result.signal ?? requestedSignal;
  const status = result.error ? 'spawn-error' : signal ? 'interrupted' : result.exitCode === 0 ? 'success' : 'failed';
  const exitCode = result.error ? (result.error.code === 'ENOENT' ? 127 : 126) : signal ? 128 + (osConstants.signals[signal] ?? 1) : result.exitCode ?? 1;
  if (descriptor !== null) {
    const elapsedMs = Math.max(0, performance.now() - started);
    const event = { ...base, eventType: 'finished', status, exitCode: result.exitCode, signal, elapsedMs, finishedAt: new Date().toISOString(), ...(result.error ? { errorCode: safeErrorCode(result.error) } : {}) };
    try { appendEvent(descriptor, event); }
    catch { warn('Command finished, but finish evidence could not be saved.'); return options.bestEffort || exitCode !== 0 ? exitCode : 74; }
    warn(`runId=${event.runId} scope=${event.scope} stage=${event.stage} status=${status} elapsedMs=${elapsedMs.toFixed(3)} log=${LOG_RELATIVE}`);
  }
  return exitCode;
}
async function main() {
  let options;
  try { options = parseArgs(process.argv.slice(2)); }
  catch (error) { warn(`${error.message}\n${USAGE}`); return 2; }
  if (options.mode) {
    try { return lifecycle(options); }
    catch (error) {
      warn(error.code === 'METRICS_LIFECYCLE_LOCKED'
        ? 'Run lifecycle is locked at output/metrics/.run-lifecycle.lock; no run was selected or ended. Retry after the current transition finishes. If a prior process crashed, inspect the lock and confirm no lifecycle command is running before manual removal; no automatic takeover.'
        : 'Cannot safely select/end this run. Use a new safe ID for begin, an existing ID for resume, and end the active run before switching.');
      return 73;
    }
  }
  if (process.env.VWP_METRICS === 'off' || SAFE_ID.test(process.env.VWP_METRICS_PARENT_EVENT ?? '')) return execute(options);
  let descriptor = null;
  try {
    const inherited = SAFE_ID.test(process.env.VWP_METRICS_RUN_ID ?? '') ? process.env.VWP_METRICS_RUN_ID : null;
    const active = options.runId || inherited ? null : activeRun();
    options.scope = options.runId || inherited || active ? 'project-run' : 'isolated-invocation';
    options.runId ??= inherited ?? active?.runId ?? randomUUID();
    const filename = path.join(metricsDir(true), 'stage-events.jsonl');
    // Repeated calls are not necessarily retries; only an explicit --attempt claims that.
    options.attempt ??= 1;
    descriptor = openFile(filename, fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_CREAT);
  } catch {
    warn('Cannot safely open local metrics; coverage is unknown. Symlinks/non-regular files are refused.');
    if (!options.bestEffort) return 73;
  }
  try { return await execute(options, descriptor); }
  finally { if (descriptor !== null) fs.closeSync(descriptor); }
}
try { process.exitCode = await main(); }
catch { warn('Unexpected wrapper failure; event persistence is not guaranteed.'); process.exitCode = 1; }
