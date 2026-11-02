import type { Narration } from '../../registry/types';
import { presetShotPlan as planForPreset } from '../../video/presets/narration';
import { batchContent } from './batch-content';
/** Silent pilot: visual intent is in the plan, never synthesized as spoken narration. */
export const narrations: Narration[] = ['', '', ''];
export const presetShotPlan = planForPreset('cinema-title-card', batchContent.title);
for (const shot of presetShotPlan) shot.source += '; src/chapters/01-example/batch-content.json (title-only draft input); src/chapters/01-example/batch-content.ts';
