import type { FamilySceneProps } from './types';
import { Line, T, TextBlock, clamp01, mix, smooth } from './primitives';

const units = (p: FamilySceneProps) => Math.min(p.box.width / 1000, p.box.height / 500);
// Only essential reading roles use this portrait floor; strokes and small references do not.
const essential = (p: FamilySceneProps, px: number) => px * (p.portrait ? Math.max(units(p), 1.9*p.unit) : units(p));
const action = (p: FamilySceneProps) => smooth(p.motion.transform);
const labels = (p: FamilySceneProps) => {
  if(p.content.labels.length<2||p.content.labels.length>6) throw new RangeError('Teaching scenes need 2–6 explicit stage labels');
  return p.content.labels;
};
function StageLabels({p, y}: {p:FamilySceneProps;y:number}) {
  const {x,width:w}=p.box,list=labels(p),size=essential(p,19),baseline=Math.max(y,p.box.y+size*1.15);
  return <g data-role="ordered-lesson-stages">{list.map((label,i)=><TextBlock key={i}
    text={`${String(i+1).padStart(2,'0')} ${label}`} x={x+w*(.02+i*.96/list.length)} y={baseline} width={w*.91/list.length}
    fontSize={size} fill={p.motion.progress>=i/list.length?T.accentInk:T.muted} role="stage-label"/>)}</g>;
}
const sector = (r:number,angle:number) => `M 0 0 L ${r} 0 A ${r} ${r} 0 ${angle>Math.PI?1:0} 1 ${r*Math.cos(angle)} ${r*Math.sin(angle)} Z`;
const angleMix = (from:number,to:number,t:number) => from + Math.atan2(Math.sin(to-from),Math.cos(to-from))*t;

/** One set of angle sectors leaves its triangle and assembles into a straight angle. */
function ChalkProof(p: FamilySceneProps) {
  const {x,y,width:w,height:h}=p.box,u=units(p),t=action(p);
  const A={x:x+w*.08,y:y+h*.73},B={x:x+w*.48,y:y+h*.73},C={x:x+w*.48,y:y+h*.14};
  const theta=Math.atan2(B.y-C.y,B.x-A.x),q={x:x+w*.77,y:y+h*.55};
  const original=[A,B,C],sweep=[theta,Math.PI/2,Math.PI/2-theta],start=[-theta,Math.PI,Math.PI/2];
  const finalStart=[Math.PI,Math.PI+theta,Math.PI+theta+Math.PI/2];
  const r0=Math.min(w*.045,h*.085),r1=Math.min(w*.13,h*.22),move=smooth(clamp01((t-.16)/.72));
  return <g data-family-geometry="lesson" data-variant="triangle-angle-continuity-proof">
    <g data-role="progressive-chalk-construction" opacity={1-move*.63}>
      <Line x1={A.x} y1={A.y} x2={B.x} y2={B.y} progress={clamp01(p.motion.setup*3)} color={T.ink} width={2.5*u}/>
      <Line x1={B.x} y1={B.y} x2={C.x} y2={C.y} progress={clamp01(p.motion.setup*3-1)} color={T.ink} width={2.5*u}/>
      <Line x1={C.x} y1={C.y} x2={A.x} y2={A.y} progress={clamp01(p.motion.setup*3-2)} color={T.ink} width={2.5*u}/>
      <path d={`M ${B.x-16*u} ${B.y} v ${-16*u} h ${16*u}`} fill="none" stroke={T.line} strokeWidth={1.5*u} opacity={p.motion.setup}/>
      {original.map((point,i)=><TextBlock key={i} text={['A','B','C'][i]!} x={point.x+(i===0?-10:16)*u} y={point.y+(i===2?-essential(p,21)*.55:essential(p,21)*1.1)} width={Math.max(35*u,essential(p,21))} fontSize={essential(p,21)} fill={T.secondary} family="mono"/>)}
    </g>
    {original.map((point,i)=><g key={i} data-object-id={`triangle-angle-${i}`} opacity={p.motion.setup}
      transform={`translate(${mix(point.x,q.x,move)} ${mix(point.y,q.y,move)}) rotate(${angleMix(start[i]!,finalStart[i]!,move)*180/Math.PI})`}>
      <path d={sector(mix(r0,r1,move),sweep[i]!)} fill={T.chart(i)} fillOpacity={.3} stroke={T.chart(i)} strokeWidth={2*u}/>
    </g>)}
    <Line x1={q.x-r1*1.13} y1={q.y} x2={q.x+r1*1.13} y2={q.y} progress={clamp01((t-.42)*2)} color={T.ink} width={2*u}/>
    <TextBlock text="α + β + γ = 180°" x={q.x} y={y+h*.72} width={w*.43} fontSize={p.portrait?essential(p,20):27*u} align="middle" fill={T.accentInk} family="mono" opacity={move}/>
    <TextBlock text="同一组三个内角，拼成一个平角" x={q.x} y={y+h*.82} width={w*.39} fontSize={18*u} align="middle" fill={T.muted} opacity={move}/>
    <StageLabels p={p} y={y+h*.97}/>
  </g>;
}

/** A written derivation preserves the known state while two branches verify equal length. */
function CampusDerivation(p: FamilySceneProps) {
  const {x,y,width:w,height:h}=p.box,u=units(p),t=action(p),list=labels(p);
  const a=w*.2,b=w*.11,barH=Math.max(h*.07,p.portrait?essential(p,19)*1.3:0),total=a+b,barText=essential(p,19),equationText=essential(p,19);
  const source={x:x+w*.60,y:y+h*.15},left={x:x+w*.39,y:y+h*.49},right={x:x+w*.80,y:y+h*.49},result={x:x+w*.60,y:y+h*.79};
  const bar=(cx:number,cy:number,id:string,reversed=false,progress=1)=>{
    const swap=reversed?t:0, ax=cx-total/2+b*swap,bx=cx-total/2+a*(1-swap),lift=Math.sin(Math.PI*swap)*h*.075;
    return <g opacity={progress}>
      <rect data-object-id={`${id}-a`} x={ax} y={cy-lift} width={a} height={barH} fill={T.accent}/>
      <rect data-object-id={`${id}-b`} x={bx} y={cy+lift} width={b} height={barH} fill={T.chart(2)}/>
      <TextBlock text="a" x={ax+a/2} y={cy-lift+barH*.76} width={a*.8} fontSize={barText} align="middle" fill={T.onAccent} family="mono"/>
      <TextBlock text="b" x={bx+b/2} y={cy+lift+barH*.76} width={b*.8} fontSize={barText} align="middle" fill="var(--chart-on-3, var(--accent-on, var(--surface)))" family="mono"/>
    </g>;
  };
  return <g data-family-geometry="lesson" data-variant="layered-board-derivation">
    {list.map((label,i)=>{
      const yy=y+h*(.12+i*.74/Math.max(1,list.length-1));
      return <g key={i}><TextBlock text={String(i+1).padStart(2,'0')} x={x+w*.02} y={yy} width={w*.05} fontSize={15*u} family="mono" fill={T.accentInk}/>
        <TextBlock text={label} x={x+w*.02} y={yy+essential(p,21)*1.1} width={w*.15} fontSize={essential(p,21)}/>
        <Line x1={x+w*.19} y1={yy-15*u} x2={x+w*.97} y2={yy-15*u} color={T.line} progress={p.motion.setup}/></g>;
    })}
    {bar(source.x,source.y,'known',false,p.motion.setup)}
    {[left,right].map((branch,i)=><g key={i} data-role="derivation-branch">
      <Line x1={source.x} y1={source.y+barH+9*u} x2={branch.x} y2={branch.y-32*u} progress={clamp01(t*2)} color={T.line} width={1.5*u}/>
      <Line x1={branch.x} y1={branch.y+barH+25*u} x2={result.x} y2={result.y-20*u} progress={clamp01((t-.4)*2)} color={T.line} width={1.5*u}/>
    </g>)}
    {bar(left.x,left.y,'reference-order',false,clamp01(t*3))}
    {bar(right.x,right.y,'reordered-same-parts',true,clamp01(t*3))}
    <TextBlock text="a + b" x={left.x} y={left.y+barH+equationText*1.25} width={total} fontSize={equationText} align="middle" family="mono" fill={T.accentInk}/>
    <TextBlock text="b + a" x={right.x} y={right.y+barH+equationText*1.25} width={total} fontSize={equationText} opacity={clamp01((t-.92)/.08)} align="middle" family="mono" fill={T.accentInk}/>
    <g opacity={clamp01((t-.65)*4)} data-role="same-length-verification">
      <Line x1={result.x-total/2} y1={result.y} x2={result.x+total/2} y2={result.y} color={T.accent} width={3*u}/>
      {[-1,1].map(s=><Line key={s} x1={result.x+s*total/2} y1={result.y-10*u} x2={result.x+s*total/2} y2={result.y+10*u} color={T.accent}/>) }
      <TextBlock text="a + b = b + a" x={result.x} y={result.y+(p.portrait?essential(p,23)*1.25:42*u)} width={w*.6} fontSize={p.portrait?essential(p,23):28*u} align="middle" family="mono" fill={T.accentInk}/>
    </g>
  </g>;
}

/** One course record moves through ordered stations; the main book retains completed work. */
function CoursePath(p: FamilySceneProps) {
  const {x,y,width:w,height:h}=p.box,u=units(p),list=labels(p),t=action(p),vertical=p.portrait;
  const book={x:x+w*(vertical?.70:.5),y:y+h*(vertical?.43:.26)},bw=w*(vertical?.23:.2),bh=h*(vertical?.35:.31);
  const points=list.map((_,i)=>vertical?{x:x+w*.15,y:y+h*(.12+i*.7/(list.length-1))}:{x:x+w*(.08+i*.84/(list.length-1)),y:y+h*.76});
  const segment=Math.min(list.length-2,Math.floor(t*(list.length-1))),along=t*(list.length-1)-segment,from=points[segment]!,to=points[segment+1]!;
  const moving={x:mix(from.x,to.x,along),y:mix(from.y,to.y,along)},open=.1+.9*p.motion.setup;
  return <g data-family-geometry="lesson" data-variant={vertical?'goal-book-vertical-course-path':'goal-book-horizontal-course-path'}>
    <g data-object-id="course-goal-book" opacity={p.motion.setup}>
      <path d={`M ${book.x} ${book.y-bh*.4} Q ${book.x-bw*.5*open} ${book.y-bh*.62} ${book.x-bw*open} ${book.y-bh*.42} V ${book.y+bh*.46} Q ${book.x-bw*.5*open} ${book.y+bh*.25} ${book.x} ${book.y+bh*.48} Z`} fill={T.panel} stroke={T.line} strokeWidth={2*u}/>
      <path d={`M ${book.x} ${book.y-bh*.4} Q ${book.x+bw*.5*open} ${book.y-bh*.62} ${book.x+bw*open} ${book.y-bh*.42} V ${book.y+bh*.46} Q ${book.x+bw*.5*open} ${book.y+bh*.25} ${book.x} ${book.y+bh*.48} Z`} fill={T.panel} stroke={T.line} strokeWidth={2*u}/>
      <Line x1={book.x} y1={book.y-bh*.39} x2={book.x} y2={book.y+bh*.48} color={T.accent} width={2*u}/>
      {list.map((label,i)=><g key={i} opacity={clamp01((t-i/list.length)*list.length*2)}>
        <Line x1={book.x-bw*.82} y1={book.y+bh*(-.24+i*.55/Math.max(1,list.length-1))} x2={book.x-bw*.15} y2={book.y+bh*(-.24+i*.55/Math.max(1,list.length-1))} color={T.accent} width={2*u}/>
        <TextBlock text={label} x={book.x+bw*.16} y={book.y+bh*(-.19+i*.55/Math.max(1,list.length-1))} width={bw*.72} fontSize={17*u} fill={T.secondary}/>
      </g>)}
      <TextBlock text="学习记录" x={book.x} y={book.y+bh*.76} width={bw*2} fontSize={p.portrait?essential(p,20):24*u} align="middle" fill={T.accentInk}/>
    </g>
    {points.slice(1).map((point,i)=><g key={i}>
      <Line x1={points[i]!.x} y1={points[i]!.y} x2={point.x} y2={point.y} progress={p.motion.setup} color={T.line} width={3*u}/>
      <Line x1={points[i]!.x} y1={points[i]!.y} x2={point.x} y2={point.y} progress={clamp01(t*(list.length-1)-i)} color={T.accent} width={4*u}/>
    </g>)}
    {points.map((point,i)=><g key={i} data-object-id={`course-station-${i}`}>
      <circle cx={point.x} cy={point.y} r={13*u} fill={t>=i/(list.length-1)?T.accent:T.panel} stroke={T.accent} strokeWidth={2*u}/>
      <TextBlock text={String(i+1).padStart(2,'0')} x={point.x+(vertical?30*u:0)} y={point.y+(vertical?-essential(p,21)*.65:-31*u)} width={vertical?w*.27:w/list.length*.9} fontSize={16*u} align={vertical?'start':'middle'} family="mono" fill={T.accentInk}/>
      <TextBlock text={list[i]!} x={point.x+(vertical?30*u:0)} y={point.y+(vertical?essential(p,21)*.55:47*u)} width={vertical?w*.27:w/list.length*.9} fontSize={essential(p,21)} align={vertical?'start':'middle'} fill={T.secondary}/>
    </g>)}
    <g data-object-id="travelling-course-page" transform={`translate(${moving.x} ${moving.y})`}>
      <rect x={-14*u} y={-41*u} width={28*u} height={35*u} rx={3*u} fill={T.panel} stroke={T.accent} strokeWidth={2*u}/>
      <Line x1={-8*u} y1={-30*u} x2={8*u} y2={-30*u} color={T.accent}/><Line x1={-8*u} y1={-21*u} x2={5*u} y2={-21*u} color={T.line}/>
    </g>
  </g>;
}

/** The same sample document enters an operation window, aligns its rows, and becomes the output. */
function PracticalOperation(p: FamilySceneProps) {
  const {x,y,width:w,height:h}=p.box,u=units(p),t=action(p);
  const arrival=smooth(clamp01(t/.34)),departure=smooth(clamp01((t-.69)/.31)),align=smooth(clamp01((t-.28)/.34));
  const cx=mix(mix(x+w*.13,x+w*.5,arrival),x+w*.87,departure),cy=y+h*(p.portrait?.49:.5);
  const dw=mix(mix(w*.19,w*.34,arrival),w*.19,departure),dh=h*(p.portrait?.42:.39),wx=x+w*.265,wy=y+h*(p.portrait?.15:.18),ww=w*.47,wh=h*(p.portrait?.68:.64),control=essential(p,19),documentText=essential(p,19);
  return <g data-family-geometry="lesson" data-variant="persistent-document-operation">
    <StageLabels p={p} y={y+h*.055}/>
    <g data-role="operation-window" opacity={p.motion.setup}>
      <rect x={wx} y={wy} width={ww} height={wh} rx={10*u} fill={T.panel} stroke={T.line} strokeWidth={2*u}/>
      <TextBlock text="模拟操作 · 对齐行列" x={wx+ww*.06} y={wy+wh*.12} width={ww*.88} fontSize={essential(p,19)} fill={T.secondary}/>
      <Line x1={wx} y1={wy+wh*.18} x2={wx+ww} y2={wy+wh*.18} color={T.line}/>
      <rect x={wx+ww*.63} y={wy+wh*(p.portrait?.85:.82)} width={ww*.3} height={Math.max(wh*.12,p.portrait?control*1.25:0)} rx={5*u} fill={align>.5?T.accent:T.inset}/>
      <TextBlock text={p.portrait?(align>.85?'完成':'对齐'):(align>.85?'已对齐':'对齐行列')} x={wx+ww*.78} y={p.portrait?wy+wh*.85+control*.98:wy+wh*.905} width={ww*.27} fontSize={p.portrait?control:17*u} align="middle" fill={align>.5?T.onAccent:T.muted}/>
    </g>
    <Line x1={x+w*.04} y1={y+h*.89} x2={x+w*.96} y2={y+h*.89} progress={p.motion.setup} color={T.line}/>
    {[.13,.5,.87].map((v,i)=><g key={i}><Line x1={x+w*v} y1={y+h*.87} x2={x+w*v} y2={y+h*.91} color={T.accent}/>
      <TextBlock text={['原始清单','窗口内整理','保留输出'][i]!} x={x+w*v} y={y+h*.98} width={w*.25} fontSize={essential(p,19)} align="middle" fill={T.muted}/></g>)}
    <g data-object-id="same-sample-document" transform={`translate(${cx-dw/2} ${cy-dh/2})`}>
      <rect width={dw} height={dh} rx={5*u} fill={T.inset} stroke={T.accent} strokeWidth={2*u}/>
      <TextBlock text={align>.9?'整理结果':'示例清单'} x={dw*.1} y={p.portrait?documentText*.98:dh*.17} width={dw*.8} fontSize={p.portrait?documentText:18*u} fill={T.accentInk}/>
      <Line x1={dw*.08} y1={dh*(p.portrait?.26:.25)} x2={dw*.92} y2={dh*(p.portrait?.26:.25)} color={T.line}/>
      {['甲','乙','丙'].map((name,i)=>{
        const rowY=dh*(p.portrait?.46+i*.20:.43+i*.21),offset=(1-align)*dw*([.07,.01,.14][i]!);
        return <g key={i} data-object-id={`same-document-row-${i}`}>
          <TextBlock text={name} x={dw*.13+offset} y={rowY} width={dw*.3} fontSize={p.portrait?documentText:18*u}/>
          <TextBlock text={String((i+1)*12)} x={dw*(.81-(1-align)*i*.08)} y={rowY} width={dw*.3} fontSize={p.portrait?documentText:18*u} align="end" family="mono" fill={T.secondary}/>
          <Line x1={dw*.08} y1={rowY+10*u} x2={dw*.92} y2={rowY+10*u} progress={align} color={T.line}/>
        </g>;
      })}
    </g>
    {t>.32&&t<.69&&<path data-object-id="operation-pointer" d="M 0 0 L 0 20 L 6 15 L 12 24 L 17 21 L 11 12 L 20 11 Z"
      transform={`translate(${wx+ww*(.78-.1*(1-align))} ${wy+wh*(.87-.15*(1-align))}) scale(${u})`} fill={T.ink} stroke={T.panel} strokeWidth={1.5}/>}
  </g>;
}

export function LessonFamily(props: FamilySceneProps) {
  switch(props.spec.id) {
    case 'chalk-garden': return <ChalkProof {...props}/>;
    case 'campus-blackboard-pro': return <CampusDerivation {...props}/>;
    case 'course-studio': return <CoursePath {...props}/>;
    case 'practical-skill': return <PracticalOperation {...props}/>;
    default: throw new Error(`LessonFamily has no authored scene for ${props.spec.id}`);
  }
}
