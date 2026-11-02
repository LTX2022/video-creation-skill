import test from 'node:test';
import assert from 'node:assert/strict';
import {bothChildArgs,smokeRenderArguments,parseAlphaSampleFrames} from './render-route-args';

test('both captions go to composite only, preserving other authored flags',()=>{
 const args=['--output-mode','both','--subtitles','--captions','--preset=draft','--acknowledge-draft','--frames=0-179'];
 assert.deepEqual(bothChildArgs(args,'alpha'),['--preset=draft','--acknowledge-draft','--frames=0-179','--output-mode=alpha']);
 assert.deepEqual(bothChildArgs(args,'composite'),['--subtitles','--captions','--preset=draft','--acknowledge-draft','--frames=0-179','--output-mode=composite']);
 assert.equal(args[1],'both');
});
test('repeated equals and split mode forms cannot override selected child',()=>{
 assert.deepEqual(bothChildArgs(['--output-mode=both','--output-mode','both','--quiet'],'alpha'),['--quiet','--output-mode=alpha']);
});
test('plain both leaves unrelated path values byte-for-byte unchanged',()=>{
 assert.deepEqual(bothChildArgs(['--browser-executable','a path with spaces','--concurrency=2'],'composite'),['--browser-executable','a path with spaces','--concurrency=2','--output-mode=composite']);
});
test('smoke bounds inclusive frame end and selects mode-correct extension',()=>{
 assert.ok(smokeRenderArguments([],'alpha',180).includes('--frames=0-179'));
 assert.ok(smokeRenderArguments([],'alpha',180).includes('--output=output/smoke-alpha.mov'));
 assert.ok(smokeRenderArguments([],'opaque',1).includes('--frames=0-0'));
 assert.ok(smokeRenderArguments([],'both',300).includes('--output-mode=composite'));
});
test('invalid smoke ranges, final output overrides and alpha captions reject',()=>{
 for(const range of ['0-180','1-0','NaN','-1','1.2'])assert.throws(()=>smokeRenderArguments([`--frames=${range}`],'alpha',180));
 assert.throws(()=>smokeRenderArguments(['--output','output/full.mp4'],'opaque',180));
 assert.throws(()=>smokeRenderArguments(['--subtitles'],'alpha',180));
 assert.throws(()=>smokeRenderArguments([],'opaque',0));
});
test('smoke retains explicit iteration flags without inventing acknowledgment',()=>{
 const out=smokeRenderArguments(['--frames','2-7','--quiet','--acknowledge-draft'],'both',180);
 assert.ok(out.includes('--frames=2-7'));assert.ok(out.includes('--acknowledge-draft'));
 assert.ok(!smokeRenderArguments([],'opaque',180).includes('--acknowledge-draft'));
});

test('legacy smoke alpha alias selects MOV without leaking contradictory child flags',()=>{
 const out=smokeRenderArguments(['--alpha'],'opaque',180);
 assert.ok(out.includes('--output-mode=alpha'));assert.ok(out.includes('--output=output/smoke-alpha.mov'));assert.ok(!out.includes('--alpha'));
 assert.throws(()=>smokeRenderArguments(['--alpha','--captions'],'opaque',180));
});
test('explicit alpha sampling preserves transient output moments and rejects invalid plans',()=>{
 assert.equal(parseAlphaSampleFrames(undefined),undefined);
 assert.deepEqual(parseAlphaSampleFrames('59,10,0,10'),[0,10,59]);
 for(const x of ['', '0,-1','1.2','NaN','0, 10','99999999999999999999',Array(33).fill('0').join(',')])assert.throws(()=>parseAlphaSampleFrames(x));
});
