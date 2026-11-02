import { type CSSProperties, type ReactNode } from "react";
import { Easing, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { OffthreadVideo } from "remotion";

// ─────────────────────────────────────────────────────────────
// CardArrayFlow —— jitter.video 风格卡片阵列流动动画（v2.2.16）。
//
// 用户描述的 5 阶段：
//   A. 贪吃蛇式卡片流入（贝塞尔曲线 + 流动感）
//   B. 阵列逐行铺满屏幕
//   C. 各行交替方向滑动 + 鱼眼畸变 + 边角色散
//   D. 第 85 帧起 3 秒慢-快-慢阵列滑动（Easing.bezier）
//   E. 中央卡片放大，其他卡片异步缩小消失（随机延迟）
//
// 全部 frame 驱动（useCurrentFrame / interpolate / Easing），可复现。
// 圆角矩形卡片，重复卡片不相邻。支持图片/视频/纯色 cards。
// ─────────────────────────────────────────────────────────────

export type CardContent =
  | { kind: "image"; src: string }
  | { kind: "video"; src: string }
  | { kind: "color"; bg: string; label?: string };

export interface CardArrayFlowProps {
  cards: CardContent[];
  /** 卡片总列数 */
  cols?: number;
  /** 卡片总行数 */
  rows?: number;
  /** 卡片圆角 px */
  radius?: number;
  /** 各阶段起始帧（默认值对应用户描述的节奏） */
  phases?: {
    snakeStart?: number;   // A 阶段开始
    arrayStart?: number;   // B 阶段开始
    slideStart?: number;   // C 阶段开始
    slowSlideStart?: number; // D 阶段开始（用户指定 85）
    focusStart?: number;   // E 阶段开始
  };
  /** D 阶段持续帧数（用户指定 3 秒，默认 180 帧 @60fps） */
  slowSlideDuration?: number;
  /** 阶段 A 贪吃蛇曲线幅度 */
  snakeAmplitude?: number;
  /** 卡片间距 px */
  gap?: number;
}

// 慢-快-慢缓动（手册：开头慢启动→加快→变慢停下）
const SLOW_FAST_SLOW = Easing.bezier(0.25, 0.1, 0.25, 1);

// 简单可复现伪随机（基于 index 的确定性 hash，不用 Math.random 保证可复现渲染）
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999.137) * 43758.5453;
  return x - Math.floor(x);
}

// 卡片排列：保证相邻卡片内容不重复（重复使用卡片时错开）
function layoutCards(cards: CardContent[], total: number): CardContent[] {
  if (cards.length === 0) return [];
  const out: CardContent[] = [];
  for (let i = 0; i < total; i++) {
    // 简单错位：每张卡用 cards[(i * 2 + Math.floor(i / cols)) % len]，
    // 但为通用性，这里用贪心——只要不和上一张相同即可
    const prev = i > 0 ? out[i - 1] : null;
    let idx = i % cards.length;
    if (cards.length > 1 && prev && cards[idx] === prev) {
      idx = (idx + 1) % cards.length;
    }
    out.push(cards[idx]!);
  }
  return out;
}

// 占位 cols，因 layoutCards 引用了全局 cols 变量，改为传参版本
function layoutCardsSafe(cards: CardContent[], total: number, cols: number): CardContent[] {
  if (cards.length === 0) return [];
  const out: CardContent[] = [];
  for (let i = 0; i < total; i++) {
    const prev = i > 0 ? out[i - 1] : null;
    let idx = (i * 2 + Math.floor(i / cols)) % cards.length;
    if (cards.length > 1 && prev && cards[idx] === prev) {
      idx = (idx + 1) % cards.length;
    }
    out.push(cards[idx]!);
  }
  return out;
}

export function CardArrayFlow({
  cards,
  cols = 4,
  rows = 5,
  radius = 24,
  phases,
  slowSlideDuration = 180,
  snakeAmplitude = 120,
  gap = 16,
}: CardArrayFlowProps) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const p = {
    snakeStart: phases?.snakeStart ?? 0,
    arrayStart: phases?.arrayStart ?? 30,
    slideStart: phases?.slideStart ?? 60,
    slowSlideStart: phases?.slowSlideStart ?? 85,
    focusStart: phases?.focusStart ?? 85 + slowSlideDuration,
  };

  const total = cols * rows;
  const arranged = layoutCardsSafe(cards, total, cols);

  // 卡片尺寸
  const cardW = (width - gap * (cols + 1)) / cols;
  const cardH = (height - gap * (rows + 1)) / rows;
  const centerX = width / 2;
  const centerY = height / 2;

  // 阶段进度
  const snakeProgress = interpolate(frame, [p.snakeStart, p.arrayStart], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const arrayProgress = interpolate(frame, [p.arrayStart, p.slideStart], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic),
  });
  const slideProgress = interpolate(frame, [p.slideStart, p.slowSlideStart], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic),
  });
  // D 阶段：慢-快-慢，持续 slowSlideDuration 帧
  const slowSlideProgress = interpolate(frame, [p.slowSlideStart, p.slowSlideStart + slowSlideDuration], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: SLOW_FAST_SLOW,
  });
  // E 阶段：中央卡片放大，其他异步缩小消失
  const focusProgress = interpolate(frame, [p.focusStart, p.focusStart + 60], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });

  // 找到最接近中心的卡片索引（E 阶段放大对象）
  const centerRow = Math.floor(rows / 2);
  const centerCol = Math.floor(cols / 2);
  const centerIndex = centerRow * cols + centerCol;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {arranged.map((card, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const targetX = gap + col * (cardW + gap);
        const targetY = gap + row * (cardH + gap);
        const cardCenterX = targetX + cardW / 2;
        const cardCenterY = targetY + cardH / 2;

        // 距中心的归一化距离（用于鱼眼畸变和 E 阶段缩小）
        const distX = (cardCenterX - centerX) / (width / 2);
        const distY = (cardCenterY - centerY) / (height / 2);
        const distFromCenter = Math.sqrt(distX * distX + distY * distY);

        // ── 阶段 A：贪吃蛇流入 ──
        // 卡片沿贝塞尔曲线从画外流入目标位置，按 index 错峰
        const snakeDelay = i * 1.5;
        const snakeT = interpolate(snakeProgress * total + snakeDelay, [0, total], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin),
        });
        // 起点在画外左上方，加正弦曲线扰动
        const snakeStartX = -cardW - 100;
        const snakeStartY = height * 0.5 + Math.sin(i * 0.8) * snakeAmplitude;
        const snakeX = interpolate(snakeT, [0, 1], [snakeStartX, targetX]);
        const snakeY = interpolate(snakeT, [0, 1], [snakeStartY, targetY]) + Math.sin(snakeT * Math.PI * 2 + i) * snakeAmplitude * (1 - snakeT);

        // ── 阶段 B：阵列铺满（从贪吃蛇位置过渡到整齐阵列）──
        const x = interpolate(arrayProgress, [0, 1], [snakeX, targetX]);
        const y = interpolate(arrayProgress, [0, 1], [snakeY, targetY]);

        // ── 阶段 C：交替方向滑动 + 鱼眼畸变 + 色散 ──
        // 偶数行向左，奇数行向右
        const slideDir = row % 2 === 0 ? -1 : 1;
        const slideOffset = slideProgress * slideDir * cardW * 0.4;
        // 鱼眼畸变：距中心越远，畸变越大
        const fisheye = slideProgress * distFromCenter * 0.08;
        const fisheyeScale = 1 - fisheye;
        // 色散：边角卡片 RGB 偏移（用 box-shadow 模拟）
        const chromaShift = slideProgress * distFromCenter * 6;

        // ── 阶段 D：慢-快-慢整体滑动 ──
        const slowSlideOffset = slowSlideProgress * slideDir * cardW * 0.6;

        // ── 阶段 E：中央放大，其他异步缩小消失 ──
        const isCenter = i === centerIndex;
        const vanishDelay = seededRandom(i) * 30; // 随机延迟，异步消失
        const vanishT = interpolate(focusProgress * 100 + vanishDelay, [0, 60], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic),
        });
        const focusScale = isCenter
          ? 1 + focusProgress * 1.8   // 中央放大
          : 1 - vanishT * 0.9;        // 其他缩小
        const focusOpacity = isCenter ? 1 : 1 - vanishT;

        // 最终合成 transform
        const finalX = x + slideOffset + slowSlideOffset;
        const finalY = y;
        const finalScale = focusScale * fisheyeScale;
        const finalOpacity = snakeT * arrayProgress * focusOpacity;

        // 当 arrayProgress 还没开始时（纯贪吃蛇阶段），opacity 跟随 snakeT
        const displayOpacity = frame < p.arrayStart ? snakeT : finalOpacity;

        const style: CSSProperties = {
          position: "absolute",
          left: finalX,
          top: finalY,
          width: cardW,
          height: cardH,
          borderRadius: radius,
          transform: `scale(${finalScale})`,
          transformOrigin: "center center",
          opacity: displayOpacity,
          overflow: "hidden",
          boxShadow: chromaShift > 0
            ? `${chromaShift}px 0 0 rgba(255,0,80,0.3), ${-chromaShift}px 0 0 rgba(0,200,255,0.3)`
            : "0 8px 24px rgba(0,0,0,0.3)",
          willChange: "transform, opacity",
        };

        return (
          <div key={i} style={style}>
            <CardContentRender card={card} />
          </div>
        );
      })}
    </div>
  );
}

function CardContentRender({ card }: { card: CardContent }): ReactNode {
  if (card.kind === "image") {
    return <Img src={card.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  }
  if (card.kind === "video") {
    // v2.6.0: 用 <OffthreadVideo>（worker 线程帧精确解码）替代原生 <video> 占位符。
    // 事故来源：提示词工程项目 <video> 在无头 Chromium 中帧定位 ±2 帧误差。
    // CardArrayFlow 是装饰性卡片阵列，OffthreadVideo 在此作循环背景播放，统一组件规范。
    return (
      <OffthreadVideo
        src={card.src}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }
  // color 卡片
  return (
    <div style={{ width: "100%", height: "100%", background: card.bg, display: "grid", placeItems: "center" }}>
      {card.label ? <span style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>{card.label}</span> : null}
    </div>
  );
}
