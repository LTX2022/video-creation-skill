import type { ChapterStepTiming } from '../continuity-clock';

export const PRESET_FAMILIES = ['editorial', 'data', 'product', 'terminal', 'node', 'blueprint', 'lesson', 'gallery', 'archive', 'kinetic', 'audio', 'soft', 'reference'] as const;
export type PresetFamily = (typeof PRESET_FAMILIES)[number];
export interface PresetContent {
  eyebrow: string;
  title: string;
  subtitle?: string;
  labels: string[];
  values?: number[];
  unit?: string;
  conclusion: string;
}
export interface ThemePresetSpec {
  id: string;
  family: PresetFamily;
  variant: string;
  layout: {
    heroSide: 'left' | 'right' | 'center';
    density: 1 | 2 | 3;
    subjectScale: number;
    titleScale: number;
    numberScale: number;
    titleWeight: number;
    corner: 'square' | 'soft' | 'round';
    rule: 'hairline' | 'double' | 'dashed' | 'bold';
    decoration: 'none' | 'grid' | 'dots' | 'rays' | 'bands' | 'frame';
  };
  motion: {
    kind: 'settle' | 'wipe' | 'scan' | 'draw' | 'route' | 'lift' | 'snap' | 'pulse';
    setupEnd: number;
    transformEnd: number;
    stagger: number;
    travel: number;
  };
  content: PresetContent;
}
export interface Box { x: number; y: number; width: number; height: number }
export interface PresetLayout {
  width: number;
  height: number;
  portrait: boolean;
  headingMode: 'side' | 'top';
  unit: number;
  content: Box;
  heading: Box;
  subject: Box;
  footer: Box;
  subtitleBand: Box | null;
  platformBand: Box | null;
  titleSize: number;
  bodySize: number;
  labelSize: number;
}
export interface PresetMotion {
  phase: 'setup' | 'transform' | 'hold';
  setup: number;
  transform: number;
  hold: number;
  progress: number;
  frame: number;
  events: {setupEnd: number; transformStart: number; transformEnd: number; holdStart: number};
}
export interface FamilySceneProps {
  spec: ThemePresetSpec;
  content: PresetContent;
  box: Box;
  motion: PresetMotion;
  portrait: boolean;
  unit: number;
  uid: string;
  overlay?: boolean;
}
export interface PresetSceneProps {
  presetId: string;
  frame: number;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  content?: Partial<PresetContent>;
  isOverlay?: boolean;
  subtitleVisible?: boolean;
  chapterStepTimings?: readonly ChapterStepTiming[];
}
