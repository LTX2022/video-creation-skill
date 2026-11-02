import type {HandoffState} from './model';
/** Canvas demonstration, original geometry only. Logical 1200x680; transparent mode retains faces. */
export function drawHandoff(ctx:CanvasRenderingContext2D,state:HandoffState,width:number,height:number,overlay=false) {
  ctx.save();
  ctx.scale(width/1200,height/680);
  if (!overlay) {ctx.fillStyle='#101c26';ctx.fillRect(0,0,1200,680);}
  const p=state.core.pose;
  const panel=1-state.focus;
  ctx.globalAlpha=panel;
  ctx.strokeStyle='#537580';ctx.lineWidth=2;
  ctx.strokeRect(560,200,360,240);
  ctx.fillStyle='#18343e';ctx.fillRect(565,205,350,230);
  ctx.strokeStyle='#69c9b9';ctx.beginPath();ctx.moveTo(210,320);ctx.lineTo(670,320);ctx.stroke();
  ctx.globalAlpha=1;
  ctx.save();ctx.translate(p.x!,p.y!);ctx.rotate(p.rotation!);
  ctx.fillStyle='#00000040';ctx.fillRect(-p.size!/2+6,-p.size!/2+12,p.size!,p.size!);
  ctx.fillStyle='#75d4bc';ctx.fillRect(-p.size!/2,-p.size!/2,p.size!,p.size!);
  ctx.fillStyle='#163d3c';const inset=p.size!*0.22;
  ctx.fillRect(-p.size!/2+inset,-p.size!/2+inset,p.size!-inset*2,p.size!-inset*2);
  ctx.fillStyle='#d8fff0';ctx.globalAlpha=p.charge!;ctx.fillRect(-12,-4,24,8);ctx.globalAlpha=1;ctx.restore();
  // No automatic slogans or subtitles. The stable core is the visual evidence.
  ctx.restore();
}
