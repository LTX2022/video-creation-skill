import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, linkSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { captureInputRevision, revisionErrors } from './input-revision';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CoverDesign } from '../src/video/CoverDesign';
import { imageInfo, validateCoverBrief, localCoverPath, writeCoverFile, inspectCoverAsset, currentCoverErrors, coverDeliveryErrors, sha256, coverSources, coverRenderProps, hashCoverFile, type CoverBrief } from './cover-contract';

const base: CoverBrief={schema:1,route:'nonimage',mode:'composed',title:'准确标题：A/B？ 保留！',width:480,height:640,
 safeArea:{top:20,right:20,bottom:20,left:20},layout:{title:{x:20,y:30,width:440,height:120,fontSize:36,lines:['准确标题：','A/B？ 保留！']},visual:{x:20,y:200,width:440,height:400}},
 palette:{background:'#ffffff',foreground:'#000000',accent:'#ff8800',muted:'#444444'},visual:{kind:'code',description:'A purposeful original comparison diagram',shapes:[{type:'rect',x:0,y:0,width:400,height:500,fill:'#ff8800'}]}};
const clone=()=>structuredClone(base);
function crc(data:Buffer){let c=0xffffffff;for(const b of data){c^=b;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;}return(c^0xffffffff)>>>0;}
function chunk(name:string,data:Buffer){const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);b.write(name,4);data.copy(b,8);b.writeUInt32BE(crc(b.subarray(4,8+data.length)),8+data.length);return b;}
function png(w=64,h=64,scanlines?:Buffer){const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(scanlines??Buffer.alloc((w*4+1)*h))),chunk('IEND',Buffer.alloc(0))]);}
function temp(){return mkdtempSync(resolve(tmpdir(),'cover-contract-'));}

test('exact punctuation/spacing preserved; long titles are not silently truncated',()=>{assert.equal(validateCoverBrief(clone()).title,base.title);assert.ok(base.title.length>10);});
test('line edits cannot silently change literal title',()=>{const b=clone();b.layout.title.lines=['错误标题'];assert.throws(()=>validateCoverBrief(b),/exact text/);});
test('horizontal and square designs are supported',()=>{for(const [w,h]of [[1280,720],[800,800]]){const b=clone();b.width=w;b.height=h;assert.equal(validateCoverBrief(b).width,w);}});
test('safe geometry is checked, without claiming glyph measurement',()=>{const b=clone();b.layout.title.x=0;assert.throws(()=>validateCoverBrief(b),/safe area/);});
test('route is explicit and code requires a real authored visual',()=>{const b=clone();b.route='imagegen';assert.throws(()=>validateCoverBrief(b),/nonimage/);const c=clone();if(c.visual.kind==='code')c.visual.shapes=[];assert.throws(()=>validateCoverBrief(c),/authored shapes/);});
test('untrusted SVG attributes cannot become scripts/remote resources',()=>{const b=clone();if(b.visual.kind==='code')(b.visual.shapes[0]as any).onLoad='malicious';assert.throws(()=>validateCoverBrief(b),/Unknown shape/);});
test('SSR preserves exact title text and renders no foreign HTML/script',()=>{const svg=renderToStaticMarkup(React.createElement(CoverDesign,{brief:clone()}));assert.ok(svg.includes('A/B？ 保留！'));assert.ok(!svg.includes('<script'));assert.ok(svg.startsWith('<svg'));});
test('local path rejects absolute, traversal, URLs, backslash and symlinks including dangling',()=>{const root=temp();try{writeFileSync(resolve(root,'ok.txt'),'ok');assert.equal(localCoverPath(root,'ok.txt'),resolve(root,'ok.txt'));for(const p of ['../escape','/etc/passwd','C:/x','https://example.com/a.png','a\\b','a/../b'])assert.throws(()=>localCoverPath(root,p));symlinkSync('/tmp',resolve(root,'outside'));assert.throws(()=>localCoverPath(root,'outside/a',false),/symlink/);symlinkSync('/nonexistent',resolve(root,'dangling'));assert.throws(()=>localCoverPath(root,'dangling',false),/symlink/);}finally{rmSync(root,{recursive:true,force:true});}});
test('full PNG decoder accepts real pixels and rejects fake/empty/truncated/corrupt streams',()=>{assert.deepEqual(imageInfo(png()),{width:64,height:64,format:'png'});assert.throws(()=>imageInfo(png(64,64,Buffer.alloc(0))));assert.throws(()=>imageInfo(png().subarray(0,40)));const bad=png();bad[30]^=1;assert.throws(()=>imageInfo(bad),/CRC/);assert.throws(()=>imageInfo(Buffer.from('not an image')));assert.throws(()=>imageInfo(png(20000,1)),/dimensions/);});
test('fake JPEG header with SOF but no scan is rejected by full decoder',()=>{const jpeg=Buffer.from('ffd8ffc00011080040004003011100021100031100ffd9','hex');assert.throws(()=>imageInfo(jpeg),/decode failed/);});
test('imagegen requires provenance prompt/provider and unknown model is honest',()=>{const b:any=clone();b.route='imagegen';b.visual={kind:'image',description:'Generated metaphor',asset:{path:'assets/model.png',fit:'contain',provenance:{sourceType:'generated',source:'Current task tool result',rights:'Authorized original generation',provider:'built-in imagegen',model:'unknown',prompt:'A purposeful visual'}}};assert.equal(validateCoverBrief(b).route,'imagegen');delete b.visual.asset.provenance.prompt;assert.throws(()=>validateCoverBrief(b),/prompt/);});
test('nonimage photo needs provenance, but never needs model capability',()=>{const b:any=clone();b.visual={kind:'image',description:'User-owned source',asset:{path:'assets/photo.png',fit:'cover',provenance:{sourceType:'user-photo',source:'User upload',rights:'User authorized use'}}};assert.equal(validateCoverBrief(b).route,'nonimage');});
test('prompt-only imagegen and complete-image wrong dimensions do not pass',()=>{const root=temp();try{const b:any=clone();b.mode='complete-image';b.route='imagegen';b.visual={kind:'image',description:'Generated original',asset:{path:'missing.png',fit:'contain',provenance:{sourceType:'generated',source:'tool',rights:'authorized',prompt:'prompt',provider:'test',model:'unknown'}}};assert.throws(()=>inspectCoverAsset(root,b),/missing/);writeFileSync(resolve(root,'model.png'),png());b.visual.asset.path='model.png';assert.throws(()=>inspectCoverAsset(root,b),/dimensions/);}finally{rmSync(root,{recursive:true,force:true});}});
test('historical schema and prepared-only metadata are not completed evidence',()=>{assert.match(currentCoverErrors(process.cwd(),{schema:2}).join(' '),/unbound/);});

// Integration fixtures use a tiny real PNG and exact source binding; no renderer, network or image model call.
function boundFixture(){
 const root=temp(), b:any=clone();b.width=64;b.height=64;b.safeArea={top:1,left:1,right:1,bottom:1};b.layout={title:{x:1,y:1,width:62,height:30,fontSize:10,lines:['准确标题：','A/B？ 保留！']},visual:{x:0,y:0,width:64,height:64}};b.mode='complete-image';b.route='imagegen';b.visual={kind:'image',description:'Fixture only; not actual imagegen output',asset:{path:'assets/input.png',fit:'contain',provenance:{sourceType:'generated',source:'Synthetic unit fixture, not model evidence',rights:'Original fixture pixels',prompt:'test only',provider:'test-fixture',model:'unknown'}}};
 for(const path of ['scripts/cover-contract.ts','scripts/generate-cover.ts','src/video/CoverDesign.tsx','src/video/CoverRoot.tsx','src/video/cover-types.ts','src/video/cover-index.ts','src/video/cover-metadata.generated.ts','src/styles/fonts.css']){mkdirSync(resolve(root,path,'..'),{recursive:true});writeFileSync(resolve(root,path),'fixture source');}
 mkdirSync(resolve(root,'assets'),{recursive:true});mkdirSync(resolve(root,'output/cover'),{recursive:true});mkdirSync(resolve(root,'public/cover-assets'),{recursive:true});
 const bytes=png();writeFileSync(resolve(root,'assets/input.png'),bytes);writeFileSync(resolve(root,'output/cover/cover.png'),bytes);writeFileSync(resolve(root,'public/cover-assets/input.png'),bytes);writeFileSync(resolve(root,'brief.json'),JSON.stringify(b));writeFileSync(resolve(root,'output/cover/cover-props.json'),JSON.stringify(coverRenderProps(root,b,inspectCoverAsset(root,b))));
 const sources=coverSources(root,'brief.json'), sourceRevision=sha256(JSON.stringify(sources)),asset=inspectCoverAsset(root,b),output={path:'output/cover/cover.png',sha256:sha256(bytes),width:64,height:64};
 const meta:any={schema:3,attemptId:'synthetic-fixture',status:'rendered',route:'imagegen',mode:'complete-image',title:b.title,coverSize:{width:64,height:64},briefPath:'brief.json',sources,sourceRevision,asset,renderProps:{path:'output/cover/cover-props.json',sha256:hashCoverFile(root,'output/cover/cover-props.json')},renderer:'source-asset-copy',output,visualReview:{status:'approved',reviewer:'unit fixture',note:'Not a real visual inspection; test fixture only',sourceRevision,outputSha256:output.sha256}};
 writeFileSync(resolve(root,'output/cover/cover-attempt.json'),JSON.stringify({schema:1,id:meta.attemptId,status:'completed',briefPath:'brief.json'}));writeFileSync(resolve(root,'output/cover/cover-metadata.json'),JSON.stringify(meta));writeFileSync(resolve(root,'output/cover/cover-report.json'),JSON.stringify({schema:3,pass:true,technicalPass:true,visualPass:true,sourceRevision,output,route:meta.route,renderer:meta.renderer}));return{root,meta};
}
test('fresh bound complete-image evidence passes; changed original asset is rejected despite old pass report',()=>{const {root}=boundFixture();try{assert.deepEqual(coverDeliveryErrors(root),[]);writeFileSync(resolve(root,'assets/input.png'),png(64,64,Buffer.alloc(64*(64*4+1),1)));assert.ok(coverDeliveryErrors(root).length);}finally{rmSync(root,{recursive:true,force:true});}});
test('stale source, changed output, forged report and prepared status each fail closed',()=>{for(const mutation of ['source','output','report','prepared','approval']){const{root,meta}=boundFixture();try{if(mutation==='source')writeFileSync(resolve(root,'src/video/CoverDesign.tsx'),'changed');if(mutation==='output')writeFileSync(resolve(root,'output/cover/cover.png'),png(65,64));if(mutation==='report')writeFileSync(resolve(root,'output/cover/cover-report.json'),'{"pass":true}');if(mutation==='prepared'){meta.status='prepared';writeFileSync(resolve(root,'output/cover/cover-metadata.json'),JSON.stringify(meta));}if(mutation==='approval'){meta.visualReview.outputSha256='stale';writeFileSync(resolve(root,'output/cover/cover-metadata.json'),JSON.stringify(meta));}assert.ok(coverDeliveryErrors(root).length,mutation);}finally{rmSync(root,{recursive:true,force:true});}}});
test('registered local font bytes are bound and external font imports are rejected',()=>{const{root}=boundFixture();try{mkdirSync(resolve(root,'public/fonts'),{recursive:true});writeFileSync(resolve(root,'public/fonts/test.ttf'),'font-v1');writeFileSync(resolve(root,'src/styles/fonts.css'),'@font-face { font-family:test; src:url("/fonts/test.ttf") }');const a=coverSources(root,'brief.json');assert.ok(a.some(v=>v.path==='public/fonts/test.ttf'));writeFileSync(resolve(root,'public/fonts/test.ttf'),'font-v2');assert.notDeepEqual(coverSources(root,'brief.json'),a);writeFileSync(resolve(root,'src/styles/fonts.css'),'@import "https://example.com/font.css";');assert.throws(()=>coverSources(root,'brief.json'),/self-contained/);}finally{rmSync(root,{recursive:true,force:true});}});

test('no-output success and corrupt-output renderers cannot relabel an existing valid PNG',()=>{
 const require=createRequire(import.meta.url), loader=require.resolve('tsx');
 for(const corrupt of [false,true]){
  const root=temp();try{
   for(const path of ['scripts/cover-contract.ts','scripts/generate-cover.ts','scripts/browser.ts','src/video/CoverDesign.tsx','src/video/CoverRoot.tsx','src/video/cover-types.ts','src/video/cover-index.ts','src/video/cover-metadata.generated.ts','src/styles/fonts.css']){
    mkdirSync(resolve(root,path,'..'),{recursive:true});copyFileSync(resolve(process.cwd(),path),resolve(root,path));
   }
   writeFileSync(resolve(root,'package.json'),'{}');symlinkSync(resolve(process.cwd(),'node_modules'),resolve(root,'node_modules'));
   writeFileSync(resolve(root,'brief.json'),JSON.stringify(base));mkdirSync(resolve(root,'output/cover'),{recursive:true});
   const original=png();writeFileSync(resolve(root,'output/cover/cover.png'),original);mkdirSync(resolve(root,'test-bin'));
   // Deliberately authored local fake renderer; never installed or used outside this isolated regression.
   const stub=corrupt ? '#!/bin/sh\nfor arg in "$@"; do case "$arg" in --export-filename=*) printf broken > "${arg#*=}" ;; esac; done\nexit 0\n' : '#!/bin/sh\nexit 0\n';
   writeFileSync(resolve(root,'test-bin/inkscape'),stub,{mode:0o755});
   const run=spawnSync(process.execPath,['--import',loader,resolve(root,'scripts/generate-cover.ts'),'--brief','brief.json','--renderer','svg-inkscape'],{cwd:root,env:{...process.env,PATH:resolve(root,'test-bin')+':'+process.env.PATH},encoding:'utf8'});
   assert.notEqual(run.status,0,run.stdout+run.stderr);assert.equal(sha256(readFileSync(resolve(root,'output/cover/cover.png'))),sha256(original));
   const meta=JSON.parse(readFileSync(resolve(root,'output/cover/cover-metadata.json'),'utf8'));assert.equal(meta.status,'prepared');assert.notEqual(meta.status,'rendered');
  }finally{rmSync(root,{recursive:true,force:true});}
 }
});
test('complete image has no duplicate title overlay in SSR',()=>{const b:any=clone();b.mode='complete-image';b.route='imagegen';b.visual={kind:'image',description:'Complete image',asset:{path:'image.png',fit:'contain',provenance:{sourceType:'generated',source:'fixture',rights:'fixture',prompt:'test',provider:'test',model:'unknown'}}};const svg=renderToStaticMarkup(React.createElement(CoverDesign,{brief:b,assetHref:'data:image/png;base64,AA=='}));assert.ok(svg.includes('<image'));assert.ok(!/<text\b|<tspan\b/.test(svg));});
test('visual revocation fails delivery and preserves the prior local review record',()=>{const{root}=boundFixture();try{const require=createRequire(import.meta.url);const run=spawnSync(process.execPath,['--import',require.resolve('tsx'),resolve(process.cwd(),'scripts/validate-cover.ts'),'--revoke-visual','--reviewer','unit-test','--review-note','Synthetic revocation test, not real user rejection'],{cwd:root,encoding:'utf8'});assert.equal(run.status,0,run.stdout+run.stderr);const meta=JSON.parse(readFileSync(resolve(root,'output/cover/cover-metadata.json'),'utf8'));assert.equal(meta.visualReview.status,'rejected');assert.equal(meta.visualReviewHistory.at(-1).status,'approved');assert.ok(coverDeliveryErrors(root).length);}finally{rmSync(root,{recursive:true,force:true});}});

/** Isolated real generator subprocesses; pixels/decision declarations below are synthetic fixtures. */
function generatorFixture() {
 const {root}=boundFixture();
 for(const path of ['scripts/cover-contract.ts','scripts/generate-cover.ts','scripts/validate-cover.ts','scripts/browser.ts','src/video/CoverDesign.tsx','src/video/CoverRoot.tsx','src/video/cover-types.ts','src/video/cover-index.ts','src/styles/fonts.css'])copyFileSync(resolve(process.cwd(),path),resolve(root,path));
 writeFileSync(resolve(root,'package.json'),JSON.stringify({type:'module'}));
 writeFileSync(resolve(root,'package-lock.json'),JSON.stringify({lockfileVersion:3,packages:{}}));
 symlinkSync(resolve(process.cwd(),'node_modules'),resolve(root,'node_modules'));
 for(const dir of ['src/config','src/registry'])mkdirSync(resolve(root,dir),{recursive:true});
 writeFileSync(resolve(root,'src/video/index.ts'),'// Synthetic video input; never rendered.\n');
 writeFileSync(resolve(root,'src/config/videoFormat.ts'),'export const VIDEO_FORMAT={fps:30,width:100,height:100};\n');
 writeFileSync(resolve(root,'src/registry/chapters.ts'),'export const CHAPTERS=[];\n');
 writeFileSync(resolve(root,'src/video/render-timing.generated.ts'),'export const STEP_TIMINGS=[]; export const TOTAL_FRAMES=30;\n');
 writeFileSync(resolve(root,'timing-manifest.json'),JSON.stringify({fps:30,steps:[]}));
 writeFileSync(resolve(root,'project-state.json'),JSON.stringify({outputMode:'both',audioRequested:false,subtitlesRequested:false,coverRequired:true}));
 rmSync(resolve(root,'public/cover-assets'),{recursive:true,force:true});
 return root;
}
function generatorRun(root:string,args:string[]) {
 const loader=createRequire(import.meta.url).resolve('tsx');
 return spawnSync(process.execPath,['--import',loader,resolve(root,'scripts/generate-cover.ts'),...args],{cwd:root,encoding:'utf8'});
}
test('cover prepare/import/title/asset changes never mutate video src/public; true shared inputs still invalidate',()=>{
 const root=generatorFixture();try{
  const before=captureInputRevision(root);assert.equal(before.status,'bound',before.issues.join('; '));
  for(const mode of ['--prepare-only','--import-complete']){
   const result=generatorRun(root,['--brief','brief.json',mode]);assert.equal(result.status,0,result.stdout+result.stderr);
   assert.deepEqual(revisionErrors(captureInputRevision(root),before),[]);
  }
  const oldMeta=JSON.parse(readFileSync(resolve(root,'output/cover/cover-metadata.json'),'utf8'));
  const brief=JSON.parse(readFileSync(resolve(root,'brief.json'),'utf8'));brief.title='New cover';brief.layout.title.lines=['New cover'];writeFileSync(resolve(root,'brief.json'),JSON.stringify(brief));
  writeFileSync(resolve(root,'assets/input.png'),png(64,64,Buffer.alloc((64*4+1)*64,1)));
  const changed=generatorRun(root,['--brief','brief.json','--import-complete']);assert.equal(changed.status,0,changed.stdout+changed.stderr);
  const meta=JSON.parse(readFileSync(resolve(root,'output/cover/cover-metadata.json'),'utf8'));
  assert.notEqual(meta.sourceRevision,oldMeta.sourceRevision);assert.notEqual(meta.output.sha256,oldMeta.output.sha256);
  assert.deepEqual(currentCoverErrors(root,meta),[]);assert.deepEqual(revisionErrors(captureInputRevision(root),before),[]);
  assert.equal(readFileSync(resolve(root,'src/video/cover-metadata.generated.ts'),'utf8'),'fixture source');
  assert.throws(()=>readFileSync(resolve(root,'public/cover-assets/input.png')));
  assert.match(JSON.parse(readFileSync(resolve(root,'output/cover/cover-props.json'),'utf8')).assetHref,/^data:image\/png;base64,/);
  writeFileSync(resolve(root,'public/shared-video-asset.png'),png());assert.ok(revisionErrors(captureInputRevision(root),before).length);
  rmSync(resolve(root,'public/shared-video-asset.png'));assert.deepEqual(revisionErrors(captureInputRevision(root),before),[]);
  writeFileSync(resolve(root,'src/video/index.ts'),'// Actual shared video implementation changed\n');assert.ok(revisionErrors(captureInputRevision(root),before).length);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('failed replacement and invalid selected brief revoke current completion before asset validation; explicit rerun restores only pending visual state',()=>{
 for(const bad of ['missing-asset','invalid-brief']){
  const root=generatorFixture();try{
   const initial=generatorRun(root,['--brief','brief.json','--import-complete']);assert.equal(initial.status,0,initial.stderr);
   const original=readFileSync(resolve(root,'output/cover/cover.png'));
   const meta=JSON.parse(readFileSync(resolve(root,'output/cover/cover-metadata.json'),'utf8'));
   // Deliberate test-only local approval state; not a claimed visual/user review.
   meta.visualReview={status:'approved',reviewer:'SYNTHETIC AUDIT FIXTURE',note:'Synthetic state fixture, not real approval',sourceRevision:meta.sourceRevision,outputSha256:meta.output.sha256};
   writeFileSync(resolve(root,'output/cover/cover-metadata.json'),JSON.stringify(meta));
   const loader=createRequire(import.meta.url).resolve('tsx');const validate=()=>spawnSync(process.execPath,['--import',loader,resolve(root,'scripts/validate-cover.ts')],{cwd:root,encoding:'utf8'});
   assert.equal(validate().status,0);assert.deepEqual(coverDeliveryErrors(root),[]);
   const replacement=JSON.parse(readFileSync(resolve(root,'brief.json'),'utf8'));replacement.title='Replacement';replacement.layout.title.lines=['Replacement'];
   if(bad==='missing-asset')replacement.visual.asset.path='assets/not-yet-staged.png';else replacement.width=0;
   writeFileSync(resolve(root,'replacement.json'),JSON.stringify(replacement));
   const failure=generatorRun(root,['--brief','replacement.json','--import-complete']);assert.notEqual(failure.status,0);
   const attempt=JSON.parse(readFileSync(resolve(root,'output/cover/cover-attempt.json'),'utf8'));
   assert.equal(attempt.status,'failed');assert.equal(attempt.briefPath,'replacement.json');
   assert.equal(JSON.parse(readFileSync(resolve(root,'project-state.json'),'utf8')).coverValidated,false);
   assert.equal(JSON.parse(readFileSync(resolve(root,'output/cover/cover-report.json'),'utf8')).pass,false);
   assert.deepEqual(readFileSync(resolve(root,'output/cover/cover.png')),original);assert.ok(coverDeliveryErrors(root).some(e=>/attempt/.test(e)));
   assert.notEqual(validate().status,0); // Cannot revive the previous approval by merely validating again.
   const restore=generatorRun(root,['--brief','brief.json','--import-complete']);assert.equal(restore.status,0,restore.stderr);
   const restored=JSON.parse(readFileSync(resolve(root,'output/cover/cover-metadata.json'),'utf8'));
   assert.deepEqual(currentCoverErrors(root,restored),[]);assert.equal(restored.visualReview.status,'pending');assert.ok(coverDeliveryErrors(root).length);
  }finally{rmSync(root,{recursive:true,force:true});}
 }
});
test('changed embedded props or a failed newer attempt cannot reuse a passing cover report',()=>{
 for(const kind of ['props','attempt']){const{root}=boundFixture();try{
  assert.deepEqual(coverDeliveryErrors(root),[]);
  if(kind==='props')writeFileSync(resolve(root,'output/cover/cover-props.json'),'{}');
  else writeFileSync(resolve(root,'output/cover/cover-attempt.json'),JSON.stringify({schema:1,id:'newer',status:'failed',briefPath:'replacement.json'}));
  assert.ok(coverDeliveryErrors(root).length);
 }finally{rmSync(root,{recursive:true,force:true});}}
});
test('cover writes reject hardlinks before truncating any linked owned sentinel',()=>{
 const outside=temp(),root=resolve(outside,'project');mkdirSync(root);
 try{
  const sentinel=resolve(outside,'owned-audit-sentinel.txt');writeFileSync(sentinel,'ORIGINAL AUDIT BYTES');
  for(const path of ['cover-report.json','project-state.json']){
   linkSync(sentinel,resolve(root,path));
   assert.throws(()=>writeCoverFile(root,path,'SHOULD NEVER REPLACE'),/linked|Unsafe/);
   assert.equal(readFileSync(sentinel,'utf8'),'ORIGINAL AUDIT BYTES');
   assert.equal(readFileSync(resolve(root,path),'utf8'),'ORIGINAL AUDIT BYTES');
   rmSync(resolve(root,path));
  }
  writeCoverFile(root,'ordinary.json','normal local write');assert.equal(readFileSync(resolve(root,'ordinary.json'),'utf8'),'normal local write');
 }finally{rmSync(outside,{recursive:true,force:true});}
});
