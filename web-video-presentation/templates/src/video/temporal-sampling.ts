/** Original, opt-in temporal supersampling. No timers, accumulated frame state or CSS blur. */
export interface TemporalOptions {
  durationInFrames: number;
  enabled?: boolean;
  /** 1..8 samples; default 5. Cost scales with sample count. */
  samples?: number;
  /** Exposure measured in frame intervals, 0..1. Default 0.5 (180 degree shutter). */
  shutterFraction?: number;
  /** Optional hard-cut boundaries, in the SAME clock as frame; inclusive. */
  minFrame?: number;
  maxFrame?: number;
}
export interface TemporalPlan {
  frames: number[];
  mode: 'single' | 'temporal';
  reason: 'disabled' | 'single-sample' | 'zero-shutter' | 'temporal';
}

export function planTemporalSamples(frame: number, options: TemporalOptions): TemporalPlan {
  const { durationInFrames, enabled = false, samples = 5, shutterFraction = 0.5,
    minFrame = 0, maxFrame = durationInFrames - 1 } = options;
  if (!Number.isInteger(durationInFrames) || durationInFrames < 1 || !Number.isFinite(frame) ||
      !Number.isInteger(samples) || samples < 1 || samples > 8 ||
      !Number.isFinite(shutterFraction) || shutterFraction < 0 || shutterFraction > 1 ||
      !Number.isFinite(minFrame) || !Number.isFinite(maxFrame) || minFrame < 0 ||
      maxFrame > durationInFrames - 1 || maxFrame < minFrame || frame < minFrame || frame > maxFrame) {
    throw new RangeError('Invalid temporal frame, bounds, duration, samples or shutter');
  }
  if (!enabled || samples === 1 || shutterFraction === 0) return {
    frames: [frame], mode: 'single', reason: !enabled ? 'disabled' : samples === 1 ? 'single-sample' : 'zero-shutter',
  };
  return {
    // Midpoint integration, centered on the requested frame. Clamp at real shot edges,
    // never wrap into the previous/next shot. Duplicate edge samples retain their weights.
    frames: Array.from({ length: samples }, (_, i) => Math.min(maxFrame, Math.max(minFrame,
      frame + ((i + 0.5) / samples - 0.5) * shutterFraction))),
    mode: 'temporal', reason: 'temporal',
  };
}

/** Canvas ImageData is straight-alpha sRGB bytes. Integrate premultiplied RGB and alpha,
 * then unpremultiply once. This is code-space averaging, not HDR/linear-light rendering.
 * Transparent hidden RGB must never stain translucent edges. Inputs are not modified. */
export function averageRgbaSamples(samples: readonly Uint8ClampedArray[]): Uint8ClampedArray {
  if (samples.length < 1 || samples.length > 8 || samples[0]!.length === 0 || samples[0]!.length % 4) {
    throw new RangeError('Require 1..8 nonempty RGBA samples');
  }
  const size = samples[0]!.length;
  if (samples.some((sample) => sample.length !== size)) throw new RangeError('RGBA dimensions differ');
  const output = new Uint8ClampedArray(size);
  for (let p = 0; p < size; p += 4) {
    let alpha = 0, r = 0, g = 0, b = 0;
    for (const sample of samples) {
      const a = sample[p + 3]!;
      alpha += a; r += sample[p]! * a; g += sample[p + 1]! * a; b += sample[p + 2]! * a;
    }
    if (alpha > 0) {
      output[p] = r / alpha; output[p + 1] = g / alpha; output[p + 2] = b / alpha;
    }
    output[p + 3] = alpha / samples.length;
  }
  return output;
}

export interface TemporalCanvasOptions extends TemporalOptions {
  /** Default 1080p pixel budget. Above it render sharp; caller may explicitly raise it. */
  maxPixels?: number;
  /** Browser default creates a detached canvas. Injectable for offscreen/test environments. */
  createCanvas?: () => HTMLCanvasElement;
}
export interface TemporalCanvasResult {
  mode: 'single' | 'temporal' | 'fallback';
  reason: string;
  sampleFrames: number[];
}

/** Draw only the motion layer here. Render typography/UI labels after this function so they
 * remain sharp. draw must be pure for fractional frames and leave balanced save/restore.
 * This adapter does not blur DOM/React/SVG trees; those routes should stay sharp unless they
 * implement a real temporal renderer. Rendering errors propagate; unsupported readback alone
 * falls back to a clean center-frame render, with a visible result reason. */
export function renderTemporalCanvas(
  target: HTMLCanvasElement,
  draw: (ctx: CanvasRenderingContext2D, sampleFrame: number) => void,
  frame: number,
  options: TemporalCanvasOptions,
): TemporalCanvasResult {
  const plan = planTemporalSamples(frame, options);
  const width = target.width, height = target.height;
  const maxPixels = options.maxPixels ?? 1920 * 1080;
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1 ||
      !Number.isInteger(maxPixels) || maxPixels < 1) throw new RangeError('Invalid canvas dimensions/pixel budget');
  const targetContext = target.getContext('2d');
  if (!targetContext) throw new Error('Canvas 2D context unavailable; no render possible');
  const single = (mode: 'single' | 'fallback', reason: string): TemporalCanvasResult => {
    // Reset clears pixels, transform, blend mode and clipping from a prior invocation.
    target.width = width;
    draw(targetContext, frame);
    return { mode, reason, sampleFrames: [frame] };
  };
  if (plan.mode === 'single') return single('single', plan.reason);
  if (width * height > maxPixels) return single('fallback', 'pixel-budget');
  const create = options.createCanvas ?? (typeof document === 'undefined' ? null : () => document.createElement('canvas'));
  if (!create) return single('fallback', 'canvas-factory-unavailable');
  const scratch = create();
  if (scratch === target) throw new Error('Temporal scratch canvas must be separate from target');
  scratch.width = width; scratch.height = height;
  const context = scratch.getContext('2d', { willReadFrequently: true });
  if (!context) return single('fallback', 'scratch-context-unavailable');
  const pixels: Uint8ClampedArray[] = [];
  for (const sampleFrame of plan.frames) {
    scratch.width = width;
    draw(context, sampleFrame); // Do not swallow application/render failures.
    try {
      pixels.push(context.getImageData(0, 0, width, height).data);
    } catch (error) {
      if (error instanceof Error && (error.name === 'SecurityError' || error.name === 'NotSupportedError')) {
        return single('fallback', `pixel-readback-${error.name}`);
      }
      throw error;
    }
  }
  const result = targetContext.createImageData(width, height);
  result.data.set(averageRgbaSamples(pixels));
  target.width = width;
  targetContext.putImageData(result, 0, 0);
  return { mode: 'temporal', reason: 'premultiplied-rgba-code-space', sampleFrames: plan.frames };
}
