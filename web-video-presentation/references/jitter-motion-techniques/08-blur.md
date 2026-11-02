# 08 · Blur 模糊

> **一句话**：用高斯模糊控制"清晰度"，引导观众注意力、制造氛围和梦境感，是 Jitter "质感层"的核心技法。

## 1. 视觉特征

元素从 `blur: 20px`（模糊不清）过渡到 `blur: 0`（清晰），或反向。模糊不只是"看不清"，而是**用"清晰度"作为注意力引导工具**——清晰的地方被关注，模糊的地方被忽略。

```
Blur In:   🔅模糊 → ◐半透 → ◯清晰    从模糊到清晰（聚焦）
Blur Out:  ◯清晰 → ◐半透 → 🔅模糊    从清晰到模糊（失焦）
```

### Blur 与 Fade 的本质区别

| 维度 | Fade | Blur |
|---|---|---|
| 机制 | opacity 变化 | filter:blur 变化 |
| 认知 | "它出现了" | "我看清了" |
| 注意力 | 中性 | **主动引导**（清晰=重要） |
| 氛围 | 无 | 有（梦境、景深、质感） |
| 性能 | 最优 | 中-高（需 GPU） |

> **关键洞察**：Jitter 在 2024-10-15 发布 blur 时列出了它的 6 大用途：**景深和焦点、梦幻渐变模糊、bokeh 效果、有机转场、优雅文字动画、遮罩羽化**。Blur 不只是"模糊"，它是**用清晰度做注意力管理**。这正是它和 fade 的根本区别——fade 让元素"存在或不存在"，blur 让元素"重要或不重要"。

## 2. Jitter Blur 的能力演进

```
2024-10   Blur 上线（图层 blur + blur 动画）
2025-01   Blur presets（一键 blur 预设）
2025-06   Blur templates（模板集）
2026-06   Background blur（背景模糊，磨砂玻璃）
```

### Blur 的三个层次

```
L1  图层 Blur       整个图层模糊（blur: 20px）
L2  动画 Blur        blur 从某值动画到 0（或反向）
L3  Background blur  背景模糊（backdrop-filter，磨砂玻璃）
```

## 3. Blur 的四种语义

### 语义 A：聚焦（Blur In）

```
blur: 20px → 0px
opacity: 0 → 1（通常同步）
```

**用途**：让元素从"模糊不清"变"清晰"，制造"聚焦"感。
**场景**：重点信息登场、图片揭示、标题入场。

### 语义 B：失焦（Blur Out）

```
blur: 0 → 20px
opacity: 1 → 0.3（不完全消失，半透保留）
```

**用途**：让元素"退出焦点"，引导注意力转移。
**场景**：旧内容淡出、背景化、次要信息退后。

### 语义 C：景深（持续模糊）

```
背景层：blur: 8px（持续）
前景层：blur: 0（清晰）
```

**用途**：制造"前后景"层次感，模拟相机景深。
**场景**：Hero 背景、产品展示、氛围营造。

### 语义 D：氛围（动态模糊）

```
blur: 0 → 30px → 0px（循环）
配合颜色渐变
```

**用途**：纯氛围，无具体信息，像"呼吸"。
**场景**：背景动效、loading、品牌循环。

## 4. 设计参数

### 核心参数

| 参数 | 作用 | 推荐值 |
|---|---|---|
| `blurFrom` | 起始模糊 | 进场 15-30px / 失焦 0 |
| `blurTo` | 目标模糊 | 进场 0 / 失焦 15-30px |
| `duration` | 动画时长 | 600-1000ms（比 fade 慢） |
| `easing` | 缓动 | ease-out（进场）/ ease-in（失焦） |
| `opacitySync` | 同步透明度 | 0（纯 blur）/ 0.5（半透）/ 1（无 fade） |

### 模糊值的选择

```
轻微模糊（3-8px）：   微妙景深、柔和感
中度模糊（10-20px）： 明确的"看不清→看清"
重度模糊（25-40px）： 完全抽象、梦境感
极端模糊（50px+）：   纯色块、抽象背景
```

### Duration 的"慢"原则

```
Blur 比 fade 慢：
  Fade:   300-500ms
  Blur:   600-1000ms

原因：模糊→清晰是一个"聚焦过程"
观众需要感受"从看不清到看清"
太快（<400ms）会变成"闪现"
```

## 5. 节奏控制

### Blur 的"半透停留"技巧

```
不是直接 20px → 0px，而是分两段：

阶段 1：20px → 5px（700ms，从"看不清"到"快看清"）
阶段 2：5px → 0px（300ms，最后"咔嚓"聚焦）

效果：先"酝酿"，后"聚焦"，有节奏感
```

### Blur + 颜色同步

```
blur 动画的同时，颜色也变化：
  模糊时：低饱和、偏色
  清晰时：高饱和、正确色

效果：像"雾散开，颜色恢复"
```

### 多元素 Blur 的"焦点转移"

```
不要所有元素同时 blur in——用 blur 做"焦点转移"：

T0: 元素A blur 0（清晰），元素B blur 20px（模糊）
T1: 元素A blur 0→20px（失焦），元素B blur 20px→0（聚焦）

效果：注意力从 A 转移到 B
```

### 与口播同步

- Blur In 完成 = 口播强调该信息时
- Blur Out 开始 = 口播转移话题时
- 景深模糊 = 持续，不与具体口播对齐

## 6. 组合配方

### 配方 A：Blur In（聚焦进场）

```
blur: 20px → 0
opacity: 0 → 1
duration: 800ms
easing: ease-out
```
**用途**：重点信息、图片、标题进场。
**Jitter 模板**：`blur-bubbles`、`blur-logo-switcher`

### 配方 B：Blur Fade（模糊淡入，最常用）

```
blur: 15px → 0
opacity: 0 → 1
translateY: 20px → 0
duration: 600ms
easing: ease-out
```
**用途**：通用进场，比纯 fade 有质感。
**Jitter 模板**：`blur-text-scroller`、`blur-counter`

### 配方 C：失焦退场

```
blur: 0 → 20px
opacity: 1 → 0.3
scale: 1 → 1.05
duration: 500ms
easing: ease-in
```
**用途**：旧内容退后，让位给新内容。
**Jitter 模板**：`blur-news-stack-ios`

### 配方 D：景深背景

```
背景层：blur: 8px（持续）
  + 轻微 scale 呼吸（1 → 1.03 → 1，循环 8s）
前景层：blur: 0（清晰）
```
**用途**：Hero、产品展示、氛围背景。

### 配方 E：梦境模糊（循环）

```
blur: 0 → 30px → 0px（循环）
配合颜色渐变
duration: 4000ms（循环）
easing: ease-in-out

效果：像"呼吸"，氛围背景
```
**用途**：loading、品牌背景、纯氛围。
**Jitter 模板**：`gradient-noisy-blur`

### 配方 F：Background Blur（磨砂玻璃）

```
backdrop-filter: blur(20px)
背景层在玻璃后方"被模糊"
前景文字保持清晰

注意：这是 backdrop-filter，不是 filter:blur
```
**用途**：磨砂玻璃面板、UI 浮层。
**Jitter 模板**：`frosted-glass-counter`、`blur-article-gallery-ios`

> **⚠️ Render-Safe 警告**：`backdrop-filter` 在 Remotion 渲染时可能不一致（见项目 `MOTION-DESIGN.md` Render-Safe Motion Constraints）。先做目标渲染器和Alpha/底片的实际烟测；不一致时改用预模糊背景或SVG filter，不能把网页预览成功当视频合格。

### 配方 G：Blur + Blend（混合模式）

```
模糊层 + mix-blend-mode: screen / overlay
两个模糊层叠加产生发光效果
```
**用途**：光晕、发光、氛围光。
**Jitter 模板**：`blend-modes-gradient-orbs`、`gradient-noisy-blur`

## 7. 反模式

| 反模式 | 说明 | 替代 |
|---|---|---|
| Blur 值太大（>40px） | 完全抽象，看不出是什么 | 控制在 15-25px |
| Blur 时长太短（<400ms） | 闪现，无聚焦感 | 提到 600-1000ms |
| Blur 用 ease-in 进场 | 越来越慢，不自然 | 进场用 ease-out |
| 全屏 blur 转场 | 像"白内障" | 用 blur + fade + scale 组合 |
| 模糊了文字主体 | 影响阅读 | blur 只用于背景或装饰 |
| 性能问题（太多 blur） | 卡顿 | 限制同时 blur 的元素数 |
| Remotion 用 backdrop-filter | 渲染不一致 | 用预模糊素材或 SVG filter |
| **装饰光效未设 z-index 遮挡内容**（教训 22） | GlowOrb 等装饰模糊层盖住卡片文字 | 装饰模糊层必须 `zIndex: 0` + `pointerEvents: none`，内容 `zIndex: 1`。用户原话："算力分配服务稳定长期运营 这个镜头有图案穿插到这几个文字上了" |
| **overlay opacity <0.25**（教训 19） | 暗色背景上模糊图形不可见 | overlay/叠加层 blur 图形 opacity ≥0.25 |

## 8. Web / Remotion 落地

### CSS 实现（网页端）

```css
/* Token */
--blur-light: 8px;
--blur-medium: 20px;
--blur-heavy: 30px;

/* 配方 A：Blur In */
.blur-in {
  filter: blur(20px);
  opacity: 0;
  animation: blurIn 800ms var(--ease-out) forwards;
}
@keyframes blurIn {
  to { filter: blur(0); opacity: 1; }
}

/* 配方 F：Background Blur（磨砂玻璃） */
.frosted-glass {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* 配方 D：景深背景 */
.depth-bg {
  filter: blur(8px);
  transform: scale(1.05);  /* 避免边缘漏白 */
  animation: breathe 8s ease-in-out infinite;
}
@keyframes breathe {
  0%, 100% { transform: scale(1.05); }
  50% { transform: scale(1.08); }
}
```

### Remotion 实现（帧驱动）

```tsx
import { interpolate, Easing } from 'remotion';

// 配方 A：Blur In
const blurIn = (frame: number, start: number, duration: number) => {
  const p = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });
  return {
    filter: `blur(${(1 - p) * 20}px)`,
    opacity: p,
  };
};

// 配方 C：失焦退场
const blurOut = (frame: number, start: number, duration: number) => {
  const p = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.ease),
  });
  return {
    filter: `blur(${p * 20}px)`,
    opacity: 1 - p * 0.7,
    transform: `scale(${1 + p * 0.05})`,
  };
};

// 配方 D：景深背景（持续）
const depthBg = (frame: number) => {
  const breathe = Math.sin(frame * 0.02) * 0.02 + 1.05;
  return {
    filter: 'blur(8px)',
    transform: `scale(${breathe})`,
  };
};
```

### ⚠️ Remotion 的 backdrop-filter 替代方案

参考项目 MOTION-DESIGN.md 的 Render-Safe 约束：

```tsx
// ❌ 不安全：backdrop-filter 在 Remotion 渲染可能不一致
<div style={{ backdropFilter: 'blur(20px)' }} />

// ✅ 安全：预模糊的背景图片
<img src={blurredBgImage} style={{ filter: 'blur(0)' }} />
<div style={{ background: 'rgba(255,255,255,0.1)' }}>
  {清晰内容}
</div>

// ✅ 安全：SVG filter
<svg>
  <defs>
    <filter id="blur">
      <feGaussianBlur stdDeviation="10" />
    </filter>
  </defs>
  <image filter="url(#blur)" />
</svg>
```

## 9. 拿到一篇文章，怎么设计它的 blur 动效？

### Step 1：识别"需要聚焦"或"需要氛围"的时刻

- 重点信息登场（需要聚焦）
- 旧内容退场让位（需要失焦）
- Hero/背景氛围（需要景深）
- 梦境/情感场景（需要模糊氛围）
- 磨砂玻璃 UI（需要 background blur）

### Step 2：判断语义 → 选配方

| 场景 | 语义 | 配方 |
|---|---|---|
| 重点进场 | 聚焦 | A |
| 通用进场 | 模糊淡入 | B |
| 退场让位 | 失焦 | C |
| Hero 背景 | 景深 | D |
| 氛围循环 | 梦境 | E |
| UI 浮层 | 磨砂玻璃 | F |
| 发光氛围 | Blur+Blend | G |

### Step 3：定模糊值 + 时长

```
进场聚焦：20px → 0, 800ms, ease-out
失焦退场：0 → 20px, 500ms, ease-in
景深背景：8px（持续）
梦境循环：0 → 30px → 0, 4000ms, ease-in-out
磨砂玻璃：20px（backdrop-filter 持续）
```

### Step 4：决定是否同步 opacity

```
纯 blur（无 fade）：       清晰度变化，存在感不变
blur + opacity（推荐）：   更自然的"出现/消失"
blur + scale：             失焦时有"放大退后"感
```

### Step 5：设计焦点转移（多元素时）

```
不要所有元素同时 blur in：
  元素A清晰时，元素B模糊
  切换时：A 失焦 + B 聚焦（同步）
```

### Step 6：与口播对齐

- Blur In 完成 = 口播强调该信息
- Blur Out 开始 = 口播转移话题
- 景深/氛围 = 持续，不对齐

### Step 7：检查反模式

- [ ] 模糊值是否合理（15-25px）？
- [ ] 时长是否 ≥ 600ms？
- [ ] 进场是否用 ease-out？
- [ ] 是否模糊了文字主体？（应避免）
- [ ] Remotion 是否避免了 backdrop-filter？
- [ ] 同时 blur 的元素是否过多？（限制 2-3 个）

---

## 参考模板

- `blur-bubbles` — 气泡模糊
- `blur-bubbles-carousel` — 模糊轮播
- `blur-logo-switcher` — Logo 切换
- `blur-news-stack-ios` — iOS 风新闻堆叠
- `blur-swirl` — 漩涡模糊
- `blur-text-scroller` — 文字滚动
- `blur-counter` — 计数器
- `blur-article-gallery-ios` — iOS 文章画廊
- `gradient-noisy-blur` — 噪点渐变模糊
- `frosted-glass-counter` — 磨砂玻璃计数
