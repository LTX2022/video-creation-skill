import {geometryBounds, geometryPath, materialState, seededUnit, svgResourceId, finite,
  type MaterialKind, type MaterialPalette, type ShapeGeometry} from './model';

export interface MaterialShapeProps {
  geometry: ShapeGeometry;
  palette: MaterialPalette;
  material: MaterialKind;
  /** Required authored seed; use the same value through the whole shot. */
  seed: string;
  /** DOM-global unique namespace per mounted instance, stable across frames. */
  instanceId: string;
  strokeWidth?: number;
  opacity?: number;
}

/** SVG-only graphic treatments. Textures stay inside the exact shared contour.
 * No filter, stage fill, animation loop, browser measurement or physical glass claim.
 */
export function MaterialShape({geometry, palette, material, seed, instanceId, strokeWidth = 2.4, opacity = 1}: MaterialShapeProps) {
  materialState(geometry, palette, material, seed);
  finite(strokeWidth, 'Stroke width'); finite(opacity, 'Opacity');
  if (strokeWidth < 0 || strokeWidth > 100 || opacity < 0 || opacity > 1) throw new RangeError('Invalid stroke width or opacity');
  const path = geometryPath(geometry), bounds = geometryBounds(geometry);
  const id = svgResourceId(instanceId, geometry.id), clipId = `${id}-clip`, patternId = `${id}-pattern`;
  const step = 11;
  const phaseX = seededUnit(seed, 0) * step, phaseY = seededUnit(seed, 1) * step;
  const textured = material === 'paper' || material === 'halftone';
  return <g data-mechanism="material-shape" data-object-id={geometry.id} data-palette-id={palette.id}
    data-material={material} data-seed={seed} opacity={opacity}>
    {textured && <defs>
      <clipPath id={clipId} clipPathUnits="userSpaceOnUse"><path d={path}/></clipPath>
      <pattern id={patternId} x={phaseX} y={phaseY} width={step} height={step} patternUnits="userSpaceOnUse">
        {material === 'halftone' ? <circle cx={step / 2} cy={step / 2} r={2.05} fill={palette.ink} opacity={.62}/> :
          <g stroke={palette.ink} strokeWidth={.65} opacity={.3}>
            <path d="M1 2 L4 1 M7 7 L9 5 M2 9 L3 8"/>
            <circle cx={7.5} cy={1.7} r={.45} fill={palette.ink} stroke="none"/>
          </g>}
      </pattern>
    </defs>}
    <path data-role="material-contour" d={path} fill={material === 'line' ? 'none' : palette.base}
      stroke={palette.ink} strokeWidth={strokeWidth} strokeLinejoin="round"/>
    {textured && <g clipPath={`url(#${clipId})`} data-role="clipped-material-texture">
      <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill={`url(#${patternId})`}/>
      {material === 'paper' && <path d={`M${bounds.x} ${bounds.y + bounds.height * .2} L${bounds.x + bounds.width} ${bounds.y + bounds.height * .05}`}
        fill="none" stroke={palette.highlight} opacity={.55} strokeWidth={Math.max(1, bounds.height * .022)}/>}
    </g>}
    {material === 'line' && <path d={path} fill="none" stroke={palette.base} strokeWidth={strokeWidth * .3} strokeLinejoin="round"/>}
  </g>;
}
