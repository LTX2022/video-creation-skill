/** Deterministic clocks and action windows. The input render timing remains the only timing source. */
export interface TimelineStep {
  readonly chapter: string;
  readonly stepIndex: number;
  readonly startFrame: number;
  readonly durationInFrames: number;
}

/** startFrame is chapter-local, unlike TimelineStep.startFrame. */
export interface ChapterStepTiming {
  readonly stepIndex: number;
  readonly startFrame: number;
  readonly durationInFrames: number;
}

export interface ChapterTiming {
  readonly chapterStartFrame: number;
  readonly chapterDurationInFrames: number;
  readonly chapterStepTimings: readonly ChapterStepTiming[];
}

export interface ChapterClock extends ChapterTiming {
  readonly clockScope: 'chapter';
  /** Retained legacy meaning: frame within the current narration step. */
  readonly frame: number;
  readonly durationInFrames: number;
  readonly timelineFrame: number;
  readonly chapterFrame: number;
}

const finite = (value: number, name: string) => {
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    throw new RangeError(`${name} must be finite and within the safe frame range`);
  }
  return value;
};

/** Build once from STEPS, not from step count, audio estimates or equal-length assumptions. */
export function buildChapterTimingIndex(steps: readonly TimelineStep[]): ReadonlyMap<string, ChapterTiming> {
  const grouped = new Map<string, TimelineStep[]>();
  for (const step of steps) {
    if (!step.chapter || !Number.isSafeInteger(step.stepIndex) || step.stepIndex < 0 ||
      !Number.isSafeInteger(step.startFrame) || step.startFrame < 0 ||
      !Number.isSafeInteger(step.durationInFrames) || step.durationInFrames < 1) {
      throw new RangeError('Render steps require a chapter, nonnegative integer step/start and positive integer duration');
    }
    finite(step.startFrame + step.durationInFrames, 'step endFrame');
    const entries = grouped.get(step.chapter) ?? [];
    if (entries.some((entry) => entry.stepIndex === step.stepIndex)) {
      throw new Error(`Duplicate render step: ${step.chapter}/${step.stepIndex}`);
    }
    entries.push(step);
    grouped.set(step.chapter, entries);
  }
  const result = new Map<string, ChapterTiming>();
  for (const [chapter, entries] of grouped) {
    const ordered = [...entries].sort((a, b) => a.startFrame - b.startFrame);
    for (let i = 1; i < ordered.length; i++) {
      if (ordered[i]!.startFrame < ordered[i - 1]!.startFrame + ordered[i - 1]!.durationInFrames) {
        throw new RangeError(`Overlapping chapter steps: ${chapter}`);
      }
    }
    // Gaps remain legal: the chapter clock includes them, never compresses them.
    const start = ordered[0]!.startFrame;
    const end = Math.max(...ordered.map((step) => step.startFrame + step.durationInFrames));
    result.set(chapter, Object.freeze({
      chapterStartFrame: start,
      chapterDurationInFrames: end - start,
      chapterStepTimings: Object.freeze(ordered.map((step) => Object.freeze({
        stepIndex: step.stepIndex,
        startFrame: step.startFrame - start,
        durationInFrames: step.durationInFrames,
      }))),
    }));
  }
  return result;
}

/** Safe for remounts and random/out-of-order seeks; never accumulates previous frames. */
export function clockAtStep(
  timing: TimelineStep,
  localFrame: number,
  index: ReadonlyMap<string, ChapterTiming>,
): ChapterClock {
  finite(localFrame, 'localFrame');
  const chapter = index.get(timing.chapter);
  if (!chapter) throw new Error(`Missing chapter timing: ${timing.chapter}`);
  const registered = chapter.chapterStepTimings.find((step) => step.stepIndex === timing.stepIndex);
  if (!registered || registered.startFrame + chapter.chapterStartFrame !== timing.startFrame ||
    registered.durationInFrames !== timing.durationInFrames) {
    throw new Error(`Stale chapter timing index: ${timing.chapter}/${timing.stepIndex}`);
  }
  const timelineFrame = finite(timing.startFrame + localFrame, 'timelineFrame');
  const chapterFrame = finite(timelineFrame - chapter.chapterStartFrame, 'chapterFrame');
  return { ...chapter, clockScope: 'chapter', frame: localFrame,
    durationInFrames: timing.durationInFrames, timelineFrame,
    chapterFrame };
}

export interface FrameWindow { readonly startFrame: number; readonly endFrame: number }
export interface StepAnchor { readonly step: number; /** Fraction of this actual step, from 0 to 1. */ readonly at: number }
export interface EventBinding { readonly start: StepAnchor; readonly end: StepAnchor }

/** Give visual events names without creating a second narration/timing table. End is exclusive. */
export function bindChapterEvents<Name extends string>(
  steps: readonly ChapterStepTiming[],
  bindings: Record<Name, EventBinding>,
): Record<Name, FrameWindow> {
  const anchor = ({ step, at }: StepAnchor) => {
    if (!Number.isFinite(at) || at < 0 || at > 1) throw new RangeError('Anchor fraction must be within 0..1');
    const timing = steps.find((entry) => entry.stepIndex === step);
    if (!timing) throw new Error(`Event references missing step ${step}`);
    if (!Number.isSafeInteger(timing.stepIndex) || timing.stepIndex < 0 ||
      !Number.isSafeInteger(timing.startFrame) || timing.startFrame < 0 ||
      !Number.isSafeInteger(timing.durationInFrames) || timing.durationInFrames < 1) {
      throw new RangeError('Event timing requires safe nonnegative step/start and positive duration');
    }
    finite(timing.startFrame + timing.durationInFrames, 'event step endFrame');
    return finite(timing.startFrame + timing.durationInFrames * at, 'event anchor');
  };
  const result = {} as Record<Name, FrameWindow>;
  for (const name of Object.keys(bindings) as Name[]) {
    const binding = bindings[name];
    const startFrame = anchor(binding.start);
    const endFrame = anchor(binding.end);
    if (endFrame < startFrame) throw new RangeError(`Event ends before it starts: ${name}`);
    result[name] = { startFrame, endFrame };
  }
  return result;
}

/**
 * after: each equal-length action waits for its predecessor to finish.
 * parallel: all start together and occupy the entire event.
 * stagger: fixed start offsets; actions may overlap (NOT completion chaining).
 * A hold is simply a named event with no new action; progress of prior actions stays clamped at 1.
 * lagRatio is the stagger start offset as a fraction of one action's duration.
 */
export function actionsIn(
  window: FrameWindow,
  count: number,
  mode: 'after' | 'parallel' | 'stagger',
  lagRatio = 0.25,
): FrameWindow[] {
  finite(window.startFrame, 'startFrame');
  finite(window.endFrame, 'endFrame');
  if (window.endFrame < window.startFrame || !Number.isSafeInteger(count) || count < 1 || count > 100_000 ||
    !Number.isFinite(lagRatio) || lagRatio < 0 || lagRatio > 1) throw new RangeError('Invalid action window/count/lagRatio');
  if (!['after', 'parallel', 'stagger'].includes(mode)) throw new RangeError('Unknown action mode');
  const lag = mode === 'after' ? 1 : mode === 'parallel' ? 0 : lagRatio;
  const duration = finite(window.endFrame - window.startFrame, 'window span') / (1 + (count - 1) * lag);
  return Array.from({ length: count }, (_, index) => ({
    startFrame: finite(window.startFrame + index * lag * duration, 'action startFrame'),
    endFrame: finite(window.startFrame + (index * lag + 1) * duration, 'action endFrame'),
  }));
}

export function progressAt(frame: number, window: FrameWindow): number {
  finite(frame, 'frame');
  finite(window.startFrame, 'startFrame');
  finite(window.endFrame, 'endFrame');
  if (window.endFrame < window.startFrame) throw new RangeError('Window ends before it starts');
  const span = finite(window.endFrame - window.startFrame, 'window span');
  if (frame < window.startFrame) return 0;
  if (frame >= window.endFrame) return 1;
  return (frame - window.startFrame) / span;
}

/** First integer output frame reaching a continuous event edge; do not round visual interpolation. */
export function firstFrameAt(frame: number): number {
  return Math.ceil(finite(frame, 'event edge'));
}
