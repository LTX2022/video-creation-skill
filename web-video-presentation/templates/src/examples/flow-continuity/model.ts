import { actionsIn, bindChapterEvents, progressAt, type ChapterStepTiming, type FrameWindow } from '../../video/continuity-clock';

/** Original conceptual data, not a customer result. Identity does not depend on React mounting. */
export const FLOW_OBJECTS = Object.freeze([
  { objectId: 'datum-01', label: '01', group: 'A' as const },
  { objectId: 'datum-02', label: '02', group: 'B' as const },
  { objectId: 'datum-03', label: '03', group: 'A' as const },
  { objectId: 'datum-04', label: '04', group: 'B' as const },
].map((object) => Object.freeze(object)));

export type Point = { x: number; y: number };
export type FlowEvents = Record<'identify' | 'route' | 'resultHold', FrameWindow>;
export type FlowObject = (typeof FLOW_OBJECTS)[number] & Point & {
  identified: number;
  arrived: boolean;
};
export interface FlowModel {
  objects: FlowObject[];
  phase: 'identify' | 'route' | 'hold';
  counts: { identified: number; A: number; B: number };
  clockScope: 'chapter' | 'step';
}

export const smooth = (p: number) => p * p * (3 - 2 * p);
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const originOf = (index: number): Point => ({ x: 190, y: 215 + index * 90 });
export const scannedOf = (index: number): Point => ({ x: 520, y: originOf(index).y });
export const destinationOf = (index: number): Point => ({ x: 1010 - Math.floor(index / 2) * 110, y: index % 2 === 0 ? 265 : 440 });

export function routePoints(index: number): readonly [Point, Point, Point, Point] {
  const from = scannedOf(index);
  const to = destinationOf(index);
  return [from, { x: 670, y: from.y }, { x: 725, y: to.y }, to];
}

function cubic(points: readonly [Point, Point, Point, Point], p: number): Point {
  const q = 1 - p;
  return {
    x: q ** 3 * points[0].x + 3 * q ** 2 * p * points[1].x + 3 * q * p ** 2 * points[2].x + p ** 3 * points[3].x,
    y: q ** 3 * points[0].y + 3 * q ** 2 * p * points[1].y + 3 * q * p ** 2 * points[2].y + p ** 3 * points[3].y,
  };
}

/** Fractions refer to the actual three narration steps; no duplicated duration table. */
export function flowEventsFor(steps: readonly ChapterStepTiming[]): FlowEvents {
  return bindChapterEvents(steps, {
    identify: { start: { step: 0, at: 0.12 }, end: { step: 1, at: 0.12 } },
    route: { start: { step: 1, at: 0.16 }, end: { step: 2, at: 0.18 } },
    resultHold: { start: { step: 2, at: 0.22 }, end: { step: 2, at: 1 } },
  });
}

function evaluate(frame: number, events: FlowEvents, clockScope: 'chapter' | 'step'): FlowModel {
  const identify = actionsIn(events.identify, FLOW_OBJECTS.length, 'stagger', 0.17);
  const route = actionsIn(events.route, FLOW_OBJECTS.length, 'stagger', 0.6);
  const objects = FLOW_OBJECTS.map((datum, index): FlowObject => {
    const scanning = progressAt(frame, identify[index]!);
    const routing = progressAt(frame, route[index]!);
    const position = routing > 0
      ? cubic(routePoints(index), smooth(routing))
      : { x: mix(originOf(index).x, scannedOf(index).x, smooth(scanning)), y: originOf(index).y };
    return { ...datum, ...position, identified: smooth(Math.min(1, Math.max(0, (scanning - 0.65) / 0.35))), arrived: routing >= 1 };
  });
  return {
    objects,
    phase: frame >= events.resultHold.startFrame ? 'hold' : frame >= events.route.startFrame ? 'route' : 'identify',
    counts: {
      identified: objects.filter((item) => item.identified >= 1).length,
      A: objects.filter((item) => item.group === 'A' && item.arrived).length,
      B: objects.filter((item) => item.group === 'B' && item.arrived).length,
    },
    clockScope,
  };
}

export function flowModelAt(chapterFrame: number, steps: readonly ChapterStepTiming[]): FlowModel {
  return evaluate(chapterFrame, flowEventsFor(steps), 'chapter');
}

/**
 * Explicit legacy/manual single-step illustration. It does not guess preceding step lengths
 * or claim to be a chapter clock. The source and final states are reconstructed from identity.
 */
export function stepOnlyFlowModelAt(step: number, frame: number, durationInFrames: number): FlowModel {
  if (!Number.isInteger(step) || step < 0 || step > 2 || !Number.isFinite(durationInFrames) || durationInFrames <= 0) {
    throw new RangeError('Step-only flow preview requires step 0..2 and a positive duration');
  }
  const before = { startFrame: -2, endFrame: -1 };
  const after = { startFrame: durationInFrames + 1, endFrame: durationInFrames + 2 };
  const active = { startFrame: durationInFrames * 0.08, endFrame: durationInFrames * 0.82 };
  return evaluate(frame, {
    identify: step === 0 ? active : before,
    route: step === 1 ? active : step === 0 ? after : before,
    resultHold: step === 2 ? { startFrame: 0, endFrame: durationInFrames } : after,
  }, 'step');
}
