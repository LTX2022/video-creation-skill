import { buildChapterTimingIndex, type TimelineStep } from './continuity-clock';

/**
 * Production roots mount chapters inside step Sequences. A hole within a chapter
 * would unmount its subject, so require an explicit silent hold step instead.
 * Generic continuity clocks may still model gaps; this is the rendering contract.
 * Cross-chapter gaps remain legal (intentional blank/plate-only intervals).
 */
export function buildRenderSchedule(steps: readonly TimelineStep[], fallbackDuration: number) {
  if (!Number.isSafeInteger(fallbackDuration) || fallbackDuration < 1) {
    throw new RangeError('Fallback render duration must be a positive safe integer');
  }
  const chapterTimingIndex = buildChapterTimingIndex(steps);
  for (const [chapter, timing] of chapterTimingIndex) {
    const ordered = timing.chapterStepTimings;
    for (let i = 1; i < ordered.length; i++) {
      const previous = ordered[i - 1]!;
      if (ordered[i]!.startFrame !== previous.startFrame + previous.durationInFrames) {
        throw new RangeError(`Render gap within chapter ${chapter}: add an explicit silent hold step to preserve the subject`);
      }
    }
  }
  let totalFrames = steps.length ? 0 : fallbackDuration;
  for (const step of steps) {
    const end = step.startFrame + step.durationInFrames;
    if (!Number.isSafeInteger(end) || end < 1) throw new RangeError('Render end frame must be a positive safe integer');
    totalFrames = Math.max(totalFrames, end);
  }
  return { chapterTimingIndex, totalFrames };
}
