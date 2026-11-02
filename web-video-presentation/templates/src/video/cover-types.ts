/** Data-only cover contract. No arbitrary HTML, JavaScript, network URL or hidden imagegen calls. */
export type CoverRect = { x: number; y: number; width: number; height: number };
export type CoverTextBox = CoverRect & { fontSize: number; lineHeight?: number; lines?: string[]; align?: 'left' | 'center' | 'right'; fontWeight?: number };
export type CoverShape = {
  type: 'rect' | 'circle' | 'line' | 'path' | 'text';
  x?: number; y?: number; width?: number; height?: number; rx?: number;
  cx?: number; cy?: number; r?: number; x1?: number; y1?: number; x2?: number; y2?: number;
  d?: string; text?: string; fontSize?: number; fontWeight?: number;
  fill?: string; stroke?: string; strokeWidth?: number; opacity?: number;
};
export type CoverAsset = {
  path: string; fit: 'contain' | 'cover';
  provenance: {
    sourceType: 'generated' | 'user-photo' | 'screenshot' | 'licensed';
    source: string; rights: string;
    provider?: string; model?: string; prompt?: string; generatedAt?: string;
  };
};
export type CoverBrief = {
  schema: 1;
  route: 'nonimage' | 'imagegen';
  mode: 'composed' | 'complete-image';
  title: string;
  subtitle?: string;
  width: number; height: number;
  safeArea: { top: number; right: number; bottom: number; left: number };
  layout: { title: CoverTextBox; subtitle?: CoverTextBox; visual: CoverRect };
  palette: { background: string; foreground: string; accent: string; muted: string };
  fontFamily?: string;
  visual: { description: string; kind: 'code'; shapes: CoverShape[] } | { description: string; kind: 'image'; asset: CoverAsset };
};
