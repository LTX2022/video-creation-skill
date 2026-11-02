/**
 * Dark Tech Glow - 深色科技风组件库
 * 来源：老七聊AI（抖音 98879680662）动效蒸馏
 * 日期：2026-06-17
 * 
 * 核心设计原则：
 * 1. 统一入场：translateY(+20→0) + opacity + scale(0.95→1.0)
 * 2. 四色系统：深蓝背景 + 紫蓝渐变标题 + 绿色激活态 + 白/灰正文
 * 3. 三态按钮：禁用灰 / 普通白 / 激活绿
 * 4. 节奏：多元素错开 100ms
 * 5. 金句：直接放大 ×2，不加装饰
 */

// The upstream package did not contain the ten formerly re-exported components.
// Do not advertise missing modules; compose real visuals from existing primitives.

/**
 * 统一入场动效工具函数
 * 使用方式：const style = useDarkTechEnter(frame, delayMs);
 */
export function useDarkTechEnter(frame: number, delayMs: number = 0, durationMs: number = 500, fps: number = 30) {
  const startFrame = Math.floor(delayMs / 1000 * fps);
  const durationFrames = Math.max(1, Math.floor(durationMs / 1000 * fps));
  
  const progress = frame < startFrame 
    ? 0 
    : frame > startFrame + durationFrames 
      ? 1 
      : (frame - startFrame) / durationFrames;
  
  // ease-out-cubic: 1 - (1 - x)^3
  const eased = 1 - Math.pow(1 - progress, 3);
  
  return {
    opacity: eased,
    transform: `translateY(${20 * (1 - eased)}px) scale(${0.95 + 0.05 * eased})`,
  };
}
