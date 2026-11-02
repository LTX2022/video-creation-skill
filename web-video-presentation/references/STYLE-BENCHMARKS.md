# Style Benchmarks

这份文件把参考站的视觉语言沉淀为可执行规则。Agent 不能照抄这些站点的版式、代码或品牌，但必须吸收它们的成熟度：画面有明确舞台、有焦点、有层次、有可复用的 motion module。

参考来源：

- HyperFrames：深色产品化工作台、视频项目卡片矩阵、导入 / 发布 / 新建视频的生产语境。
- Remotion Templates：模板按 use case 组织，例如 blank、hello world、Next.js、recorder、stills、audiogram、music visualization、3D。
- RemotionLab：白底页面 + 中央深色视频舞台、作品 carousel、数据统计卡、精选作品网格，视觉克制但作品预览有强焦点。

## 视觉基准

每个章节至少选一个 `compositionModel`，并写入 `shot-manifest.json`。这不是样式名，而是构图策略。

| compositionModel | 适用场景 | 画面要求 |
|---|---|---|
| `hero-theater` | 开场、章节转场、观点锚点、封面级画面 | 主视觉有明确层级，面积按内容与画幅决定；背景克制；文字只保留标题 / 短标签 |
| `product-gallery` | 模板、案例、作品、工具清单 | 卡片是内容容器，不是装饰；每张卡必须有状态、缩略视觉或结构差异 |
| `dark-preview-stage` | 技术演示、AI 流程、代码、产品操作 | 深色预览框承载真正内容；外部留白干净；内部有高对比焦点 |
| `metric-strip` | 结果、规模、指标、对比 | 数字大，标签小；指标组对齐成一条结构带；不要用长句解释 |
| `module-dashboard` | SaaS、企业流程、系统状态 | 多模块布局，但只有一个主模块最亮；其它模块作为上下文灰化 |
| `audiogram-waveform` | 播客、口播、音乐、声音节奏 | 波形 / 频谱 / 进度游标必须跟时间语义对应，不是随机装饰 |
| `motion-graphic-lab` | 概念解释、抽象机制、教学演示 | 用形状、路径、粒子、遮罩、线条自绘表达机制；必须能说明内容关系 |
| `spatial-3d-stage` | 产品层级、空间路径、架构、3D 对象 | 3D / 伪 3D 用于解释结构，不能只是炫技背景 |
| `comparison-stage` | 前后变化、方案对比、竞品对照 | 明确一条变化边界或对照轴；不要用两堆文字当对比 |
| `quote-carousel` | 多观点摘录、文章精华、人物语录 | 每屏一个短 quote；必须有来源/上下文标签和视觉差异 |
| `caption-stage` | 社媒观点、强字幕短视频 | 字幕是阅读主线，但背景按阅读任务克制设计，纯色底本身不是失败 |
| `reaction-pip` | 评论、拆解、评测、素材复盘 | 主素材占主画面，评论/标注窗口不盖字幕安全区 |
| `timeline-stage` | 历史、步骤、路线、项目进度 | 时间节点按口播顺序打开；当前节点高亮，前后节点降噪 |
| `relationship-map` | 节点关系、依赖、因果、知识图谱 | 关系线和节点必须有语义；当前口播关系被高亮 |

## 成片完成度

每个 step 的 `finishLevel` 必须是下列之一：

| finishLevel | 含义 | 是否可交付 |
|---|---|---|
| `draft` | 仅有初稿占位或尚未做视觉判断 | 不可交付 |
| `structured` | 信息结构成立，但视觉仍普通 | 仅内部评审 |
| `polished` | 构图、字号、留白、色彩、动效都达到客户可验收 | 可交付 |
| `hero` | 可作为封面 / 第一章锚点 / 宣传截图 | 可交付，适合开场与关键章节 |

当前评审建议（不是机器证明）：

- 首章/代表镜头证明选定视觉语言与技术可行，不强迫单段Alpha素材做封面式hero。
- 所有需要交付的镜头经过实际图形/运动QA，不能靠填写finishLevel冒充。
- 不允许任何 step 保持 `draft`。

## 从参考站吸收的设计动作

- **先做舞台，再放内容**：不要把整个屏幕均分成 PPT 块。先决定主舞台是剧场、预览框、图库、指标条还是系统仪表盘。
- **大面积留白 + 单一焦点**：成熟作品常把真正内容集中在一个主 preview / hero surface 中，周围留白让视觉呼吸。
- **模板不是花纹，是用例**：每种模板必须回答“这类内容为什么需要这种画面”，例如 audiogram 用波形，3D 用空间，stills 用高质量静帧。
- **深色预览框承载复杂度**：复杂技术画面优先放入深色 preview stage，外部保持安静，内部用高亮节点、线条、状态变化制造焦点。
- **指标卡只做证据，不做正文**：数字可做节奏锚点；长句解释交给口播和字幕。
- **作品网格要有真实差异**：图库 / 案例页不能是一排相同卡片。至少在比例、缩略视觉、状态、数据或层级上体现差异。
- **微交互不等于动效**：hover、光效、扫描线不能替代内容动作。Remotion 画面必须把动作绑定到 frame 和 narration。

## 反模式

- 一个大标题 + 三张圆角卡片，卡片里还是文字。
- 背景有粒子 / 光晕，但内容没有被可视化。
- 指标卡堆成 dashboard，但没有主次。
- “模板感”只来自边框和按钮，不来自用例。
- 深色画面整体太暗，主体也读不出来。
- 作品/案例/模板网格每张卡完全一样，只换文字。
- 3D 物体与口播无关。

## 实施要求

`shot-manifest.json` 每个 step 必须写：

- `visualModel`：内容关系模型，例如 `data-visualization`、`process-flow`。
- `compositionModel`：画面构图模型，例如 `hero-theater`、`dark-preview-stage`。
- `finishLevel`：`structured` / `polished` / `hero`；交付前不得为 `draft`。
- `motionIntent`：当前画面为什么需要这个动作。
- `visualRecipe`：采用哪种成熟画面模式，必须来自 `MOTION-PATTERN-LIBRARY.md`。
- `motionStyle`：采用哪类运动/质感语言，必须来自 `MOTION-PATTERN-LIBRARY.md`。

如果 agent 卡在“怎么变美”，先诊断构图是否妨碍内容表达，而非只调颜色。仅在用户允许调整构图、且不覆盖已确认布局时，才考虑更换 `compositionModel`；否则在已批准方向内做最小修正，实质变更先确认。
