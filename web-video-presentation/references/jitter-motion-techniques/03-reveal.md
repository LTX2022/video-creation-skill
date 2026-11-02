# 03 · Reveal 揭示

> **一句话**：用遮罩、裁剪或位移把内容"逐步揭开"，制造悬念和"看见"的过程感。

## 1. 视觉特征

内容不是直接出现，而是**被某种东西挡着，然后挡着的东西移开**，或者**内容从某个边界滑出**。观众经历的不是"出现"而是"发现"。

```
普通 fade：           Reveal：
opacity 0→1           被遮罩挡住 → 遮罩移开 → 内容露出
"它出现了"           "我看见了"
```

### Reveal 与 fade 的本质区别

| 维度 | Fade | Reveal |
|---|---|---|
| 认知 | "它出现了" | "我发现了" |
| 主动权 | 元素主动出现 | 观众主动发现 |
| 悬念 | 无 | 有（"挡着的是什么？"） |
| 方向 | 无方向 | 必有方向（从哪揭开） |
| 信息层次 | 平面 | 有"前-遮罩-后"三层 |

> **关键洞察**：Jitter 的 15 个 reveal 模板（`split-reveal` / `sliding-text-reveal` / `glitch-text-reveal` / `logo-reveal`...）占整体比例不大，但它们是**信息密度最高、最常用在"重点揭示"时刻**的技法。Reveal 不是用来做"所有元素入场"的，而是用来做**"关键信息登场"**的。

## 2. Reveal 的四种实现机制

Jitter 的 reveal 模板揭示了四种核心机制：

### 机制 A：Mask 遮罩移动

```
原理：遮罩固定，内容从遮罩后方移入
视觉：内容"从某处滑出"

  ┌─────────┐
  │ 遮罩    │→ 内容从左侧滑入
  └─────────┘
```

Jitter 在 2020-10-09 引入了 Masks 的 proof of concept，此后 mask 成为 reveal 的核心载体。

### 机制 B：Clip 裁剪扩展

```
原理：内容固定，裁剪区域从 0 扩展到全宽
视觉：内容"被擦出来"或"被刷出来"

  内容固定不动
  ▌▌▌▌▌▌▌▌▌▌
  ▔▔▔→ 裁剪线从左向右扩展
```

### 机制 C：Slide 滑入

```
原理：内容从画外滑入画内
视觉：内容"从边缘进入"

  ← 内容从右侧画外滑入
```

### 机制 D：Split 分裂

```
原理：内容被分成两半，两半向相反方向移动，露出中间
视觉：内容"被撕开"

  左半 → ← 右半
       中间露出
```

Jitter 模板 `the-edit-split-reveal` 是这个机制的典型。

## 3. 设计参数

### 核心参数

| 参数 | 作用 | 推荐值 |
|---|---|---|
| `direction` | 揭开方向 | LTR / RTL / TTB / BTT / split |
| `maskType` | 遮罩类型 | 矩形 / 渐变 / 形状 |
| `revealDuration` | 揭开时长 | 500-800ms（比普通 fade 慢，制造过程感） |
| `easing` | 缓动 | ease-out（自然落入） / ease-in-out（仪式感） |
| `contentFade` | 内容是否同步 fade | 0（纯遮罩）/ 0.3-0.5（半透）/ 1（无 fade） |

### Direction 方向的语义

| 方向 | 语义 | 适用 |
|---|---|---|
| LTR（左→右） | 阅读、时间推进、进步 | 默认，西文阅读方向 |
| RTL（右→左） | 回溯、回顾、历史 | 特殊语义 |
| TTB（上→下） | 揭开"盖子"、从天而降 | 标题、海报 |
| BTT（下→上） | 升起、浮现 | 数据图、统计 |
| Split（分裂） | 强调、戏剧性 | 标题、Logo、关键信息 |

### Mask 遮罩的"硬度"

```
硬遮罩（hard mask）：
  遮罩边缘清晰，像"刀切"
  适用：科技感、硬朗、UI

软遮罩（soft mask / feather）：
  遮罩边缘渐变，像"渐显"
  适用：氛围、柔和、情感

Jitter 在 blur 更新（2024-10-15）中特别提到 "mask feathers"——
模糊的遮罩边缘能让 reveal 更优雅。
```

## 4. 节奏控制

### Reveal 的"慢于 fade"原则

```
fade:    300-500ms（快速，"出现"）
reveal:  500-800ms（慢速，"过程"）

原因：reveal 的价值在于"看见的过程"
如果太快（<400ms），观众感受不到"揭开"的快感
如果太慢（>1000ms），变成"等待"
```

### 双阶段节奏（Reveal + Content）

很多高级 reveal 是**两阶段**的：

```
阶段 1：遮罩移动（revealDuration: 500ms）
阶段 2：内容完全显示后微调（如轻微 scale 1→1.02 + 100ms）

效果：先"揭开"，再"确认"
Jitter 模板：sliding-title-reveal-apple-event
```

### Stagger + Reveal

当多个元素需要 reveal 时：

```
❌ 错误：所有元素同时 reveal（遮罩一起移开，像"开闸"）
✅ 正确：元素 stagger reveal（每个依次揭开）

interval: 100-150ms（比普通 stagger 大，因为每个 reveal 本身较慢）
```

### 与口播同步

- Reveal 的**开始**应在口播提到该信息的**瞬间**
- Reveal 的**完成**应在口播该句**结束前**（让信息有可读停留）
- **不要提前 reveal**——会剧透；**不要滞后**——会脱节

## 5. 组合配方

### 配方 A：Slide Reveal（最基础）

```
内容从画外滑入（translateX -100% → 0）
duration: 600ms
easing: ease-out
direction: LTR

效果：内容"从左侧滑入"
适用：标题、图片、卡片
Jitter 模板：sliding-text-reveal
```

### 配方 B：Clip Reveal（刷出）

```
clip-path: inset(0 100% 0 0) → inset(0 0 0 0)
（裁剪从右侧 100% 收到 0）
duration: 700ms
easing: ease-out

效果：内容"被从左到右刷出来"
适用：标题、横幅、强调性文字
Jitter 模板：color-pills-reveal
```

### 配方 C：Split Reveal（分裂）

```
左半: translateX(-50% → 0)
右半: translateX(50% → 0)
中间内容同时 opacity 0→1
duration: 600ms
easing: ease-out

效果：内容"被撕开露出"
适用：标题、Logo、戏剧性登场
Jitter 模板：the-edit-split-reveal
```

### 配方 D：Mask Slide Reveal（遮罩移动）

```
遮罩从左到右移动
内容固定不动
内容在遮罩后方"被显露"
duration: 800ms
easing: ease-in-out

效果：像"拉窗帘"
适用：重点信息、悬念揭示
```

### 配法 E：Soft Reveal（软遮罩）

```
mask + feather（边缘模糊 20px）
内容 opacity 0→1 同步
duration: 800ms
easing: ease-in-out

效果：优雅、氛围、无硬边界
适用：品牌内容、情感场景
Jitter 模板：search-bar-reveal
```

### 配方 F：Glitch Reveal（故障揭示）

```
clip-path 随机切片 + RGB 分离 + 位移
duration: 500ms
easing: linear 或 steps()

效果：故障美学，数字感
适用：科技、AI、赛博
Jitter 模板：glitch-01-text-reveal / glitch-02-text-reveal
```

## 6. 反模式

| 反模式 | 说明 | 替代 |
|---|---|---|
| Reveal 用 linear easing | 机械、像"机器擦除" | 用 ease-out |
| Reveal 时长 < 400ms | 感受不到"过程" | 提到 500ms+ |
| 所有内容都用 reveal | 过度仪式化，疲劳 | 只用于关键信息 |
| Reveal 方向与内容矛盾 | 如"回溯历史"却 LTR | 方向匹配语义 |
| 多元素无 stagger reveal | 像"开闸" | 加 stagger |
| 遮罩边缘太硬（无 feather） | 生硬 | 关键场景加 10-20px feather |
| **多阶段不隐藏旧阶段**（教训 20） | 内容叠加混乱，"文字重复放置2次" | 阶段间必须 opacity 交替，旧阶段在新阶段进场时淡出 |

## 7. Web / Remotion 落地

### CSS 实现（网页端）

```css
/* 配方 B：Clip Reveal */
.clip-reveal {
  clip-path: inset(0 100% 0 0);  /* 初始：右侧裁剪 100% */
  animation: clipReveal 700ms var(--ease-out) forwards;
}
@keyframes clipReveal {
  to { clip-path: inset(0 0 0 0); }
}

/* 配方 C：Split Reveal */
.split-reveal-left {
  transform: translateX(-50%);
  animation: splitLeft 600ms var(--ease-out) forwards;
}
.split-reveal-right {
  transform: translateX(50%);
  animation: splitRight 600ms var(--ease-out) forwards;
}
@keyframes splitLeft { to { transform: translateX(0); } }
@keyframes splitRight { to { transform: translateX(0); } }

/* 软遮罩（用 mask-image） */
.soft-reveal {
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 20%);
  mask-image: linear-gradient(to right, transparent 0%, black 20%);
  animation: softReveal 800ms var(--ease-in-out) forwards;
}
@keyframes softReveal {
  from { -webkit-mask-position: 0% 0; mask-position: 0% 0; }
  to { -webkit-mask-position: 100% 0; mask-position: 100% 0; }
}
```

> **注意**：参考项目 MOTION-DESIGN.md 的 Render-Safe 约束——CSS masks 在 Remotion 渲染时可能不一致。网页端用 CSS mask 没问题，Remotion 端用 SVG clipPath 或 `interpolate` 计算 `clip-path` 更安全。

### Remotion 实现（帧驱动）

```tsx
import { interpolate, Easing } from 'remotion';

// 配方 B：Clip Reveal
const clipReveal = (frame: number, start: number, duration: number) => {
  const p = interpolate(frame, [start, start + duration], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });
  return `inset(0 ${p}% 0 0)`;  // 右侧裁剪
};

// 使用
<div style={{
  clipPath: clipReveal(frame, 0, 36),  // 36帧 ≈ 600ms
}}>
  {content}
</div>

// 配方 A：Slide Reveal
const slideReveal = (frame: number, start: number, duration: number) => {
  const p = interpolate(frame, [start, start + duration], [-100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });
  return `translateX(${p}%)`;
};
```

### SVG clipPath 实现（Remotion 安全）

```tsx
// Remotion 推荐用 SVG clipPath，避免 CSS mask 的渲染不一致
<svg width="100%" height="100%">
  <defs>
    <clipPath id="reveal-mask">
      <rect
        x={interpolate(frame, [0, 36], [0, width], {easing: Easing.out(Easing.ease)})}
        y="0"
        width={width}
        height={height}
      />
    </clipPath>
  </defs>
  <g clipPath="url(#reveal-mask)">
    {/* 内容 */}
  </g>
</svg>
```

## 8. 拿到一篇文章，怎么设计它的 reveal?

### Step 1：识别"关键信息登场"时刻

Reveal 不是给所有内容用的，只给**需要悬念或强调**的关键信息：
- 主标题登场
- 关键数据揭示
- Logo 出现
- 产品名揭晓
- "答案"或"结论"出现

### Step 2：判断信息类型 → 选机制

| 信息类型 | 推荐机制 | 推荐配方 |
|---|---|---|
| 标题/横幅 | Clip Reveal | B |
| 戏剧性标题 | Split Reveal | C |
| 关键数字/答案 | Mask Slide | D |
| 品牌/情感内容 | Soft Reveal | E |
| 科技/AI 内容 | Glitch Reveal | F |
| 普通图片/卡片 | Slide Reveal | A |

### Step 3：定方向

- 阅读推进 → LTR
- 揭开盖子 → TTB
- 升起浮现 → BTT
- 戏剧分裂 → Split

### Step 4：定时长 + easing

```
普通 reveal:    600ms + ease-out
仪式感 reveal:  800ms + ease-in-out
快速 reveal:    400ms + ease-out（仅用于密集信息）
```

### Step 5：决定是否需要 stagger

- 单个关键信息 → 不需要
- 多个并列关键信息 → stagger 100-150ms

### Step 6：与口播对齐

- Reveal 开始 = 口播提到该信息的瞬间
- Reveal 完成 = 口播该句结束前
- 完成后保留 300-800ms 可读停留（见 RHYTHM.md）

### Step 7：检查反模式

- [ ] 是否只用于关键信息（不滥用）？
- [ ] 时长是否 ≥ 500ms（有过程感）？
- [ ] easing 是否用了 ease-out（不是 linear）？
- [ ] 方向是否匹配内容语义？
- [ ] 多元素是否 stagger？

---

## 参考模板

- `the-edit-split-reveal` — 分裂揭示（戏剧性）
- `sliding-text-reveal` — 滑动揭示（通用）
- `sliding-title-reveal-apple-event` — 滑动标题（Apple 风）
- `glitch-01-text-reveal` / `glitch-02-text-reveal` — 故障揭示（科技）
- `color-pills-reveal` — 颜色块揭示（刷出）
- `search-bar-reveal` — 软揭示（搜索框）
- `the-route-logo-reveal` — Logo 揭示
- `project-reveal` — 项目揭示
- `mobile-screens-reveal` — 多屏揭示
