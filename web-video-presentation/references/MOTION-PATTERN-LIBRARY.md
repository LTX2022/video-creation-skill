> 这是保留既有 ID 的配方词汇表，不是所有项目的审美限制。先按 [案例类型](MOTION-CASEBOOK.md) / [流程元素](FLOW-ELEMENTS.md) / [机制设计](MECHANISM-DESIGN.md) 选择解释关系，再按需选一项技法。示例帧数需按项目 fps 与内容重算，不把60fps模板当固定规格。

# Motion Pattern Library

本文件把 Remotion 官方生态、HyperFrames examples 和成熟社区模板的画面语言沉淀为可复用的生产模式。它不是模板代码仓库，也不是照抄外部页面；Agent 使用它时只能复用结构、节奏和画面决策，不能复制外部品牌、文案、代码或素材。

**先选内容关系，再选运动。** 下列是既有 ID 与可选起点，不是为了填字段而加装饰的清单。粒子、色散、鱼眼、glow、玻璃与持续漂浮默认不加；有具体材质、空间、状态或品牌用途才启用。Lottie-like 是视觉语言，不代表可移植 JSON 导出；外部参考的适用边界见 [REFERENCE-ADOPTION](REFERENCE-ADOPTION.md)。

## 来源提炼

- Remotion 官方/生态：以 React composition、`useCurrentFrame()`、`interpolate()`、`spring()`、`Easing`、`staticFile()`、`@remotion/shapes` 等确定性能力构建可复现视频。
- HyperFrames examples：`warm-grain`、`swiss-grid`、`kinetic-type`、`decision-tree`、`product-promo`、`nyt-graph`、`vignelli` 等模板方向说明了成熟视频画面不是“加背景”，而是先选生产用例和构图骨架。
- 社区/商业模板库：常见短视频结构包括 `POV hook -> demo`、caption-first、podcast waveform、before/after、reaction PiP、quote carousel、announcement card、logo sting 等结构。
- 用户提供的两支 Remotion 参考视频：见 `REFERENCE-VIDEO-STYLES.md`。它们必须通过连续帧观察学习动画过程，不能只看静态关键帧。
- 生成项目模板内置 `src/video/reference-style-scenes.tsx`，提供 `KineticPromptToProductScene` 和 `AnnotatedFlowDiagramScene` 两个可选组件。它们是起点，不是唯一实现；原创实现只要满足内容关系、帧确定性和实际QA即可。

## 字段契约

每个 `shot-manifest.json.steps[]` 必须写：

```json
{
  "compositionModel": "dark-preview-stage",
  "visualRecipe": "decision-tree-router",
  "motionStyle": "swiss-grid",
  "motionTechnique": "03-reveal",
  "motionIntent": "同一请求按判据走入获选分支，接收端响应与完成读数从同一状态产生"
}
```

- `compositionModel`：屏幕骨架，回答"画面是什么舞台"。
- `visualRecipe`：可复用镜头配方，回答"这个 step 具体用哪种视频模式表达"。
- `motionStyle`：运动和质感风格，回答"它看起来像哪一类成熟视频语言"。
- `motionTechnique`：具体动效技法族（12 选 1），回答"这个 step 用哪种动态技法实现"。需要时按索引只读对应一篇，不是每章通读。来自 [`jitter-motion-techniques/`](jitter-motion-techniques/)，ID 为 `01-fade-opacity` ~ `12-glass-shader`。选好后阅读对应文章的「拿到一篇文章怎么设计该动态」步骤。

## Motion Styles

| motionStyle | 风格来源 | 适合内容 | 动效规则 |
|---|---|---|---|
| `warm-grain` | HyperFrames warm grain / 品牌生活方式片 | 品牌故事、生活方式、温和观点 | 慢速入场、纸感颗粒、暖色大面积留白；避免高频抖动 |
| `swiss-grid` | HyperFrames swiss grid / 瑞士国际主义 | 企业技术、结构化观点、课程 | 线性位移、网格对齐、硬切/滑入；数字和标签极克制 |
| `kinetic-type` | HyperFrames kinetic type / title cards | 标题、金句、冲突观点 | 大字可以出现，但必须是短标题；字幕仍承载完整句 |
| `decision-tree` | HyperFrames decision tree / explainer | 选择、判断、流程分叉 | 节点逐个点亮，连接线增长，当前路径高亮 |
| `product-promo` | HyperFrames product promo / SaaS launch | 产品演示、功能发布、工具清单 | 产品操作与UI状态承担解释，主体尺度按画幅/阅读需要决定 |
| `nyt-data-story` | HyperFrames NYT graph / 数据故事 | 数据变化、趋势、对比 | 图表先给轴和基线，再增长数据；不要假数据 |
| `vignelli-headline` | HyperFrames portrait Vignelli / 海报标题 | 竖屏公告、强观点、封面 | 极简大标题 + 几何秩序；只用于短标题，不复述字幕 |
| `caption-first` | 社媒 caption-first 短视频 | 观点密集、财经/效率/教育短视频 | 图像/操作承担内容，允许可读hold；正文不整句重复字幕 |
| `podcast-frame` | podcast clip framed 模板 | 播客、访谈、音频复用 | 波形/进度/说话人状态必须跟 timing 语义对应 |
| `before-after` | before/after split 模板 | 改造、优化、案例对比 | 左右或上下分屏，变化边界线推进，结果先后清晰 |
| `reaction-pip` | reaction picture-in-picture 模板 | 评论、拆解、竞品分析 | 主素材 + 旁路评论框；评论框不盖字幕安全区 |
| `quote-carousel` | quote graphic carousel 模板 | 多观点摘录、文章精华 | 每屏一个短 quote，不做长段落；卡片必须有差异 |
| `announcement-card` | launch / release card | 发布、更新、版本说明 | 产品/版本号/关键变化三层，不堆列表 |
| `logo-sting` | logo/outro motion | 片头片尾、品牌收束 | 只用于开头/结尾；中段不把 logo 动效当内容 |
| `shape-system` | Remotion shapes / abstract motion | 机制解释、抽象关系 | 形状必须代表概念；每个形状有语义，不做纯装饰 |
| `three-depth` | Three.js / pseudo-3D stage | 空间层级、系统架构、产品结构 | 镜头移动少，层级展开后有可读停留 |
| `prompt-product-kinetic` | 参考 Remotion 产品短片 / prompt-to-product | AI 工具、SaaS 开场、产品 launch | 超大短标题裁切入场 -> prompt/输入框 -> 产品 UI 卡片 -> 结果收束；打字、复制、按钮状态必须对应口播 |
| `whiteboard-engineering-flow` | 参考 Remotion 工程流程讲解片 | B 站教程、工程解释、Agent 工作流、方法论 | 节点逐个出现，箭头路径增长，当前节点高亮，手写/手势只做短暂注意力引导 |
| **`dark-tech-spotlight`** | 老七聊AI（抖音 98879680662）- 深色科技风 | AI 工具科普、开发者视频、技术评测、知识干货短视频 | 深蓝渐变背景 + 光斑 + 噪点；可选短位移/opacity入场，时序按依次/并行/错峰选择，不统一所有对象；三态按钮：禁用灰 / 普通白 / 激活绿；金句直接放大 ×2 |

## Visual Recipes

| visualRecipe | 适配 compositionModel | 画面结构 | 典型用途 |
|---|---|---|---|
| `pov-hook-demo` | `dark-preview-stage` / `product-gallery` | 4 秒内先给第一视角问题，再切入产品/流程演示 | 短视频开场、广告 hook |
| `source-to-output-demo` | `dark-preview-stage` | 左输入、中处理、右输出，游标/连线推进 | AI 工作流、工具演示 |
| `decision-tree-router` | `motion-graphic-lab` / `dark-preview-stage` | 中心问题节点 + 多分支路径 | 选择、判断、策略 |
| `kinetic-claim-card` | `hero-theater` | 主标题 4-10 字 + 背后动态图形证据 | 开场、章节锚点 |
| `metric-race-strip` | `metric-strip` | 数字/条形按口播顺序增长 | 增长、成本、对比 |
| `nyt-graph-reveal` | `metric-strip` / `module-dashboard` | 先坐标/基线，再数据线/标注，最后结论点亮 | 数据故事 |
| `before-after-wipe` | `comparison-stage` | 分屏或滑动分割线展示变化 | 案例优化、改造前后 |
| `quote-carousel` | `quote-carousel` | 每屏一个短 quote + 来源/上下文标签 | 文章精华、观点合集 |
| `podcast-waveform-frame` | `audiogram-waveform` | 波形、播放头、说话人/章节状态 | 访谈、口播复用 |
| `caption-over-motion-bg` | `caption-stage` | 字幕为主，但背景有相关图形/素材，允许阅读hold | 文字密集社媒短视频 |
| `reaction-pip-review` | `reaction-pip` | 主素材大，评论/标注小；安全区清楚 | 评测、拆解、竞品 |
| `product-feature-flythrough` | `product-gallery` / `spatial-3d-stage` | 产品面板/功能卡随镜头推进逐一聚焦 | 产品发布 |
| `module-dashboard-focus` | `module-dashboard` | 1 主模块 + 2-5 辅模块，主模块随口播更新 | SaaS、运营、安全 |
| `node-graph-build` | `relationship-map` | 节点从中心向外生成，当前关系高亮 | Agent、知识图谱、Houdini 节点 |
| `timeline-stack` | `timeline-stage` | 纵向/横向时间线，节点按顺序打开 | 历史、流程、项目进展 |
| `logo-sting-outro` | `hero-theater` | 几何元素收束成品牌/标题 | 片尾、品牌收口 |
| `kinetic-prompt-to-product` | `hero-theater` / `dark-preview-stage` / `product-gallery` | 大字 hook 裁切入场，缩成 prompt/输入框，再把产品卡片或输出面板推到主舞台 | AI 产品、工具演示、SaaS 开场 |
| `annotated-flow-diagram` | `motion-graphic-lab` / `relationship-map` / `timeline-stage` | 标题建立问题，手势/笔触引导注意，节点框图和箭头按口播逐步生成 | 工程教程、Agent 流程、方法论拆解 |
| **`dark-tech-glow`** | `spotlight-stage` / `tech-preview` / `glass-ui-stage` | 深蓝背景光斑 → 渐变发光标题 → 毛玻璃卡片入场 → 三态按钮/步骤指示器 → VS 对比 → 代码模拟 → 金句强调收束 | AI 工具科普、开发者视频、技术评测、知识干货短视频 |

## 选择规则

1. 先看内容关系，不先看风格。数据选 `nyt-graph-reveal` / `metric-race-strip`；选择判断选 `decision-tree-router`；产品演示选 `source-to-output-demo` / `product-feature-flythrough`。
2. 如果用户给参考网站，只提炼信息密度、留白、色彩、节奏和组件气质，再映射到 `motionStyle`。
3. 如果用户给参考视频，必须按 `REFERENCE-VIDEO-STYLES.md` 抽连续帧或观察时间序列，先记录入场、主体推进、焦点切换和可读停留，再映射到 `visualRecipe` / `motionStyle`。
4. 竖屏优先 `caption-first`、`vignelli-headline`、`podcast-frame`、`timeline-stack`、`pov-hook-demo`；横屏优先 `swiss-grid`、`product-promo`、`nyt-data-story`、`module-dashboard-focus`。
5. AI 产品或工具开场优先考虑 `kinetic-prompt-to-product` + `prompt-product-kinetic`；工程教程或 Agent 工作流优先考虑 `annotated-flow-diagram` + `whiteboard-engineering-flow`。
6. 竖屏项目也可以使用这两个参考 recipe，但必须重排为单列大主体：产品卡片纵向堆叠、流程节点纵向连接、字幕安全区独立；禁止横屏等比压缩。
7. 任何 recipe 都必须满足字幕安全区。画面文字不能复述字幕，除非开头/结尾点题并写 `allowSubtitleOverlap`。
8. `motionStyle` 只控制运动气质；不能让风格压过内容。看不出当前口播含义，recipe 失败。
9. **需要细化具体技法时，从 [`jitter-motion-techniques/`](jitter-motion-techniques/) 选适用的 `motionTechnique`**（现有12个技法族）。`motionStyle` 管"整体气质"（如 swiss-grid），`motionTechnique` 管"具体怎么动"（如 stagger / reveal / blur）。两者是互补关系：motionStyle 是上层风格，motionTechnique 是底层技法。技法选择见 [`jitter-motion-techniques/README.md`](jitter-motion-techniques/README.md) 的「技法决策流程」五问。

## 反模式

- 只说“参考 Remotion / HyperFrames 风格”，但 `shot-manifest.json` 没有具体 `visualRecipe`。
- 使用参考视频 recipe 但没有连续阶段，只做静态截图式构图。
- 竖屏中把横屏流程图缩小成小字横排，导致节点和箭头看不清。
- 把 caption-first 当成复述字幕的借口。
- 把产品 promo 做成一排空卡片。
- 把 NYT graph 做成没有来源的假数据。
- 把 reaction PiP 做成遮住字幕的窗口。
- 把 logo sting 放在中段当过场，导致内容断裂。


## v2.2.16 新增模式

### 新增 Motion Styles

| motionStyle | 风格来源 | 适合内容 | 动效规则 |
|---|---|---|---|
| `jitter-card-flow` | 受 Jitter 动作组合思路启发的本地卡片配方，并非已核验原模板 | 素材密集、产品矩阵、案例展示、工具清单 | 从素材差异与聚焦目的选择流入、排列、移动、聚焦阶段；不必全用，全部帧驱动 |
| `anime-timeline-stagger` | Anime.js timeline / stagger | 多元素分布式入场、连续推进 | 用 Remotion `interpolate` + `Easing` 复刻 Anime.js 的 timeline 和 stagger 概念；不直接依赖 animejs 运行时驱动渲染，保证可复现 |

### 新增 Visual Recipes

| visualRecipe | 适配 compositionModel | 画面结构 | 典型用途 |
|---|---|---|---|
| `card-array-flow` | `product-gallery` / `motion-graphic-lab` | 贪吃蛇曲线流入→阵列逐行铺满→各行交替方向滑动（鱼眼畸变+色散）→第85帧起3秒慢快慢滑动→中央卡片放大、其他异步缩小消失 | 抖音素材密集展示、产品矩阵、案例轮播 |

### card-array-flow 使用说明

可复用组件：`src/components/CardArrayFlow.tsx`（脚手架自动复制）。

以下记录既有组件的参数化阶段，不是所有镜头的推荐方案，也不证明 Jitter 原作采用同样动作。先确认卡片内有真实差异、聚焦能揭示信息；重复素材、鱼眼/色散或异步消失会妨碍比较时，选择无这些处理的实现，不为保留配方硬套。Alpha 局部素材不要求阵列铺满整帧。实际组件是否有对应开关须读实现，不把这里的设计选择冒充已支持的 props。

阶段节奏（默认值，可在 props.phases 覆盖）：
1. **A 贪吃蛇流入**（0-30帧）：卡片沿贝塞尔曲线从画外流入，按 index 错峰，曲线感+流动感
2. **B 阵列铺满**（30-60帧）：从贪吃蛇位置过渡到整齐阵列
3. **C 交替滑动**（60-85帧）：偶数行向左、奇数行向右，鱼眼畸变（边角 scale 缩小），色散（RGB box-shadow 偏移）
4. **D 慢快慢滑动**（85-265帧，3秒@60fps）：`Easing.bezier(0.25,0.1,0.25,1)`，开头慢启动→加快→变慢停下
5. **E 中央放大聚焦**（265帧起）：中央卡片放大 1.8x，其他卡片用 seededRandom 异步缩小消失（非同步，营造随机感）

卡片规则：
- 形状为圆角矩形（`radius` 可配）
- 卡片数量不足时可重复使用，但两张相同卡片不能挨着（`layoutCardsSafe` 自动错开）
- 支持 image / video / color 三种卡片内容；视频卡片应保持动态播放状态

### 选择规则补充

10. 卡片/素材密集内容优先 `card-array-flow` + `jitter-card-flow`。
11. 需要分布式多元素入场时参考 `anime-timeline-stagger`，用 `staggerProgress`（motion.ts）复刻 Anime.js 的 stagger 延迟。
12. Anime.js (`animejs`)已在脚手架依赖清单声明（不表示已安装），但**仅作运动语言参考**；Remotion 渲染时所有动画必须由 `useCurrentFrame`/`interpolate`/`Easing`/`spring` 帧驱动，不得用 animejs 运行时直接驱动渲染，否则预览与 MP4 不一致。
