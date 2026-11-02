# 01 · Fade & Opacity 渐显渐隐

> **一句话**：用透明度变化控制元素的"出现"和"消失"，是最朴素也最万能的动效地基。

## 1. 视觉特征

元素在不改变位置和形状的前提下，通过 `opacity: 0 → 1`（渐显）或 `opacity: 1 → 0`（渐隐）完成状态切换。Jitter 把它归类为 **In / Out 预设**的最基础形态。

### 为什么它是"地基"

Jitter 的 changelog（2020-09-04）记录：最初只有 6 个预设，全部基于 opacity + 变换的组合。**opacity 是唯一一个"单独使用也成立"的动画属性** —— Move/Scale/Rotate 单独用都会显得突兀，但 fade 单独用永远安全。

```
opacity 的特殊性：
  - 不依赖布局：不影响周围元素位置
  - 不依赖方向：无需指定 left/right/up/down
  - 性能最优：浏览器只触发 composite 层
  - 语义中性：可表达"出现"也可表达"消失"
```

## 2. Jitter 的 In/Out 预设体系

Jitter 把所有进场动画归为 **In**，退场归为 **Out**，第三类 **Custom** 留给从零构建。opacity 在三类中都是底层属性：

```
In 预设（进场）         Out 预设（退场）         Custom（自定义）
├── Appear (纯 fade)    ├── Disappear (纯 fade)  ├── Opacity（原子）
├── Pop In              ├── Pop Out              ├── Move
├── Slide In           ├── Slide Out           ├── Scale
├── Scale In           ├── Scale Out           ├── Rotate
└── ...                └── ...                  └── ...
```

> **关键洞察**：Jitter 的"Appear"预设就是**纯 opacity 动画**，没有任何位移或缩放。它是最克制、最常用的进场方式。当你不确定用什么时，用 Appear。

## 3. → From 方向模式（Jitter 的关键创新）

Jitter（2020-11-06）为所有基础动作引入了两种方向模式：

```
To → 模式：当前状态 ──opacity 1→0──→ 消失      （常规退场）
→ From 模式：opacity 0 ──0→1──→ 当前状态        （进场，省去手动设初始态）
```

**→ From 的意义**：以前做"进场"，要先设初始态（opacity: 0）→ 调到目标态（opacity: 1）→ 再回到动画检查。→ From 模式让你直接在目标态加动画，反向推算。这把"进场动画的认知负担"降低了 50%。

## 4. 设计参数

### 核心参数

| 参数 | 作用 | 推荐值 | 说明 |
|---|---|---|---|
| `opacity` | 透明度 0-1 | `0 → 1` | 进场；退场反之 |
| `duration` | 动画时长 | 进场 300-500ms / 退场 200-400ms | 退场通常比进场快 |
| `easing` | 缓动曲线 | 进场 `ease-out` / 退场 `ease-in` | 见下表 |
| `delay` | 延迟 | 0（单独）/ stagger 间隔 | 见 [02-stagger](./02-stagger-offset.md) |

### Easing 选择

| 场景 | easing | cubic-bezier | 原因 |
|---|---|---|---|
| 元素进场 | `ease-out` | `cubic-bezier(0,0,0.2,1)` | 快进慢出，自然落入 |
| 元素退场 | `ease-in` | `cubic-bezier(0.4,0,1,1)` | 慢起快走，自然离开 |
| 情感切换（悲伤/宁静） | `ease-in-out` | `cubic-bezier(0.4,0,0.2,1)` | 对称，呼吸感 |
| 硬切转场 | `linear` | `linear` | 无缓动，机械感 |

### 时长决策

```
duration 决策树：

内容是文字？        → 200-400ms（要快，否则像"加载中"）
内容是图片/卡片？   → 400-600ms（给眼睛追踪时间）
内容是全屏背景？   → 600-1200ms（氛围需要酝酿）
退场动画？          → 进场时长的 60-80%（退场永远更快）
```

## 5. 节奏控制

### 单元素节奏

纯 fade 的节奏全在 duration + easing 的组合：

```
快速入场（300ms + ease-out）     → 轻快、自信、UI 感
中速入场（500ms + ease-out）     → 自然、通用、安全
慢速入场（1000ms + ease-in-out） → 仪式感、情感、电影感
```

### 多元素节奏（配合 stagger）

当多个元素都用 fade 时，**必须配合 stagger**，否则会像"集体闪现"。见 [02-stagger](./02-stagger-offset.md)。

```
同条件比较可让3张卡片同时出现；需要视线逐一追踪才选错峰（如80ms起点）。错峰并非普遍优于并行，数值按项目fps与阅读需要重算。
```

### 与口播同步

- fade 进场应在口播**该句开始时**触发，不要提前（提前 = 剧透）
- fade 退场应在口播**该句结束时**或下一句开始前 100ms
- 全屏 fade 转场应在两段口播的**间隙**完成

## 6. 组合配方

Fade 几乎不单独使用——它总是作为"基底"叠加在其他技法上。以下是 Jitter 模板中最常见的 fade 组合：

### 配方 A：Appear（纯 fade）

```
opacity: 0 → 1
duration: 400ms
easing: ease-out
```
**用途**：最克制的进场。标题、Logo、克制的设计语言。
**Jitter 模板**：`appear`、`logo-sliding-name`

### 配方 B：Fade + Scale（Pop In）

```
opacity: 0 → 1
scale: 0.8 → 1
duration: 400ms
easing: ease-out（带轻微 overshoot）
```
**用途**：强调性进场。按钮、CTA、重点元素。
**Jitter 模板**：`5-stars-pop`、`button-hover-effect`

### 配方 C：Fade + Slide

```
opacity: 0 → 1
translateY: 20px → 0   （或 translateX）
duration: 500ms
easing: ease-out
```
**用途**：方向性进场。列表项、卡片、段落。
**Jitter 模板**：`animated-feature-list`、`cascading-text`

### 配法 D：Fade + Blur（梦境感）

```
opacity: 0 → 1
blur: 20px → 0
duration: 600ms
easing: ease-out
```
**用途**：氛围进场。背景图、Hero、过渡场景。
**Jitter 模板**：`blur-bubbles`、`gradient-noisy-blur`

### 配方 E：Cross-fade（交叉淡化）

```
元素A: opacity 1 → 0   （同时）
元素B: opacity 0 → 1
duration: 600-800ms
easing: ease-in-out
```
**用途**：状态切换、图片轮播、场景过渡。
**注意**：交叉淡化时两元素必须重叠（position: absolute 同层）。

## 7. 反模式

| 反模式 | 说明 | 替代 |
|---|---|---|
| 全章只用 fade | 单调，像 PPT | 每 3 step 换技法 |
| fade 时长 > 1000ms | 拖沓，像"加载中" | 用 blur 或 scale 增加质感 |
| 退场和进场同时长 | 退场永远应更快 | 退场 = 进场 × 0.7 |
| 多元素无错峰 fade | 集体闪现 | 加 60-100ms stagger |
| fade 纯黑/纯白转场 | 老式 PPT 感 | 用 blur 或 scale 替代 |
| **overlay opacity <0.25**（教训 19） | 暗色背景上完全不可见 | overlay/叠加层 opacity ≥0.25，建议 0.3-0.7 |

## 8. Web / Remotion 落地

### CSS 实现（网页端）

```css
/* Token */
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);

/* 进场 */
.fade-in {
  animation: fadeIn 400ms var(--ease-out) both;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 退场 */
.fade-out {
  animation: fadeOut 300ms var(--ease-in) both;
}
@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* → From 模式等价写法 */
.appear-from {
  opacity: 0;
  animation: appearFrom 400ms var(--ease-out) forwards;
}
@keyframes appearFrom {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Remotion 实现（帧驱动，参考项目 MOTION-DESIGN.md）

```tsx
import { interpolate, Easing } from 'remotion';

// 进场 fade
const fadeIn = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

// 退场 fade
const fadeOut = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.ease),
  });

// 使用
const opacity = fadeIn(frame, 0, 12); // 12 帧 ≈ 200ms@60fps
```

### Lottie 实现

```json
{
  "layers": [{
    "ks": {
      "o": {  // opacity
        "a": 1,
        "k": [
          {"t": 0, "s": [0], "i": {"x":[0],"y":[1]}, "o": {"x":[1],"y":[0]}},
          {"t": 24, "s": [100]}  // 24 帧 = 400ms@60fps
        ]
      }
    }
  }]
}
```

## 9. 拿到一篇文章，怎么设计它的 fade 动效？

### Step 1：识别"出现/消失"的内容点

通读文章，标记所有需要"元素出现"或"元素消失"的时刻：
- 新标题出现
- 图片/卡片入场
- 旧元素退场让位
- 场景切换

### Step 2：为每个时刻定 type + duration

| 内容类型 | type | duration | easing |
|---|---|---|---|
| 短标题 | Appear（纯 fade） | 300ms | ease-out |
| 图片/卡片 | Fade + Slide | 500ms | ease-out |
| 全屏背景 | Fade + Blur | 800ms | ease-in-out |
| 退场 | 纯 fade | 200-300ms | ease-in |

### Step 3：决定是否需要 stagger

- 单元素 → 不需要
- 2-5 个并列元素 → 加 60-100ms stagger
- 6+ 个元素 → 加 30-50ms stagger（否则太慢）

### Step 4：与口播对齐

- 进场在口播该句**开始**时触发
- 退场在口播该句**结束**或下一句前 100ms
- 全屏转场在两段口播**间隙**

### Step 5：检查反模式

- [ ] 是否全章只用 fade？→ 至少换 1-2 种技法
- [ ] 退场是否比进场快？→ 退场 = 进场 × 0.7
- [ ] 多元素是否有错峰？→ 加 stagger

---

## 参考模板

- `appear` — 纯 fade 进场（最克制）
- `5-stars-pop` — fade + scale（强调）
- `blur-bubbles` — fade + blur（氛围）
- `gradient-noisy-blur` — fade + blur + gradient（梦境）
