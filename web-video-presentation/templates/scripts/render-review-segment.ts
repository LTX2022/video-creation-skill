/** A continuous full-rate partial render, never final evidence. Uses the normal renderer/quality contract. */
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {readState} from './delivery-contract';
import {segmentRenderArguments} from './review-render';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: npm run render:segment -- --frames=START-END [--acknowledge-draft]
  Inclusive continuous frames at original fps, scale=1, quality preset and no skipped frames.
  Add context before/after the affected action and transitions; this is PARTIAL evidence, not final delivery.
  --output-mode=opaque|alpha|composite (both projects default to composite; review alpha separately)
  --browser-executable=PATH --concurrency=N --port=N --subtitles --quiet
  Writes output/review-MODE-START-END.mp4 (alpha: .mov); final filenames cannot be selected.
  --acknowledge-draft intentionally permits iteration with incomplete workflow gates; not user acceptance.`);
} else {
  try {
    const timing = readFileSync(resolve('src/video/render-timing.generated.ts'), 'utf8');
    const totalFrames = Number(timing.match(/export const TOTAL_FRAMES\s*=\s*(\d+)/)?.[1]);
    const planned = segmentRenderArguments(args, readState().outputMode, totalFrames);
    const child = spawn(process.execPath, ['--import', 'tsx', resolve('scripts/render-video.ts'), ...planned], {stdio: 'inherit'});
    const onInterrupt = () => {child.kill('SIGINT');};
    const onTerminate = () => {child.kill('SIGTERM');};
    process.once('SIGINT', onInterrupt);
    process.once('SIGTERM', onTerminate);
    const cleanup = () => {process.removeListener('SIGINT', onInterrupt); process.removeListener('SIGTERM', onTerminate);};
    child.once('error', (error) => {cleanup(); console.error(error); process.exitCode = 1;});
    child.once('exit', (code, signal) => {cleanup(); process.exitCode = code ?? (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1);});
  } catch (error) {console.error(error); process.exitCode = 1;}
}
