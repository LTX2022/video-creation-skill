import {Composition,useCurrentFrame} from 'remotion';
import {MechanismShowcase} from './mechanisms';

function Probe() {
  const frame=useCurrentFrame();
  return <MechanismShowcase frame={frame} durationInFrames={180} width={960} height={540}
    seed="motion-mechanism-example-v1" instanceId="mechanism-probe" background="#f5f1e8"/>;
}

/** Separate opt-in entry, not a replacement for the user's film or an Alpha acceptance test. */
export function MechanismProbeRoot() {
  return <Composition id="mechanism-probe" component={Probe} durationInFrames={180} fps={30} width={960} height={540}/>;
}
