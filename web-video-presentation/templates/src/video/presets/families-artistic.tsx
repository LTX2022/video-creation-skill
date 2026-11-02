import { cinemaTitleText } from './narration';
import type { FamilySceneProps } from './types';
import { T, TextBlock, Line, Mark, mix, smooth, labelAt } from './primitives';
import { itemProgress } from './motion';
import { SoftFamily } from './family-soft';
import { LessonFamily } from './family-lesson';

/** Editorial evidence is an open typographic grid, not boxed feature cards. */
function Editorial({spec,content,box:b,motion:m,unit:u,portrait}: FamilySceneProps) {
  const textU=portrait?u*1.8:u;
  const mirrored=spec.layout.heroSide==='right';
  const heroX=b.x+b.width*(mirrored?.53:.04), heroW=b.width*.43;
  const marginX=b.x+b.width*(mirrored?.04:.57), marginW=b.width*.39;
  const top=b.y+b.height*.12, pageH=b.height*.66;
  const evidenceCount=spec.layout.density===1?2:3;
  const stroke=spec.layout.rule==='bold'?3*u:1.4*u;
  return <g data-role="editorial-evidence" data-evidence-kind="source-assembly">
    <Line x1={b.x} y1={b.y+b.height*.045} x2={b.x+b.width} y2={b.y+b.height*.045} progress={m.setup} color={T.ink} width={stroke}/>
    {spec.layout.rule==='double'&&<Line x1={b.x} y1={b.y+b.height*.065} x2={b.x+b.width} y2={b.y+b.height*.065} progress={m.setup} color={T.ink} width={u}/>}
    <g data-object-id="editorial-source" transform={`translate(0 ${(1-m.setup)*12*u})`}>
      <path d={`M ${heroX} ${top} H ${heroX+heroW*.86} L ${heroX+heroW} ${top+heroW*.13} V ${top+pageH} H ${heroX} Z`} fill={T.panel} stroke={T.line} strokeWidth={u}/>
      <path d={`M ${heroX+heroW*.86} ${top} V ${top+heroW*.13} H ${heroX+heroW}`} fill="none" stroke={T.line} strokeWidth={u}/>
      <TextBlock text={labelAt(content.labels,0,'观察')} x={heroX+heroW*.08} y={top+pageH*.13} width={heroW*.76} fontSize={26*textU} weight={700} family="display"/>
      <g data-role="source-detail" opacity={m.setup}>
        <rect x={heroX+heroW*.08} y={top+pageH*.23} width={heroW*.84} height={pageH*.35} fill={T.inset}/>
        <circle cx={heroX+heroW*.48} cy={top+pageH*.405} r={Math.min(heroW*.21,pageH*.13)*spec.layout.subjectScale} fill="none" stroke={T.accent} strokeWidth={2*u}/>
        <path d={`M ${heroX+heroW*.15} ${top+pageH*.48} L ${heroX+heroW*.34} ${top+pageH*.34} L ${heroX+heroW*.57} ${top+pageH*.46} L ${heroX+heroW*.85} ${top+pageH*.29}`} fill="none" stroke={T.ink} strokeWidth={u}/>
      </g>
      {[.69,.77,.85].map((f,i)=><g key={i}><Line x1={heroX+heroW*.08} y1={top+pageH*f} x2={heroX+heroW*(i===2?.61:.9)} y2={top+pageH*f} color={T.line} width={2*u}/>
        {i===1&&<rect x={heroX+heroW*.08} y={top+pageH*f-4*u} width={heroW*.52*m.transform} height={8*u} fill={T.accent} opacity={.25}/>}</g>)}
    </g>
    {Array.from({length:evidenceCount},(_,i)=>{
      const progress=itemProgress(m.transform,i,evidenceCount,spec.motion.stagger);
      const yy=top+pageH*(i/evidenceCount+.08);
      return <g key={i} data-object-id={`editorial-annotation-${i}`} opacity={.16+.84*progress}>
        <text x={marginX} y={yy} fill={T.accentInk} fontSize={13*u} style={{fontFamily:'var(--font-mono)'}}>0{i+1} /</text>
        <TextBlock text={labelAt(content.labels,i+1,'证据')} x={marginX+35*u} y={yy} width={marginW-35*u} fontSize={23*textU} maxLines={2} family="display"/>
        <Line x1={marginX} y1={yy+15*u} x2={marginX+marginW*progress} y2={yy+15*u} color={T.ink} width={stroke} dashed={spec.layout.rule==='dashed'}/>
        <Line x1={marginX} y1={yy+34*u} x2={marginX+marginW*.8} y2={yy+34*u} color={T.line} width={2*u}/>
        <Line x1={marginX} y1={yy+46*u} x2={marginX+marginW*.55} y2={yy+46*u} color={T.line} width={2*u}/>
      </g>;
    })}
    <path d={`M ${heroX+heroW*.5} ${top+pageH+10*u} V ${b.y+b.height*.88} H ${marginX+marginW*.55}`} fill="none" stroke={T.accent} strokeWidth={2*u} pathLength={1} strokeDasharray="1" strokeDashoffset={1-m.transform}/>
    <TextBlock text="原始材料 → 标注 → 可追溯的论点" x={b.x} y={b.y+b.height*.99} width={b.width} fontSize={18*u} fill={T.muted}/>
  </g>;
}

function Gallery({spec,content,box:b,motion:m,unit:u,portrait}: FamilySceneProps) {
  const textU=portrait?u*1.8:u;
  const x=b.x+b.width*(spec.layout.heroSide==='right'?.57:.45),y=b.y+b.height*.48;
  const r=Math.min(b.width*.28,b.height*.34)*spec.layout.subjectScale;
  const rings=spec.layout.density+2;
  const angle=m.transform*Math.PI*.23;
  const botanical=spec.id==='dark-botanical';
  if (spec.id==='luxury-watch-black') return <g data-role="precision-dial" opacity={.2+.8*m.setup}>
    <circle data-object-id="dial-case" cx={x} cy={y} r={r*1.05} fill={T.panel} stroke={T.ink} strokeWidth={2*u}/>
    <circle cx={x} cy={y} r={r*.91} fill="none" stroke={T.line} strokeWidth={u}/>
    {Array.from({length:60},(_,i)=>{const a=i*Math.PI/30-Math.PI/2;const outer=r*.84,inner=r*(i%5===0?.72:.79);return <line key={i} x1={x+Math.cos(a)*inner} y1={y+Math.sin(a)*inner} x2={x+Math.cos(a)*outer} y2={y+Math.sin(a)*outer} stroke={i%5===0?T.ink:T.muted} strokeWidth={(i%5===0?2:1)*u}/>;})}
    {[0,1].map(i=>{const a=(-.5+(i?.36:-.1)*m.transform)*Math.PI;return <line key={i} data-object-id={`dial-hand-${i}`} x1={x} y1={y} x2={x+Math.cos(a)*r*(i?.68:.44)} y2={y+Math.sin(a)*r*(i?.68:.44)} stroke={i?T.accent:T.ink} strokeWidth={(i?2:5)*u} strokeLinecap="round"/>;})}
    <circle cx={x} cy={y} r={6*u} fill={T.accent}/>
    <TextBlock text="精密结构 · 非真实计时" x={x} y={b.y+b.height*.94} width={b.width*.85} fontSize={18*u} fill={T.muted} align="middle"/>
  </g>;
  if (spec.id==='history-museum') return <g data-role="artifact-profile" opacity={.2+.8*m.setup}>
    <path data-object-id="museum-vessel" d={`M ${x-r*.35} ${y-r*.95} H ${x+r*.35} L ${x+r*.24} ${y-r*.4} C ${x+r*1.1} ${y-r*.05} ${x+r*.9} ${y+r*.65} ${x+r*.4} ${y+r*.93} H ${x-r*.4} C ${x-r*.9} ${y+r*.65} ${x-r*1.1} ${y-r*.05} ${x-r*.24} ${y-r*.4} Z`} fill={T.panel} stroke={T.ink} strokeWidth={2*u}/>
    {[-.3,.05,.4,.72].map((v,i)=><ellipse key={i} cx={x} cy={y+r*v} rx={r*(.6+Math.sin(i)*.2)} ry={r*.08} fill="none" stroke={T.accent} strokeWidth={u} opacity={itemProgress(m.transform,i,4,.12)}/>)}
    <Line x1={x+r*1.15} y1={y-r*.95} x2={x+r*1.15} y2={y+r*.93} color={T.accent} progress={m.transform}/>
    <TextBlock text="器形剖读 · 原创概念器物" x={x} y={b.y+b.height*.97} width={b.width*.9} fontSize={18*u} fill={T.muted} align="middle"/>
  </g>;
  return <g data-role="sculptural-gallery">
    <ellipse cx={x} cy={y+r*1.12} rx={r*.85} ry={r*.12} fill={T.ink} opacity={.06*m.setup}/>
    {Array.from({length:rings},(_,i)=>{
      const t=i/Math.max(1,rings-1);
      const rx=r*(.48+t*.48),ry=r*(.72+Math.sin(angle+t)*.24);
      return <g key={i} data-object-id={`gallery-contour-${i}`} transform={`rotate(${(i-rings/2)*13*m.transform} ${x} ${y})`}>
        {botanical?<path d={`M ${x} ${y+r} C ${x-rx*1.8} ${y-r*.2}, ${x-rx*.5} ${y-r*1.3}, ${x} ${y-r} C ${x+rx*1.6} ${y-r*.3}, ${x+rx} ${y+r*.6}, ${x} ${y+r}`} fill={i===0?T.soft:'none'} stroke={i===0?T.accent:T.ink} strokeWidth={(i===0?2.5:1)*u} opacity={m.setup*(.9-t*.5)}/>:
          <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={i===0?T.panel:'none'} stroke={i===0?T.accent:T.ink} strokeWidth={(i===0?3:1)*u} opacity={m.setup*(.9-t*.5)}/>}
      </g>;
    })}
    <circle cx={x+Math.cos(angle-1)*r*.68} cy={y+Math.sin(angle-1)*r*.86} r={9*u} fill={T.accent}/>
    <path d={`M ${x+r*.5} ${y-r*.6} L ${b.x+b.width*.84} ${b.y+b.height*.18} H ${b.x+b.width*.98}`} fill="none" stroke={T.line} strokeWidth={1.5*u} pathLength={1} strokeDasharray="1" strokeDashoffset={1-m.transform}/>
    <TextBlock text={labelAt(content.labels,0,'曲面关系')} x={b.x+b.width*.72} y={b.y+b.height*.12} width={b.width*.28} fontSize={17*textU} maxLines={2} fill={T.secondary} opacity={m.transform}/>
    <TextBlock text={labelAt(content.labels,1,'形体研究')} x={b.x+b.width*.04} y={b.y+b.height*.91} width={b.width*.65} fontSize={22*textU} family="display"/>
    <text x={b.x+b.width*.97} y={b.y+b.height*.93} textAnchor="end" fill={T.muted} fontSize={13*u} style={{fontFamily:'var(--font-mono)'}}>STUDY / 01</text>
  </g>;
}

function Archive({spec,content,box:b,motion:m,unit:u,portrait,uid,overlay}: FamilySceneProps) {
  const textU=portrait?u*1.8:u;
  if(spec.id==='cinema-title-card') {
    const text=cinemaTitleText(content);
    const cx=b.x+b.width*.5,cy=b.y+b.height*.43;
    const reveal=m.setup,settle=(1-m.transform)*10*u;
    const titleSize=(portrait?58:70)*u;
    return <g data-role="cinematic-title-stage">
      <defs><clipPath id={`${uid}-title-reveal`}><rect x={b.x} y={b.y} width={b.width*reveal} height={b.height}/></clipPath></defs>
      {overlay&&<g data-role="cinematic-label-backing" fill={T.stage} opacity={.97}>
        <rect x={b.x+b.width*.075} y={b.y+b.height*.12} width={b.width*.85} height={b.height*.105}/>
        <rect x={b.x+b.width*.075} y={b.y+b.height*.885} width={b.width*.85} height={b.height*.115}/>
      </g>}
      <Line x1={b.x+b.width*.08} y1={b.y+b.height*.06} x2={b.x+b.width*.92} y2={b.y+b.height*.06} progress={reveal} color={T.line} width={u}/>
      <TextBlock text={text.study} x={cx} y={b.y+b.height*.20} width={b.width*.85} fontSize={14*u} family="mono" align="middle" fill={T.muted} maxLines={1}/>
      {overlay&&<rect data-role="title-backing" x={b.x+b.width*.04} y={cy-titleSize} width={b.width*.92} height={titleSize*2.75} fill={T.stage} opacity={.97}/>}
      <g data-object-id="cinematic-title-object" clipPath={`url(#${uid}-title-reveal)`} transform={`translate(0 ${settle})`} style={{letterSpacing:'.035em'}}>
        <TextBlock text={content.title} x={cx} y={cy} width={b.width*.9} fontSize={titleSize} maxLines={2} lineHeight={1.28} family="display" align="middle" weight={spec.layout.titleWeight} role="primary-title"/>
      </g>
      <Line x1={cx-b.width*.065} y1={b.y+b.height*.84} x2={cx+b.width*.065} y2={b.y+b.height*.84} progress={m.transform} color={T.accent} width={2*u}/>
      <TextBlock text={text.status(m.phase)} x={cx} y={b.y+b.height*.97} width={b.width*.85} fontSize={18*u} maxLines={1} align="middle" fill={T.muted}/>
    </g>;
  }
  const w=b.width*.57,h=b.height*.66;
  const x=b.x+b.width*(spec.layout.heroSide==='right'?.35:.08),y=b.y+b.height*.08;
  return <g data-role="archive-trace">
    {[2,1,0].map(i=>{
      const separation=m.transform*(spec.motion.travel*70+14)*u;
      return <g key={i} data-object-id={`archive-sheet-${i}`} transform={`translate(${i*separation} ${i*separation*.28}) rotate(${i*(1-m.transform)*-2} ${x} ${y})`} opacity={.3+.7*m.setup}>
        <rect x={x} y={y} width={w} height={h} fill={T.panel} stroke={T.line} strokeWidth={1.5*u}/>
        <rect x={x+w*.08} y={y+h*.12} width={w*.84} height={h*.36} fill={T.inset}/>
        <path d={`M ${x+w*.12} ${y+h*.43} L ${x+w*.34} ${y+h*.2} L ${x+w*.51} ${y+h*.38} L ${x+w*.7} ${y+h*.25} L ${x+w*.89} ${y+h*.43}`} stroke={T.accent} fill="none" strokeWidth={2*u}/>
        {[.59,.68,.77].map((v,k)=><Line key={k} x1={x+w*.08} y1={y+h*v} x2={x+w*(k===2?.62:.88)} y2={y+h*v} color={k===0?T.ink:T.line} width={k===0?3*u:1.5*u}/>)}
        {i===0&&<TextBlock text={labelAt(content.labels,0,'原始材料')} x={x+w*.08} y={y+h*.94} width={w*.84} fontSize={16*textU} fill={T.secondary}/>} 
      </g>;
    })}
    <path d={`M ${x+w*.76} ${y+h*.54} L ${b.x+b.width*.91} ${b.y+b.height*.5} V ${b.y+b.height*.7}`} fill="none" stroke={T.accent} strokeWidth={2*u} pathLength={1} strokeDasharray="1" strokeDashoffset={1-m.transform}/>
    <TextBlock text={labelAt(content.labels,1,'交叉核对')} x={b.x+b.width*.76} y={b.y+b.height*.77} width={b.width*.23} fontSize={18*textU} fill={T.accentInk} maxLines={2} opacity={m.transform}/>
    <Line x1={b.x} y1={b.y+b.height*.9} x2={b.x+b.width} y2={b.y+b.height*.9} color={T.line}/>
    {[0,1,2].map(i=><g key={i} data-object-id={`archive-date-${i}`}><Mark x={b.x+b.width*(.08+i*.41)} y={b.y+b.height*.9} size={8*u} fill={i<Math.round(m.transform*3)?T.accent:T.line}/><text x={b.x+b.width*(.08+i*.41)} y={b.y+b.height*.985} fill={T.muted} fontSize={14*u} textAnchor="middle">{['采集','追溯','核验'][i]}</text></g>)}
  </g>;
}

function Kinetic({spec,content,box:b,motion:m,unit:u,portrait}: FamilySceneProps) {
  const textU=portrait?u*1.8:u;
  const mode=spec.id==='ferrari-rosso-corsa'?'speed':spec.id==='bauhaus-bold'?'form':spec.id==='creative-voltage'?'voltage':spec.id==='neon-cyber'?'orbit':spec.id==='creator-neon-grid'?'grid':spec.id==='douyin-high-contrast'?'impact':'signal';
  const t=m.transform;
  const label=mode==='voltage'?'VOLT':mode==='form'?'FORM':mode==='grid'||mode==='orbit'?'FLOW':'GO';
  const letterSize=Math.min(b.height*.60*spec.layout.subjectScale,b.width/(label.length*1.05));
  const cellWidth=letterSize*.86,wordLeft=b.x+(b.width-label.length*cellWidth)/2;
  const startX=wordLeft+(label.indexOf('O')+.5)*cellWidth;
  const endX=b.x+b.width*(mode==='grid'?.25:mode==='form'?.32:.5);
  const y=b.y+b.height*.46;
  const initialR=letterSize*.33;
  const finalR=initialR*(mode==='speed'?1.1:mode==='orbit'?.7:mode==='impact'?.62:mode==='form'?.5:.42);
  const x=mix(startX,endX,t),r=mix(initialR,finalR,t);
  return <g data-role="shape-inheritance" data-shape-variant={mode}>
    <g data-role="word-origin" opacity={1-t}>
      {[...label].map((letter,i)=>letter==='O'?null:<text key={i} data-object-id={`origin-letter-${i}`} x={wordLeft+(i+.5)*cellWidth} y={y+letterSize*.35} textAnchor="middle" fontSize={letterSize} fill={T.ink} fontWeight={850} style={{fontFamily:'var(--font-display-en)'}}>{letter}</text>)}
    </g>
    {/* O is drawn as this exact ring; its identity continues as the resulting focal object. */}
    <circle data-object-id="kinetic-letter-o" cx={x} cy={y} r={r} fill="none" stroke={T.accent} strokeWidth={Math.max(4*u,r*(.27-.12*t))}/>
    {mode==='form'&&<g opacity={t} data-role="geometric-construction"><rect data-object-id="form-square" x={b.x+b.width*.52} y={y-r} width={r*2} height={r*2} fill={T.ink} transform={`rotate(${(1-t)*45} ${b.x+b.width*.52+r} ${y})`}/><path data-object-id="form-triangle" d={`M ${b.x+b.width*.82} ${y-r*1.1} l ${r} ${r*2} h ${-r*2} Z`} fill={T.chart(2)}/><Line x1={b.x+b.width*.12} y1={y+r*1.4} x2={b.x+b.width*.94} y2={y+r*1.4} color={T.ink} width={4*u}/></g>}
    {mode==='speed'&&<g data-role="tachometer" opacity={t}>
      {Array.from({length:18},(_,i)=>{const a=Math.PI*(.8+i/17*1.4);return <line key={i} x1={x+Math.cos(a)*r*1.2} y1={y+Math.sin(a)*r*1.2} x2={x+Math.cos(a)*r*1.4} y2={y+Math.sin(a)*r*1.4} stroke={i>13?T.accent:T.ink} strokeWidth={3*u}/>;})}
      <line data-object-id="speed-needle" x1={x} y1={y} x2={x+Math.cos(Math.PI*(.8+t))*r*.8} y2={y+Math.sin(Math.PI*(.8+t))*r*.8} stroke={T.ink} strokeWidth={4*u}/>
    </g>}
    {mode==='orbit'&&<g data-role="signal-orbit" opacity={t}>
      {[0,1,2].map(i=><g key={i}><ellipse cx={x} cy={y} rx={r*(1.4+i*.35)} ry={r*(.45+i*.12)} fill="none" stroke={i===1?T.chart(2):T.line} strokeWidth={2*u} transform={`rotate(${i*40+t*18} ${x} ${y})`}/><circle data-object-id={`orbit-signal-${i}`} cx={x+Math.cos(i*2+t)*r*(1.4+i*.35)} cy={y+Math.sin(i*2+t)*r*.7} r={6*u} fill={T.chart(i)}/></g>)}
    </g>}
    {mode==='grid'&&<g data-role="kinetic-grid" opacity={t}>{Array.from({length:9},(_,i)=>{const side=Math.min(b.width*.105,b.height*.2),xx=b.x+b.width*.52+(i%3)*side*1.25,yy=b.y+b.height*.16+Math.floor(i/3)*side*1.25;return <rect key={i} data-object-id={`grid-derived-${i}`} x={xx} y={yy} width={side} height={side} rx={i%3===0?side*.5:2*u} fill={i===4?T.accent:T.soft} stroke={i===4?T.accent:T.line} strokeWidth={u}/>;})}</g>}
    {mode==='voltage'&&<g data-role="voltage-trace" opacity={t}><path data-object-id="voltage-path" d={`M ${b.x+b.width*.07} ${y} L ${b.x+b.width*.25} ${y} L ${b.x+b.width*.34} ${y-initialR*.9} L ${b.x+b.width*.45} ${y+initialR*.9} L ${b.x+b.width*.58} ${y-initialR*.8} L ${b.x+b.width*.73} ${y} H ${b.x+b.width*.95}`} fill="none" stroke={T.ink} strokeWidth={7*u} strokeLinejoin="miter"/><path d={`M ${b.x+b.width*.08} ${y+initialR*1.3} H ${b.x+b.width*.93}`} stroke={T.chart(2)} strokeWidth={4*u}/></g>}
    {mode==='impact'&&<g data-role="impact-geometry" opacity={t}>
      {[-1,1].map(dir=><path key={dir} data-object-id={`impact-chevron-${dir}`} d={`M ${x+dir*r*1.7} ${y-r*.7} L ${x+dir*r*2.25} ${y} L ${x+dir*r*1.7} ${y+r*.7}`} fill="none" stroke={T.ink} strokeWidth={12*u}/>)}
      <rect x={x-r*.23} y={y-r*.7} width={r*.46} height={r*.9} fill={T.ink}/><circle cx={x} cy={y+r*.48} r={r*.16} fill={T.ink}/>
    </g>}
    {mode==='signal'&&<g data-role="signal-broadcast" opacity={t}>
      {[1,2,3].map(i=><path key={i} data-object-id={`signal-arc-${i}`} d={`M ${x+r*(1+i*.45)} ${y-r*(.4+i*.3)} Q ${x+r*(1.7+i*.65)} ${y} ${x+r*(1+i*.45)} ${y+r*(.4+i*.3)}`} fill="none" stroke={i===3?T.ink:T.accent} strokeWidth={(6-i)*u}/>)}
      <Line x1={b.x+b.width*.12} y1={y+r*2} x2={b.x+b.width*.9} y2={y+r*2} color={T.line}/>
    </g>}
    <TextBlock text={t<.2?'让字形成为动作的起点':labelAt(content.labels,2,'形状延续，关系展开')} x={b.x+b.width*.5} y={b.y+b.height*.96} width={b.width*.94} fontSize={24*textU} maxLines={1} weight={700} align="middle"/>
  </g>;
}

export function ArtisticFamily(props: FamilySceneProps) {
  switch(props.spec.family) {
    case 'editorial': return <Editorial {...props}/>;
    case 'lesson': return <LessonFamily {...props}/>;
    case 'gallery': return <Gallery {...props}/>;
    case 'archive': return <Archive {...props}/>;
    case 'kinetic': return <Kinetic {...props}/>;
    case 'soft': return <SoftFamily {...props}/>;
    default: throw new Error(`Not an artistic family: ${props.spec.family}`);
  }
}
