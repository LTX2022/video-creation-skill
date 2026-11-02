/** Static quality signals are not a substitute for rendered readability or user acceptance. */
export type QualityIssues = { errors: string[]; warnings: string[] };
const TEXT_INTENTS = new Set(['labels', 'data', 'editorial', 'captions']);
const TEXT_LED_MODELS = new Set(['quote-carousel', 'caption-stage']);
const TEXT_LED_STYLES = new Set(['kinetic-type', 'vignelli-headline', 'caption-first', 'quote-carousel', 'announcement-card']);

export function editorialText(item: any): boolean {
  return item.screenTextIntent === 'editorial' || TEXT_LED_MODELS.has(item.compositionModel) || TEXT_LED_STYLES.has(item.motionStyle);
}

export function screenTextIntentErrors(item: any): string[] {
  return item.screenTextIntent !== undefined && !TEXT_INTENTS.has(item.screenTextIntent)
    ? ['screenTextIntent must be labels, data, editorial, or captions'] : [];
}

const finiteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const RATIO_FIELDS = ['primaryVisualCoverage', 'primaryVisualWidthRatio', 'primaryVisualHeightRatio', 'safeFrameUse'] as const;
const MINIMUM_FIELDS = ['visualCoverage', 'minTextPx', 'headlinePx', ...RATIO_FIELDS] as const;

/** Truthful, bounded measurements are mandatory; generic design targets are advisory. */
export function layoutQualityIssues(item: any, options: {portrait: boolean; overlay: boolean}): QualityIssues {
  const errors = screenTextIntentErrors(item);
  const warnings: string[] = [];
  const coverage = item.visualCoverage ?? item.nonTextVisualCoverage;
  const mobile = item.mobileReadability;
  const textLed = editorialText(item) || item.screenTextIntent === 'captions' || item.screenTextIntent === 'data';
  if (!options.overlay) {
    if (!finiteNumber(coverage) || coverage < 0 || coverage > 1) {
      errors.push('visualCoverage must be a finite number between 0 and 1 (a truthful measurement, not a design score)');
    } else if (!textLed && coverage < 0.55) {
      warnings.push('visualCoverage is below the 0.55 visual-led guideline; review the shot intent and visible explanation, not area alone');
    }
    if (options.portrait) {
      if (!mobile || typeof mobile !== 'object' || Array.isArray(mobile) || mobile.required !== true) {
        errors.push('portrait projects must declare mobileReadability with required: true');
      } else {
        const hasText = Array.isArray(item.onScreenText) && item.onScreenText.some((value: unknown) => typeof value === 'string' && value.trim());
        for (const key of ['minTextPx', 'headlinePx'] as const) {
          if (mobile[key] !== undefined || (key === 'minTextPx' && hasText)) {
            if (!finiteNumber(mobile[key]) || mobile[key] <= 0) errors.push(`mobileReadability.${key} must be a measured positive finite number when applicable`);
            else if (mobile[key] < (key === 'minTextPx' ? 80 : 120)) warnings.push(`mobileReadability.${key} is below the ${key === 'minTextPx' ? 80 : 120}px reference guideline; review actual phone-size readability and hold time`);
          }
        }
        for (const key of RATIO_FIELDS) {
          if (!finiteNumber(mobile[key]) || mobile[key] < 0 || mobile[key] > 1) errors.push(`mobileReadability.${key} must be a finite ratio between 0 and 1`);
        }
        if (!textLed && RATIO_FIELDS.some((key, index) => finiteNumber(mobile[key]) && mobile[key] < [0.58, 0.6, 0.34, 0.7][index]!)) {
          warnings.push('portrait visual size/use is below a visual-led reference guideline; review composition, safe areas and intent rather than forcing generic area ratios');
        }
      }
    }
  }
  // Optional exact minima come from the accepted shot design, never an implicit universal preset.
  // The ordinary revision-bound workflow approvals still apply; this field is not approval evidence.
  const requirements = item.layoutRequirements;
  if (requirements !== undefined) {
    if (!requirements || typeof requirements !== 'object' || Array.isArray(requirements) || requirements.basis !== 'user-approved-shot-design' || typeof requirements.reason !== 'string' || !requirements.reason.trim()) {
      errors.push('layoutRequirements requires basis: user-approved-shot-design and a specific reason; it does not itself prove approval');
    } else {
      const minima = requirements.minimums;
      if (!minima || typeof minima !== 'object' || Array.isArray(minima) || !Object.keys(minima).length) {
        errors.push('layoutRequirements.minimums must contain at least one explicit per-shot numeric minimum');
      } else {
        for (const [key, minimum] of Object.entries(minima)) {
          if (!(MINIMUM_FIELDS as readonly string[]).includes(key)) {
            errors.push(`unknown layoutRequirements.minimums field: ${key}`);
            continue;
          }
          const ratio = key === 'visualCoverage' || (RATIO_FIELDS as readonly string[]).includes(key);
          if (!finiteNumber(minimum) || (ratio ? minimum < 0 || minimum > 1 : minimum <= 0)) {
            errors.push(`layoutRequirements.minimums.${key} must be ${ratio ? 'a finite ratio between 0 and 1' : 'a positive finite number'}`);
            continue;
          }
          const actual = key === 'visualCoverage' ? coverage : key === 'minTextPx' && options.overlay ? item.overlaySafety?.minTextPx : mobile?.[key];
          if (!finiteNumber(actual) || actual < minimum) errors.push(`${key} does not meet the explicit per-shot minimum ${minimum}`);
        }
      }
    }
  }
  return {errors, warnings};
}

export function normalizeScreenText(value: string): string {
  return value.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, '')
    .replace(/[\s"'`“”‘’.,，。！？!?：:；;、（）()[\]{}<>《》|/\\\-—_·~…]/g, '').toLowerCase();
}

/** Conservative prose signal, not a universal substring ban on names, units or terms. */
export function substantialProse(value: string): boolean {
  const cjk = value.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)?.length ?? 0;
  const words = value.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  return cjk >= 24 || (words >= 8 && normalizeScreenText(value).length >= 40);
}

export function repeatsNarration(value: string, narration: string): boolean {
  const a = normalizeScreenText(value), b = normalizeScreenText(narration);
  if (!a || !b) return false;
  // A long proper name/technical phrase is not automatically a prose paragraph.
  // Ambiguous unpunctuated text still gets density/source review warnings.
  const sentence = (text: string) => /[。！？!?；;]|\.(?:\s|$)/.test(text);
  return (substantialProse(value) && sentence(value) && b.includes(a)) ||
    (substantialProse(narration) && sentence(narration) && a.includes(b));
}
