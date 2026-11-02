import {fittedLines} from '../presets/primitives';
import {mix, phase, progress, sans, type ReferenceStyleProps} from './common';

type V2=readonly [number,number];
// A custom flat-topped A; its front contour and triangular counter never change topology.
const outer:readonly V2[]=[[-208,210],[-89,-210],[89,-210],[208,210],[76,210],[48,108],[-48,108],[-76,210]];
const counter:readonly V2[]=[[-42,16],[0,-125],[42,16]];

/** A letter becomes volume through authored orthographic 3-D projection, not a text stack. */
export function KineticWireframe(props:ReferenceStyleProps) {
  const {width:w,height:h,content,isOverlay=false,subtitleVisible=false}=props;
  const p=progress(props), portrait=h>w, safeH=h*(subtitleVisible?(portrait?.58:.73):.95), pad=w*(portrait?.073:.058);
  const unit=Math.min(w/1920,h/1080), uid=`wire-${w}-${h}-${subtitleVisible?'sub':'full'}`;
  const extrude=phase(p,.15,.57), turn=phase(p,.24,.73), settle=phase(p,.75,.86);
  const light=phase(p,.24,.34), dark='#181919', white='#f4f3ed', orange='#ff5b23';
  const ink=light>.5?dark:white, secondary=light>.5?'#686b64':'#b9bcb3';
  const heroSize=Math.min(w*(portrait?.72:.35),safeH*(portrait?.42:.67));
  const scale=heroSize/420, cx=w*(portrait?.50:.70), cy=safeH*(portrait?.58:.53);
  const ry=mix(0,-.62,turn), rx=mix(0,.23,turn), depth=175*extrude;
  const project=([x,y]:V2,z:number):V2=>{
    const zz=z-depth*.5, xx=x*Math.cos(ry)+zz*Math.sin(ry), z1=-x*Math.sin(ry)+zz*Math.cos(ry);
    return [cx+scale*xx,cy+scale*(y*Math.cos(rx)-z1*Math.sin(rx))];
  };
  const points=(pts:readonly V2[],z:number)=>pts.map(pt=>project(pt,z));
  const path=(pts:readonly V2[])=>pts.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' ')+' Z';
  const contour=(z:number)=>path(points(outer,z))+' '+path(points(counter,z));
  const front=contour(0), back=contour(depth);
  const titleSize=w*(portrait?.077:.047), titleWidth=w*(portrait?.85:.365);
  const title=fittedLines(content.title||'From letter to space.',titleWidth,titleSize,portrait?2:3,titleSize*.60);
  const titleY=safeH*(portrait?.216:.33), capSize=w*(portrait?1/30:.014);
  const caption=fittedLines(content.conclusion||'A form with another dimension.',w*(portrait?.82:.34),capSize,2,portrait?capSize:capSize*.74);
  const captionY=safeH*(portrait?.897:.835)-(portrait?(caption.lines.length-1)*caption.size*.55:0);
  const gridOpacity=.32*phase(p,.31,.56), lineOpacity=phase(p,.24,.54), surfaceOpacity=1-phase(p,.29,.58);
  const label=extrude<.12?'A / LETTER':extrude<.96?'A / EXTRUSION':'A / SPATIAL OBJECT';
  const gridY=safeH*(portrait?.80:.835), gridX=cx-heroSize*.78, gridW=heroSize*1.56;
  return <svg xmlns="http://www.w3.org/2000/svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`}
    data-preset-id="kinetic-wireframe-film" data-preset-family="reference" data-render-status="render-review-pending" data-reference-style="kinetic-wireframe-film" data-layout={portrait?'portrait-reflow':'landscape-split'}
    data-phase={p<.15?'source':p<.86?'dynamic':'hold'} data-safe-bottom={safeH} style={{display:'block'}}>
    <defs>
      <clipPath id={`${uid}-safe`}><rect width={w} height={safeH}/></clipPath>
      <clipPath id={`${uid}-front`}><path d={front} clipRule="evenodd"/></clipPath>
    </defs>
    {!isOverlay&&<g data-scene-background="true" data-role="stage"><rect width={w} height={h} fill={white}/><rect width={w} height={h} fill={dark} opacity={1-light}/></g>}
    <g clipPath={`url(#${uid}-safe)`} fontFamily={sans}>
      {isOverlay&&<g data-role="local-readability-support" fill={light>.5?white:dark}>
        <rect x={pad*.72} y={safeH*.045} width={titleWidth+pad*.6} height={safeH*(portrait?.25:.54)} rx={2*unit} opacity=".97"/>
        <rect x={w-pad-w*.14} y={safeH*.055} width={w*.16} height={safeH*.045} opacity=".97"/>
        <rect x={w*(portrait?.53:.70)} y={safeH*.933} width={w*(portrait?.42:.25)} height={safeH*.035} opacity=".97"/>
        <rect x={pad*.72} y={captionY-capSize*1.2} width={w*(portrait?.87:.37)} height={capSize*3.3} opacity=".97"/>
        <path d={front} fill={light>.5?white:dark} fillRule="evenodd" stroke={light>.5?white:dark} strokeWidth={9*unit} opacity=".94"/>
      </g>}
      <text x={pad} y={safeH*.089} fill={ink} fontSize={w*(portrait?.02:.011)} letterSpacing={w*.0019} fontWeight="650">FORM / SPACE</text>
      <text x={w-pad} y={safeH*.089} textAnchor="end" fill={ink} fontSize={w*(portrait?.018:.010)} letterSpacing={w*.0013}>STUDY 02</text>
      <line x1={pad} y1={safeH*.114} x2={w-pad} y2={safeH*.114} stroke={ink} strokeWidth={Math.max(.7,unit)} opacity=".25"/>
      <text x={pad} y={titleY} fill={ink} fontSize={title.size} fontWeight="700" letterSpacing={-title.size*.062}>
        {title.lines.map((line,i)=><tspan key={i} x={pad} dy={i?title.size*1.08:0}>{line}</tspan>)}
      </text>
      {!portrait&&<g transform={`translate(${pad} ${Math.min(titleY+title.lines.length*title.size*1.08+40*unit,safeH*.69)})`}>
        <rect width={w*.047} height={4*unit} fill={orange}/>
        <text x={w*.06} y={6*unit} fill={secondary} fontSize={17*unit} letterSpacing={2*unit}>TYPE HAS DIMENSION</text>
      </g>}
      {/* A floor grid in perspective, bounded to the object rather than a full-stage wallpaper. */}
      <g data-role="perspective-floor" stroke={ink} strokeWidth={.9*unit} fill="none" opacity={gridOpacity}>
        {Array.from({length:11},(_,i)=>{const x=gridX+gridW*i/10;return <line key={`v${i}`} x1={cx+(x-cx)*.35} y1={gridY-heroSize*.24} x2={x} y2={gridY}/>;})}
        {Array.from({length:7},(_,i)=>{const d=i/6,t=d*d;return <line key={`h${i}`} x1={cx-gridW*(.175+.325*t)} y1={gridY-heroSize*.24*(1-t)} x2={cx+gridW*(.175+.325*t)} y2={gridY-heroSize*.24*(1-t)}/>;})}
      </g>
      <g data-role="primary-subject" data-object-id="kinetic-a-volume" data-contour-points={outer.length+counter.length} data-extrusion-depth={depth}>
        {/* Contour slices and matched vertex rails expose the continuous extrusion. */}
        <g opacity={lineOpacity} fill="none" strokeLinejoin="miter">
          <path d={back} fill={orange} fillOpacity=".045" fillRule="evenodd" stroke={orange} strokeWidth={2.3*unit}/>
          {Array.from({length:10},(_,i)=><path key={i} d={contour(depth*(1-(i+1)/11))} stroke={i%3===0?orange:ink} strokeWidth={Math.max(.75,1.1*unit)} opacity={.23+(i/10)*.22}/>)}
          {[...outer,...counter].map((pt,i)=>{const a=project(pt,0),b=project(pt,depth);return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={i%3===0?orange:ink} strokeWidth={1.3*unit} opacity=".74"/>;})}
        </g>
        <path d={front} fill={orange} fillRule="evenodd" opacity={surfaceOpacity}/>
        <g data-role="front-surface-lattice" clipPath={`url(#${uid}-front)`} stroke={ink} strokeWidth={unit} opacity={lineOpacity*.5}>
          {Array.from({length:15},(_,i)=>{const a=project([-240,-210+i*30],0),b=project([240,-210+i*30],0);return <line key={`x${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}/>;})}
          {Array.from({length:15},(_,i)=>{const a=project([-210+i*30,-240],0),b=project([-210+i*30,240],0);return <line key={`y${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}/>;})}
        </g>
        <path d={front} fill="none" stroke={light>.5?dark:orange} strokeWidth={mix(1,3.2,lineOpacity)*unit} strokeLinejoin="miter"/>
        <g fill={orange} opacity={phase(p,.48,.70)}>
          {outer.map((point,i)=>{const [x,y]=project(point,0);return <rect key={i} x={x-3*unit} y={y-3*unit} width={6*unit} height={6*unit}/>;})}
        </g>
      </g>
      <g transform={`translate(${cx-heroSize*.49} ${cy-heroSize*.60})`} opacity={.5+.5*settle}>
        {isOverlay&&<rect x={-10*unit} y={-22*unit} width={heroSize*.72} height={32*unit} fill={light>.5?white:dark} opacity=".97"/>}
        <text fill={secondary} fontSize={w*(portrait?.018:.010)} letterSpacing={w*.0012}>{label}</text>
      </g>
      <g opacity={phase(p,.55,.78)} fill={orange} fontSize={w*(portrait?.018:.0095)} fontFamily="monospace">
        <text x={cx+heroSize*.56} y={cy+heroSize*.34}>Z</text>
        <text x={cx-heroSize*.43} y={cy-heroSize*.50}>Y</text>
        <text x={cx+heroSize*.46} y={cy+heroSize*.52}>X</text>
      </g>
      <g transform={`translate(${pad} ${captionY})`}>
        <rect y={-capSize*.68} width={capSize*.26} height={capSize*.7} fill={orange}/>
        <text x={capSize*.7} fill={ink} fontSize={caption.size} fontWeight="450">
          {caption.lines.map((line,i)=><tspan key={i} x={capSize*.7} dy={i?caption.size*1.3:0}>{line}</tspan>)}
        </text>
      </g>
      <text x={w-pad} y={safeH*.956} textAnchor="end" fill={secondary} fontSize={w*(portrait?.017:.0095)} letterSpacing={w*.0011}>2D → 3D / CONTINUOUS FORM</text>
    </g>
  </svg>;
}
