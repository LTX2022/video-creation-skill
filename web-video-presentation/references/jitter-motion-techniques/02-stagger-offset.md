# 02 · Stagger & Offset 错峰

> **一句话**：让多个元素按顺序逐个入场，用"递延"把一组静态元素变成有韵律的序列。

## 1. 视觉特征

N 个元素不是同时出现，而是按 `index × interval` 的公式逐个触发，形成"瀑布流""多米诺""涟漪"式的入场节奏。这是 Jitter 所有多元素模板的**底层节奏机制**。

```
错误（无错峰）：           正确（有错峰）：
[A][B][C] 同时出现          A → B → C 逐个出现
████████                    ███ → ████ → ████████
                            +60ms  +60ms
```

### 为什么 stagger 是"节奏的灵魂"

Jitter 在 2026-06-02 的 Components 更新中专门新增了**跨图层 staggering** 功能——这说明在它六年的产品演进里，stagger 一直是最被需要、最后才被"产品化"的能力。在此之前，用户只能用文字层面的 letter/word/line offset（2021-01-22）来近似。

> **关键洞察**：单看一个 Jitter 模板（如 `stacked-cards`、`orbit-cards`、`bento-grid`），它们的视觉差异很大，但**节奏骨架完全相同** —— 都是 stagger。stagger 是 Jitter 把"一堆静态素材"变成"有呼吸感的视频"的核心手段。

## 2. 三种 stagger 粒度

Jitter 区分了三个粒度层次，从细到粗：

### 粒度 1：Letter / Word / Line（文字层，2021-01）

```
Hello World

Letter by letter:  H → e → l → l → o → (space) → W → o → r → l → d
Word by word:      Hello → World
Line by line:      (单行时等同 word）
```

每个节点（letter/word/line）可独立定制动画类型 + 共享一个 **offset 偏移量**控制节点间的递延。

```
参数：
  nodeAnimation: 每个节点的动画（fade / slide / scale...）
  nodeOffset:    节点间递延时间（如 40ms）
  → 总时长 = nodeAnimation.duration + (nodeCount - 1) × nodeOffset
```

### 粒度 2：Layer / Object（图层，2026-06）

```
3 张卡片：

  Card A ──→ 入场（0ms 起，400ms 完成）
  Card B ──→ 入场（80ms 起，480ms 完成）
  Card C ──→ 入场（160ms 起，560ms 完成）

总入场时间 = (N-1) × interval + singleDuration
         = 2 × 80 + 400 = 560ms
```

操作方式（Jitter）：时间线上选择多个 operation → 右键 → Apply staggered timing。

### 粒度 3：Scene / Artboard（场景，2025-02 无限画布之后）

多个 artboard 间的转场也可以 stagger，用于"多格式同步展示"——同一内容的不同尺寸版本同步出现。

## 3. Offset 偏移量的设计

offset 是 stagger 的唯一核心参数，它决定了"韵律的性格"：

| Offset | 性格 | 效果 | 适用场景 |
|---|---|---|---|
| 20-40ms | 急促 | 几乎同时，"瀑布感" | 字母级、短列表 |
| 50-80ms | 自然 | 清晰可辨的递延，"流畅感" | 卡片、网格、常规列表 |
| 100-150ms | 从容 | 明显的停顿，"仪式感" | Hero 元素、重点项目 |
| 200ms+ | 戏剧 | 每个元素都"被强调"，"独白感" | 强对比、叙事性入场 |

### Offset 的反直觉规则

```
直觉：元素越多，offset 应该越小（怕总时长太长）
实际：元素越多，offset 应该...看内容关系：

  - 强成组关系（如一组选项）  → 小 offset（30-50ms），强调"它们是一组"
  - 弱成组关系（如独立卡片）  → 大 offset（80-150ms），强调"每个独立"
  - 叙事序列（如步骤1→2→3）  → 最大 offset（200ms+），强调"顺序"
```

## 4. 设计参数

### 完整参数表

| 参数 | 作用 | 推荐值 |
|---|---|---|
| `interval` | 元素间递延 | 30-150ms（见上表） |
| `singleDuration` | 单个元素动画时长 | 400-600ms |
| `easing` | 单个元素的缓动 | ease-out（进场）/ ease-in（退场） |
| `direction` | 错峰方向 | index 递增 / 递减 / 中心扩散 |
| `animation type` | 每个元素的动画 | fade / slide / scale / mix |

### Direction 方向

Jitter 的 stagger 不只是"从左到右"——它支持多种方向：

```
→ LTR（默认）：   A → B → C → D        左到右
← RTL：           D → C → B → A        右到左
↑ BTT：           底部 → 顶部            下到上
↓ TTB：           顶部 → 底部            上到下
◎ Center-out：    中心 → 两侧            中间扩散
○ Random：        随机顺序               避免可预测
```

> **注意**：Random 方向在 Remotion 中必须用 seeded random（如 `seededRandom`），不能用 `Math.random()`，否则预览和渲染不一致（见项目 MOTION-DESIGN.md 禁止项）。

## 5. 节奏控制

### Stagger 的"总时长陷阱"

```
陷阱：N 个元素，每个 400ms，interval 80ms
直觉计算：400ms（"差不多一个一个来"）
实际总时长：(N-1) × 80 + 400 = 单元素时长 + 递延总和

  N=3:  160 + 400 = 560ms  ✓ 合理
  N=5:  320 + 400 = 720ms  ✓ 可接受
  N=10: 720 + 400 = 1120ms ⚠️ 超过 1 秒，开始拖沓
  N=20: 1520 + 400 = 1920ms ❌ 太长，观众失去耐心
```

**解决方法**：当 N > 8 时，**减小 interval** 而非减小 singleDuration：

```
N ≤ 5:   interval = 80ms   （自然）
N = 6-10: interval = 50ms  （紧凑）
N > 10:  interval = 30ms   （密集，几乎同时）
```

### Stagger + easing 的协同

```
单个元素的 easing 决定"每个的个性"
stagger 的 interval 决定"它们的关系"

最佳组合：
  - 进场：单元素 ease-out + interval 60-100ms（自然流入）
  - 退场：单元素 ease-in + interval 40-60ms（快速散去，退场更紧凑）
  - 强调：单元素 elastic/bounce + interval 150ms+（每个都有"戏"）
```

### 与口播同步

- stagger 的**第一个元素**应在口播该句开始时触发
- stagger 的**最后一个元素**应在口播该句**结束前 200ms**完成
- 反推公式：`totalDuration = (N-1) × interval + singleDuration ≤ 口播句长 - 200ms`

## 6. 组合配方

### 配方 A：瀑布式文字（Letter stagger）

```
nodeOffset: 40ms
nodeAnimation: opacity 0→1 + translateY 10px→0
direction: LTR
singleDuration: 300ms

效果：文字像"被打印出来"
适用：标题、金句、强调性文字
Jitter 模板：cascading-text、sliding-text-reveal
```

### 配方 B：卡片阵列入场（Object stagger）

```
interval: 80ms
singleAnimation: opacity + translateY 30px→0
direction: TTB（上到下）或 LTR（左到右）
singleDuration: 500ms

效果：卡片像"被一张张摆放"
适用：产品列表、特性清单、卡片网格
Jitter 模板：stacked-cards、bento-grid
```

### 配方 C：涟漪扩散（Center-out stagger）

```
interval: 60ms
direction: center-out（中心扩散）
singleAnimation: scale 0.8→1 + opacity 0→1
singleDuration: 400ms

效果：从中心向外扩散，像水波
适用：放射状布局、核心+卫星结构
Jitter 模板：orbit-cards（轨道）
```

### 配方 D：错峰退场（Staggered exit）

```
interval: 40ms（比进场更紧凑）
direction: 反向（最后一个先退）
singleAnimation: opacity 1→0 + translateY 0→-20px
singleDuration: 300ms

效果：像"潮水退去"
适用：列表清空、场景过渡
```

### 配方 E：多层 stagger（嵌套）

```
外层：3 组卡片，组间 stagger 200ms
内层：每组内 3 张卡片，卡片间 stagger 60ms

效果：先来一组（组内瀑布），再来下一组
适用：复杂信息分层揭示
Jitter 模板：the-edit-collection-teaser
```

## 7. 反模式

| 反模式 | 说明 | 替代 |
|---|---|---|
| 所有元素同时入场 | 集体闪现，无韵律 | 加 60-100ms stagger |
| interval 过大（>200ms） | 等太久，像在"数数" | N>5 时降到 50ms 以下 |
| stagger 总时长 > 口播句长 | 动画没演完就要切 | 减小 interval 或 singleDuration |
| 退场和进场用相同 interval | 退场应更快 | 退场 interval = 进场 × 0.6 |
| 方向与内容语义矛盾 | 如"时间线"却从右到左 | 方向要匹配内容方向 |
| 用 Math.random 做顺序 | 预览和渲染不一致 | 用 seededRandom |

## 8. Web / Remotion 落地

### CSS 实现（网页端）

```css
/* 用 CSS 变量做 stagger */
.stagger-item {
  opacity: 0;
  animation: slideIn 500ms var(--ease-out) forwards;
  animation-delay: calc(var(--i) * 80ms);
}
@keyframes slideIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* HTML */
<div class="stagger-item" style="--i: 0">A</div>
<div class="stagger-item" style="--i: 1">B</div>
<div class="stagger-item" style="--i: 2">C</div>
```

### Remotion 实现（帧驱动）

```tsx
import { interpolate, Easing } from 'remotion';

// 通用 stagger 函数
const staggerIn = (
  frame: number,
  index: number,
  intervalFrames: number,  // 80ms ≈ 5帧@60fps
  durationFrames: number   // 500ms ≈ 30帧
) => {
  const start = index * intervalFrames;
  return interpolate(frame, [start, start + durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });
};

// 使用
const items = ['A', 'B', 'C'];
items.map((text, i) => {
  const progress = staggerIn(frame, i, 5, 30);
  return (
    <div style={{
      opacity: progress,
      transform: `translateY(${(1 - progress) * 20}px)`,
    }}>
      {text}
    </div>
  );
});
```

### 项目内置 motion.ts 复用

参考项目 `MOTION-PATTERN-LIBRARY.md` 的 `anime-timeline-stagger` 模式：
> 用 Remotion `interpolate` + `Easing` 复刻 Anime.js 的 timeline 和 stagger 概念；用 `staggerProgress`（motion.ts）复刻 Anime.js 的 stagger 延迟。

```tsx
// 项目推荐写法（复用 motion.ts）
import { staggerProgress } from '../video/motion';

const items = data.map((item, i) => {
  const p = staggerProgress(frame, i, items.length, {
    interval: 5,     // 帧
    duration: 30,    // 帧
  });
  return { ...item, progress: p };
});
```

## 9. 拿到一篇文章，怎么设计它的 stagger？

### Step 1：识别"成组元素"

通读文章，标记所有"并列的多个元素"：
- 列表项（"三个特点..."）
- 卡片组（产品矩阵）
- 网格项（bento 布局）
- 文字节点（标题的每个词/字母）

### Step 2：判断成组关系强度

| 关系 | interval | 说明 |
|---|---|---|
| 强成组（选项/对比项） | 30-50ms | 强调"它们是一组" |
| 中性并列（卡片/列表） | 60-100ms | 自然递延 |
| 弱成组（独立故事） | 100-150ms | 每个有"戏" |
| 叙事序列（步骤1→2→3） | 200ms+ | 强调顺序 |

### Step 3：选择方向

- 时间线/进度 → LTR 或 TTB
- 等级/重要性 → Center-out（中心最重要）
- 撤退/退场 → 反向（最后入场的最先退场）
- 无语义 → LTR（默认）

### Step 4：计算总时长，校验口播

```
totalDuration = (N - 1) × interval + singleDuration

校验：totalDuration ≤ 口播句长 - 200ms ?

  否 → 减小 interval 或 singleDuration
```

### Step 5：选择单元素动画

- 文字 → letter stagger + fade/slide
- 卡片 → object stagger + fade + slide
- 强调 → object stagger + scale + elastic

### Step 6：检查反模式

- [ ] N > 8 时 interval 是否减小到 50ms 以下？
- [ ] 退场 interval 是否比进场更紧凑？
- [ ] 方向是否与内容语义一致？
- [ ] 是否用了 seededRandom（如果用了 random 方向）？

---

## 参考模板

- `cascading-text` — 文字 letter stagger
- `stacked-cards` — 卡片 object stagger
- `bento-grid` — 网格 stagger
- `orbit-cards` — center-out stagger
- `animated-feature-list` — 列表 stagger
