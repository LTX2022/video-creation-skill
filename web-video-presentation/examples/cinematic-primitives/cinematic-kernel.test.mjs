import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomFor,createParticles,createPreset,validateTimeline,morphPosition,cameraAtTime,perspectiveCamera,projectPoint,depthOrder,sceneAtFrame} from './cinematic-kernel.mjs';
const viewport={width:1280,height:720};
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
const camera={position:[0,0,5],target:[0,0,0],up:[0,1,0],fov:60,near:0.1,far:10};

test('same seed/count gives stable geometry/IDs; a new seed changes geometry',()=>{
 const a=createParticles({seed:42,count:50});assert.deepEqual(a,createParticles({seed:42,count:50}));
 assert.notDeepEqual(a,createParticles({seed:43,count:50}));
 assert.deepEqual(a.map(p=>p.id),Array.from({length:50},(_,i)=>i));
 assert.deepEqual(a.slice(0,10).map(p=>p.targets.cloud),createParticles({seed:42,count:10}).map(p=>p.targets.cloud));
 assert(Object.isFrozen(a)&&Object.isFrozen(a[0].targets.cloud));
 assert.equal(randomFor(42,8,2),randomFor(42,8,2));
});
test('all morph endpoints and final hold equal their authored geometry',()=>{
 const preset=createPreset({count:15});const p=preset.particles[4];
 assert.deepEqual(morphPosition(p,0,preset),p.targets.cloud);
 let previous='cloud';for(const t of preset.transitions){
  assert.deepEqual(morphPosition(p,t.start,preset),p.targets[previous]);
  morphPosition(p,t.end,preset).forEach((v,i)=>near(v,p.targets[t.to][i]));previous=t.to;
 }
 assert.deepEqual(morphPosition(p,12,preset),p.targets.ring);
});
test('one global timeline retains all IDs and has no shot-boundary jumps',()=>{
 const preset=createPreset({count:30});const dt=1e-6;
 for(const t of preset.transitions) for(const boundary of [t.start,t.end]){
  const a=sceneAtFrame(preset,(boundary-dt)*30,30,viewport), b=sceneAtFrame(preset,(boundary+dt)*30,30,viewport);
  assert.deepEqual(a.particles.map(p=>p.id),b.particles.map(p=>p.id));
  for(let i=0;i<a.particles.length;i++)assert(Math.hypot(...a.particles[i].position.map((v,j)=>v-b.particles[i].position[j]))<1e-6);
  assert(Math.hypot(...a.camera.position.map((v,j)=>v-b.camera.position[j]))<1e-5);
 }
 assert.equal(sceneAtFrame(preset,0,30,viewport).stage,'hold-cloud');
 assert.equal(sceneAtFrame(preset,180,30,viewport).stage,'hold-field');
 assert.equal(sceneAtFrame(preset,359,30,viewport).stage,'hold-ring');
});
test('out-of-order seeks and repeated same frames have no memory; inputs stay immutable',()=>{
 const preset=createPreset({count:50});const before=JSON.stringify(preset), baseline=sceneAtFrame(preset,163,30,viewport);
 for(const frame of [359,0,70,163,20,163])sceneAtFrame(preset,frame,30,viewport);
 assert.deepEqual(sceneAtFrame(preset,163,30,viewport),baseline);assert.equal(JSON.stringify(preset),before);
 baseline.particles[0].position[0]=999;assert.notEqual(sceneAtFrame(preset,163,30,viewport).particles[0].position[0],999);
});
test('equal physical time at 24, 30, 60 and 120 fps gives exactly equal models',()=>{
 const preset=createPreset({count:40});
 for(const t of [0,0.7,2.16,3.2,5.16,7.2,9.5,10.2,11.9]){
  const expected=sceneAtFrame(preset,t*30,30,viewport);
  for(const fps of [24,60,120])assert.deepEqual(sceneAtFrame(preset,t*fps,fps,viewport),expected);
 }
 assert.deepEqual(sceneAtFrame(preset,999,30,viewport),sceneAtFrame(preset,360,30,viewport));
});
test('perspective center, vertical convention and near/far-plane clipping',()=>{
 const projection=perspectiveCamera(camera,viewport), center=projectPoint([0,0,0],projection);
 near(center.x,640);near(center.y,360);assert(projectPoint([1,0,0],projection).x>640);assert(projectPoint([0,1,0],projection).y<360);
 assert.equal(projectPoint([0,0,5],projection),null);assert.equal(projectPoint([0,0,6],projection),null);
 assert.equal(projectPoint([0,0,4.95],projection),null);assert.equal(projectPoint([0,0,-6],projection),null);
 assert(projectPoint([0,0,4.8],projection));assert(projectPoint([0,0,-4],projection));
 const atOrigin=perspectiveCamera({...camera,position:[0,0,0],target:[0,0,-1]},viewport);
 assert(projectPoint([0,0,-0.1],atOrigin));assert(projectPoint([0,0,-10],atOrigin));
 assert.equal(projectPoint([0,0,-0.099],atOrigin),null);assert.equal(projectPoint([0,0,-10.001],atOrigin),null);
 assert(projectPoint([1,0,-2],atOrigin).scale>projectPoint([1,0,-4],atOrigin).scale);
 const wide=projectPoint([1,0,0],perspectiveCamera(camera,{width:2560,height:720}));
 near(wide.x-1280,projectPoint([1,0,0],projection).x-640);
});
test('depth sorting is far-to-near, ID-stable at equal depth, and non-mutating',()=>{
 const items=[{id:4,depth:3},{id:2,depth:7},{id:1,depth:3}];const before=JSON.stringify(items);
 assert.deepEqual(depthOrder(items).map(x=>x.id),[2,1,4]);assert.equal(JSON.stringify(items),before);
});
test('all frames have finite world/camera/projected numbers and stable count',()=>{
 const preset=createPreset({count:75});
 for(let frame=0;frame<360;frame++){
  const s=sceneAtFrame(preset,frame,30,viewport);assert.equal(s.particles.length,75);
  for(const p of s.particles)assert(p.position.every(Number.isFinite));
  for(const p of s.drawList)for(const key of ['x','y','depth','scale','radius','energy'])assert(Number.isFinite(p[key]));
  for(let i=1;i<s.drawList.length;i++)assert(s.drawList[i-1].depth>=s.drawList[i].depth);
 }
});
test('invalid counts/seeds/times/fps/viewports fail explicitly',()=>{
 for(const count of [0,-1,1.1,10001,NaN,Infinity,'50'])assert.throws(()=>createPreset({count}));
 for(const seed of [-1,1.1,4294967296,NaN,Infinity])assert.throws(()=>createPreset({seed}));
 for(const durationSeconds of [0,601,NaN,Infinity])assert.throws(()=>createPreset({durationSeconds}));
 const p=createPreset({count:1});
 for(const fps of [0,-1,NaN,Infinity,241])assert.throws(()=>sceneAtFrame(p,0,fps,viewport));
 for(const frame of [-1,NaN,Infinity])assert.throws(()=>sceneAtFrame(p,frame,30,viewport));
 for(const width of [0,-1,NaN,Infinity,16385])assert.throws(()=>perspectiveCamera(camera,{...viewport,width}));
});
test('invalid camera bases/projection ranges and nonfinite world points are rejected',()=>{
 for(const edit of [{position:[0,0,0]},{up:[0,0,1]},{fov:0},{fov:180},{near:0},{near:20},{far:0},{position:[NaN,0,0]}])assert.throws(()=>perspectiveCamera({...camera,...edit},viewport));
 assert.throws(()=>projectPoint([NaN,0,0],perspectiveCamera(camera,viewport)));
 assert.throws(()=>depthOrder([{id:0,depth:NaN}]));assert.throws(()=>cameraAtTime(1,[]));
 assert.throws(()=>cameraAtTime(1,[{at:1,position:[0,0,1],target:[0,0,0]},{at:1,position:[0,0,1],target:[0,0,0]}]));
});
test('invalid/overlapping timeline ranges and unknown target names fail validation',()=>{
 const base={durationSeconds:12,initialTarget:'cloud',transitions:[]};assert.equal(validateTimeline(base),true);
 for(const transitions of [[{start:2,end:2,to:'field'}],[{start:-1,end:2,to:'field'}],[{start:0,end:13,to:'ring'}],[{start:0,end:2,to:'unknown'}],[{start:0,end:3,to:'field'},{start:2,end:4,to:'ring'}]])assert.throws(()=>validateTimeline({...base,transitions}));
 assert.throws(()=>validateTimeline({...base,initialTarget:'unknown'}));
});
test('source has no ambient side effects or imports',()=>{
 const source=readFileSync(new URL('./cinematic-kernel.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\b(?:import|setTimeout|setInterval|requestAnimationFrame|fetch|window|document|process|console)\b/);
 assert.doesNotMatch(source,/Date\.now|Math\.random/);
});
