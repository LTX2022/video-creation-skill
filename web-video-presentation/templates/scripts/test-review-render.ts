/** Offline contract tests. Synthetic bytes/fake renderer are NOT visual, speed, or browser E2E evidence. */
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {makeCancelSignal} from '@remotion/renderer';
import {continuousReviewRange, renderReviewFrames, reviewEnvironment, reviewFramePlan, reviewPort, segmentRenderArguments,
  type ReviewBackend, type ReviewRenderOptions} from './review-render';

const root = mkdtempSync(join(tmpdir(), 'review-contract-test-'));
let count = 0;
async function check(label: string, run: () => void | Promise<void>) {await run(); count++; console.log(`PASS ${label}`);}
function fixture() {
  const calls = {bundle: 0, open: 0, select: 0, render: 0, close: 0};
  let bundlePath = '';
  let renderOptions: Parameters<ReviewBackend['renderFrames']>[0] | null = null;
  const browser = {close: async () => {calls.close++;}} as unknown as Awaited<ReturnType<ReviewBackend['openBrowser']>>;
  const config = {id: 'full-video', fps: 60, width: 1920, height: 1080, durationInFrames: 100,
    props: {}, defaultProps: {}} as Awaited<ReturnType<ReviewBackend['selectComposition']>>;
  const backend: ReviewBackend = {
    bundle: async (...args) => {calls.bundle++; const options = args[0]; assert.equal(typeof options, "object"); bundlePath = (options as {outDir: string}).outDir; return bundlePath;},
    openBrowser: async (name, options) => {calls.open++; assert.equal(name, 'chrome'); assert.equal(options?.browserExecutable, process.execPath); return browser;},
    selectComposition: async (options) => {calls.select++; assert.equal(options.puppeteerInstance, browser); return config;},
    renderFrames: async (options) => {
      calls.render++; renderOptions = options;
      assert.equal(options.puppeteerInstance, browser); assert.equal(options.outputDir, null); assert.equal(options.imageFormat, 'png');
      assert.equal(options.muted, true); assert.equal(options.frameRange, undefined); assert.equal(options.everyNthFrame, undefined);
      options.onStart({frameCount: options.frames!.length, resolvedConcurrency: 2, parallelEncoding: false});
      for (const frame of [...options.frames!].reverse()) await options.onFrameBuffer!(Buffer.from(`synthetic-${frame}`), frame);
      return {} as Awaited<ReturnType<ReviewBackend['renderFrames']>>;
    },
    makeCancelSignal,
  };
  const options: ReviewRenderOptions = {root, composition: 'full-video', browserExecutable: process.execPath,
    jobs: [{frame: 8, out: join(root, 'a.png')}, {frame: 2, out: join(root, 'b.png')}, {frame: 8, out: join(root, 'c.png')}],
    concurrency: 2, envVariables: {REMOTION_SUBTITLES: '0'}};
  return {calls, backend, options, getBundlePath: () => bundlePath, getRenderOptions: () => renderOptions};
}
try {
  await check('frame plan deduplicates frames/destinations and rejects conflicting output mapping', () => {
    const f = fixture(); const plan = reviewFramePlan([...f.options.jobs, f.options.jobs[0]!]);
    assert.deepEqual([...plan.keys()], [2, 8]); assert.equal(plan.get(8)!.length, 2);
    assert.throws(() => reviewFramePlan([{frame: 0, out: 'same.png'}, {frame: 1, out: 'same.png'}]), /Conflicting/);
    assert.throws(() => reviewFramePlan([{frame: -1, out: 'x'}]), /non-negative/);
    assert.throws(() => reviewFramePlan([]), /No review/);
  });
  await check('one bundle/browser/metadata/render call; exact unique frames map back to all original PNG paths', async () => {
    const f = fixture(); const result = await renderReviewFrames(f.options, f.backend);
    assert.deepEqual(f.calls, {bundle: 1, open: 1, select: 1, render: 1, close: 1});
    assert.deepEqual(f.getRenderOptions()!.frames, [2, 8]);
    assert.deepEqual(f.getRenderOptions()!.envVariables, {REMOTION_SUBTITLES: '0'});
    assert.equal(result.requestedFrames, 3); assert.equal(result.uniqueFrames, 2); assert.equal(result.resolvedConcurrency, 2);
    assert.equal(readFileSync(join(root, 'a.png'), 'utf8'), 'synthetic-8');
    assert.equal(readFileSync(join(root, 'b.png'), 'utf8'), 'synthetic-2');
    assert.equal(readFileSync(join(root, 'c.png'), 'utf8'), 'synthetic-8');
    assert.equal(existsSync(dirname(f.getBundlePath())), false);
  });
  for (const phase of ['bundle', 'open', 'select', 'render'] as const) {
    await check(`${phase} failure releases only acquired browser and own temp workspace`, async () => {
      const f = fixture();
      const key = ({bundle: 'bundle', open: 'openBrowser', select: 'selectComposition', render: 'renderFrames'} as const)[phase];
      const original = f.backend[key];
      (f.backend as any)[key] = async (...args: any[]) => {
        if (phase === 'bundle') {await (original as any)(...args);}
        else {f.calls[phase]++;}
        throw new Error(`synthetic ${phase} failure`);
      };
      await assert.rejects(renderReviewFrames(f.options, f.backend), new RegExp(`synthetic ${phase}`));
      assert.equal(f.calls.close, phase === 'select' || phase === 'render' ? 1 : 0);
      if (f.getBundlePath()) assert.equal(existsSync(dirname(f.getBundlePath())), false);
    });
  }
  await check('invalid browser/config/options fail before bundle and never trigger a download', async () => {
    const f = fixture();
    await assert.rejects(renderReviewFrames({...f.options, browserExecutable: join(root, 'missing-browser')}, f.backend), /does not exist/);
    await assert.rejects(renderReviewFrames({...f.options, concurrency: 9}, f.backend), /concurrency/);
    await assert.rejects(renderReviewFrames({...f.options, scale: 0}, f.backend), /scale/);
    writeFileSync(join(root, 'remotion.config.ts'), '// synthetic unsupported config');
    await assert.rejects(renderReviewFrames(f.options, f.backend), /not automatically applied/);
    rmSync(join(root, 'remotion.config.ts')); assert.equal(f.calls.bundle, 0);
  });
  await check('missing frame buffers do not publish incomplete output', async () => {
    const f = fixture(); f.options.jobs = [{frame: 0, out: join(root, 'missing-0.png')}, {frame: 1, out: join(root, 'missing-1.png')}];
    f.backend.renderFrames = async (options) => {await options.onFrameBuffer!(Buffer.from('synthetic'), 0); return {} as any;};
    await assert.rejects(renderReviewFrames(f.options, f.backend), /Incomplete/);
    assert.equal(existsSync(join(root, 'missing-0.png')), false); assert.equal(f.calls.close, 1);
  });
  await check('out-of-range frames fail before render and close browser', async () => {
    const f = fixture(); f.options.jobs = [{frame: 100, out: join(root, 'invalid.png')}];
    await assert.rejects(renderReviewFrames(f.options, f.backend), /outside composition/); assert.equal(f.calls.render, 0); assert.equal(f.calls.close, 1);
  });
  for (const phase of ['before', 'bundle', 'open', 'select', 'render'] as const) {
    await check(`cancellation ${phase} never publishes and closes at most one acquired browser`, async () => {
      const f = fixture(); const controller = new AbortController(); f.options.signal = controller.signal;
      f.options.jobs = [{frame: 3, out: join(root, `cancel-${phase}.png`)}];
      if (phase === 'before') controller.abort();
      else {
        const key = ({bundle: 'bundle', open: 'openBrowser', select: 'selectComposition', render: 'renderFrames'} as const)[phase];
        const original = f.backend[key];
        (f.backend as any)[key] = async (...args: any[]) => {const result = await (original as any)(...args); controller.abort(); return result;};
      }
      await assert.rejects(renderReviewFrames(f.options, f.backend), /cancelled/);
      assert.equal(f.calls.close, ['open', 'select', 'render'].includes(phase) ? 1 : 0);
      assert.equal(existsSync(join(root, `cancel-${phase}.png`)), false);
    });
  }
  await check('active rendering receives official cancelSignal, while metadata uses browser close', async () => {
    const f = fixture(); const controller = new AbortController(); f.options.signal = controller.signal;
    f.backend.renderFrames = async (options) => await new Promise((_, reject) => {
      options.cancelSignal!(() => reject(new Error('synthetic render cancelled'))); controller.abort();
    });
    await assert.rejects(renderReviewFrames(f.options, f.backend), /cancelled/); assert.equal(f.calls.close, 1);
  });
  await check('cleanup failure still removes signal listeners and temporary workspace', async () => {
    const f = fixture(); const previousInt = process.listenerCount('SIGINT'), previousTerm = process.listenerCount('SIGTERM');
    f.backend.openBrowser = async () => ({close: async () => {throw new Error('synthetic close failure');}} as any);
    f.backend.selectComposition = async () => {throw new Error('synthetic metadata failure');};
    await assert.rejects(renderReviewFrames(f.options, f.backend), (error: unknown) => {
      assert.ok(error instanceof AggregateError); assert.equal(error.errors.length, 2);
      assert.match(String(error.errors[0]), /metadata failure/); assert.match(String(error.errors[1]), /close failure/); return true;
    });
    assert.equal(process.listenerCount('SIGINT'), previousInt); assert.equal(process.listenerCount('SIGTERM'), previousTerm);
    assert.equal(existsSync(dirname(f.getBundlePath())), false);
  });
  await check('continuous review ranges include boundary handles and remain separate unrendered evidence', () => {
    assert.deepEqual(continuousReviewRange(20, 30, 100, 10).frameRange, [10, 59]);
    assert.deepEqual(continuousReviewRange(0, 30, 40, 20).frameRange, [0, 39]);
    assert.equal(continuousReviewRange(20, 30, 100).evidence, 'not-rendered');
    assert.throws(() => continuousReviewRange(90, 30, 100), /Invalid/);
  });
  await check('segment route requires valid range, fixes full-rate settings and cannot select final filenames', () => {
    const args = segmentRenderArguments(['--frames=10-29', '--acknowledge-draft'], 'both', 100);
    for (const value of ['--frames=10-29', '--preset=quality', '--scale=1', '--every-nth-frame=1', '--output-mode=composite', '--output=output/review-composite-10-29.mp4']) assert.ok(args.includes(value));
    assert.ok(segmentRenderArguments(['--frames', '0-99'], 'alpha', 100).includes('--output=output/review-alpha-0-99.mov'));
    for (const invalid of [[], ['--frames=1-0'], ['--frames=1-1'], ['--frames=0-100'], ['--frames=0-5', '--output=output/full.mp4'], ['--frames=0-5', '--every-nth-frame=2'], ['--frames=0-5', '--scale=0.5'], ['--frames=0-5', '--preset=draft']]) assert.throws(() => segmentRenderArguments(invalid, 'opaque', 100));
    assert.throws(() => segmentRenderArguments(['--frames=0-5', '--subtitles'], 'alpha', 100), /cannot burn/);
  });
  await check('port validation and environment allowlist exclude unrelated secret-shaped variables', () => {
    assert.equal(reviewPort(null), null); assert.equal(reviewPort('3000'), 3000); assert.throws(() => reviewPort('65536'));
    process.env.SYNTHETIC_TEST_SECRET = 'not-a-real-secret';
    assert.equal(reviewEnvironment().SYNTHETIC_TEST_SECRET, undefined); delete process.env.SYNTHETIC_TEST_SECRET;
  });
  console.log(`Review-render contracts: ${count} passed; fake backend only, no browser launched, no acceleration claim.`);
} finally {rmSync(root, {recursive: true, force: true});}
