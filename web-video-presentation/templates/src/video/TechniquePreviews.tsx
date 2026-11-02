/**
 * TechniquePreviews.tsx — 12 个 Jitter 动态技法族的可视化预览
 *
 * 行业领先功能：Agent 选 motionTechnique 时不是靠读文字，而是靠看效果。
 * 在 Remotion Studio 中注册为独立 composition，可直接预览每个技法的动画。
 *
 * 用法：
 *   1. 在 Studio 左侧 composition 列表选择 `technique-01-fade` ~ `technique-12-glass`
 *   2. 播放预览动画
 *   3. 选定技法后，复制对应代码片段到章节组件
 *
 * 每个 preview 都是帧驱动的最小示例，可直接用 `npx remotion render` 验证。
 * 所有动画用 useCurrentFrame() + interpolate() + Easing，不用 CSS animation。
 */

import { AbsoluteFill, useCurrentFrame, interpolate, Easing, spring } from "remotion";
import { motionProgress, staggerProgress, revealStyle } from "./motion";

const FPS = 60;
const DURATION = 90; // 1.5s @ 60fps — 足够看清动画

// ─── 共享样式 ───────────────────────────────────────────

const stage: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0a0a0a",
  fontFamily: "system-ui, sans-serif",
};

const card: React.CSSProperties = {
  width: 200,
  height: 120,
  borderRadius: 16,
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  fontSize: 24,
  fontWeight: 700,
};

const label: React.CSSProperties = {
  position: "absolute",
  top: 20,
  left: 20,
  color: "#888",
  fontSize: 14,
  fontFamily: "monospace",
};

function Stage({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <AbsoluteFill style={stage}>
      <div style={label}>{id}</div>
      {children}
    </AbsoluteFill>
  );
}

// ─── 01-fade-opacity ───────────────────────────────────

export const FadePreview: React.FC = () => {
  const frame = useCurrentFrame();
  const p = motionProgress({ frame }, { duration: 24 });
  return (
    <Stage id="01-fade-opacity">
      <div style={{ ...card, opacity: p }}>Fade In</div>
    </Stage>
  );
};

// ─── 02-stagger-offset ─────────────────────────────────

export const StaggerPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const items = ["A", "B", "C", "D"];
  return (
    <Stage id="02-stagger-offset">
      <div style={{ display: "flex", gap: 12 }}>
        {items.map((text, i) => {
          const p = staggerProgress({ frame }, { index: i, stagger: 6, duration: 24 });
          return (
            <div key={i} style={{ ...card, width: 80, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
              {text}
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

// ─── 03-reveal ─────────────────────────────────────────

export const RevealPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const p = motionProgress({ frame }, { duration: 36 });
  const clipRight = interpolate(p, [0, 1], [100, 0]);
  return (
    <Stage id="03-reveal">
      <div style={{ ...card, clipPath: `inset(0 ${clipRight}% 0 0)` }}>Reveal</div>
    </Stage>
  );
};

// ─── 04-slide-move ────────────────────────────────────

export const SlidePreview: React.FC = () => {
  const frame = useCurrentFrame();
  const p = motionProgress({ frame }, { duration: 30, easing: Easing.out(Easing.ease) });
  const x = interpolate(p, [0, 1], [-300, 0]);
  return (
    <Stage id="04-slide-move">
      <div style={{ ...card, transform: `translateX(${x}px)`, opacity: p }}>Slide In</div>
    </Stage>
  );
};

// ─── 05-scale-rotate ──────────────────────────────────

export const ScaleRotatePreview: React.FC = () => {
  const frame = useCurrentFrame();
  const s = spring({ frame, fps: 60, config: { damping: 12, stiffness: 200 } });
  const rot = interpolate(s, [0, 1], [-15, 0]);
  return (
    <Stage id="05-scale-rotate">
      <div style={{ ...card, transform: `scale(${s}) rotate(${rot}deg)` }}>Pop!</div>
    </Stage>
  );
};

// ─── 06-stack ─────────────────────────────────────────

export const StackPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const colors = ["#6366f1", "#8b5cf6", "#ec4899"];
  return (
    <Stage id="06-stack">
      <div style={{ position: "relative", width: 220, height: 140 }}>
        {colors.map((color, i) => {
          const enterFrame = i * 30;
          const p = interpolate(frame, [enterFrame, enterFrame + 24], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.ease),
          });
          const exitP = interpolate(frame, [enterFrame + 20, enterFrame + 36], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.ease),
          });
          const scale = interpolate(exitP, [0, 1], [1, 0.9]);
          const opacity = p * (1 - exitP * 0.5);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 200,
                height: 120,
                borderRadius: 16,
                background: color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 24,
                fontWeight: 700,
                zIndex: i,
                transform: `translateX(${(1 - p) * 100}px) scale(${scale})`,
                opacity,
              }}
            >
              Card {i + 1}
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

// ─── 07-morph ─────────────────────────────────────────
// 注意：flubber 不在默认依赖中。这里用 SVG path 插值模拟 morph。
// Agent 使用真实 morph 时需 npm install flubber。

export const MorphPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const p = motionProgress({ frame }, { duration: 48, easing: Easing.inOut(Easing.ease) });
  // 简化：圆形 → 方形，用 border-radius 插值
  const radius = interpolate(p, [0, 1], [50, 8]);
  return (
    <Stage id="07-morph">
      <div
        style={{
          width: 160,
          height: 160,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          borderRadius: `${radius}%`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        Morph
      </div>
    </Stage>
  );
};

// ─── 08-blur ──────────────────────────────────────────

export const BlurPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const p = motionProgress({ frame }, { duration: 36, easing: Easing.out(Easing.ease) });
  const blur = interpolate(p, [0, 1], [20, 0]);
  return (
    <Stage id="08-blur">
      <div style={{ ...card, filter: `blur(${blur}px)` }}>Focus</div>
    </Stage>
  );
};

// ─── 09-gradient ──────────────────────────────────────

export const GradientPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const pos = (frame * 0.5) % 200;
  return (
    <Stage id="09-gradient">
      <div
        style={{
          width: 300,
          height: 150,
          borderRadius: 16,
          background: "linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899, #6366f1)",
          backgroundSize: "200% 100%",
          backgroundPosition: `${pos}% 0`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        Flow
      </div>
    </Stage>
  );
};

// ─── 10-counter ──────────────────────────────────────

export const CounterPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const value = interpolate(frame, [0, 48], [0, 1234567], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });
  return (
    <Stage id="10-counter">
      <div style={{ color: "white", fontSize: 48, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
        {Math.round(value).toLocaleString()}
      </div>
    </Stage>
  );
};

// ─── 11-bento-grid ───────────────────────────────────

export const BentoPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const sizes = [
    { span: 2, row: 2 }, // big
    { span: 1, row: 1 },
    { span: 1, row: 1 },
    { span: 1, row: 1 },
    { span: 1, row: 1 },
  ];
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];
  return (
    <Stage id="11-bento-grid">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 100px)",
          gridTemplateRows: "repeat(2, 80px)",
          gap: 8,
        }}
      >
        {sizes.map((s, i) => {
          const p = staggerProgress({ frame }, { index: i, stagger: 6, duration: 24 });
          return (
            <div
              key={i}
              style={{
                gridColumn: `span ${s.span}`,
                gridRow: `span ${s.row}`,
                borderRadius: 12,
                background: colors[i],
                opacity: p,
                transform: `scale(${0.8 + 0.2 * p})`,
              }}
            />
          );
        })}
      </div>
    </Stage>
  );
};

// ─── 12-glass-shader ─────────────────────────────────
// 注意：真实 glass 需要 WebGL（@react-three/fiber），不在默认依赖中。
// 这里用 SVG filter 模拟磨砂玻璃效果——Remotion 渲染安全。

export const GlassPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const p = motionProgress({ frame }, { duration: 36, easing: Easing.out(Easing.ease) });
  const frost = interpolate(p, [0, 1], [15, 0]);
  return (
    <Stage id="12-glass-shader">
      {/* 背景渐变色块，让玻璃效果可见 */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 200,
          background: "linear-gradient(45deg, #6366f1, #ec4899, #f59e0b)",
          borderRadius: 20,
        }}
      />
      {/* 玻璃层 */}
      <div
        style={{
          position: "relative",
          width: 220,
          height: 100,
          borderRadius: 16,
          background: "rgba(255,255,255,0.15)",
          backdropFilter: `blur(${frost}px)`, // 网页端预览用；Remotion 渲染用预模糊素材
          border: "1px solid rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 20,
          fontWeight: 700,
          zIndex: 1,
        }}
      >
        Glass
      </div>
    </Stage>
  );
};

// ─── 注册表 ───────────────────────────────────────────

export const techniquePreviews = [
  { id: "technique-01-fade", component: FadePreview, technique: "01-fade-opacity" },
  { id: "technique-02-stagger", component: StaggerPreview, technique: "02-stagger-offset" },
  { id: "technique-03-reveal", component: RevealPreview, technique: "03-reveal" },
  { id: "technique-04-slide", component: SlidePreview, technique: "04-slide-move" },
  { id: "technique-05-scale-rotate", component: ScaleRotatePreview, technique: "05-scale-rotate" },
  { id: "technique-06-stack", component: StackPreview, technique: "06-stack" },
  { id: "technique-07-morph", component: MorphPreview, technique: "07-morph" },
  { id: "technique-08-blur", component: BlurPreview, technique: "08-blur" },
  { id: "technique-09-gradient", component: GradientPreview, technique: "09-gradient" },
  { id: "technique-10-counter", component: CounterPreview, technique: "10-counter" },
  { id: "technique-11-bento", component: BentoPreview, technique: "11-bento-grid" },
  { id: "technique-12-glass", component: GlassPreview, technique: "12-glass-shader" },
];
