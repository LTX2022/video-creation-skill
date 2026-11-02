> **按需历史风格配方**：下文保留旧参考分析。当前任务未取得原视频时，不声称已播放/逐帧核验；取得当前参考后重新观察时间序列。`compare:references` 只检查稀疏样本元数据，不判断相似度，不证明版权合规或一定原创；内置组件是可选起点，不是唯一实现。

# Reference Video Styles

本文件沉淀两支 Remotion 参考视频的画面与动画规律。Agent 使用它时只能学习结构、节奏、动效语法和完成度判断，不得复制外部品牌、文案、logo、代码或素材。

目标是生成“同类运动语法”，不是生成和参考视频完全相同的画面。禁止复制参考视频里的品牌名、logo、文案、素材、受保护布局和镜头组合；必须把入场、主体推进、焦点高亮、可读停留、退出这些运动结构映射到当前项目自己的内容和素材上。

参考视频：

1. `C:\PUBLIC-EXAMPLE\用自然语言让codex帮我做的动态设计这两天沉浸式体验了下codex和remotion制作了这个短片.mp4`
   - 1920x1080, 30fps, 约 39.8 秒。
   - 风格定位：极简产品动效短片、prompt-to-product、少文字、高留白、软背景、产品 UI 卡片推进。
2. `C:\PUBLIC-EXAMPLE\38621022259-1-192.mp4`
   - 1280x720, 30fps, 约 273.4 秒。
   - 风格定位：工程流程讲解片、白板式流程图、节点框图、手写/手势标注、底部字幕条。
3. **老七聊AI - agent-browser 工具介绍** （抖音 98879680662）
   - 1080x1920 竖屏 / 1920x1080 横屏双版，30fps，约 45 秒。
   - 风格定位：深色科技风科普、深蓝渐变背景 + 光斑、毛玻璃卡片、三态按钮系统、步骤指示器、VS 对比布局、代码编辑器模拟、金句强调。
   - 可复用组件：GradientTitle / GlassPanel / TriStateButton / StepIndicator / VSLayout / CodeEditorBox / BigEmphasis / BrowserBar / CircleBadge / SpotlightBg

## 分析要求

只看关键帧不够。学习参考视频时必须同时做两类观察：

- 静态构图：画面主舞台、留白、字体层级、色彩、字幕安全区、主体大小。
- 动画时间序列：同一镜头内对象如何入场、缩放、归位、连线、打字、点亮、切换焦点、保留停顿、退出。

推荐抽样方式：

```bash
ffmpeg -ss <start> -t <duration> -i "<video>" -vf "fps=2,scale=320:-1,tile=4x3:margin=8:padding=8:color=white" motion-sequence.jpg
```

如果只写“参考视频风格”但没有说明具体对象如何运动，视为无效分析。

生成项目后先产出稀疏样本用于定位；完整动作还需连续区间/实际播放：

```bash
npm run analyze:references -- <video...>
# 先分析参考视频本身，生成 output/reference-video-analysis/manifest.json
npm run render:motion-strips
npm run compare:references
# 快速草稿可先用：
npm run render:motion-strips:fast
```

`analyze:references`按时间点抽参考帧，保存`output/reference-video-analysis/manifest.json`；`render:motion-strips`在step内取稀疏帧，保存`output/motion-strips/manifest.json`与index.html，**不是连续片段**。样本哈希不同仅说明所取图像不同，不能证明无中间闪帧、运动方向/ease/音画同步或完整节奏；合理hold也无需凑不同哈希。

`compare:references`保存`output/reference-style-comparison/manifest.json`与report.md。schema 3 的 `pass` 仅表示 `passScope: sparse-artifact-metadata-only` 的样本元数据检查，**不是视觉验收**；`visualReview.status` 始终为 `not-performed`、`accepted` 为 `false`。保留的 `dynamicSimilarity` 容器不再给动态/审美分数或同语法结论，旧分数字段为 `null`，旧 schema 2 报告须重跑。时间位置仅描述取样位置，声明的阶段仍未核验；相异哈希/文件大小不能证明运动，合理 hold 不因重复哈希而失败。共享哈希只触发样本复查，不自动判定复制；无共享哈希也不证明原创或版权安全。交付校验保留稀疏产物检查，并继续依赖既有章节/最终视觉验收，不新增强制门。实际复核需观察完整动作起止、转场、hold 与最终编码视频，记录焦点层级、空间连续/视差、节奏/停顿、可读性和与参考差异的时间戳。

## 可复用视觉配方

下面两个 `visualRecipe` 可写入 `shot-manifest.json.steps[].visualRecipe`，并由 `preflight` 校验。

| visualRecipe | 适配 compositionModel | 适用场景 | 核心结构 |
|---|---|---|---|
| `kinetic-prompt-to-product` | `hero-theater` / `dark-preview-stage` / `product-gallery` | AI 产品、工具演示、SaaS 开场、短视频 hook | 大字裁切入场 -> prompt/输入框 -> 产品卡片/UI 面板 -> 结果或 logo 收束 |
| `annotated-flow-diagram` | `motion-graphic-lab` / `relationship-map` / `timeline-stage` | 教程、工程流程、方法论、Agent 工作流、问题拆解 | 标题建立问题 -> 手势/笔触标注 -> 节点框图逐个出现 -> 箭头增长 -> 当前节点高亮 -> 底部字幕同步推进 |
| **`dark-tech-glow`** | `spotlight-stage` / `tech-preview` / `glass-ui-stage` | AI 工具科普、科技产品介绍、开发者视频、知识干货短视频 | 深蓝背景光斑 -> 渐变发光标题 -> 毛玻璃卡片入场 -> 三态按钮/步骤指示器 -> VS 对比 -> 代码模拟 -> 金句强调收束 |

模板已经内置可复用 Remotion 组件，生成项目后可直接导入：

```tsx
import {
  AnnotatedFlowDiagramScene,
  KineticPromptToProductScene,
} from "../../video/reference-style-scenes";
```

这些组件不是参考视频的复制品，而是把连续运动语法做成项目内可复用原语：

- `KineticPromptToProductScene`：大字裁切 / prompt 打字 / 产品面板推进 / 结果停稳。
- `AnnotatedFlowDiagramScene`：标题建立 / 节点出现 / 箭头路径增长 / 当前节点圈选高亮 / 结论条停稳。

如果 agent 使用这两个 recipe，默认必须导入这些组件。只有在客户素材或特定业务画面确实无法使用预设组件时，才允许自定义实现；自定义实现必须在章节代码、`shot-manifest.json.motionIntent` 和 `visualStages` 中证明同等连续运动结构，并通过 `preflight`。

## 可复用运动风格

下面两个 `motionStyle` 可写入 `shot-manifest.json.steps[].motionStyle`。

| motionStyle | 动效气质 | 适用内容 | 运动规则 |
|---|---|---|---|
| `prompt-product-kinetic` | 轻、准、短促、产品广告感 | AI 工具、产品 launch、概念到结果 | 大字先以超大比例裁切入场，再缩放归位；打字/游标和复制按钮状态必须对应口播；产品卡片以轻微 3D 倾斜或漂移进入，但结尾要稳定停住 |
| `whiteboard-engineering-flow` | 清晰、教学、工程流程感 | B 站教程、工程解释、Agent 流程、代码方法论 | 框图节点按口播顺序出现；箭头用路径增长；当前节点用色块/描边高亮；手写笔/手势只用于引导注意，不盖住字幕和关键节点 |
| **`dark-tech-spotlight`** | 克制、高级、科技感、统一入场节奏 | AI 工具科普、开发者干货、技术评测、知识短视频 | 所有元素使用统一入场：translateY(+20→0) + opacity(0→1) + scale(0.95→1.0)；多元素错开 100ms；激活态用绿色、普通态白色、禁用态灰色；金句直接放大 ×2；背景始终是深蓝渐变 + 光斑 + 噪点 |

## `kinetic-prompt-to-product` 动画拆解

适合 3 到 8 秒的开场或章节锚点。

时间结构：

1. 0% 到 20%：超大关键词或短句从画幅边缘裁切进入，建立注意力。文字只允许短标题，不复述字幕整句。
2. 20% 到 40%：标题缩小归位或被替换为 prompt 输入框；可使用打字游标、选择高亮、复制按钮状态。
3. 40% 到 75%：产品卡片、聊天卡、看板或输出面板进入，主体占 55% 到 75%。
4. 75% 到 100%：结果状态稳定，保留 400 到 800ms 可读停留，可收束到 logo / 结论 / CTA。

实现要求：

- 用 `frame`、`interpolate()`、`spring()`、`Easing` 或 `src/video/motion.ts` 控制，不使用 CSS animation / transition。
- 文字动画只能服务“关键词被想到、输入、生成、复制、转化”的语义。
- 背景优先软渐变、纸感或浅色空气感；不能让背景光效成为主体。
- 如果开启字幕，画面文本只保留 prompt 片段、按钮、短标签、产品状态，不写完整口播句。
- UI 卡片必须有真实状态差异：头像、输入、输出、看板列、任务卡、按钮状态、进度状态至少一种。

反模式：

- 一整句字幕放成大标题。
- 只有大字缩放，没有 prompt / product / output 的状态推进。
- 产品卡片只是空白圆角矩形。
- 复制参考视频中的品牌名、logo 或原文案。

## `annotated-flow-diagram` 动画拆解

适合教程、方法论、工程流程和长视频解释。

时间结构：

1. 0% 到 15%：建立标题和问题，不急着塞满全屏。
2. 15% 到 35%：第一个节点出现；可用手写笔/手势/圈选引导视线。
3. 35% 到 70%：后续节点按口播顺序逐个出现，箭头路径增长，当前节点高亮，过去节点降噪。
4. 70% 到 90%：结论条或关键提示条出现，强调“这一步为什么重要”。
5. 90% 到 100%：保留 300 到 800ms 可读停留，字幕同步切到下一 cue 前不要抢切。

实现要求：

- 白底或浅底优先；节点框、箭头、底部字幕条要有明确层级。
- 每个节点最多 1 到 2 行短标签；解释性交给口播和字幕。
- 箭头增长必须表示“从哪个节点流向哪个节点”，不能随机画线。
- 手写笔/手势是注意力引导层，持续时间短，不得遮挡主要节点超过 800ms。
- 底部字幕条或字幕安全区必须预留；竖屏改为纵向流程，不压缩横屏大表。

反模式：

- 一次性把所有节点全放出来，只有整体淡入。
- 手写/手势只是装饰，和当前口播无关。
- 箭头方向与口播顺序不一致。
- 节点文字复述字幕整句。

## 何时选择哪一个

- 用户要产品、AI 工具、SaaS、短视频开场、概念变产品：优先 `kinetic-prompt-to-product` + `prompt-product-kinetic`。
- 用户要教程、工程流程、Agent 工作流、方法论拆解：优先 `annotated-flow-diagram` + `whiteboard-engineering-flow`。
- 数据明确时，不要强套这两个模式；优先 `nyt-graph-reveal`、`metric-race-strip` 或关系图。
- 竖屏抖音可以使用这两个模式，但必须重排为单列大主体：标题/主视觉/字幕安全区三段清楚，`mobileReadability` 必须通过。

## `dark-tech-glow` 动画拆解

适合 40 到 90 秒的 AI 工具科普、技术评测、开发者知识短视频。

时间结构：

1. 0% 到 15%：深蓝光斑背景建立 + 渐变发光标题（紫→蓝）逐字飞入，建立"这是一个科技工具"的调性。
2. 15% 到 35%：毛玻璃卡片逐个入场（错开 100ms），展示核心概念或三态按钮（禁用/普通/激活）。
3. 35% 到 60%：步骤指示器、VS 对比布局、浏览器地址栏模拟、代码编辑器框按口播顺序推进。
4. 60% 到 85%：关键数据或特性展示，可用圆形徽标、特性清单。
5. 85% 到 100%：超大金句强调（字号 ×2）收束，保留 600ms 可读停留。

实现要求：

- 所有元素统一入场：`translateY(+20px → 0) + opacity(0 → 1) + scale(0.95 → 1.0)`，时长 400~600ms，`ease-out-cubic`。
- 严格四色系统：深蓝背景 + 紫蓝渐变标题 + 绿色激活态 + 白色/灰色正文。
- 三态按钮必须有视觉差：禁用 = 暗灰边框 + 低透明度 + 灰图标；普通 = 亮白边框 + 白图标；激活 = 绿色实底 + 白图标。
- 步骤指示器：圆形数字 + 连接线进度填充，从左向右。
- VS 对比布局：左侧暗弱（旧方式），右侧亮清单（新方式），中间 vs 文字单独淡入。
- 代码框：深色编辑器底色 + 语法高亮色 + 打字机逐字效果。
- 金句强调：直接放大 ×2，居中纯白粗体，不加任何装饰。
- 背景统一：深蓝渐变 + 径向柔和光斑 + 全屏细微噪点；背景光效永远不能成为主体。

反模式：

- 同屏出现超过 3 种以上主色。
- 元素入场节奏混乱（有的快 200ms、有的慢 1000ms）。
- 激活态和普通态没有明确视觉区分。
- 金句加了多余装饰（渐变、外发光、背景块）。
- 背景动效太强，抢了主体注意力。

## 竖屏适配结论

适合竖屏，但不能把横屏构图等比压窄。竖屏项目必须执行下面的重排：

- `kinetic-prompt-to-product`：上方短 hook，中段 prompt / 产品卡片纵向堆叠，底部留出字幕和平台 UI 安全区；prompt 文本和按钮状态只能是短标签，不复述字幕整句。
- `annotated-flow-diagram`：横向流程改成单列纵向流程，节点宽度占安全区 70% 以上，箭头从上到下增长，当前节点高亮不能盖住字幕。
- 竖屏字幕默认开启时，主视觉底部至少避开 420px 的字幕 / 平台交互区。
- `shot-manifest.json.mobileReadability` 必须记录：短标签最小 80px，强观点至少 120px，主视觉宽度比例 >= 0.6，高度比例 >= 0.34，安全区使用 >= 0.7。

已验证：模板内置的两个参考场景在 `portrait` 项目中可通过 TypeScript / Remotion bundle，并能抽出竖屏 still；产品动效和白板流程图均按单列大主体显示。

## Shot Manifest 示例

```json
{
  "compositionModel": "hero-theater",
  "visualRecipe": "kinetic-prompt-to-product",
  "motionStyle": "prompt-product-kinetic",
  "motionIntent": "the oversized hook collapses into a prompt field, then the generated product panel slides in as the narration says the idea becomes a usable tool"
}
```

```json
{
  "compositionModel": "motion-graphic-lab",
  "visualRecipe": "annotated-flow-diagram",
  "motionStyle": "whiteboard-engineering-flow",
  "motionIntent": "each workflow node appears when named, arrows grow left to right, and the current failure point is circled by a short hand-drawn annotation"
}
```

```json
{
  "compositionModel": "spotlight-stage",
  "visualRecipe": "dark-tech-glow",
  "motionStyle": "dark-tech-spotlight",
  "motionIntent": "gradient title flies in letter by letter, glass panels enter staggered by 100ms, buttons show disable/normal/active states, step indicator fills left to right, and the final golden sentence enlarges by 2x"
}
```

## 验收清单

- [ ] 已观察连续帧或时间序列，不只看静态关键帧。
- [ ] `motionIntent` 写清“哪个对象在什么时刻为什么动”。
- [ ] 使用参考 recipe 时，已默认导入 `src/video/reference-style-scenes.tsx` 预设；自定义实现必须有同等连续阶段证据。
- [ ] `visualStages` 至少覆盖 4 个运动阶段；不能只有静态构图说明。
- [ ] 入场、主体推进、焦点高亮、可读停留四段完整。
- [ ] 动画与口播顺序一致。
- [ ] 字幕开启时，画面文字没有复述字幕整句。
- [ ] 没有复制参考视频品牌、logo、文案或素材。
- [ ] Remotion 实现是帧驱动的，不使用 CSS animation / transition。
