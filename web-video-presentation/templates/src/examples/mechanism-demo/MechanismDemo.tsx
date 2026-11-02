import React, { useId } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { modelAtFrame, type MechanismModel } from './model';

export type MechanismPalette = {
  background: string;
  body: string;
  edge: string;
  ink: string;
  muted: string;
  token: string;
  passed: string;
  rejected: string;
};
export type MechanismDemoProps = {
  /** Disables every text/number label, including the title and readouts. */
  showLabels?: boolean;
  /** Removes only the external background; device materials and shadows remain. */
  transparent?: boolean;
  palette?: Partial<MechanismPalette>;
};

const DEFAULT_PALETTE: MechanismPalette = {
  background: '#0B1420', body: '#203447', edge: '#547085',
  ink: '#E9F3F7', muted: '#94ADBA', token: '#F5C45E',
  passed: '#5CDBC2', rejected: '#FC887E',
};
const FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/** Pure artwork view also permits non-browser static SVG QA without mocking Remotion hooks. */
export const MechanismArtwork: React.FC<MechanismDemoProps & { model: MechanismModel }> = ({
  model: m, showLabels = true, transparent = false, palette,
}) => {
  const c = { ...DEFAULT_PALETTE, ...palette };
  const id = useId().replace(/:/g, '');
  const metal = `${id}-metal`;
  const glass = `${id}-glass`;
  const shadow = `${id}-shadow`;
  const statusColor = m.gateTone === 'rejected' ? c.rejected : m.gateTone === 'passed' ? c.passed : c.muted;
  const statusText = m.status === 'ready' ? `${m.capacity} 枚令牌就绪` :
    m.status === 'spending' ? '每次放行，消耗 1 枚令牌' :
    m.status === 'empty' ? `请求 ${m.latestRequest?.id} 到达时：${m.latestRequest?.before} 枚令牌 → 拒绝` :
    `补充后，请求 ${m.latestRequest?.id} 获得令牌 → 放行`;

  const Token = ({ x, y, scale = 1, opacity = 1 }: {
    x: number; y: number; scale?: number; opacity?: number;
  }) => <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
    <rect x="-38" y="-14" width="76" height="28" rx="14" fill={c.token} stroke="#FFE8AF" strokeWidth="2" />
    <path d="M-23 -7 H20" stroke="#FFF1CD" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    <path d="M-24 8 H24" stroke="#886420" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
    <circle r="4" fill="#6F5427" />
  </g>;

  return <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: transparent ? 'transparent' : c.background }}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="100%" height="100%"
      preserveAspectRatio="xMidYMid meet" style={{ display: 'block', fontFamily: FONT }}
      role="img" aria-label="令牌桶离散教学模型：两枚初始令牌，第三次请求被拒绝，补充后再次放行">
      <defs>
        <linearGradient id={metal} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#466176" /><stop offset="0.3" stopColor={c.body} /><stop offset="1" stopColor="#142737" />
        </linearGradient>
        <linearGradient id={glass} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#91C7D8" stopOpacity="0.18" /><stop offset="0.6" stopColor="#C7F0F5" stopOpacity="0.03" />
          <stop offset="1" stopColor="#91C7D8" stopOpacity="0.12" />
        </linearGradient>
        <filter id={shadow} x="-30%" y="-30%" width="160%" height="175%">
          <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000000" floodOpacity="0.28" />
        </filter>
      </defs>

      {showLabels && <g>
        <text x="86" y="73" fill={c.ink} fontSize="32" fontWeight="650">令牌桶：为什么第三次被拒绝？</text>
        <text x="87" y="108" fill={c.muted} fontSize="17">容量 {m.capacity} · 每 {m.refillEverySeconds} 秒补充 1 枚 · 离散教学模型</text>
        <text x="1190" y="74" textAnchor="end" fill={c.muted} fontSize="14" letterSpacing="2">TOKEN BUCKET / 08s</text>
      </g>}

      {/* A single physical apparatus, with an inlet, two storage slots, actuator, and two output tubes. */}
      <g filter={`url(#${shadow})`}>
        <path d="M112 398 H1144" stroke="#0C1C29" strokeWidth="66" strokeLinecap="round" />
        <path d="M680 398 C734 398 746 550 854 550 H1144" fill="none" stroke="#0C1C29" strokeWidth="66" strokeLinecap="round" />
        <path d="M112 398 H1144" stroke={c.edge} strokeWidth="58" strokeLinecap="round" />
        <path d="M680 398 C734 398 746 550 854 550 H1144" fill="none" stroke={c.edge} strokeWidth="58" strokeLinecap="round" />
        <path d="M112 398 H1144" stroke="#142A3A" strokeWidth="52" strokeLinecap="round" />
        <path d="M680 398 C734 398 746 550 854 550 H1144" fill="none" stroke="#142A3A" strokeWidth="52" strokeLinecap="round" />
        <path d="M127 378 H610 M761 378 H1128 M870 530 H1128" stroke="#B1D4E1" strokeWidth="2" opacity="0.35" strokeLinecap="round" />

        <rect x="545" y="173" width="159" height="151" rx="24" fill={`url(#${metal})`} stroke={c.edge} strokeWidth="2" />
        <rect x="562" y="189" width="124" height="118" rx="14" fill="#0D2231" stroke="#83A6B7" strokeOpacity="0.45" />
        {m.slots.map((slot) => <g key={slot.index}>
          <rect x="582" y={slot.targetY - 17} width="84" height="34" rx="17" fill="none" stroke={c.edge} strokeDasharray="4 6" opacity="0.52" />
          {slot.occupied && <Token x={slot.x} y={slot.y} />}
        </g>)}
        <rect x="562" y="189" width="124" height="118" rx="14" fill={`url(#${glass})`} />
        <path d="M574 201 V289" stroke="#D5F7FF" strokeWidth="3" opacity="0.22" strokeLinecap="round" />
        <path d="M604 172 V151 H645 V172" fill={`url(#${metal})`} stroke={c.edge} strokeWidth="2" />
        <rect x="598" y="137" width="53" height="16" rx="8" fill={c.body} stroke={c.edge} strokeWidth="2" />
        <path d="M624 121 V136" stroke={c.token} strokeWidth="4" strokeLinecap="round" opacity={0.3 + m.refillPulse * 0.7} />

        {/* Actuator and its closed-gate stop are separate from the request paths. */}
        <path d="M624 325 V340 H680 V353" fill="none" stroke="#0D2130" strokeWidth="18" strokeLinejoin="round" />
        <path d="M624 325 V340 H680 V353" fill="none" stroke={c.edge} strokeWidth="3" strokeLinejoin="round" />
        <rect x="648" y="326" width="64" height="26" rx="8" fill={`url(#${metal})`} stroke={c.edge} strokeWidth="2" />
        <rect x="662" y={347 + m.gateOffsetY} width="36" height="78" rx="8" fill={`url(#${metal})`} stroke="#9AB5C6" strokeWidth="2" />
        <path d={`M670 ${359 + m.gateOffsetY} H690 M670 ${367 + m.gateOffsetY} H690`} stroke="#AEC6D0" opacity="0.4" strokeWidth="2" />
        <rect x="650" y="430" width="60" height="12" rx="4" fill={c.body} stroke={c.edge} strokeWidth="2" />
        <circle cx="680" cy="338" r="6" fill={statusColor} />
        {m.tokenTransfers.map((token) => <Token key={token.id} {...token} />)}

        {/* Intake rim and collection stops keep the flow legible even without labels. */}
        <rect x="110" y="365" width="12" height="66" rx="6" fill={`url(#${metal})`} stroke={c.edge} strokeWidth="2" />
        <path d="M1163 371 V425 M1163 523 V577" stroke={c.edge} strokeWidth="8" strokeLinecap="round" />
        <path d="M846 391 L855 398 L846 405 M891 391 L900 398 L891 405" fill="none" stroke={c.passed} strokeWidth="3" opacity="0.35" />
        <path d="M903 543 L912 550 L903 557 M948 543 L957 550 L948 557" fill="none" stroke={c.rejected} strokeWidth="3" opacity="0.35" />
        {m.requests.filter((request) => request.visible).map((request) => {
          const color = request.outcome === 'passed' ? c.passed : request.outcome === 'rejected' ? c.rejected : c.ink;
          return <g key={request.id} transform={`translate(${request.x} ${request.y})`}>
            <circle r="23" fill="#152B3A" stroke={color} strokeWidth="3" />
            <circle r="17" fill={color} fillOpacity="0.15" />
            {showLabels ? <text y="7" textAnchor="middle" fill={color} fontSize="20" fontWeight="650">{request.id}</text> :
              <path d="M-7 0 H7 M0 -7 V7" stroke={color} strokeWidth="3" strokeLinecap="round" />}
          </g>;
        })}
        <g transform="translate(502 150)">
          <circle r="20" fill={c.body} stroke={c.edge} strokeWidth="2" />
          <circle r="15" fill="none" stroke={c.token} strokeOpacity={0.2 + m.refillPulse * 0.7} strokeWidth="2" />
          <path d="M0 0 V-10" stroke={c.token} strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${m.clockDegrees})`} />
          <circle r="3" fill={c.token} />
        </g>
      </g>

      {showLabels && <g>
        <text x="144" y="335" fill={c.muted} fontSize="18">请求到达</text>
        <path d="M144 347 H205" stroke={c.muted} strokeWidth="1.5" />
        <text x="731" y="216" fill={c.muted} fontSize="16">可用令牌</text>
        <text x="729" y="259" fill={c.token} fontSize="40" fontWeight="650">{m.tokens}<tspan fontSize="22" fill={c.muted}> / {m.capacity}</tspan></text>
        <text x="731" y="290" fill={c.muted} fontSize="14">满仓时不再累积</text>
        <text x="624" y="119" textAnchor="middle" fill={c.muted} fontSize="14">补充入口</text>
        <text x="680" y="473" textAnchor="middle" fill={c.muted} fontSize="15">令牌驱动闸门</text>
        <text x="1137" y="343" textAnchor="end" fill={c.passed} fontSize="18">放行 <tspan fontWeight="700">{m.passedCount}</tspan></text>
        <text x="1137" y="498" textAnchor="end" fill={c.rejected} fontSize="18">拒绝 <tspan fontWeight="700">{m.rejectedCount}</tspan></text>
        <circle cx="99" cy="545" r="5" fill={statusColor} />
        <text x="116" y="552" fill={c.ink} fontSize="21" fontWeight="550">{statusText}</text>
        <text x="116" y="582" fill={c.muted} fontSize="15">到门时判断；同一时刻先补充，再处理请求。</text>
      </g>}

      <g>
        <path d="M94 646 H1186" stroke={c.edge} strokeWidth="2" opacity="0.5" />
        <path d={`M94 646 H${94 + 1092 * m.progress}`} stroke={c.token} strokeWidth="3" strokeLinecap="round" />
        {Array.from({ length: 9 }, (_, second) => <path key={second}
          d={`M${94 + 1092 * second / 8} 641 V651`} stroke={c.edge} strokeWidth="2" />)}
        {m.events.filter((event) => event.kind === 'request').map((event) => <circle key={event.id}
          cx={94 + 1092 * event.at / 8} cy="646" r="5" fill={event.outcome === 'passed' ? c.passed : c.rejected} />)}
        <circle cx={94 + 1092 * m.progress} cy="646" r="5" fill={c.token} />
        {showLabels && <g fill={c.muted} fontSize="13">
          <text x="94" y="676">0 s</text><text x="1186" y="676" textAnchor="end">8 s</text>
          <text x="640" y="678" textAnchor="middle">教学示意 · 非连续限流器仿真</text>
        </g>}
      </g>
    </svg>
  </div>;
};

/** Original SVG artwork. No external assets, fonts, audio, wall-clock effects, or CSS animation. */
export const MechanismDemo: React.FC<MechanismDemoProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <MechanismArtwork {...props} model={modelAtFrame(frame, fps)} />;
};

export default MechanismDemo;
