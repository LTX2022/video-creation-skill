import {
  clamp,
  clear,
  drawDeterministicGrain,
  drawVignette,
  lerp,
  seededRandom,
  verticalGradient,
} from "./canvas-cinema";

export type OpenDesignPresetKind =
  | "spatial-lines"
  | "data-observatory"
  | "relation-map"
  | "product-rig";

export interface OpenDesignPalette {
  backgroundTop: string;
  backgroundBottom: string;
  ink: string;
  mutedInk: string;
  accent: string;
  accentSoft: string;
  glow: string;
}

export interface OpenDesignPresetOptions {
  kind?: OpenDesignPresetKind;
  width: number;
  height: number;
  progress: number;
  seed?: number;
  palette?: Partial<OpenDesignPalette>;
  density?: number;
}

const defaultPalette: OpenDesignPalette = {
  backgroundTop: "oklch(13% 0.018 255)",
  backgroundBottom: "oklch(5% 0.012 260)",
  ink: "oklch(91% 0.025 78 / 0.9)",
  mutedInk: "oklch(75% 0.02 78 / 0.34)",
  accent: "oklch(78% 0.14 82 / 0.92)",
  accentSoft: "oklch(78% 0.12 82 / 0.2)",
  glow: "oklch(82% 0.16 82 / 0.22)",
};

function resolvePalette(palette?: Partial<OpenDesignPalette>): OpenDesignPalette {
  return { ...defaultPalette, ...palette };
}

function strokeLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function drawPerspectiveGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  palette: OpenDesignPalette = defaultPalette,
) {
  const p = clamp(progress);
  const horizon = height * lerp(0.64, 0.54, p);
  const vanishingX = width * lerp(0.45, 0.56, p);

  ctx.save();
  ctx.strokeStyle = palette.mutedInk;
  ctx.lineWidth = Math.max(1, width * 0.001);
  ctx.globalAlpha = 0.4 + p * 0.35;

  for (let i = 0; i < 15; i++) {
    const x = (i / 14) * width;
    strokeLine(ctx, x, height, vanishingX, horizon);
  }

  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const y = lerp(height, horizon, t * t);
    strokeLine(ctx, 0, y, width, y);
  }
  ctx.restore();
}

export function drawWindowGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    rows?: number;
    cols?: number;
    seed?: number;
    progress?: number;
    palette?: OpenDesignPalette;
  } = {},
) {
  const rows = options.rows ?? 9;
  const cols = options.cols ?? 7;
  const random = seededRandom(options.seed ?? 1001);
  const p = clamp(options.progress ?? 1);
  const palette = options.palette ?? defaultPalette;
  const cellW = width / cols;
  const cellH = height / rows;

  ctx.save();
  ctx.strokeStyle = palette.mutedInk;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  for (let row = 1; row < rows; row++) {
    strokeLine(ctx, x, y + row * cellH, x + width, y + row * cellH);
  }
  for (let col = 1; col < cols; col++) {
    strokeLine(ctx, x + col * cellW, y, x + col * cellW, y + height);
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const reveal = (row * cols + col) / Math.max(1, rows * cols - 1);
      if (p < reveal * 0.86 || random() < 0.42) continue;
      ctx.fillStyle = random() > 0.75 ? palette.accent : palette.accentSoft;
      ctx.fillRect(
        x + col * cellW + cellW * 0.22,
        y + row * cellH + cellH * 0.22,
        cellW * 0.48,
        cellH * 0.48,
      );
    }
  }
  ctx.restore();
}

export function drawContourSubject(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  progress: number,
  palette: OpenDesignPalette = defaultPalette,
) {
  const p = clamp(progress);
  const drawP = lerp(0.001, 1, p);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = palette.ink;
  ctx.fillStyle = "oklch(8% 0.01 255 / 0.75)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 28 * p;

  ctx.beginPath();
  ctx.ellipse(0, -94, 28, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-46, -52);
  ctx.quadraticCurveTo(0, -78, 46, -52);
  ctx.lineTo(66 * drawP, 92);
  ctx.quadraticCurveTo(0, 128, -66 * drawP, 92);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = palette.mutedInk;
  strokeLine(ctx, -36, -22, -58 * drawP, 76);
  strokeLine(ctx, 36, -22, 58 * drawP, 76);
  strokeLine(ctx, -28, 118, -42 * drawP, 168);
  strokeLine(ctx, 28, 118, 42 * drawP, 168);

  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(45, 28, 10, 0, Math.PI * 2 * drawP);
  ctx.stroke();
  ctx.restore();
}

export function drawLightLeak(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  palette: OpenDesignPalette = defaultPalette,
) {
  const p = clamp(progress);
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  const leak = ctx.createLinearGradient(width * -0.1, 0, width * 0.78, height);
  leak.addColorStop(0, `oklch(90% 0.16 74 / ${0.24 * p})`);
  leak.addColorStop(0.45, `oklch(75% 0.18 35 / ${0.09 * p})`);
  leak.addColorStop(1, "transparent");
  ctx.fillStyle = leak;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = palette.glow;
  ctx.fillRect(width * lerp(-0.2, 0.12, p), 0, width * 0.055, height);
  ctx.restore();
}

export function drawWaveformGrowth(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  seed = 601,
  palette: OpenDesignPalette = defaultPalette,
) {
  const random = seededRandom(seed);
  const p = clamp(progress);
  const bars = Math.max(18, Math.floor(width / 42));
  const baseY = height * 0.72;
  const maxH = height * 0.22;
  const gap = width * 0.52 / bars;
  const startX = width * 0.24;

  ctx.save();
  ctx.fillStyle = palette.accent;
  for (let i = 0; i < bars; i++) {
    const reveal = clamp((p - i / bars * 0.62) / 0.28);
    const h = (0.18 + random() * 0.82) * maxH * reveal;
    ctx.fillRect(startX + i * gap, baseY - h, gap * 0.42, h);
  }
  ctx.restore();
}

export function drawDataPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  seed = 701,
  palette: OpenDesignPalette = defaultPalette,
) {
  const random = seededRandom(seed);
  const p = clamp(progress);
  const points = Array.from({ length: 9 }, (_, i) => ({
    x: width * (0.12 + i * 0.095),
    y: height * (0.32 + (random() - 0.5) * 0.26 + i * 0.025),
  }));

  ctx.save();
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = Math.max(2, width * 0.0025);
  ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach((point, i) => {
    const local = i / Math.max(1, points.length - 1);
    if (local > p) return;
    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();

  for (let i = 0; i < points.length; i++) {
    const local = i / Math.max(1, points.length - 1);
    if (local > p) continue;
    ctx.fillStyle = i === points.length - 1 ? palette.ink : palette.accentSoft;
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, width * 0.006, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawHeatmapField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  seed = 801,
  palette: OpenDesignPalette = defaultPalette,
) {
  const random = seededRandom(seed);
  const p = clamp(progress);
  const cols = 13;
  const rows = 9;
  const cell = Math.min(width * 0.038, height * 0.055);
  const startX = width * 0.55;
  const startY = height * 0.24;

  ctx.save();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const distance = Math.hypot(col - cols * 0.62, row - rows * 0.38);
      const energy = clamp(1 - distance / 7 + random() * 0.24);
      const reveal = clamp((p - (row + col) * 0.018) / 0.28);
      ctx.fillStyle = energy > 0.65 ? palette.accent : palette.accentSoft;
      ctx.globalAlpha = reveal * (0.16 + energy * 0.72);
      ctx.fillRect(startX + col * cell, startY + row * cell, cell * 0.7, cell * 0.7);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawRelationMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  seed = 901,
  palette: OpenDesignPalette = defaultPalette,
) {
  const random = seededRandom(seed);
  const p = clamp(progress);
  const nodes = Array.from({ length: 11 }, (_, i) => {
    const angle = (i / 11) * Math.PI * 2 + 0.2;
    const radius = Math.min(width, height) * (0.16 + random() * 0.16);
    return {
      x: width * 0.5 + Math.cos(angle) * radius,
      y: height * 0.5 + Math.sin(angle) * radius * 0.72,
      r: lerp(5, 13, random()),
    };
  });

  ctx.save();
  ctx.strokeStyle = palette.mutedInk;
  ctx.lineWidth = 1.3;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const b = nodes[(i * 3 + 4) % nodes.length];
    const reveal = clamp((p - i * 0.045) / 0.3);
    if (reveal <= 0) continue;
    ctx.globalAlpha = reveal * 0.62;
    strokeLine(ctx, a.x, a.y, lerp(a.x, b.x, reveal), lerp(a.y, b.y, reveal));
  }

  ctx.globalAlpha = 1;
  for (let i = 0; i < nodes.length; i++) {
    const reveal = clamp((p - i * 0.035) / 0.22);
    if (reveal <= 0) continue;
    ctx.fillStyle = i === 0 ? palette.accent : palette.ink;
    ctx.beginPath();
    ctx.arc(nodes[i].x, nodes[i].y, nodes[i].r * reveal, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawProductRig(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  palette: OpenDesignPalette = defaultPalette,
) {
  const p = clamp(progress);
  const cx = width * 0.5;
  const cy = height * 0.5;
  const radius = Math.min(width, height) * 0.2;

  ctx.save();
  ctx.strokeStyle = palette.mutedInk;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 12]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 1.8, radius * 0.72, -0.18, 0, Math.PI * 2 * p);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "oklch(7% 0.01 255 / 0.82)";
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cx - radius * 0.72, cy - radius * 0.96, radius * 1.44, radius * 1.92, 18);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const reveal = clamp((p - i * 0.09) / 0.3);
    const y = cy - radius * 0.56 + i * radius * 0.26;
    strokeLine(ctx, cx - radius * 0.42, y, cx - radius * 0.42 + radius * 0.84 * reveal, y);
  }
  ctx.restore();
}

export function drawOpenDesignPreset(ctx: CanvasRenderingContext2D, options: OpenDesignPresetOptions) {
  const palette = resolvePalette(options.palette);
  const progress = clamp(options.progress);
  const seed = options.seed ?? 42;
  const kind = options.kind ?? "spatial-lines";
  const density = options.density ?? 1;
  const { width, height } = options;

  clear(ctx, palette.backgroundBottom, width, height);
  ctx.fillStyle = verticalGradient(ctx, height, palette.backgroundTop, palette.backgroundBottom);
  ctx.fillRect(0, 0, width, height);

  drawPerspectiveGrid(ctx, width, height, progress, palette);

  if (kind === "spatial-lines") {
    drawWindowGrid(ctx, width * 0.08, height * 0.16, width * 0.22, height * 0.34, {
      rows: 8,
      cols: 6,
      seed,
      progress,
      palette,
    });
    drawWindowGrid(ctx, width * 0.68, height * 0.12, width * 0.22, height * 0.42, {
      rows: 11,
      cols: 5,
      seed: seed + 10,
      progress,
      palette,
    });
    drawContourSubject(ctx, width * 0.5, height * 0.58, Math.min(width, height) / 780, progress, palette);
  } else if (kind === "data-observatory") {
    drawDataPath(ctx, width, height, progress, seed + 20, palette);
    drawHeatmapField(ctx, width, height, progress, seed + 30, palette);
    drawWaveformGrowth(ctx, width, height, progress, seed + 40, palette);
  } else if (kind === "relation-map") {
    drawRelationMap(ctx, width, height, progress, seed + 50, palette);
    drawDataPath(ctx, width, height, clamp(progress * 0.82), seed + 60, palette);
  } else {
    drawProductRig(ctx, width, height, progress, palette);
    drawRelationMap(ctx, width, height, clamp(progress * 0.72), seed + 70, palette);
  }

  drawLightLeak(ctx, width, height, clamp(progress * 1.2), palette);
  drawDeterministicGrain(ctx, width, height, seed + Math.floor(progress * 24), 0.004 * density, 0.06);
  drawVignette(ctx, width, height, 0.28);
}
