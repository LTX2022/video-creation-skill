/** Dependency-free deterministic scene math. No browser, I/O, clock, global cache or renderer. */
const TARGETS = Object.freeze(['cloud', 'field', 'ring']);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, p) => a + (b - a) * p;
const smooth = (p) => { const x = clamp(p); return x * x * (3 - 2 * x); };
const vector = (a, b, p) => a.map((v, i) => mix(v, b[i], p));
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const unit = (v) => { const n = Math.hypot(...v); if (n < 1e-9) throw new RangeError('camera basis is degenerate'); return v.map(x => x/n); };
function number(value, name, min = -Infinity, max = Infinity) {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`${name} must be finite within ${min}..${max}`);
  return value;
}
function point(value, name) {
  if (!Array.isArray(value) || value.length !== 3) throw new TypeError(`${name} must be a 3-vector`);
  value.forEach((v) => number(v, name)); return value;
}
function freezePoint(value) { return Object.freeze(value); }
function hash32(value) {
  let x = value >>> 0; x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b); return (x ^ (x >>> 16)) >>> 0;
}
/** Indexed randomness, not sequential random state: changing visibility cannot change another ID. */
export function randomFor(seed, id, channel = 0) {
  for (const [name, v] of Object.entries({seed, id, channel})) {
    number(v, name, 0, 0xffffffff); if (!Number.isInteger(v)) throw new RangeError(`${name} must be an integer`);
  }
  return hash32(seed ^ Math.imul(id + 1, 0x9e3779b1) ^ Math.imul(channel + 1, 0x85ebca6b)) / 4294967296;
}
export function createParticles({seed = 41021, count = 1400} = {}) {
  number(count, 'count', 1, 10000); if (!Number.isInteger(count)) throw new RangeError('count must be integer');
  randomFor(seed, 0); const side = Math.ceil(Math.sqrt(count));
  return Object.freeze(Array.from({length: count}, (_, id) => {
    const u = randomFor(seed,id,0), v = randomFor(seed,id,1), w = randomFor(seed,id,2);
    const azimuth = u * Math.PI * 2, z = v * 2 - 1, radius = Math.cbrt(w) * 1.65;
    const radial = Math.sqrt(1-z*z);
    const cloud = [Math.cos(azimuth)*radial*radius, z*radius, Math.sin(azimuth)*radial*radius];
    const x = side === 1 ? 0 : (id % side)/(side-1)*4-2;
    const zz = side === 1 ? 0 : Math.floor(id/side)/(side-1)*4-2;
    const field = [x, 0.22*Math.sin(x*2.3)*Math.cos(zz*1.8), zz];
    const theta = id/count*Math.PI*2, tube = u*Math.PI*2, r = 1.45+0.18*Math.cos(tube);
    const ring = [r*Math.cos(theta), r*Math.sin(theta), 0.18*Math.sin(tube)];
    return Object.freeze({id, radius: 0.008+randomFor(seed,id,3)*0.008, energy: 0.35+randomFor(seed,id,4)*0.65,
      targets: Object.freeze({cloud:freezePoint(cloud),field:freezePoint(field),ring:freezePoint(ring)})});
  }));
}
export function validateTimeline(timeline) {
  number(timeline.durationSeconds,'durationSeconds',0.1,600);
  if (!TARGETS.includes(timeline.initialTarget)) throw new RangeError('unknown initial target');
  if (!Array.isArray(timeline.transitions) || timeline.transitions.length > 16) throw new RangeError('transitions must be an array of at most 16');
  let previousEnd = 0;
  for (const item of timeline.transitions) {
    number(item.start,'transition.start',previousEnd,timeline.durationSeconds);
    number(item.end,'transition.end',item.start,timeline.durationSeconds);
    if (item.end <= item.start || !TARGETS.includes(item.to)) throw new RangeError('transition requires positive duration and known target');
    previousEnd = item.end;
  }
  return true;
}
/** One authored timeline, not three local shot clocks. Holds retain the preceding target. */
export function createPreset({seed = 41021, count = 1400, durationSeconds = 12} = {}) {
  number(durationSeconds,'durationSeconds',0.1,600);
  const transitions = Object.freeze([
    Object.freeze({start:durationSeconds*0.18,end:durationSeconds*0.43,to:'field'}),
    Object.freeze({start:durationSeconds*0.60,end:durationSeconds*0.85,to:'ring'}),
  ]);
  const cameraKeys = Object.freeze([
    [0,[0.1,0.35,6.0],[0,0,0]], [durationSeconds*0.43,[1.5,2.6,5.5],[0,0,0]],
    [durationSeconds*0.85,[-0.55,0.5,5.2],[0,0,0]], [durationSeconds,[-0.3,0.3,5.0],[0,0,0]],
  ].map(([at,position,target]) => Object.freeze({at,position:freezePoint(position),target:freezePoint(target)})));
  const preset = Object.freeze({seed,count,durationSeconds,initialTarget:'cloud',transitions,cameraKeys,particles:createParticles({seed,count})});
  validateTimeline(preset); return preset;
}
export function morphPosition(particle, seconds, timeline) {
  number(seconds,'seconds',0); let from = timeline.initialTarget;
  for (const item of timeline.transitions) {
    if (seconds < item.start) return [...particle.targets[from]];
    if (seconds <= item.end) return vector(particle.targets[from],particle.targets[item.to],smooth((seconds-item.start)/(item.end-item.start)));
    from = item.to;
  }
  return [...particle.targets[from]];
}
export function cameraAtTime(seconds, keys) {
  number(seconds,'seconds',0);
  if (!Array.isArray(keys) || !keys.length) throw new RangeError('camera needs keyframes');
  let previous = -1;
  for (const key of keys) {
    number(key.at,'camera key time',0); if (key.at <= previous) throw new RangeError('camera key times must increase');
    point(key.position,'camera position'); point(key.target,'camera target'); previous = key.at;
  }
  let a=keys[0], b=a, p=0;
  if (seconds >= keys.at(-1).at) a=b=keys.at(-1);
  else for (let i=1;i<keys.length;i++) if (seconds <= keys[i].at) { a=keys[i-1]; b=keys[i]; p=smooth((seconds-a.at)/(b.at-a.at)); break; }
  return {position:vector(a.position,b.position,p),target:vector(a.target,b.target,p),up:[0,1,0],fov:44,near:0.05,far:100};
}
/** Positive view depth points toward target. FOV is vertical; returned raster y points downward. */
export function perspectiveCamera(camera, {width, height}) {
  number(width,'width',1,16384); number(height,'height',1,16384);
  const position = [...point(camera.position,'position')], target = point(camera.target,'target'), up=point(camera.up??[0,1,0],'up');
  number(camera.fov,'fov',1,179); number(camera.near,'near',0.000001); number(camera.far,'far',camera.near);
  if(camera.far <= camera.near) throw new RangeError('far must exceed near');
  const forward=unit(sub(target,position)), right=unit(cross(forward,up)), vertical=unit(cross(right,forward));
  return {position,forward,right,vertical,width,height,near:camera.near,far:camera.far,focal:height/(2*Math.tan(camera.fov*Math.PI/360))};
}
export function projectPoint(world, camera) {
  point(world,'world point'); const delta=sub(world,camera.position), depth=dot(delta,camera.forward);
  if(depth < camera.near || depth > camera.far) return null;
  const scale=camera.focal/depth;
  return {x:camera.width/2+dot(delta,camera.right)*scale,y:camera.height/2-dot(delta,camera.vertical)*scale,depth,scale};
}
/** Far-to-near painter order, with stable ID ties. Does not mutate the input. */
export function depthOrder(items) {
  for(const item of items) { number(item.depth,'depth',0); number(item.id,'id',0); }
  return [...items].sort((a,b) => b.depth-a.depth || a.id-b.id);
}
export function sceneAtFrame(preset, frame, fps, viewport) {
  number(frame,'frame',0); number(fps,'fps',0.000001,240);
  // Canonical nanosecond resolution makes equivalent physical times agree across fps.
  const seconds=Math.round(clamp(frame/fps,0,preset.durationSeconds)*1e9)/1e9;
  const camera=cameraAtTime(seconds,preset.cameraKeys), projection=perspectiveCamera(camera,viewport);
  const particles=preset.particles.map(p => ({id:p.id,position:morphPosition(p,seconds,preset),radius:p.radius,energy:p.energy}));
  const projected=[];
  for(const p of particles) { const q=projectPoint(p.position,projection); if(q) projected.push({id:p.id,...q,radius:p.radius*q.scale,energy:p.energy}); }
  const transition=preset.transitions.find(t=>seconds>=t.start&&seconds<t.end);
  const settled=[...preset.transitions].reverse().find(t=>seconds>=t.end)?.to??preset.initialTarget;
  return {seconds,stage:transition?`morph-to-${transition.to}`:`hold-${settled}`,camera,particles,drawList:depthOrder(projected)};
}
