export interface CanvasSceneState {
  frame: number;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  seconds: number;
  progress: number;
  sceneId: string;
  sceneIndex: number;
  sceneFrame: number;
  sceneDurationInFrames: number;
  sceneSeconds: number;
  sceneProgress: number;
}

export interface CanvasScene {
  id: string;
  durationInFrames: number;
  render: (ctx: CanvasRenderingContext2D, state: CanvasSceneState) => void;
}

export interface SceneTimelineItem {
  id: string;
  index: number;
  from: number;
  durationInFrames: number;
  until: number;
}

export function secondsToFrames(seconds: number, fps: number): number {
  return Math.max(1, Math.round(Math.max(0.001, seconds) * Math.max(1, fps)));
}

export function buildSceneTimeline(scenes: CanvasScene[]): SceneTimelineItem[] {
  let cursor = 0;
  return scenes.map((scene, index) => {
    const durationInFrames = Math.max(1, Math.floor(scene.durationInFrames));
    const item = {
      id: scene.id,
      index,
      from: cursor,
      durationInFrames,
      until: cursor + durationInFrames,
    };
    cursor += durationInFrames;
    return item;
  });
}

export function sceneTimelineDuration(scenes: CanvasScene[]): number {
  return buildSceneTimeline(scenes).reduce((total, item) => total + item.durationInFrames, 0);
}

export function resolveScene(
  scenes: CanvasScene[],
  frame: number,
): { scene: CanvasScene; timeline: SceneTimelineItem } {
  if (scenes.length === 0) {
    throw new Error("CanvasScenePlayer requires at least one scene");
  }

  const timeline = buildSceneTimeline(scenes);
  const safeFrame = Math.max(0, Math.floor(frame));
  const item =
    timeline.find((entry) => safeFrame >= entry.from && safeFrame < entry.until) ??
    timeline[timeline.length - 1]!;

  return {
    scene: scenes[item.index]!,
    timeline: item,
  };
}

export function createSceneState({
  scenes,
  frame,
  fps,
  width,
  height,
}: {
  scenes: CanvasScene[];
  frame: number;
  fps: number;
  width: number;
  height: number;
}): CanvasSceneState {
  const durationInFrames = sceneTimelineDuration(scenes);
  const safeDuration = Math.max(1, durationInFrames);
  const safeFrame = Math.max(0, Math.min(safeDuration - 1, Math.floor(frame)));
  const { timeline } = resolveScene(scenes, safeFrame);
  const sceneFrame = Math.max(0, safeFrame - timeline.from);
  const sceneDurationInFrames = Math.max(1, timeline.durationInFrames);

  return {
    frame: safeFrame,
    durationInFrames: safeDuration,
    fps,
    width,
    height,
    seconds: safeFrame / Math.max(1, fps),
    progress: safeFrame / Math.max(1, safeDuration - 1),
    sceneId: timeline.id,
    sceneIndex: timeline.index,
    sceneFrame,
    sceneDurationInFrames,
    sceneSeconds: sceneFrame / Math.max(1, fps),
    sceneProgress: sceneFrame / Math.max(1, sceneDurationInFrames - 1),
  };
}
