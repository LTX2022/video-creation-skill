import {MaterialShape} from '../mechanisms/MaterialShape';
import {geometryPath, type ShapeGeometry} from '../mechanisms/model';
import {fittedLines} from '../presets/primitives';
import {mix, phase, progress, sans, serif, type ReferenceStyleProps} from './common';

/** One authored contour, not four substitute objects. All treatments share point IDs. */
const ribbon: ShapeGeometry = {
  id: 'spectral-folded-ribbon',
  points: [[220,-210],[-140,-210],[-220,-130],[-220,-25],[-135,60],[65,60],[65,115],[-220,115],[-220,220],[140,220],[220,140],[220,35],[135,-50],[-65,-50],[-65,-105],[220,-105]]
    .map(([x,y],i)=>({id:`ribbon-${i}`,x:x!,y:y!})),
};
const contour = geometryPath(ribbon);
const orange = {id:'spectral-vermilion',base:'#ed6034',ink:'#b54124',highlight:'#ffb48c'};

/** Editorial material film: source hold → two continuous material passes → print hold. */
export function SpectralMaterial(props:ReferenceStyleProps) {
  const {width:w,height:h,content,isOverlay=false,subtitleVisible=false}=props;
  const p=progress(props), portrait=h>w, safeH=h*(subtitleVisible?(portrait?.58:.73):.95);
  const ink='#29291f', muted='#77776a', paper='#f4f1e8';
  const unit=Math.min(w/1920,h/1080), uid=`spectral-${w}-${h}-${subtitleVisible?'sub':'full'}`;
  const paperP=phase(p,.15,.43), printP=phase(p,.48,.76), settle=phase(p,.76,.86);
  const titleSize=w*(portrait?.074:.033), titleWidth=w*(portrait?.84:.82);
  const fit=fittedLines(content.title||'Material, in motion.',titleWidth,titleSize,2,titleSize*.65);
  const titleY=safeH*(portrait?.17:.155);
  const capSize=w*(portrait?1/30:.014), capWidth=w*(portrait?.84:.74);
  const cap=fittedLines(content.conclusion||'One form. Different ways to feel it.',capWidth,capSize,2,portrait?capSize:capSize*.74);
  const heroSize=Math.min(w*(portrait?.78:.50),safeH*(portrait?.50:(fit.lines.length>1?.57:cap.lines.length>1?.59:.64)));
  const heroScale=heroSize/440, cx=w*.5, cy=safeH*(portrait?.54:fit.lines.length>1?.57:cap.lines.length>1?.515:.53);
  const turn=mix(-7,4,paperP)-11*printP, lift=Math.sin(Math.PI*paperP)*heroSize*.026;
  const captionY=safeH*(portrait?(cap.lines.length>1?.95:.925):.965)-(cap.lines.length-1)*cap.size*1.25;
  const materialY=safeH*(portrait?.86:cap.lines.length>1?.875:.911);
  const materialLabel=printP>.5?'03  —  Print':paperP>.5?'02  —  Paper':'01  —  Solid';
  return <svg xmlns="http://www.w3.org/2000/svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`}
    data-preset-id="spectral-material-film" data-preset-family="reference" data-render-status="render-review-pending" data-reference-style="spectral-material-film" data-layout={portrait?'portrait-editorial':'centered-material-stage'}
    data-phase={p<.15?'source':p<.86?'dynamic':'hold'} data-safe-bottom={safeH} style={{display:'block'}}>
    <defs>
      <clipPath id={`${uid}-safe`}><rect width={w} height={safeH}/></clipPath>
      <clipPath id={`${uid}-shape`}><path d={contour}/></clipPath>
      <clipPath id={`${uid}-paper-wipe`}><rect x={-270} y={-270} width={540*paperP} height={540}/></clipPath>
      <clipPath id={`${uid}-print-wipe`}><rect x={-270} y={-270} width={540*printP} height={540}/></clipPath>
      <linearGradient id={`${uid}-paper`} x1="0" y1="0" x2=".85" y2="1">
        <stop stopColor="#ffb18a"/><stop offset=".48" stopColor="#ef7146"/><stop offset="1" stopColor="#c94527"/>
      </linearGradient>
      <linearGradient id={`${uid}-fold`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#ffcfab" stopOpacity=".72"/><stop offset=".5" stopColor="#e65d31" stopOpacity="0"/><stop offset="1" stopColor="#862f19" stopOpacity=".44"/>
      </linearGradient>
      <pattern id={`${uid}-print`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-21)">
        <path d="M0 1 H7" stroke="#e6532d" strokeWidth="2.5"/><circle cx="3.5" cy="5.3" r=".68" fill="#b13b20"/>
      </pattern>
    </defs>
    {!isOverlay&&<rect data-scene-background="true" data-role="stage" width={w} height={h} fill={paper}/>}
    <g clipPath={`url(#${uid}-safe)`} fontFamily={sans}>
      {isOverlay&&<g data-role="local-readability-support" fill={paper}>
        <rect x={(w-titleWidth)*.5-20*unit} y={titleY-fit.size*1.13} width={titleWidth+40*unit} height={fit.size*(fit.lines.length*1.15+.25)} rx={4*unit} opacity=".96"/>
        <rect x={w*.39} y={safeH*.034} width={w*.22} height={safeH*.044} opacity=".96"/>
        <rect x={(w-capWidth)*.5} y={captionY-cap.size*1.2} width={capWidth} height={cap.size*(cap.lines.length*1.3+.55)} rx={4*unit} opacity=".96"/>
        <rect x={w*.40} y={materialY-w*.017} width={w*.2} height={w*.026} opacity=".96"/>
      </g>}
      <text x={w*.5} y={safeH*.065} textAnchor="middle" fill={muted} fontSize={w*(portrait?.017:.0095)} letterSpacing={w*.0032} fontWeight="500">MATERIAL / STUDIES</text>
      <text x={w*.5} y={titleY} textAnchor="middle" fill={ink} fontFamily={serif} fontSize={fit.size} fontWeight="400" letterSpacing={-fit.size*.035}>
        {fit.lines.map((line,i)=><tspan key={i} x={w*.5} dy={i?fit.size*1.1:0}>{line}</tspan>)}
      </text>
      <g data-role="primary-subject" transform={`translate(${cx} ${cy-lift})`}>
        <g transform={`rotate(${turn}) scale(${heroScale})`} data-object-id={ribbon.id} data-contour-points={ribbon.points.length}>
          <g transform={`translate(${4*paperP*(1-printP)} ${7*paperP*(1-printP)})`} opacity={.4*paperP*(1-printP)}><path d={contour} fill="#963b24"/></g>
          <MaterialShape geometry={ribbon} palette={orange} material="flat" seed="spectral-01" instanceId={`${uid}-flat`} strokeWidth={.7}/>
          <g clipPath={`url(#${uid}-paper-wipe)`} data-material-pass="paper">
            <MaterialShape geometry={ribbon} palette={orange} material="paper" seed="spectral-01" instanceId={`${uid}-paper-base`} strokeWidth={.7}/>
            <g clipPath={`url(#${uid}-shape)`}>
              <rect x="-230" y="-230" width="460" height="470" fill={`url(#${uid}-paper)`} opacity=".83"/>
              <path d="M-220 -130 L-140 -210 L220 -105 L-65 -105 L-65 -50 L-135 60 L-220 -25 Z" fill={`url(#${uid}-fold)`}/>
              <path d="M-135 60 L65 60 L220 140 L140 220 L-220 115 L65 115 Z" fill={`url(#${uid}-fold)`}/>
              <path d="M-220 -130 L-65 -50 M-135 60 L65 115 M65 60 L220 140" fill="none" stroke="#ffd7b8" strokeWidth="1.1" opacity=".7"/>
              <path d="M-140 -210 L220 -105 M140 220 L-220 115" stroke="#8d2f1d" strokeWidth=".7" opacity=".25"/>
            </g>
          </g>
          <g clipPath={`url(#${uid}-print-wipe)`} data-material-pass="line-halftone">
            <path d={contour} fill="#f8e5d3" stroke="#d84a29" strokeWidth="2"/>
            <path d={contour} fill={`url(#${uid}-print)`}/>
            <g clipPath={`url(#${uid}-shape)`} stroke="#ed6034" fill="none" opacity=".4">
              <path d="M-270 -180 L260 160 M-270 -165 L260 175 M-270 -150 L260 190" strokeWidth="1.5"/>
            </g>
          </g>
        </g>
      </g>
      <text x={w*.5} y={materialY} textAnchor="middle" fill="#c35331" fontFamily={serif} fontStyle="italic" fontSize={w*(portrait?.024:.0135)} opacity={.75+.25*settle}>{materialLabel}</text>
      <text x={w*.5} y={captionY} textAnchor="middle" fill={ink} fontSize={cap.size} fontWeight="400">
        {cap.lines.map((line,i)=><tspan key={i} x={w*.5} dy={i?cap.size*1.25:0}>{line}</tspan>)}
      </text>
    </g>
  </svg>;
}
