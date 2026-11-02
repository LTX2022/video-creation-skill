import { Composition, useCurrentFrame } from 'remotion';
import type { CSSProperties } from 'react';
import { THEME_PRESET_ID } from '../../config/themePreset';
import { VIDEO_FORMAT } from '../../config/videoFormat';
import { Subtitle } from '../../components/Subtitle';
import { TransparentFix } from '../../components/TransparentFix';
import { PresetScene } from './PresetScene';
import type { PresetContent } from './types';
import '../../styles/fonts.css';
import '../../styles/base.css';
import '../../styles/tokens.css';
import '../render.css';

export type PresetProbeProps = {
  presetId: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  content?: Partial<PresetContent>;
  subtitleVisible: boolean;
  subtitleText: string;
  background: 'native' | 'transparent' | 'light' | 'dark';
  isOverlay?: boolean;
}
export function PresetProbe(props: PresetProbeProps) {
  const frame=useCurrentFrame();
  if(props.presetId!==THEME_PRESET_ID) throw new Error('Probe theme ID must match this scaffold\'s actual token stylesheet; scaffold each theme explicitly.');
  const background=props.isOverlay&&props.background==='native'?'transparent':props.background;
  const overlay=background!=='native';
  const alpha=background==='transparent';
  return <div className="stage-frame render-stage" data-format={props.height>props.width?'portrait':'landscape'}
    data-output-mode={alpha?'alpha':overlay?'composite':'opaque'} style={{width:props.width,height:props.height} as CSSProperties}>
    {overlay&&<TransparentFix/>}
    {(background==='light'||background==='dark')&&<div data-role="probe-plate" style={{position:'absolute',inset:0,background:background==='light'?'#f4f4f4':'#12151a'}}/>}
    <div style={{position:'absolute',inset:0}}><PresetScene {...props} frame={frame} isOverlay={overlay} subtitleVisible={props.subtitleVisible}/></div>
    <Subtitle text={props.subtitleText} elapsedMs={frame/props.fps*1000} durationMs={props.durationInFrames/props.fps*1000} visible={props.subtitleVisible}/>
  </div>;
}
const defaultProps: PresetProbeProps={presetId:THEME_PRESET_ID,width:VIDEO_FORMAT.width,height:VIDEO_FORMAT.height,fps:VIDEO_FORMAT.fps,durationInFrames:VIDEO_FORMAT.fps*9,
  subtitleVisible:false,subtitleText:'这是两行字幕压力测试，主体与字幕应保持清晰间隔。所有内容均为概念示例。',background:'native'};
/** Dedicated actual Remotion entry point, never an alternative/imitation renderer. Rendering still requires explicit browser authorization. */
export function PresetProbeRoot() {
  return <Composition id="preset-probe" component={PresetProbe} width={defaultProps.width} height={defaultProps.height}
    durationInFrames={defaultProps.durationInFrames} fps={defaultProps.fps} defaultProps={defaultProps}
    calculateMetadata={({props})=>{
      if(![props.width,props.height,props.fps,props.durationInFrames].every(n=>Number.isInteger(n)&&n>0)) throw new RangeError('Probe dimensions, fps and duration must be positive integers');
      return {width:props.width,height:props.height,fps:props.fps,durationInFrames:props.durationInFrames};
    }}/>;
}
