# 05 · Scale & Rotate 缩放旋转

> **一句话**：用大小变化和旋转传达"强调""层次""3D 感"，是让画面"立体起来"的关键技法。

## 1. 视觉特征

### Scale 缩放

元素从 `scale: 0`（不可见）放大到 `scale: 1`（正常），或反向缩小消失。

```
Scale In:    ● → ○ → ◯ → ⬤     从小到大（出现）
Scale Out:   ⬤ → ◯ → ○ → ●     从大到小（消失）
Pop:         ○ → ⬤ → ◯          过冲放大再回弹（强调）
```

### Rotate 旋转

元素绕中心点（或自定义原点）旋转，可做进场、退场或持续旋转。

```
Rotate In:   ↺ → ↑     从倾斜旋正
Spin:        ↺ → ↺ → ↺ 持续旋转
Flip:        ◳ → ◳ → ◳ 3D 翻转
```

### Jitter 的图形化编辑（2020-09-18）

> "在添加 Scale 或 Rotate 动画后，可以直接在画布上用控制柄拖拽编辑，自动生成对应的关键帧。"

这是 Jitter 区别于代码驱动工具的关键——**所见即所得的变换编辑**。

## 2. Scale 的三种语义

### 语义 A：进场强调（Scale In + Pop）

```
scale: 0.8 → 1.0 → 1.05 → 1.0   （过冲）
或
scale: 0 → 1
```

**用途**：让元素"跳出来"，比 fade 更有存在感。
**Jitter 模板**：`5-stars-pop`、`button-hover-effect`

### 语义 B：聚焦放大（Scale Up）

```
scale: 1.0 → 1.5
```

**用途**：当前元素需要"占据视觉中心"，其他元素退后。
**Jitter 模板**：`bento-modular-showreel` 的中央放大

### 语义 C：退场缩小（Scale Out）

```
scale: 1.0 → 0
```

**用途**：元素"消失在远处"或"被吸走"。比 fade 更有方向感。

## 3. Rotate 的三种语义

### 语义 A：旋正进场（Rotate In）

```
rotate: -15deg → 0deg
```

**用途**：元素"歪着进来，然后摆正"——有动感，不呆板。
**Jitter 模板**：`logo-sliding-name`、`animated-icon`

### 语义 B：持续旋转（Spin）

```
rotate: 0deg → 360deg → 720deg...
```

**用途**：loading、循环装饰、品牌元素。
**Jitter 模板**：`gradients-rotating-spheres`、`orbit-cards`

### 语义 C：3D 翻转（Flip）

```
rotateY: 0deg → 180deg
配合 backface-visibility
```

**用途**：卡片翻转、状态切换、3D 效果。
**Jitter 模板**：`3d-rotation`、`the-stack` 系列

> Jitter 在 2026-06-30 的 Effects 面板中把 `3D flips` 列为内置着色器效果。

## 4. 设计参数

### Scale 参数

| 参数 | 作用 | 推荐值 |
|---|---|---|
| `scaleFrom` | 起始缩放 | 进场 0.8-0 / 退场 1.0 |
| `scaleTo` | 目标缩放 | 进场 1.0 / 退场 0 / 聚焦 1.5 |
| `duration` | 动画时长 | 400-600ms |
| `easing` | 缓动 | ease-out（进场）/ elastic（弹跳） |
| `transformOrigin` | 变换原点 | center（默认）/ top-left（特殊） |

### Rotate 参数

| 参数 | 作用 | 推荐值 |
|---|---|---|
| `rotateFrom` | 起始角度 | 进场 -15° / 持续 0° |
| `rotateTo` | 目标角度 | 进场 0° / 持续 360°N |
| `duration` | 动画时长 | 进场 500ms / 旋转 2000ms+ |
| `easing` | 缓动 | ease-out（旋正）/ linear（持续旋转） |
| `rotateAxis` | 旋转轴 | Z（平面）/ Y（翻转）/ X（翻牌） |

### Scale + Rotate 组合的协同

```
Pop In（强调进场）：
  scale: 0.8 → 1.1 → 1.0   （过冲）
  rotate: -10° → 0°        （旋正）
  opacity: 0 → 1
  duration: 500ms
  easing: ease-out / elastic

效果：元素"跳出来并摆正"，强调性最强
```

## 5. 节奏控制

### Scale 的过冲（Overshoot）

```
无过冲：    scale 0 → 1          干脆
轻微过冲：  scale 0 → 1.05 → 1   自然强调
弹跳：      scale 0 → 1.2 → 0.95 → 1.05 → 1   活泼
弹性：      scale 0 → 1.3 → 0.9 → 1.05 → 1    Q弹（elastic easing）
```

### Rotate 的速度曲线

```
旋正进场：  ease-out（快旋后慢停）
持续旋转：  linear（匀速，永不停止）
翻转切换：  ease-in-out（中间快，两端慢）
弹跳旋转：  elastic（Q弹，趣味）
```

### 多元素 Scale + Stagger

```
5 颗星评分：
  Star 1: scale 0→1.1→1, delay 0
  Star 2: scale 0→1.1→1, delay 100ms
  ...
  Star 5: scale 0→1.1→1, delay 400ms

效果：星星"依次弹出"
Jitter 模板：5-stars-pop、5-stars-move-up
```

## 6. 组合配方

### 配方 A：Pop In（弹入）

```
scale: 0.8 → 1.05 → 1.0
opacity: 0 → 1
duration: 400ms
easing: cubic-bezier(0.2, 0, 0, 1.2)  （过冲）
```
**用途**：按钮、CTA、重点元素进场。
**Jitter 模板**：`5-stars-pop`、`button-hover-effect`

### 配方 B：Scale Fade（缩放淡入）

```
scale: 0 → 1
opacity: 0 → 1
duration: 500ms
easing: ease-out
```
**用途**：通用进场，比纯 fade 有层次感。

### 配方 C：Focus Zoom（聚焦放大）

```
scale: 1.0 → 1.5
opacity: 1 （保持）
duration: 600ms
easing: ease-out
其他元素同时 scale 1.0 → 0.9 + opacity → 0.5
```
**用途**：突出当前元素，其他退后。
**Jitter 模板**：`bento-modular-showreel`

### 配方 D：Rotate In（旋正）

```
rotate: -15° → 0°
opacity: 0 → 1
duration: 500ms
easing: ease-out
```
**用途**：图标、Logo、趣味元素进场。

### 配方 E：3D Flip（翻转）

```
rotateY: 0° → 180°
transform-style: preserve-3d
backface-visibility: hidden
duration: 800ms
easing: ease-in-out
正面内容在 0-90°，反面在 90-180°
```
**用途**：卡片翻转、状态切换、3D 感。
**Jitter 模板**：`3d-rotation`

### 配法 F：Continuous Spin（持续旋转）

```
rotate: 0° → 360° → 720°...
duration: infinite 或 2000ms/圈
easing: linear
```
**用途**：loading、装饰、品牌循环。
**Jitter 模板**：`gradients-rotating-spheres`

### 配方 G：Orbit（轨道运动）

```
多个元素围绕中心点旋转
每个元素：rotate 0→360° + translate 半径
中心元素固定
duration: 8000ms+
easing: linear
```
**用途**：卫星结构、关系图、循环展示。
**Jitter 模板**：`orbit-cards`、`orbit-social-media-showreel`

## 7. 反模式

| 反模式 | 说明 | 替代 |
|---|---|---|
| Scale 过冲太大（>1.3） | 夸张失真 | 控制在 1.05-1.15 |
| 退场用 Scale Out 无 fade | "缩没"突兀 | 加 opacity 同步 |
| Rotate 进场角度太大（>30°） | 旋过头 | 控制在 5-15° |
| 持续旋转用 ease-out | 越转越慢，不自然 | 持续旋转用 linear |
| 3D Flip 无 perspective | 翻转无立体感 | 加 `perspective: 1000px` |
| 所有元素都弹性过冲 | 像蹦床 | 弹性只给重点元素 |
| **动态增长暗示"还在涨"**（教训 17） | 信息图表（价格柱）动态变化会误导观众 | 信息图表静态展示数据关系，不用动态增长；用户原话："不是固定的上涨，居然是动态的" |

## 8. Web / Remotion 落地

### CSS 实现

```css
/* 配方 A：Pop In */
.pop-in {
  animation: popIn 400ms cubic-bezier(0.2, 0, 0, 1.2) both;
}
@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  70% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

/* 配方 E：3D Flip */
.flip-container {
  perspective: 1000px;
}
.flip-card {
  transform-style: preserve-3d;
  transition: transform 800ms var(--ease-in-out);
}
.flip-card.flipped {
  transform: rotateY(180deg);
}
.flip-front, .flip-back {
  backface-visibility: hidden;
  position: absolute;
}
.flip-back {
  transform: rotateY(180deg);
}

/* 配方 G：Orbit */
.orbit-item {
  animation: orbit 8000ms linear infinite;
  transform-origin: 0 0;  /* 以中心为原点 */
}
@keyframes orbit {
  from { transform: rotate(0deg) translateX(150px) rotate(0deg); }
  to { transform: rotate(360deg) translateX(150px) rotate(-360deg); }
}
```

### Remotion 实现

```tsx
import { interpolate, Easing, spring } from 'remotion';

// 配方 A：Pop In（用 spring 模拟过冲）
const popIn = (frame: number) => {
  const scale = spring({
    frame,
    config: { damping: 12, stiffness: 200, mass: 0.8 },
  });
  return {
    transform: `scale(${scale})`,
    opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }),
  };
};

// 配方 D：Rotate In
const rotateIn = (frame: number, start: number, duration: number) => {
  const p = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });
  return {
    transform: `rotate(${-15 + 15 * p}deg)`,
    opacity: p,
  };
};

// 配方 G：Orbit（轨道）
const orbit = (frame: number, radius: number, speed: number) => {
  const angle = (frame * speed) % 360;
  const rad = (angle * Math.PI) / 180;
  return {
    transform: `translate(${Math.cos(rad) * radius}px, ${Math.sin(rad) * radius}px)`,
  };
};
```

## 9. 拿到一篇文章，怎么设计它的 scale/rotate 动效？

### Step 1：识别"需要强调"或"需要立体感"的时刻

- 重点元素进场（强调）
- 焦点切换（一个放大，其他缩小）
- 卡片翻转（状态切换）
- 循环装饰（loading、品牌）
- 评分/庆祝（弹跳）

### Step 2：判断语义 → 选配方

| 场景 | 技法 | 配方 |
|---|---|---|
| 重点进场 | Pop In | A |
| 通用进场 | Scale Fade | B |
| 聚焦当前 | Focus Zoom | C |
| 趣味进场 | Rotate In | D |
| 状态切换 | 3D Flip | E |
| 循环装饰 | Spin | F |
| 关系展示 | Orbit | G |

### Step 3：定参数

```
Scale 进场：from 0.8, 过冲 1.05, to 1.0, 400ms, ease-out
Rotate 进场：from -15°, to 0°, 500ms, ease-out
Flip：0° → 180°, 800ms, ease-in-out, perspective 1000px
Spin：0° → 360°/2000ms, linear, infinite
```

### Step 4：决定是否需要 stagger

- 评分/星标 → 加 100ms stagger
- 卡片组 → 加 80ms stagger
- 单元素 → 不需要

### Step 5：与口播对齐

- Pop In = 口播强调该元素时
- Focus Zoom = 口播切换焦点时
- Flip = 口播"切换状态"时

### Step 6：检查反模式

- [ ] 过冲是否控制在 1.05-1.15？
- [ ] 退场是否加了 fade？
- [ ] 旋转角度是否合理（进场 ≤15°）？
- [ ] 持续旋转是否用 linear？
- [ ] 3D Flip 是否加了 perspective？

---

## 参考模板

- `5-stars-pop` — 弹跳评分
- `5-stars-move-up` — 上移评分
- `button-hover-effect` — 按钮交互
- `3d-rotation` — 3D 翻转
- `gradients-rotating-spheres` — 持续旋转
- `orbit-cards` — 轨道运动
- `bento-modular-showreel` — 聚焦放大
