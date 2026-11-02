import { cinemaTitleText } from './narration';
import type { CSSProperties } from 'react';
import type { PresetContent, PresetSceneProps, ThemePresetSpec } from './types';
import { getPreset } from './registry';
import { ReferenceScene } from '../reference-styles/ReferenceScene';
import { presetLayout } from './layout';
import { presetMotion } from './motion';
import { T, TextBlock, fittedLines } from './primitives';
import { ArtisticFamily } from './families-artistic';
import { TechnicalFamily } from './families-technical';

const ARTISTIC = new Set(['editorial','lesson','gallery','archive','kinetic','soft']);
function validateContent(content: PresetContent): PresetContent {
  if (![content.title,content.eyebrow,content.conclusion].every(v=>typeof v==='string') || !content.title.trim()) throw new TypeError('Preset requires a nonempty title, eyebrow and conclusion');
  if (!Array.isArray(content.labels) || content.labels.some(v=>typeof v!=='string'||!v.trim()) || content.labels.length<4 || content.labels.length>8) throw new TypeError('Preset needs four to eight nonempty semantic labels; do not invent placeholder nodes');
  if (content.values && (content.values.length>8 || content.values.some(v=>!Number.isFinite(v)))) throw new TypeError('Preset values must be finite and contain at most eight values');
  return content;
}
function Backdrop({spec,width,height}: {spec:ThemePresetSpec;width:number;height:number}) {
  const unit=Math.min(width/1200,height/675);
  const kind=spec.layout.decoration;
  return <g data-scene-decoration="background" opacity={.16}>
    {kind==='grid'&&Array.from({length:12},(_,i)=><g key={i}><line x1={width*(i+1)/13} y1={0} x2={width*(i+1)/13} y2={height} stroke={T.line} strokeWidth={unit}/><line x1={0} y1={height*(i+1)/13} x2={width} y2={height*(i+1)/13} stroke={T.line} strokeWidth={unit}/></g>)}
    {kind==='dots'&&Array.from({length:48},(_,i)=><circle key={i} cx={width*((i%8)+.5)/8} cy={height*(Math.floor(i/8)+.5)/6} r={1.5*unit} fill={T.muted}/>)}
    {kind==='rays'&&Array.from({length:9},(_,i)=><line key={i} x1={width*.8} y1={height*.6} x2={width*(i/8)} y2={height} stroke={T.accent} strokeWidth={unit}/>)}
    {kind==='bands'&&<><path d={`M 0 ${height*.91} L ${width} ${height*.75} V ${height} H 0 Z`} fill={T.soft}/><path d={`M ${width*.82} 0 H ${width} V ${height*.9} Z`} fill={T.soft}/></>}
    {kind==='frame'&&<rect x={width*.025} y={height*.025} width={width*.95} height={height*.95} fill="none" stroke={T.ink} strokeWidth={spec.layout.rule==='bold'?4*unit:unit}/>}
  </g>;
}

/** Same component is used by the production chapter and probes; no hook, DOM read or wall-clock dependency. */
export function PresetScene(props: PresetSceneProps) {
  const {presetId,frame,durationInFrames,fps,width,height,isOverlay=false,subtitleVisible=false,chapterStepTimings}=props;
  const spec=getPreset(presetId);
  const content=validateContent({...spec.content,...props.content});
  // Complete film scenes bypass the legacy heading/subject-card composition entirely.
  if (spec.family==='reference') return <ReferenceScene {...props} content={content}/>;
  const layout=presetLayout(spec,width,height,subtitleVisible,content.title);
  const motion=presetMotion(spec,frame,durationInFrames,fps,chapterStepTimings);
  const {heading:h,subject,footer,unit:u,portrait}=layout;
  const horizontalHeading=layout.headingMode==='side';
  const titleMaxLines=horizontalHeading?3:2;
  const titleFit=fittedLines(content.title,h.width,layout.titleSize,titleMaxLines,layout.titleSize*.72);
  const titleY=h.y+layout.labelSize*1.7+titleFit.size;
  const subtitleY=titleY+(titleFit.lines.length-1)*titleFit.size*1.09+layout.bodySize*1.65;
  const uid=`preset-${spec.id}-${width}-${height}`;
  const familyProps={spec,content,box:subject,motion,portrait,unit:u,uid,overlay:isOverlay};
  return <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}
    role="img" aria-label={`${content.title}；${content.conclusion}`} data-preset-id={presetId} data-preset-family={spec.family}
    data-layout-variant={spec.variant} data-motion-phase={motion.phase} data-render-status="render-review-pending"
    data-frame={motion.frame} data-output-kind={isOverlay?'alpha':'opaque'}
    style={{display:'block',width:'100%',height:'100%',fontFamily:'var(--font-body)',overflow:'hidden'} as CSSProperties}>
    <title>{content.title}</title>
    {!isOverlay&&<><rect data-scene-background data-role="stage" x={0} y={0} width={width} height={height} fill={T.stage}/><Backdrop spec={spec} width={width} height={height}/></>}
    <g data-role="headline" opacity={.2+.8*motion.setup}>
      {isOverlay&&<rect data-role="label-backing" x={h.x-12*u} y={h.y-9*u} width={h.width+24*u} height={h.height+18*u} fill={T.stage} opacity={.97} rx={8*u}/>}
      <text x={h.x} y={h.y+layout.labelSize} fill={T.accentInk} fontSize={layout.labelSize} style={{fontFamily:'var(--font-mono)',letterSpacing:'var(--label-tracking, .08em)'}}>{content.eyebrow}</text>
      {spec.id!=='cinema-title-card'&&<TextBlock text={content.title} x={h.x} y={titleY} width={h.width} fontSize={titleFit.size} maxLines={titleMaxLines} lineHeight={1.09}
        weight={`var(--font-display-weight, ${spec.layout.titleWeight})`} family="display" role="primary-title"/>}
      {horizontalHeading&&content.subtitle&&<TextBlock text={content.subtitle} x={h.x} y={subtitleY} width={h.width} fontSize={layout.bodySize} maxLines={4} fill={T.secondary} role="supporting-copy" opacity={motion.setup}/>} 
      <line x1={h.x} y1={horizontalHeading?Math.min(h.y+h.height-24*u,subtitleY+(content.subtitle?layout.bodySize*4.8:layout.bodySize)):h.y+h.height}
        x2={h.x+h.width*(horizontalHeading?.2:.12)*motion.setup} y2={horizontalHeading?Math.min(h.y+h.height-24*u,subtitleY+(content.subtitle?layout.bodySize*4.8:layout.bodySize)):h.y+h.height}
        stroke={T.accent} strokeWidth={spec.layout.rule==='bold'?5*u:2*u}/>
    </g>
    <g data-role="primary-subject" data-bounds={`${subject.x},${subject.y},${subject.width},${subject.height}`}>
      {isOverlay&&spec.id!=='cinema-title-card'&&<rect data-role="subject-readability-backing"
        data-protection={spec.id==='procedural-vfx'?'label-strip':'subject-region'}
        x={subject.x} y={subject.y+subject.height*(spec.id==='procedural-vfx'?.885:0)}
        width={subject.width} height={subject.height*(spec.id==='procedural-vfx'?.115:1)}
        rx={6*u} fill={T.stage} opacity={.97}/>}
      {ARTISTIC.has(spec.family)?<ArtisticFamily {...familyProps}/>:<TechnicalFamily {...familyProps}/>}
    </g>
    <g data-role="retained-conclusion" opacity={.35+.65*motion.transform}>
      {isOverlay&&<rect data-role="label-backing" x={footer.x-8*u} y={footer.y-6*u} width={footer.width+16*u} height={footer.height+12*u} fill={T.stage} opacity={.94} rx={4*u}/>}
      <TextBlock text={content.conclusion} x={footer.x} y={footer.y+layout.labelSize} width={footer.width*.87} fontSize={layout.labelSize} maxLines={2} fill={T.secondary} role="conclusion"/>
      <text x={footer.x+footer.width} y={footer.y+layout.labelSize} textAnchor="end" fontSize={12*u} fill={T.muted} style={{fontFamily:'var(--font-mono)'}}>{spec.id==='cinema-title-card'?cinemaTitleText(content).phase(motion.phase):motion.phase==='hold'?'03 / HOLD':motion.phase==='transform'?'02 / ACT':'01 / SET'}</text>
    </g>
  </svg>;
}
