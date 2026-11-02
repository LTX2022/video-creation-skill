import type { FamilySceneProps } from './types';
import { T, TextBlock, Line, mix, labelAt, smooth } from './primitives';
import { itemProgress } from './motion';

/** Eight separately composed structures. Palette always comes from the active tokens. */
// Portrait semantic labels target 32.4 px at 1080 wide (u=.9). Geometry and fine print
// retain their original scale; landscape font values remain byte-for-byte equivalent.
const readingSize = (landscapePx: number, u: number, portrait: boolean) => (portrait ? 36 : landscapePx) * u;
function OrganicGrowth({spec, content, box:b, motion:m, unit:u, portrait}: FamilySceneProps) {
  const cx=b.x+b.width*.5, cy=b.y+b.height*.77;
  const seedR=Math.min(b.width*.09,b.height*.13);
  const targets=[{x:.19,y:.29},{x:.50,y:.12},{x:.81,y:.29}];
  return <g data-role="soft-organic-growth">
    <path d={`M ${cx} ${cy} C ${cx-b.width*.12} ${cy+b.height*.16}, ${cx+b.width*.12} ${cy+b.height*.16}, ${cx} ${cy}`}
      fill={T.soft} stroke={T.line} strokeWidth={1.3*u}/>
    {targets.map((target,i)=>{
      const p=itemProgress(m.transform,i,3,spec.motion.stagger);
      const ex=b.x+b.width*target.x, ey=b.y+b.height*target.y;
      const px=mix(cx,ex,p), py=mix(cy,ey,p);
      const leafR=Math.min(b.width*.075,b.height*.12);
      return <g key={i} data-object-id={`soft-leaf-${i}`}>
        <path d={`M ${cx} ${cy} C ${cx} ${cy-b.height*.25}, ${ex} ${ey+b.height*.24}, ${ex} ${ey}`}
          fill="none" stroke={T.chart(i)} strokeWidth={(3-i*.3)*u} pathLength={1} strokeDasharray="1" strokeDashoffset={1-p}/>
        <ellipse cx={px} cy={py} rx={leafR*(.55+.45*p)} ry={leafR*.7} fill={i===1?T.accent:T.panel}
          stroke={i===1?T.accent:T.chart(i)} strokeWidth={2*u} transform={`rotate(${(i-1)*-23*p} ${px} ${py})`}/>
        <path d={`M ${px-leafR*.45} ${py+leafR*.12} Q ${px} ${py-leafR*.15} ${px+leafR*.43} ${py-leafR*.18}`}
          fill="none" stroke={i===1?T.onAccent:T.chart(i)} strokeWidth={1.5*u}/>
        <TextBlock text={labelAt(content.labels,i+1,`阶段${i+1}`)} x={ex} y={ey+leafR+28*u} width={b.width*.26}
          fontSize={readingSize(20,u,portrait)} fill={T.secondary} align="middle" opacity={p}/>
      </g>;
    })}
    <circle data-object-id="soft-growth-origin" cx={cx} cy={cy} r={seedR*(.76+.24*m.setup)} fill={T.accent}/>
    <TextBlock text={labelAt(content.labels,0,'起点')} x={cx} y={cy+(portrait?12:7)*u} width={seedR*1.7} fontSize={readingSize(19,u,portrait)} align="middle" fill={T.onAccent} maxLines={1}/>
    <Line x1={b.x+b.width*.16} y1={b.y+b.height*.96} x2={b.x+b.width*.84} y2={b.y+b.height*.96} progress={m.hold} color={T.accent} width={2*u}/>
  </g>;
}

function SplitViews({content,box:b,motion:m,unit:u,portrait}:FamilySceneProps) {
  const mid=b.x+b.width*.5, cy=b.y+b.height*.50;
  const markerR=Math.min(b.width*.025,b.height*.055);
  return <g data-role="soft-shared-pivot-views">
    <rect x={b.x+b.width*.015} y={b.y+b.height*.04} width={b.width*.47} height={b.height*.84} fill={T.soft} opacity={.6}/>
    <path d={`M ${mid+b.width*.015} ${b.y+b.height*.04} H ${b.x+b.width*.985} V ${b.y+b.height*.88}`} fill="none" stroke={T.line} strokeWidth={1.5*u}/>
    <TextBlock text={labelAt(content.labels,0,'之前')} x={b.x+b.width*.06} y={b.y+b.height*.14} width={b.width*.35} fontSize={readingSize(22,u,portrait)} weight={700}/>
    <TextBlock text={labelAt(content.labels,3,'之后')} x={b.x+b.width*.57} y={b.y+b.height*.14} width={b.width*.35} fontSize={readingSize(22,u,portrait)} weight={700}/>
    <Line x1={mid} y1={b.y+b.height*.22} x2={mid} y2={b.y+b.height*.85} color={T.line} dashed/>
    {[0,1,2].map(i=>{
      const startX=b.x+b.width*(.12+i*.105),startY=b.y+b.height*(.36+(i%2)*.30);
      const endX=b.x+b.width*(.62+i*.13),endY=b.y+b.height*(.70-i*.16);
      const t=m.transform, q=1-t;
      const x=q*q*startX+2*q*t*mid+t*t*endX, y=q*q*startY+2*q*t*cy+t*t*endY;
      return <g key={i}>
        <circle cx={startX} cy={startY} r={markerR} fill="none" stroke={T.line} strokeDasharray="3 5" strokeWidth={1.3*u}/>
        <Line x1={b.x+b.width*.56} y1={endY} x2={b.x+b.width*.93} y2={endY} color={T.line}/>
        <circle data-object-id={`split-sample-${i}`} cx={x} cy={y} r={markerR*(1+.15*m.setup)} fill={T.chart(i)} stroke={T.panel} strokeWidth={3*u}/>
      </g>;
    })}
    <circle cx={mid} cy={cy} r={markerR*1.12} fill={T.panel} stroke={T.accent} strokeWidth={2*u}/>
    <path d={`M ${mid-markerR*.45} ${cy} H ${mid+markerR*.45} M ${mid} ${cy-markerR*.45} V ${cy+markerR*.45}`} stroke={T.accentInk} strokeWidth={1.5*u}/>
    <TextBlock text={labelAt(content.labels,2,'共同尺度')} x={mid} y={b.y+b.height*.98} width={b.width*.8} fontSize={readingSize(18,u,portrait)} fill={T.secondary} align="middle"/>
  </g>;
}

function PaperCollage({content,box:b,motion:m,unit:u,portrait}:FamilySceneProps) {
  const cx=b.x+b.width*.5,cy=b.y+b.height*.48, r=Math.min(b.width*.20,b.height*.31);
  const spread=(1-m.transform)*r*.65;
  return <g data-role="soft-cut-paper-collage">
    <path d={`M ${b.x+b.width*.09} ${b.y+b.height*.10} H ${b.x+b.width*.91} V ${b.y+b.height*.83} H ${b.x+b.width*.09} Z`}
      fill="none" stroke={T.line} strokeWidth={1.5*u} strokeDasharray="5 8"/>
    <g data-object-id="collage-paper-strip" transform={`translate(${-spread} ${spread*.3}) rotate(${-12+8*m.transform} ${cx} ${cy})`}>
      <rect x={cx-r*1.25} y={cy-r*.65} width={r*1.9} height={r*1.28} fill={T.panel} stroke={T.ink} strokeWidth={1.5*u}/>
      {[0,1,2].map(i=><Line key={i} x1={cx-r*1.06} y1={cy-r*.3+i*r*.25} x2={cx+r*(i===2?.02:.4)} y2={cy-r*.3+i*r*.25} color={i===0?T.accent:T.line} width={(i===0?4:1.5)*u}/>)}
    </g>
    <circle data-object-id="collage-cut-circle" cx={cx+r*.43+spread} cy={cy-r*.25-spread*.2} r={r*.78} fill={T.accent} opacity={.65+.35*m.setup}/>
    <path data-object-id="collage-folded-triangle" d={`M ${cx-r*.42} ${cy+r*.85+spread*.4} L ${cx+r*.92} ${cy+r*.78+spread*.4} L ${cx+r*.40} ${cy-r*.35+spread*.4} Z`}
      fill={T.inset} stroke={T.ink} strokeWidth={2*u}/>
    <path d={`M ${cx+r*.40} ${cy-r*.35+spread*.4} L ${cx+r*.32} ${cy+r*.69+spread*.4}`} fill="none" stroke={T.line} strokeWidth={1.2*u}/>
    {[0,1,2].map(i=><g key={i}>
      <circle cx={b.x+b.width*(.15+i*.35)} cy={b.y+b.height*.90} r={3*u} fill={T.accent}/>
      <TextBlock text={labelAt(content.labels,i,'片段')} x={b.x+b.width*(.15+i*.35)} y={b.y+b.height*.98} width={b.width*.28} fontSize={readingSize(18,u,portrait)} align="middle" fill={T.secondary}/>
    </g>)}
  </g>;
}

function TactileDial({content,box:b,motion:m,unit:u,portrait}:FamilySceneProps) {
  const cx=b.x+b.width*.5,cy=b.y+b.height*.46,r=Math.min(b.width*.27,b.height*.34);
  const angle=(-135+270*m.transform)*Math.PI/180;
  return <g data-role="soft-tactile-instrument">
    <circle cx={cx+4*u} cy={cy+6*u} r={r*1.12} fill={T.ink} opacity={.07}/>
    <circle data-object-id="dial-surface" cx={cx} cy={cy} r={r*1.12} fill={T.panel} stroke={T.line} strokeWidth={1.4*u}/>
    <circle cx={cx} cy={cy} r={r*.85} fill={T.inset} stroke={T.line} strokeWidth={1.5*u}/>
    {Array.from({length:25},(_,i)=>{
      const a=(-135+i*270/24)*Math.PI/180;
      const ir=i%4===0?r*.91:r*.96,or=r*1.035;
      return <line key={i} x1={cx+Math.sin(a)*ir} y1={cy-Math.cos(a)*ir} x2={cx+Math.sin(a)*or} y2={cy-Math.cos(a)*or}
        stroke={i/24<=m.transform?T.accent:T.line} strokeWidth={(i%4===0?2.5:1.3)*u}/>;
    })}
    <circle cx={cx} cy={cy} r={r*.63} fill={T.panel} stroke={T.line} strokeWidth={1.5*u}/>
    <line data-object-id="dial-indicator" x1={cx+Math.sin(angle)*r*.40} y1={cy-Math.cos(angle)*r*.40} x2={cx+Math.sin(angle)*r*.73} y2={cy-Math.cos(angle)*r*.73}
      stroke={T.accent} strokeWidth={5*u} strokeLinecap="round"/>
    <TextBlock text={labelAt(content.labels,m.phase==='hold'?3:1,'状态')} x={cx} y={cy+(portrait?12:8)*u} width={r*1.04} fontSize={readingSize(23,u,portrait)} weight={650} align="middle"/>
    <TextBlock text={`${Math.round(m.transform*100)} / 100`} x={cx} y={b.y+b.height*.94} width={b.width*.7} fontSize={readingSize(18,u,portrait)} family="mono" fill={T.muted} align="middle"/>
  </g>;
}

function EditorialObject({content,box:b,motion:m,unit:u,portrait}:FamilySceneProps) {
  const cx=b.x+b.width*.42,top=b.y+b.height*.13,h=b.height*.68;
  const w=Math.min(b.width*.28,h*.52), left=cx-w/2;
  const lift=(1-m.transform)*h*.09;
  return <g data-role="soft-editorial-vertical-subject">
    <Line x1={b.x+b.width*.06} y1={b.y+b.height*.06} x2={b.x+b.width*.06} y2={b.y+b.height*.92} color={T.line}/>
    <text x={b.x+b.width*.065} y={b.y+b.height*.97} fill={T.muted} fontSize={13*u} style={{fontFamily:'var(--font-mono)'}}>STUDY / 01</text>
    <g data-object-id="editorial-object-body" transform={`translate(0 ${lift})`}>
      <ellipse cx={cx} cy={top+h*1.025} rx={w*.64} ry={h*.035} fill={T.ink} opacity={.06}/>
      <path d={`M ${cx-w*.24} ${top} C ${cx-w*.32} ${top+h*.18}, ${left-w*.1} ${top+h*.26}, ${left} ${top+h*.72} Q ${left} ${top+h}, ${cx} ${top+h} Q ${cx+w*.5} ${top+h}, ${cx+w*.5} ${top+h*.72} C ${cx+w*.6} ${top+h*.26}, ${cx+w*.32} ${top+h*.18}, ${cx+w*.24} ${top} Z`}
        fill={T.panel} stroke={T.ink} strokeWidth={2*u}/>
      <ellipse cx={cx} cy={top} rx={w*.24} ry={h*.035} fill={T.inset} stroke={T.ink} strokeWidth={1.5*u}/>
      <path d={`M ${left+w*.09} ${top+h*.57} Q ${cx} ${top+h*.42}, ${cx+w*.41} ${top+h*.57} V ${top+h*.78} Q ${cx} ${top+h*.93}, ${left+w*.09} ${top+h*.78} Z`}
        fill={T.soft}/>
      <path d={`M ${cx-w*.13} ${top+h*.16} C ${cx-w*.35} ${top+h*.38}, ${cx-w*.36} ${top+h*.62}, ${cx-w*.29} ${top+h*.84}`}
        fill="none" stroke={T.line} strokeWidth={2*u}/>
    </g>
    {[0,1,2].map(i=>{
      const p=itemProgress(m.transform,i,3,.12), yy=top+h*(.16+i*.30);
      return <g key={i} data-object-id={`editorial-detail-${i}`}>
        <Line x1={cx+w*.35} y1={yy} x2={b.x+b.width*.70} y2={yy} progress={p} color={T.accent} width={1.5*u}/>
        <circle cx={cx+w*.35} cy={yy} r={3*u} fill={T.accent} opacity={p}/>
        <TextBlock text={labelAt(content.labels,i,'细节')} x={b.x+b.width*.73} y={yy+(portrait?12:6)*u} width={b.width*.24} fontSize={readingSize(19,u,portrait)} fill={T.secondary} opacity={p}/>
      </g>;
    })}
  </g>;
}

function ResearchLoop({content,box:b,motion:m,unit:u,portrait}:FamilySceneProps) {
  const cx=b.x+b.width*.5,cy=b.y+b.height*.48,rx=b.width*.32,ry=b.height*.31;
  const r=Math.min(b.width*.048,b.height*.075);
  const nodes=[{x:cx,y:cy-ry},{x:cx+rx,y:cy},{x:cx,y:cy+ry},{x:cx-rx,y:cy}];
  const a=(-.5+2*m.transform)*Math.PI;
  return <g data-role="soft-research-feedback-loop">
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={T.line} strokeWidth={2*u}/>
    <path d={`M ${cx} ${cy-ry} A ${rx} ${ry} 0 1 1 ${cx-.001} ${cy-ry}`} fill="none" stroke={T.accent} strokeWidth={3*u} pathLength={1} strokeDasharray="1" strokeDashoffset={1-m.transform}/>
    <path d={`M ${cx-rx*.45} ${cy} H ${cx+rx*.45} M ${cx} ${cy-ry*.38} V ${cy+ry*.38}`} stroke={T.line} strokeWidth={1.3*u} strokeDasharray="4 6"/>
    {nodes.map((n,i)=>{
      const p=itemProgress(m.transform,i,4,.12), off=i===0?-r-(portrait?13:10)*u:r+(portrait?44:24)*u;
      return <g key={i} data-object-id={`research-node-${i}`}>
        <circle cx={n.x} cy={n.y} r={r} fill={p>.9?T.soft:T.panel} stroke={p>.9?T.accent:T.line} strokeWidth={2*u}/>
        <text x={n.x} y={n.y+6*u} textAnchor="middle" fontSize={17*u} fill={T.ink} style={{fontFamily:'var(--font-mono)'}}>0{i+1}</text>
        <TextBlock text={labelAt(content.labels,i,`阶段${i+1}`)} x={n.x} y={n.y+off} width={b.width*.28}
          fontSize={readingSize(19,u,portrait)} align="middle" fill={T.secondary}/>
      </g>;
    })}
    <circle data-object-id="research-evidence-token" cx={cx+Math.cos(a)*rx} cy={cy+Math.sin(a)*ry} r={r*.37} fill={T.accent} stroke={T.panel} strokeWidth={2*u}/>
    <TextBlock text="可检验的假设" x={cx} y={cy+6*u} width={rx*1.14} fontSize={readingSize(19,u,portrait)} align="middle" fill={T.accentInk}/>
  </g>;
}

function AlignmentGrid({content,box:b,motion:m,unit:u,portrait}:FamilySceneProps) {
  const x0=b.x+b.width*.07,x1=b.x+b.width*.93,w=x1-x0;
  const baseline=b.y+b.height*.78, top=b.y+b.height*.12;
  return <g data-role="soft-open-alignment-grid">
    {[0,1,2,3,4].map(i=><Line key={i} x1={x0+w*i/4} y1={top} x2={x0+w*i/4} y2={baseline+b.height*.12} color={T.line} width={1*u} dashed={i>0&&i<4}/>)}
    {[0,1,2,3].map(i=><Line key={i} x1={x0} y1={top+(baseline-top)*i/3} x2={x1} y2={top+(baseline-top)*i/3} color={T.line} width={1*u}/>)}
    {[0,1,2,3].map(i=>{
      const p=itemProgress(m.transform,i,4,.06), x=x0+w*(i+.08)/4;
      const bandH=b.height*(.12+i*.052), y=mix(top+b.height*(.10+(i%2)*.15),baseline-bandH,p);
      return <g key={i} data-object-id={`hierarchy-band-${i}`}>
        <rect x={x} y={y} width={w*.20} height={bandH} fill={i===2?T.accent:T.soft}/>
        <rect x={x} y={y} width={w*.20} height={2*u} fill={T.accent}/>
        <text x={x+9*u} y={y+bandH*.67} fontSize={(25+i*9)*u} fontWeight={400+i*150} fill={i===2?T.onAccent:T.ink} style={{fontFamily:'var(--font-display-en)'}}>Aa</text>
        <TextBlock text={labelAt(content.labels,i,'层级')} x={x} y={baseline+(portrait?44:26)*u} width={w*.22} fontSize={readingSize(18,u,portrait)} fill={T.secondary} maxLines={1}/>
      </g>;
    })}
    <Line x1={x0} y1={baseline} x2={x1} y2={baseline} progress={m.transform} color={T.accent} width={3*u}/>
    <TextBlock text="共用基线 / 保留层级" x={x0} y={b.y+b.height*.985} width={w} fontSize={16*u} fill={T.muted} family="mono"/>
  </g>;
}

function CatalogSelection({content,box:b,motion:m,unit:u,portrait}:FamilySceneProps) {
  const cols=3, rows=2, gap=b.width*.025, inset=b.width*.01;
  const w=(b.width-2*inset-gap*(cols-1))/cols,h=b.height*.36;
  const top=b.y+b.height*.04;
  const tiles=Array.from({length:cols*rows},(_,i)=>({x:b.x+inset+(i%cols)*(w+gap),y:top+Math.floor(i/cols)*(h+b.height*.08)}));
  const target=4, from=tiles[0]!,to=tiles[target]!;
  const q=smooth(m.transform);
  return <g data-role="soft-catalog-selection">
    {tiles.map((t,i)=><g key={i} data-object-id={`catalog-item-${i}`}>
      <rect x={t.x} y={t.y} width={w} height={h} rx={8*u} fill={T.panel} stroke={T.line} strokeWidth={1.5*u}/>
      <path d={`M ${t.x+w*.12} ${t.y+h*.66} H ${t.x+w*.88}`} stroke={T.line} strokeWidth={1.2*u}/>
      {i%3===0?<g>
        <circle cx={t.x+w*.35} cy={t.y+h*.34} r={Math.min(w*.12,h*.18)} fill={T.soft} stroke={T.accent} strokeWidth={1.5*u}/>
        <Line x1={t.x+w*.55} y1={t.y+h*.26} x2={t.x+w*.84} y2={t.y+h*.26} color={T.accent} width={3*u}/>
        <Line x1={t.x+w*.55} y1={t.y+h*.43} x2={t.x+w*.74} y2={t.y+h*.43} color={T.line} width={2*u}/>
      </g>:i%3===1?<g>{[0,1,2].map(j=><rect key={j} x={t.x+w*(.18+j*.24)} y={t.y+h*(.48-j*.11)} width={w*.14} height={h*(.12+j*.11)} fill={j===1?T.accent:T.soft}/>)}</g>:
      <path d={`M ${t.x+w*.15} ${t.y+h*.48} C ${t.x+w*.36} ${t.y+h*.12}, ${t.x+w*.58} ${t.y+h*.55}, ${t.x+w*.85} ${t.y+h*.21}`} fill="none" stroke={T.accent} strokeWidth={3*u}/>}
      <TextBlock text={labelAt(content.labels,i,`方案${i+1}`)} x={t.x+w*.12} y={t.y+h*.87} width={w*.78} fontSize={readingSize(17,u,portrait)} fill={T.secondary} maxLines={1}/>
    </g>)}
    <rect data-object-id="catalog-focus" x={mix(from.x,to.x,q)-3*u} y={mix(from.y,to.y,q)-3*u} width={w+6*u} height={h+6*u} rx={10*u}
      fill="none" stroke={T.accent} strokeWidth={3*u} opacity={m.setup}/>
    <TextBlock text="按需求筛选 / 示例目录" x={b.x} y={b.y+b.height*.99} width={b.width} fontSize={17*u} fill={T.muted}/>
  </g>;
}

export function SoftFamily(props: FamilySceneProps) {
  switch (props.spec.id) {
    case 'pastel-dream': return <OrganicGrowth {...props}/>;
    case 'split-canvas': return <SplitViews {...props}/>;
    case 'sunset-zine': return <PaperCollage {...props}/>;
    case 'soft-neu': return <TactileDial {...props}/>;
    case 'xiaohongshu-premium': return <EditorialObject {...props}/>;
    case 'uxbot-product-lab': return <ResearchLoop {...props}/>;
    case 'taste-skill-neo': return <AlignmentGrid {...props}/>;
    case 'bootstrap-marketplace': return <CatalogSelection {...props}/>;
    default: throw new Error(`Unsupported soft preset: ${props.spec.id}`);
  }
}
