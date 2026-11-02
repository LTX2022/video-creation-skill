import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from 'remotion';
import compositionManifest from '../../composition-manifest.json';
import { VIDEO_FORMAT } from '../config/videoFormat';

export type Plate = {
  id: string; assetId: string; src: string; startFrame: number; durationInFrames: number;
  trimStartSec: number; fit: 'cover' | 'contain'; fpsPolicy: 'resample' | 'reject';
  audio: 'mute' | 'keep'; volume?: number;
};
export function PlateLayer() {
  const manifest = compositionManifest as { backgroundColor: string; coordinateSpace: string; plates: Plate[] };
  if (manifest.coordinateSpace !== 'screen') throw new Error('Only fixed screen-space composition is supported. Tracking/occlusion requires a separately validated explicit-data implementation.');
  if (!manifest.plates.length) throw new Error('Composite output requires at least one local plate in composition-manifest.json');
  return <AbsoluteFill style={{ backgroundColor: manifest.backgroundColor }}>
    {manifest.plates.map((plate) => <Sequence key={plate.id} from={plate.startFrame} durationInFrames={plate.durationInFrames}>
      <OffthreadVideo src={staticFile(plate.src)} trimBefore={Math.round(plate.trimStartSec * VIDEO_FORMAT.fps)}
        muted={plate.audio !== 'keep'} volume={plate.volume ?? 1}
        style={{ width: '100%', height: '100%', objectFit: plate.fit }} />
    </Sequence>)}
  </AbsoluteFill>;
}
