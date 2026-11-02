/** Sparse review only. One bundle + browser + metadata lookup per invocation, never a final-video cache. */
import {bundle} from '@remotion/bundler';
import {makeCancelSignal, openBrowser, renderFrames, selectComposition, type LogLevel} from '@remotion/renderer';
import {copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {installedBrowser} from './browser';

export interface ReviewFrame {frame: number; out: string}
export interface ReviewRenderOptions {
  root: string;
  composition: string;
  jobs: ReviewFrame[];
  browserExecutable?: string | null;
  concurrency?: number;
  scale?: number;
  port?: number | null;
  logLevel?: LogLevel;
  inputProps?: Record<string, unknown>;
  envVariables?: Record<string, string>;
  signal?: AbortSignal;
}
/** Injectable only for offline lifecycle/argument tests; not render-performance evidence. */
export interface ReviewBackend {
  bundle: typeof bundle;
  openBrowser: typeof openBrowser;
  selectComposition: typeof selectComposition;
  renderFrames: typeof renderFrames;
  makeCancelSignal: typeof makeCancelSignal;
}
const realBackend: ReviewBackend = {bundle, openBrowser, selectComposition, renderFrames, makeCancelSignal};

export function reviewFramePlan(jobs: ReviewFrame[]): Map<number, string[]> {
  if (!jobs.length) throw new Error('No review frames requested');
  const byFrame = new Map<number, string[]>();
  const byOutput = new Map<string, number>();
  for (const job of jobs) {
    if (!Number.isInteger(job.frame) || job.frame < 0) throw new Error('Review frames must be non-negative integers');
    const out = resolve(job.out);
    if (byOutput.has(out) && byOutput.get(out) !== job.frame) throw new Error(`Conflicting frames target ${out}`);
    byOutput.set(out, job.frame);
    const destinations = byFrame.get(job.frame) ?? [];
    if (!destinations.includes(out)) destinations.push(out);
    byFrame.set(job.frame, destinations);
  }
  return new Map([...byFrame].sort(([a], [b]) => a - b));
}

export function reviewPort(value: string | null): number | null {
  if (value === null) return null; // Renderer allocates its own available port.
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('--port must be an integer from 1024 to 65535');
  return port;
}

/** Only known, non-secret visual switches are forwarded into the browser. */
export function reviewEnvironment(): Record<string, string> {
  return Object.fromEntries(['REMOTION_SUBTITLES', 'REMOTION_CAPTIONS']
    .filter((key) => process.env[key] !== undefined).map((key) => [key, process.env[key]!]));
}

export async function renderReviewFrames(options: ReviewRenderOptions, backend: ReviewBackend = realBackend) {
  const plan = reviewFramePlan(options.jobs);
  const frames = [...plan.keys()];
  const concurrency = options.concurrency ?? 2;
  const scale = options.scale ?? 1;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 6) throw new Error('Review concurrency must be an integer from 1 to 6');
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('Review scale must be positive');
  if (options.port !== null && options.port !== undefined) reviewPort(String(options.port));
  const logLevel = options.logLevel ?? 'warn';
  if (!['error', 'warn', 'info', 'verbose', 'trace'].includes(logLevel)) throw new Error('Invalid review log level');
  // API does not silently consume CLI configuration. Scaffold has no config file.
  const customConfig = ['remotion.config.ts', 'remotion.config.js', 'remotion.config.mjs', 'remotion.config.cjs']
    .find((name) => existsSync(resolve(options.root, name)));
  if (customConfig) throw new Error(`${customConfig} is not automatically applied by the review API. Port its required settings explicitly into review-render.ts before rendering.`);
  const browserExecutable = installedBrowser(options.browserExecutable); // Resolve before preparing anything; no implicit downloads.
  const work = mkdtempSync(join(tmpdir(), 'video-review-'));
  const {cancelSignal, cancel} = backend.makeCancelSignal();
  let browser: Awaited<ReturnType<typeof openBrowser>> | undefined;
  let closing: Promise<void> | undefined;
  let cancelled = options.signal?.aborted ?? false;
  let resolvedConcurrency: number | null = null;
  let primaryError: unknown;
  const received = new Set<number>();
  const closeBrowser = () => {
    if (browser && !closing) closing = browser.close({silent: true});
    return closing ?? Promise.resolve();
  };
  const requestCancel = () => {
    cancelled = true;
    cancel();
    // selectComposition has no cancelSignal; closing its browser also interrupts metadata work.
    void closeBrowser().catch(() => {}); // finally awaits and surfaces cleanup errors.
  };
  const assertNotCancelled = () => {if (cancelled) throw new Error('Review rendering cancelled');};
  const onInterrupt = () => {process.exitCode = 130; requestCancel();};
  const onTerminate = () => {process.exitCode = 143; requestCancel();};
  process.once('SIGINT', onInterrupt);
  process.once('SIGTERM', onTerminate);
  options.signal?.addEventListener('abort', requestCancel, {once: true});
  try {
    assertNotCancelled();
    const serveUrl = await backend.bundle({entryPoint: resolve(options.root, 'src/video/index.ts'), rootDir: options.root,
      publicDir: resolve(options.root, 'public'), outDir: join(work, 'bundle')});
    assertNotCancelled();
    browser = await backend.openBrowser('chrome', {browserExecutable, logLevel});
    assertNotCancelled();
    const shared = {serveUrl, puppeteerInstance: browser, browserExecutable, port: options.port ?? null,
      envVariables: options.envVariables ?? {}, inputProps: options.inputProps ?? {}, logLevel};
    const composition = await backend.selectComposition({...shared, id: options.composition});
    assertNotCancelled();
    if (frames.some((frame) => frame >= composition.durationInFrames)) throw new Error('Review frame outside composition duration');
    await backend.renderFrames({...shared, composition, frames, outputDir: null, imageFormat: 'png', muted: true,
      concurrency, scale, cancelSignal,
      onStart: (data) => {resolvedConcurrency = data.resolvedConcurrency;},
      onFrameUpdate: () => {},
      onFrameBuffer: (buffer, frame) => {
        assertNotCancelled();
        if (!plan.has(frame) || received.has(frame) || buffer.length === 0) throw new Error(`Unexpected or invalid review frame ${frame}`);
        writeFileSync(join(work, `${frame}.png`), buffer);
        received.add(frame);
      },
    });
    assertNotCancelled();
    if (received.size !== frames.length) throw new Error(`Incomplete review render: ${received.size}/${frames.length} unique frames`);
    // Publish only after every requested frame succeeded; no file-exists reuse or cross-run cache.
    for (const [frame, outputs] of plan) for (const output of outputs) {
      mkdirSync(dirname(output), {recursive: true});
      copyFileSync(join(work, `${frame}.png`), output);
    }
    return {backend: 'remotion-renderFrames', remotionVersion: '4.0.539', requestedFrames: options.jobs.length,
      uniqueFrames: frames.length, requestedConcurrency: concurrency, resolvedConcurrency, scale,
      compositionMetadata: {id: composition.id, fps: composition.fps, width: composition.width, height: composition.height, durationInFrames: composition.durationInFrames}};
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {await closeBrowser();}
    catch (cleanupError) {
      if (primaryError) throw new AggregateError([primaryError, cleanupError], "Review render and browser close failure");
      throw cleanupError;
    } finally {
      process.removeListener('SIGINT', onInterrupt);
      process.removeListener('SIGTERM', onTerminate);
      options.signal?.removeEventListener('abort', requestCancel);
      rmSync(work, {recursive: true, force: true});
    }
  }
}

/** Inclusive continuous range at the composition's original fps, including contextual handles. */
export function continuousReviewRange(start: number, duration: number, total: number, padding = 0) {
  if (![start, duration, total, padding].every(Number.isInteger) || start < 0 || duration < 1 || total < start + duration || padding < 0) {
    throw new Error('Invalid continuous review range');
  }
  const frameRange: [number, number] = [Math.max(0, start - padding), Math.min(total - 1, start + duration - 1 + padding)];
  return {frameRange, command: `npm run render:segment -- --frames=${frameRange[0]}-${frameRange[1]} --acknowledge-draft`, evidence: 'not-rendered' as const};
}

/** The segment route cannot accidentally publish a full/final video or skip frames. */
export function segmentRenderArguments(args: string[], contractMode: string, totalFrames: number): string[] {
  const values = new Map<string, string>();
  const switches = new Set(['--quiet', '--subtitles', '--acknowledge-draft']);
  const permitted = new Set(['--frames', '--output-mode', '--browser-executable', '--concurrency', '--port']);
  const forwarded: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (switches.has(arg)) {forwarded.push(arg); continue;}
    const equal = arg.indexOf('=');
    const key = equal === -1 ? arg : arg.slice(0, equal);
    if (!permitted.has(key)) throw new Error(`Unsupported segment option ${key}; preset, scale, frame stride and output are fixed for continuous partial review`);
    const value = equal === -1 ? args[++index] : arg.slice(equal + 1);
    if (!value || value.startsWith('--') || values.has(key)) throw new Error(`Missing or duplicate segment option ${key}`);
    values.set(key, value);
  }
  const range = values.get('--frames')?.match(/^(\d+)-(\d+)$/);
  if (!range) throw new Error('Continuous segment review requires --frames=START-END (inclusive)');
  const start = Number(range[1]), end = Number(range[2]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end <= start || !Number.isSafeInteger(totalFrames) || totalFrames < 1 || end >= totalFrames) throw new Error('Segment review needs at least two frames within the current composition timing');
  const mode = values.get('--output-mode') ?? (contractMode === 'both' ? 'composite' : contractMode);
  if (!['opaque', 'alpha', 'composite'].includes(mode)) throw new Error('Segment mode must be opaque, alpha or composite; review both modes separately');
  if (mode === 'alpha' && forwarded.includes('--subtitles')) throw new Error('Alpha segment cannot burn subtitles');
  for (const key of ['--browser-executable', '--concurrency', '--port']) if (values.has(key)) forwarded.push(`${key}=${values.get(key)}`);
  return [...forwarded, '--preset=quality', '--scale=1', '--every-nth-frame=1', `--frames=${start}-${end}`,
    `--output-mode=${mode}`, `--output=output/review-${mode}-${start}-${end}.${mode === 'alpha' ? 'mov' : 'mp4'}`];
}
