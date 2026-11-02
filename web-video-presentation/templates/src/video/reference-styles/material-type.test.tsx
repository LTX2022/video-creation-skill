import assert from 'node:assert/strict';
import test from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SpectralMaterial} from './SpectralMaterial';
import {KineticWireframe} from './KineticWireframe';
import type {ReferenceStyleProps} from './common';

const defaults:ReferenceStyleProps={frame:0,fps:30,durationInFrames:360,width:1920,height:1080,
  content:{eyebrow:'REFERENCE STUDY',title:'让形式拥有触感',labels:[],conclusion:'同一轮廓，不同材质的表达。'}};
const films=[SpectralMaterial,KineticWireframe];
const render=(Film:typeof SpectralMaterial,props:Partial<ReferenceStyleProps>={})=>renderToStaticMarkup(createElement(Film,{...defaults,...props}));

test('material and type films are deterministic, bounded complete SVGs across 80 render modes',()=>{
 for(const Film of films)for(const [width,height] of [[1920,1080],[1080,1920]])
 for(const subtitleVisible of [false,true])for(const isOverlay of [false,true])for(const frame of [0,84,168,252,359]){
  const props={width,height,subtitleVisible,isOverlay,frame},svg=render(Film,props);
  assert.equal(svg,render(Film,props));assert.ok(svg.startsWith('<svg'));
  assert.doesNotMatch(svg,/NaN|Infinity|<filter|<animate|<foreignObject/);
  assert.ok((svg.match(/<[a-z]+/g)||[]).length<200);
  assert.match(svg,/data-role="primary-subject"/);
  assert.equal(svg.includes('data-role="stage"'),!isOverlay);
  assert.ok(svg.includes(`data-safe-bottom="${height*(subtitleVisible?(height>width?.58:.73):.95)}"`));
  const ids=new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));
  for(const m of svg.matchAll(/url\(#([^)]+)\)/g))assert.ok(ids.has(m[1]),`Unresolved SVG resource ${m[1]}`);
 }
});

test('both films hold source and result exactly, while the middle actually changes',()=>{
 for(const Film of films){
  assert.equal(render(Film,{frame:0}),render(Film,{frame:35}));
  assert.equal(render(Film,{frame:325}),render(Film,{frame:359}));
  assert.notEqual(render(Film,{frame:0}),render(Film,{frame:168}));
  assert.notEqual(render(Film,{frame:168}),render(Film,{frame:359}));
 }
});

test('material keeps exact contour and palette identity through both material passes',()=>{
 const source=render(SpectralMaterial);
 const contour=source.match(/data-role="material-contour" d="([^"]+)"/)![1];
 for(const frame of [0,84,168,252,359]){
  const svg=render(SpectralMaterial,{frame});
  for(const match of svg.matchAll(/data-role="material-contour" d="([^"]+)"/g))assert.equal(match[1],contour);
  assert.match(svg,/data-object-id="spectral-folded-ribbon"/);
  assert.match(svg,/data-palette-id="spectral-vermilion"/);
 }
});

test('wireframe retains vertex correspondence while growing actual depth',()=>{
 for(const frame of [0,84,168,252,359])assert.match(render(KineticWireframe,{frame}),/data-object-id="kinetic-a-volume" data-contour-points="11"/);
 assert.match(render(KineticWireframe),/data-extrusion-depth="0"/);
 assert.match(render(KineticWireframe,{frame:359}),/data-extrusion-depth="175"/);
 assert.match(render(KineticWireframe,{frame:359}),/data-role="front-surface-lattice"/);
});

test('uneven authored chapter timings preserve source and result holds',()=>{
 const timing={semanticAnchors:[.15,.86] as const,chapterStepTimings:[
  {stepIndex:0,startFrame:0,durationInFrames:120},
  {stepIndex:1,startFrame:120,durationInFrames:180},
  {stepIndex:2,startFrame:300,durationInFrames:60},
 ]};
 for(const Film of films){
  assert.equal(render(Film,{...timing,frame:0}),render(Film,{...timing,frame:119}));
  assert.equal(render(Film,{...timing,frame:300}),render(Film,{...timing,frame:359}));
  assert.notEqual(render(Film,{...timing,frame:180}),render(Film,{...timing,frame:240}));
 }
});

test('portrait long conclusions retain all text on two lines at 24 px per 720 width or larger',()=>{
 const conclusion='让每一次变化都有清楚的来处，也让最后的结果能够被完整看见';
 for(const Film of films)for(const width of [720,1080])for(const subtitleVisible of [false,true])for(const isOverlay of [false,true]){
  const height=width*16/9,svg=render(Film,{width,height,subtitleVisible,isOverlay,frame:359,content:{...defaults.content,conclusion}});
  const textNodes=[...svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)];
  const caption=textNodes.find(m=>m[2].replace(/<[^>]+>/g,'')===conclusion);
  assert.ok(caption,'Complete conclusion must remain in one SVG text block');
  const size=Number(caption[1].match(/font-size="([^"]+)"/)?.[1]);
  assert.ok(size>=width/30,`Portrait conclusion ${size}px is below 24 px per 720 width`);
  assert.equal((caption[2].match(/<tspan\b/g)||[]).length,2,'Long conclusion should wrap rather than shrink');
  const rootSafe=height*(subtitleVisible?.58:.95);
  const relativeY=Number(caption[1].match(/\by="([^"]+)"/)?.[1]??0);
  const groupY=Film===KineticWireframe?Number(svg.match(/<g transform="translate\([^ ]+ ([^)]+)\)"><rect y="/)?.[1]??0):0;
  const baseline=relativeY+groupY;
  const lastLine=baseline+size*(Film===KineticWireframe?1.3:1.25);
  assert.ok(lastLine+size*.25<rootSafe,'Full two-line caption must stay above actual content-safe bottom');
 }
});
