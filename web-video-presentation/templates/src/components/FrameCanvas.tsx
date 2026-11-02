import { useLayoutEffect, useRef } from "react";

export interface FrameCanvasState {
  frame: number;
  durationInFrames: number;
  progress: number;
  width: number;
  height: number;
}

interface FrameCanvasProps {
  frame?: number;
  durationInFrames?: number;
  width: number;
  height: number;
  className?: string;
  draw: (ctx: CanvasRenderingContext2D, state: FrameCanvasState) => void;
}

export function FrameCanvas({
  frame = 0,
  durationInFrames = 1,
  width,
  height,
  className,
  draw,
}: FrameCanvasProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const safeDuration = Math.max(1, durationInFrames);
  const safeFrame = Math.max(0, Math.min(safeDuration - 1, frame));

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Width assignment resets clipping, transform, alpha, filters, and the save stack.
    // clearRect alone cannot undo a clip left by the previous frame.
    canvas.width = width;
    canvas.height = height;
    ctx.save();
    try { draw(ctx, {
      frame: safeFrame,
      durationInFrames: safeDuration,
      progress: safeFrame / Math.max(1, safeDuration - 1),
      width,
      height,
    }); } finally { ctx.restore(); }
  }, [draw, height, safeDuration, safeFrame, width]);

  return (
    <canvas
      ref={ref}
      className={className}
      width={width}
      height={height}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
