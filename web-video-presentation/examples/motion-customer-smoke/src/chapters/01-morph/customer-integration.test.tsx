import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {CHAPTERS} from '../../registry/chapters';
import {geometryPath, geometryBounds} from '../../video/mechanisms';
import {stateAtFrame, TRACK, PALETTE} from './model';
import {buildChapterTimingIndex, clockAtStep} from '../../video/continuity-clock';
import {STEP_TIMINGS} from '../../video/render-timing.generated';
import {VIDEO_FORMAT} from '../../config/videoFormat';

test('actual registry selects the customer module and 180-frame explicit timeline', () => {
  assert.equal(CHAPTERS.length, 1); assert.equal(CHAPTERS[0].id, 'morph');
  assert.deepEqual(CHAPTERS[0].narrations, ['', '']);
  assert.equal(STEP_TIMINGS.length, 2);
  assert.deepEqual(STEP_TIMINGS.map(s => [s.chapter,s.startFrame,s.durationInFrames,s.audio]), [['morph',0,90,null],['morph',90,90,null]]);
  assert.deepEqual([VIDEO_FORMAT.width,VIDEO_FORMAT.height,VIDEO_FORMAT.fps], [960,540,30]);
});
test('all 180 frames preserve identity, finite geometry, one entity and no background', () => {
  for(let frame=0;frame<180;frame++) {
    const state=stateAtFrame(frame);
    assert.equal(state.geometry.id,'token-01');assert.equal(state.palette,PALETTE);
    assert.deepEqual(state.geometry.points.map(p=>p.id),TRACK.from.points.map(p=>p.id));
    const b=geometryBounds(state.geometry); assert.ok(b.x>=310&&b.y>=100&&b.x+b.width<=650&&b.y+b.height<=440);
    const svg=renderToStaticMarkup(createElement(CHAPTERS[0].Component,{step:frame<90?0:1,clockScope:'chapter',chapterFrame:frame,frame:frame%90,isOverlay:true}));
    assert.equal((svg.match(/data-object-id=/g)||[]).length,1);
    assert.match(svg,/data-customer-shot="single-token"/);
    assert.doesNotMatch(svg,/stage-background|<audio|<video|<foreignObject/);
  }
});
test('chapter clock survives real step boundary and seeks are deterministic', () => {
  const index=buildChapterTimingIndex(STEP_TIMINGS);
  for(const [step,local,expected] of [[0,89,89],[1,0,90],[1,1,91]] as const){
    const clock=clockAtStep(STEP_TIMINGS[step],local,index);assert.equal(clock.chapterFrame,expected);
    const html=renderToStaticMarkup(createElement(CHAPTERS[0].Component,{step,...clock,isOverlay:true}));
    assert.match(html,new RegExp(`data-chapter-frame="${expected}"`));
    assert.ok(html.includes(geometryPath(stateAtFrame(expected).geometry)));
  }
  const frames=[179,0,60,59,61,90,89,91,120,119,121,30,150];
  const outputs=new Map(frames.map(f=>[f,JSON.stringify(stateAtFrame(f))]));
  for(const f of frames.slice().reverse()) assert.equal(JSON.stringify(stateAtFrame(f)),outputs.get(f));
});
test('morph endpoints, material switch boundaries and final hold are exact', () => {
  assert.equal(stateAtFrame(0).geometry,TRACK.from);assert.equal(stateAtFrame(30).geometry,TRACK.from);
  assert.equal(stateAtFrame(150).geometry,TRACK.to);assert.equal(stateAtFrame(179).geometry,TRACK.to);
  assert.deepEqual([59,60,61,119,120,121].map(f=>stateAtFrame(f).material),['paper','line','line','line','halftone','halftone']);
  assert.notEqual(geometryPath(stateAtFrame(60).geometry),geometryPath(stateAtFrame(120).geometry));
});
