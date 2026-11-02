import { FrameCanvas } from "./FrameCanvas";
import { VIDEO_FORMAT } from "../config/videoFormat";
import {
  createSceneState,
  resolveScene,
  sceneTimelineDuration,
  type CanvasScene,
} from "../video/scene-runtime";

interface CanvasScenePlayerProps {
  frame?: number;
  width?: number;
  height?: number;
  fps?: number;
  className?: string;
  scenes: CanvasScene[];
}

export function CanvasScenePlayer({
  frame = 0,
  width = VIDEO_FORMAT.width,
  height = VIDEO_FORMAT.height,
  fps = VIDEO_FORMAT.fps,
  className,
  scenes,
}: CanvasScenePlayerProps) {
  const durationInFrames = sceneTimelineDuration(scenes);

  return (
    <FrameCanvas
      className={className}
      frame={frame}
      durationInFrames={durationInFrames}
      width={width}
      height={height}
      draw={(ctx) => {
        const state = createSceneState({ scenes, frame, fps, width, height });
        const { scene } = resolveScene(scenes, state.frame);
        scene.render(ctx, state);
      }}
    />
  );
}
