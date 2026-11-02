# 10 · Counter 计数

> **一句话**：让数字从某值动态增长（或减少）到目标值，用"数字变化本身"传达增长、规模和成就。

## 1. 视觉特征

数字从 `From` 值动态变化到 `To` 值，按 `Step` 间隔递增（减），配合过渡效果。

```
From: 0
To:   1,234,567
Step: 1

动画过程：0 → 12 → 145 → 1,238 → ... → 1,234,567
```

### Counter 的独特性

Counter 是所有技法中**唯一用"数字变化本身"作为视觉内容**的技法。其他技法都在"展示"内容，counter 在**让数字成为内容**。

> **关键洞察**：Jitter 在 2026-06-10 发布 counter 时特别强调："great for countdowns, growing stats, and any moment where numbers need to stand out." Counter 的核心价值是**让数字"站起来"**——静态的"1,234,567"只是信息，但"从 0 滚动到 1,234,567"是**戏剧性时刻**。

## 2. Jitter Counter 的能力

### 核心参数（来自 2026-06-10 changelog）

```
From:   起始值
To:     目标值
Step:   递增间隔
Effect: 过渡效果（数字如何变化）
Duration: 动画时长
```

### 支持的数字格式

Jitter counter 处理"几乎任何数字格式"：

| 格式 | 示例 | 说明 |
|---|---|---|
| 整数 | `42` | 基础 |
| 小数 | `3.14` | 精确 |
| 负数 | `-273` | 温度等 |
| 百分比 | `85%` | 比例 |
| 带单位 | `$42` / `1,234.50kg` | 货币/度量 |
| 千分位 | `1,234,567` | 大数可读 |

### 在 Jitter 中的位置

```
Animate tab → Custom → Text section → Counter
```

Counter 被归类在 **Text section** 下——它本质是**文字动画的一种特化**，只是文字内容是数字，且有数学插值逻辑。

## 3. Counter 的三种叙事模式

### 模式 A：增长（Growing）

```
From: 0 → To: 1,000,000
效果：数字"涨起来"
```

**用途**：用户数、收入、规模、成就。
**情绪**：积极、增长、成功。
**Jitter 模板**：`counter-1-000-figma-plugin-installs`

### 模式 B：倒计时（Countdown）

```
From: 10 → To: 0
效果：数字"倒数"
```

**用途**：倒计时、紧迫感、活动开始。
**情绪**：期待、紧张、即将发生。
**Jitter 模板**：`the-track-countdown`、`clock-counter`

### 模式 C：统计展示（Stats）

```
From: 0 → To: 85 (百分比)
或 From: 0 → To: 273 (具体数值)
配合进度环或柱状图
```

**用途**：数据展示、KPI、对比。
**情绪**：客观、信息性。
**Jitter 模板**：`counter-progress-ring`、`counter-poster`、`halftone-counter-poster`

## 4. 设计参数

### 核心参数

| 参数 | 作用 | 推荐值 |
|---|---|---|
| `from` | 起始值 | 0（增长）/ 目标值（倒计） |
| `to` | 目标值 | 实际数据 |
| `step` | 递增间隔 | 1（整数）/ 0.1（小数） |
| `duration` | 动画时长 | 1500-3000ms |
| `easing` | 缓动 | ease-out（默认）/ linear（匀速） |
| `format` | 数字格式 | 整数/小数/百分比/带单位 |

### Step 的设计

```
Step = 1：       每帧 +1（慢速精确）
Step = 10：      每帧 +10（中速）
Step = 100：     每帧 +100（快速粗略）
Step = 自动：    根据数值大小自动调整

推荐：让 counter 在 duration 内完成，
  小数字（<100）：step 1
  中数字（100-10000）：step 10-100
  大数字（>10000）：step 100-1000
```

### Duration 的"适中"原则

```
Counter 太快（<1000ms）：
  数字"闪过"，看不清
  观众来不及"感受增长"

Counter 太慢（>4000ms）：
  变成"等待"
  失去戏剧性

推荐：1500-3000ms
  小数字：1500ms
  大数字：2500-3000ms
```

## 5. 节奏控制

### Counter 的"减速"效果

```
最佳：ease-out（快→慢）
  数字快速变化，最后减速停下
  像"跑车减速到终点"

不要：ease-in（慢→快）
  越来越快，最后"撞墙"

可以：linear（匀速）
  机械感、客观、数据展示
```

### Counter + 视觉同步

```
数字变化的同时，配套视觉也变化：

  + 进度环：环随数字增长（0% → 85%）
  + 柱状图：柱随数字长高
  + 颜色：数字颜色从暗到亮
  + 缩放：数字轻微缩放（1 → 1.05 → 1）
```

### Counter 的"里程碑"停顿

```
大数字（如 0 → 1,000,000）不要匀速到底：

  0 → 500,000（快速，800ms）
  500,000 停顿（200ms，"半程"）
  500,000 → 999,999（快速，800ms）
  999,999 停顿（300ms，"即将到达"）
  1,000,000（最终值，放大强调）

效果：有"里程碑"节奏，戏剧性
```

### 多 Counter 错峰

```
多个数字同时展示时：

  Counter A: delay 0,     0 → 1,000,000
  Counter B: delay 200ms, 0 → 85%
  Counter C: delay 400ms, 0 → 273

效果：数字"依次涨起来"
```

### 与口播同步

- Counter 开始 = 口播提到该数据时
- Counter 完成 = 口播强调"达到"该值时
- Counter 完成**后**保留 500-1000ms 可读停留

## 6. 组合配方

### 配方 A：基础计数

```
from: 0
to: 1,234,567
step: auto
duration: 2500ms
easing: ease-out
format: 1,234,567（千分位）
```
**用途**：用户数、规模数据。
**Jitter 模板**：`counter-1-000-figma-plugin-installs`

### 配方 B：百分比 + 进度环

```
from: 0
to: 85
duration: 2000ms
easing: ease-out
format: 85%
+ 圆环 SVG stroke-dashoffset 同步动画
```
**用途**：完成率、达成度。
**Jitter 模板**：`counter-progress-ring`

### 配方 C：倒计时

```
from: 10
to: 0
step: 1
duration: 10000ms（每秒 -1）
easing: linear
每步停顿感强（steps easing）
```
**用途**：活动倒计时、紧迫感。
**Jitter 模板**：`the-track-countdown`、`clock-counter`

### 配方 D：货币增长

```
from: 0
to: 42000
duration: 2000ms
easing: ease-out
format: $42,000（带货币符号）
+ 数字颜色从灰到金
```
**用途**：收入、融资、金额。
**Jitter 模板**：`counter-poster`、`frosted-glass-counter`

### 配方 E：多指标面板

```
3 个 counter 错峰：
  Revenue:    $0 → $1.2M, delay 0
  Users:      0 → 50,000, delay 200ms
  Countries:  0 → 27,     delay 400ms

每个 duration 2000ms, ease-out
```
**用途**：数据展示、成就展示、年度总结。
**Jitter 模板**：`halftone-counter-poster`、`dotted-counter-circle`

### 配方 F：Counter + 强调

```
counter 到达目标值时：
  + scale 1 → 1.1 → 1（过冲强调）
  + 颜色变化（暗 → 亮）
  + 短暂发光（box-shadow）
  duration 300ms（强调部分）
```
**用途**：达成成就、突破时刻。
**Jitter 模板**：`counter-pixel`、`counter-poster`

## 7. 反模式

| 反模式 | 说明 | 替代 |
|---|---|---|
| Counter 太快（<1000ms） | 闪过，看不清 | 提到 1500ms+ |
| Counter 太慢（>4000ms） | 等待 | 控制在 3000ms 内 |
| 用 ease-in | 越来越快，撞墙感 | 用 ease-out |
| 数字无格式（1234567） | 难读 | 加千分位 1,234,567 |
| 单位不匹配 | 如 $1234.5 kg | 格式化正确 |
| Counter 结束立即消失 | 没看清 | 保留 500-1000ms |
| 多 Counter 同时 | 无节奏 | 错峰 200ms |
| **Counter 用于"涨价"等场景误导**（教训 17） | 价格柱动态增长暗示"还在涨" | 涨价/价格变化用静态柱状图展示数据关系，不用 counter 动态增长。用户原话："不是固定的上涨，居然是动态的" |

## 8. Web / Remotion 落地

### JS 实现（网页端通用）

```js
// 基础 counter 函数
function animateCounter(element, from, to, duration, formatter) {
  const start = performance.now();
  const step = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out: 1 - (1-p)²
    const eased = 1 - Math.pow(1 - progress, 2);
    const value = from + (to - from) * eased;
    element.textContent = formatter ? formatter(value) : Math.round(value);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// 使用
animateCounter(el, 0, 1234567, 2500, (v) =>
  Math.round(v).toLocaleString()  // 1,234,567
);

// 货币格式
animateCounter(el, 0, 42000, 2000, (v) =>
  '$' + Math.round(v).toLocaleString()
);

// 百分比
animateCounter(el, 0, 85, 2000, (v) =>
  Math.round(v) + '%'
);
```

### CSS 实现（有限，用 counter）

```css
/* CSS counter（有限，只能整数递增） */
.counter {
  counter-reset: count 0;
  animation: count 2500ms ease-out forwards;
}
.counter::after {
  content: counter(count);
}
@keyframes count {
  to { counter-increment: count 1234567; }  /* 不支持小数 */
}
/* 注：CSS counter 局限大，推荐用 JS */
```

### Remotion 实现（帧驱动）

```tsx
import { interpolate, Easing, useCurrentFrame } from 'remotion';

// 基础 counter
const Counter = ({ from, to, durationFrames, startFrame, format }) => {
  const frame = useCurrentFrame();
  const value = interpolate(frame, [startFrame, startFrame + durationFrames], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });
  return <span>{format ? format(value) : Math.round(value)}</span>;
};

// 使用
<Counter
  from={0}
  to={1234567}
  durationFrames={150}  // 2500ms @60fps
  startFrame={30}
  format={(v) => Math.round(v).toLocaleString()}
/>

// 货币
<Counter
  from={0}
  to={42000}
  durationFrames={120}
  format={(v) => '$' + Math.round(v).toLocaleString()}
/>

// 百分比 + 进度环
const PercentRing = ({ to, durationFrames }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationFrames], [0, to / 100], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });
  const circumference = 2 * Math.PI * 45;  // r=45
  return (
    <svg viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="none" stroke="#eee" strokeWidth="8" />
      <circle
        cx="50" cy="50" r="45" fill="none" stroke="#4ECDC4" strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="55" textAnchor="middle" fontSize="20">
        {Math.round(progress * 100)}%
      </text>
    </svg>
  );
};
```

## 9. 拿到一篇文章，怎么设计它的 counter 动效？

### Step 1：识别"数字戏剧性"时刻

Counter 只用于**数字本身是内容**的场景：
- 用户数/规模（"我们有了 100 万用户"）
- 增长数据（"收入增长了 300%"）
- 倒计时（"3 天后上线"）
- 统计指标（"完成率 85%"）
- 成就（"融资 5000 万"）

### Step 2：判断叙事模式 → 选配方

| 内容 | 模式 | 配方 |
|---|---|---|
| 增长/规模 | 增长 | A |
| 完成率/比例 | 百分比+环 | B |
| 倒计时/活动 | 倒计时 | C |
| 金额/收入 | 货币 | D |
| 多指标面板 | 多指标 | E |
| 突破/成就 | Counter+强调 | F |

### Step 3：定参数

```
from: 0（增长）/ 目标值（倒计）
to: 实际数据
step: 根据数值大小（见 Step 设计）
duration: 1500-3000ms
easing: ease-out（增长）/ linear（倒计时）
format: 千分位/百分比/货币
```

### Step 4：设计配套视觉

```
百分比 → 进度环（SVG stroke-dashoffset 同步）
数值 → 柱状图（高度同步）
金额 → 颜色从暗到亮
成就 → 完成时 scale 过冲
```

### Step 5：定节奏

```
单 counter：1500-2500ms, ease-out
多 counter：错峰 200ms
里程碑：大数字分阶段（快→停→快→停）
```

### Step 6：与口播对齐

- Counter 开始 = 口播提到该数据
- Counter 完成 = 口播强调"达到"
- 完成后保留 500-1000ms 可读停留

### Step 7：检查反模式

- [ ] 时长是否在 1500-3000ms？
- [ ] easing 是否用 ease-out（不是 ease-in）？
- [ ] 数字是否有正确格式（千分位/单位）？
- [ ] 多 counter 是否错峰？
- [ ] 完成后是否保留可读时间？

---

## 参考模板

- `counter-1-000-figma-plugin-installs` — 基础增长
- `counter-progress-ring` — 百分比+环
- `counter-poster` — 海报计数
- `halftone-counter-poster` — 半色调计数
- `dotted-counter-circle` — 点阵计数
- `clock-counter` — 时钟计数
- `frosted-glass-counter` — 磨砂玻璃计数
- `counter-pixel` — 像素计数
- `blur-counter` — 模糊计数
- `the-track-countdown` — 倒计时
