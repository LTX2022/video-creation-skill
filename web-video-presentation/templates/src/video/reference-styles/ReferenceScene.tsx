import type {JSX} from 'react';
import type {PresetContent, PresetSceneProps} from '../presets/types';
import type {ReferenceStyleProps} from './common';
import {ParticleField} from './ParticleField';
import {SpectralMaterial} from './SpectralMaterial';
import {KineticWireframe} from './KineticWireframe';
import {RainPlatform} from './RainPlatform';

/** Complete authored scenes: do not place these SVGs inside the legacy subject box. */
export const REFERENCE_STYLE_IDS = ['particle-depth-film','spectral-material-film','kinetic-wireframe-film','rain-platform-film'] as const;
export type ReferenceStyleId = typeof REFERENCE_STYLE_IDS[number];
const scenes: Record<ReferenceStyleId,(props:ReferenceStyleProps)=>JSX.Element> = {
  'particle-depth-film':ParticleField,
  'spectral-material-film':SpectralMaterial,
  'kinetic-wireframe-film':KineticWireframe,
  'rain-platform-film':RainPlatform,
};
/** Source-confirmed opening/action and action/hold thresholds; not invented equal thirds. */
export const REFERENCE_SEMANTIC_ANCHORS: Record<ReferenceStyleId, readonly [number,number]> = {
  'particle-depth-film':[.18,.64],
  'spectral-material-film':[.15,.86],
  'kinetic-wireframe-film':[.15,.86],
  'rain-platform-film':[.19,.79],
};
export function ReferenceScene(props:PresetSceneProps & {content:PresetContent}) {
  if (!Object.hasOwn(scenes,props.presetId)) throw new Error(`Unknown reference scene: ${props.presetId}`);
  const {width,height,frame,fps,durationInFrames}=props;
  if (![width,height,fps,durationInFrames].every(n=>Number.isFinite(n)&&n>0)||durationInFrames<1||!Number.isFinite(frame)) throw new RangeError('Reference scenes require finite frame and positive dimensions, fps and duration');
  const id=props.presetId as ReferenceStyleId, Scene=scenes[id];
  return <Scene {...props} semanticAnchors={REFERENCE_SEMANTIC_ANCHORS[id]}/>;
}
