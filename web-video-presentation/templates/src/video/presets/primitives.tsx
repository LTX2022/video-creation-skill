import type { CSSProperties } from 'react';

/** Semantic roles resolve against the selected, real theme stylesheet. */
export const T = {
  stage: 'var(--surface)', panel: 'var(--surface-2)', inset: 'var(--surface-3)', ink: 'var(--text)',
  secondary: 'var(--text-2)', muted: 'var(--text-mute)', line: 'var(--rule)', accent: 'var(--accent)',
  accentInk: 'var(--accent-strong, var(--accent))', onAccent: 'var(--accent-on, var(--surface))',
  soft: 'var(--accent-soft)', success: 'var(--success, var(--accent))',
  chart: (i: number) => `var(--chart-${i % 5 + 1}, var(--accent))`,
} as const;
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const smooth = (p: number) => { const q = clamp01(p); return q * q * (3 - 2 * q); };
export function charUnits(text: string): number {
  return [...text].reduce((n, c) => n + (/\s/u.test(c) ? .32 : /[\u0000-\u00ff]/u.test(c) ? .58 : 1), 0);
}
/** Conservative deterministic wrapping, not a claim of browser font measurement. */
export function wrapText(text: string, capacity: number): string[] {
  if (!Number.isFinite(capacity) || capacity <= 0) throw new RangeError('Text width must be positive');
  if (text.includes('\n')) return text.split('\n').flatMap(line=>wrapText(line,capacity));
  const chars=[...text], n=chars.length;
  if(!n) return [''];
  const prefix=[0]; for(const c of chars) prefix.push(prefix[prefix.length-1]!+charUnits(c));
  const total=prefix[n]!; const minimumCount=Math.max(1,Math.ceil(total/capacity));
  const cannotStart=/[，。！？；：、）》」』】,.!?;:)\]}%]/u, cannotEnd=/[（《「『【(\[{]/u;
  if(cannotStart.test(chars[0]!)||cannotEnd.test(chars[n-1]!)) throw new RangeError('Preset text begins or ends with unpaired line punctuation');
  const protectedWords=['规则','尺度','清晰','关系','信息','结构','结果','输入','输出','过程','层级','比较','判断','证据','观察','线索','结论','变化','同一','系统','处理','质量','时间','设计','空间','对象','运动','问题','方法','原理'];
  for(let count=minimumCount;count<=n;count++) {
  const target=total/count;
  const cost=Array.from({length:count+1},()=>Array(n+1).fill(Infinity));
  const prev=Array.from({length:count+1},()=>Array(n+1).fill(-1)); cost[0]![0]=0;
  for(let lines=1;lines<=count;lines++) for(let end=1;end<=n;end++) for(let start=end-1;start>=0;start--) {
    const units=prefix[end]!-prefix[start]!; if(units>capacity+.001) break;
    if(!Number.isFinite(cost[lines-1]![start])) continue;
    const left=chars[end-1]??'', right=chars[end]??'';
    let penalty=(units-target)**2;
    // Kinsoku is a constraint: a closing mark cannot begin the next line,
    // and an opening mark cannot finish this one. Do not rescue it with a penalty.
    if(end<n&&(cannotStart.test(right)||cannotEnd.test(left))) continue;
    if(end<n&&/[，。！？；：、]/u.test(left)) penalty-=Math.min(3,target*.3);
    if(end<n&&/[A-Za-z0-9]/.test(left)&&/[A-Za-z0-9]/.test(right)) penalty+=18;
    if(end<n&&protectedWords.includes(left+right)) penalty+=16;
    if(lines===count&&units<Math.min(3,target*.45)) penalty+=60;
    const value=cost[lines-1]![start]+penalty;
    if(value<cost[lines]![end]) {cost[lines]![end]=value;prev[lines]![end]=start;}
  }
  if(!Number.isFinite(cost[count]![n])) continue;
  const result:string[]=[]; let end=n;
  for(let lines=count;lines>0;lines--) {const start=prev[lines]![end]!;result.unshift(chars.slice(start,end).join(''));end=start;}
  return result;
  }
  throw new RangeError('Preset text cannot fit without invalid line punctuation at this size');
}
export function fittedLines(text: string, width: number, fontSize: number, maxLines: number, minSize = fontSize * .72) {
  let size = fontSize; let lines = wrapText(text, width / size);
  while (lines.length > maxLines && size > minSize) { size = Math.max(minSize, size - 1); lines = wrapText(text, width / size); }
  if (lines.length > maxLines || lines.some(line=>charUnits(line)*size>width+.01)) throw new RangeError(`Preset text exceeds ${maxLines} lines at readable size: ${text.slice(0, 40)}`);
  return {lines, size};
}
export function TextBlock({text, x, y, width, fontSize, maxLines = 2, fill = T.ink, weight = 500, align = 'start', lineHeight = 1.22, role = 'label', opacity = 1, family = 'body'}: {
  text: string; x: number; y: number; width: number; fontSize: number; maxLines?: number;
  fill?: string; weight?: number | string; align?: 'start' | 'middle' | 'end'; lineHeight?: number;
  role?: string; opacity?: number; family?: 'body' | 'display' | 'mono';
}) {
  const fit = fittedLines(text, width, fontSize, maxLines);
  const fontFamily = family === 'display' ? 'var(--font-display-cn)' : family === 'mono' ? 'var(--font-mono)' : 'var(--font-body)';
  return <text data-role={role} x={x} y={y} fill={fill} opacity={opacity} fontSize={fit.size} textAnchor={align}
    style={{fontFamily, fontWeight: weight} as CSSProperties}>
    {fit.lines.map((line, i) => <tspan key={i} x={x} dy={i ? fit.size * lineHeight : 0}>{line}</tspan>)}
  </text>;
}
export function Mark({x, y, size, fill = T.accent, shape = 'circle'}: {x:number;y:number;size:number;fill?:string;shape?:'circle'|'square'|'diamond'}) {
  return shape === 'circle' ? <circle cx={x} cy={y} r={size / 2} fill={fill}/> :
    <rect x={x-size/2} y={y-size/2} width={size} height={size} fill={fill} transform={shape === 'diamond' ? `rotate(45 ${x} ${y})` : undefined}/>;
}
export function Line({x1,y1,x2,y2,progress=1,color=T.line,width=1.5,dashed=false}: {x1:number;y1:number;x2:number;y2:number;progress?:number;color?:string;width?:number;dashed?:boolean}) {
  return <line x1={x1} y1={y1} x2={mix(x1,x2,progress)} y2={mix(y1,y2,progress)} stroke={color} strokeWidth={width} strokeDasharray={dashed?'5 7':undefined}/>;
}
export const labelAt = (labels: readonly string[], index: number, fallback: string) => labels[index] ?? fallback;
