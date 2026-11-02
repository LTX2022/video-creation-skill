import type {ChapterStepProps} from '../../registry/types';
const ease=(f:number,a:number,b:number)=>{const t=Math.max(0,Math.min(1,(f-a)/(b-a)));return t*t*(3-2*t)};
const font='var(--font-body)';
function Stage({children,bg='var(--shell)'}:{children:React.ReactNode,bg?:string}){return <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position:'absolute',inset:0,background:bg,fontFamily:font}}>{children}</svg>}
const T=({x,y,s=32,fill='var(--text)',children,...rest}:{x:number,y:number,s?:number,fill?:string,children:React.ReactNode,[k:string]:any})=><text x={x} y={y} fontSize={s} fill={fill} {...rest}>{children}</text>;
export function Product(p:ChapterStepProps){const f=p.chapterFrame??p.frame??0;const move=ease(f,65,125);const approve=ease(f,155,185);const ship=ease(f,210,270);const x=250+move*510+ship*510;const y=405;return <Stage>
<T x={125} y={130} s={25} fill="var(--accent)">01 / PRODUCT FLOW</T><T x={125} y={230} s={72} fontWeight="700">先确认，再执行。</T>
<T x={125} y={295} s={29} fill="var(--text-mute)">原创交互示意 · 同一张任务单的完整旅程</T>
{[250,760,1270].map((v,i)=><g key={v}><rect x={v-20} y={385} width={400} height={350} rx={24} fill="var(--surface)" stroke="var(--rule)" strokeWidth={2}/><T x={v} y={795} s={34}>{['输入','确认','执行'][i]}</T></g>)}
<path d="M650 560 H730 M1160 560 H1240" stroke="var(--text-mute)" strokeWidth="3"/><path d="m720 548 12 12-12 12m510-24 12 12-12 12" fill="none" stroke="var(--text-mute)" strokeWidth="3"/>
<g transform={`translate(${x},${y})`}><rect width="360" height="290" rx="18" fill="var(--surface-3)" stroke={approve?'var(--success)':'var(--accent)'} strokeWidth="3"/><T x={28} y={58} s={22} fill="var(--text-mute)">TASK / 024</T><T x={28} y={116} s={34}>发布周报</T><rect x="28" y="146" width="240" height="9" rx="4" fill="var(--rule)"/><rect x="28" y="168" width="180" height="9" rx="4" fill="var(--rule)"/>
<T x={28} y={240} s={28} fill={approve?'var(--success)':'var(--warning)'}>{ship>.98?'✓ 已执行':approve>.98?'✓ 已确认':'等待确认'}</T></g>
<g opacity={1-ease(f,190,210)}><rect x="800" y="856" width="300" height="68" rx="34" fill="var(--accent)"/><T x={950} y={900} s={28} textAnchor="middle" fill="var(--accent-on)">{approve>.5?'确认成功':'确认并继续'}</T><circle cx="1040" cy="885" r={24+approve*35} opacity={approve*(1-approve)*4} fill="none" stroke="var(--text)" strokeWidth="4"/></g>
<T x={125} y={1000} s={24} fill="var(--text-mute)">演示模型：未连接真实服务，不会发布任何内容。</T></Stage>}
export function Data(p:ChapterStepProps){const f=p.chapterFrame??p.frame??0;const q=ease(f,70,210);const a=80,b=80-30*q;return <Stage bg="var(--data-paper)">
<T x={125} y={125} s={25} fill="var(--data-ink)">02 / DATA EXPLAINER</T><T x={125} y={225} s={70} fontWeight="700" fill="var(--data-ink)">少了 30，不是少了 30%。</T>
<T x={125} y={295} s={29} fill="var(--data-muted)">示例数据 · 单位：分钟 · 同一项任务</T>
{[0,20,40,60,80,100].map(n=><g key={n}><line x1={360+n*11} y1="375" x2={360+n*11} y2="770" stroke="var(--data-rule)"/><T x={360+n*11} y={825} s={24} fill="var(--data-muted)" textAnchor="middle">{n}</T></g>)}
<T x={125} y={475} s={34} fill="var(--data-ink)">原流程</T><T x={125} y={675} s={34} fill="var(--data-ink)">新流程</T>
<rect x="360" y="410" width={a*11} height="95" rx="8" fill="var(--data-base)"/><rect x="360" y="610" width={b*11} height="95" rx="8" fill="var(--data-accent)"/>
<T x={390+a*11} y={475} s={42} fill="var(--data-ink)">80</T><T x={390+b*11} y={675} s={42} fill="var(--data-ink)">{Math.round(b)}</T>
<g opacity={ease(f,225,255)}><T x={125} y={950} s={42} fill="var(--data-ink)">节省 30 分钟</T><T x={720} y={950} s={42} fill="var(--data-accent)">30 ÷ 80 = 37.5%</T></g></Stage>}
export function Type(p:ChapterStepProps){const f=p.chapterFrame??p.frame??0;const gather=ease(f,85,155);const release=ease(f,230,300);const words=['想','清','楚','再','动','手'];return <Stage bg="var(--type-paper)">
<T x={125} y={125} s={25} fill="var(--type-ink)">03 / KINETIC TYPE</T>
{words.map((w,i)=>{const initial=[[-140,-120],[220,130],[-60,180],[140,-170],[-220,100],[180,-80]][i];const bx=280+i*265;const x=bx+initial[0]*(1-gather);const y=540+initial[1]*(1-gather)-(i%2?1:-1)*release*100;return <g key={w} transform={`translate(${x},${y}) rotate(${(i%2?12:-12)*(1-gather)})`} opacity={ease(f,i*8,i*8+22)}><T x={0} y={0} s={160} fill={i>=3?'var(--type-accent)':'var(--type-ink)'} textAnchor="middle" fontWeight="900">{w}</T><circle cy={78} r={7*gather*(1-release)} fill="var(--type-accent)"/></g>})}
<line x1={180} y1="770" x2={180+1560*ease(f,160,205)} y2="770" stroke="var(--type-ink)" strokeWidth="5"/>
<T x={180} y={875} s={42} fill="var(--type-ink)" opacity={ease(f,175,205)}>从散乱，到对齐，再出发。</T><T x={180} y={990} s={24} fill="var(--type-ink)">原创文字节奏试片 · 静音版</T></Stage>}
