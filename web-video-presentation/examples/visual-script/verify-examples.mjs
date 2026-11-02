// Offline fixture/model checks only. Does not render or validate real footage/audio.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const f=JSON.parse(fs.readFileSync(new URL('./facts.json',import.meta.url),'utf8'));
test('workflow: normalize teaching dates; flag duplicates without deletion',()=>{
  const normalized=f.workflow.records.map(r=>({...r,date:r.date.replaceAll('/','-')}));
  const review=normalized.filter(r=>normalized.some(s=>s.id!==r.id && s.date===r.date && s.amount===r.amount && s.unit===r.unit)).map(r=>r.id);
  assert.deepEqual(review,f.workflow.expectedReviewIds);
  assert.deepEqual(f.workflow.expectedDeletedIds,[]);
  assert.equal(normalized.length,3);
});
test('data: equal windows and difference share the fixture',()=>{
  assert.equal(f.data.windowDays[0],f.data.windowDays[1]);
  assert.equal(f.data.orders[1]-f.data.orders[0],f.data.expectedDelta);
  assert.equal(f.data.unit,'单');
});
test('cache: matching key AND strictly before expiry; boundary is miss',()=>{
  for(const p of f.cache.probes) assert.equal(p.key===f.cache.key && p.now<f.cache.expiresAt,p.expectedHit);
});
test('silent overlay: explicit planned frames, no manufactured speech or plate evidence',()=>{
  const o=f.overlay; assert.equal(o.audioRequested,false);
  assert.ok(o.narrations.every(n=>n===''));
  assert.deepEqual(o.plannedStepFrames,o.estimatedSeconds.map(s=>s*o.fps));
  assert.equal(o.plateStatus,'missing'); assert.equal(o.eventBinding,'pending-real-plate');
});
test('all four durations remain estimates, never measured audio',()=>{
  for(const k of ['workflow','data','cache','overlay']){
    assert.equal(f[k].audioMeasuredSeconds,null);
    assert.ok(f[k].estimatedSeconds.every(s=>Number.isFinite(s)&&s>0));
  }
});
