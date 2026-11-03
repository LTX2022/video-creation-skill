import { revisionErrors, type InputRevision } from "./input-revision";
import { existsSync, readFileSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';

export const OUTPUT_MODES = ['opaque', 'alpha', 'composite', 'both'] as const;
export type OutputMode = typeof OUTPUT_MODES[number];
export type OutputKind = Exclude<OutputMode, 'both'>;
export const OUTPUTS: Record<OutputKind, { output: string; composition: string }> = {
  opaque: { output: 'output/full.mp4', composition: 'full-video' },
  alpha: { output: 'output/full-alpha.mov', composition: 'full-video-alpha' },
  composite: { output: 'output/full-composite.mp4', composition: 'full-video-composite' },
};
export function outputMode(value: unknown = 'opaque'): OutputMode {
  const mode = value ?? 'opaque';
  if (!OUTPUT_MODES.includes(mode as OutputMode)) throw new Error(`Invalid outputMode: ${mode}`);
  return mode as OutputMode;
}
export function outputKinds(mode: OutputMode): OutputKind[] { return mode === 'both' ? ['alpha', 'composite'] : [mode]; }
export function readState(root = process.cwd()): any {
  const path = resolve(root, 'project-state.json');
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')) : {};
}
export function finalOutputs(result: any): any[] {
  return Array.isArray(result?.outputs) ? result.outputs : result?.output ? [{ ...result, kind: result.alpha ? 'alpha' : 'opaque' }] : [];
}
export function isDouyinProfile(profile: unknown): boolean { return ['douyin', 'douyin-laon', 'douyin-skill'].includes(String(profile)); }
export function localPath(root: string, path: unknown): string {
  if (typeof path !== 'string' || !path || /^(?:[a-z][a-z0-9+.-]*:|\/|\\)/i.test(path)) throw new Error('Expected a local relative path');
  const full = resolve(root, path.replaceAll("\\", "/"));
  const rel = relative(resolve(root), full);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Path escapes project: ${path}`);
  return full;
}
/** Recorded permission for this project, not a legal certification or inferred commercial grant. */
export const INTENDED_USES = ['personal', 'noncommercial', 'commercial'] as const;
export type IntendedUse = typeof INTENDED_USES[number];
export interface AssetAuthorization { allowedUses: Array<'personal' | 'noncommercial'>; basis: string; evidence: string }
export function assetRightsErrors(asset: any, state: { intendedUse?: unknown } = {}): string[] {
  // Preserve the historical explicitly commercial / draft-placeholder paths.
  if (asset.placeholder === true || (asset.commercialUse === true && asset.authorization === undefined)) return [];
  const errors: string[] = [];
  const use = state.intendedUse;
  if (use !== 'personal' && use !== 'noncommercial') errors.push('noncommercial asset requires explicit project intendedUse=personal or noncommercial; unknown/commercial use is not authorized');
  if (asset.commercialUse !== undefined && typeof asset.commercialUse !== 'boolean') errors.push('commercialUse must be a truthful boolean when supplied; do not infer a commercial grant');
  const auth = asset.authorization;
  if (!auth || typeof auth !== 'object' || Array.isArray(auth)) return [...errors, 'asset requires authorization with allowedUses, basis and evidence'];
  if (!Array.isArray(auth.allowedUses) || !auth.allowedUses.length || auth.allowedUses.some((v: unknown) => v !== 'personal' && v !== 'noncommercial') || !auth.allowedUses.includes(use)) errors.push('authorization.allowedUses must explicitly include this project intendedUse (personal/noncommercial); scopes are not inferred');
  for (const key of ['basis', 'evidence']) if (typeof auth[key] !== 'string' || !auth[key].trim() || /^(unknown|pending|tbd|n\/a|未知|未确认|待确认)$/i.test(auth[key].trim())) errors.push(`authorization.${key} must record the actual permission basis/evidence`);
  return errors;
}

export function contractErrors(state: any, result?: any, currentRevision?: InputRevision): string[] {
  const errors: string[] = [];
  if (state.intendedUse !== undefined && !INTENDED_USES.includes(state.intendedUse)) errors.push('intendedUse must be personal, noncommercial or commercial when supplied');
  let mode: OutputMode;
  try { mode = outputMode(state.outputMode); } catch (error) { return [String(error)]; }
  if (mode === 'alpha' && (state.audioRequested === true || state.subtitlesRequested === true)) errors.push('alpha-only is a silent graphics export; set audioRequested=false and subtitlesRequested=false');
  if (result) {
    if (![1, 2, 3].includes(result.schema)) errors.push("Unsupported render-result schema");
    if (result.schema !== 3 || !/^[A-Fa-f0-9]{64}$/.test(String(result.contentRevision ?? ''))) errors.push('Legacy or missing contentRevision: final evidence is unbound, not current-source approval');
    if (currentRevision) errors.push(...revisionErrors(currentRevision, result));
    const outputs = finalOutputs(result);
    if (result.outputMode !== undefined && result.outputMode !== mode) errors.push('render-result outputMode differs from project-state');
    for (const kind of outputKinds(mode)) {
      const matches = outputs.filter((item) => item.kind === kind);
      if (matches.length !== 1) { errors.push(`Expected exactly one ${kind} output`); continue; }
      const item = matches[0];
      if (!item.contentRevision || item.contentRevision !== result.contentRevision) errors.push(`${kind} contentRevision differs or is unbound; mixed revisions are forbidden`);
      if (!/^[A-Fa-f0-9]{64}$/.test(String(item.renderVariant ?? ''))) errors.push(`${kind} lacks a renderVariant identity`);
      if (item.output !== OUTPUTS[kind].output) errors.push(`${kind} output must be ${OUTPUTS[kind].output}`);
      if (item.draft || item.frames || item.preset !== 'quality' || item.everyNthFrame) errors.push(`${kind} is not full-quality final evidence`);
      if (!item.sha256 || item.mediaProbe?.ok !== true) errors.push(`${kind} lacks hash/probe evidence`);
      if (kind === 'alpha' && item.alphaValidation?.pass !== true) errors.push('alpha lacks decoded-pixel validation');
    }
    if (outputs.length !== outputKinds(mode).length) errors.push('Unexpected or stale outputs in final manifest');
  }
  return errors;
}
/** Source adaptation is explicit; unequal dimensions/rates are not inherently invalid. */
export function adaptationErrors(asset: any, format: { width?: number | null; height?: number | null; fps?: number | null }): string[] {
  if (asset.referenceVideo === true || /reference/i.test(String(asset.usage ?? ''))) return [];
  const errors: string[] = [];
  const adaptation = asset.adaptation ?? {};
  if (format.fps && Number(asset.fps) !== format.fps && adaptation.fpsPolicy !== 'resample') errors.push('different source FPS requires adaptation.fpsPolicy="resample" (frame repeat/drop; no default optical flow)');
  if (format.width && format.height && (Number(asset.width) !== format.width || Number(asset.height) !== format.height) && !['cover', 'contain'].includes(adaptation.fit)) errors.push('different source dimensions require adaptation.fit="cover" or "contain"');
  if (adaptation.trimStartSec !== undefined && (!Number.isFinite(adaptation.trimStartSec) || adaptation.trimStartSec < 0 || adaptation.trimStartSec >= Number(asset.durationSec))) errors.push('trimStartSec must be nonnegative seconds');
  if (adaptation.trimEndSec !== undefined && (!(adaptation.trimEndSec > (adaptation.trimStartSec ?? 0)) || adaptation.trimEndSec > Number(asset.durationSec))) errors.push('trimEndSec must be after trimStartSec and within source duration');
  return errors;
}

/** Returns null for draft/smoke/custom outputs, so they cannot overwrite final evidence. */
export function mergeFinalOutput(state: any, result: any, previous: any = null): any | null {
  const mode = outputMode(state.outputMode);
  const kinds = outputKinds(mode);
  const kind = result.kind as OutputKind;
  if (!kinds.includes(kind) || result.draft || result.frames || result.preset !== 'quality' || result.everyNthFrame || result.output !== OUTPUTS[kind]?.output) return null;
  if (!/^[A-Fa-f0-9]{64}$/.test(String(result.contentRevision ?? '')) || !/^[A-Fa-f0-9]{64}$/.test(String(result.renderVariant ?? ''))) return null;
  const previousOutputs = previous?.schema === 3 && previous?.outputMode === mode && previous?.contentRevision === result.contentRevision
    ? finalOutputs(previous).filter((item: any) => item.contentRevision === result.contentRevision && /^[A-Fa-f0-9]{64}$/.test(String(item.renderVariant ?? ''))) : [];
  const outputs = kinds.flatMap((expected) => expected === kind ? [result] : previousOutputs.filter((item: any) => item.kind === expected));
  return { ...(outputs.length === 1 ? result : {}), schema: 3, outputMode: mode, contentRevision: result.contentRevision,
    generatedAt: result.generatedAt, outputs, complete: outputs.length === kinds.length };
}

/** Foreground overlays are assessed against their own bounds, not full-screen narration density. */
export function overlaySafetyErrors(item: any): string[] {
  const errors: string[] = [];
  const coverage = item.visualCoverage ?? item.nonTextVisualCoverage;
  if (typeof coverage !== 'number' || !Number.isFinite(coverage) || coverage < 0 || coverage > 1) errors.push('overlay visualCoverage must be an actual number in 0..1');
  const safety = item.overlaySafety;
  const b = safety?.bounds;
  const valid = b && ['x','y','width','height'].every((key) => typeof b[key] === 'number' && Number.isFinite(b[key])) && b.x >= 0 && b.y >= 0 && b.width > 0 && b.height > 0 && b.x + b.width <= 1.000001 && b.y + b.height <= 1.000001;
  if (safety?.coordinateSystem !== 'normalized' || !valid) errors.push('overlaySafety requires normalized foreground bounds inside the frame');
  if (valid && Number.isFinite(coverage) && coverage > b.width * b.height + 0.001) errors.push('overlay visualCoverage cannot exceed its declared foreground bounding rectangle');
  const hasLabels = Array.isArray(item.onScreenText) && item.onScreenText.some((v: unknown) => String(v ?? '').trim());
  if (hasLabels && (typeof safety?.minTextPx !== 'number' || !Number.isFinite(safety.minTextPx) || safety.minTextPx <= 0)) errors.push('overlay labels require their actual positive minTextPx, not a full-screen headline preset');
  if (safety?.readabilityReviewed !== true || safety?.edgePaddingReviewed !== true) errors.push('overlay readability and frame-edge padding must be reviewed on the intended background');
  if (typeof safety?.reviewEvidence !== 'string' || !/^output\/.+\.(png|jpe?g|webp)$/i.test(safety.reviewEvidence.replaceAll('\\','/'))) errors.push('overlaySafety.reviewEvidence must name a local PNG/JPEG/WebP frame under output/');
  return errors;
}
