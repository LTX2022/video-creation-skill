# 09 · Gradient 渐变

> **一句话**：用颜色的平滑过渡和流动制造品牌感、氛围感和视觉张力，是 Jitter 模板数量最多的技法族（30 个）。

## 1. 视觉特征

颜色从一个色值平滑过渡到另一个色值，可以沿直线（linear）或圆形（radial）分布，并支持**动画**——颜色 stop 移动、位置漂移、整体旋转。

```
静态渐变：  红 ────→ 橙 ────→ 黄    （固定）
动态渐变：  红 → 橙 → 黄 → 红...    （流动）
          色块沿渐变轴移动
```

### Gradient 的特殊地位

Jitter 的 30 个 gradient 模板是所有技法族中**数量最多**的。这说明渐变在 Jitter 的设计语言中占据核心位置——它不是"装饰"，而是**品牌视觉语言的主要载体**。

> **关键洞察**：Jitter 渐变的演进时间线揭示了一个重要事实——**渐变能力是一层层解锁的**：先有静态渐变（2024-03），再有渐变动画（2024-06），然后是文字渐变（2025-08）、描边渐变（2025-09），最后是渐变模板集（2025-12）。这说明渐变不是"一个功能"，而是**一整套颜色表达体系**。

## 2. Jitter Gradient 的能力演进

```
2024-03   Gradients（静态渐变上线，linear + radial）
          → 全新 color picker，支持色标增删
          → Figma 渐变原生导入
2024-06   Gradient animations（渐变动画）
          → 动画所有渐变属性：颜色、色标数、位置、画布位置
2025-08   Text gradients（文字渐变）
          → 给文字填充渐变，大标题品牌化
2025-09   Gradients on strokes（描边渐变）
          → 描边也可渐变+动画
2025-12   Gradient templates（渐变模板集）
          → 30 个渐变专用模板
```

### 渐变的四个可动画维度

Jitter（2024-06）明确指出，渐变的以下属性**全部可动画**：

```
1. 颜色（color stops 的颜色）
2. 色标数量（stop 的个数）
3. 色标位置（stop 在渐变轴上的位置 0-100%）
4. 渐变在画布上的位置（渐变整体位移）
```

这四个维度的组合，构成了渐变动画的全部可能性。

## 3. Gradient 的五种叙事模式

从 Jitter 的 30 个模板反推：

### 模式 A：氛围背景（Ambient）

```
全屏渐变背景，缓慢流动
颜色 stop 缓慢移动，位置漂移
```

**用途**：Hero 背景、品牌氛围、loading。
**Jitter 模板**：`gradient-background`、`gradient-noisy-blur`、`gradients-haze`

### 模式 B：品牌标题（Brand Title）

```
文字填充渐变，渐变流动
大标题的品牌化表达
```

**用途**：品牌标题、Hero 文字、金句。
**Jitter 模板**：`text-gradients` 类、`gradients-logo-reveal`

### 模式 C：几何变形（Geometric）

```
渐变填充的几何形状，形状变形 + 颜色流动
```

**用途**：抽象表达、艺术感、品牌视觉。
**Jitter 模板**：`gradients-geometric-morph`、`gradients-morphing-shapes`

### 模式 D：运动轨迹（Motion）

```
渐变作为运动路径的视觉化
色块沿轨迹流动
```

**用途**：流程图、连接、数据流。
**Jitter 模板**：`gradients-diagonal-sweep`、`gradients-perspective-tunnel`

### 模式 E：循环装饰（Loop）

```
渐变持续旋转或循环流动
作为装饰元素
```

**用途**：loading、品牌循环、背景。
**Jitter 模板**：`gradients-rotating-spheres`、`gradients-kaleidoscope`、`gradients-petals`

## 4. 设计参数

### 核心参数

| 参数 | 作用 | 推荐值 |
|---|---|---|
| `type` | 渐变类型 | linear / radial |
| `angle` | 渐变角度 | 0-360°（linear） |
| `stops` | 色标数组 | 2-5 个（多了混乱） |
| `stopColors` | 各色标颜色 | 品牌色系 |
| `stopPositions` | 各色标位置 | 0%, 50%, 100% 等 |
| `duration` | 动画时长 | 2000-8000ms（渐变适合慢） |
| `easing` | 缓动 | linear（循环）/ ease-in-out（过渡） |

### 色标设计

```
2 色标（双色）：     简洁、对比、品牌色
3 色标（三色）：     丰富、有过渡、常用
4-5 色标（多彩）：   华丽、彩虹、艺术感
6+ 色标：            混乱、避免
```

### 角度的语义

| 角度 | 方向 | 语义 |
|---|---|---|
| 0° | 上→下 | 沉稳、自然（天空感） |
| 90° | 左→右 | 推进、阅读（默认） |
| 45° | 左上→右下 | 动感、对角 |
| 135° | 右上→左下 | 反向动感 |
| radial | 中心→外 | 聚焦、能量 |

## 5. 节奏控制

### 渐变的"慢"原则

```
其他动画：300-1000ms
渐变：    2000-8000ms

原因：渐变是"氛围"，不是"事件"
氛围需要时间酝酿，不能快
快速渐变（<1000ms）会像"变色"，突兀
```

### 循环渐变

```
渐变沿轴持续移动，无缝循环：
  background-position: 0% → 100% → 0%（循环）
  duration: 4000-8000ms
  easing: linear（必须匀速，否则循环可见接缝）

效果：像"流动的河水"
```

### 渐变 + 形状同步变形

```
渐变填充的形状同时变形：
  形状 morph（见 07-morph）
  渐变颜色 stop 同步变化

效果：形状和颜色浑然一体地变化
```

### 多层渐变叠加

```
背景层：大范围 radial 渐变（缓慢）
中景层：linear 渐变（中速）
前景层：文字渐变（静止或微动）

效果：层次丰富、有深度
```

## 6. 组合配方

### 配方 A：流动氛围背景

```
type: linear, angle: 90°
stops: [品牌色A 0%, 品牌色B 100%]
background-position: 0% → 200% → 0%（循环）
duration: 6000ms
easing: linear

效果：颜色"流过"画面
用途：Hero 背景、loading
Jitter 模板：gradient-background
```

### 配方 B：品牌标题渐变

```
type: linear, angle: 90°
stops: [品牌色A, 品牌色B]
应用于文字 fill
渐变静止或微动（background-position 微移）
duration: 8000ms

效果：大标题有品牌色流动感
用途：Hero 标题、金句
Jitter 模板：text-gradients、gradients-logo-reveal
```

### 配方 C：径向聚焦

```
type: radial
中心色：亮色（高亮）
边缘色：暗色（背景）
中心位置随焦点移动

效果：聚光灯效果，引导视线
用途：重点信息、产品聚焦
```

### 配法 D：几何形变渐变

```
渐变填充的形状同时 morph
颜色 stop 同步变化
duration: 2000ms（慢）
easing: ease-in-out

效果：形状和颜色浑然变化
用途：艺术、品牌、抽象
Jitter 模板：gradients-geometric-morph
```

### 配方 E：旋转球体（循环）

```
radial 渐变 + 持续旋转
多个球体不同速度旋转
duration: 4000-8000ms（每圈）
easing: linear

效果：行星轨道感
用途：装饰、循环背景
Jitter 模板：gradients-rotating-spheres
```

### 配方 F：万花筒

```
多个渐变镜像对称
整体旋转
duration: 8000ms+
easing: linear

效果：万花筒、艺术感
用途：装饰、创意
Jitter 模板：gradients-kaleidoscope
```

### 配方 G：渐变 + 描边

```
形状填充渐变 + 描边也渐变
描边色和填充色对比
duration: 静态或微动

效果：精致的细节
用途：Logo、图标、品牌元素
Jitter 模板：gradients-logo-reveal（2025-09 描边渐变）
```

### 配方 H：对角扫光

```
linear 渐变，angle: 45°
渐变沿对角线快速扫过
duration: 1500ms
easing: ease-in-out

效果：扫光、能量流
用途：转场、强调
Jitter 模板：gradients-diagonal-sweep
```

## 7. 反模式

| 反模式 | 说明 | 替代 |
|---|---|---|
| 色标太多（>5） | 混乱、彩虹 | 控制在 2-4 个 |
| 渐变太快（<1000ms） | 像变色 | 提到 2000ms+ |
| 循环用 ease-out | 接缝可见 | 循环用 linear |
| 颜色对比太低 | 看不出渐变 | 确保有明度差 |
| 文字渐变看不清 | 影响阅读 | 渐变文字加足够对比 |
| 渐变 + 太多其他动画 | 视觉混乱 | 渐变做主视觉时，其他动画克制 |

## 8. Web / Remotion 落地

### CSS 实现（网页端）

```css
/* Token */
--grad-brand: linear-gradient(90deg, #FF6B6B 0%, #4ECDC4 100%);

/* 配方 A：流动氛围背景 */
.flowing-gradient {
  background: linear-gradient(90deg, #FF6B6B, #4ECDC4, #FF6B6B);
  background-size: 200% 100%;
  animation: flow 6000ms linear infinite;
}
@keyframes flow {
  0% { background-position: 0% 0; }
  100% { background-position: 200% 0; }
}

/* 配方 B：品牌标题渐变 */
.gradient-text {
  background: linear-gradient(90deg, #FF6B6B, #4ECDC4);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

/* 配方 F：万花筒（旋转） */
.kaleidoscope {
  background: conic-gradient(#FF6B6B, #4ECDC4, #45B7D1, #FF6B6B);
  animation: spin 8000ms linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 配方 H：对角扫光 */
.sweep {
  background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%);
  background-size: 300% 300%;
  animation: sweep 1500ms ease-in-out;
}
@keyframes sweep {
  0% { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
}
```

### Remotion 实现（帧驱动）

```tsx
import { interpolate, Easing, interpolateColors } from 'remotion';

// 配方 A：流动氛围背景
const flowingGradient = (frame: number) => {
  const pos = (frame * 0.5) % 200;  // 缓慢流动
  return {
    background: `linear-gradient(90deg, #FF6B6B, #4ECDC4, #FF6B6B)`,
    backgroundSize: '200% 100%',
    backgroundPosition: `${pos}% 0`,
  };
};

// 颜色插值（渐变动画核心）
const gradientColorAnim = (frame: number, start: number, duration: number) => {
  const p = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),
  });
  // 颜色从 A → B
  const color1 = interpolateColors(p, [0, 1], ['#FF6B6B', '#4ECDC4']);
  const color2 = interpolateColors(p, [0, 1], ['#4ECDC4', '#FF6B6B']);
  return `linear-gradient(90deg, ${color1}, ${color2})`;
};

// 配方 E：旋转球体
const rotatingSphere = (frame: number, speed: number) => {
  const angle = (frame * speed) % 360;
  return {
    background: `radial-gradient(circle at 30% 30%, #FF6B6B, #4ECDC4)`,
    transform: `rotate(${angle}deg)`,
    borderRadius: '50%',
  };
};
```

## 9. 拿到一篇文章，怎么设计它的 gradient 动效？

### Step 1：识别"需要品牌色/氛围"的时刻

- Hero 背景（氛围）
- 大标题（品牌化）
- 转场/过渡（能量流）
- 装饰循环（背景）
- 数据可视化（颜色编码）

### Step 2：判断叙事模式 → 选配方

| 场景 | 模式 | 配方 |
|---|---|---|
| Hero 背景 | 氛围 | A |
| 品牌标题 | 品牌标题 | B |
| 聚焦重点 | 径向聚焦 | C |
| 抽象变形 | 几何变形 | D |
| 装饰循环 | 旋转球体 | E |
| 创意万花筒 | 万花筒 | F |
| Logo/图标 | 渐变+描边 | G |
| 扫光转场 | 对角扫光 | H |

### Step 3：选品牌色系（2-4 色）

```
双色：主色 + 辅色（简洁）
三色：主色 + 辅色 + 强调色（常用）
四色：主色 + 辅色 + 强调 + 中性（丰富）
```

### Step 4：定渐变类型 + 角度

```
氛围背景：linear, 90° 或 radial
品牌标题：linear, 90°（应用 background-clip: text）
聚焦：radial（中心亮，边缘暗）
装饰：radial + 旋转
```

### Step 5：定时长 + easing

```
氛围循环：6000ms+, linear
渐变过渡：2000-4000ms, ease-in-out
扫光：1500ms, ease-in-out
```

### Step 6：与口播对齐

- 渐变是"氛围"，通常不与具体口播对齐
- 渐变**变化**时刻可与口播"转折"对齐
- 扫光转场与口播间隙对齐

### Step 7：检查反模式

- [ ] 色标是否 ≤ 5 个？
- [ ] 时长是否 ≥ 2000ms（氛围）/ 1500ms（扫光）？
- [ ] 循环是否用 linear？
- [ ] 文字渐变是否有足够对比？
- [ ] 是否与太多其他动画冲突？

---

## 参考模板

- `gradient-background` — 流动背景
- `gradient-noisy-blur` — 噪点模糊渐变
- `gradients-haze` — 雾霾渐变
- `gradients-rotating-spheres` — 旋转球体
- `gradients-kaleidoscope` — 万花筒
- `gradients-petals` — 花瓣
- `gradients-perspective-tunnel` — 透视隧道
- `gradients-diagonal-sweep` — 对角扫光
- `gradients-geometric-morph` — 几何形变
- `gradients-morphing-shapes` — 形变形状
- `gradients-logo-reveal` — Logo 揭示
- `gradients-bento` — Bento 渐变
- `gradients-animated-list` — 动画列表
