import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {PresetScene} from './src/video/presets/PresetScene';
(globalThis as any).React = React;
const [id, num, name, seconds, framesArg] = process.argv.slice(2);
const duration=Number(seconds)*30, frames=framesArg?Number(framesArg):duration;
const css=readFileSync(`${process.env.VIDEO_SKILL_ROOT ?? "../video-release-candidate/web-video-presentation"}/themes/${id}/tokens.css`,'utf8');
const vars=Object.fromEntries([...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
for(const k of Object.keys(vars)) if(k.startsWith('--font-') && !k.includes('weight') && !k.includes('features')) vars[k]='Noto Sans CJK SC';
function resolveVars(s:string){for(let i=0;i<12 && s.includes('var(');i++)s=s.replace(/var\((--[\w-]+)(?:,\s*([^()]+))?\)/g,(_,k,f)=>vars[k]??f??'');if(s.includes('var('))throw Error('Unresolved CSS variable');return s;}
function esc(s:string){return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');}
for(let frame=0;frame<frames;frame++){
 let svg=renderToStaticMarkup(React.createElement(PresetScene,{presetId:id,frame,durationInFrames:duration,fps:30,width:960,height:540}));
 svg=resolveVars(svg).replace(/font-family:[^;"}]+/g,'font-family:Noto Sans CJK SC').replace(/font-family="[^"]*"/g,'font-family="Noto Sans CJK SC"');
 if(/<(?:image|foreignObject|script)\b|(?:href|src)\s*=|@import/.test(svg))throw Error('Unexpected external or embedded asset');
 const inside=svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
 const out=`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="576" viewBox="0 0 960 576"><rect width="960" height="576" fill="#0b1119"/><text x="16" y="24" font-family="Noto Sans CJK SC" font-size="16" fill="#ffffff">${esc(num.padStart(2,'0'))} / 60  ${esc(name)}</text><text x="944" y="24" text-anchor="end" font-family="Noto Sans CJK SC" font-size="11" fill="#cccccc">离线预览 · 固定Noto字体</text><g transform="translate(0 36)">${inside}</g></svg>`;
 process.stdout.write(JSON.stringify({frame,svg:out})+'\n');
}
