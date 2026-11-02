# 11 · Bento & Grid 网格

> **一句话**：用模块化网格陈列多个元素，配合错峰入场和聚焦放大，把"一堆素材"变成"有呼吸的矩阵"。

## 1. 视觉特征

多个不同尺寸的卡片以**网格（bento）布局**排列，像 Apple 产品页那样大小不一、有主有次。入场时按某种规律**错峰出现**，必要时某个卡片**放大聚焦**成为视觉中心。

```
Bento 布局示例：
┌──────────┬─────┐
│          │     │
│   大卡   │ 中卡 │
│  (主)    │     │
│          ├─────┤
│          │ 小卡 │
├────┬─────┴─────┤
│小卡 │   中卡    │
└────┴───────────┘
```

### Bento 与普通网格的区别

| 维度 | 普通网格 | Bento 网格 |
|---|---|---|
| 卡片尺寸 | 等大 | 大小不一 |
| 视觉层级 | 平等 | 有主有次 |
| 信息密度 | 中 | 高 |
| 视觉趣味 | 低 | 高（大小变化） |
| 命名来源 | CSS Grid | 日本便当盒（Bento） |

> **关键洞察**：Jitter 的 11 个 bento 模板（`bento-1-1` / `bento-16-9` / `bento-4-5` / `bento-grid` / `bento-modular-showreel`）说明 bento 不只是"布局方式"，而是**一种内容组织语言**——大小差异本身就是信息（大的重要，小的辅助）。这与项目 `MOTION-PATTERN-LIBRARY.md` 里的 `card-array-flow` recipe 一脉相承。

## 2. Bento 的三种布局结构

### 结构 A：经典 Bento（大小不一）

```
┌────────┬───┐
│  大    │ 中 │
│ (2x2)  ├─┬─┤
│        │小│中│
├───┬────┴─┴─┤
│ 小│  中   │
└───┴───────┘
```

**特点**：有明确主次，适合"1 个重点 + N 个辅助"。
**Jitter 模板**：`bento-grid`、`gradients-bento`

### 结构 B：等比 Bento（统一比例）

```
所有卡片相同比例（如 16:9）
┌────┬────┐
│16:9│16:9 │
├────┼────┤
│16:9│16:9 │
└────┴────┘
```

**特点**：整齐、统一、适合素材展示。
**Jitter 模板**：`bento-16-9`（横屏）、`bento-4-5`（竖屏）、`bento-1-1`（方形）

### 结构 C：Modular Showreel（模块轮播）

```
网格中某个卡片放大成为"当前展示"
其他卡片缩小退后
循环切换"当前"
```

**特点**：动态焦点，适合多内容展示。
**Jitter 模板**：`bento-modular-showreel`

## 3. Bento 的入场策略

### 策略 A：线性错峰（LRT 或 TTB）

```
卡片按行/列依次入场：
  [1] → [2] → [3]
  [4] → [5] → [6]

stagger interval: 80-120ms
方向：LRT（左到右）或 TTB（上到下）
```

### 策略 B：中心扩散

```
中心卡片先入场，向外扩散：
       [3]
   [2] [1] [4]
       [5]

中心是最重要的，先出现
```

### 策略 C：大小优先

```
大卡片先入场（重点先来）
小卡片后入场（辅助后到）
```

### 策略 D：随机（seeded）

```
用 seededRandom 打乱顺序
避免可预测的"瀑布感"
增加自然感
```

## 4. 设计参数

### 布局参数

| 参数 | 作用 | 推荐值 |
|---|---|---|
| `columns` | 列数 | 3-4（横屏）/ 2（竖屏） |
| `rows` | 行数 | 2-3 |
| `gap` | 卡片间距 | 8-16px |
| `aspectRatio` | 卡片比例 | 16:9 / 4:5 / 1:1 / 自由 |
| `bigCardSpan` | 大卡片跨度 | 2x2 / 2x1 / 1x2 |

### 动画参数

| 参数 | 作用 | 推荐值 |
|---|---|---|
| `staggerInterval` | 错峰间隔 | 60-120ms |
| `singleDuration` | 单卡入场时长 | 400-600ms |
| `easing` | 缓动 | ease-out |
| `enterAnim` | 入场动画 | fade + scale / fade + slide |
| `focusScale` | 聚焦放大倍数 | 1.5-1.8 |

### Bento 的"主次比例"

```
经典 bento 主次分配：
  1 个大卡（占 2x2）：50% 面积  → 主信息
  2 个中卡（占 1x2）：30% 面积  → 次信息
  3-4 个小卡（占 1x1）：20% 面积 → 辅助信息

总卡片数：4-7 个最佳
  <4：不够丰富
  >7：混乱
```

## 5. 节奏控制

### 入场节奏

```
总入场时长 = (N-1) × interval + singleDuration

  N=4:  3 × 100 + 500 = 800ms  ✓
  N=6:  5 × 80 + 500 = 900ms   ✓
  N=8:  7 × 60 + 500 = 920ms   ✓（紧凑）

注意：bento 入场可以比普通 stagger 稍慢
因为每个卡片大小不同，视觉信息量大
```

### 聚焦切换节奏

```
Modular Showreel 的焦点切换：

  卡片A聚焦（3000ms）→ 切换到卡片B聚焦 → ...

切换动画：
  旧聚焦卡片：scale 1.5 → 1, 回到原位（500ms）
  新聚焦卡片：scale 1 → 1.5, 移到中心（500ms）
  其他卡片：轻微缩小退后（300ms）
```

### 卡片间留白节奏

```
gap（间距）的性格：
  紧凑（4-8px）：    信息密集、专业
  适中（12-16px）：  自然、通用
  宽松（20-32px）：  优雅、留白感

Bento 推荐 12-16px（中等，平衡密度和呼吸）
```

### 与口播同步

- Bento 整体入场 = 口播"介绍一组内容"时
- 某卡片聚焦 = 口播"重点看这个"时
- 焦点切换 = 口播切换"下一个重点"时

## 6. 组合配方

### 配方 A：经典 Bento 入场

```
布局：3x2，其中一个大卡占 2x2
入场：scale 0.8 → 1 + opacity 0 → 1
stagger: LRT, 100ms interval
singleDuration: 500ms
easing: ease-out
```
**用途**：产品矩阵、特性展示。
**Jitter 模板**：`bento-grid`、`gradients-bento`

### 配方 B：等比网格（竖屏）

```
布局：2 列，每行 4:5 卡片
入场：translateY 30px → 0 + opacity 0 → 1
stagger: TTB, 80ms interval
singleDuration: 500ms
```
**用途**：社交媒体、竖屏内容。
**Jitter 模板**：`bento-4-5`

### 配方 C：Modular Showreel（焦点轮播）

```
阶段 1：网格入场（所有卡片 stagger in）
阶段 2：中心卡片放大（scale 1 → 1.8，其他缩小）
阶段 3：停留展示中心（3000ms）
阶段 4：切换焦点（旧缩回，新放大）
循环...

easing: ease-out（入场）/ ease-in-out（切换）
```
**用途**：产品展示、案例集。
**Jitter 模板**：`bento-modular-showreel`

### 配方 D：大小优先入场

```
大卡片（2x2）先入场：delay 0
中卡片（1x2）后入场：delay 200ms
小卡片（1x1）最后：delay 400ms

效果：重点先来，辅助后到
```

### 配方 E：Bento + Blur（景深）

```
聚焦卡片：blur 0, scale 1.5
非聚焦卡片：blur 4px, scale 0.9, opacity 0.6

效果：相机景深感，焦点突出
```

### 配方 F：Bento + Gradient（渐变填充）

```
卡片填充品牌渐变
渐变随卡片入场同步流动
```
**用途**：品牌视觉、艺术展示。
**Jitter 模板**：`gradients-bento`

## 7. 反模式

| 反模式 | 说明 | 替代 |
|---|---|---|
| 所有卡片等大 | 失去 bento 的层次感 | 至少 1 个大卡 |
| 卡片太多（>8） | 混乱 | 控制在 4-7 个 |
| 入场无 stagger | 集体闪现 | 加 80-120ms stagger |
| 聚焦放大太大（>2x） | 失真 | 1.5-1.8 |
| 留白太小（<4px） | 拥挤 | 12-16px |
| 留白太大（>32px） | 松散 | 12-16px |
| 内容比例不匹配 | 如 16:9 视频放 1:1 卡片 | 卡片比例匹配内容 |

## 8. Web / Remotion 落地

### CSS 实现（网页端）

```css
/* Bento 布局（CSS Grid） */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 12px;
  height: 100vh;
}
.bento-card {
  /* 默认 1x1 */
}
.bento-card.big {
  grid-column: span 2;
  grid-row: span 2;
}
.bento-card.wide {
  grid-column: span 2;
}
.bento-card.tall {
  grid-row: span 2;
}

/* 入场（stagger via --i） */
.bento-card {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
  animation: bentoEnter 500ms var(--ease-out) forwards;
  animation-delay: calc(var(--i) * 100ms);
}
@keyframes bentoEnter {
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* 聚焦放大 */
.bento-card.focused {
  transform: scale(1.8);
  z-index: 10;
  transition: transform 500ms var(--ease-in-out);
}
.bento-card.dimmed {
  transform: scale(0.9);
  opacity: 0.5;
  filter: blur(4px);
  transition: all 500ms var(--ease-in-out);
}
```

### Remotion 实现（帧驱动）

```tsx
import { interpolate, Easing, spring } from 'remotion';
import { seededRandom } from '../video/motion';  // 项目封装

// Bento 入场
const bentoEnter = (frame: number, index: number, interval: number, duration: number) => {
  const start = index * interval;
  const p = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });
  return {
    opacity: p,
    transform: `scale(${0.8 + 0.2 * p}) translateY(${(1 - p) * 20}px)`,
  };
};

// Modular Showreel 聚焦
const focusCard = (frame: number, focusIndex: number, myIndex: number, focusStart: number) => {
  const p = interpolate(frame, [focusStart, focusStart + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),
  });
  if (myIndex === focusIndex) {
    return { transform: `scale(${1 + 0.8 * p})`, opacity: 1 };
  } else {
    return {
      transform: `scale(${1 - 0.1 * p})`,
      opacity: 1 - 0.4 * p,
      filter: `blur(${4 * p}px)`,
    };
  }
};

// 使用
const BentoGrid = ({ cards, frame }) => {
  // 用 seededRandom 决定入场顺序（避免 Math.random）
  const order = cards.map((_, i) => ({
    i,
    r: seededRandom(`bento-${i}`),
  })).sort((a, b) => a.r - b.r);

  return (
    <div className="bento-grid">
      {order.map(({ i }, displayIndex) => {
        const style = bentoEnter(frame, displayIndex, 6, 30);  // 6帧间隔, 30帧时长
        return <div key={i} style={style}>{cards[i]}</div>;
      })}
    </div>
  );
};
```

### 项目内置组件参考

参考 `MOTION-PATTERN-LIBRARY.md`：

> `card-array-flow` recipe：贪吃蛇流入 → 阵列铺满 → 交替滑动 → 慢快慢收束 → 中央放大聚焦

```tsx
// 项目内置：src/components/CardArrayFlow.tsx
import { CardArrayFlow } from '../components/CardArrayFlow';

<CardArrayFlow
  cards={data}
  layout="bento"  // bento 或 grid
  phases={{
    snakeInflow: [0, 30],
    arrayFill: [30, 60],
    alternateSlide: [60, 85],
    slowFastSlow: [85, 265],
    centerFocus: [265, 350],
  }}
/>
```

## 9. 拿到一篇文章，怎么设计它的 bento 动效？

### Step 1：识别"多元素并列展示"的内容

Bento 适合**4-7 个并列内容**，且有**主次关系**：
- 产品功能矩阵（1 个主功能 + N 个辅功能）
- 案例集（1 个重点案例 + N 个其他）
- 特性清单（1 个核心特性 + N 个细节）
- 产品截图集（1 张大图 + N 张小图）

### Step 2：设计布局

```
确定：
  1. 主卡片（1个，占 2x2 或 2x1）—— 最重要的内容
  2. 中卡片（2-3个，占 1x2 或 2x1）—— 次重要
  3. 小卡片（2-4个，占 1x1）—— 辅助信息

列数：横屏 3-4 列 / 竖屏 2 列
间距：12-16px
```

### Step 3：选择入场策略

| 策略 | 适用 | interval |
|---|---|---|
| LRT（左到右） | 阅读顺序、时间线 | 100ms |
| TTB（上到下） | 等级、重要性 | 80ms |
| 中心扩散 | 中心最重要 | 120ms |
| 大小优先 | 重点先来 | 200ms（分批） |
| 随机（seeded） | 自然、避免可预测 | 80ms |

### Step 4：定单卡动画

```
推荐：fade + scale（0.8→1）+ translateY（20→0）
duration: 500ms
easing: ease-out
```

### Step 5：决定是否需要聚焦切换

```
如果需要逐个展示卡片内容：
  → 用 Modular Showreel（配方 C）
  → 焦点循环切换
如果只展示整体：
  → 入场后保持静态
```

### Step 6：与口播对齐

- Bento 入场 = 口播"介绍一组内容"
- 某卡片聚焦 = 口播"重点看这个"
- 焦点切换 = 口播"下一个"

### Step 7：检查反模式

- [ ] 是否有主次（至少 1 个大卡）？
- [ ] 卡片数量是否 4-7 个？
- [ ] 入场是否有 stagger？
- [ ] 聚焦放大是否 ≤ 1.8？
- [ ] 留白是否 12-16px？
- [ ] 是否用了 seededRandom（如果用了随机顺序）？

---

## 参考模板

- `bento-grid` — 经典 bento
- `bento-1-1` — 方形等比
- `bento-16-9` — 横屏等比
- `bento-4-5` — 竖屏等比
- `bento-modular-showreel` — 模块轮播
- `gradients-bento` — 渐变填充
