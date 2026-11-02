// Node >=22.18 native type stripping; no packages/browser needed. Numerical + adapter tests,
// NOT visual quality, browser rendering or delivery acceptance.
import assert from 'node:assert/strict';
import test from 'node:test';
import { averageRgbaSamples, planTemporalSamples, renderTemporalCanvas } from '../src/video/temporal-sampling.ts';

const options = {durationInFrames: 90, enabled: true, samples: 5};
test('default disabled; bounded symmetric deterministic fractional samples', () => {
  assert.deepEqual(planTemporalSamples(10, {durationInFrames: 90}).frames, [10]);
  const plan = planTemporalSamples(10, options);
  assert.equal(plan.mode, 'temporal');
  assert.equal(plan.frames.length, 5);
  assert.ok(plan.frames[0] < 10 && plan.frames[4] > 10);
  assert.equal(plan.frames.reduce((a,b)=>a+b,0)/5, 10);
  assert.deepEqual(planTemporalSamples(10, options), plan);
  assert.ok(planTemporalSamples(0, options).frames.every(f=>f>=0));
  assert.ok(planTemporalSamples(89, options).frames.every(f=>f<=89));
  assert.ok(planTemporalSamples(20, {...options,minFrame:20,maxFrame:45}).frames.every(f=>f>=20));
  assert.equal(planTemporalSamples(10, {...options,shutterFraction:0}).reason,'zero-shutter');
  assert.deepEqual(planTemporalSamples(10, {...options,samples:1}).frames,[10]);
});
test('reject invalid timing, sample explosions and contradictory cuts', () => {
  for (const extra of [{samples:0},{samples:9},{samples:2.2},{shutterFraction:NaN},
    {shutterFraction:2},{durationInFrames:0},{minFrame:11},{maxFrame:5},{maxFrame:99}]) {
    assert.throws(()=>planTemporalSamples(10,{...options,...extra}),RangeError);
  }
  assert.throws(()=>planTemporalSamples(NaN,options),RangeError);
});
test('premultiplied average preserves Alpha and ignores transparent hidden RGB', () => {
  const red = new Uint8ClampedArray([255,0,0,255]);
  const hiddenBlue = new Uint8ClampedArray([0,0,255,0]);
  assert.deepEqual([...averageRgbaSamples([red,hiddenBlue])],[255,0,0,128]);
  assert.deepEqual([...averageRgbaSamples([hiddenBlue,hiddenBlue])],[0,0,0,0]);
  assert.deepEqual([...red],[255,0,0,255]);
  const still=new Uint8ClampedArray([37,190,84,117]);
  assert.deepEqual(averageRgbaSamples(Array(8).fill(still)),still);
  assert.deepEqual([...averageRgbaSamples([red,new Uint8ClampedArray([0,0,255,255])])],[128,0,128,255]);
  assert.throws(()=>averageRgbaSamples([red,new Uint8ClampedArray(8)]),RangeError);
  assert.throws(()=>averageRgbaSamples([]),RangeError);
});

// Minimal pixel context test double. Browser pixel/encoder checks remain separate.
class Canvas {
  height=1; _width=2; pixels=new Uint8ClampedArray(8); failRead=null;
  context={
    getImageData:()=> {if(this.failRead) throw this.failRead; return {data:this.pixels.slice()};},
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    putImageData:({data})=>{this.pixels.set(data);},
  };
  get width(){return this._width;}
  set width(w){this._width=w;this.pixels=new Uint8ClampedArray(w*this.height*4);}
  getContext(){return this.context;}
}
test('adapter evaluates distinct subframes and integrates a moving opaque pixel', () => {
  const target=new Canvas(), scratch=new Canvas(), observed=[];
  const draw=(ctx,f)=>{
    observed.push(f);
    const canvas=ctx===target.context?target:scratch;
    const pos=f<10?0:4;
    canvas.pixels.set([255,0,0,255],pos);
  };
  const result=renderTemporalCanvas(target,draw,10,{...options,samples:2,createCanvas:()=>scratch});
  assert.equal(result.mode,'temporal');
  assert.equal(new Set(observed).size,2);
  assert.deepEqual([...target.pixels],[255,0,0,128,255,0,0,128]);
  const pixels=target.pixels.slice();
  renderTemporalCanvas(target,draw,5,{...options,createCanvas:()=>scratch});
  renderTemporalCanvas(target,draw,10,{...options,samples:2,createCanvas:()=>scratch});
  assert.deepEqual(target.pixels,pixels); // out-of-order seeks have no accumulated trail
});
test('disabled, unsupported readback and pixel budget render sharp with explicit reasons', () => {
  const target=new Canvas(), scratch=new Canvas();
  let frames=[];
  const draw=(_ctx,f)=>{frames.push(f);};
  assert.equal(renderTemporalCanvas(target,draw,10,{durationInFrames:90}).mode,'single');
  assert.deepEqual(frames,[10]); frames=[];
  assert.equal(renderTemporalCanvas(target,draw,10,{...options,maxPixels:1}).reason,'pixel-budget');
  assert.deepEqual(frames,[10]); frames=[];
  scratch.failRead=Object.assign(new Error('tainted'),{name:'SecurityError'});
  const result=renderTemporalCanvas(target,draw,10,{...options,createCanvas:()=>scratch});
  assert.equal(result.mode,'fallback');
  assert.equal(result.reason,'pixel-readback-SecurityError');
  assert.equal(frames.at(-1),10);
  assert.deepEqual(result.sampleFrames,[10]);
});
test('application errors are not silently downgraded; input is not output canvas', () => {
  const target=new Canvas();
  assert.throws(()=>renderTemporalCanvas(target,()=>{throw new Error('drawing bug');},10,
    {...options,createCanvas:()=>new Canvas()}),/drawing bug/);
  assert.throws(()=>renderTemporalCanvas(target,()=>{},10,
    {...options,createCanvas:()=>target}),/separate/);
});
