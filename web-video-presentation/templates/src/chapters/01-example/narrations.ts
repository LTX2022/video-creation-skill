import type { Narration } from '../../registry/types';
import { THEME_PRESET_ID } from '../../config/themePreset';
import { presetNarrations, presetShotPlan as planForPreset } from '../../video/presets/narration';

/** Keep exactly three timing steps, now describing the selected scene rather than the old flow demo. */
export const narrations: Narration[] = presetNarrations(THEME_PRESET_ID);
/** Used only by the default example route; not an automatic review/approval. */
export const presetShotPlan = planForPreset(THEME_PRESET_ID);
