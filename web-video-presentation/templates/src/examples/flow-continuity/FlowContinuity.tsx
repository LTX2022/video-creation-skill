import { useCurrentFrame } from 'remotion';
import { TransparentFix } from '../../components/TransparentFix';
import { buildChapterTimingIndex, clockAtStep, type TimelineStep } from '../../video/continuity-clock';
import { flowModelAt, routePoints, type FlowModel, type Point } from './model';

const C = { ink: '#253b3b', paper: '#f5f2e9', surface: '#fffcf5', muted: '#71817b', line: '#d9e0d5', A: '#207e70', B: '#c2704e' };
const point = (p: Point, portrait: boolean): Point => portrait ? { x: (p.y - 150) * 1.25 + 40, y: (p.x - 120) * 0.88 + 150 } : p;
const pathOf = (index: number, portrait: boolean) => {
  const [a, b, c, d] = routePoints(index).map((p) => point(p, portrait)) as [Point, Point, Point, Point];
  return `M ${a.x} ${a.y} C ${b.x} ${b.y}, ${c.x} ${c.y}, ${d.x} ${d.y}`;
};

/** Pure SVG: the stage alone is removed in overlay mode; object faces and shadows survive. */
export function FlowContinuityScene({ model, isOverlay = false, portrait = false, variant = 'flow' }: {
  model: FlowModel;
  isOverlay?: boolean;
  portrait?: boolean;
  variant?: 'flow' | 'craft';
}) {
  const width = portrait ? 680 : 1200;
  const height = portrait ? 1100 : 680;
  const phaseLabels = variant === 'craft' ? ['对齐文案', '先定关系', '看清再切'] : ['识别', '分流', '结果'];
  const active = model.phase === 'identify' ? 0 : model.phase === 'route' ? 1 : 2;
  const gate = portrait ? { x: 92, y: 448, w: 440, h: 112 } : { x: 465, y: 177, w: 112, h: 355 };
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} width="100%" height="100%"
    role="img" aria-label={variant === 'craft' ? '同一批文案对象先对齐、再按关系分组，最后保持结果供阅读' : '四个数据对象经识别后按 A、B 两组分流，最后保持结果'}
    data-clock-scope={model.clockScope} style={{ fontFamily: 'var(--font-body, "Noto Sans CJK SC", sans-serif)' }}>
    {!isOverlay && <rect data-scene-background data-role="stage" width={width} height={height} fill={C.paper} />}
    <g fill={C.ink}>
      <text x={portrait ? 58 : 76} y={portrait ? 75 : 76} fontSize={18} fill={C.muted} letterSpacing="2">{variant === 'craft' ? '文案 → 对象 → 关系' : '原创流程示意 · 4 个对象'}</text>
      {phaseLabels.map((label, i) => <g key={label} opacity={active === i ? 1 : 0.34}>
        <text x={(portrait ? 58 : 76) + i * (portrait ? 194 : 166)} y={portrait ? 124 : 124} fontSize={portrait ? 26 : 25} fontWeight={active === i ? 700 : 400}>{label}</text>
        {active === i && <path d={`M ${(portrait ? 58 : 76) + i * (portrait ? 194 : 166)} ${portrait ? 140 : 140} h ${portrait ? 112 : 82}`} stroke={C.A} strokeWidth="3" />}
      </g>)}
    </g>
    {/* Static geometry is separate from the per-frame object poses. Paths are not motion trails. */}
    <g fill="none" stroke={C.line} strokeWidth={2}>
      {[0, 1, 2, 3].map((index) => <path key={index} d={pathOf(index, portrait)} />)}
    </g>
    <g>
      <rect x={gate.x + 3} y={gate.y + 8} width={gate.w} height={gate.h} rx={24} fill={C.ink} opacity="0.06" />
      <rect x={gate.x} y={gate.y} width={gate.w} height={gate.h} rx={24} fill={C.surface} stroke={C.line} strokeWidth="2" />
      <path d={portrait ? 'M 118 530 H 506' : 'M 546 203 V 506'} stroke={C.A} strokeWidth="3" opacity="0.6" />
      <text x={portrait ? 560 : 521} y={portrait ? 506 : 571} textAnchor={portrait ? 'start' : 'middle'} fontSize={20} fill={C.muted}>{variant === 'craft' ? '关系' : '识别'}</text>
    </g>
    {(['A', 'B'] as const).map((group, i) => {
      const box = portrait ? { x: 95 + i * 219, y: 790, w: 190, h: 213 } : { x: 833, y: 210 + i * 175, w: 253, h: 110 };
      return <g key={group}>
        <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={18} fill={C[group]} opacity="0.055" />
        <path d={`M ${box.x + 14} ${box.y} H ${box.x + box.w - 14}`} stroke={C[group]} strokeWidth="2" />
        <text x={box.x + 4} y={box.y - 19} fontSize={22} fill={C[group]}>{variant === 'craft' ? (group === 'A' ? '同组' : '对照') : group}</text>
        <text x={box.x + box.w - 4} y={box.y - 19} textAnchor="end" fontSize={22} fontWeight="700" fill={C[group]}>{model.counts[group]} / 2</text>
      </g>;
    })}
    {model.objects.map((object) => {
      const p = point(object, portrait);
      const color = C[object.group];
      return <g key={object.objectId} data-object-id={object.objectId} transform={`translate(${p.x} ${p.y})`}>
        <rect x={-45} y={-24} width={90} height={62} rx={13} fill={C.ink} opacity="0.08" />
        <rect data-role="object-face" x={-46} y={-31} width={92} height={62} rx={13} fill={C.surface} stroke={C.line} strokeWidth="1.5" />
        <rect x={-46} y={-31} width={92} height={62} rx={13} fill={color} opacity={object.identified * 0.1} />
        <text x={-29} y={7} fontSize={23} fontWeight="700" fill={C.ink}>{object.label}</text>
        <g opacity={1 - object.identified} stroke={C.muted} strokeWidth="2"><path d="M 11 -5 h 16 M 11 4 h 11" /></g>
        <g opacity={object.identified} fill={color}>
          {object.group === 'A' ? <circle cx={21} cy={0} r={7} /> : <rect x={14} y={-7} width={14} height={14} rx={3} />}
        </g>
      </g>;
    })}
    <g fill={C.muted} fontSize={18}>
      <text x={portrait ? 58 : 76} y={height - 53}>{model.phase === 'hold'
        ? (variant === 'craft' ? '画面保持 · 由口播时序决定切换' : '4 个对象 · 身份保留 · 结果停留')
        : (variant === 'craft' ? '同一批对象，不随口播分句重新入场' : `${model.counts.identified} / 4 已识别`)}</text>
      {model.clockScope === 'step' && <text x={width - 58} y={height - 25} textAnchor="end" fontSize={14}>单步示意 · 非全章时钟</text>}
    </g>
  </svg>;
}

/** Standalone silent teaching preview only. Production chapters always receive Root's actual STEPS. */
const PREVIEW_STEPS: readonly TimelineStep[] = [
  { chapter: 'flow-preview', stepIndex: 0, startFrame: 0, durationInFrames: 80 },
  { chapter: 'flow-preview', stepIndex: 1, startFrame: 80, durationInFrames: 130 },
  { chapter: 'flow-preview', stepIndex: 2, startFrame: 210, durationInFrames: 90 },
];
const PREVIEW_CLOCKS = buildChapterTimingIndex(PREVIEW_STEPS);

export function FlowContinuityPreview({ isOverlay = false }: { isOverlay?: boolean }) {
  const frame = useCurrentFrame();
  const timing = PREVIEW_STEPS.find((step) => frame < step.startFrame + step.durationInFrames) ?? PREVIEW_STEPS[2]!;
  const clock = clockAtStep(timing, frame - timing.startFrame, PREVIEW_CLOCKS);
  return <FlowContinuityScene model={flowModelAt(clock.chapterFrame, clock.chapterStepTimings)} isOverlay={isOverlay} />;
}

export function FlowContinuityAlphaPreview() {
  return <div data-output-mode="alpha" style={{ width: '100%', height: '100%' }}><TransparentFix /><FlowContinuityPreview isOverlay /></div>;
}
