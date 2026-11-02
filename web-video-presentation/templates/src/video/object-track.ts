import { progressAt, type FrameWindow } from './continuity-clock';

/** Original numeric state tracks: stable identity, inherited endpoints, random-access evaluation. */
export type NumericPose = Readonly<Record<string, number>>;
export interface PoseAction {
  readonly event: string;
  readonly to: NumericPose;
  readonly easing?: 'linear' | 'smooth';
}
export interface ObjectTrack {
  readonly objectId: string;
  readonly initial: NumericPose;
  readonly actions: readonly PoseAction[];
}
export interface CompiledTrack {
  readonly objectId: string;
  readonly initial: NumericPose;
  readonly actions: readonly { window: FrameWindow; from: NumericPose; to: NumericPose; easing: 'linear' | 'smooth' }[];
}
const checkPose = (pose: NumericPose) => {
  if (!pose || !Object.keys(pose).length || Object.values(pose).some(n => typeof n !== 'number' || !Number.isFinite(n))) {
    throw new RangeError('Pose channels must be nonempty finite numbers');
  }
};

/** Resolve against bindChapterEvents output. Never store another seconds/frame timeline. */
export function compileObjectTrack(track: ObjectTrack, events: Readonly<Record<string, FrameWindow>>): CompiledTrack {
  if (!track.objectId?.trim()) throw new Error('Stable objectId is required');
  checkPose(track.initial);
  const state = {...track.initial};
  const ends: Record<string, number> = Object.create(null);
  const actions = track.actions.map((action, order) => {
    const window = events[action.event];
    if (!window) throw new Error(`Missing event: ${action.event}`);
    progressAt(0, window); // validate finite/non-reversed window even before the first frame
    checkPose(action.to);
    if (action.easing && !['linear', 'smooth'].includes(action.easing)) throw new Error('Unknown easing');
    return {action, window, order};
  }).sort((a,b) => a.window.startFrame - b.window.startFrame || a.order-b.order).map(({action, window}) => {
    const from: Record<string, number> = Object.create(null);
    for (const [key, target] of Object.entries(action.to)) {
      if (!Object.hasOwn(state, key)) throw new Error(`Unknown pose channel: ${key}`);
      if (ends[key] !== undefined && window.startFrame < ends[key]!) throw new Error(`Overlapping actions on channel: ${key}`);
      from[key] = state[key]!;
      state[key] = target;
      ends[key] = window.endFrame;
    }
    return Object.freeze({window: Object.freeze({...window}), from: Object.freeze(from), to: Object.freeze({...action.to}), easing: action.easing ?? 'smooth' as const});
  });
  return Object.freeze({objectId: track.objectId, initial: Object.freeze({...track.initial}), actions: Object.freeze(actions)});
}

/** Each frame reconstructs state; no mutable simulation, mounting dependency or frame history. */
export function objectAt(track: CompiledTrack, frame: number): {objectId: string; pose: Record<string, number>} {
  if (!Number.isFinite(frame) || Math.abs(frame) > Number.MAX_SAFE_INTEGER) throw new RangeError('Frame must be finite and within the safe frame range');
  const pose = {...track.initial};
  for (const action of track.actions) {
    if (frame < action.window.startFrame) continue;
    const t = progressAt(frame, action.window);
    const p = action.easing === 'linear' ? t : t*t*(3-2*t);
    for (const key of Object.keys(action.to)) {
      const from = action.from[key]!;
      const to = action.to[key]!;
      // Opposite-sign subtraction can overflow even when both endpoints are finite.
      // Preserve exact endpoints and use a convex sum only for that case.
      const value = p === 0 ? from : p === 1 ? to :
        Math.sign(from) !== Math.sign(to) ? from * (1 - p) + to * p : from + (to - from) * p;
      if (!Number.isFinite(value)) throw new RangeError('Interpolated pose must be finite');
      pose[key] = value;
    }
  }
  return {objectId: track.objectId, pose};
}
