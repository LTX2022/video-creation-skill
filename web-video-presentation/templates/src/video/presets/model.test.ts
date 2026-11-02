import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PRESET_FAMILIES } from './types';
import { PRESET_REGISTRY, getPreset } from './registry';
import { presetLayout, within, overlaps } from './layout';
import { presetMotion } from './motion';
import { fittedLines, wrapText } from './primitives';
import { PresetScene } from './PresetScene';
import { presetNarrations, presetShotPlan } from './narration';
import {REFERENCE_STYLE_IDS, REFERENCE_SEMANTIC_ANCHORS, ReferenceScene} from '../reference-styles/ReferenceScene';
import {progress as referenceProgress} from '../reference-styles/common';

const ids=Object.keys(PRESET_REGISTRY);
const legacyIds=JSON.parse(readFileSync(new URL('./legacy-baseline.json',import.meta.url),'utf8')).ids as string[];
const legacySpecs=legacyIds.map(getPreset);
const formats=[[1920,1080],[1080,1920]] as const;
const longTitle='在复杂的信息变化中保留清晰的对象关系与阅读顺序并展示可以理解的结果';

test('56 original IDs keep twelve families; four complete reference-film scenes extend the catalog without fallback',()=>{
  assert.equal(legacyIds.length,56);assert.equal(ids.length,60);
  assert.deepEqual(ids.filter(id=>!legacyIds.includes(id)).sort(),[...REFERENCE_STYLE_IDS].sort());
  assert.equal(new Set(legacySpecs.map(spec=>spec.family)).size,12);
  assert.deepEqual([...new Set(Object.values(PRESET_REGISTRY).map(s=>s.family))].sort(),[...PRESET_FAMILIES].sort());
  for(const id of ['ink-landscape-film','not-a-theme','../paper-press','__proto__','constructor']) assert.throws(()=>getPreset(id),/Unknown theme preset/);
  for(const spec of Object.values(PRESET_REGISTRY)) {
    assert.equal(spec.id,getPreset(spec.id).id);
    assert.ok(spec.motion.setupEnd>0&&spec.motion.setupEnd<spec.motion.transformEnd&&spec.motion.transformEnd<1);
    assert.match(spec.content.eyebrow,/概念示例/);
  }
});

test('layout-safe regions cover both formats and long Chinese reflows rather than shrinking without bound',()=>{
  for(const spec of legacySpecs) for(const [width,height] of formats) for(const subtitles of [false,true]) {
    for(const title of [spec.content.title,longTitle]) {
      const layout=presetLayout(spec,width,height,subtitles,title);
      assert.ok(within(layout.subject,layout.content),`${spec.id}: subject outside content`);
      assert.ok(within(layout.heading,layout.content),`${spec.id}: heading outside content`);
      assert.ok(within(layout.footer,layout.content),`${spec.id}: footer outside content`);
      assert.ok(!overlaps(layout.subject,layout.heading),`${spec.id}: subject/heading overlap`);
      if(layout.subtitleBand) for(const box of [layout.heading,layout.subject,layout.footer]) assert.ok(!overlaps(box,layout.subtitleBand),`${spec.id}: subtitle overlap`);
      if(layout.platformBand) for(const box of [layout.heading,layout.subject,layout.footer]) assert.ok(!overlaps(box,layout.platformBand),`${spec.id}: platform overlap`);
      const fit=fittedLines(title,layout.heading.width,layout.titleSize,layout.headingMode==='side'?3:2);
      assert.ok(fit.size>=layout.titleSize*.72);
    }
  }
});

test('motion is deterministic, bounded, fps-explicit and keeps final results',()=>{
  for(const spec of legacySpecs) for(const fps of [24,30,60,120]) {
    const duration=fps*9;
    for(const frame of [duration-1,0,Math.floor(duration*.43),-3,duration+20,Math.floor(duration*.43)]) {
      const a=presetMotion(spec,frame,duration,fps),b=presetMotion(spec,frame,duration,fps);
      assert.deepEqual(a,b);
      for(const key of ['setup','transform','hold','progress'] as const) assert.ok(Number.isFinite(a[key])&&a[key]>=0&&a[key]<=1);
    }
    assert.equal(presetMotion(spec,duration-1,duration,fps).phase,'hold');
    assert.equal(presetMotion(spec,duration-1,duration,fps).transform,1);
  }
  assert.throws(()=>presetMotion(getPreset('paper-press'),NaN,100,30));
  assert.throws(()=>presetMotion(getPreset('paper-press'),0,0,30));
});

test('production events bind to actual unequal chapter step timing',()=>{
  const spec=getPreset('dark-tech-glow');
  const steps=[{stepIndex:0,startFrame:0,durationInFrames:47},{stepIndex:1,startFrame:47,durationInFrames:151},{stepIndex:2,startFrame:198,durationInFrames:91}];
  const a=presetMotion(spec,100,289,30,steps);
  assert.equal(a.events.transformStart,47+151*.04);
  assert.equal(a.events.transformEnd,198+91*(spec.motion.transformEnd-.58));
  assert.equal(presetMotion(spec,288,289,30,steps).phase,'hold');
});

test('actual React component SSR preserves all historical themes, formats, caption reservations and alpha without a browser',()=>{
  for(const id of legacyIds) for(const [width,height] of formats) for(const isOverlay of [false,true]) {
    for(const frame of [0,126,269]) {
      const props={presetId:id,frame,durationInFrames:270,fps:30,width,height,isOverlay,subtitleVisible:true};
      const markup=renderToStaticMarkup(createElement(PresetScene,props));
      assert.equal(markup,renderToStaticMarkup(createElement(PresetScene,props)),`${id}: repeated frame differs`);
      assert.match(markup,/data-role="primary-subject"/);
      assert.match(markup,/data-object-id=/);
      assert.match(markup,/data-render-status="render-review-pending"/);
      assert.ok(!/(?:NaN|Infinity|undefined)/.test(markup),`${id}: invalid SVG number`);
      assert.equal(markup.includes('data-role="stage"'),!isOverlay);
      assert.equal(markup.includes('data-scene-decoration="background"'),!isOverlay);
    }
    const stress=renderToStaticMarkup(createElement(PresetScene,{presetId:id,frame:200,durationInFrames:270,fps:30,width,height,isOverlay,subtitleVisible:true,content:{title:longTitle}}));
    assert.match(stress,/primary-title/);
  }
});

test('specialized object grammars exist rather than treating every preset as cards',()=>{
  const roles:Record<string,string>={
    'luxury-watch-black':'precision-dial','dark-botanical':'sculptural-gallery','history-museum':'artifact-profile',
    'robotics-showroom':'articulated-subject','porsche-precision':'precision-exploded-subject',
    'paper-press':'editorial-evidence','chalk-garden':'progressive-chalk-construction',
  };
  for(const [presetId,role] of Object.entries(roles)) {
    const text=renderToStaticMarkup(createElement(PresetScene,{presetId,frame:150,durationInFrames:270,fps:30,width:1920,height:1080}));
    assert.ok(text.includes(`data-role="${role}"`),`${presetId} lacks ${role}`);
  }
});

test('line punctuation is a hard constraint, including the actual science title',()=>{
  const title='看清发生了什么，再解释为什么';
  for(const capacity of [5,7,8,9,11,16]) for(const line of wrapText(title,capacity)) {
    assert.doesNotMatch(line,/^[，。！？；：、）》」』】]/u);
    assert.doesNotMatch(line,/[（《「『【]$/u);
  }
  const spec=getPreset('science-diagram'),l=presetLayout(spec,1280,720,false,title);
  const fitted=fittedLines(title,l.heading.width,l.titleSize,l.headingMode==='side'?3:2);
  assert.equal(fitted.lines.join(''),title);
  assert.ok(fitted.lines.every(line=>!line.startsWith('，')));
  assert.throws(()=>wrapText('（文）',1),RangeError);
});

test('historical alpha keeps localized readability backings, not an opaque stage or erased object surfaces',()=>{
  for(const id of legacyIds) {
    const props={presetId:id,frame:269,durationInFrames:270,fps:30,width:1280,height:720};
    const alpha=renderToStaticMarkup(createElement(PresetScene,{...props,isOverlay:true}));
    const opaque=renderToStaticMarkup(createElement(PresetScene,props));
    assert.ok(!alpha.includes('data-scene-background'));
    assert.ok(alpha.includes(id==='cinema-title-card'?'data-role="title-backing"':'data-role="subject-readability-backing"'));
    assert.ok(!opaque.includes('data-role="subject-readability-backing"'));
    const alphaIds=[...alpha.matchAll(/data-object-id="([^"]+)"/g)].map(m=>m[1]);
    const opaqueIds=[...opaque.matchAll(/data-object-id="([^"]+)"/g)].map(m=>m[1]);
    assert.deepEqual(alphaIds,opaqueIds,`${id}: alpha mode changed semantic subject objects`);
    if(id==='procedural-vfx') assert.match(alpha,/data-protection="label-strip"/);
  }
});

test('explicit subtitles reserve real subject space even for an alpha scene',()=>{
  const props={presetId:'paper-press',frame:269,durationInFrames:270,fps:30,width:1080,height:1920,isOverlay:true};
  const withCaptions=renderToStaticMarkup(createElement(PresetScene,{...props,subtitleVisible:true}));
  const withoutCaptions=renderToStaticMarkup(createElement(PresetScene,{...props,subtitleVisible:false}));
  const bounds=(markup:string)=>markup.match(/data-role="primary-subject" data-bounds="([^"]+)"/)![1]!.split(',').map(Number);
  const a=bounds(withCaptions),b=bounds(withoutCaptions);
  assert.ok(a[1]!+a[3]!<=1920*.58,'explicit alpha caption request must reserve the same caption band');
  assert.ok(a[3]!<b[3]!,'hidden subtitles release the subject reservation');
  for(const markup of [withCaptions,withoutCaptions]) assert.ok(!markup.includes('data-scene-background'));
});

test('actual displayed chart numbers and total share one current rounded state at action frames',()=>{
  for(const presetId of ['swiss-ikb','creator-dashboard','fintech-terminal','electric-studio','data-ops-slate']) {
    for(const frame of [0,72,84,126,200,269]) for(const [width,height] of formats) {
      const markup=renderToStaticMarkup(createElement(PresetScene,{presetId,frame,durationInFrames:270,fps:30,width,height}));
      if(presetId==='data-ops-slate') {assert.ok(!markup.includes('data-role="hero-value"'));continue;}
      const values=[...markup.matchAll(/data-current-value="([^"]+)"/g)].map(m=>Number(m[1]));
      const textValues=[...markup.matchAll(/<text\b[^>]*data-role="metric-current-value"[^>]*>([\s\S]*?)<\/text>/g)].map(m=>Number(m[1]!.replace(/<[^>]*>/g,'')));
      assert.equal(values.length,getPreset(presetId).content.labels.length);
      assert.deepEqual(textValues,values,`${presetId}/${frame}: actual printed metrics differ from one current state`);
      if(presetId==='electric-studio') continue;
      const printedTotal=markup.match(/<text\b[^>]*data-role="hero-value"[^>]*>([\s\S]*?)<\/text>/)![1]!.replace(/<[^>]*>/g,'');
      assert.equal(Number(printedTotal),Number(values.reduce((a,b)=>a+b,0).toFixed(1)),`${presetId}/${frame}: printed total differs from displayed metrics`);
    }
  }
});


test('every selected preset has three matching scene-bound narrations and shot metadata, not an unrelated legacy flow',()=>{
  for(const id of ids) {
    const n=presetNarrations(id),plan=presetShotPlan(id);assert.equal(n.length,3);assert.equal(plan.length,3);
    plan.forEach((shot,i)=>{assert.equal(shot.presetId,id);assert.equal(shot.presetFamily,getPreset(id).family);assert.equal(shot.motionIntent,n[i]);assert.ok(shot.source.includes(id));assert.equal(shot.screenTextIntent,'labels');assert.ok(shot.onScreenText.includes(getPreset(id).content.title));});
    assert.ok(!n.join('').includes('第二步，不要先套模板'));
  }
});


test('all four reference films render complete deterministic SVGs across formats, captions and alpha',()=>{
  for(const presetId of REFERENCE_STYLE_IDS) for(const [width,height] of formats) for(const subtitleVisible of [false,true]) for(const isOverlay of [false,true]) {
    const props={presetId,width,height,subtitleVisible,isOverlay,fps:30,durationInFrames:360};
    const semanticIds=(svg:string)=>[...svg.matchAll(/data-object-id="([^"]+)"/g)].map(m=>m[1]);
    for(const frame of [359,0,137,137]) {
      const a=renderToStaticMarkup(createElement(PresetScene,{...props,frame}));
      assert.equal(a,renderToStaticMarkup(createElement(PresetScene,{...props,frame})),`${presetId}: non-deterministic seek`);
      assert.equal((a.match(/<svg\b/g)||[]).length,1,'reference film must not nest in a legacy SVG subject box');
      assert.ok(a.includes(`data-preset-id="${presetId}"`));
      assert.match(a,/data-preset-family="reference"/);assert.match(a,/data-render-status="render-review-pending"/);
      assert.match(a,/data-role="primary-subject"/);assert.ok(semanticIds(a).length>0);
      assert.doesNotMatch(a,/(?:NaN|Infinity|undefined)/);
      assert.equal(a.includes('data-scene-background'),!isOverlay,`${presetId}: alpha background contract`);
      if(subtitleVisible) {
        const safeBottom=Number(a.match(/data-safe-bottom="([^"]+)"/)?.[1]);
        assert.ok(Number.isFinite(safeBottom)&&safeBottom>0&&safeBottom<=height*(height>width?.58:.78)+.001,`${presetId}: declared content region enters the actual subtitle reservation`);
      }
      assert.ok(!a.includes('data-role="headline"'),'no inherited legacy heading/card scaffold');
    }
    const alpha=renderToStaticMarkup(createElement(PresetScene,{...props,frame:359,isOverlay:true}));
    const opaque=renderToStaticMarkup(createElement(PresetScene,{...props,frame:359,isOverlay:false}));
    assert.deepEqual(semanticIds(alpha),semanticIds(opaque),'alpha retains semantic subject identities');
    const changed=renderToStaticMarkup(createElement(PresetScene,{...props,frame:359,content:{title:'自定义片名',conclusion:'自定义结语'}}));
    assert.ok(changed.replace(/<[^>]+>/g,'').includes('自定义片名'));assert.ok(changed.replace(/<[^>]+>/g,'').includes('自定义结语'));
  }
});

test('reference-film routes preserve actual clocks while progress binds unequal real narration steps',()=>{
  const steps=[{stepIndex:0,startFrame:0,durationInFrames:47},{stepIndex:1,startFrame:47,durationInFrames:151},{stepIndex:2,startFrame:198,durationInFrames:91}];
  for(const presetId of REFERENCE_STYLE_IDS) {
    const props={presetId,frame:47,fps:30,durationInFrames:289,width:1920,height:1080,chapterStepTimings:steps,content:getPreset(presetId).content};
    const element=ReferenceScene(props), [a,b]=REFERENCE_SEMANTIC_ANCHORS[presetId];
    assert.equal(getPreset(presetId).motion.setupEnd,a);assert.equal(getPreset(presetId).motion.transformEnd,b);
    assert.equal(element.props.frame,47);assert.equal(element.props.fps,30);assert.equal(element.props.durationInFrames,289);
    assert.equal(element.props.chapterStepTimings,steps);assert.deepEqual(element.props.semanticAnchors,[a,b]);
    assert.equal(referenceProgress(element.props),a);assert.equal(referenceProgress({...element.props,frame:198}),b);
    assert.throws(()=>referenceProgress({...element.props,semanticAnchors:undefined}),/semanticAnchors|anchors|ReferenceScene/i);
    assert.equal(referenceProgress({...element.props,frame:0}),0);assert.equal(referenceProgress({...element.props,frame:288}),1);
    const source=JSON.stringify(props);
    const progress=Array.from({length:289},(_,frame)=>referenceProgress({...element.props,frame}));
    assert.ok(progress.every((v,i)=>Number.isFinite(v)&&v>=0&&v<=1&&(i===0||v>=progress[i-1]!)));
    assert.equal(JSON.stringify(props),source,'progress never rewrites the input clock');
    for(const bad of [[...steps].slice(0,2),[{...steps[0]!,startFrame:1},...steps.slice(1)],[...steps.slice(0,2),{...steps[2]!,durationInFrames:90}]]) assert.throws(()=>referenceProgress({...element.props,chapterStepTimings:bad}),RangeError);
  }
  const base={presetId:'rain-platform-film',frame:47,fps:30,durationInFrames:289,width:1920,height:1080,content:getPreset('rain-platform-film').content,chapterStepTimings:steps};
  const later={...base,frame:94,chapterStepTimings:[{stepIndex:0,startFrame:0,durationInFrames:94},{stepIndex:1,startFrame:94,durationInFrames:104},steps[2]!]};
  assert.equal(referenceProgress(ReferenceScene(base).props),referenceProgress(ReferenceScene(later).props));
  assert.notEqual(renderToStaticMarkup(createElement(PresetScene,base)),renderToStaticMarkup(createElement(PresetScene,later)),'rain/drips advance on actual frame time even at the same semantic beat');
});

test('reference scene inputs fail closed and final three-beat plan identifies actual component sources',()=>{
 const base={presetId:'particle-depth-film',frame:0,fps:30,durationInFrames:360,width:1920,height:1080,content:getPreset('particle-depth-film').content};
 for(const bad of [{presetId:'ink-landscape-film'},{presetId:'constructor'},{width:NaN},{height:0},{frame:Infinity},{fps:0},{durationInFrames:0},{durationInFrames:.5}]) assert.throws(()=>ReferenceScene({...base,...bad}));
 for(const id of REFERENCE_STYLE_IDS) {
  const shots=presetShotPlan(id);assert.equal(shots.length,3);
  for(const shot of shots) {assert.match(shot.source,/src\/video\/reference-styles\/[^;]+\.tsx/);assert.match(shot.source,/rendered review pending/);assert.equal(shot.presetFamily,'reference');}
 }
 assert.match(presetNarrations('rain-platform-film')[2],/没有展示上车/);
 assert.match(presetNarrations('spectral-material-film')[1],/纸面.*线条.*网点/);
 assert.match(presetNarrations('kinetic-wireframe-film')[0],/字母 A/);
});


test('reference shot-plan screen text matches actual complete-scene text, not hidden semantic labels',()=>{
  const normalize=(s:string)=>s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/\s+/g,' ').trim();
  for(const presetId of REFERENCE_STYLE_IDS) {
    const seen=new Set<string>();
    for(const [width,height] of formats) for(const frame of [0,50,100,150,200,250,300,359]) {
      const svg=renderToStaticMarkup(createElement(PresetScene,{presetId,width,height,frame,fps:30,durationInFrames:360}));
      for(const match of svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)) seen.add(normalize(match[1]!));
    }
    for(const shot of presetShotPlan(presetId)) assert.deepEqual([...new Set(shot.onScreenText.map(normalize))].sort(),[...seen].sort(),`${presetId}: plan text drifted from actual component`);
  }
});


test('removed reference ID is rejected by runtime, narration and shot-plan APIs; historical forest ink remains available',()=>{
 const removed='ink-landscape-film';
 assert.throws(()=>presetNarrations(removed),/Unknown theme preset/);
 assert.throws(()=>presetShotPlan(removed),/Unknown theme preset/);
 assert.throws(()=>renderToStaticMarkup(createElement(PresetScene,{presetId:removed,frame:0,fps:30,durationInFrames:360,width:1920,height:1080})),/Unknown theme preset/);
 assert.equal(getPreset('forest-ink').id,'forest-ink');
});
