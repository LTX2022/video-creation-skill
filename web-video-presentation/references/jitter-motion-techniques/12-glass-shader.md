# 12 · Glass & Shader 玻璃与着色器

> **一句话**：用折射、色散、位移等高级视觉效果，制造"真实材质感"，是 Jitter 视觉表达力的最高层。

## 1. 视觉特征

元素呈现**真实玻璃**的物理特性——光线穿过时折射、色散、起霜，像水晶或磨砂玻璃。这是 Jitter 在 2026 年集中发力的"着色器层"能力。

```
Glass 效果：
  - Refraction（折射）：背景被玻璃弯曲
  - Dispersion（色散）：边缘出现彩虹色边
  - Frost（起霜）：表面模糊磨砂
  - Depth（厚度）：有立体感
  - Light（高光）：边缘反光
```

### Glass 与 Blur 的本质区别

| 维度 | Blur（模糊） | Glass（玻璃） |
|---|---|---|
| 机制 | `filter: blur()` | 折射 + 色散 + 起霜 + 高光 |
| 真实感 | 低（只是模糊） | 高（模拟物理） |
| 细节 | 无 | 有（色散、高光、厚度） |
| 性能 | 中 | 高（需着色器） |
| 层级 | L4 视觉融合层 | L5 着色器层 |

> **关键洞察**：Jitter 在 2026 年集中发布了 glass（05-19）、displacement shaders（04-20）、effects & shaders 面板（06-30），以及 AI 生成效果（05-13）。这说明它的视觉表达力正在从"动画能力"升级为"材质模拟能力"。Glass 和 shader 是 Jitter 区别于"普通动效工具"的分水岭——它不再只是"让东西动起来"，而是**让东西有真实的物理质感**。

## 2. Jitter 的着色器能力演进

```
2026-04   Displacement shaders（位移着色器）
          → Amplitude / Offset / Repeat
          → 有机扭曲、波形、流体感

2026-05   Glass effect（玻璃效果）
          → Refraction / Depth / Dispersion / Frost / Light / Blend

2026-05   Animate with AI（AI 生成效果）
          → 用自然语言描述效果，AI 生成

2026-06   Effects & shaders 面板
          → Distortion / Post FX / Utility 三大分类
          → 内置 distortion / 3D flips / dithering / fluted glass 等
          → AI effect 选项生成自定义
```

### Effects 面板三大分类

```
┌─────────────────────────────────┐
│        Effects 面板              │
├─────────────────────────────────┤
│  Distortion（扭曲）              │
│    ├── Displacement（位移）      │
│    ├── 3D flips（3D 翻转）        │
│    ├── Ripple（涟漪）             │
│    └── ...                       │
├─────────────────────────────────┤
│  Post FX（后期效果）             │
│    ├── Dithering（抖动）          │
│    ├── Fluted glass（槽纹玻璃）   │
│    ├── Glitch（故障）             │
│    └── ...                       │
├─────────────────────────────────┤
│  Utility（实用工具）             │
│    └── 辅助效果                  │
└─────────────────────────────────┘
       ↑
       AI effect（用 prompt 生成自定义）
```

## 3. Glass 的六个参数

来自 2026-05-19 changelog：

### 参数 1：Refraction（折射）

```
作用：控制玻璃如何弯曲背景
值：0（无折射）→ 高（强弯曲）

效果：玻璃后方的背景被"扭曲"
类比：透过水瓶看后面的东西
```

### 参数 2：Depth（厚度）

```
作用：玻璃的厚度感
值：0（薄）→ 高（厚）

效果：玻璃有"立体感"，像水晶
```

### 参数 3：Dispersion（色散）

```
作用：边缘的彩虹色分离
值：0（无色散）→ 高（强色散）

效果：玻璃边缘出现红/蓝/紫色彩边
类比：棱镜分光
```

### 参数 4：Frost（起霜）

```
作用：玻璃表面的磨砂程度
值：0（清晰）→ 高（完全磨砂）

效果：玻璃后方模糊
等同于 background-blur 的增强版
```

### 参数 5：Light（光照）

```
作用：边缘高光
子参数：
  - Light intensity（光照强度）
  - Light angle（光照角度）

效果：玻璃边缘有反光，像真实玻璃
```

### 参数 6：Blend（混合）

```
作用：玻璃效果与元素原貌的混合
值：0（纯原貌）→ 1（纯玻璃）

效果：可控制"多像玻璃"
```

## 4. Displacement Shader 的三个参数

来自 2026-04-20 changelog：

```
Amplitude（振幅）：扭曲的强度
Offset（偏移）：扭曲的起始位置
Repeat（重复）：扭曲的周期/频率

每个参数都有：
  - Initial value（初始状态）
  - Target value（动画目标状态）

方向：Horizontal / Vertical / Both
```

**用途**：有机扭曲、波形运动、流体感、reveal 动画、环境背景。

## 5. 设计参数

### Glass 参数推荐

| 参数 | 轻微玻璃 | 标准玻璃 | 重度玻璃 |
|---|---|---|---|
| `refraction` | 2-5 | 8-15 | 20+ |
| `depth` | 1-3 | 5-8 | 10+ |
| `dispersion` | 0-1 | 2-4 | 5+ |
| `frost` | 0-3 | 5-10 | 15+ |
| `light` | 0.3 | 0.5 | 0.7+ |
| `blend` | 0.3 | 0.6 | 0.9 |

### Displacement 参数推荐

| 参数 | 微妙 | 中等 | 强烈 |
|---|---|---|---|
| `amplitude` | 2-5 | 10-20 | 30+ |
| `offset` | 0 | 50 | 100+ |
| `repeat` | 1-2 | 3-5 | 8+ |

## 6. 节奏控制

### Glass 的动画

Glass 的每个参数都可以**单独动画**（2026-05-19）：

```
进场动画：
  frost: 30 → 0（从磨砂到清晰）
  refraction: 0 → 10（折射逐渐出现）
  duration: 800-1200ms
  easing: ease-out

退场动画：
  frost: 0 → 30（从清晰到磨砂）
  refraction: 10 → 0
  duration: 600ms
  easing: ease-in
```

### Glass 的"过渡"叙事

```
玻璃不仅是静态效果，更是"过渡介质"：

  普通元素 → 变成玻璃 → 玻璃破碎/消散 → 新元素

效果：元素"穿过"玻璃完成转换
```

### Displacement 的"有机运动"

```
Displacement 的持续动画：
  amplitude: 0 → 20 → 0（循环）
  offset: 0 → 100（持续移动）
  duration: 3000-5000ms
  easing: ease-in-out

效果：像"水面波纹"或"热空气扭曲"
用途：环境背景、氛围
```

### 与口播同步

- Glass 出现 = 口播提到"透明/清晰/质感"时
- Displacement = 口播提到"流动/有机/变化"时
- 玻璃破碎 = 口播"突破/揭示"时

## 7. 组合配方

### 配方 A：磨砂玻璃面板（UI）

```
frost: 10
refraction: 5
light: 0.4, angle: 45°
blend: 0.8

效果：iOS 风格磨砂玻璃面板
用途：UI 浮层、信息面板
Jitter 模板：frosted-glass-counter
```

### 配方 B：水晶质感（高端）

```
refraction: 15
depth: 8
dispersion: 3
frost: 0（清晰）
light: 0.7, angle: 30°
blend: 0.9

效果：像水晶/钻石
用途：高端品牌、奢侈品
```

### 配方 C：玻璃进场动画

```
frost: 30 → 0
refraction: 0 → 10
opacity: 0 → 1
duration: 1000ms
easing: ease-out

效果：从磨砂"聚焦"成清晰玻璃
用途：重点信息揭示
```

### 配方 D：Displacement 波纹

```
amplitude: 15
offset: 0 → 100（持续）
repeat: 4
direction: Both
duration: 3000ms
easing: ease-in-out（循环）

效果：水面波纹
用途：环境背景、氛围
Jitter 模板：ripple-effect
```

### 配方 E：Displacement Reveal

```
Initial: amplitude 20, offset 0
Target:  amplitude 0, offset 0
duration: 800ms
easing: ease-out

效果：元素从"扭曲"变"清晰"
用途：揭示动画、转场
```

### 配方 F：Dithering（抖动/像素化）

```
效果：像复古游戏/像素艺术
参数：像素大小、颜色量化

用途：科技、复古、AI 美学
Jitter 模板：pixelated-slideshow
```

### 配方 G：Glitch（故障）

```
效果：RGB 分离、位移、扫描线
参数：分离量、频率、强度

用途：科技、赛博、AI
Jitter 模板：glitch-01-text-reveal / glitch-02-text-reveal
```

### 配方 H：Fluted Glass（槽纹玻璃）

```
效果：玻璃表面有竖条纹纹理
像"百叶窗"或"槽纹杯"

用途：高级 UI、建筑感
（Jitter 2026-06 内置效果之一）
```

## 8. 反模式

| 反模式 | 说明 | 替代 |
|---|---|---|
| Glass 参数全拉满 | 失真、卡顿 | 适度，2-3 个参数为主 |
| Displacement 太强 | 完全抽象 | amplitude ≤ 20 |
| 玻璃后无内容 | 看不出玻璃效果 | 确保背景有内容 |
| Glass + 太多其他动画 | 视觉混乱 | Glass 做主视觉时其他克制 |
| 性能问题（多个 shader） | 卡顿 | 同时只 1-2 个 shader |
| Remotion 用 backdrop-filter | 渲染不一致 | 用预渲染素材或 SVG filter |
| **glass/blur 装饰层遮挡内容**（教训 22） | 玻璃/模糊装饰层盖住文字 | 装饰层必须 `zIndex: 0` + `pointerEvents: none`，内容 `zIndex: 1`。用户原话："图案穿插到文字上了" |

## 9. Web / Remotion 落地

### CSS 实现（网页端，有限）

```css
/* 配方 A：磨砂玻璃面板（CSS backdrop-filter） */
.frosted-glass {
  backdrop-filter: blur(10px) saturate(1.5);
  -webkit-backdrop-filter: blur(10px) saturate(1.5);
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 配方 C：玻璃进场（frost 动画） */
.glass-enter {
  backdrop-filter: blur(30px);
  animation: glassEnter 1000ms var(--ease-out) forwards;
}
@keyframes glassEnter {
  to { backdrop-filter: blur(10px); }
}

/* 配方 D：Displacement（CSS 无法真实模拟，用 SVG filter） */
.displacement {
  filter: url(#displacement-filter);
}

/* SVG Displacement Filter */
<svg style="position:absolute;width:0;height:0">
  <filter id="displacement-filter">
    <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" />
    <feDisplacementMap in="SourceGraphic" scale="15" />
  </filter>
</svg>
```

### 真实 Glass 着色器（WebGL，高级）

```tsx
// ⚠️ 依赖检查：@react-three/fiber 和 @react-three/drei 不在脚手架默认依赖中。
// 使用前需安装：npm install three @react-three/fiber @react-three/drei
// 或在 scaffold.sh 的 dependencies 数组中添加这三个包。
// 注意：WebGL 着色器在 Remotion 无头渲染中可能有兼容性问题，
// 建议优先用 SVG filter 或预渲染素材替代。
import { Canvas } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';

const Glass = () => (
  <Canvas>
    <mesh>
      <planeGeometry />
      <MeshTransmissionMaterial
        refraction={0.5}
        thickness={0.5}
        roughness={0.1}
        chromaticAberration={0.05}  // 色散
        distortion={0.1}
      />
    </mesh>
  </Canvas>
);
```

### Remotion 实现（⚠️ Render-Safe 注意）

参考项目 `MOTION-DESIGN.md` 的 Render-Safe 约束：

```tsx
// ❌ 不安全：backdrop-filter 在 Remotion 渲染不一致
<div style={{ backdropFilter: 'blur(10px)' }} />

// ❌ 不安全：CSS filter url() 在 Remotion 可能不一致
<div style={{ filter: 'url(#displacement)' }} />

// ✅ 安全方案 1：预渲染的模糊背景图
<img src={preBlurredBackground} />
<div style={{ background: 'rgba(255,255,255,0.15)' }}>
  {内容}
</div>

// ✅ 安全方案 2：SVG filter（Remotion 渲染较稳定）
const DisplacementEffect = ({ frame, children }) => {
  const scale = interpolate(frame, [0, 30], [20, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });
  return (
    <svg width="100%" height="100%">
      <defs>
        <filter id="displ">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" />
          <feDisplacementMap in="SourceGraphic" scale={scale} />
        </filter>
      </defs>
      <g filter="url(#displ)">
        {/* SVG 内容 */}
      </g>
    </svg>
  );
};

// ✅ 安全方案 3：用 interpolate 模拟（帧驱动，最安全）
const fakeGlass = (frame: number, start: number, duration: number) => {
  const p = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });
  // 用 opacity + 轻微 scale 模拟"玻璃进场"
  return {
    opacity: p,
    transform: `scale(${1 + (1 - p) * 0.02})`,
    background: `rgba(255,255,255,${0.05 + 0.1 * p})`,
    boxShadow: `0 8px 32px rgba(0,0,0,${0.1 * p}), inset 0 1px 0 rgba(255,255,255,${0.2 * p})`,
  };
};
```

### 项目主题参考

你的项目 themes 目录里有 `apple-glass-studio` 主题，说明已有 glass 风格的实践。可参考其实现。

## 10. 拿到一篇文章，怎么设计它的 glass/shader 动效？

### Step 1：识别"需要质感/材质"的时刻

- 高端 UI 浮层（磨砂玻璃面板）
- 品牌质感展示（水晶/玻璃元素）
- 揭示动画（从模糊到清晰）
- 氛围背景（波纹、流体）
- 科技/AI 美学（故障、像素化）

### Step 2：判断效果类型 → 选配方

| 场景 | 效果 | 配方 |
|---|---|---|
| UI 浮层 | 磨砂玻璃 | A |
| 高端品牌 | 水晶质感 | B |
| 重点揭示 | 玻璃进场 | C |
| 氛围背景 | Displacement 波纹 | D |
| 揭示转场 | Displacement Reveal | E |
| 复古/科技 | Dithering | F |
| 赛博/AI | Glitch | G |
| 建筑感 | Fluted Glass | H |

### Step 3：定参数（克制原则）

```
Glass：选 2-3 个主参数，其他默认
  磨砂：frost 10 + light 0.4
  水晶：refraction 15 + dispersion 3 + light 0.7
  不要所有参数全拉满

Displacement：amplitude ≤ 20
```

### Step 4：定时长 + easing

```
Glass 进场：800-1200ms, ease-out（从磨砂到清晰）
Displacement 循环：3000-5000ms, ease-in-out
Glitch：300-500ms, steps()（机械感）
```

### Step 5：确保背景有内容

```
Glass 效果需要"玻璃后方有东西"：
  - 确保玻璃层后方有图片/渐变/内容
  - 纯色背景上看不出玻璃效果
```

### Step 6：与口播对齐

- Glass 出现 = 口播"透明/清晰/质感"
- Displacement = 口播"流动/有机"
- Glitch = 口播"故障/科技"

### Step 7：检查反模式

- [ ] 参数是否克制（不全拉满）？
- [ ] 背景是否有内容？
- [ ] 同时 shader 是否 ≤ 2 个？
- [ ] Remotion 是否避免了 backdrop-filter？
- [ ] 是否与主题风格匹配（如 glass 不适合硬朗科技）？

---

## 参考模板

- `frosted-glass-counter` — 磨砂玻璃计数
- `blur-article-gallery-ios` — iOS 玻璃画廊
- `ripple-effect` — 涟漪效果（displacement）
- `pixelated-slideshow` — 像素化（dithering）
- `glitch-01-text-reveal` / `glitch-02-text-reveal` — 故障揭示
- `blend-modes-gradient-orbs` — 玻璃+渐变球
- `3d-rotation` — 3D 翻转（shader）

---

## AI 生成效果（逃生舱）

当以上预设效果都满足不了需求时，用 Jitter AI（2026-05-13）：

```
操作：
  1. Animate tab → Effects → AI effect
  2. 用自然语言描述效果
     如 "fluted glass background"
     如 "ripple effect"
     如 "glitch transition"
     如 "3D rotation"
     如 "card flip"
  3. AI 几秒生成自定义 shader
  4. 可 refine prompt + 手动调参数
  5. 沉淀到团队库，跨文件复用

注意（AI Manifesto 原则）：
  - AI 是 creative sidekick，不是替代品
  - 生成的是"可复用的创意工具"，不是一次性输出
  - 设计师始终在中心，可随时手动接管
```
