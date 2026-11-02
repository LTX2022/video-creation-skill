import test from 'node:test';
import assert from 'node:assert/strict';
import {compileObjectTrack,objectAt} from './object-track';
import {bindChapterEvents,progressAt,firstFrameAt,buildChapterTimingIndex,actionsIn} from './continuity-clock';
import {handoffModel} from '../examples/object-handoff/model';
const events={move:{startFrame:10,endFrame:20},focus:{startFrame:30,endFrame:40},color:{startFrame:15,endFrame:25}};
const track=compileObjectTrack({objectId:'core',initial:{x:0,size:10},actions:[{event:'move',to:{x:100}},{event:'focus',to:{x:200}},{event:'color',to:{size:20}}]},events);
test('endpoint inheritance, hold, simultaneous independent channels, stable identity and random seek',()=>{
 assert.deepEqual(objectAt(track,25),{objectId:'core',pose:{x:100,size:20}});
 assert.equal(objectAt(track,35).pose.x,150);
 assert.equal(objectAt(track,18).objectId,'core');
 assert.equal(objectAt(track,35).pose.x,150);
 assert.equal(objectAt(track,100).pose.x,200);
 assert.equal(objectAt(track,-1).pose.x,0);
});
test('invalid event/channel, overlap, NaN and reversed time fail, zero event is explicit step',()=>{
 assert.throws(()=>compileObjectTrack({objectId:'x',initial:{x:0},actions:[{event:'oops',to:{x:2}}]},events));
 assert.throws(()=>compileObjectTrack({objectId:'x',initial:{x:0},actions:[{event:'move',to:{bad:2}}]},events));
 assert.throws(()=>compileObjectTrack({objectId:'x',initial:{x:0},actions:[{event:'move',to:{x:2}},{event:'color',to:{x:3}}]},events));
 for(const w of [{startFrame:NaN,endFrame:20},{startFrame:20,endFrame:0},{startFrame:0,endFrame:Infinity}]) assert.throws(()=>progressAt(10,w));
 assert.equal(progressAt(10,{startFrame:10,endFrame:10}),1);
 assert.equal(progressAt(9.9,{startFrame:10,endFrame:10}),0);
 assert.throws(()=>actionsIn(events.move,1,'typo' as 'after'));
});
test('fractional visual anchors preserved; integer event onset is ceil, never another timeline',()=>{
 const event=bindChapterEvents([{stepIndex:0,startFrame:0,durationInFrames:31}],{a:{start:{step:0,at:0.5},end:{step:0,at:1}}}).a;
 assert.equal(event.startFrame,15.5);assert.equal(firstFrameAt(event.startFrame),16);
 assert.equal(progressAt(15.5,event),0);assert.ok(progressAt(15.75,event)>0);
});
test('overlapping chapter steps fail; gaps remain clock time',()=>{
 const a={chapter:'a',stepIndex:0,startFrame:0,durationInFrames:60};
 assert.throws(()=>buildChapterTimingIndex([a,{...a,stepIndex:1,startFrame:50}]));
 assert.equal(buildChapterTimingIndex([a,{...a,stepIndex:1,startFrame:70}]).get('a')!.chapterDurationInFrames,130);
});
test('handoff keeps exact pose over step boundary and retimes with actual uneven steps',()=>{
 const steps=[{stepIndex:0,startFrame:0,durationInFrames:80},{stepIndex:1,startFrame:80,durationInFrames:130},{stepIndex:2,startFrame:210,durationInFrames:90}];
 const model=handoffModel(steps);
 assert.equal(model(79).core.objectId,model(80).core.objectId);
 assert.ok(Math.abs(model(79).core.pose.x!-model(80).core.pose.x!)<10);
 assert.equal(model(299).core.pose.x,600);
 const changed=handoffModel([{...steps[0]!,durationInFrames:160},{...steps[1]!,startFrame:160},{...steps[2]!,startFrame:290}]);
 assert.notDeepEqual(changed(90),model(90));
 const value=model(121.25);model(0);assert.deepEqual(model(121.25),value);
});

test('inherited Object.prototype names are not declared pose channels',()=>{
 for(const key of ['toString','constructor','valueOf']) assert.throws(()=>compileObjectTrack({objectId:'x',initial:{x:0},actions:[{event:'move',to:{[key]:2}}]},events),/Unknown pose channel/);
});

test('extreme finite pose endpoints interpolate without NaN or Infinity', () => {
  for (const [from, to] of [[-Number.MAX_VALUE, Number.MAX_VALUE], [Number.MAX_VALUE, -Number.MAX_VALUE], [Number.MAX_VALUE, Number.MAX_VALUE / 2], [-Number.MAX_VALUE, -Number.MAX_VALUE / 2]]) {
    for (const easing of ['linear', 'smooth'] as const) {
      const track = compileObjectTrack({ objectId: 'extreme', initial: { x: from! }, actions: [{ event: 'move', to: { x: to! }, easing }] }, { move: { startFrame: 0, endFrame: 10 } });
      assert.equal(objectAt(track, 0).pose.x, from);
      assert.equal(objectAt(track, 10).pose.x, to);
      for (const frame of [9.9, 0.1, 5, 2.5, 7.5, 5]) {
        const x = objectAt(track, frame).pose.x!;
        assert.ok(Number.isFinite(x));
        assert.ok(x >= Math.min(from!, to!) && x <= Math.max(from!, to!));
      }
      if (from === -to!) assert.equal(objectAt(track, 5).pose.x, 0);
    }
  }
});
