#!/usr/bin/env node
// Synthetic fixtures only; no actual approval, models, images or rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkBatchInput} from './check-batch-input.mjs';
const sha = s => createHash('sha256').update(s).digest('hex');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'batch-input-')); t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  for (const name of ['design.txt','sample.txt','feedback.txt','asset.txt']) fs.writeFileSync(path.join(root,name),`synthetic ${name}`);
  const file = name => ({path:name,sha256:sha(fs.readFileSync(path.join(root,name)))});
  const lock = {schema:1,id:'demo',anchor:{sample:file('sample.txt'),feedback:file('feedback.txt'),decisionReference:'synthetic test; not real approval'},
    frozenFiles:[{...file('design.txt'),roles:['template','composition','components','timing','style','config']}],
    fields:[{name:'title',kind:'text',required:true,maxCodePoints:25,maxLines:1,requiredText:['仅限','kg']},
      {name:'image',kind:'asset',required:false,allowedAssets:['hero']}], assets:[{id:'hero',...file('asset.txt')}]};
  const input = {schema:1,lockId:'demo',items:[{id:'one',content:{title:'仅限10 kg',image:'hero'}},{id:'two',content:{title:'仅限20 kg'}}]};
  const run = (expected) => { const lockBytes = Buffer.from(JSON.stringify(lock)); return checkBatchInput({root,lockBytes,input,expectedLockSha256:expected ?? sha(lockBytes)}); };
  return {root,lock,input,run};
}
test('valid inputs are never called rendered, approved or ready; optional fields may be omitted', t => {
  const f=fixture(t), r=f.run(); assert.equal(r.status,'input-valid-review-required'); assert.equal(r.rendered,false); assert.equal(r.humanApprovalVerified,false); assert.equal(r.errors.length,0);
});
test('overflow blocks item and batch, never silently edits text', t => {
  const f=fixture(t); f.input.items[0].content.title='仅限'+'长'.repeat(30)+'kg'; const before=JSON.stringify(f.input),r=f.run();
  assert.equal(r.status,'invalid'); assert.equal(r.items[0].status,'blocked'); assert.equal(r.items[1].status,'input-valid-review-required');
  assert.ok(r.errors.some(e=>e.code==='blocked_content_overflow'&&e.itemId==='one'&&e.action)); assert.equal(JSON.stringify(f.input),before);
});
test('units and conditions cannot disappear', t => {const f=fixture(t); f.input.items[0].content.title='10 kg'; assert.ok(f.run().errors.some(e=>e.code==='required_text_missing'));});
test('unknown instructions, secondary labels and nested content fail closed', t => {
  for(const [key,value] of [['fontSize',12],['slogan','更高级'],['title',{text:'仅限10 kg'}]]) {const f=fixture(t); f.input.items[0].content[key]=value; assert.equal(f.run().status,'invalid');}
});
test('missing local assets, unregistered IDs and tampered design fail', t => {
  const f=fixture(t); f.input.items[0].content.image='remote-url'; assert.equal(f.run().status,'invalid'); delete f.input.items[0].content.image;
  fs.unlinkSync(path.join(f.root,'asset.txt')); assert.equal(f.run().status,'invalid');
  fs.writeFileSync(path.join(f.root,'design.txt'),'changed font'); assert.ok(f.run().errors.some(e=>e.code==='frozen_file_changed'));
});
test('reviewer-held lock digest rejects altered lock', t => {const f=fixture(t); const old=sha(JSON.stringify(f.lock)); f.lock.fields[0].maxCodePoints=1000; assert.equal(f.run(old).status,'invalid');});
test('absent anchor is pending; approved flag is not a substitute', t => {
  const f=fixture(t); f.lock.anchor=null; assert.equal(f.run().status,'pending-anchor-review'); f.lock.anchor={approved:true}; assert.equal(f.run().status,'invalid');
});
test('anchor file hash changes invalidate the input check', t=>{const f=fixture(t); fs.writeFileSync(path.join(f.root,'feedback.txt'),'revoked'); assert.equal(f.run().status,'invalid');});
test('duplicates, missing fields, hidden characters, explicit lines fail', t => {
  for(const change of [f=>f.input.items[1].id='one',f=>delete f.input.items[0].content.title,f=>f.input.items[0].content.title='仅限\u200b10 kg',f=>f.input.items[0].content.title='仅限\n10 kg']) {const f=fixture(t); change(f); assert.equal(f.run().status,'invalid');}
});
test('unsafe paths and symlink files are rejected',t=>{const f=fixture(t); f.lock.assets[0].path='../escape'; assert.equal(f.run().status,'invalid'); fs.symlinkSync('design.txt',path.join(f.root,'link')); f.lock.assets[0].path='link'; assert.equal(f.run().status,'invalid');});
test('malformed schema and types report errors without throwing',t=>{
  for(const value of [null,[],{}, {schema:1,id:'bad',anchor:null,frozenFiles:[null],fields:[null],assets:[null]}]) {const f=fixture(t); const lockBytes=Buffer.from(JSON.stringify(value)); assert.equal(checkBatchInput({root:f.root,lockBytes,input:null,expectedLockSha256:sha(lockBytes)}).status,'invalid');}
});
test('CLI exits 0/1/2 only for input-valid/invalid/pending and writes no project files',t=>{
  const f=fixture(t), script=fileURLToPath(new URL('./check-batch-input.mjs',import.meta.url));
  function cli(expected){const bytes=JSON.stringify(f.lock); fs.writeFileSync(path.join(f.root,'lock.json'),bytes); fs.writeFileSync(path.join(f.root,'input.json'),JSON.stringify(f.input)); const before=fs.readdirSync(f.root); const r=spawnSync(process.execPath,[script,f.root,'lock.json','input.json',sha(bytes)],{encoding:'utf8'}); assert.equal(r.status,expected,r.stderr+r.stdout); assert.deepEqual(fs.readdirSync(f.root),before);}
  cli(0); f.lock.anchor=null; cli(2); f.input.items[0].content.slogan='extra'; cli(1);
});
