import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { localPath, outputMode, readState } from './delivery-contract';

export function validateComposition(root = process.cwd()): string[] {
  const state = readState(root);
  if (!['composite', 'both'].includes(outputMode(state.outputMode))) return [];
  const errors: string[] = [];
  if (!Number.isFinite(state.videoFps) || state.videoFps <= 0) errors.push('project-state.videoFps must be a positive number');
  const timingPath = resolve(root, 'src/video/render-timing.generated.ts');
  const totalFrames = existsSync(timingPath) ? Number(readFileSync(timingPath, 'utf8').match(/export const TOTAL_FRAMES\s*=\s*(\d+)/)?.[1]) : NaN;
  const path = resolve(root, 'composition-manifest.json');
  if (!existsSync(path)) return ['composition-manifest.json is required'];
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  const assetsPath = resolve(root, 'asset-manifest.json');
  const assets = existsSync(assetsPath) ? JSON.parse(readFileSync(assetsPath, 'utf8')).assets ?? [] : [];
  if (manifest.schema !== 1 || manifest.coordinateSpace !== 'screen') errors.push('schema=1 and coordinateSpace="screen" are required; no implicit tracking');
  if (manifest.tracking || manifest.occlusion || manifest.trackingData || manifest.occlusionData) errors.push('Tracking/occlusion data needs a dedicated implementation and QA; this fixed screen-space renderer will not pretend to apply it');
  if (!/^#[\da-f]{6}$/i.test(manifest.backgroundColor ?? '')) errors.push('backgroundColor must be an opaque #RRGGBB color');
  if (!Array.isArray(manifest.plates) || manifest.plates.length === 0) return [...errors, 'At least one plate is required'];
  const ids = new Set();
  for (const plate of manifest.plates) {
    if (!plate.id || ids.has(plate.id)) errors.push('Each plate requires a unique id'); ids.add(plate.id);
    if (!Number.isInteger(plate.startFrame) || plate.startFrame < 0 || !Number.isInteger(plate.durationInFrames) || plate.durationInFrames < 1) errors.push(`${plate.id}: invalid project-frame start/duration`);
    if (Number.isFinite(totalFrames) && plate.startFrame + plate.durationInFrames > totalFrames) errors.push(`${plate.id}: plate extends beyond the composition timeline`);
    if (plate.audioStreamIndex !== undefined && plate.audioStreamIndex !== 0) errors.push(`${plate.id}: only the primary audio stream is supported; pre-extract another track locally before import`);
    if (!Number.isFinite(plate.trimStartSec) || plate.trimStartSec < 0) errors.push(`${plate.id}: trimStartSec must be explicit nonnegative seconds`);
    if (!['contain', 'cover'].includes(plate.fit) || !['resample', 'reject'].includes(plate.fpsPolicy)) errors.push(`${plate.id}: explicit fit and fpsPolicy required`);
    if (!['mute', 'keep'].includes(plate.audio) || (plate.volume !== undefined && (!Number.isFinite(plate.volume) || plate.volume < 0 || plate.volume > 1))) errors.push(`${plate.id}: audio must be mute/keep; volume 0..1`);
    const asset = assets.find((item: any) => item.id === plate.assetId);
    if (!asset || asset.type !== 'video' || asset.placeholder === true) errors.push(`${plate.id}: assetId must reference a non-placeholder video asset`);
    try {
      if (!/\.(mp4|mov|webm|mkv|m4v)$/i.test(plate.src ?? '')) throw new Error('Plate must be a local video container, not a URL/playlist');
      const media = localPath(resolve(root, 'public'), plate.src);
      if (!existsSync(media)) { errors.push(`${plate.id}: local plate missing`); continue; }
      if (asset && ![plate.src, `public/${plate.src}`].includes(asset.path)) errors.push(`${plate.id}: asset path differs from plate src`);
      const probe = spawnSync(process.env.FFPROBE_PATH || 'ffprobe', ['-v','error','-protocol_whitelist','file,pipe','-show_streams','-show_format','-of','json',media], { encoding: 'utf8' });
      if (probe.status !== 0 || probe.error) { errors.push(`${plate.id}: ffprobe failed`); continue; }
      const data = JSON.parse(probe.stdout); const video = data.streams?.find((s: any) => s.codec_type === 'video');
      const [a,b=1] = String(video?.avg_frame_rate ?? '0/1').split('/').map(Number); const fps = a / b;
      const duration = Number(video?.duration ?? data.format?.duration);
      if (asset && video && (Number(asset.width) !== Number(video.width) || Number(asset.height) !== Number(video.height) || Math.abs(Number(asset.fps) - fps) > 0.01 || Math.abs(Number(asset.durationSec) - duration) > 0.1 + 1 / fps)) errors.push(`${plate.id}: asset-manifest metadata differs from actual ffprobe source`);
      if (!video || !Number.isFinite(fps) || fps <= 0 || !Number.isFinite(duration)) errors.push(`${plate.id}: valid video FPS and duration required`);
      if (plate.fpsPolicy === 'reject' && Math.abs(fps - state.videoFps) > 0.001) errors.push(`${plate.id}: source/project FPS mismatch; explicitly choose resample to repeat/drop frames`);
      if (plate.trimStartSec + plate.durationInFrames / state.videoFps > duration + 1 / state.videoFps) errors.push(`${plate.id}: trim plus duration exceeds source; no implicit loop/freeze`);
      if (plate.audio === 'keep' && !data.streams.some((s: any) => s.codec_type === 'audio')) errors.push(`${plate.id}: keep audio requested but source has no audio stream`);
    } catch (error) { errors.push(`${plate.id}: ${String(error)}`); }
  }
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errors = validateComposition();
  errors.forEach((error) => console.error(`x ${error}`));
  if (errors.length) process.exit(1);
  console.error('v composition contract valid');
}
