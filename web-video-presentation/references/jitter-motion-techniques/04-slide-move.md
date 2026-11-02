# 04 · Slide & Move 位移

> **一句话**：让元素沿直线或曲线移动，用"运动轨迹"传达方向性、推进感和空间关系。

## 1. 视觉特征

元素从 A 点移动到 B 点。可以沿直线（水平/垂直），也可以沿**曲线**（Jitter 2024-12-17 引入的 curved paths + 2025-05-27 的 Bezier 控制柄）。

```
直线 Move：     A ──────────────→ B     水平/垂直/对角
曲线 Move：     A ─╲           ╱─ B     贝塞尔曲线
                    ╲         ╱
                     ╲       ╱
                      ╲─────╱
```

### Slide 与 Fade 的本质区别

| 维度 | Fade | Slide |
|---|---|---|
| 方向 | 无 | 必有方向 |
| 语义 | "出现" | "从哪来/到哪去" |
| 空间感 | 无 | 有（画外→画内 / 画内→画外） |
| 信息量 | 低 | 中（方向本身是信息） |

> **关键洞察**：Jitter 在 2024-12-17 引入 curved paths 时说："It's perfect for guiding focus, telling a story, or simply making a point with clarity and impact." 位移不只是"移动"，它是**用运动轨迹讲故事**。一条曲线就能引导视线、表达路径、制造聚焦。

## 2. Jitter 的 Move 能力演进

```
2020-07   Move 基础动作（直线）
2020-09   图形化编辑（画布上直接拖拽生成 Move）
2024-12   Curved paths（曲线路径，锚点编辑）
2025-05   Bezier 控制柄（曲线曲率精细控制）
2026-01   Formulas in input fields（+10/-20 等快速计算）
```

这个演进说明：**Move 看似简单，但 Jitter 用了四年把它从"直线位移"打磨成"可雕刻的运动路径"**。曲线能力是区分"业余位移"和"专业位移"的分水岭。

## 3. 三种 Move 语义

### 语义 A：进场 / 退场（画外→画内 / 画内→画外）

```
进场：translateX(-100%) → 0    从左侧画外滑入
退场：0 → translateX(100%)     向右侧滑出画外
```

这是最常见的用法。结合 → From / To → 方向模式（见 [01-fade](./01-fade-opacity.md)）。

### 语义 B：推进 / 转移（画内→画内）

```
推进：translateX(0) → 100px    向右推进
转移：translateX(0) → -100px   向左移出焦点
```

用于"焦点转移"——当前元素移开让位给新元素。

### 语义 C：路径叙事（曲线 Move）

```
元素沿曲线从 A 到 B
曲率由 Bezier 控制柄雕刻

适用：
  - 引导视线（"看这里"）
  - 表达路径（流程、连接）
  - 物理运动（弹跳、抛物）
```

Jitter（2024-12）："调整路径的锚点来雕刻符合你想法的曲线。"

## 4. 设计参数

### 核心参数

| 参数 | 作用 | 推荐值 |
|---|---|---|
| `translateX/Y` | 位移距离 | 进场 100-150% / 推进 50-200px |
| `duration` | 动画时长 | 400-600ms（进场）/ 300-400ms（退场） |
| `easing` | 缓动 | ease-out（进场）/ ease-in（退场）/ ease-in-out（推进） |
| `path` | 路径类型 | 直线 / 曲线 |
| `bezierHandles` | 曲线控制柄 | 两个端点的切线方向 |

### 距离决策

```
进场距离：
  短（20-50px）：     微妙入场，"飘入"
  中（100% 宽度）：   从画外完整滑入（最常用）
  长（150%+）：       快速、有冲击力

推进距离：
  小（30-80px）：     微调位置
  中（100-200px）：   明确转移焦点
  大（整个画布）：    场景切换
```

### Easing 选择

| 场景 | easing | 原因 |
|---|---|---|
| 进场 | `ease-out` | 快进慢出，自然落入 |
| 退场 | `ease-in` | 慢起快走，自然离开 |
| 水平推进 | `ease-in-out` | 对称，平滑 |
| 曲线运动 | `ease-in-out` 或物理曲线 | 模拟自然运动 |
| 弹跳 | `bounce` | 物理感 |

## 5. 节奏控制

### Slide 的"过冲"技巧

```
过冲（overshoot）：
  目标 0，但先到 -10px，再回到 0
  duration: 500ms
  easing: cubic-bezier(0.2, 0, 0, 1.2)  ← 1.2 造成过冲

效果：元素"刹不住车"，有物理感
适用：活泼、UI 交互、按钮
不适用：严肃、克制、品牌
```

### 多元素 Slide + Stagger

```
3 张卡片从右侧滑入：
  Card A: delay 0ms,    translateX 100%→0
  Card B: delay 80ms,   translateX 100%→0
  Card C: delay 160ms,  translateX 100%→0

效果：像"依次飘入"
```

### 曲线 Move 的节奏

曲线运动不能用标准 easing——因为速度沿曲线变化：

```
直线 + ease-out：速度均匀衰减（直观）
曲线 + ease-out：速度沿曲线衰减（看起来"拐弯减速"）
曲线 + ease-in-out：起步慢、中段快、结尾慢（最自然）

推荐：曲线 Move 默认用 ease-in-out
```

### 与口播同步

- 进场 Slide 应在口播该句**开始时**触发
- 推进 Slide 应在口播**切换话题**时触发（"接下来看..."）
- 曲线引导应在口播**引导视线**时触发（"注意这里..."）

## 6. 组合配方

### 配方 A：Slide In（标准进场）

```
opacity: 0 → 1
translateY: 30px → 0   （或 translateX）
duration: 500ms
easing: ease-out
```
**用途**：卡片、列表项、段落的自然入场。
**Jitter 模板**：`animated-feature-list`、`animated-cards`

### 配方 B：Full Slide（画外完整滑入）

```
translateX: -100% → 0   （不 fade，纯位移）
duration: 600ms
easing: ease-out
```
**用途**：横幅、标题、全宽元素。
**Jitter 模板**：`sliding-text-reveal`

### 配方 C：Push（推开让位）

```
当前元素: translateX 0 → -100%  （向左推走）
新元素:   translateX 100% → 0   （从右滑入）
duration: 500ms
easing: ease-in-out
```
**用途**：轮播、分页、章节切换。
**Jitter 模板**：`slideshow-loop`、`gallery-scroll`

### 配方 D：Curve Move（曲线引导）

```
路径：从 A 到 B 的贝塞尔曲线
锚点：2-3 个，用 Bezier 控制柄调曲率
duration: 1200ms
easing: ease-in-out
```
**用途**：引导视线、表达路径、流程演示。
**Jitter 模板**：`animated-arrow`、流程类

### 配法 E：Parallax Slide（视差）

```
前景: translateX 0 → -100px  （慢）
中景: translateX 0 → -200px  （中）
背景: translateX 0 → -400px  （快）
duration: 800ms
easing: ease-out

效果：三层不同速度，产生 3D 深度感
适用：场景过渡、产品展示
Jitter 模板：parallax 类
```

### 配方 F：Bounce Slide（弹跳入场）

```
translateY: -100% → 0
easing: bounce 或 cubic-bezier(0.2, 0, 0, 1.4)
duration: 700ms

效果：从上方弹跳落入，物理感
适用：活泼、庆祝、评分
Jitter 模板：5-stars-pop、the-harvest-fruit-bounce
```

## 7. 反模式

| 反模式 | 说明 | 替代 |
|---|---|---|
| 位移无 fade | 纯位移会突兀 | 加 opacity 同步（配方 A） |
| 位移距离太小（<10px） | 看不出在动 | 至少 20-30px |
| 位移距离太大 + 无 fade | 元素"飞过"画面 | 加 fade 或减小距离 |
| 曲线 + ease-out | 拐弯处怪异减速 | 曲线用 ease-in-out |
| 推进和退场方向矛盾 | 如进场从左、退场向左 | 保持方向语义一致 |
| 多元素 Slide 无 stagger | 集体平移 | 加 stagger |

## 8. Web / Remotion 落地

### CSS 实现（网页端）

```css
/* 配方 A：Slide In */
.slide-in {
  opacity: 0;
  transform: translateY(30px);
  animation: slideIn 500ms var(--ease-out) both;
}
@keyframes slideIn {
  to { opacity: 1; transform: translateY(0); }
}

/* 配方 D：Curve Move（用 offset-path） */
.curve-move {
  offset-path: path('M 0,0 Q 200,-50 400,0');  /* 二次贝塞尔 */
  animation: curveMove 1200ms var(--ease-in-out) both;
}
@keyframes curveMove {
  from { offset-distance: 0%; opacity: 0; }
  to { offset-distance: 100%; opacity: 1; }
}

/* 配方 E：Parallax */
.parallax-layer {
  transition: transform 800ms var(--ease-out);
}
.parallax-bg    { transform: translateX(-400px); }
.parallax-mid   { transform: translateX(-200px); }
.parallax-front { transform: translateX(-100px); }
```

### Remotion 实现（帧驱动）

```tsx
import { interpolate, Easing } from 'remotion';

// 配方 A：Slide In
const slideIn = (frame: number, start: number, duration: number) => {
  const p = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });
  return {
    opacity: p,
    transform: `translateY(${(1 - p) * 30}px)`,
  };
};

// 配方 D：Curve Move（沿贝塞尔曲线插值点）
const curveMove = (frame: number, start: number, duration: number) => {
  const t = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),
  });
  // 二次贝塞尔：B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
  const x = (1-t)*(1-t)*0 + 2*(1-t)*t*200 + t*t*400;
  const y = (1-t)*(1-t)*0 + 2*(1-t)*t*(-50) + t*t*0;
  return {
    opacity: t,
    transform: `translate(${x}px, ${y}px)`,
  };
};

// 配方 F：Bounce
const bounceIn = (frame: number, start: number, duration: number) => {
  const p = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bounce,  // Remotion 内置
  });
  return {
    transform: `translateY(${(1 - p) * -100}%)`,
  };
};
```

## 9. 拿到一篇文章，怎么设计它的 slide 动效？

### Step 1：识别"需要移动"的内容点

- 元素需要进场/退场
- 焦点需要转移（旧元素移走，新元素上位）
- 需要引导视线（"看这里"）
- 需要表达路径或流程

### Step 2：判断 Move 语义 → 选配方

| 场景 | 配方 | 说明 |
|---|---|---|
| 普通进场 | A | Slide In（fade + 位移） |
| 全宽元素进场 | B | Full Slide（纯位移） |
| 焦点切换/轮播 | C | Push（一进一出） |
| 引导视线/路径 | D | Curve Move（曲线） |
| 场景过渡/3D 感 | E | Parallax（视差） |
| 活泼/庆祝 | F | Bounce（弹跳） |

### Step 3：定方向

| 内容语义 | 方向 |
|---|---|
| 时间推进/阅读 | LTR（左→右） |
| 新内容登场 | 从右/下画外滑入 |
| 旧内容退场 | 向左/上滑出 |
| 升起/浮现 | BTT（下→上） |
| 从天而降 | TTB（上→下） |

### Step 4：定距离 + 时长 + easing

```
进场：距离 30-100% / 500ms / ease-out
退场：距离 100% / 300ms / ease-in
推进：距离 50-200px / 500ms / ease-in-out
曲线：路径自定义 / 1000-1500ms / ease-in-out
```

### Step 5：决定是否需要 stagger

- 单元素 → 不需要
- 多元素 → 加 60-100ms stagger（见 [02-stagger](./02-stagger-offset.md)）

### Step 6：与口播对齐

- 进场 Slide = 口播该句开始
- 推进 Slide = 口播切换话题
- 曲线引导 = 口播引导视线

### Step 7：检查反模式

- [ ] 是否加了同步 fade？（避免纯位移突兀）
- [ ] 距离是否足够可见（≥20px）？
- [ ] 曲线是否用了 ease-in-out？
- [ ] 方向是否匹配内容语义？
- [ ] 多元素是否有 stagger？

---

## 参考模板

- `sliding-text-reveal` — 标准滑动
- `animated-feature-list` — 列表滑入
- `slideshow-loop` — 轮播 Push
- `animated-arrow` — 曲线引导
- `5-stars-pop` — 弹跳入场
- `the-harvest-fruit-bounce` — 物理弹跳
