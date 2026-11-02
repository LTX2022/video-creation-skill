import assert from 'node:assert/strict';
import test from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {RainPlatform} from './RainPlatform';
import type {ReferenceStyleProps} from './common';

const defaults: ReferenceStyleProps = {frame:0,fps:30,durationInFrames:360,width:1920,height:1080,
  content:{eyebrow:'',title:'雨停之前，等你抵达',labels:[],conclusion:'这一站，灯为你而亮'}};
const render=(props: Partial<ReferenceStyleProps>={})=>renderToStaticMarkup(createElement(RainPlatform,{...defaults,...props}));

test('rain film is deterministic, finite, complete, resource-resolved, and below 1200 nodes in 40 modes',()=>{
  for(const [width,height] of [[1920,1080],[1080,1920]])
  for(const subtitleVisible of [false,true])for(const isOverlay of [false,true])for(const frame of [0,84,168,252,359]){
    const props={width,height,subtitleVisible,isOverlay,frame}; const svg=render(props);
    assert.equal(svg,render(props));
    assert.ok(svg.startsWith('<svg'));
    assert.doesNotMatch(svg,/NaN|Infinity|<animate|<foreignObject|<image/);
    assert.ok((svg.match(/<[a-z]+/g)||[]).length<1200);
    assert.equal(svg.includes('data-role="stage"'),!isOverlay);
    assert.match(svg,/data-preset-id="rain-platform-film"/);
    assert.match(svg,/data-role="primary-subject" data-object-id="rain-platform-traveler"/);
    const ids=new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));
    for(const m of svg.matchAll(/url\(#([^)]+)\)/g))assert.ok(ids.has(m[1]),`Unresolved SVG resource ${m[1]}`);
  }
});

test('train, traveler and umbrella move; ambient weather continues through the settle',()=>{
  const a=render({frame:0}),b=render({frame:168}),c=render({frame:325}),d=render({frame:359});
  for(const pair of [[a,b],[b,c],[c,d]])assert.notEqual(...pair as [string,string]);
  const train=(s:string)=>s.match(/<g transform="([^"]+)" data-layer="arriving-train"/)![1];
  const person=(s:string)=>s.match(/data-object-id="rain-platform-traveler" transform="([^"]+)"/)![1];
  const umbrella=(s:string)=>s.match(/<g transform="([^"]+)" data-part="umbrella"/)![1];
  assert.notEqual(train(a),train(b)); assert.equal(train(c),train(d));
  assert.notEqual(person(a),person(b)); assert.equal(person(c),person(d));
  assert.notEqual(umbrella(a),umbrella(c));
  assert.match(a,/data-phase="arrival"/);assert.match(render({frame:230}),/data-phase="invitation"/);assert.match(d,/data-phase="settle"/);
});

test('portrait reframes independently and preserves both actual caption band and bottom 27 percent',()=>{
  const wide=render({frame:240}),portrait=render({frame:240,width:1080,height:1920,subtitleVisible:true});
  assert.match(wide,/viewBox="0 0 1600 900"/);
  assert.match(portrait,/viewBox="0 0 900 1600"/);
  assert.match(portrait,/data-safe-bottom="1113\.6"/);
  assert.match(portrait,/<clipPath id="[^"]+-stage"><rect width="900" height="927\.9999999999999"/);
});

test('long title at frame 90 and long conclusion at frame 330 are bounded while actually visible',()=>{
  const title='雨停之前的最后一班列车，带着远方的灯火，缓缓驶入这座安静的站台';
  const conclusion='这一站的灯为每一位雨夜归人而亮，在长长的等待里，看见时间安静地经过';
  for(const [frame,layer,copy] of [[90,'title',title],[330,'conclusion',conclusion]] as const){
    const svg=render({width:1080,height:1920,subtitleVisible:true,frame,content:{...defaults.content,title,conclusion}});
    const group=svg.match(new RegExp(`<g opacity="([^"]+)" transform="[^"]+" data-layer="${layer}">([\\s\\S]*?)<\\/g>`));
    assert.ok(group); assert.ok(Number(group[1])>.98,`${layer} must be visible at stress-test frame`);
    assert.equal((group[2].match(/<tspan /g)||[]).length,2);
    assert.doesNotMatch(group[2],/…/);
    const visible=[...group[2].matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map(m=>m[1]).join('');
    assert.equal(visible,copy);
  }
});

test('unfittable copy fails explicitly instead of silently truncating',()=>{
  assert.throws(()=>render({width:1080,height:1920,content:{...defaults.content,title:'长标题'.repeat(60)}}),/exceeds 2 lines at readable size/);
});
