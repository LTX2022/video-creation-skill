/** Synthetic static-contract regressions. No rendering, installs, network, or acceptance claims. */
import assert from 'node:assert/strict';
import {cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {layoutQualityIssues, repeatsNarration} from './screen-quality';
import {overlaySafetyErrors} from './delivery-contract';

let count = 0;
function test(name: string, run: () => void) {run(); count++; console.log(`PASS ${name}`);}
const portrait = {portrait: true, overlay: false};
const mobile = {required: true, minTextPx: 48, headlinePx: 96, primaryVisualCoverage: 0.2, primaryVisualWidthRatio: 0.5, primaryVisualHeightRatio: 0.3, safeFrameUse: 0.6};
const shot = {chapter:'demo', step:1, onScreenText:['LUMA', '120 Hz', 'USB-C'], visualCoverage:0.2, mobileReadability:mobile};
test('valid smaller portrait measurements warn instead of forcing universal ratios', () => {
  const result = layoutQualityIssues(shot, portrait);
  assert.deepEqual(result.errors, []); assert(result.warnings.length > 0);
});
test('intentional editorial typography need not invent 55% non-text coverage', () => {
  const result = layoutQualityIssues({...shot, visualCoverage:0, screenTextIntent:'editorial', mobileReadability:{...mobile,minTextPx:140,headlinePx:200}}, portrait);
  assert.deepEqual(result, {errors:[], warnings:[]});
});
test('data-led layout is not a visual-area quota', () => assert.deepEqual(layoutQualityIssues({...shot, screenTextIntent:'data'}, portrait).errors, []));
test('shape-only portrait need not invent text or headline size', () => assert.deepEqual(layoutQualityIssues({...shot,onScreenText:[],mobileReadability:{...mobile,minTextPx:undefined,headlinePx:undefined}},portrait).errors, []));
test('opaque coverage still rejects missing, string, NaN and out-of-range data', () => {
  for (const visualCoverage of [undefined, '0.7', NaN, Infinity, -0.1, 1.1]) assert(layoutQualityIssues({...shot,visualCoverage}, portrait).errors.some((x) => /visualCoverage/.test(x)));
});
test('portrait readability declaration and actual text dimensions stay required', () => {
  assert(layoutQualityIssues({...shot,mobileReadability:undefined},portrait).errors.length);
  for (const minTextPx of [undefined,0,-1,'80',NaN]) assert(layoutQualityIssues({...shot,mobileReadability:{...mobile,minTextPx}},portrait).errors.length);
  for (const primaryVisualCoverage of [undefined,1.5,-0.1,'0.8',NaN]) assert(layoutQualityIssues({...shot,mobileReadability:{...mobile,primaryVisualCoverage}},portrait).errors.length);
});
const explicit = {basis:'user-approved-shot-design',reason:'Synthetic contract test only; not user acceptance',minimums:{visualCoverage:0.4,minTextPx:48}};
test('explicit per-shot minima still block undersized measurements', () => assert(layoutQualityIssues({...shot,layoutRequirements:explicit},portrait).errors.some((x) => /explicit per-shot minimum/.test(x))));
test('explicit per-shot minima pass only when values meet them', () => assert.deepEqual(layoutQualityIssues({...shot,visualCoverage:0.4,layoutRequirements:explicit},portrait).errors, []));
test('malformed or untraceable declared minima are rejected', () => {
  for (const layoutRequirements of [{...explicit,reason:''},{...explicit,basis:'automatic'}, {...explicit,minimums:{visualCoverage:'0.5'}},{...explicit,minimums:{}},{...explicit,minimums:{invented:1}}]) assert(layoutQualityIssues({...shot,layoutRequirements},portrait).errors.length);
});
test('invalid text intent is not silently treated as an exemption', () => assert(layoutQualityIssues({...shot,screenTextIntent:'anything'},portrait).errors.length));
test('overlay remains governed by bounded foreground safety, not opaque area quota', () => {
  const item = {...shot,overlaySafety:{coordinateSystem:'normalized',bounds:{x:0.1,y:0.1,width:0.5,height:0.5},minTextPx:48,readabilityReviewed:true,edgePaddingReviewed:true,reviewEvidence:'output/golden/test.png'}};
  assert.deepEqual(layoutQualityIssues(item,{...portrait,overlay:true}).errors, []);
  assert.deepEqual(overlaySafetyErrors(item), []);
  assert(overlaySafetyErrors({...item,overlaySafety:{...item.overlaySafety,bounds:{x:0.9,y:0.9,width:0.5,height:0.5}}}).length);
  const layoutRequirements={basis:'user-approved-shot-design',reason:'Synthetic exact overlay size requirement',minimums:{minTextPx:48}};
  assert.deepEqual(layoutQualityIssues({...item,mobileReadability:undefined,layoutRequirements},{...portrait,overlay:true}).errors, []);
  assert(layoutQualityIssues({...item,layoutRequirements:{...layoutRequirements,minimums:{minTextPx:64}}},{...portrait,overlay:true}).errors.length);
});
test('empty narration, product names, terms and units are not universal duplicate substrings', () => {
  for (const label of ['LUMA','120 Hz','USB-C','Electromagnetic induction','量子计算与人工智能','基于高温超导材料的多通道超高分辨率磁共振成像系统','International Institute for Advanced Research in Electromagnetic Imaging and Superconductivity']) {
    assert.equal(repeatsNarration(label,''),false);
    assert.equal(repeatsNarration(label,`This explanation includes ${label} and its technical context.`),false);
  }
});
const paragraph='The product can now process every customer request without losing the original order or its status.';
test('long English and Chinese verbatim prose remain detectable', () => {
  assert.equal(repeatsNarration(paragraph,paragraph),true);
  const chinese='系统将同一批订单从待审核状态依次移动到处理完成状态，并且始终保留每一份订单的原始编号。';
  assert.equal(repeatsNarration(chinese,chinese),true);
});

const here=dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const tsx=require.resolve('tsx');
const root=mkdtempSync(join(tmpdir(),'screen-quality-contract-'));
const write=(name:string, value:unknown)=>writeFileSync(join(root,name),typeof value==='string'?value:JSON.stringify(value));
const state={outputMode:'opaque',audioRequested:true,subtitlesRequested:false};
function cli(script:string) {return spawnSync(process.execPath,['--import',tsx,join(root,'scripts',script)],{cwd:root,encoding:'utf8'});}
function screen(name:string, item:any, expected:boolean, flags:any=state, source='export const visible = <div>LUMA</div>;') {
  test(name,()=>{
    write('project-state.json',flags); write('shot-manifest.json',{format:'portrait',steps:[item]});
    write('src/chapters/01-demo/Chapter.tsx',source);
    const result=cli('validate-screen-text.ts');
    assert.equal(result.status===0,expected,result.stderr);
  });
}
try {
  mkdirSync(join(root,'src/chapters/01-demo'),{recursive:true}); mkdirSync(join(root,'src/config'),{recursive:true});
  cpSync(here,join(root,'scripts'),{recursive:true});
  symlinkSync(dirname(dirname(require.resolve('typescript/package.json'))),join(root,'node_modules'),'dir');
  write('package.json',{type:'module',name:'synthetic-quality-test'});
  write('src/config/videoFormat.ts','export const VIDEO_FORMAT={id:"portrait",width:1080,height:1920,fps:30};');
  screen('voiced product names and data units pass without subtitles',{...shot,scriptText:'LUMA provides 120 Hz refresh with USB-C connectivity.'},true);
  screen('necessary labels also pass when subtitles exist',{...shot,scriptText:'LUMA provides 120 Hz refresh with USB-C connectivity.'},true,{...state,subtitlesRequested:true});
  screen('more than two data labels require review, not deletion',{...shot,onScreenText:['LUMA','120 Hz','USB-C','48 W'],scriptText:''},true);
  screen('empty narration does not match every label',{...shot,scriptText:''},true);
  screen('long approved-design editorial title is not rejected for length',{...shot,screenTextIntent:'editorial',onScreenText:['A new perspective on the future of connected work'],scriptText:''},true);
  screen('intentional spoken editorial copy is reviewable when captions are disabled',{...shot,screenTextIntent:'editorial',onScreenText:[paragraph],scriptText:paragraph},true);
  screen('actual long duplicate caption prose remains blocked',{...shot,onScreenText:[paragraph],scriptText:paragraph},false,{...state,subtitlesRequested:true});
  screen('explicit double captions remain blocked even when short',{...shot,screenTextIntent:'captions',onScreenText:['LUMA is available'],scriptText:'LUMA is available'},false,{...state,subtitlesRequested:true});
  screen('long duplicate prose plus other labels remains blocked',{...shot,onScreenText:['LUMA',paragraph],scriptText:paragraph},false);
  screen('duplicate paragraph split across labels remains blocked',{...shot,onScreenText:paragraph.match(/.{1,25}/g),scriptText:paragraph},false);
  screen('non-rendered source quotation is a review warning, not proof of duplicate captions',{...shot,scriptText:paragraph},true,state,`// ${paragraph}\nexport const visible=<div>LUMA</div>;`);
  screen('malformed label object remains blocked',{...shot,onScreenText:[{text:'LUMA'}]},false);
  screen('malformed label array remains blocked',{...shot,onScreenText:'LUMA'},false);
  screen('non-string narration remains blocked',{...shot,scriptText:42},false);
  screen('hidden separators remain blocked',{...shot,onScreenText:['LU\u200bMA']},false);
  test('empty shot list is not silently successful',()=>{write('shot-manifest.json',{steps:[]});assert.notEqual(cli('validate-screen-text.ts').status,0);});
  test('preflight wires advisory layout rules without disabling required workflow checks',()=>{
    write('project-state.json',state);write('shot-manifest.json',{format:'portrait',steps:[shot]});
    const result=cli('preflight.ts');
    assert.notEqual(result.status,0); // This intentionally incomplete fixture is never accepted.
    assert.match(result.stderr,/workflow gate|missing chapter registry/);
    assert.match(result.stderr,/heuristic review: shot demo\/1: visualCoverage/);
    assert.doesNotMatch(result.stderr,/x shot demo\/1: (visualCoverage|portrait minTextPx|portrait headlinePx|portrait primaryVisual|portrait safeFrameUse)/);
  });
  test('explicit profile choices are defaults overrides, not unconditional failures',()=>{
    for (const videoProfile of ['douyin','bilibili']) {
      write('project-state.json',{...state,videoProfile,videoFormat:'portrait',audioRequested:false,subtitlesRequested:false,coverRequired:false,finalRenderRequired:true});
      write('shot-manifest.json',{format:'portrait',steps:[shot]});
      const result=cli('preflight.ts');assert.notEqual(result.status,0);
      assert.match(result.stderr,/explicit .* choices differ/);
      assert.doesNotMatch(result.stderr,/profile (requires narration|requires burned-in|requires a validated cover|must use)/);
      assert.match(result.stderr,/workflow gate/); // Missing real acceptance still blocks this fixture.
    }
  });
  test('missing explicit flags and actual format mismatch remain failures',()=>{
    write('project-state.json',{outputMode:'opaque',videoProfile:'douyin',videoFormat:'landscape',videoWidth:1920,videoHeight:1080});
    const result=cli('preflight.ts');
    assert.match(result.stderr,/audioRequested must be an explicit boolean/);
    assert.match(result.stderr,/subtitlesRequested must be an explicit boolean/);
    assert.match(result.stderr,/coverRequired must be an explicit boolean/);
    assert.match(result.stderr,/project-state videoFormat .* does not match/);
    assert.match(result.stderr,/project-state videoWidth .* does not match/);
  });
  test('subtitle-specific text checks apply only when subtitles are requested',()=>{
    write('timing-manifest.json',{steps:[{chapter:'demo',step:1,advanceAtMs:3000,subtitleChunks:['This deliberately long subtitle line must be reviewed when subtitles are requested.']}]});
    write('project-state.json',{...state,subtitlesRequested:false});
    assert.doesNotMatch(cli('preflight.ts').stderr,/subtitle line too long/);
    write('project-state.json',{...state,subtitlesRequested:true});
    assert.match(cli('preflight.ts').stderr,/subtitle line too long/);
  });
  test('offscreen and actual subtitle intersections remain concrete failures',()=>{
    write('project-state.json',{...state,subtitlesRequested:true});
    write('shot-manifest.json',{format:'portrait',steps:[{...shot,subtitleSafety:{required:true,coordinateSystem:'normalized',checked:true,subtitleBand:{x:0.1,y:0.6,width:0.8,height:0.13},platformUiBand:{x:0,y:0.8,width:1,height:0.2},textBoxes:[{id:'overlap',x:0.2,y:0.62,width:0.2,height:0.1},{id:'offscreen',x:0.95,y:0.1,width:0.2,height:0.1}],criticalVisualBoxes:[]}}]});
    const result=cli('preflight.ts');assert.notEqual(result.status,0);
    assert.match(result.stderr,/overlap intersects subtitleBand/);assert.match(result.stderr,/offscreen must be a normalized box inside the frame/);
  });
} finally {rmSync(root,{recursive:true,force:true});}
console.log(`Quality gate tests: ${count} passed`);
