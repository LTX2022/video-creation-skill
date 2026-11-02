/** Small authored-contour tools, not an arbitrary SVG-path parser or physics engine. */
export interface Point2 { readonly x: number; readonly y: number }
export interface IdentifiedPoint extends Point2 { readonly id: string }
export interface ShapeGeometry {
  readonly id: string;
  readonly points: readonly IdentifiedPoint[];
}
export interface MorphTrack {
  readonly id: string;
  readonly from: ShapeGeometry;
  readonly to: ShapeGeometry;
  readonly startFrame: number;
  readonly endFrame: number;
}
export interface MaterialPalette {
  readonly id: string;
  readonly base: string;
  readonly ink: string;
  readonly highlight: string;
}
export const MATERIAL_KINDS = ['flat', 'paper', 'line', 'halftone'] as const;
export type MaterialKind = typeof MATERIAL_KINDS[number];
export interface MaterialState {
  readonly geometry: ShapeGeometry;
  readonly palette: MaterialPalette;
  readonly material: MaterialKind;
  readonly seed: string;
}

export function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  return value;
}
export function nonempty(value: string, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new RangeError(`${name} must be nonempty`);
  return value;
}
export function assertPoint(point: Point2): void {
  // A deliberate numeric envelope avoids overflowing lengths/interpolation.
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
      Math.abs(point.x) > 1e9 || Math.abs(point.y) > 1e9) {
    throw new RangeError('Contour coordinates must be finite and within ±1e9');
  }
}
export function assertGeometry(geometry: ShapeGeometry): void {
  nonempty(geometry.id, 'Geometry ID');
  if (geometry.points.length < 3 || geometry.points.length > 1024) throw new RangeError('Geometry needs 3–1024 points');
  const ids = new Set<string>();
  for (const point of geometry.points) {
    assertPoint(point); nonempty(point.id, 'Point ID');
    if (ids.has(point.id)) throw new RangeError('Point IDs must be unique');
    ids.add(point.id);
  }
}
export function assertPalette(palette: MaterialPalette): void {
  for (const key of ['id', 'base', 'ink', 'highlight'] as const) nonempty(palette[key], `Palette ${key}`);
}
export function assertMaterial(material: MaterialKind): void {
  if (!(MATERIAL_KINDS as readonly string[]).includes(material)) throw new RangeError('Unknown material');
}

/** Closed perimeter sampling; duplicate endpoints/zero-length edges are harmless.
 *  Input start point and winding are kept: author correspondence intentionally.
 *  Returned endpoints in the morph are exact *sampled* contours, not original paths.
 */
export function sampleClosedContour(points: readonly Point2[], count: number): readonly Point2[] {
  if (!Number.isInteger(count) || count < 3 || count > 1024) throw new RangeError('Sample count must be an integer from 3 to 1024');
  if (points.length < 3 || points.length > 4096) throw new RangeError('Source contour needs 3–4096 vertices');
  points.forEach(assertPoint);
  const lengths = points.map((a, i) => {
    const b = points[(i + 1) % points.length]!;
    return Math.hypot(b.x - a.x, b.y - a.y);
  });
  const perimeter = lengths.reduce((sum, length) => sum + length, 0);
  if (!(perimeter > 0)) throw new RangeError('Contour perimeter must be positive');
  const sampled: Point2[] = [];
  let edge = 0, edgeStart = 0;
  for (let i = 0; i < count; i++) {
    const distance = perimeter * (i / count);
    while (edge < points.length - 1 && (lengths[edge] === 0 || edgeStart + lengths[edge]! < distance)) {
      edgeStart += lengths[edge]!; edge++;
    }
    const a = points[edge]!, b = points[(edge + 1) % points.length]!;
    const t = lengths[edge]! > 0 ? Math.max(0, Math.min(1, (distance - edgeStart) / lengths[edge]!)) : 0;
    sampled.push(Object.freeze({x: a.x * (1 - t) + b.x * t, y: a.y * (1 - t) + b.y * t}));
  }
  return Object.freeze(sampled);
}

/** Explicit frame interval, with exact boundary values and no clock/history state. */
export function frameProgress(frame: number, startFrame: number, endFrame: number): number {
  finite(frame, 'Frame'); finite(startFrame, 'Start frame'); finite(endFrame, 'End frame');
  const span = endFrame - startFrame;
  if (!Number.isFinite(span) || span <= 0) throw new RangeError('Frame interval must have a finite positive span');
  if (frame <= startFrame) return 0;
  if (frame >= endFrame) return 1;
  const p = (frame - startFrame) / span;
  return p * p * (3 - 2 * p);
}

export function prepareMorph(input: {
  id: string; from: readonly Point2[]; to: readonly Point2[];
  pointCount?: number; startFrame: number; endFrame: number;
}): MorphTrack {
  nonempty(input.id, 'Morph ID');
  frameProgress(input.startFrame, input.startFrame, input.endFrame);
  const count = input.pointCount ?? 64;
  const identify = (points: readonly Point2[]): ShapeGeometry => Object.freeze({
    id: input.id,
    points: Object.freeze(sampleClosedContour(points, count).map((point, index) =>
      Object.freeze({...point, id: `${input.id}:point:${index}`}))),
  });
  return Object.freeze({id: input.id, from: identify(input.from), to: identify(input.to),
    startFrame: input.startFrame, endFrame: input.endFrame});
}

/** Equal point counts and matching IDs are required; never silently rematch identities. */
export function interpolateGeometry(from: ShapeGeometry, to: ShapeGeometry, progress: number): ShapeGeometry {
  assertGeometry(from); assertGeometry(to); finite(progress, 'Progress');
  if (from.id !== to.id || from.points.length !== to.points.length ||
      from.points.some((point, index) => point.id !== to.points[index]!.id)) {
    throw new RangeError('Morph endpoints must share geometry ID, point count and ordered point IDs');
  }
  if (progress <= 0) return from;
  if (progress >= 1) return to;
  return Object.freeze({id: from.id, points: Object.freeze(from.points.map((point, index) => {
    const target = to.points[index]!;
    return Object.freeze({id: point.id, x: point.x * (1 - progress) + target.x * progress,
      y: point.y * (1 - progress) + target.y * progress});
  }))});
}
export function morphAtFrame(track: MorphTrack, frame: number): ShapeGeometry {
  if (track.id !== track.from.id || track.id !== track.to.id) throw new RangeError('Track and geometry IDs must match');
  return interpolateGeometry(track.from, track.to, frameProgress(frame, track.startFrame, track.endFrame));
}
export function geometryPath(geometry: ShapeGeometry): string {
  assertGeometry(geometry);
  return geometry.points.map((point, i) => `${i ? 'L' : 'M'}${point.x} ${point.y}`).join(' ') + ' Z';
}
export function geometryBounds(geometry: ShapeGeometry) {
  assertGeometry(geometry);
  const xs = geometry.points.map(point => point.x), ys = geometry.points.map(point => point.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return {x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y};
}

/** User-space extents of the full viewport under SVG xMidYMid meet containment.
 * A background drawn only over the nominal viewBox leaves transparent letterboxes.
 */
export function containedViewportBounds(width: number, height: number, viewBoxWidth: number, viewBoxHeight: number) {
  for (const value of [width, height, viewBoxWidth, viewBoxHeight]) {
    finite(value, 'Viewport dimension');
    if (value <= 0) throw new RangeError('Viewport dimensions must be positive');
  }
  const scale = Math.min(width / viewBoxWidth, height / viewBoxHeight);
  const visibleWidth = finite(width / scale, 'Visible viewport width');
  const visibleHeight = finite(height / scale, 'Visible viewport height');
  return {x: (viewBoxWidth - visibleWidth) / 2, y: (viewBoxHeight - visibleHeight) / 2,
    width: visibleWidth, height: visibleHeight};
}

/** A 2D geometry helper only, not a joint/rig or simulation. Degrees follow SVG's y-down convention. */
export function rotateAround(point: Point2, pivot: Point2, angleDegrees: number): Point2 {
  assertPoint(point); assertPoint(pivot); finite(angleDegrees, 'Angle');
  const angle = angleDegrees % 360;
  if (angle === 0 || (point.x === pivot.x && point.y === pivot.y)) return point;
  const radians = angle / 180 * Math.PI, c = Math.cos(radians), s = Math.sin(radians);
  const dx = point.x - pivot.x, dy = point.y - pivot.y;
  const result = {x: pivot.x + dx * c - dy * s, y: pivot.y + dx * s + dy * c};
  assertPoint(result);
  return Object.freeze(result);
}

/** Indexed integer hashing is a pure texture coordinate, never a random stream. */
export function seededUnit(seed: string, index: number): number {
  nonempty(seed, 'Texture seed');
  if (!Number.isSafeInteger(index) || index < 0) throw new RangeError('Texture index must be a nonnegative safe integer');
  let hash = 2166136261;
  const key = `${seed.length}:${seed}:${index}`;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  hash ^= hash >>> 16; hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15; hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}

/** Changing the material does not regenerate/reposition geometry or mutate the palette. */
export function materialState(geometry: ShapeGeometry, palette: MaterialPalette, material: MaterialKind, seed: string): MaterialState {
  assertGeometry(geometry); assertPalette(palette); assertMaterial(material); nonempty(seed, 'Texture seed');
  return Object.freeze({geometry, palette, material, seed});
}
export function materialAtFrame(frame: number, startFrame: number, endFrame: number): MaterialKind {
  // Validate with the same explicit interval, but evenly space switches in frame time.
  frameProgress(frame, startFrame, endFrame);
  const p = frame <= startFrame ? 0 : frame >= endFrame ? 1 : (frame - startFrame) / (endFrame - startFrame);
  return MATERIAL_KINDS[Math.min(MATERIAL_KINDS.length - 1, Math.floor(p * MATERIAL_KINDS.length))]!;
}

/** Caller-supplied DOM-global instance namespace prevents collisions across inline SVGs. */
export function svgResourceId(namespace: string, entityId: string): string {
  nonempty(namespace, 'SVG instance namespace'); nonempty(entityId, 'Entity ID');
  const encode = (value: string) => Array.from({length: value.length}, (_, i) => value.charCodeAt(i).toString(16).padStart(4, '0')).join('');
  return `mechanism-${encode(namespace)}-${encode(entityId)}`;
}
