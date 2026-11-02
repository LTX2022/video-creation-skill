export type Vec3 = readonly [number,number,number];
export type Target = 'cloud'|'field'|'ring';
export interface Particle {readonly id:number;readonly radius:number;readonly energy:number;readonly targets:Readonly<Record<Target,Vec3>>}
export interface Transition {readonly start:number;readonly end:number;readonly to:Target}
export interface Timeline {readonly durationSeconds:number;readonly initialTarget:Target;readonly transitions:readonly Transition[]}
export interface CameraKey {readonly at:number;readonly position:Vec3;readonly target:Vec3}
export interface Camera {position:Vec3;target:Vec3;up?:Vec3;fov:number;near:number;far:number}
export interface Viewport {width:number;height:number}
export interface Projection extends Viewport {position:Vec3;forward:Vec3;right:Vec3;vertical:Vec3;near:number;far:number;focal:number}
export interface Projected {x:number;y:number;depth:number;scale:number}
export interface Preset extends Timeline {readonly seed:number;readonly count:number;readonly particles:readonly Particle[];readonly cameraKeys:readonly CameraKey[]}
export interface Scene {seconds:number;stage:string;camera:Camera;particles:{id:number;position:Vec3;radius:number;energy:number}[];drawList:(Projected&{id:number;radius:number;energy:number})[]}
export function randomFor(seed:number,id:number,channel?:number):number;
export function createParticles(options?:{seed?:number;count?:number}):readonly Particle[];
export function validateTimeline(timeline:Timeline):true;
export function createPreset(options?:{seed?:number;count?:number;durationSeconds?:number}):Preset;
export function morphPosition(particle:Particle,seconds:number,timeline:Timeline):Vec3;
export function cameraAtTime(seconds:number,keys:readonly CameraKey[]):Camera;
export function perspectiveCamera(camera:Camera,viewport:Viewport):Projection;
export function projectPoint(world:Vec3,camera:Projection):Projected|null;
export function depthOrder<T extends {id:number;depth:number}>(items:readonly T[]):T[];
export function sceneAtFrame(preset:Preset,frame:number,fps:number,viewport:Viewport):Scene;
