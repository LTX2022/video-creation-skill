> **可选构图配方**：只查看当前内容适用项。比例和元素数量是起点，按画幅、字幕/实拍安全区与内容调整；Alpha 不继承完整网页舞台底板。先确定语义，再取配方，不要求所有章节同一种结构。

# Visual Recipes

这份文件把 `STYLE-BENCHMARKS.md` 的构图模型落成可执行画面配方。章节 agent 不要照抄参考站外观；要复用它们的成熟结构：舞台、焦点、模块、可读留白、内容驱动 motion。

使用顺序：

1. 先从 `VISUAL-MODELS.md` 判断内容关系：数据、流程、对比、关系、时间、空间。
2. 再从 `STYLE-BENCHMARKS.md` 选择 `compositionModel`。
3. 最后按本文件挑一个 recipe，写入 `shot-manifest.json` 的 `motionIntent` 和实现代码。
4. 如果需要更像成熟 Remotion / HyperFrames 社区模板，继续从 `MOTION-PATTERN-LIBRARY.md` 选择 `visualRecipe` 和 `motionStyle`。用户提供参考视频时，还必须读取 `REFERENCE-VIDEO-STYLES.md` 并观察连续帧里的动画过程。
5. 交付前每个 step 都必须写 `visualRecipe` 和 `motionStyle`。

## 构图起点

- 主次靠尺度、位置、对比和操作建立；“动态主导”不由55%面积证明。留白服务运动路径、阅读与下一次揭示。
- 辅助信息保留必要短标签、数字、对象名、单位；不让整句说明替代可见操作。
- 字幕安全区：底部保留，不把核心节点放在字幕后面。
- 横屏：可以用左右舞台、中央剧场、下方指标带。
- 竖屏：优先单列、上主视觉下证据、中心辐射、纵向时间线；不要压缩横屏大表格。

## `hero-theater`

适用：开场、章节锚点、核心结论、封面截图。

画面结构：

- 一个主舞台居中或偏右，占 60% 以上面积。
- 主舞台里必须有内容对象：产品、流程核心节点、关键数字、关键关系，不放空泛光效。
- 标题只做 4 到 10 个字的点题；字幕负责完整句子。

动效：

- 入场 300 到 600ms 建立主视觉。
- 关键对象在口播关键词出现时被点亮、放大或连线。
- 结尾保留 400 到 800ms 可读停留。

禁区：

- 大标题复述字幕整句。
- 只有背景粒子，没有内容对象。

## `dark-preview-stage`

适用：AI 流程、代码、产品操作、复杂机制。

画面结构：

- 外部页面保持安静，内部深色 preview stage 承载复杂度。
- preview stage 内至少有一个高亮焦点：当前步骤、当前节点、当前输出。
- 周边可以放小型状态条、日志点、输入输出端口，但必须弱化。

动效：

- 使用扫描线、游标、节点高亮、连接线增长表达过程。
- 不用 CSS animation；用 `frame` / `interpolate()` / `Easing` 或 `src/video/motion.ts`。

禁区：

- 把整个画面都做成暗色且没有焦点。
- 放假代码、假数据、假 logo。

## `product-gallery`

适用：模板、作品、案例、工具清单、素材池。

画面结构：

- 3 到 6 个项目卡，卡片比例、缩略视觉或状态必须有差异。
- 主卡比其它卡大 1.2 到 1.6 倍，或亮度明显更高。
- 每张卡只保留名称、状态、一个关键数字或短标签。

动效：

- 卡片按内容顺序错峰入场。
- 当前口播对象对应卡片被聚焦，其它卡片降噪。

禁区：

- 一排相同圆角卡片，只换文字。
- 卡片文字复述字幕。

## `spotlight-stage`

适用：AI 工具科普、开发者视频、技术评测、知识干货短视频。

历史方法参考：老七聊AI的科技讲解画面；仅保留通用布局分析，不附原视频、转写或账号标识，不代表作者授权、代言或可复制其独有素材。

画面结构：

- 深蓝渐变背景 + 径向柔和光斑 + 全屏细微噪点 = 统一基底。
- 标题：紫→蓝渐变 + 外发光，逐字飞入。
- 卡片系统：毛玻璃效果（backdrop-blur: 12px）+ 极低透明度黑色底色。
- 三态按钮系统：禁用 = 暗灰边框 + 低透 + 灰图标；普通 = 亮白边框 + 白图标；激活 = 绿色实底 + 白图标。
- 步骤指示器：圆形数字 1→2→3，连接线有进度填充动画。
- VS 对比布局：左暗弱框（旧方式）vs 右亮功能清单（新方式），中间 vs 文字单独淡入。
- 代码框：深色 Code Editor 风格 + 语法高亮 + 打字机效果。
- 金句强调：居中大字号白字，直接放大 ×2，不加任何装饰。

动效：

- **统一入场公式**：`translateY(+20px → 0) + opacity(0 → 1) + scale(0.95 → 1.0)`
- 时长：400~600ms，`ease-out-cubic`。
- 多元素同屏：第 1 个 0ms，第 2 个 +100ms，第 3 个 +200ms，说明文字 +300ms。
- 金句强调：直接放大 ×2，居中纯白粗体，不加任何装饰。
- 背景光效永远不能成为主体。

禁区：

- 同屏出现超过 3 种以上主色。
- 元素入场节奏混乱（有的快 200ms、有的慢 1000ms）。
- 激活态和普通态没有明确视觉区分。
- 金句加了多余装饰（渐变、外发光、背景块）。
- 背景动效太强，抢了主体注意力。

## `metric-strip`

适用：结果、规模、增长、排名、前后对比。

画面结构：

- 数字大，标签小，单位固定对齐。
- 指标组成一条横向或竖向结构带；横屏可横向，竖屏优先纵向堆叠。
- 至少一个指标要有变化、对比或高亮原因。

动效：

- 数字增长 / 条形增长 / 热力块渐亮必须对应口播顺序。
- 重要数字出现后保留可读停留。

禁区：

- 指标卡里写长句解释。
- 没有来源或语义的假数字。

## `module-dashboard`

适用：SaaS、企业流程、系统状态、运营工作台。

画面结构：

- 1 个主模块 + 2 到 5 个辅助模块。
- 主模块承担当前口播命题；辅助模块只提供上下文。
- 用细线、状态点、进度条、图标矩阵表达系统，而不是堆段落。

动效：

- 主模块先入场，辅助模块后入场。
- 当前状态更新时，只动相关模块，其它模块保持稳定。

禁区：

- 每个模块亮度一样，观众不知道看哪。
- dashboard 只是装饰背景。

## `audiogram-waveform`

适用：口播节奏、声音、播客、音乐、音频进度。

画面结构：

- 波形、频谱、播放头或进度轨道必须占主视觉位置。
- 旁边只放短标签、时间点或当前章节名。
- 竖屏可以让波形纵向堆叠或居中环绕。

动效：

- 波形增长、播放头推进、cue 高亮要与 `timing-manifest.json` 的时间语义一致。
- 不做随机跳动假波形；没有真实音频时用“概念波形”并标注为视觉表达。

禁区：

- 声音已经到下一句，字幕和波形还停在上一句。

## `motion-graphic-lab`

适用：抽象机制、教学解释、概念变化。

画面结构：

- 用形状、路径、遮罩、粒子、连线解释机制。
- 每个形状要代表一个概念，不能只是漂亮装饰。
- 文本只做对象名或短标签。

动效：

- 路径增长、节点合并、形状变形、遮罩揭示都必须能说清“为什么这样动”。
- 复杂动作拆成 2 到 3 个小阶段，避免一屏同时乱动。

禁区：

- 把抽象光效当内容。
- 动效很多但去掉口播后看不出关系。

## `spatial-3d-stage`

适用：产品层级、技术架构、空间路径、3D 对象。

画面结构：

- 3D / 伪 3D 用于表达层级、距离、路径、包含关系。
- 摄像机角度要稳定，重要对象不能被透视挤到边角。
- 横屏适合横向空间；竖屏适合纵向层级、中心透视或堆叠空间。

动效：

- 镜头移动少而准：推近、环绕、层级展开、路径穿行。
- 必须有可读停留，不要一直转。

禁区：

- 3D 物体与口播无关。
- 只为炫技导致信息更难读。

## 社区/官方模式增强

下面这些 recipe 来自 Remotion / HyperFrames 生态常见成熟画面结构的提炼。它们可以和上面的 `compositionModel` 组合使用，写入 `shot-manifest.json.visualRecipe`。

| visualRecipe | 推荐 compositionModel | 核心画面 | 使用限制 |
|---|---|---|---|
| `pov-hook-demo` | `dark-preview-stage` / `product-gallery` | 先给第一视角问题，再切产品/流程演示 | 适合短视频开场；4 秒内必须进入内容 |
| `source-to-output-demo` | `dark-preview-stage` | 输入 -> 处理 -> 输出三段式 | 输出必须是真实结果或明确 placeholder |
| `decision-tree-router` | `motion-graphic-lab` / `relationship-map` | 中心问题 + 分支路径 | 分支不能超过 5 个，当前路径高亮 |
| `kinetic-claim-card` | `hero-theater` | 短标题 + 背后语义动效 | 标题 4-10 字，不复述字幕整句 |
| `metric-race-strip` | `metric-strip` | 数字/条形按口播增长 | 必须有来源或明确为概念示意 |
| `nyt-graph-reveal` | `metric-strip` / `module-dashboard` | 坐标/基线 -> 数据线 -> 结论标注 | 不允许假数据 |
| `before-after-wipe` | `comparison-stage` | 分屏 + 推进分割线 | 分割线运动要跟对比语义一致 |
| `quote-carousel` | `quote-carousel` | 一屏一条短 quote | 每条 quote 要有来源或上下文 |
| `podcast-waveform-frame` | `audiogram-waveform` | 波形 + 播放头 + 章节状态 | 波形/播放头必须跟 timing 语义一致 |
| `caption-over-motion-bg` | `caption-stage` | 字幕主线 + 语义背景动效 | 背景不能只是抽象粒子 |
| `reaction-pip-review` | `reaction-pip` | 主素材 + 小评论/标注窗口 | PiP 不得压字幕安全区 |
| `product-feature-flythrough` | `product-gallery` / `spatial-3d-stage` | 产品面板/功能卡逐一聚焦 | 每个功能卡必须有真实状态差异 |
| `module-dashboard-focus` | `module-dashboard` | 1 主模块 + 多辅模块 | 主模块必须承担当前口播命题 |
| `node-graph-build` | `relationship-map` | 节点由中心向外生成 | 节点和边必须有语义 |
| `timeline-stack` | `timeline-stage` | 时间节点按顺序打开 | 当前节点高亮，过去/未来降噪 |
| `logo-sting-outro` | `hero-theater` | 几何元素收束成品牌/标题 | 只用于片头/片尾 |
| `kinetic-prompt-to-product` | `hero-theater` / `dark-preview-stage` / `product-gallery` | 超大短标题 -> prompt/输入框 -> 产品 UI 卡片 -> 结果收束 | 不得复述字幕；UI 卡片必须有真实状态差异 |
| `annotated-flow-diagram` | `motion-graphic-lab` / `relationship-map` / `timeline-stage` | 标题问题 -> 手势/笔触标注 -> 节点框图逐个生成 -> 箭头增长 | 手势只做短注意力引导，不得盖字幕或主要节点 |

`motionStyle` 用来规定运动气质：`warm-grain`、`swiss-grid`、`kinetic-type`、`decision-tree`、`product-promo`、`nyt-data-story`、`vignelli-headline`、`caption-first`、`podcast-frame`、`before-after`、`reaction-pip`、`quote-carousel`、`announcement-card`、`logo-sting`、`shape-system`、`three-depth`、`prompt-product-kinetic`、`whiteboard-engineering-flow`。

## 交付检查

- [ ] 每个 step 的 recipe 能解释当前口播，而不是只让画面变花。
- [ ] `shot-manifest.json` 的 `compositionModel` 和 recipe 一致。
- [ ] `motionIntent` 具体写出“哪个对象在什么时刻为什么动”。
- [ ] `visualRecipe` 和 `motionStyle` 来自 `MOTION-PATTERN-LIBRARY.md`，且不是为了好看硬套。
- [ ] 如果使用用户给的参考视频，已按 `REFERENCE-VIDEO-STYLES.md` 分析连续帧里的动画过程，而不是只参考静态画面。
- [ ] 字幕开启时，画面文字没有复述字幕完整句。
- [ ] 横屏 / 竖屏布局按 `FORMATS.md` 重设，不互相压缩。
