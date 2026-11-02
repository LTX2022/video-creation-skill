import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, linkSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateComposition } from './validate-composition';
import { hashLocalFile } from './input-revision';
import { atomicOutputWrite, safeOutputFile, safeRenderOutput, stagedRenderOutput, validateDecodedMedia, withOutputRollback } from './render-output-safety';

test('source protection, custom path compatibility, prior verified renders, hardlinks and symlinks', () => {
 const root=mkdtempSync(join(tmpdir(),'render-safety-'));
 try {
  mkdirSync(join(root,'public')); mkdirSync(join(root,'output/render-results'),{recursive:true});
  writeFileSync(join(root,'public/original.mp4'),'original');
  for(const path of ['public/original.mp4','src/a.mp4','scripts/a.mov','../escape.mp4','output/state.json'])assert.throws(()=>safeRenderOutput(root,path));
  assert.equal(safeRenderOutput(root,'exports/new.mov'),join(root,'exports/new.mov'));
  assert.equal(safeRenderOutput(root,'custom.mp4'),join(root,'custom.mp4'));
  writeFileSync(join(root,'custom.mp4'),'user original');
  assert.throws(()=>safeRenderOutput(root,'custom.mp4'),/not a verified prior render/);
  writeFileSync(join(root,'output/render-results/custom.json'),JSON.stringify({output:'custom.mp4',sha256:hashLocalFile(root,'custom.mp4')}));
  assert.equal(safeRenderOutput(root,'custom.mp4'),join(root,'custom.mp4'));
  assert.throws(()=>safeRenderOutput(root,'custom.mp4',['custom.mp4']),/bound input/);
  linkSync(join(root,'public/original.mp4'),join(root,'output/hard.mp4'));
  assert.throws(()=>safeRenderOutput(root,'output/hard.mp4'),/linked/);
  symlinkSync(join(root,'public'),join(root,'output/linked'));
  assert.throws(()=>safeRenderOutput(root,'output/linked/original.mp4'),/Symlink/);
  assert.equal(readFileSync(join(root,'public/original.mp4'),'utf8'),'original');
 } finally {rmSync(root,{recursive:true,force:true});}
});

test('failure preserves last artifact; successful staged commit replaces only destination',()=>{
 const root=mkdtempSync(join(tmpdir(),'render-transaction-'));
 try {
  mkdirSync(join(root,'output'));writeFileSync(join(root,'output/final.mov'),'old valid artifact');
  const failed=stagedRenderOutput(root,'output/final.mov');writeFileSync(failed.temporary,'partial');failed.cleanup();
  assert.equal(readFileSync(join(root,'output/final.mov'),'utf8'),'old valid artifact');
  const missing=stagedRenderOutput(root,'output/final.mov');assert.throws(()=>missing.commit(),/missing or empty/);missing.cleanup();
  const laterFailure=stagedRenderOutput(root,'output/final.mov');writeFileSync(laterFailure.temporary,'new media');laterFailure.commit();laterFailure.rollback();laterFailure.cleanup();
  assert.equal(readFileSync(join(root,'output/final.mov'),'utf8'),'old valid artifact','post-commit receipt failure must restore old artifact');
  const noPrior=stagedRenderOutput(root,'output/new.mov');writeFileSync(noPrior.temporary,'new media');noPrior.commit();noPrior.rollback();noPrior.cleanup();
  assert.throws(()=>readFileSync(join(root,'output/new.mov')));
  const good=stagedRenderOutput(root,'output/final.mov');writeFileSync(good.temporary,'validated replacement');good.commit();good.cleanup();
  assert.equal(readFileSync(join(root,'output/final.mov'),'utf8'),'validated replacement');
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('decoder failures are never successful evidence',()=>{
 assert.throws(()=>validateDecodedMedia('/missing-video.mp4'),/decode failed/);
 assert.throws(()=>validateDecodedMedia('/missing-video.mp4','/nonexistent-ffmpeg'),/decode failed/);
});


test('explicit composite route validates plates even when project state is opaque',()=>{
 const root=mkdtempSync(join(tmpdir(),'composition-override-'));
 try{
  writeFileSync(join(root,'project-state.json'),JSON.stringify({outputMode:'opaque',videoFps:30}));
  assert.deepEqual(validateComposition(root),[]);
  assert.deepEqual(validateComposition(root,'opaque'),[]);
  assert.deepEqual(validateComposition(root,'alpha'),[]);
  assert.deepEqual(validateComposition(root,'composite'),['composition-manifest.json is required']);
  assert.deepEqual(validateComposition(root,'both'),['composition-manifest.json is required']);
  writeFileSync(join(root,'project-state.json'),JSON.stringify({outputMode:'both',videoFps:30}));
  assert.deepEqual(validateComposition(root),['composition-manifest.json is required']);
  assert.deepEqual(validateComposition(root,'opaque'),[]);
 }finally{rmSync(root,{recursive:true,force:true});}
});


test('receipt/state/log link attacks reject and metadata failure restores old media and receipts',()=>{
 const root=mkdtempSync(join(tmpdir(),'metadata-transaction-')),outside=mkdtempSync(join(tmpdir(),'metadata-target-'));
 try{
  mkdirSync(join(root,'output/render-results'),{recursive:true});
  writeFileSync(join(outside,'sentinel'),'untouched');
  for(const path of ['output/render-results/result.json','output/render-result.json','project-state.json','feedback-events.jsonl']){
   symlinkSync(join(outside,'sentinel'),join(root,path));
   assert.throws(()=>safeOutputFile(root,path),/Symlink/);
   assert.throws(()=>atomicOutputWrite(root,path,'bad'),/Symlink/);
   rmSync(join(root,path));linkSync(join(outside,'sentinel'),join(root,path));
   assert.throws(()=>safeOutputFile(root,path),/hardlinked/);rmSync(join(root,path));
  }
  rmSync(join(root,'output/render-results'),{recursive:true});symlinkSync(outside,join(root,'output/render-results'));
  assert.throws(()=>safeOutputFile(root,'output/render-results/result.json'),/Symlink/);
  rmSync(join(root,'output/render-results'));mkdirSync(join(root,'output/render-results'));
  symlinkSync(outside,join(root,'output/alpha-validation'));
  assert.throws(()=>safeOutputFile(root,'output/alpha-validation/run/frame.png'),/Symlink/);
  assert.equal(readFileSync(join(outside,'sentinel'),'utf8'),'untouched');
  const paths=['output/render-result.json','project-state.json','feedback-events.jsonl'];
  for(const path of paths)atomicOutputWrite(root,path,'old '+path);
  writeFileSync(join(root,'output/final.mov'),'old media');
  const staged=stagedRenderOutput(root,'output/final.mov');writeFileSync(staged.temporary,'new media');
  assert.throws(()=>{
   try{withOutputRollback(root,paths,()=>{
    staged.commit();atomicOutputWrite(root,paths[0]!,'new receipt');atomicOutputWrite(root,paths[1]!,'new state');
    throw new Error('injected late log failure');
   });}catch(error){staged.rollback();throw error;}finally{staged.cleanup();}
  },/injected late log failure/);
  assert.equal(readFileSync(join(root,'output/final.mov'),'utf8'),'old media');
  for(const path of paths)assert.equal(readFileSync(join(root,path),'utf8'),'old '+path);
 }finally{rmSync(root,{recursive:true,force:true});rmSync(outside,{recursive:true,force:true});}
});

test('production wrapper preserves transaction exception flow and checks fresh alpha evidence path',()=>{
 const source=readFileSync(new URL('./render-video.ts',import.meta.url),'utf8');
 const receiptFunction=source.slice(source.indexOf('function writeRenderResult('),source.indexOf('async function findFreePort('));
 assert.doesNotMatch(receiptFunction,/process\.exit\(/,'receipt failure must unwind rollback/finally');
 assert.match(receiptFunction,/throw new Error\(`render finished but output file is missing/);
 assert.match(source,/const evidenceDir = safeLocalPath\(process\.cwd\(\), `output\/alpha-validation\/\$\{renderResultName\(output\)\}-\$\{basename\(dirname\(staged\.temporary\)\)\}`\)/);
 assert.match(source,/validateAlphaMedia\(staged\.temporary, \{ evidenceDir,/);
 assert.match(source,/withOutputRollback\(process\.cwd\(\), metadataPaths, \(\) => \{\s*staged\.commit\(\);\s*writeRenderResult\(port, stagedProbe\)/);
});
