# 06 · Stack 堆叠

> **一句话**：让卡片像扑克牌一样层层堆叠，用"层叠 + 退场"的循环展示一系列并列内容。

## 1. 视觉特征

多张卡片在空间上重叠（`position: absolute` + `z-index`），通过**新卡片进场覆盖 + 旧卡片退场让位**的循环，依次展示每张卡片。这是 Jitter 模板数量最多的技法族之一（28 个模板）。

```
时间线：

  T0:  [Card A]                     A 在最上
  T1:  [Card B][Card A]              B 从某方向滑入，覆盖 A
  T2:  [Card C][Card B][A退]         C 滑入，B 被推到下层，A 退场
  T3:  [Card D][Card C][B退]         循环...
```

### Stack 的"卡片流"语义

Stack 不是简单的轮播——它有**层次感**。每张新卡片进场时，旧卡片不是消失，而是**退到后方/侧方/下方**，形成"层层堆叠"的视觉效果，像一摞扑克牌或一叠照片。

> **关键洞察**：Jitter 的 6 个 `the-stack-*` 模板（livestream / partnership / release-notes / sale / testimonial / we-re-hiring）覆盖了产品发布的所有典型场景。这说明 stack 是**"产品功能/更新序列展示"的最佳载体**——每张卡片是一个功能点，堆叠过程就是"逐个介绍"的过程。

## 2. Stack 的三种结构

### 结构 A：覆盖堆叠（Overlay Stack）

```
新卡片从画外滑入，覆盖在旧卡片上方
旧卡片原地不动，只是被盖住（或轻微下沉）

  [B 滑入 → 覆盖 A]
  [C 滑入 → 覆盖 B]
```

**特点**：层次清晰，像"翻牌"。
**Jitter 模板**：`stacked-cards`、`color-cards-stack`

### 结构 B：推开堆叠（Push Stack）

```
新卡片滑入，同时把旧卡片推向某方向
旧卡片被推到后方/侧方，缩小并淡化

  [B 滑入 → A 被推向左侧并缩小]
  [C 滑入 → B 被推向左侧并缩小]
```

**特点**：有运动感，像"传送带"。
**Jitter 模板**：`the-stack-sale`、`the-stack-release-notes`

### 结构 C：扇形堆叠（Fan Stack）

```
新卡片滑入，旧卡片像扇形展开
形成"一摞照片翻看"的效果

  [B 滑入 → A 旋转角度展开]
```

**特点**：有触感，像"翻照片"。
**Jitter 模板**：`blend-modes-circle-stack`

## 3. 卡片退场的"去向"

Stack 的核心不只是"新卡片怎么来"，更是**"旧卡片去哪"**。退场方向决定了 stack 的性格：

| 退场方向 | 效果 | 性格 | 适用 |
|---|---|---|---|
| 向后缩小 | 卡片"退到远处" | 优雅、聚焦 | 产品展示、重点 |
| 向左/右滑出 | 卡片"被传送走" | 流畅、连续 | 列表、流程 |
| 向下滑出 | 卡片"落下" | 自然、物理 | 照片、休闲 |
| 旋转展开 | 卡片"扇形展开" | 触感、翻看 | 相册、案例 |
| 淡出消失 | 卡片"消失" | 简洁、克制 | 信息密度高 |

## 4. 设计参数

### 核心参数

| 参数 | 作用 | 推荐值 |
|---|---|---|
| `cardCount` | 卡片数量 | 3-7（超过 7 个考虑用 slideshow） |
| `enterDuration` | 进场时长 | 500-700ms |
| `exitDuration` | 退场时长 | 400-500ms（退场更快） |
| `overlap` | 进退场是否重叠 | 0（不重叠，清晰）/ 0.3（30%重叠，流畅） |
| `exitScale` | 退场缩放 | 0.8-0.9（缩小退后） |
| `exitOpacity` | 退场透明度 | 0.3-0.5（半透保留）或 0（完全消失） |
| `stackOffset` | 堆叠偏移 | 每层错开 5-15px |

### 进退场时间关系

```
模式 1：串行（不重叠）
  ┃ Card A 进场 ┃ 停留 ┃ Card B 进场 ┃ A 退场 ┃ 停留 ┃ Card C...
  清晰，但节奏慢

模式 2：重叠（推荐）
  ┃ Card A 进场 ┃停留┃
       ┃ Card B 进场 ┃ A 同时退场 ┃停留┃
            ┃ Card C 进场 ┃ B 同时退场 ┃
  流畅，节奏快，是 Jitter 模板的默认选择
```

## 5. 节奏控制

### 卡片停留时间

```
单卡片停留 = 口播该卡片内容的时长
推荐：2500-5000ms（见 RHYTHM.md 常规单屏）

过长（>6000ms）：观众等下一张
过短（<2000ms）：来不及看清
```

### 进退场的"交接节奏"

```
最佳交接（overlap 0.3）：
  T=0ms:    新卡片开始进场
  T=200ms:  旧卡片开始退场（新卡片进场到 30%）
  T=500ms:  新卡片进场完成
  T=600ms:  旧卡片退场完成

效果：新卡片"接班"，旧卡片"让位"，自然流畅
```

### 多卡片节奏的"呼吸"

```
不要让每张卡片停留时间完全相同——制造节奏变化：

  Card A: 3000ms（常规）
  Card B: 4000ms（重点，多停一会）
  Card C: 2500ms（快速带过）
  Card D: 3500ms（常规）

效果：像呼吸，有快有慢，不像机器
```

## 6. 组合配方

### 配方 A：经典覆盖堆叠

```
新卡片：从右侧滑入 + fade
  translateX: 100% → 0
  opacity: 0 → 1
  duration: 500ms, ease-out

旧卡片：原地缩小 + 半透
  scale: 1 → 0.92
  opacity: 1 → 0.4
  duration: 400ms, ease-in

每张卡片停留 3000ms
```
**用途**：产品功能展示、特性清单。
**Jitter 模板**：`stacked-cards`、`color-cards-stack`

### 配方 B：传送带推送

```
新卡片：从右侧滑入
  translateX: 100% → 0
  duration: 500ms, ease-out

旧卡片：向左推走 + fade
  translateX: 0 → -30%
  opacity: 1 → 0
  scale: 1 → 0.85
  duration: 400ms, ease-in

overlap: 0.3（新进旧退同时）
```
**用途**：更新日志、版本说明、案例轮播。
**Jitter 模板**：`the-stack-release-notes`、`the-stack-partnership`

### 配方 C：3D 层叠（深度感）

```
新卡片：从下方升起 + 3D 旋转
  translateY: 100% → 0
  rotateX: 15° → 0°
  opacity: 0 → 1
  duration: 600ms, ease-out

旧卡片：向后退 + 3D 倾斜
  translateZ: 0 → -100px
  rotateX: 0 → -15°
  scale: 1 → 0.9
  opacity: 1 → 0.5
  duration: 500ms, ease-in

perspective: 1000px
```
**用途**：高端产品、发布会风格。
**Jitter 模板**：`the-stack-livestream`

### 配方 D：扇形展开

```
新卡片：从上方落下
  translateY: -100% → 0
  rotate: -5° → 0°
  duration: 500ms, ease-out

旧卡片：旋转展开
  rotate: 0° → -15°
  translateX: 0 → -20px
  scale: 1 → 0.95
  opacity: 1 → 0.6
  duration: 400ms

每层 rotate 递增 -15°
```
**用途**：相册、案例集、回忆感。
**Jitter 模板**：`blend-modes-circle-stack`

### 配方 E：卡片 + 计数器（混合）

```
Stack 展示每张卡片时，旁边有一个计数器
"01 / 05" → "02 / 05" → ...
计数器用 counter 动画（见 10-counter）
```
**用途**：步骤说明、进度展示。
**Jitter 模板**：`the-stack-testimonial`

## 7. 反模式

| 反模式 | 说明 | 替代 |
|---|---|---|
| 卡片太多（>7） | 节奏拖沓 | 超过 7 张用 slideshow |
| 进退场不重叠 | 像幻灯片 | overlap 0.3 |
| 退场完全消失 | 失去层次感 | 保留 opacity 0.3-0.5 |
| 退场不缩小 | 像平铺 | 加 scale 0.85-0.92 |
| 每张停留相同 | 机械感 | 制造 2-3 档停留时长 |
| 卡片内容太密 | 来不及读 | 每张卡片一个核心信息 |
| 3D 无 perspective | 翻转失真 | 加 perspective 1000px |
| **装饰元素遮挡数据**（教训 18） | 装饰徽章/光效 absolute 定位盖住柱状图/卡片 | 装饰元素必须 zIndex:0 + pointerEvents:none；内容 zIndex:1。用户原话："第二个镜头产生穿插了" |

## 8. Web / Remotion 落地

### CSS 实现

```css
.stack-container {
  position: relative;
  width: 320px;
  height: 420px;
}
.stack-card {
  position: absolute;
  inset: 0;
  transition: all 500ms var(--ease-out);
}

/* 配方 A：覆盖堆叠 */
.stack-card.entering {
  transform: translateX(100%);
  opacity: 0;
  animation: stackEnter 500ms var(--ease-out) forwards;
}
.stack-card.active {
  transform: translateX(0) scale(1);
  opacity: 1;
}
.stack-card.exiting {
  transform: translateX(0) scale(0.92);
  opacity: 0.4;
}

@keyframes stackEnter {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* 配方 C：3D 层叠 */
.stack-3d {
  perspective: 1000px;
  transform-style: preserve-3d;
}
.stack-3d .stack-card {
  transform-origin: center bottom;
}
```

### Remotion 实现

```tsx
import { interpolate, Easing } from 'remotion';

// 通用 stack 卡片动画
const stackCard = (frame: number, enterFrame: number, exitFrame: number) => {
  // 进场
  const enterP = interpolate(
    frame, [enterFrame, enterFrame + 30], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.ease) }
  );
  // 退场
  const exitP = interpolate(
    frame, [exitFrame, exitFrame + 24], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.ease) }
  );

  // 状态：entering → active → exiting
  return {
    translateX: `${(1 - enterP) * 100 - exitP * 30}%`,
    scale: 1 - exitP * 0.08,
    opacity: enterP * (1 - exitP * 0.6),
    zIndex: Math.floor(enterFrame),  // 越晚进场的 z 越高
  };
};

// 使用：每张卡片在指定帧进场
const cards = data.map((card, i) => {
  const enterFrame = i * 180;  // 每张间隔 3 秒
  const exitFrame = enterFrame + 150;  // 停留后开始退场
  return {
    ...card,
    style: stackCard(frame, enterFrame, exitFrame),
  };
});
```

### 项目内置 CardArrayFlow 组件

参考 `MOTION-PATTERN-LIBRARY.md` 的 `card-array-flow` recipe 和 `jitter-card-flow` motionStyle：

> 贪吃蛇流入 → 阵列铺满 → 交替滑动 → 慢快慢收束 → 中央放大聚焦

```tsx
// 项目内置组件：src/components/CardArrayFlow.tsx
import { CardArrayFlow } from '../components/CardArrayFlow';

<CardArrayFlow
  cards={data}
  phases={{
    snakeInflow: [0, 30],
    arrayFill: [30, 60],
    alternateSlide: [60, 85],
    slowFastSlow: [85, 265],
    centerFocus: [265, 350],
  }}
/>
```

## 9. 拿到一篇文章，怎么设计它的 stack 动效？

### Step 1：识别"序列展示"的内容

Stack 适合**3-7 个并列内容**，每个都是一个完整信息单元：
- 产品功能列表（每个功能一张卡片）
- 案例集（每个案例一张）
- 更新日志（每条更新一张）
- 客户评价（每条评价一张）
- 步骤说明（每步一张）

### Step 2：判断结构 → 选配方

| 内容性质 | 结构 | 配方 |
|---|---|---|
| 产品功能 | 覆盖堆叠 | A |
| 更新/流程 | 传送带推送 | B |
| 高端展示 | 3D 层叠 | C |
| 相册/案例 | 扇形展开 | D |
| 步骤说明 | 卡片+计数器 | E |

### Step 3：确定卡片数量和停留

```
3-5 张：每张 3000-4000ms
6-7 张：每张 2500-3000ms
> 7 张：改用 slideshow（见 09）
```

### Step 4：设计退场方向

| 内容语义 | 退场方向 |
|---|---|
| 时间推进 | 向左滑出 |
| 等级展示 | 向后缩小 |
| 相册回忆 | 旋转展开 |
| 高效传递 | 淡出消失 |

### Step 5：定进退场时间关系

```
overlap: 0.3（推荐）
新卡片进场到 30% 时，旧卡片开始退场
```

### Step 6：设计节奏变化

```
不要每张停留相同：
  重点卡片：4000ms
  普通卡片：3000ms
  过渡卡片：2500ms
```

### Step 7：与口播对齐

- 每张卡片进场 = 口播开始介绍该卡片
- 卡片停留 = 口播讲解该卡片内容
- 下一张进场 = 口播过渡到下一个

### Step 8：检查反模式

- [ ] 卡片数量是否 ≤ 7？
- [ ] 进退场是否重叠？
- [ ] 退场是否保留了层次感（opacity ≥ 0.3）？
- [ ] 是否有节奏变化（停留时长不均等）？
- [ ] 3D 是否加了 perspective？

---

## 参考模板

- `stacked-cards` — 经典覆盖
- `color-cards-stack` — 彩色卡片
- `the-stack-sale` — 销售推送
- `the-stack-release-notes` — 更新日志
- `the-stack-livestream` — 3D 层叠
- `the-stack-testimonial` — 评价 + 计数
- `the-stack-we-re-hiring` — 招聘卡片
- `blend-modes-circle-stack` — 圆形堆叠
- `banking-app-cards` — 银行卡
- `stack-payment-cards` — 支付卡
