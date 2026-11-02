import { createElement, type CSSProperties, type ReactNode } from "react";
import { Easing, interpolate } from "remotion";

export interface MotionInput {
  frame?: number;
  durationInFrames?: number;
}

export interface RevealOptions {
  start?: number;
  duration?: number;
  y?: number;
  x?: number;
  scaleFrom?: number;
  easing?: (value: number) => number;
}

export interface StaggerOptions extends RevealOptions {
  index?: number;
  stagger?: number;
}

export interface SvgPosAnimProps {
  pos: string;
  anim?: CSSProperties;
  children: ReactNode;
}

const DEFAULT_DURATION = 36;

export const motionEase = {
  outCubic: Easing.out(Easing.cubic),
  outExpo: Easing.out(Easing.exp),
  inOutCubic: Easing.inOut(Easing.cubic),
};

export function frameValue(input: MotionInput): number {
  if (typeof input.frame === "number" && Number.isFinite(input.frame)) {
    return input.frame;
  }
  return Math.max(0, (input.durationInFrames ?? 1) - 1);
}

export function motionProgress(
  input: MotionInput,
  {
    start = 0,
    duration = DEFAULT_DURATION,
    easing = motionEase.outCubic,
  }: RevealOptions = {},
): number {
  return interpolate(frameValue(input), [start, start + Math.max(1, duration)], [0, 1], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function staggerProgress(input: MotionInput, options: StaggerOptions = {}): number {
  const { index = 0, stagger = 6, start = 0, ...rest } = options;
  return motionProgress(input, {
    start: start + index * stagger,
    ...rest,
  });
}

export function revealStyle(input: MotionInput, options: StaggerOptions = {}): CSSProperties {
  const { x = 0, y = 28, scaleFrom = 1 } = options;
  const p = staggerProgress(input, options);
  const tx = (1 - p) * x;
  const ty = (1 - p) * y;
  const scale = scaleFrom + (1 - scaleFrom) * p;

  return {
    opacity: p,
    transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
  };
}

export function scaleXStyle(input: MotionInput, options: StaggerOptions = {}): CSSProperties {
  const p = staggerProgress(input, options);
  return {
    transform: `scaleX(${p})`,
    transformOrigin: "left center",
  };
}

export function scaleYStyle(input: MotionInput, options: StaggerOptions = {}): CSSProperties {
  const p = staggerProgress(input, options);
  return {
    opacity: 0.45 + p * 0.55,
    transform: `scaleY(${0.16 + p * 0.84})`,
    transformOrigin: "bottom center",
  };
}

export function drawStrokeStyle(
  input: MotionInput,
  length: number,
  options: StaggerOptions = {},
): CSSProperties {
  const p = staggerProgress(input, options);
  return {
    strokeDasharray: length,
    strokeDashoffset: length * (1 - p),
  };
}

export function PosAnim({ pos, anim, children }: SvgPosAnimProps) {
  return createElement(
    "g",
    { transform: pos },
    createElement("g", { style: anim }, children),
  );
}
