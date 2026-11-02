import {charUnits, fittedLines} from '../presets/primitives';
import {clamp, mix, phase, progress, seeded, sans, type ReferenceStyleProps} from './common';

interface Particle {id: number; t: number; v: number; scatter: readonly [number, number, number]; radius: number; luminous: number;}
type Vec3 = readonly [number, number, number];
const TAU = Math.PI * 2;
const ROWS = 24; const COLUMNS = 52;
/** Stable material coordinates, shared by particles and the visible surface filaments. */
const FIELD: readonly Particle[] = Array.from({length: ROWS * COLUMNS}, (_, id) => {
  const column = id % COLUMNS; const row = Math.floor(id / COLUMNS);
  return {id, t: (column + (seeded(id, 227) - .5) * .75) / COLUMNS * TAU,
    v: ((row + seeded(id, 232) * .6) / (ROWS - 1) - .5) * 2,
    scatter: [(seeded(id, 223) - .5) * 1350, (seeded(id, 241) - .5) * 850, (seeded(id, 257) - .5) * 750],
    radius: .6 + seeded(id, 269) * 1.2, luminous: seeded(id, 271)};
});
const DUST = Array.from({length: 108}, (_, id) => ({id, x: (seeded(id, 277) - .5) * 1450,
  y: (seeded(id, 281) - .5) * 920, z: (seeded(id, 283) - .5) * 800,
  radius: .4 + seeded(id, 293) * .8, opacity: .1 + seeded(id, 307) * .3}));
const FILAMENTS = Array.from({length: 19}, (_, i) => ({v: i / 9 - 1, opacity: i % 3 === 0 ? .32 : .13}));
const FILAMENT_SAMPLES = Array.from({length: 113}, (_, i) => i / 112 * TAU);
const FRONT_PATCHES = Array.from({length: 28}, (_, i) => [Math.PI - 1.4 + i * .1, Math.PI - 1.4 + (i + 1) * .1] as const);

/** A folded lemniscate surface, not a sphere or a stock particle emitter. */
function surface(t: number, v: number, breathe: number): Vec3 {
  const twist = t * .5 + .38;
  const spread = 72 + Math.sin(t * 2 + .4) * 20;
  const edge = v * spread;
  return [Math.sin(t) * 425 + Math.cos(t) * edge * Math.cos(twist),
    Math.sin(t * 2) * 133 + Math.sin(t) * edge * .48 + edge * Math.sin(twist) * .78 + Math.sin(t * 3) * breathe,
    Math.cos(t) * 215 + edge * Math.cos(twist) * 1.3];
}

/** Golden points assemble into a spatial ribbon; topology and IDs survive every frame. */
export function ParticleField(props: ReferenceStyleProps) {
  const {width: w, height: h, content, isOverlay = false, subtitleVisible = false} = props;
  const p = progress(props); const portrait = h > w;
  const usable = h * (subtitleVisible ? (portrait ? .58 : .73) : .94);
  const convergence = phase(p, .07, .53);
  const visibility = .3 + phase(p, 0, .14) * .7;
  const hold = phase(p, .64, .8);
  const camera = phase(p, .05, .83);
  const yaw = mix(-.39, .23, camera); const pitch = mix(-.19, .16, camera);
  const roll = portrait ? -.28 : -.13;
  const scale = portrait ? w / 1060 : Math.min(w / 1530, usable / 675);
  const centerX = w * (portrait ? .49 : .575);
  const centerY = usable * (portrait ? .575 : .53);
  const titleX = w * (portrait ? .085 : .066); const titleY = usable * (portrait ? .13 : .155);
  const titleWidth = w * (portrait ? .83 : .71);
  const titleSize = Math.min(w * (portrait ? .068 : .037), usable * .082);
  const title = fittedLines(content.title, titleWidth * .965, titleSize, portrait ? 3 : 2, titleSize * .72);
  const conclusionSize = Math.min(w * (portrait ? .033 : .018), usable * .035);
  const conclusion = fittedLines(content.conclusion || '', w * (portrait ? .83 : .75), conclusionSize, 2, conclusionSize * .74);
  const titleOpacity = phase(p, .015, .16);
  const titlePlateWidth = Math.min(titleWidth, Math.max(...title.lines.map(line => charUnits(line) * title.size * 1.035)));
  const conclusionPlateWidth = Math.max(...conclusion.lines.map(line => charUnits(line) * conclusion.size * 1.03));
  const id = `particle-depth-${Math.round(w)}-${Math.round(h)}-${isOverlay ? 'a' : 'c'}`;
  const project = ([x, y, z]: Vec3) => {
    const rx = x * Math.cos(yaw) + z * Math.sin(yaw); const rz = z * Math.cos(yaw) - x * Math.sin(yaw);
    const ry = y * Math.cos(pitch) - rz * Math.sin(pitch); const depth = rz * Math.cos(pitch) + y * Math.sin(pitch);
    const perspective = 1050 / (1050 + depth);
    return {x: centerX + (rx * Math.cos(roll) - ry * Math.sin(roll)) * perspective * scale,
      y: centerY + (rx * Math.sin(roll) + ry * Math.cos(roll)) * perspective * scale,
      depth, perspective};
  };
  const breathe = Math.sin(p * Math.PI * 2) * 4 * (1 - hold * .7);
  // Analytic near-fold depth rejection. Hidden points keep their material IDs;
  // alpha needs no opaque ribbon plate to establish the front/back crossing.
  const occluders = FRONT_PATCHES.flatMap(([a, b]) => {
    const q0 = project(surface(a, -1, breathe)); const q1 = project(surface(a, 1, breathe));
    const q2 = project(surface(b, -1, breathe)); const q3 = project(surface(b, 1, breathe));
    return [[q0, q1, q2], [q1, q3, q2]] as const;
  });
  const hiddenBehindFold = (q: {x: number; y: number; depth: number}) => {
    if (convergence < .75) return false;
    for (const [a, b, c] of occluders) {
      if (q.depth <= Math.min(a.depth, b.depth, c.depth) + 8) continue;
      const determinant = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
      if (Math.abs(determinant) < .001) continue;
      const u = ((b.y - c.y) * (q.x - c.x) + (c.x - b.x) * (q.y - c.y)) / determinant;
      const v = ((c.y - a.y) * (q.x - c.x) + (a.x - c.x) * (q.y - c.y)) / determinant;
      if (u >= 0 && v >= 0 && u + v <= 1 && q.depth > a.depth * u + b.depth * v + c.depth * (1 - u - v) + 8) return true;
    }
    return false;
  };
  const particles = FIELD.map(point => {
    const target = surface(point.t, point.v, breathe);
    const localConvergence = clamp(convergence * 1.13 - point.luminous * .13);
    const motion = (1 - localConvergence) * Math.sin(p * 3.5 + point.t) * 38;
    const position: Vec3 = [mix(point.scatter[0] + motion, target[0], localConvergence),
      mix(point.scatter[1] + motion * .35, target[1], localConvergence), mix(point.scatter[2], target[2], localConvergence)];
    const projected = project(position);
    return {...point, ...projected};
  }).sort((a, b) => b.depth - a.depth);
  return <svg xmlns="http://www.w3.org/2000/svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`}
    data-reference-style="particle-depth-film" data-preset-id="particle-depth-film" data-preset-family="reference" data-render-status="render-review-pending" data-safe-bottom={usable}
    data-phase={p < .18 ? 'opening' : p < .64 ? 'action' : 'hold'}
    role="img" aria-label={`${content.title}. ${content.conclusion}`}>
    <defs>
      <radialGradient id={`${id}-black`} cx=".58" cy=".52" r=".72"><stop stopColor="#15130e"/><stop offset=".55" stopColor="#090a09"/><stop offset="1" stopColor="#030505"/></radialGradient>
      <radialGradient id={`${id}-aura`}><stop stopColor="#9c783d" stopOpacity=".08"/><stop offset="1" stopColor="#9c783d" stopOpacity="0"/></radialGradient>
      <clipPath id={`${id}-safe`}><rect width={w} height={usable * .86} y={usable * .06}/></clipPath>
    </defs>
    {!isOverlay && <g data-role="stage" data-scene-background="true"><rect width={w} height={h} fill={`url(#${id}-black)`}/>
      <ellipse cx={centerX} cy={centerY} rx={w * .44} ry={usable * .43} fill={`url(#${id}-aura)`}/></g>}
    <g clipPath={`url(#${id}-safe)`} data-role="primary-subject" data-object-id="folded-gold-field">
      <g opacity={visibility * (1 - convergence * .3)} data-role="depth-dust">{DUST.map(point => {
        const position = project([point.x + Math.sin(p * 2 + point.id) * 8, point.y, point.z]);
        return <circle key={point.id} cx={position.x} cy={position.y} r={point.radius * scale * position.perspective}
          fill="#a18b61" fillOpacity={point.opacity}/>;
      })}</g>
      <g fill="none" stroke="#d3ab60" strokeWidth={Math.max(.35, scale * .5)} data-role="surface-filaments"
        opacity={phase(p, .29, .58)}>{FILAMENTS.map((filament, i) => {
          let connected = false;
          const d = FILAMENT_SAMPLES.map(t => {
            const q = project(surface(t, filament.v, breathe));
            if (hiddenBehindFold(q)) {connected = false; return '';}
            const command = connected ? 'L' : 'M'; connected = true;
            return `${command}${q.x.toFixed(2)},${q.y.toFixed(2)}`;
          }).join(' ');
          return <path key={i} d={d} opacity={filament.opacity}/>;
        })}</g>
      <g data-role="stable-particles" opacity={visibility}>{particles.map(point => {
        const near = clamp((230 - point.depth) / 490);
        const flicker = .91 + .09 * Math.sin(point.id * .7 + p * 9);
        const seamLight = Math.max(0, Math.cos(point.t - 1.25)) ** 10 * (1 - Math.abs(point.v) * .55) * convergence;
        const opacity = (.24 + near * .59 + seamLight * .17) * flicker * (point.luminous > .97 ? 1.25 : 1);
        const visible = hiddenBehindFold(point) ? 1 - phase(convergence, .75, .99) : 1;
        return <circle key={point.id} data-particle-id={point.id} data-object-id={`gold-point-${point.id}`} cx={point.x} cy={point.y}
          r={point.radius * scale * point.perspective * (.7 + near * .7) * (point.luminous > .97 ? 1.32 : 1) * (1 + seamLight * .16)}
          fill={point.luminous > .96 || seamLight > .63 ? '#fff2c8' : near > .6 ? '#e7c77f' : near > .3 ? '#c39c57' : '#8a713f'} fillOpacity={clamp(opacity) * visible}/>;
      })}</g>
      <g fill="none" stroke="#f8dfaa" strokeLinecap="round" opacity={phase(p, .43, .63) * .8} data-role="moving-highlights">
        {[0, 1, 2].map(i => {
          const head = p * .42 * TAU + i * TAU / 3;
          const d = Array.from({length: 11}, (_, n) => {
            const q = project(surface(head - .11 + n * .011, (i - 1) * .65, breathe));
            return `${n ? 'L' : 'M'}${q.x.toFixed(2)},${q.y.toFixed(2)}`;
          }).join(' ');
          return <path key={i} d={d} strokeWidth={scale * 1.3}/>;
        })}
      </g>
    </g>
    <g opacity={titleOpacity} transform={`translate(0 ${(1 - titleOpacity) * 9})`} data-role="title-group">
      {isOverlay && <rect x={titleX - title.size * .2} y={titleY - title.size * 1.1} width={titlePlateWidth + title.size * .4}
        height={title.lines.length * title.size * 1.27 + title.size * .35} rx={title.size * .04} fill="#090a09" opacity=".88" data-role="localized-readability"/>}
      <path d={`M${titleX},${titleY - title.size * 1.24} h${title.size * .85}`} stroke="#d2af6a" strokeWidth={Math.max(1, scale)} opacity=".7"/>
      <text x={titleX} y={titleY} fill="#eee3c9" fontFamily={sans} fontSize={title.size} fontWeight="300" letterSpacing={title.size * .025} data-role="title">
        {title.lines.map((line, i) => <tspan key={i} x={titleX} dy={i ? title.size * 1.27 : 0}>{line}</tspan>)}
      </text>
    </g>
    <g opacity={hold} data-role="conclusion-group">
      {isOverlay && <rect x={titleX - conclusionSize * .35} y={usable * .9 - conclusionSize} width={conclusionPlateWidth + conclusionSize * .7}
        height={conclusion.lines.length * conclusionSize * 1.5} fill="#090a09" opacity=".88" data-role="localized-readability"/>}
      <text x={titleX} y={usable * .9} fill="#b9aa8b" fontFamily={sans} fontSize={conclusion.size} fontWeight="400" letterSpacing={conclusion.size * .02} data-role="conclusion">
        {conclusion.lines.map((line, i) => <tspan key={i} x={titleX} dy={i ? conclusion.size * 1.45 : 0}>{line}</tspan>)}
      </text>
    </g>
  </svg>;
}
