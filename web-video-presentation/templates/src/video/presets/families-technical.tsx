import type { Box, FamilySceneProps, ThemePresetSpec } from './types';
import { Line, Mark, T, TextBlock, clamp01, labelAt, mix, smooth } from './primitives';

/** Six different object grammars. All positions are absolute in the supplied content box. */
const scaleOf = (b: Box) => Math.min(b.width / 1000, b.height / 500);
/** Essential portrait labels have a deliberate reading size; diagram strokes keep geometry scale. */
const essential = (p: FamilySceneProps, px: number) => px * (p.portrait ? Math.max(scaleOf(p.box), 1.9 * p.unit) : scaleOf(p.box));
const corners = (p: FamilySceneProps, u: number) => p.spec.layout.corner === 'square' ? 0 : p.spec.layout.corner === 'round' ? 28 * u : 10 * u;
const strokeOf = (p: FamilySceneProps, u: number) => (p.spec.layout.rule === 'bold' ? 4 : p.spec.layout.rule === 'double' ? 2 : 1.5) * u;
const stagger = (p: FamilySceneProps, index: number) => clamp01((p.motion.transform - index * p.spec.motion.stagger) / Math.max(.1, 1 - index * p.spec.motion.stagger));
const drive = (p: FamilySceneProps, progress: number) => p.spec.motion.kind === 'snap' ? 1 - Math.pow(1 - clamp01(progress), 4) : p.spec.motion.kind === 'scan' ? clamp01(progress) : smooth(progress);
const data = (p: FamilySceneProps, n = 4) => Array.from({length: Math.max(2, Math.min(n, p.content.labels.length || n))}, (_, i) => ({label: labelAt(p.content.labels, i, `示例 ${i + 1}`), value: p.content.values?.[i] ?? 25 + i * 18}));
const signText = (n: number) => Number(n.toFixed(1)).toString();
/** One rounded state feeds every displayed metric AND the total at each action frame. */
export function metricFrameState(values: readonly number[], progress: number, staggerAmount: number, kind: ThemePresetSpec['motion']['kind']) {
  if (!Number.isFinite(progress) || !Number.isFinite(staggerAmount) || staggerAmount < 0 || staggerAmount >= 1 || values.some(v=>!Number.isFinite(v))) {
    throw new RangeError('Metric state needs finite values/progress and a stagger in [0,1)');
  }
  const displayedValues=values.map((value,i)=>{
    const q=clamp01((progress-i*staggerAmount)/Math.max(.1,1-i*staggerAmount));
    const eased=kind==='snap'?1-Math.pow(1-q,4):kind==='scan'?q:smooth(q);
    return Number((value*eased).toFixed(1));
  });
  return {values:displayedValues,total:Number(displayedValues.reduce((sum,value)=>sum+value,0).toFixed(1))};
}


function HorizontalComparison(p: FamilySceneProps) {
  const {x,y,width:w,height:h}=p.box,u=scaleOf(p.box),items=data(p,5);
  const lo=Math.min(0,...items.map(i=>i.value)),hi=Math.max(1,...items.map(i=>i.value));
  const shown=metricFrameState(items.map(item=>item.value),p.motion.transform,p.spec.motion.stagger,p.spec.motion.kind);
  const left=x+w*.23,right=x+w*.82,axisY=y+h*.83;
  const xx=(v:number)=>left+(v-lo)/(hi-lo)*(right-left),zero=xx(0);
  return <g data-family-geometry="data" data-variant="horizontal-shared-axis">
    {[0,.25,.5,.75,1].map((q,i)=><g key={i} opacity={p.motion.setup}>
      <Line x1={mix(left,right,q)} y1={y+h*.1} x2={mix(left,right,q)} y2={axisY} color={T.line} dashed/>
      <TextBlock text={signText(mix(lo,hi,q))} x={mix(left,right,q)} y={axisY+25*u} width={80*u} fontSize={16*u} align="middle" family="mono" fill={T.muted}/>
    </g>)}
    <Line x1={left} y1={axisY} x2={right} y2={axisY} progress={p.motion.setup} color={T.ink}/>
    {items.map((item,i)=>{
      const yy=y+h*(.17+i*.57/Math.max(1,items.length-1)),v=shown.values[i]!,end=xx(v);
      return <g key={i} data-object-id={`metric-${i}`} data-current-value={v}>
        <TextBlock text={item.label} x={x+w*.02} y={yy+essential(p,21)*.33} width={w*.18} fontSize={essential(p,21)}/>
        <Line x1={zero} y1={yy} x2={end} y2={yy} color={T.chart(i)} width={7*u}/>
        <Mark x={end} y={yy} size={18*u} fill={T.chart(i)} shape={i%2?'diamond':'circle'}/>
        <TextBlock role="metric-current-value" text={signText(v)} x={x+w*.98} y={yy+essential(p,28)*.33} width={w*.12} fontSize={essential(p,28)} align="end" family="mono" fill={T.accentInk}/>
      </g>;
    })}
    <TextBlock text={p.content.unit??'演示值'} x={right} y={y+h*.98} width={w*.3} fontSize={15*u} align="end" fill={T.muted}/>
  </g>;
}

function ProgressHeatmap(p: FamilySceneProps) {
  const {x,y,width:w,height:h}=p.box,u=scaleOf(p.box),labels=p.content.labels,cols=12;
  if(labels.length<1||labels.length>6) throw new RangeError('Progress heatmap needs 1–6 named rows');
  const left=x+w*.21,top=y+h*.15,pw=w*.74,ph=h*.58,cw=pw/cols,ch=ph/labels.length;
  return <g data-family-geometry="data" data-variant="named-process-progress-grid">
    <TextBlock text="过程采样序列" x={left} y={p.portrait?y+essential(p,20)*1.05:y+h*.035} width={pw} fontSize={essential(p,20)} fill={T.accentInk}/>
    {Array.from({length:cols},(_,col)=><TextBlock key={col} text={String(col+1).padStart(2,'0')} x={left+cw*(col+.5)} y={top-13*u} width={cw*.9} fontSize={14*u} align="middle" family="mono" fill={T.muted}/>)}
    {labels.map((label,row)=><g key={row}>
      <TextBlock text={label} x={left-18*u} y={top+ch*(row+.5)+essential(p,21)*.33} width={w*.17} fontSize={essential(p,21)} align="end"/>
      {Array.from({length:cols},(_,col)=>{
        const reached=clamp01((p.motion.transform-(row*cols+col)/(labels.length*cols+5))*7);
        return <rect key={col} data-object-id={`process-${row}-sample-${col}`} x={left+col*cw+3*u} y={top+row*ch+3*u} width={cw-6*u} height={ch-6*u}
          fill={T.accent} opacity={.1+reached*.82} stroke={T.line} strokeWidth={u}/>;
      })}
    </g>)}
    {[.1,.35,.6,.92].map((value,i)=><rect key={i} x={left+i*26*u} y={y+h*.81} width={20*u} height={18*u} fill={T.accent} opacity={value}/>)}
    <TextBlock text="亮度：未经过 → 已完成" x={left+120*u} y={y+h*.845} width={pw-120*u} fontSize={essential(p,19)} fill={T.secondary}/>
    <TextBlock text="概念流程演示 · 非实时监测或真实业务读数" x={left} y={y+h*.97} width={pw} fontSize={17*u} fill={T.muted}/>
  </g>;
}

function DataScene(p: FamilySceneProps) {
  if(p.spec.id==='electric-studio') return <HorizontalComparison {...p}/>;
  if(p.spec.id==='data-ops-slate') return <ProgressHeatmap {...p}/>;
  const {x, y, width: w, height: h} = p.box, u = scaleOf(p.box), items = data(p, 5);
  const right = p.spec.layout.heroSide === 'right';
  const left = x + w * (right ? .08 : .16), top = y + h * (p.portrait ? .3 : .1);
  const plotW = w * .77, plotH = h * (p.portrait ? .48 : .68), bottom = top + plotH;
  const lo = Math.min(0, ...items.map(v => v.value)), hi = Math.max(1, ...items.map(v => v.value));
  const toY = (v: number) => bottom - (v - lo) / Math.max(1, hi - lo) * plotH;
  const zero = toY(0), mode = p.spec.id === 'fintech-terminal' ? 'line' : p.spec.id === 'creator-dashboard' ? 'area' : 'bars';
  const figureX = p.portrait ? x+w*.95 : right ? x + w * .93 : x + w * .035;
  const shown=metricFrameState(items.map(item=>item.value),p.motion.transform,p.spec.motion.stagger,p.spec.motion.kind);
  const total=shown.total;
  return <g data-family-geometry="data" data-variant={mode} data-current-total={total}>
    <TextBlock text={signText(total)} x={figureX} y={y+h*(p.portrait?.11:.18)} width={w * .14}
      fontSize={(p.portrait?essential(p,27):40*u) * p.spec.layout.numberScale} maxLines={1} align={p.portrait||right ? 'end' : 'start'} family="mono" fill={T.accentInk} role="hero-value" />
    <TextBlock text="演示值合计" x={p.portrait?x+w*.03:figureX} y={y+h*(p.portrait?.11:.26)} width={w*(p.portrait?.6:.14)} fontSize={p.portrait?essential(p,16):15*u} align={p.portrait?'start':right?'end':'start'} fill={T.muted} role="data-disclaimer"/>
    {[0, .25, .5, .75, 1].map((r, i) => <g key={i} opacity={p.motion.setup * .6}>
      <Line x1={left} y1={top + plotH * r} x2={left + plotW} y2={top + plotH * r} dashed={p.spec.layout.rule === 'dashed'} width={u}/>
      <TextBlock text={signText(hi - (hi-lo) * r)} x={left - 12*u} y={top + plotH*r + 5*u} width={40*u} fontSize={13*u} align="end" fill={T.muted} family="mono"/>
    </g>)}
    <Line x1={left} y1={zero} x2={left+plotW} y2={zero} progress={p.motion.setup} color={T.ink} width={strokeOf(p,u)}/>
    {mode === 'bars' && items.map((item, i) => {
      const v = shown.values[i]!, yy = toY(v), gap=plotW/items.length, xx=left+gap*(i+.17), bw=gap*.56*p.spec.layout.subjectScale;
      return <g key={i} data-object-id={`metric-${i}`} data-current-value={v}>
        <rect x={xx} y={Math.min(yy,zero)} width={bw} height={Math.max(1*u,Math.abs(zero-yy))} fill={i === items.length-1 ? T.accent : T.chart(i)} opacity={i === items.length-1 ? 1 : .72}/>
        <TextBlock role="metric-current-value" text={signText(v)} x={xx+bw/2} y={item.value>=0 ? Math.max(y+essential(p,22)*.95,yy-12*u) : yy+essential(p,22)*1.15} width={gap*.85} fontSize={essential(p,22)} align="middle" family="mono" fill={T.accentInk}/>
        <TextBlock text={item.label} x={xx+bw/2} y={bottom+essential(p,19)*1.15} width={gap*.86} fontSize={essential(p,19)} align="middle"/>
      </g>;
    })}
    {(mode === 'line' || mode === 'area') && (()=>{
      const points=items.map((item,i)=>({x:left+plotW*(i+.1)/(items.length-.8),y:toY(shown.values[i]!)}));
      const d=points.map((v,i)=>`${i?'L':'M'} ${v.x} ${v.y}`).join(' ');
      return <g data-role="series-change">
        {mode==='area' && <path d={`${d} L ${points[points.length-1]!.x} ${zero} L ${points[0]!.x} ${zero} Z`} fill={T.soft}/>}

        <path d={d} fill="none" stroke={T.accent} strokeWidth={4*u} strokeLinejoin="round"/>
        {points.map((v,i)=><g key={i} data-object-id={`metric-${i}`} data-current-value={shown.values[i]!}><circle cx={v.x} cy={v.y} r={6*u} fill={T.panel} stroke={T.accent} strokeWidth={3*u}/>
          <TextBlock text={items[i]!.label} x={v.x} y={bottom+essential(p,19)*1.15} width={plotW/items.length*.9} fontSize={essential(p,19)} align="middle"/>
          <TextBlock role="metric-current-value" text={signText(shown.values[i]!)} x={v.x} y={Math.max(y+essential(p,22)*.95,v.y-16*u)} width={Math.max(100*u,essential(p,22)*3)} fontSize={essential(p,22)} align="middle" family="mono" fill={T.accentInk}/></g>)}
        <Line x1={mix(left,left+plotW,p.motion.transform)} y1={top} x2={mix(left,left+plotW,p.motion.transform)} y2={bottom} color={T.accent} width={u}/>
      </g>;
    })()}
  </g>;
}

function ProductScene(p: FamilySceneProps) {
  const {x,y,width:w,height:h}=p.box,u=scaleOf(p.box), right=p.spec.layout.heroSide==='right';
  const cx=x+w*(right?.61:p.spec.layout.heroSide==='center'?.5:.39),cy=y+h*.49;
  const span=Math.min(w*.58,h*1.05)*p.spec.layout.subjectScale, radius=span*.29;
  const a=p.motion.setup, t=drive(p,p.motion.transform), labels=data(p,4), isRobot=p.spec.id==='robotics-showroom', isPrecision=p.spec.id==='porsche-precision';
  const guideX=x+w*(right?.04:.77), guideW=w*.2;
  return <g data-family-geometry="product" data-variant={p.spec.variant}>
    <ellipse cx={cx} cy={y+h*.82} rx={span*.43} ry={h*.035} fill={T.ink} opacity={.06*a}/>
    {isRobot ? <g data-role="articulated-subject" strokeLinecap="round">
      {(()=>{
        const base={x:cx-span*.2,y:cy+span*.2}, joint={x:cx-span*.05,y:cy-span*.16},end={x:cx+span*(.12+.22*t),y:cy-span*(.28-.2*t)};
        return <g data-object-id="robot-arm" opacity={a}>
          <path d={`M ${base.x} ${base.y} L ${joint.x} ${joint.y} L ${end.x} ${end.y}`} fill="none" stroke={T.line} strokeWidth={span*.09}/>
          <path d={`M ${base.x} ${base.y} L ${joint.x} ${joint.y} L ${end.x} ${end.y}`} fill="none" stroke={T.panel} strokeWidth={span*.065}/>
          {[base,joint,end].map((q,i)=><g key={i}><circle cx={q.x} cy={q.y} r={span*.055} fill={T.panel} stroke={T.accent} strokeWidth={3*u}/><circle cx={q.x} cy={q.y} r={span*.018} fill={T.ink}/></g>)}
          <path d={`M ${end.x-12*u} ${end.y+15*u} v ${24*u} m ${24*u} ${-24*u} v ${24*u}`} stroke={T.ink} strokeWidth={5*u}/>
          <rect x={base.x-span*.14} y={base.y} width={span*.28} height={span*.07} fill={T.panel} stroke={T.line} strokeWidth={2*u}/>
          <rect x={cx+span*.25} y={cy+span*.2} width={span*.12} height={span*.09} fill={T.accent} rx={3*u}/>
          <path d={`M ${cx+span*.3} ${cy-span*.3} Q ${cx+span*.55} ${cy-span*.04} ${cx+span*.3} ${cy+span*.15}`} fill="none" stroke={T.accent} strokeDasharray={`${5*u} ${7*u}`} strokeWidth={2*u} opacity={t}/>
        </g>;
      })()}
    </g> : isPrecision ? <g data-role="precision-exploded-subject" opacity={a}>
      {[0,1,2].map(i=>{const shift=(i-1)*span*.19*t;
        return <g key={i} data-object-id={`assembly-ring-${i}`} transform={`translate(${cx+shift} ${cy}) scale(1 .76)`}>
          <circle r={radius*(1-i*.15)} fill={i===1?T.panel:'none'} stroke={i===1?T.accent:T.ink} strokeWidth={(i===1?15:2)*u}/>
          {Array.from({length:12},(_,k)=>{const angle=k*Math.PI/6;return <Line key={k} x1={Math.cos(angle)*radius*(.7-i*.1)} y1={Math.sin(angle)*radius*(.7-i*.1)} x2={Math.cos(angle)*radius*(.93-i*.13)} y2={Math.sin(angle)*radius*(.93-i*.13)} color={T.ink} width={2*u}/>;})}
        </g>;
      })}
      <Line x1={cx-span*.45} y1={cy+span*.31} x2={cx+span*.45} y2={cy+span*.31} progress={t} color={T.accent}/>
      <TextBlock text="部件分解示意" x={cx} y={cy+span*.4} width={span*.8} fontSize={18*u} align="middle" fill={T.accentInk}/>
    </g> : <g data-role="product-interface" opacity={a}>
      {[2,1,0].map(i=>{
        const exploded=p.spec.id==='apple-glass-studio' ? (1-t)*i*span*.07 : p.spec.id==='warm-keynote' ? i*span*.035*t : i*span*.018;
        const px=cx-span*.42+exploded*.55, py=cy-span*.28-exploded, pw=span*.84, ph=span*.56;
        return <g key={i} data-object-id={`product-plane-${i}`}>
          <rect x={px} y={py} width={pw} height={ph} rx={corners(p,u)*(i?1:1.5)} fill={i===0?T.panel:T.inset} stroke={i===0?T.ink:T.line} strokeWidth={i===0?2*u:u} opacity={i===0?1:.7}/>
          {i===0 && <>
            <Line x1={px+20*u} y1={py+42*u} x2={px+pw-20*u} y2={py+42*u} color={T.line}/>
            {[0,1,2].map(k=><circle key={k} cx={px+(23+k*15)*u} cy={py+22*u} r={3*u} fill={k===2?T.accent:T.muted}/>)}
            <rect x={px+pw*.075} y={py+ph*.28} width={pw*.26} height={ph*.5} rx={corners(p,u)*.45} fill={T.inset}/>
            <circle cx={px+pw*.205} cy={py+ph*.48} r={ph*.11*(.86+.14*t)} fill={T.soft} stroke={T.accent} strokeWidth={3*u}/>
            <path d={`M ${px+pw*.17} ${py+ph*.48} l ${pw*.025} ${ph*.04} l ${pw*.05} ${-ph*.09}`} fill="none" stroke={T.accent} strokeWidth={3*u} opacity={t}/>
            {[0,1,2].map(k=><g key={k} data-object-id={`interface-state-${k}`}>
              <rect x={px+pw*.41} y={py+ph*(.28+k*.17)} width={pw*(.46-.07*k)} height={ph*.06} rx={2*u} fill={T.line}/>
              <rect x={px+pw*.41} y={py+ph*(.28+k*.17)} width={pw*(.46-.07*k)*drive(p,stagger(p,k))} height={ph*.06} rx={2*u} fill={T.accent} opacity={1-k*.22}/>
            </g>)}
            <TextBlock text={p.spec.id==='dark-tech-glow'?'输入 → 处理 → 结果':'结构展开 · 同一主体'} x={px+pw*.41} y={py+ph*.86} width={pw*.52} fontSize={16*u} fill={T.accentInk}/>
          </>}
        </g>;
      })}
    </g>}
    {(isRobot ? [{label:p.content.labels[0]??'关节', ax:cx-span*.05, ay:cy-span*.16},{label:p.content.labels[1]??'连杆',ax:cx-span*.125,ay:cy+span*.02},{label:p.content.labels[2]??'末端',ax:cx+span*(.12+.22*t),ay:cy-span*(.28-.2*t)},{label:p.content.labels[3]??'目标物',ax:cx+span*.31,ay:cy+span*.245}] : labels.slice(0,p.spec.layout.density+1).map((item,i)=>({...item,ax:cx+(right?-1:1)*span*.31,ay:cy+h*(i-1)*.12}))).map((item,i)=>{
      const yy=y+h*(.15+i*.22), anchorX=item.ax, anchorY=item.ay, edgeX=right?guideX+guideW+9*u:guideX-12*u, q=stagger(p,i);
      return <g key={i} opacity={clamp01(q*3)} data-role="annotation">
        <Line x1={anchorX} y1={anchorY} x2={edgeX} y2={yy+8*u} progress={q} color={T.line} dashed={p.spec.layout.rule==='dashed'}/>
        <Mark x={anchorX} y={anchorY} size={5*u}/>
        <TextBlock text={`0${i+1}`} x={guideX} y={yy-13*u} width={guideW} fontSize={15*u} fill={T.accentInk} family="mono"/>
        <TextBlock text={item.label} x={guideX} y={yy+essential(p,22)*1.1} width={guideW} fontSize={essential(p,22)} fill={T.ink}/>
      </g>;
    })}
  </g>;
}

function FormScene(p: FamilySceneProps) {
  const {x,y,width:w,height:h}=p.box,u=scaleOf(p.box),q=drive(p,p.motion.transform),ready=q>.67,confirmed=q>.88;
  const fx=x+w*.04,fy=y+h*(p.portrait?.12:.15),fw=w*.58,fh=h*(p.portrait?.79:.69),valueSize=essential(p,20),controlSize=essential(p,19);
  return <g data-family-geometry="terminal" data-variant="field-validation-confirmation">
    {p.content.labels.map((label,i)=><TextBlock key={i} text={`${String(i+1).padStart(2,'0')} ${label}`} x={x+w*(.04+i*.94/p.content.labels.length)} y={p.portrait?y+essential(p,19)*1.05:y+h*.04} width={w*.9/p.content.labels.length} fontSize={essential(p,19)} fill={q>=i/p.content.labels.length?T.accentInk:T.muted}/>)}
    <rect x={fx} y={fy} width={fw} height={fh} rx={12*u} fill={T.panel} stroke={T.line} strokeWidth={1.5*u}/>
    <TextBlock text="示例资料整理" x={fx+fw*.07} y={fy+fh*.13} width={fw*.84} fontSize={p.portrait?essential(p,22):25*u} weight={650}/>
    {[{label:'项目名称',value:'示例资料'},{label:'输出格式',value:ready?'表格':'请选择'}].map((field,i)=>{
      const rowY=fy+fh*(.25+i*(p.portrait?.31:.25)),fieldH=Math.max(fh*.13,p.portrait?valueSize*1.35:0),filled=i===0?Math.floor(clamp01(q*3.5)*field.value.length):field.value.length;
      return <g key={i} data-object-id={`form-field-${i}`}>
        <TextBlock text={field.label} x={fx+fw*.07} y={rowY} width={fw*.8} fontSize={essential(p,20)} fill={T.secondary}/>
        <rect x={fx+fw*.07} y={rowY+12*u} width={fw*.86} height={fieldH} rx={5*u} fill={T.inset} stroke={i===1&&q>.3&&!ready?'var(--warning, var(--accent))':T.line} strokeWidth={1.5*u}/>
        <TextBlock text={field.value.slice(0,filled)} x={fx+fw*.1} y={rowY+12*u+(p.portrait?valueSize*.98:fh*.085)} width={fw*.73} fontSize={valueSize} fill={i===1&&!ready?T.muted:T.ink}/>
      </g>;
    })}
    <rect data-object-id="confirm-control" x={fx+fw*.65} y={fy+fh*(p.portrait?.80:.79)} width={fw*.28} height={Math.max(fh*.13,p.portrait?controlSize*1.35:0)} rx={6*u} fill={ready?T.accent:T.inset}/>
    <TextBlock text={confirmed?'已确认':'确认'} x={fx+fw*.79} y={p.portrait?fy+fh*.8+controlSize*.98:fy+fh*.875} width={fw*.25} fontSize={controlSize} align="middle" fill={ready?T.onAccent:T.muted}/>
    <TextBlock text={q>.3&&!ready?'请选择格式后再确认':confirmed?'输入已检查，保留确认结果':'模拟界面，不提交实际资料'} x={fx+fw*.07} y={fy+fh*.88} width={fw*.53} fontSize={16*u} fill={T.muted}/>
    <Line x1={fx+fw+16*u} y1={fy+fh*.5} x2={x+w*.73} y2={fy+fh*.5} progress={clamp01((q-.68)*5)} color={T.accent}/>
    <g data-object-id="confirmed-record" opacity={clamp01((q-.76)*5)}>
      <rect x={x+w*.76} y={y+h*.3} width={w*.19} height={h*.38} rx={5*u} fill={T.panel} stroke={T.accent} strokeWidth={2*u}/>
      <path d={`M ${x+w*.8} ${y+h*.38} l ${w*.025} ${h*.035} l ${w*.055} ${-h*.07}`} fill="none" stroke={T.accent} strokeWidth={3*u}/>
      {[0,1,2].map(i=><Line key={i} x1={x+w*.79} y1={y+h*(.48+i*.06)} x2={x+w*.91} y2={y+h*(.48+i*.06)} color={T.line}/>) }
      <TextBlock text="确认记录" x={x+w*.855} y={y+h*.77} width={w*.22} fontSize={essential(p,21)} align="middle" fill={T.accentInk}/>
    </g>
  </g>;
}

function TerminalScene(p: FamilySceneProps) {
  if(p.spec.id==='element-clean') return <FormScene {...p}/>;
  const {x,y,width:w,height:h}=p.box,u=scaleOf(p.box), n=p.spec.layout.density+3;
  const isGreen=p.spec.id==='terminal-green', command=isGreen?'$ trace --order':'RUN / STATE / VERIFY';
  const logW=w*(p.portrait?.46:.52), left=p.spec.layout.heroSide==='right'?x+w*.47:x+w*.04, right=p.spec.layout.heroSide==='right'?x+w*.04:x+w*.62;
  const rowH=h*.12, q=drive(p,p.motion.transform), rows=['input.resolve()','route.bind()','state.update()','result.verify()','trace.persist()','output.hold()'];
  return <g data-family-geometry="terminal" data-variant={p.spec.variant}>
    <TextBlock text={command} x={left} y={Math.max(y+h*.08,y+essential(p,22)*1.05)} width={logW} fontSize={essential(p,22)} family="mono" fill={T.accentInk} role="command"/>
    <Line x1={left} y1={y+h*.13} x2={left+logW} y2={y+h*.13} color={T.ink} progress={p.motion.setup} width={strokeOf(p,u)}/>
    {Array.from({length:n},(_,i)=>{
      const reveal=clamp01((q-i/(n+1))*4), yy=y+h*.23+i*rowH, complete=q>(i+.7)/(n+1);
      return <g key={i} opacity={.2+.8*reveal} data-object-id={`log-line-${i}`}>
        <TextBlock text={String(i+1).padStart(2,'0')} x={left} y={yy} width={38*u} fontSize={15*u} family="mono" fill={T.muted}/>
        <TextBlock text={rows[i]!} x={left+48*u} y={yy} width={logW*.7} fontSize={essential(p,20)} family="mono"/>
        {complete?<TextBlock text="OK" x={left+logW} y={yy} width={Math.max(40*u,essential(p,19)*1.5)} fontSize={essential(p,19)} align="end" fill={T.accentInk} family="mono"/>:<rect x={left+logW-15*u} y={yy-13*u} width={9*u} height={17*u} fill={T.accent} opacity={reveal}/>}
      </g>;
    })}
    <g data-role="state-grid" opacity={p.motion.setup}>
      {Array.from({length:n+1},(_,row)=>Array.from({length:7},(_,col)=>{
        const activated=clamp01((q-(row*7+col)/((n+1)*7))*(n+1)*2), cw=w*.043,ch=h*.077;
        return <g key={`${row}-${col}`} data-object-id={`state-${row}-${col}`}>
          <rect x={right+col*cw} y={y+h*.18+row*ch} width={cw*.72} height={ch*.63} rx={isGreen?0:corners(p,u)*.3} fill={activated>.4?T.accent:T.inset} stroke={T.line} strokeWidth={u} opacity={.28+.72*activated}/>
          {p.spec.id==='element-clean'&&activated>.4&&<path d={`M ${right+col*cw+cw*.18} ${y+h*.18+row*ch+ch*.3} l ${cw*.12} ${ch*.1} l ${cw*.2} ${-ch*.2}`} fill="none" stroke={T.onAccent} strokeWidth={1.5*u}/>}
        </g>;
      }))}
      <Line x1={right-12*u} y1={y+h*(.18+.61*q)} x2={right+w*.3} y2={y+h*(.18+.61*q)} color={T.accent} width={2*u}/>
      <TextBlock text={p.motion.phase==='hold'?'状态保持':'状态逐步建立'} x={right} y={y+h*.89} width={w*.34} fontSize={essential(p,19)} fill={T.accentInk}/>
    </g>
  </g>;
}

function FilamentScene(p: FamilySceneProps) {
  const {x,y,width:w,height:h}=p.box,u=scaleOf(p.box), q=drive(p,p.motion.transform);
  const reverse=p.spec.layout.heroSide==='right', n=60+p.spec.layout.density*16;
  const fx=(v:number)=>x+w*(reverse?1-v:v);
  return <g data-family-geometry="node" data-variant="procedural-filaments" data-role="particle-field">
    {Array.from({length:7},(_,lane)=>{
      const yy=y+h*(.16+lane*.105), bend=(lane-3)*h*.06*(1-q);
      return <path key={lane} data-object-id={`filament-${lane}`} d={`M ${fx(.05)} ${yy+bend} C ${fx(.3)} ${yy-h*.21} ${fx(.55)} ${yy+h*.2} ${fx(.94)} ${yy}`} fill="none" stroke={T.chart(lane)} strokeWidth={(lane===3?2.5:1)*u} opacity={p.motion.setup*(.18+.35*q)}/>;
    })}
    {Array.from({length:n},(_,i)=>{
      const lane=i%7, along=(Math.floor(i/7)+.5)/(Math.ceil(n/7)), yy=y+h*(.16+lane*.105);
      const sx=fx(.08+.84*((Math.sin(i*7.23)+1)/2)), sy=y+h*(.11+.73*((Math.cos(i*4.17)+1)/2));
      const tx=fx(.06+along*.86), ty=yy+Math.sin(along*Math.PI*2)*(1-q)*h*.12;
      const px=mix(sx,tx,q),py=mix(sy,ty,q),strength=.3+.7*((i*17)%11)/10;
      return <g key={i} data-object-id={`particle-${i}`} opacity={p.motion.setup*(.35+.65*strength)}>
        <line x1={px-(reverse?-1:1)*q*w*.014} y1={py} x2={px} y2={py} stroke={T.chart(lane)} strokeWidth={1.4*u}/>
        <circle cx={px} cy={py} r={(1.7+strength*2)*u} fill={lane===3?T.accent:T.chart(lane)}/>
      </g>;
    })}
    <Line x1={fx(.04)} y1={y+h*.88} x2={fx(.96)} y2={y+h*.88} progress={p.motion.setup} color={T.line}/>
    {['分散场','约束引导','有序纤维'].map((label,i)=><TextBlock key={i} text={labelAt(p.content.labels,i===2?p.content.labels.length-1:i,label)} x={fx(.08+i*.42)} y={y+h*.97} width={w*.25} fontSize={essential(p,20)} align={i===2?(reverse?'start':'end'):'start'} fill={i===2?T.accentInk:T.muted}/>)}
  </g>;
}

function NodeScene(p: FamilySceneProps) {
  if(p.spec.id==='procedural-vfx') return <FilamentScene {...p}/>;
  const {x,y,width:w,height:h}=p.box,u=scaleOf(p.box),n=p.content.labels.length;
  if(n<2||n>6) throw new RangeError('Node scenes need 2–6 explicitly named content nodes');
  const q=drive(p,p.motion.transform),radial=p.spec.id==='quantum-interface',houdini=p.spec.id==='houdini-node-lab';
  const r=Math.min(w/(n*3.6),h*.085)*p.spec.layout.subjectScale;
  const nodes=Array.from({length:n},(_,i)=>radial?
    {x:x+w*(.5+Math.cos(i/n*Math.PI*2-Math.PI/2)*.3),y:y+h*(.45+Math.sin(i/n*Math.PI*2-Math.PI/2)*.27)}:
    {x:x+w*(.1+i*.8/(n-1)),y:y+h*(houdini?.42:i%2?.57:.34)});
  const edges:Array<[number,number]>=radial?nodes.map((_,i)=>[i,(i+1)%n] as [number,number]):nodes.slice(1).map((_,i)=>[i,i+1]);
  return <g data-family-geometry="node" data-variant={radial?'radial-relations':houdini?'left-to-right-operator-pipeline':'ordered-task-handoff'}>
    {radial&&<ellipse cx={x+w*.5} cy={y+h*.45} rx={w*.34} ry={h*.31} fill="none" stroke={T.line} strokeDasharray={`${3*u} ${7*u}`} opacity={p.motion.setup}/>}
    {edges.map(([a,b],i)=>{
      const from=nodes[a]!,to=nodes[b]!,signal=clamp01(q*(edges.length+.3)-i),sx=mix(from.x,to.x,signal),sy=mix(from.y,to.y,signal);
      return <g key={i} data-object-id={`edge-${a}-${b}`}>
        <Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} progress={p.motion.setup} color={signal>=1?T.accent:T.line} width={2*u}/>
        {!radial&&<path d={`M ${to.x-r-12*u} ${to.y-5*u} l ${8*u} ${5*u} l ${-8*u} ${5*u}`} fill="none" stroke={T.accent} strokeWidth={2*u} opacity={p.motion.setup}/>}
        {signal>0&&signal<1&&<g data-object-id={`signal-${i}`}><circle cx={sx} cy={sy} r={12*u} fill={T.soft}/><circle cx={sx} cy={sy} r={5*u} fill={T.accent}/></g>}
      </g>;
    })}
    {nodes.map((node,i)=>{
      const active=clamp01(q*(n-.5)-Math.max(0,i-.5));
      return <g key={i} data-object-id={`node-${i}`}>
        {houdini?<rect x={node.x-r} y={node.y-r*.8} width={r*2} height={r*1.6} rx={3*u} fill={T.panel} stroke={active>.5?T.accent:T.line} strokeWidth={2*u}/>:
          <circle cx={node.x} cy={node.y} r={r} fill={T.panel} stroke={active>.5?T.accent:T.line} strokeWidth={2*u}/>}
        {houdini&&i===1?[-1,0,1].map(k=><circle key={k} cx={node.x+k*r*.38} cy={node.y} r={r*.12} fill={T.accent}/>):<Mark x={node.x} y={node.y} size={r*.55} fill={active>.5?T.accent:T.muted} shape={i===n-1?'diamond':i%2?'square':'circle'}/>}
        <TextBlock text={p.content.labels[i]!} x={node.x} y={node.y+r+essential(p,21)*1.12} width={Math.min(w*.24,w/n*.9)} fontSize={essential(p,21)} align="middle" fill={active>.5?T.accentInk:T.secondary}/>
        <TextBlock text={String(i+1).padStart(2,'0')} x={node.x} y={node.y-r-18*u} width={w/n*.8} fontSize={15*u} align="middle" family="mono" fill={T.muted}/>
      </g>;
    })}
    <TextBlock text={radial?'概念关联，非物理测量':houdini?`顺序：${p.content.labels.join(' → ')}`:'请求依次交接，保留每一环的状态'} x={x+w*.5} y={y+h*.97} width={w*.9} fontSize={18*u} align="middle" fill={T.muted}/>
  </g>;
}

function BlueprintScene(p: FamilySceneProps) {
  const {x,y,width:w,height:h}=p.box,u=scaleOf(p.box), cx=x+w*(p.spec.layout.heroSide==='right'?.6:.43),cy=y+h*.46;
  const q=drive(p,p.motion.transform), r=Math.min(w*.24,h*.28)*p.spec.layout.subjectScale, stroke=strokeOf(p,u), isMedical=p.spec.id==='medical-clean-room', isScience=p.spec.id==='science-diagram';
  const labelX=p.spec.layout.heroSide==='right'?x+w*.03:x+w*.76, labelW=w*.21;
  return <g data-family-geometry="blueprint" data-variant={p.spec.variant}>
    <g opacity={p.motion.setup*.7}>
      <Line x1={cx-r*1.4} y1={cy} x2={cx+r*1.4} y2={cy} color={T.line} dashed/>
      <Line x1={cx} y1={cy-r*1.35} x2={cx} y2={cy+r*1.35} color={T.line} dashed/>
      {[.55,.85,1.15].map((m,i)=><circle key={i} cx={cx} cy={cy} r={r*m} fill="none" stroke={T.line} strokeWidth={u} strokeDasharray={i===2?`${3*u} ${6*u}`:undefined}/>)}
    </g>
    {isMedical?<g data-role="conceptual-layer-diagram" opacity={p.motion.setup}>
      {[2,1,0].map(i=><ellipse key={i} data-object-id={`tissue-layer-${i}`} cx={cx} cy={cy+(i-1)*r*.42*q} rx={r*(1-i*.12)} ry={r*.35} fill={i===1?T.soft:T.panel} stroke={i===1?T.accent:T.ink} strokeWidth={stroke}/>) }
      <path d={`M ${cx-r*.75} ${cy+r*.15*q} C ${cx-r*.2} ${cy-r*.7} ${cx+r*.2} ${cy+r*.7} ${cx+r*.75} ${cy-r*.15*q}`} fill="none" stroke={T.accent} strokeWidth={6*u}/>
      <circle data-object-id="clinical-marker" cx={cx-r*.75+r*1.5*q} cy={cy+Math.sin(q*Math.PI*2)*r*.18} r={9*u} fill={T.accent}/>
    </g>:isScience?<g data-role="scientific-orbit" opacity={p.motion.setup}>
      {[0,60,120].map((angle,i)=><g key={i} transform={`rotate(${angle} ${cx} ${cy})`}>
        <ellipse cx={cx} cy={cy} rx={r*1.05} ry={r*.35} fill="none" stroke={T.chart(i)} strokeWidth={2*u}/>
        <circle data-object-id={`orbit-marker-${i}`} cx={cx+Math.cos(q*Math.PI*1.7+i*2)*r*1.05} cy={cy+Math.sin(q*Math.PI*1.7+i*2)*r*.35} r={7*u} fill={T.chart(i)}/>
      </g>)}
      <circle data-object-id="nucleus" cx={cx} cy={cy} r={r*.16} fill={T.accent}/>
    </g>:<g data-role="engineering-section" opacity={p.motion.setup}>
      <path data-object-id="housing-outline" d={`M ${cx-r} ${cy-r*.55} L ${cx+r*.58} ${cy-r*.55} L ${cx+r} ${cy-r*.12} L ${cx+r} ${cy+r*.55} L ${cx-r} ${cy+r*.55} Z`} fill={T.panel} stroke={T.ink} strokeWidth={stroke}/>
      <rect x={cx-r*.7} y={cy-r*.31} width={r*1.25*q} height={r*.62} fill={T.soft} stroke={T.accent} strokeWidth={2*u}/>
      {Array.from({length:8},(_,i)=><Line key={i} x1={cx-r*.63+i*r*.145} y1={cy+r*.31} x2={cx-r*.4+i*r*.145} y2={cy-r*.31} color={T.accent} progress={clamp01(q*1.7-i*.08)} width={u}/>)}
      <circle data-object-id="axle" cx={cx+r*.58} cy={cy} r={r*.18} fill={T.panel} stroke={T.ink} strokeWidth={stroke}/>
    </g>}
    <g opacity={q} data-role="dimension-lines">
      <Line x1={cx-r} y1={cy+r*1.25} x2={cx+r} y2={cy+r*1.25} color={T.accent} progress={q}/>
      {[-1,1].map(s=><Line key={s} x1={cx+s*r} y1={cy+r*1.12} x2={cx+s*r} y2={cy+r*1.36} color={T.accent}/>)}
      <TextBlock text={isMedical?'通用分层示意 · 非解剖或诊疗模型':isScience?'轨迹与相位示意':'同一标尺 · 剖面示意'} x={cx} y={cy+r*1.55} width={r*2.8} fontSize={18*u} align="middle" fill={T.accentInk}/>
    </g>
    {p.content.labels.slice(0,3).map((label,i)=>{
      const yy=y+h*(.2+i*.25), fromX=isMedical?cx+r*(1-i*.12):cx+(labelX<cx?-1:1)*r*.72, fromY=isMedical?cy+(i-1)*r*.42*q:cy+(i-1)*r*.55;
      return <g key={i} opacity={clamp01(stagger(p,i)*3)}><Line x1={fromX} y1={fromY} x2={labelX<cx?labelX+labelW:labelX-12*u} y2={yy} color={T.line}/>
        <TextBlock text={label} x={labelX} y={yy-9*u} width={labelW} fontSize={essential(p,21)} fill={T.accentInk}/><TextBlock text={`${isMedical?'LAYER':'SECTION'} 0${i+1}`} x={labelX} y={yy+20*u} width={labelW} fontSize={13*u} fill={T.muted} family="mono"/></g>;
    })}
  </g>;
}

function AudioScene(p: FamilySceneProps) {
  const {x,y,width:w,height:h}=p.box,u=scaleOf(p.box), cx=x+w*.18,cy=y+h*.42,q=drive(p,p.motion.transform), start=x+w*.36,end=x+w*.97;
  const reveal=mix(start,end,q), r=Math.min(w*.115,h*.24)*p.spec.layout.subjectScale;
  return <g data-family-geometry="audio" data-variant={p.spec.variant}>
    <g data-object-id="illustrative-source" opacity={p.motion.setup}>
      {[1,.74,.48].map((m,i)=><circle key={i} cx={cx} cy={cy} r={r*m} fill={i===2?T.panel:'none'} stroke={i===1?T.accent:T.line} strokeWidth={(i===1?3:1.5)*u}/>) }
      <path d={`M ${cx-r*.13} ${cy-r*.2} Q ${cx} ${cy-r*.38} ${cx+r*.13} ${cy-r*.2} L ${cx+r*.13} ${cy+r*.12} Q ${cx} ${cy+r*.28} ${cx-r*.13} ${cy+r*.12} Z`} fill={T.accent}/>
      <path d={`M ${cx-r*.26} ${cy} v ${r*.12} Q ${cx} ${cy+r*.5} ${cx+r*.26} ${cy+r*.12} v ${-r*.12} M ${cx} ${cy+r*.34} v ${r*.15}`} fill="none" stroke={T.ink} strokeWidth={2.5*u}/>
    </g>
    <Line x1={cx+r+10*u} y1={cy} x2={start-12*u} y2={cy} progress={p.motion.setup} color={T.line}/>
    <Line x1={start} y1={cy} x2={end} y2={cy} progress={p.motion.setup} color={T.line}/>
    {Array.from({length:64+p.spec.layout.density*8},(_,i)=>{
      const n=64+p.spec.layout.density*8, xx=start+(end-start)*i/(n-1), envelope=.2+.8*Math.sin(Math.PI*i/(n-1))**2;
      const amp=(.2+.8*Math.abs(Math.sin(i*1.317)*Math.cos(i*.287)))*h*.28*envelope;
      const before=xx<=reveal, grow=before?clamp01((q-i/(n-1))*8):.04;
      return <line key={i} data-object-id={`wave-bar-${i}`} x1={xx} x2={xx} y1={cy-amp*grow} y2={cy+amp*grow} stroke={before?T.accent:T.line} strokeWidth={3*u} strokeLinecap="round"/>;
    })}
    <Line x1={reveal} y1={y+h*.08} x2={reveal} y2={y+h*.77} color={T.accent} width={1.5*u}/>
    <TextBlock text="示意波形，非音频分析" x={start} y={y+h*(p.portrait?.96:.9)} width={end-start} fontSize={essential(p,20)} fill={T.muted} role="audio-disclaimer"/>
    <TextBlock text={labelAt(p.content.labels,0,'声音起点')} x={cx} y={cy+r+essential(p,21)*1.1} width={w*.29} fontSize={essential(p,21)} align="middle" fill={T.accentInk}/>
    {[0,.5,1].map((t,i)=><g key={i}><Line x1={mix(start,end,t)} y1={y+h*.78} x2={mix(start,end,t)} y2={y+h*.8} color={T.line}/><TextBlock text={`${i*4}s`} x={mix(start,end,t)} y={y+h*.83} width={45*u} fontSize={13*u} family="mono" align="middle" fill={T.muted}/></g>)}
  </g>;
}

export function TechnicalFamily(props: FamilySceneProps) {
  switch(props.spec.family) {
    case 'data': return <DataScene {...props}/>;
    case 'product': return <ProductScene {...props}/>;
    case 'terminal': return <TerminalScene {...props}/>;
    case 'node': return <NodeScene {...props}/>;
    case 'blueprint': return <BlueprintScene {...props}/>;
    case 'audio': return <AudioScene {...props}/>;
    default: throw new Error(`TechnicalFamily cannot draw family ${props.spec.family}`);
  }
}
