import {MaterialShape} from './MaterialShape';
import {MATERIAL_KINDS, assertPalette, containedViewportBounds, finite, materialAtFrame, morphAtFrame, nonempty, prepareMorph,
  type MaterialKind, type MaterialPalette, type Point2} from './model';

export const SHOWCASE_PALETTE: MaterialPalette = Object.freeze({
  id: 'warm-ink-v1', base: '#f3a84c', ink: '#252a34', highlight: '#fff3d2',
});
const contour = (power: number): readonly Point2[] => Array.from({length: 64}, (_, index) => {
  const angle = index / 64 * Math.PI * 2 - Math.PI / 2;
  const c = Math.cos(angle), s = Math.sin(angle);
  return {x: Math.sign(c) * Math.abs(c) ** power * 112, y: Math.sign(s) * Math.abs(s) ** power * 112};
});
const CIRCLE = contour(1), ROUNDED_SQUARE = contour(.5);

export interface MechanismShowcaseProps {
  frame: number;
  durationInFrames?: number;
  fps?: number;
  width?: number;
  height?: number;
  /** Explicit seed is independent of frame, material and render traversal. */
  seed: string;
  /** Required DOM-global unique namespace, stable across frames. */
  instanceId: string;
  palette?: MaterialPalette;
  /** Omit for transparent output; explicit stage fills accept opaque #RGB/#RRGGBB only. */
  background?: string;
  /** Pin a treatment for direct comparisons; otherwise switch on authored frame quarters. */
  material?: MaterialKind;
  showLabels?: boolean;
}

/** Standalone SSR/raster probe and opt-in scene component. No Remotion import needed.
 * A host may pass useCurrentFrame() / chapterFrame and its actual shot duration.
 * ViewBox stays fixed and is contained in either portrait or landscape dimensions.
 */
export function MechanismShowcase({frame, durationInFrames = 180, fps = 30, width = 960, height = 540,
  seed, instanceId, palette = SHOWCASE_PALETTE, background,
  material, showLabels = true}: MechanismShowcaseProps) {
  finite(frame, 'Frame'); finite(width, 'Width'); finite(height, 'Height'); finite(fps, 'FPS');
  nonempty(seed, 'Texture seed'); nonempty(instanceId, 'Showcase instance ID'); assertPalette(palette);
  if (!Number.isInteger(durationInFrames) || durationInFrames < 8 || durationInFrames > 1e7) throw new RangeError('Showcase duration must be an integer from 8 to 1e7 frames');
  if (width < 1 || height < 1 || width > 16384 || height > 16384) throw new RangeError('Showcase dimensions must be from 1 to 16384');
  if (fps <= 0 || fps > 240) throw new RangeError('Showcase FPS must be positive and at most 240');
  if (background !== undefined && !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(background)) {
    throw new RangeError('Showcase background must be an opaque #RGB or #RRGGBB color, or omitted');
  }
  const viewport = containedViewportBounds(width, height, 960, 540);
  const last = durationInFrames - 1;
  const track = prepareMorph({id: 'continuous-subject', from: CIRCLE, to: ROUNDED_SQUARE,
    pointCount: 64, startFrame: last * .12, endFrame: last * .84});
  const geometry = morphAtFrame(track, frame), current = material ?? materialAtFrame(frame, 0, last);
  return <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 960 540"
    preserveAspectRatio="xMidYMid meet" role="img" aria-label="Equal-point morph and four SVG graphic treatments"
    data-mechanism="equal-point-material-showcase" data-fps={fps} data-alpha-default={background === undefined ? 'transparent' : 'opaque'}>
    {background !== undefined && <rect data-role="stage-background" {...viewport} fill={background}/>}
    {showLabels && <g fill={palette.ink} fontFamily="sans-serif">
      <text x="64" y="62" fontSize="17" letterSpacing="3">ONE OBJECT / FOUR TREATMENTS</text>
      <text x="64" y="105" fontSize="30" fontWeight="700">Identity stays. Surface changes.</text>
      <text x="64" y="145" fontSize="16">Authored contour · stable point IDs · frame-only motion</text>
    </g>}
    <g transform="translate(278 321) scale(1.05)">
      <MaterialShape geometry={geometry} palette={palette} material={current} seed={seed} instanceId={`${instanceId}:hero`}/>
    </g>
    {showLabels && <text x="278" y="486" textAnchor="middle" fill={palette.ink} fontFamily="sans-serif" fontSize="17">
      {current.toUpperCase()} / continuous-subject
    </text>}
    {MATERIAL_KINDS.map((kind, index) => {
      const x = 603 + index % 2 * 205, y = 252 + Math.floor(index / 2) * 169;
      return <g key={kind} data-role="material-comparison" data-active={kind === current ? 'true' : 'false'}>
        <g transform={`translate(${x} ${y}) scale(.43)`}>
          <MaterialShape geometry={geometry} palette={palette} material={kind} seed={seed} instanceId={`${instanceId}:${kind}`} strokeWidth={3}/>
        </g>
        {showLabels && <g fontFamily="sans-serif" fill={palette.ink}>
          <text x={x} y={y + 73} textAnchor="middle" fontSize="14" fontWeight={kind === current ? '700' : '400'}>{kind.toUpperCase()}</text>
          {kind === current && <circle cx={x - 53} cy={y + 68} r="3" fill={palette.base}/>}
        </g>}
      </g>;
    })}
  </svg>;
}
