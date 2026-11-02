import React from 'react';
import {charUnits, fittedLines} from '../presets/primitives';
import {mix, phase, progress, seeded, serif, sans, type ReferenceStyleProps} from './common';

/** An original, frame-addressable illustration. No source footage or runtime assets. */
export function RainPlatform(props: ReferenceStyleProps) {
  const {width, height, frame, fps, content, isOverlay = false, subtitleVisible = false} = props;
  const portrait = width / height < 0.9;
  const W = portrait ? 900 : 1600;
  const H = W * height / Math.max(1, width);
  // Portrait captions end at .73H but occupy the band ABOVE it (.60–.73H).
  const safeRatio = subtitleVisible ? (portrait ? 0.58 : 0.73) : (portrait ? 0.90 : 1);
  const stage = H * safeRatio;
  const p = progress(props);
  const seconds = Math.max(0, frame) / Math.max(1, fps);
  const uid = `rain-platform-${width}-${height}-${isOverlay ? 'a' : 'o'}`;
  const url = (name: string) => `url(#${uid}-${name})`;
  const floorY = stage * 0.67;
  const groundY = stage * (portrait ? 0.85 : 0.865);
  const trainY = stage * (portrait ? 0.42 : 0.385);
  const trainH = floorY - trainY;
  const roofY = stage * (portrait ? 0.31 : 0.285);
  const roofEnd = W * (portrait ? 0.64 : 0.60);
  const roofTipY = roofY - stage * 0.075;
  const arrival = phase(p, 0.10, 0.49);
  const stopX = -W * 0.19;
  const trainX = mix(W * 1.08, stopX, arrival);
  const trainWidth = W * 2.1;
  const walk = phase(p, 0.19, 0.58);
  const personX = mix(W * (portrait ? 0.94 : 0.90), W * (portrait ? 0.69 : 0.73), walk);
  const personScale = Math.min(stage * (portrait ? 0.365 : 0.43) / 323, W * (portrait ? 0.57 : 0.27) / 260);
  const stride = Math.sin(walk * Math.PI * 8) * Math.sin(walk * Math.PI);
  const bob = Math.abs(stride) * 3;
  const umbrellaAngle = mix(-7, 5, phase(p, 0.53, 0.70)) - phase(p, 0.79, 0.92) * 3;
  const door = phase(p, 0.50, 0.69);
  const doorX = W * (portrait ? 0.70 : 0.72) - stopX;
  const doorW = Math.min(125, W * 0.12);
  const windowY = trainH * 0.17;
  const windowH = trainH * 0.43;
  const trainWindows = Math.ceil(trainWidth / 139);
  const titleSize = portrait ? 51 : 53;
  const titleX = portrait ? 60 : 92;
  const titleY = Math.max(titleSize + 43, stage * (portrait ? 0.098 : 0.105));
  const copyWidth = W - titleX * 2 - 22;
  const titleFit = fittedLines(content.title || '等一场雨，等一班车', copyWidth, titleSize, 2, titleSize * .67);
  const conclusionFit = fittedLines(content.conclusion || content.title, copyWidth, titleSize, 2, titleSize * .67);
  const titleAlpha = 1 - phase(p, 0.29, 0.41);
  const conclusionAlpha = phase(p, 0.79, 0.92);
  const umbrellaPath = 'M -107 -246 C -97 -279 -48 -314 24 -319 C 94 -312 142 -278 154 -246 Q 125 -263 101 -244 Q 75 -261 50 -244 Q 24 -261 -2 -244 Q -28 -261 -54 -244 Q -80 -262 -107 -246 Z';
  const railY = floorY + stage * 0.025;
  return <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Rain platform: a traveler approaches an arriving night train" data-style="rain-platform-film" data-preset-id="rain-platform-film" data-preset-family="reference" data-render-status="render-review-pending" data-safe-bottom={height*safeRatio} data-phase={p < .49 ? 'arrival' : p < .79 ? 'invitation' : 'settle'}>
    <defs>
      <linearGradient id={`${uid}-sky`} x2="0" y2="1"><stop stopColor="#0b1026"/><stop offset=".52" stopColor="#202c49"/><stop offset="1" stopColor="#586078"/></linearGradient>
      <linearGradient id={`${uid}-floor`} x2=".13" y2="1"><stop stopColor="#303a50"/><stop offset=".32" stopColor="#202b42"/><stop offset="1" stopColor="#0d1529"/></linearGradient>
      <linearGradient id={`${uid}-metal`} x2="0" y2="1"><stop stopColor="#758093"/><stop offset=".11" stopColor="#505f74"/><stop offset=".65" stopColor="#344359"/><stop offset="1" stopColor="#192439"/></linearGradient>
      <linearGradient id={`${uid}-glass`} x2="0" y2="1"><stop stopColor="#f3d69a"/><stop offset=".55" stopColor="#c99a5e"/><stop offset="1" stopColor="#805a40"/></linearGradient>
      <linearGradient id={`${uid}-umbrella`} x2=".6" y2="1"><stop stopColor="#42546c"/><stop offset=".45" stopColor="#243952"/><stop offset="1" stopColor="#111f35"/></linearGradient>
      <linearGradient id={`${uid}-coat`} x2="1" y2=".5"><stop stopColor="#5b3431"/><stop offset=".45" stopColor="#a36642"/><stop offset=".85" stopColor="#c28a56"/><stop offset="1" stopColor="#7c4a35"/></linearGradient>
      <linearGradient id={`${uid}-beam`} x2="0" y2="1"><stop stopColor="#f9d697" stopOpacity=".13"/><stop offset="1" stopColor="#f9d697" stopOpacity="0"/></linearGradient>
      <linearGradient id={`${uid}-reflection`} x2="0" y2="1"><stop stopColor="#f2bb6d" stopOpacity=".37"/><stop offset="1" stopColor="#efbb70" stopOpacity="0"/></linearGradient>
      <radialGradient id={`${uid}-haze`}><stop stopColor="#9ba5bb" stopOpacity=".20"/><stop offset="1" stopColor="#65728e" stopOpacity="0"/></radialGradient>
      <radialGradient id={`${uid}-lamp`}><stop stopColor="#ffe5b0" stopOpacity=".55"/><stop offset=".2" stopColor="#f4c77d" stopOpacity=".13"/><stop offset="1" stopColor="#f4c77d" stopOpacity="0"/></radialGradient>
      <filter id={`${uid}-soft-light`} x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="9"/></filter>
      <clipPath id={`${uid}-stage`}><rect width={W} height={stage}/></clipPath>
      <clipPath id={`${uid}-floor-clip`}><path d={`M0 ${floorY} H${W} V${stage} H0Z`}/></clipPath>
      <clipPath id={`${uid}-rain-outside`}><path d={`M0 0 H${W} V${stage} H${roofEnd} V${roofTipY} L0 ${roofY}Z`}/></clipPath>
      <mask id={`${uid}-umbrella-shadow`}><rect width={W} height={stage} fill="white"/><g transform={`translate(${personX} ${groundY-bob*personScale}) scale(${personScale}) rotate(${umbrellaAngle} 24 -148)`}><path d="M-107 -250 Q24 -390 154 -250 L196 80 H-68Z" fill="black"/></g></mask>
    </defs>
    {!isOverlay && <rect width={W} height={H} fill="#0d1529" data-scene-background="true" data-role="stage"/>}
    <g clipPath={url('stage')}>
      {!isOverlay && <g data-layer="environment">
        <rect width={W} height={H} fill={url('sky')} data-scene-background="true" data-role="stage"/>
        <path d={`M0 ${stage*.16} C${W*.28} ${stage*.08} ${W*.44} ${stage*.22} ${W*.70} ${stage*.12} S${W*.94} ${stage*.10} ${W} ${stage*.13} V${stage*.26} C${W*.66} ${stage*.17} ${W*.39} ${stage*.32} 0 ${stage*.23}Z`} fill="#313b56" opacity=".20"/>
        <ellipse cx={W*.73} cy={stage*.39} rx={W*.52} ry={stage*.28} fill={url('haze')}/>
        {Array.from({length: 27}, (_, i) => {
          const bw = W/22 * (0.6 + seeded(i, 42)*.8);
          const x = i*W/25 - 30;
          const top = stage * (.25+seeded(i, 78)*.18);
          return <g key={`city-${i}`} opacity={.48+seeded(i,4)*.25}><path d={`M${x} ${floorY} V${top+10} H${x+bw*.15} V${top} H${x+bw*.73} V${top+7} H${x+bw} V${floorY}Z`} fill={i%3 ? '#111c35' : '#17213c'}/>{Array.from({length: 5},(_,j)=><path key={j} d={`M${x+bw*.25+j%2*bw*.32} ${top+22+Math.floor(j/2)*19} h${bw*.11}`} stroke={j%3 ? '#8e7e6c' : '#aeb8c9'} strokeWidth="3" opacity={seeded(i*5+j,54)*.65}/>)}</g>;
        })}
        <path d={`M0 ${stage*.38} Q${W*.5} ${stage*.45} ${W} ${stage*.34} M0 ${stage*.395} Q${W*.5} ${stage*.465} ${W} ${stage*.355}`} stroke="#222c44" strokeWidth="2" fill="none"/>
        {[.24,.53,.89].map((x,i)=><g key={i} opacity=".55" stroke="#17223b" strokeWidth="5"><path d={`M${W*x} ${stage*.34} V${floorY} M${W*x-30} ${stage*.38} H${W*x+43}`}/></g>)}
      </g>}
      {/* Distant rain stays behind the train and the station roof. */}
      {!isOverlay && <g stroke="#b2bfd8" strokeLinecap="round" opacity=".15" data-layer="distant-rain">
        {Array.from({length: 110},(_,i)=>{const x=seeded(i,81)*W;const y=(seeded(i,2)*stage+seconds*(190+seeded(i,3)*60))%(stage*.72);return <path key={i} d={`M${x} ${y} l-5 ${10+seeded(i,8)*12}`} strokeWidth={.6+seeded(i,5)*.5}/>;})}
      </g>}
      <g data-layer="tracks"><path d={`M0 ${floorY-9} H${W} V${floorY+stage*.08} H0Z`} fill="#111a2c"/><path d={`M0 ${railY} H${W} M0 ${railY+13} H${W}`} stroke="#596273" strokeWidth="3"/><path d={`M0 ${railY+5} H${W}`} stroke="#e4bd7b" strokeOpacity=".22" strokeWidth="1"/></g>
      {/* Long metal body and a readable warm doorway, not a row of floating UI cards. */}
      <g transform={`translate(${trainX} ${trainY})`} data-layer="arriving-train" data-object-id="rain-platform-train">
        <path d={`M82 0 H${trainWidth} V${trainH-12} H17 Q-8 ${trainH-18} 0 ${trainH-67} L24 45 Q35 2 82 0Z`} fill={url('metal')} stroke="#8892a0" strokeOpacity=".35" strokeWidth="2"/>
        <path d={`M59 8 H${trainWidth} M27 34 H${trainWidth}`} stroke="#acb6c3" strokeOpacity=".22" strokeWidth="2"/>
        <path d={`M17 ${trainH*.68} H${trainWidth}`} stroke="#bb8358" strokeWidth={trainH*.044}/>
        <path d={`M13 ${trainH*.75} H${trainWidth} M12 ${trainH*.88} H${trainWidth}`} stroke="#101e32" strokeWidth="3"/>
        <path d={`M29 49 Q31 34 51 32 H90 V${windowY+windowH} H14Z`} fill="#1b2c40" stroke="#a3a7ac" strokeWidth="2"/>
        <path d={`M32 49 H81 V${windowY+windowH-7} H20Z`} fill="#9a8064" opacity=".4"/>
        {Array.from({length:trainWindows},(_,i)=>{
          const x=119+i*139;
          if (x+99>doorX-13 && x<doorX+doorW+16) return null;
          return <g key={i}><rect x={x-5} y={windowY-5} width="108" height={windowH+10} rx="10" fill="#26334b" stroke="#758295" strokeWidth="2"/><rect x={x} y={windowY} width="98" height={windowH} rx="6" fill={url('glass')}/><path d={`M${x+48} ${windowY} V${windowY+windowH} M${x+4} ${windowY+10} H${x+94}`} stroke="#4e4a45" strokeWidth="3"/><path d={`M${x+8} ${windowY+windowH-17} Q${x+22} ${windowY+windowH-42} ${x+37} ${windowY+windowH-17} V${windowY+windowH} H${x+8}Z`} fill="#5b4d43" opacity={i%3===1 ? '.65' : '.22'}/><path d={`M${x+70} ${windowY+8} l-27 ${windowH-16}`} stroke="#fff0c4" strokeOpacity=".15" strokeWidth="8"/></g>;
        })}
        <rect x={doorX-6} y={windowY-8} width={doorW+12} height={trainH-windowY-14} rx="5" fill="#18273a" stroke="#89909a" strokeWidth="2"/>
        <rect x={doorX+4} y={windowY} width={doorW-8} height={trainH-windowY-28} fill={url('glass')}/>
        <path d={`M${doorX+10} ${trainH-33} H${doorX+doorW-10} M${doorX+10} ${trainH-41} H${doorX+doorW-10}`} stroke="#6d5039" strokeWidth="3"/>
        {[0,1].map(i=><g key={i} transform={`translate(${(i ? 1 : -1)*door*doorW*.46} 0)`}><rect x={doorX+i*doorW*.5} y={windowY-3} width={doorW*.5} height={trainH-windowY-15} fill="#44536a" stroke="#81909d" strokeWidth="2"/><rect x={doorX+7+i*doorW*.5} y={windowY+10} width={doorW*.5-14} height={windowH*.74} rx="4" fill={url('glass')}/><path d={`M${doorX+doorW*.5+(i?5:-5)} ${trainH*.64} v18`} stroke="#c0b8a8" strokeWidth="3"/></g>)}
        <path d={`M${doorX-3} ${trainH-11} H${doorX+doorW+3}`} stroke="#c5ad87" strokeWidth="5"/>
        <ellipse cx="24" cy={trainH*.77} rx="8" ry="5" fill="#f4d0a0"/><path d={`M28 ${trainH-9} H${trainWidth}`} stroke="#09111f" strokeWidth="17"/>
      </g>
      {!isOverlay && <path d={`M0 ${floorY+stage*.05} L${W} ${floorY+stage*.025} V${stage} H0Z`} fill={url('floor')} data-layer="wet-platform"/>}
      <path d={`M0 ${floorY+stage*.05} L${W} ${floorY+stage*.025}`} stroke="#758193" strokeWidth="5"/>
      <path d={`M0 ${floorY+stage*.075} L${W} ${floorY+stage*.053}`} stroke="#bfaa78" strokeWidth="4" opacity=".55"/>
      {!isOverlay && <g stroke="#657084" strokeWidth="1" opacity=".16"><path d={`M0 ${stage*.83} L${W} ${stage*.74} M0 ${stage*.98} L${W} ${stage*.87}`}/>{[.06,.31,.57,.84].map((v,i)=><path key={i} d={`M${W*v} ${stage} L${W*(v+.1)} ${floorY+stage*.05}`}/>)}</g>}
      <g clipPath={url('floor-clip')} data-layer="broken-reflections">
        {Array.from({length: 16},(_,i)=>{const x=trainX+135+i*139;return <g key={i}>{Array.from({length: 6},(_,j)=>{const y=floorY+stage*(.062+j*.039+seeded(i*7+j,38)*.024);const spread=j*6;const drift=Math.sin(seconds*1.3+i+j)*3;const cut=seeded(i*7+j,7)*47;return <path key={j} d={`M${x-spread+cut+drift} ${y} l${65+spread*1.3-cut} -1 -6 ${1+j*.36} -${54+spread*1.3-cut} 1Z`} fill="#deb579" opacity={(.22-j*.024)*(isOverlay?.65:1)}/>;})}</g>;})}
        {Array.from({length:8},(_,j)=>{const y=floorY+stage*(.055+j*.032+seeded(j,39)*.015);const x=trainX+doorX;return <path key={`door-reflection-${j}`} d={`M${x-j*4+Math.sin(j+seconds)*3} ${y} h${doorW+j*8} l-8 ${2+j*.4} h${-doorW-j*8+19}Z`} fill="#f6d393" opacity={door*(.24-j*.023)}/>;})}
        {Array.from({length: 64},(_,i)=>{const y=floorY+stage*(.065+seeded(i,21)*.29);const x=seeded(i,22)*W;const length=12+seeded(i,23)*62;const shimmer=.2+.14*Math.sin(seconds*1.7+i);return <path key={i} d={`M${x} ${y} l${length} -1`} stroke={i%4?'#c9a877':'#9aa8bd'} strokeWidth={1+seeded(i,12)*2} opacity={shimmer*(isOverlay?.75:1)}/>;})}
      </g>
      {/* Awning, steel posts and lamps occupy real scene depth and cover distant rain. */}
      <g data-layer="station-canopy">
        <path d={`M-10 ${roofY-stage*.08} L${roofEnd-30} ${roofTipY-stage*.025} L${roofEnd+13} ${roofTipY+4} L0 ${roofY+stage*.045}Z`} fill="#111a2c"/>
        <path d={`M0 ${roofY+stage*.015} L${roofEnd} ${roofTipY} L${roofEnd} ${roofTipY+17} L0 ${roofY+stage*.047}Z`} fill="#344056"/>
        <path d={`M0 ${roofY+stage*.016} L${roofEnd+8} ${roofTipY-1}`} stroke="#8d9aac" strokeOpacity=".6" strokeWidth="2"/>
        {Array.from({length:7},(_,i)=>{const x=i*roofEnd/7; const y=roofY+(roofTipY-roofY)*i/7;return <path key={i} d={`M${x} ${y+13} l-36 ${stage*.025}`} stroke="#596478" strokeOpacity=".32" strokeWidth="5"/>;})}
        {[.12,.50].map((v,i)=>{const x=W*v;const y=roofY+(roofTipY-roofY)*x/roofEnd;return <g key={i}><path d={`M${x-7} ${y+13} H${x+7} L${x+10} ${groundY+stage*.035} H${x-11}Z`} fill="#182438"/><path d={`M${x+6} ${y+13} L${x+9} ${groundY+stage*.035}`} stroke="#53617a" strokeWidth="2"/><path d={`M${x} ${y+stage*.12} l${W*.055} ${-stage*.125} M${x} ${y+stage*.095} l${-W*.035} ${-stage*.075}`} stroke="#26354c" strokeWidth="7"/><path d={`M${x-17} ${groundY+stage*.035} h38`} stroke="#596477" strokeWidth="4"/></g>;})}
        {[.22,.47].map((v,i)=>{const x=W*v;const y=roofY+(roofTipY-roofY)*x/roofEnd+stage*.055;return <g key={i}><ellipse cx={x} cy={y} rx={W*.10} ry={stage*.17} fill={url('lamp')}/><path d={`M${x-16} ${y+8} L${x-W*.10} ${groundY} H${x+W*.10} L${x+16} ${y+8}Z`} fill={url('beam')} filter={url('soft-light')}/><path d={`M${x} ${y-stage*.057} V${y-10}`} stroke="#132037" strokeWidth="4"/><path d={`M${x-27} ${y} Q${x} ${y-28} ${x+27} ${y}Z`} fill="#253149"/><ellipse cx={x} cy={y+1} rx="25" ry="5" fill="#efd39c"/><path d={`M${x-16} ${y+2} H${x+16}`} stroke="#fff3d0" strokeWidth="3"/></g>;})}
        <g transform={`translate(${W*.10} ${roofY+stage*.12})`}><path d="M0 -30 V0 M83 -41 V0" stroke="#263449" strokeWidth="2"/><rect width="106" height="53" rx="2" fill="#25344b" stroke="#68788d" strokeWidth="1"/><text x="12" y="37" fill="#c9cbd0" fontFamily={serif} fontSize="32">07</text><path d="M64 15 h24 m-8 -6 8 6 -8 6" stroke="#d1c8b5" strokeWidth="2" fill="none"/></g>
      </g>
      <g clipPath={url('rain-outside')} strokeLinecap="round" data-layer="mid-rain">
        {Array.from({length: 100},(_,i)=>{const x=seeded(i,32)*W;const y=(seeded(i,31)*stage+seconds*(290+seeded(i,19)*100))%stage;return <path key={i} d={`M${x} ${y} l-8 ${17+seeded(i,33)*14}`} stroke="#bac8dc" strokeWidth={.7+seeded(i,35)*.7} opacity={.16+seeded(i,36)*.16}/>;})}
        {Array.from({length:22},(_,i)=>{const pulse=(seconds*.72+seeded(i,48))%1;const x=roofEnd+seeded(i,47)*(W-roofEnd);const y=floorY+stage*(.1+seeded(i,49)*.23);return <ellipse key={`ripple-${i}`} cx={x} cy={y} rx={5+pulse*23} ry={1+pulse*3.5} fill="none" stroke="#9ca9c0" strokeWidth="1" opacity={(1-pulse)*.25}/>;})}
      </g>
      <g data-role="decorative-reflection" transform={`translate(${personX} ${groundY}) scale(${personScale})`}><path d="M-26 17 l-5 70 26 0 6 -68 M15 19 l9 61 18 -3 -10 -57" fill="#b77c50" opacity={isOverlay ? '.12' : '.17'}/></g>
      <g data-layer="traveler" data-role="primary-subject" data-object-id="rain-platform-traveler" transform={`translate(${personX} ${groundY}) scale(${personScale})`}>
        <ellipse cx="8" cy="6" rx="62" ry="9" fill="#060c19" opacity=".60"/>
        <g transform={`translate(0 ${-bob})`}>
          <path d={`M-15 -76 Q${-16-stride*7} -39 ${-19-stride*13} ${-6-Math.max(0,stride)*9}`} stroke="#111a2a" strokeWidth="20" fill="none"/>
          <path d={`M13 -77 Q${16+stride*8} -41 ${19+stride*15} ${-6-Math.max(0,-stride)*9}`} stroke="#182232" strokeWidth="20" fill="none"/>
          <path d={`M${-28-stride*13} ${-10-Math.max(0,stride)*9} l-3 12 h31 q5 -6 -8 -12Z M${10+stride*15} ${-10-Math.max(0,-stride)*9} l-1 12 h34 q5 -6 -9 -12Z`} fill="#0b1321"/>
          <path d="M-18 -171 Q-32 -166 -32 -142 L-37 -70 Q-5 -55 35 -72 L25 -142 Q25 -164 10 -173Z" fill={url('coat')} stroke="#533b34" strokeWidth="1.5"/>
          <path d="M-4 -168 L-5 -69 M-24 -133 l-3 28 M16 -119 l7 12" fill="none" stroke="#ddac73" strokeOpacity=".35" strokeWidth="2"/>
          <path d="M-19 -161 Q-40 -146 -34 -117 L-26 -105" fill="none" stroke="#684332" strokeWidth="13" strokeLinecap="round"/>
          <path d="M-29 -109 L-28 -96" stroke="#b7896b" strokeWidth="8" strokeLinecap="round"/>
          <path d="M-27 -105 Q-42 -104 -43 -87 L-48 -67 Q-25 -57 -12 -71 L-15 -93 Q-15 -104 -27 -105Z" fill="#2c2630" stroke="#7f6351" strokeWidth="2"/>
          <path d="M-2 -185 V-167" stroke="#c29a77" strokeWidth="14"/>
          <path d="M-19 -201 Q-18 -224 2 -221 Q21 -219 20 -200 L24 -188 L16 -184 Q15 -171 0 -176 Q-18 -180 -19 -201Z" fill="#c09a7d"/>
          <path d="M-19 -194 Q-27 -221 -4 -228 Q24 -231 24 -207 L15 -203 L10 -214 Q-1 -204 -14 -206 L-12 -188Z" fill="#121b2d"/>
          <path d="M-17 -175 Q-1 -166 17 -174 L20 -161 L-14 -163Z" fill="#b99d71"/><path d="M10 -166 l11 38 10 -9 -12 -33Z" fill="#b99d71"/>
          <g transform={`rotate(${umbrellaAngle} 24 -148)`} data-part="umbrella" data-object-id="rain-platform-umbrella">
            <path d="M24 -330 V-146 Q24 -130 13 -137" stroke="#b1adb0" strokeWidth="3.4" strokeLinecap="round" fill="none"/>
            <path d={umbrellaPath} fill={url('umbrella')} stroke="#8093aa" strokeWidth="1.4"/>
            <path d="M24 -318 Q-24 -298 -54 -245 M24 -318 Q9 -283 -2 -245 M24 -318 Q41 -284 50 -245 M24 -318 Q75 -298 101 -245" fill="none" stroke="#8193a9" strokeOpacity=".38" strokeWidth="1.2"/>
            <path d="M-98 -260 Q-48 -310 24 -319 Q83 -313 127 -278" fill="none" stroke="#a9b7c9" strokeOpacity=".65" strokeWidth="2"/>
            <path d="M-53 -245 l-1 7 M101 -245 l1 7 M154 -246 l1 6" stroke="#a8bbce" strokeWidth="1" opacity=".7"/>
          </g>
          <path d="M18 -163 Q41 -153 38 -139 L25 -147" fill="none" stroke="#a06a45" strokeWidth="13" strokeLinecap="round"/>
          <path d="M28 -148 L22 -151" stroke="#d3ad85" strokeWidth="8" strokeLinecap="round"/>
        </g>
      </g>
      <g clipPath={url('rain-outside')} mask={url('umbrella-shadow')} stroke="#d9e1eb" strokeLinecap="round" opacity=".28" data-layer="foreground-rain">
        {Array.from({length:35},(_,i)=>{const x=seeded(i,62)*W;const y=(seeded(i,63)*stage+seconds*(420+seeded(i,64)*110))%stage;return <path key={i} d={`M${x} ${y} l-11 ${26+seeded(i,65)*18}`} strokeWidth={1+seeded(i,66)*.8}/>;})}
      </g>
      <g stroke="#d3d9e4" strokeWidth="1.2" opacity=".40" data-layer="eave-drips">{Array.from({length:8},(_,i)=>{const y=roofTipY+22+(seconds*260+i*97)%Math.max(1,groundY-roofTipY-26);return <path key={i} d={`M${roofEnd+3+i%2*3} ${y} v${5+seeded(i,17)*8}`}/>;})}</g>
      {/* Typeset story beats stay in the sky; no caption panel or progress HUD. */}
      {[{fit:titleFit,alpha:titleAlpha,eyebrow:'NIGHT SERVICE  /  雨夜站台'},{fit:conclusionFit,alpha:conclusionAlpha,eyebrow:'A MOMENT BEFORE DEPARTURE'}].map((beat,i)=><g key={i} opacity={beat.alpha} transform={`translate(${titleX} ${titleY})`} data-layer={i ? 'conclusion' : 'title'}>
        {isOverlay && <rect x="-17" y="-53" width={Math.min(W-titleX*2,Math.max(340,...beat.fit.lines.map(line=>charUnits(line)*beat.fit.size))+40)} height={beat.fit.lines.length*beat.fit.size*1.25+40} rx="3" fill="#101a2d" fillOpacity=".74"/>}
        <text x="2" y="-27" fill="#c8bca6" fontSize={portrait?14:15} letterSpacing="3.3" fontFamily={sans}>{beat.eyebrow}</text>
        <text fill="#e9e4d7" fontFamily={serif} fontSize={beat.fit.size} fontWeight="500" letterSpacing="0">{beat.fit.lines.map((line,j)=><tspan key={j} x="0" dy={j ? beat.fit.size*1.25 : beat.fit.size*.45}>{line}</tspan>)}</text>
      </g>)}
    </g>
  </svg>;
}
