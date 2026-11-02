# 07 · Morph 形变

> **一句话**：让一个形状平滑过渡成另一个形状，用"形态变化"本身传达状态转换、身份演变和叙事性。

## 1. 视觉特征

形状 A 的轮廓通过**路径插值**平滑过渡到形状 B 的轮廓。这不是 fade 切换，而是**轮廓本身在变形**——观众看到的是"一个东西变成了另一个东西"。

```
Morph：     ●  →  ◐  →  ◑  →  ○      圆形渐变成方形
Fade：      ● ──→ ● ──→ (消失) ──→ ○   旧消失，新出现
```

### Morph 与 Fade 的本质区别

| 维度 | Fade | Morph |
|---|---|---|
| 认知 | "A 没了，B 出现了" | "A 变成了 B" |
| 连续性 | 离散（两个独立元素） | 连续（同一个元素变形） |
| 叙事性 | 无 | 强（有"变化过程"） |
| 技术难度 | 低 | 中-高（需要路径插值） |

> **关键洞察**：Jitter 在 2025-07-08 发布 pen tool + morphing 时说，它的用途是：**产品动画（loader 流体过渡）、Logo 演变（从简单形状到完整标识）、文字与形状互变（字母变形为图标）、UI 状态切换（按钮扩展为卡片）**。Morph 的核心价值是**用形态变化本身讲故事**——"它从 A 变成了 B"这件事本身就是内容。

## 2. Jitter Morph 的能力演进

```
2020-10   Proof of concept masks（遮罩雏形）
2025-07   Pen tool + morphing（钢笔工具 + 形变）
2025-05   Bezier controls for curved paths（曲线控制）
2026-04   Improved pen tool（复合形状 + 孔洞）
```

### 钢笔工具是 Morph 的前提

Morph 需要两个形状有**可插值的路径**。Jitter 的钢笔工具（2025-07）让用户可以：
- 用锚点 + 曲线绘制自定义形状
- 在两个形状之间平滑过渡
- 拖动锚点重新定位
- `⌘`（Ctrl）拖动创建曲线

### 复合形状（2026-04-01）

改进版钢笔工具支持**多路径复合形状 + 内部孔洞**：
- 一个形状可由多个独立路径组成
- 支持内部 cutout（孔洞）
- 完美用于：复杂图标、插画、精细 morph

## 3. Morph 的五种叙事模式

从 Jitter 的 13 个 morph 模板反推，morph 有五种典型叙事：

### 模式 A：形状 ↔ 文字

```
形状 ●  →  字母 A  →  单词 APP
```

**用途**：品牌演变、Logo 揭示、概念可视化。
**Jitter 模板**：`morph-shape-to-text`、`morph-dots-to-text`、`morph-lines-to-text`

### 模式 B：形状 ↔ 形状

```
圆形 ●  →  方形 ■  →  三角形 ▲
```

**用途**：状态转换、概念演变、抽象表达。
**Jitter 模板**：`gradients-geometric-morph`、`gradients-morphing-shapes`

### 模式 C：图标 ↔ 图标

```
☀ 太阳  →  ☁ 云  →  🌧 雨
```

**用途**：天气、状态、功能切换。
**Jitter 模板**：`morph-animated-icon`、`morph-animated-weather-icons`、`the-route-morphing-icons`

### 模式 D：文字 ↔ 文字

```
"YES"  →  "NO"
```

**用途**：对比、切换、强调。
**Jitter 模板**：`morph-inflating-text`

### 模式 E：线条 ↔ 数据图

```
一条线  →  雷达图  →  柱状图
```

**用途**：数据可视化变形、信息层次转换。
**Jitter 模板**：`morph-line-to-radar-chart`

## 4. 设计参数

### 核心参数

| 参数 | 作用 | 推荐值 |
|---|---|---|
| `duration` | 变形时长 | 800-1500ms（比其他动画慢，让观众"看清变化"） |
| `easing` | 缓动 | ease-in-out（平滑过渡，不要 ease-out） |
| `pathFrom` | 起始路径 | SVG path d 属性 |
| `pathTo` | 目标路径 | SVG path d 属性 |
| `precision` | 路径精度 | 8-12（点数，越多越平滑） |

### 路径点数对齐

Morph 的关键挑战是**两个路径的点数要对齐**：

```
形状 A: 4 个锚点（正方形）
形状 B: 4 个锚点（菱形）
→ 直接插值，平滑

形状 A: 4 个锚点（正方形）
形状 B: 8 个锚点（八边形）
→ 需要"补点"：在 A 上插入 4 个虚拟点，对齐 B
```

Jitter 的钢笔工具会自动处理点数对齐，但手动设计时要注意。

### Duration 的"慢"原则

```
其他动画：300-600ms（快，"发生"）
Morph：    800-1500ms（慢，"过程"）

原因：morph 的价值在于"变化的中间态"
如果太快（<600ms），观众看不到变形过程
如果太慢（>2000ms），变成"等待"
```

## 5. 节奏控制

### Morph 的三段式节奏

高级 morph 通常不是"直接变"，而是分三段：

```
阶段 1：预备（200ms）
  形状 A 轻微"蓄力"（如 scale 1→1.05）

阶段 2：变形（800-1000ms）
  A 的路径插值到 B 的路径
  easing: ease-in-out

阶段 3：稳定（200ms）
  形状 B 轻微"回弹"（如 scale 1.05→1）

效果：有"惯性"，像物理变形
```

### Morph + 颜色同步

```
路径插值的同时，颜色也插值：
  填充色：A 的颜色 → B 的颜色
  描边色：A 的描边 → B 的描边

效果：形状和颜色同步变化，浑然一体
```

### Morph + 旋转

```
路径插值 + 旋转：
  rotate: 0° → 90°
  duration: 1000ms

效果：边变形边旋转，动感更强
适用：图标切换、品牌演变
```

### 与口播同步

- Morph 开始 = 口播提到"变化"或"转换"的瞬间
- Morph 中间态 = 口播解释"为什么变"
- Morph 完成 = 口播确认"变成了什么"

## 6. 组合配方

### 配方 A：形状变文字（品牌揭示）

```
圆形 → 字母 → 完整 Logo
duration: 1200ms（每个阶段 400ms）
easing: ease-in-out
颜色同步：圆形色 → 品牌色
```
**用途**：品牌揭示、Logo 演变。
**Jitter 模板**：`morph-shape-to-text`、`gradients-logo-reveal`

### 配方 B：点变文字（粒子聚合）

```
散落的点 ● ● ●  →  聚合成文字
每个点沿曲线移动到目标位置
duration: 1500ms
easing: ease-out（点减速聚拢）
```
**用途**：科技感、数据聚合、概念形成。
**Jitter 模板**：`morph-dots-to-text`

### 配方 C：线变文字（书写感）

```
一条线  →  弯曲成文字
像"被写成"
duration: 1000ms
easing: ease-in-out
```
**用途**：手写感、创意标题。
**Jitter 模板**：`morph-lines-to-text`

### 配方 D：图标切换（状态变化）

```
☀ 太阳  →  ☁ 云
路径插值 + 颜色变化
duration: 600ms（图标切换可以快一些）
easing: ease-in-out
```
**用途**：天气、状态、功能。
**Jitter 模板**：`morph-animated-weather-icons`、`the-route-morphing-icons`

### 配方 E：膨胀文字（Q弹）

```
"YES"  →  膨胀变形  →  "NO"
文字像气球一样膨胀、变形、收缩成新文字
duration: 1000ms
easing: elastic（Q弹）
```
**用途**：趣味、对比、强调。
**Jitter 模板**：`morph-inflating-text`

### 配方 F：线变图表（数据变形）

```
一条线  →  弯曲成雷达图  →  变成柱状图
duration: 1500ms
easing: ease-in-out
```
**用途**：数据可视化变形、多维度展示。
**Jitter 模板**：`morph-line-to-radar-chart`

### 配方 G：视频遮罩形变

```
视频被一个形状遮罩
遮罩形状从 A 变形到 B
视频内容随之"被裁剪成不同形状"
```
**用途**：视频包装、创意转场。
**Jitter 模板**：`morph-video-mask`

## 7. 反模式

| 反模式 | 说明 | 替代 |
|---|---|---|
| Morph 太快（<600ms） | 看不清变形过程 | 提到 800-1500ms |
| Morph 用 ease-out | 结尾戛然而止 | 用 ease-in-out（平滑） |
| 路径点数不对齐 | 变形过程跳跃 | 补点对齐 |
| 形状差异太大 | 变形过程混乱 | 选择"语义相关"的形状对 |
| 颜色不同步变化 | 形状变了颜色突变 | 颜色同步插值 |
| Morph 滥用 | 每个元素都变形 | 只用于"变化"叙事 |

## 8. Web / Remotion 落地

### CSS 实现（有限）

CSS 原生不支持路径插值，但有替代方案：

```css
/* 方案 1：clip-path morph（有限，只能在简单形状间变） */
.shape {
  clip-path: circle(50%);
  transition: clip-path 1000ms var(--ease-in-out);
}
.shape.to-square {
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
}

/* 方案 2：用 CSS Houdini @property（实验性） */
@property --morph-progress {
  syntax: '<number>';
  initial-value: 0;
  inherits: false;
}

/* 方案 3：字体变体（font-variation-settings） */
.morph-text {
  font-variation-settings: 'wght' 400;
  transition: font-variation-settings 800ms var(--ease-in-out);
}
.morph-text.bold {
  font-variation-settings: 'wght' 900;
}
```

### SVG 路径插值（推荐，跨平台）

```tsx
// 使用 flubber 库做路径插值（推荐）
// ⚠️ 依赖检查：flubber 不在脚手架默认依赖中，使用前需安装：
//   npm install flubber
//   或在 scaffold.sh 的 dependencies 数组中添加 "flubber"
import { interpolate as flubberInterpolate } from 'flubber';

const MorphShape = ({ fromPath, toPath, progress }) => {
  // progress: 0 → 1
  const interpolatedPath = flubberInterpolate(fromPath, toPath)(progress);
  return <path d={interpolatedPath} fill="currentColor" />;
};
```

### Remotion 实现（帧驱动 + flubber）

```tsx
import { interpolate, Easing } from 'remotion';
import { interpolate as flubberInterpolate } from 'flubber';

const MorphAnimation = ({ frame, fromPath, toPath, start, duration }) => {
  const progress = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),  // morph 必须用 ease-in-out
  });

  const path = flubberInterpolate(fromPath, toPath)(progress);

  // 颜色同步插值
  const fillColor = interpolateColors(progress, [0, 1], ['#FF6B6B', '#4ECDC4']);

  return <path d={path} fill={fillColor} />;
};
```

### 纯 SVG 路径动画（CSS 可控）

```html
<svg viewBox="0 0 100 100">
  <path>
    <animate attributeName="d"
      dur="1s"
      fill="freeze"
      values="M50,10 L90,90 L10,90 Z; M50,10 L90,50 L50,90 L10,50 Z"
      keyTimes="0;1"
      calcMode="spline"
      keySplines="0.4 0 0.2 1"
    />
  </path>
</svg>
```

### 项目参考

参考 `MOTION-DESIGN.md`：
> 可以借鉴 Anime.js 的 SVG morph / line drawing / motion path，但核心动画必须可复现。最终渲染路径优先使用 frame/timing 驱动。

```tsx
// 项目推荐：用 flubber + Remotion frame 驱动
import { flubberMorph } from '../video/motion';  // 假设项目封装了

const Morph = ({ from, to, frame, start, duration }) => {
  const progress = interpolate(frame, [start, start + duration], [0, 1], {
    easing: Easing.inOut(Easing.ease),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <path d={flubberMorph(from, to, progress)} />;
};
```

## 9. 拿到一篇文章，怎么设计它的 morph 动效?

### Step 1：识别"变化叙事"的内容点

Morph 只用于**变化本身是内容**的场景：
- 品牌演变（Logo 从简单到完整）
- 状态切换（图标变化）
- 概念转换（抽象形状变具体文字）
- 数据变形（线变图表）
- 对比（YES 变 NO）

### Step 2：判断叙事模式 → 选配方

| 内容 | 模式 | 配方 |
|---|---|---|
| 品牌揭示 | 形状↔文字 | A |
| 粒子聚合 | 点↔文字 | B |
| 手写标题 | 线↔文字 | C |
| 状态切换 | 图标↔图标 | D |
| 文字对比 | 文字↔文字 | E |
| 数据变形 | 线↔图表 | F |
| 视频包装 | 视频遮罩 | G |

### Step 3：设计两个形状

```
形状 A（起点）和形状 B（终点）必须：
  1. 语义相关（如圆→字母O，线→文字一）
  2. 点数尽量接近（或用 flubber 自动补点）
  3. 复杂度相当（不要正方形变复杂插画）
```

### Step 4：定时长 + easing

```
duration: 800-1500ms（必须慢，让观众看清）
easing: ease-in-out（必须平滑，不要 ease-out）
```

### Step 5：设计同步变化

```
路径插值的同时：
  - 颜色插值（A色 → B色）
  - 旋转（可选，增加动感）
  - 缩放（可选，三段式：蓄力→变形→回弹）
```

### Step 6：与口播对齐

- Morph 开始 = 口播提到"变化"
- Morph 中间 = 口播解释"为什么变"
- Morph 完成 = 口播确认"变成了什么"

### Step 7：检查反模式

- [ ] 时长是否 ≥ 800ms？
- [ ] easing 是否用 ease-in-out？
- [ ] 两个形状是否语义相关？
- [ ] 颜色是否同步变化？
- [ ] 是否只用于"变化叙事"（不滥用）？

---

## 参考模板

- `morph-shape-to-text` — 形状变文字（品牌）
- `morph-dots-to-text` — 点变文字（科技）
- `morph-lines-to-text` — 线变文字（手写）
- `morph-animated-weather-icons` — 天气图标切换
- `morph-inflating-text` — 膨胀文字（Q弹）
- `morph-line-to-radar-chart` — 线变雷达图（数据）
- `morph-video-mask` — 视频遮罩形变
- `gradients-morphing-shapes` — 几何形状形变
- `the-route-morphing-icons` — 路线图标切换
