export interface BuildingSpec {
  x: number;
  width: number;
  height: number;
  color: string;
  windowColor?: string;
  windowSeed?: number;
  windows?: boolean;
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function seededRandom(seed: number): () => number {
  let state = Math.max(1, Math.floor(seed) % 2147483647);
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

export function clear(ctx: CanvasRenderingContext2D, color: string, width: number, height: number) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
}

export function verticalGradient(
  ctx: CanvasRenderingContext2D,
  height: number,
  top: string,
  bottom: string,
) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  return gradient;
}

export function drawVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength = 0.32,
) {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.2,
    width / 2,
    height / 2,
    height * 0.72,
  );
  gradient.addColorStop(0, "transparent");
  gradient.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function drawDeterministicGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed: number,
  density = 0.018,
  alpha = 0.07,
) {
  const random = seededRandom(seed);
  const count = Math.floor(width * height * density);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const shade = Math.floor(180 + random() * 75);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(Math.floor(random() * width), Math.floor(random() * height), 1, 1);
  }
  ctx.restore();
}

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  groundY: number,
  spec: BuildingSpec,
) {
  ctx.fillStyle = spec.color;
  ctx.fillRect(spec.x, groundY - spec.height, spec.width, spec.height);
  if (spec.windows === false) return;

  const random = seededRandom(spec.windowSeed ?? spec.x * 31 + spec.height);
  const cols = Math.max(3, Math.floor(spec.width / 12));
  const rows = Math.max(4, Math.floor(spec.height / 16));
  const cellW = spec.width / cols;
  const cellH = spec.height / rows;
  ctx.fillStyle = spec.windowColor ?? "rgba(236,190,124,0.55)";
  for (let row = 1; row < rows - 1; row++) {
    for (let col = 1; col < cols - 1; col++) {
      if (random() < 0.45) continue;
      ctx.fillRect(
        spec.x + col * cellW + cellW * 0.28,
        groundY - spec.height + row * cellH + cellH * 0.3,
        Math.max(2, cellW * 0.22),
        Math.max(2, cellH * 0.22),
      );
    }
  }
}

export function drawSkyline(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  buildings: BuildingSpec[],
  options: {
    skyTop: string;
    skyBottom: string;
    ground: string;
    groundY?: number;
  },
) {
  const groundY = options.groundY ?? height * 0.5;
  ctx.fillStyle = verticalGradient(ctx, groundY, options.skyTop, options.skyBottom);
  ctx.fillRect(0, 0, width, groundY);
  for (const building of buildings) drawBuilding(ctx, groundY, building);
  ctx.fillStyle = options.ground;
  ctx.fillRect(0, groundY, width, height - groundY);
}

export function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed: number,
  progress: number,
  color = "rgba(245,205,125,0.35)",
) {
  const random = seededRandom(seed);
  const count = 24 + Math.floor(progress * 48);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const x = random() * width;
    const y = random() * height;
    const length = lerp(20, 120, progress) * (0.5 + random());
    ctx.lineWidth = 0.5 + random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y + lerp(-4, 4, random()));
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCrackLine(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  color = "rgba(255,226,160,0.82)",
) {
  const p = clamp(progress);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lerp(1.5, 8, p);
  ctx.shadowColor = color;
  ctx.shadowBlur = lerp(2, 24, p);
  ctx.beginPath();
  ctx.moveTo(width * lerp(0.34, 0.72, p), -10);
  ctx.bezierCurveTo(width * 0.42, height * 0.22, width * 0.62, height * 0.58, width * 0.5, height + 10);
  ctx.stroke();
  ctx.restore();
}
