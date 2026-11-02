/** UNRENDERED integration candidate. Not registered and NOT Remotion E2E evidence.
 * Intended location after explicit integration review: src/examples/cinematic-particles/.
 * Copy the .mjs and .d.mts together. Existing FrameCanvas import path is relative to that location.
 */
import {useCurrentFrame,useVideoConfig} from 'remotion';
import {FrameCanvas} from '../../components/FrameCanvas';
import {createPreset,sceneAtFrame,type Preset} from './cinematic-kernel.mjs';

export const CINEMATIC_PRESET=createPreset({seed:41021,count:1400,durationSeconds:12});

/** In a production chapter pass Root's chapterFrame, not step-local frame.
 * Timing integration must derive the preset's duration/events from the project's one timing source.
 */
export function CinematicParticles({preset=CINEMATIC_PRESET,frame,fps,width,height}: {
 preset?:Preset;frame:number;fps:number;width:number;height:number;
}) {
 return <FrameCanvas frame={frame} durationInFrames={Math.ceil(preset.durationSeconds*fps)} width={width} height={height}
  draw={(ctx,canvas)=>{
   const model=sceneAtFrame(preset,canvas.frame,fps,{width,height});
   ctx.fillStyle='#06080d';ctx.fillRect(0,0,width,height);
   // Stylized screen-space point paint, NOT physical lighting, volumetrics, bloom or DOF.
   for(const p of model.drawList){
    const radius=Math.max(0.35,Math.min(12,p.radius));
    if(p.energy>0.88){
     ctx.globalAlpha=0.045;ctx.fillStyle='#e8bb80';
     ctx.beginPath();ctx.arc(p.x,p.y,radius*3.2,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=0.2+p.energy*0.7;ctx.fillStyle=p.energy>0.7?'#ffe0aa':'#7d929e';
    ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
   }
   ctx.globalAlpha=1;
  }}/>
}

/** Standalone composition only: 12 sec, e.g. fps=30 and durationInFrames=360.
 * Must not be nested in step-local Sequences without an explicitly continuous clock.
 */
export function CinematicStandaloneUnrendered(){
 const frame=useCurrentFrame(),{fps,width,height}=useVideoConfig();
 return <CinematicParticles frame={frame} fps={fps} width={width} height={height}/>;
}
