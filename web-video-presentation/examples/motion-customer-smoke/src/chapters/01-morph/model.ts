import {prepareMorph, morphAtFrame, materialState, type MaterialKind, type MaterialPalette} from '../../video/mechanisms';
export const FPS = 30;
export const DURATION_IN_FRAMES = 180;
export const PALETTE: MaterialPalette = Object.freeze({id: 'customer-dual-tone-v1', base: '#F4EAD9', ink: '#174A5B', highlight: '#FFFFFF'});
export const TRACK = prepareMorph({id: 'token-01',
  from: Array.from({length: 64}, (_, i) => ({x: 480 + 138 * Math.cos(-Math.PI / 2 + i * Math.PI / 32), y: 270 + 138 * Math.sin(-Math.PI / 2 + i * Math.PI / 32)})),
  to: [{x:480,y:104},{x:646,y:270},{x:480,y:436},{x:314,y:270}],
  pointCount: 96, startFrame: 30, endFrame: 150});
export function stateAtFrame(frame: number) {
  const material: MaterialKind = frame < 60 ? 'paper' : frame < 120 ? 'line' : 'halftone';
  return materialState(morphAtFrame(TRACK, frame), PALETTE, material, 'customer-token-01-v1');
}
