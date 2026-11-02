import type { CSSProperties } from "react";
import { Easing, interpolate } from "remotion";
import { VIDEO_FORMAT } from "../config/videoFormat";
import { drawStrokeStyle, motionEase, motionProgress, revealStyle } from "./motion";

export interface ReferenceSceneInput {
  frame?: number;
  durationInFrames?: number;
}

export interface KineticPromptToProductProps extends ReferenceSceneInput {
  eyebrow?: string;
  hookWord?: string;
  prompt?: string;
  productName?: string;
  resultLabel?: string;
  panels?: string[];
}

export interface AnnotatedFlowDiagramProps extends ReferenceSceneInput {
  eyebrow?: string;
  title?: string;
  nodes?: string[];
  conclusion?: string;
}

const defaultPanels = ["input", "model", "output"];
const defaultNodes = ["source", "reason", "build", "verify"];

function frameOf(input: ReferenceSceneInput): number {
  return Math.max(0, input.frame ?? 0);
}

function durationOf(input: ReferenceSceneInput): number {
  return Math.max(1, input.durationInFrames ?? VIDEO_FORMAT.fps * 4);
}

function range(input: ReferenceSceneInput, from: number, to: number, output: [number, number], easing = motionEase.outCubic) {
  return interpolate(frameOf(input), [from, to], output, {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function typedText(text: string, progress: number): string {
  const chars = [...text];
  const count = Math.max(0, Math.min(chars.length, Math.round(chars.length * progress)));
  return chars.slice(0, count).join("");
}

function isPortrait() {
  return VIDEO_FORMAT.id === "portrait";
}

function cssVar(name: string, fallback: string) {
  return `var(${name}, ${fallback})`;
}

function surfaceStyle(): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    color: cssVar("--text", "#f6f2e8"),
    background: [
      `radial-gradient(circle at 22% 18%, ${cssVar("--accent-soft", "rgba(255,210,120,.18)")} 0, transparent 28%)`,
      `radial-gradient(circle at 78% 72%, color-mix(in srgb, ${cssVar("--accent", "#e7bb63")} 20%, transparent) 0, transparent 32%)`,
      `linear-gradient(135deg, ${cssVar("--surface", "#10131c")}, ${cssVar("--shell", "#070912")})`,
    ].join(", "),
  };
}

export function KineticPromptToProductScene({
  frame = 0,
  durationInFrames,
  eyebrow = "reference preset",
  hookWord = "IDEA",
  prompt = "turn this insight into a usable product screen",
  productName = "Product System",
  resultLabel = "ready to render",
  panels = defaultPanels,
}: KineticPromptToProductProps) {
  const input = { frame, durationInFrames: durationOf({ durationInFrames }) };
  const d = input.durationInFrames;
  const portrait = isPortrait();
  const hookP = motionProgress(input, { start: 0, duration: d * 0.26, easing: Easing.out(Easing.exp) });
  const promptP = motionProgress(input, { start: d * 0.18, duration: d * 0.28, easing: motionEase.outCubic });
  const productP = motionProgress(input, { start: d * 0.38, duration: d * 0.34, easing: motionEase.outExpo });
  const settleP = motionProgress(input, { start: d * 0.72, duration: d * 0.18, easing: motionEase.inOutCubic });
  const typeP = motionProgress(input, { start: d * 0.25, duration: d * 0.34, easing: Easing.linear });
  const hookScale = interpolate(hookP, [0, 1], [portrait ? 2.4 : 2.9, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookX = interpolate(hookP, [0, 1], [portrait ? -260 : -420, 0], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardShift = portrait ? 140 : 220;

  return (
    <div data-scene-background style={surfaceStyle()}>
      <div
        style={{
          position: "absolute",
          inset: portrait ? "110px 72px 460px" : "80px 96px",
          display: "grid",
          gridTemplateRows: portrait ? "auto 1fr 1fr" : "auto 1fr",
          gap: portrait ? 56 : 44,
        }}
      >
        <div
          style={{
            ...revealStyle(input, { start: 4, duration: 24, y: 16 }),
            fontFamily: cssVar("--font-mono", "monospace"),
            fontSize: portrait ? 26 : 20,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: cssVar("--accent", "#e7bb63"),
          }}
        >
          {eyebrow}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: portrait ? "1fr" : "0.9fr 1.1fr",
            gap: portrait ? 56 : 84,
            alignItems: "center",
            minHeight: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                opacity: 0.2 + hookP * 0.8,
                transform: `translate3d(${hookX}px, 0, 0) scale(${hookScale})`,
                transformOrigin: "left center",
                fontFamily: cssVar("--font-display-en", "system-ui"),
                fontSize: portrait ? 172 : 210,
                lineHeight: 0.82,
                fontWeight: 800,
                letterSpacing: 0,
                whiteSpace: "nowrap",
              }}
            >
              {hookWord}
            </div>
            <div
              style={{
                marginTop: portrait ? 30 : 22,
                width: portrait ? "92%" : "72%",
                height: portrait ? 12 : 8,
                background: cssVar("--accent", "#e7bb63"),
                transform: `scaleX(${promptP})`,
                transformOrigin: "left center",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gap: portrait ? 34 : 26,
              transform: `translate3d(${(1 - promptP) * cardShift}px, 0, 0)`,
              opacity: promptP,
            }}
          >
            <div
              style={{
                border: `1px solid ${cssVar("--rule", "rgba(255,255,255,.18)")}`,
                background: cssVar("--surface-2", "rgba(255,255,255,.08)"),
                borderRadius: portrait ? 34 : 28,
                padding: portrait ? 38 : 30,
                boxShadow: `0 34px 90px ${cssVar("--accent-glow", "rgba(231,187,99,.16)")}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: portrait ? 34 : 24,
                }}
              >
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    style={{
                      width: portrait ? 18 : 13,
                      height: portrait ? 18 : 13,
                      borderRadius: 999,
                      background: index === 0 ? cssVar("--accent", "#e7bb63") : cssVar("--rule", "rgba(255,255,255,.2)"),
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  fontFamily: cssVar("--font-mono", "monospace"),
                  fontSize: portrait ? 34 : 26,
                  lineHeight: 1.45,
                  minHeight: portrait ? 146 : 82,
                  color: cssVar("--text", "#f6f2e8"),
                }}
              >
                {typedText(prompt, typeP)}
                <span style={{ color: cssVar("--accent", "#e7bb63") }}>
                  {Math.floor(frame / 12) % 2 === 0 ? "_" : ""}
                </span>
              </div>
            </div>

            <div
              style={{
                border: `1px solid ${cssVar("--rule", "rgba(255,255,255,.18)")}`,
                background: `linear-gradient(145deg, ${cssVar("--surface-2", "rgba(255,255,255,.10)")}, rgba(255,255,255,.035))`,
                borderRadius: portrait ? 42 : 34,
                padding: portrait ? 44 : 36,
                minHeight: portrait ? 540 : 430,
                opacity: productP,
                transform: `translate3d(0, ${(1 - productP) * 72}px, 0) rotate(${(1 - productP) * -2.6}deg) scale(${0.92 + productP * 0.08})`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontFamily: cssVar("--font-mono", "monospace"),
                  fontSize: portrait ? 28 : 20,
                  color: cssVar("--text-2", "rgba(255,255,255,.72)"),
                  marginBottom: portrait ? 44 : 34,
                }}
              >
                <span>{productName}</span>
                <span>{resultLabel}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: portrait ? "1fr" : "1fr 1fr 1fr", gap: 18 }}>
                {panels.slice(0, 3).map((panel, index) => {
                  const p = range(input, d * 0.44 + index * 8, d * 0.66 + index * 8, [0, 1]);
                  return (
                    <div
                      key={panel}
                      style={{
                        minHeight: portrait ? 112 : 210,
                        borderRadius: portrait ? 24 : 22,
                        border: `1px solid ${index === panels.length - 1 ? cssVar("--accent", "#e7bb63") : cssVar("--rule", "rgba(255,255,255,.16)")}`,
                        padding: portrait ? 28 : 24,
                        opacity: p,
                        transform: `translate3d(0, ${(1 - p) * 34}px, 0)`,
                        background: index === panels.length - 1
                          ? `linear-gradient(135deg, ${cssVar("--accent-soft", "rgba(231,187,99,.18)")}, rgba(255,255,255,.04))`
                          : "rgba(255,255,255,.035)",
                      }}
                    >
                      <div style={{ fontFamily: cssVar("--font-mono", "monospace"), fontSize: portrait ? 22 : 16, color: cssVar("--accent", "#e7bb63") }}>
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div style={{ marginTop: 18, fontSize: portrait ? 34 : 28, fontWeight: 700 }}>{panel}</div>
                      <div
                        style={{
                          marginTop: portrait ? 28 : 36,
                          height: portrait ? 10 : 8,
                          width: `${46 + index * 18}%`,
                          background: cssVar("--accent", "#e7bb63"),
                          transform: `scaleX(${p * (0.72 + settleP * 0.28)})`,
                          transformOrigin: "left center",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnnotatedFlowDiagramScene({
  frame = 0,
  durationInFrames,
  eyebrow = "workflow preset",
  title = "Build the path",
  nodes = defaultNodes,
  conclusion = "verify before delivery",
}: AnnotatedFlowDiagramProps) {
  const input = { frame, durationInFrames: durationOf({ durationInFrames }) };
  const d = input.durationInFrames;
  const portrait = isPortrait();
  const activeIndex = Math.min(nodes.length - 1, Math.floor(range(input, d * 0.22, d * 0.78, [0, nodes.length])));
  const nodeW = portrait ? 760 : 280;
  const nodeH = portrait ? 136 : 132;
  const gap = portrait ? 42 : 74;
  const startX = portrait ? 160 : 260;
  const startY = portrait ? 420 : 430;

  const nodePosition = (index: number) => {
    if (portrait) {
      return { x: startX, y: startY + index * (nodeH + gap) };
    }
    return { x: startX + index * (nodeW + gap), y: startY + Math.sin(index * 1.4) * 34 };
  };

  return (
    <div data-scene-background
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "linear-gradient(135deg, #f7f3ea, #ebe6d9)",
        color: "#171717",
      }}
    >
      <svg width={VIDEO_FORMAT.width} height={VIDEO_FORMAT.height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="reference-dot-grid" width="34" height="34" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.3" fill="rgba(0,0,0,.11)" />
          </pattern>
        </defs>
        <rect data-scene-decoration="background" width="100%" height="100%" fill="url(#reference-dot-grid)" opacity="0.7" />
        {nodes.slice(0, -1).map((_, index) => {
          const from = nodePosition(index);
          const to = nodePosition(index + 1);
          const arrowP = motionProgress(input, { start: d * 0.24 + index * 18, duration: 34, easing: motionEase.inOutCubic });
          const x1 = from.x + (portrait ? nodeW / 2 : nodeW);
          const y1 = from.y + nodeH / 2;
          const x2 = portrait ? to.x + nodeW / 2 : to.x;
          const y2 = portrait ? to.y : to.y + nodeH / 2;
          const midX = portrait ? x1 : (x1 + x2) / 2;
          const midY = portrait ? (y1 + y2) / 2 : y1 - 76;
          const path = portrait
            ? `M ${x1} ${y1 + nodeH / 2} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2 - nodeH / 2}`
            : `M ${x1} ${y1} C ${midX} ${midY}, ${midX} ${y2}, ${x2} ${y2}`;
          return (
            <g key={index}>
              <path
                d={path}
                fill="none"
                stroke="#111"
                strokeWidth={portrait ? 5 : 4}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={drawStrokeStyle(input, portrait ? 390 : 340, { start: d * 0.24 + index * 18, duration: 34 })}
                opacity={0.74}
              />
              {arrowP > 0.82 ? (
                <circle cx={x2} cy={portrait ? y2 - nodeH / 2 : y2} r={portrait ? 8 : 7} fill="#111" />
              ) : null}
            </g>
          );
        })}
      </svg>

      <div style={{ position: "absolute", inset: 0 }}>
        <div
          style={{
            ...revealStyle(input, { start: 0, duration: 28, y: 22 }),
            position: "absolute",
            left: portrait ? 72 : 96,
            top: portrait ? 96 : 80,
            right: portrait ? 72 : 96,
          }}
        >
          <div
            style={{
              fontFamily: cssVar("--font-mono", "monospace"),
              fontSize: portrait ? 28 : 20,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#6b6257",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              marginTop: portrait ? 26 : 18,
              fontFamily: cssVar("--font-display-cn", "system-ui"),
              fontSize: portrait ? 104 : 86,
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: 0,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ position: "absolute", inset: 0 }}>
          {nodes.map((node, index) => {
            const pos = nodePosition(index);
            const reveal = motionProgress(input, { start: d * 0.14 + index * 18, duration: 30 });
            const isActive = index === activeIndex;
            return (
              <div
                key={node}
                style={{
                  position: "absolute",
                  left: pos.x,
                  top: pos.y,
                  width: nodeW,
                  height: nodeH,
                  borderRadius: 18,
                  border: `${isActive ? 4 : 2}px solid ${isActive ? "#111" : "rgba(0,0,0,.34)"}`,
                  background: isActive ? "#fff7d6" : "rgba(255,255,255,.72)",
                  boxShadow: isActive ? "0 22px 54px rgba(0,0,0,.16)" : "0 10px 28px rgba(0,0,0,.07)",
                  opacity: reveal,
                  transform: `translate3d(0, ${(1 - reveal) * 28}px, 0) scale(${0.94 + reveal * 0.06})`,
                  padding: portrait ? "26px 34px" : "22px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: portrait ? 24 : 18,
                }}
              >
                <span
                  style={{
                    width: portrait ? 54 : 42,
                    height: portrait ? 54 : 42,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: isActive ? "#111" : "rgba(0,0,0,.1)",
                    color: isActive ? "#fff" : "#111",
                    fontFamily: cssVar("--font-mono", "monospace"),
                    fontSize: portrait ? 24 : 16,
                  }}
                >
                  {index + 1}
                </span>
                <span style={{ fontSize: portrait ? 42 : 30, fontWeight: 800, letterSpacing: 0 }}>{node}</span>
              </div>
            );
          })}

          <svg width={VIDEO_FORMAT.width} height={VIDEO_FORMAT.height} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {nodes.map((_, index) => {
              const pos = nodePosition(index);
              const ringP = motionProgress(input, { start: d * 0.36 + index * 18, duration: 18 });
              if (index !== activeIndex) return null;
              return (
                <ellipse
                  key={index}
                  cx={pos.x + nodeW * 0.52}
                  cy={pos.y + nodeH * 0.5}
                  rx={(nodeW * 0.58) * ringP}
                  ry={(nodeH * 0.58) * ringP}
                  fill="none"
                  stroke="#d6402b"
                  strokeWidth={portrait ? 8 : 6}
                  strokeLinecap="round"
                  opacity={ringP}
                  transform={`rotate(-4 ${pos.x + nodeW * 0.52} ${pos.y + nodeH * 0.5})`}
                />
              );
            })}
          </svg>
        </div>

        <div
          style={{
            ...revealStyle(input, { start: d * 0.7, duration: 26, y: 28 }),
            position: "absolute",
            right: portrait ? 72 : 96,
            bottom: portrait ? 460 : 84,
            left: portrait ? 72 : "auto",
            maxWidth: portrait ? "100%" : 720,
            borderRadius: 22,
            background: "#111",
            color: "#f7f3ea",
            padding: portrait ? "32px 38px" : "24px 30px",
            fontFamily: cssVar("--font-display-cn", "system-ui"),
            fontSize: portrait ? 42 : 30,
            fontWeight: 800,
          }}
        >
          {conclusion}
        </div>
      </div>
    </div>
  );
}
