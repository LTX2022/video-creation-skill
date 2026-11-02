/** Build child CLI routes only; no render, filesystem, environment or subprocess side effects. */
export function parseAlphaSampleFrames(value: string|null|undefined): number[]|undefined {
 if(value===undefined||value===null)return undefined;
 if(!/^\d+(?:,\d+)*$/.test(value))throw new Error('--alpha-sample-frames expects comma-separated decoded output frame indices');
 const frames=value.split(',').map(Number);
 if(frames.length>32||frames.some(n=>!Number.isSafeInteger(n)||n<0))throw new Error('--alpha-sample-frames permits 1-32 nonnegative safe integers');
 return [...new Set(frames)].sort((a,b)=>a-b);
}
export function bothChildArgs(args: readonly string[], kind: 'alpha'|'composite'): string[] {
  const out: string[]=[];
  for(let i=0;i<args.length;i++) {
    const arg=args[i]!;
    if(arg==='--output-mode') {i++;continue;}
    if(arg.startsWith('--output-mode=')) continue;
    // Captions belong to the flattened composite, not the transparent graphics asset.
    if(kind==='alpha' && (arg==='--subtitles'||arg==='--captions')) continue;
    out.push(arg);
  }
  return [...out,`--output-mode=${kind}`];
}

export function smokeRenderArguments(args: readonly string[], projectMode: unknown, totalFrames: number): string[] {
  if(!Number.isSafeInteger(totalFrames)||totalFrames<1) throw new Error('Generate a positive TOTAL_FRAMES before smoke rendering');
  let mode=String(projectMode??'opaque'), frames:string|undefined;
  const forwarded:string[]=[];
  for(let i=0;i<args.length;i++) {
    const arg=args[i]!;
    if(arg==='--output'||arg.startsWith('--output=')||arg==='--preset'||arg.startsWith('--preset=')) throw new Error('Smoke output and draft preset are fixed; use render:segment for another plan');
    if(arg==='--frames'||arg==='--output-mode') {
      const value=args[++i];if(!value||value.startsWith('--'))throw new Error(`Missing ${arg} value`);
      if(arg==='--frames')frames=value;else mode=value;continue;
    }
    if(arg.startsWith('--frames=')){frames=arg.slice(9);continue;}
    if(arg.startsWith('--output-mode=')){mode=arg.slice(14);continue;}
    if(arg==='--alpha')continue;
    forwarded.push(arg);
  }
  if(args.includes('--alpha'))mode='alpha';
  if(!['opaque','alpha','composite','both'].includes(mode))throw new Error('Unknown smoke output mode');
  if(mode==='both')mode='composite';
  if(mode==='alpha'&&forwarded.some(x=>x==='--subtitles'||x==='--captions'))throw new Error('Alpha smoke cannot burn captions; select composite');
  frames??=`0-${Math.min(179,totalFrames-1)}`;
  const match=/^(\d+)(?:-(\d+))?$/.exec(frames);
  if(!match)throw new Error('Smoke frames must be an inclusive integer range');
  const start=Number(match[1]),end=Number(match[2]??match[1]);
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<start||end>=totalFrames)throw new Error(`Smoke frames must remain within 0-${totalFrames-1}`);
  return ['--preset=draft',`--output-mode=${mode}`,`--frames=${frames}`,`--output=output/smoke-${mode}.${mode==='alpha'?'mov':'mp4'}`,...forwarded];
}

/** Mode-aware output selection shared by the actual renderer and offline route tests.
 * `both` is an orchestration route: its placeholder is never rendered; each child
 * resolves its own path. A single output override cannot name two deliverables.
 */
export function resolveRenderOutput(
  mode: 'opaque'|'alpha'|'composite'|'both', isDraft: boolean,
  subtitles: boolean, requestedOutput: string|null, finalOutput: string,
): string {
  if (mode === 'both' && requestedOutput) throw new Error('--output cannot be used with both; render the two named outputs separately');
  if (requestedOutput) return requestedOutput;
  if (!isDraft) return finalOutput;
  const kind = mode === 'both' ? 'alpha' : mode;
  return `output/draft-${kind}${subtitles && kind !== 'alpha' ? '-subtitles' : ''}.${kind === 'alpha' ? 'mov' : 'mp4'}`;
}
