---
name: web-video-presentation
description: 把文章、口播、产品流程、机制或参考动效制作成帧确定性的 Remotion 视频；支持横竖屏、多种内容风格、TTS/字幕、透明 Alpha 素材、实拍动态图形，以及生图/非生图两路封面。适用于制作或修改视频项目，不把交互网页或未验收的预览当成最终视频。
---
> **离线公开整理候选 / publication review only:** 60 风格源码保留；第三方研究抽帧与转写未附；精选自生成示例见仓库 media 目录。原创代码 MIT 范围已获用户确认；第三方与媒体另按各自许可。当前测试与缺口见 [仓库发布说明（在线）](https://github.com/LTX2022/video-creation-skill/blob/main/README.md)。历史记录不等于本次验收。


# Web Video Presentation

以内容解释和可验证交付为目标，不以某一种外观为目标。保留原有流程元素、产品演示、数据叙事、口播教学等能力；机制解释、Alpha 与实拍前景是新增选择，不把所有内容改成等距机器或通用素材包。

版本读 `VERSION` / `VERSION.json`。更新包不等于安装；未经要求不改个人 skills、设置、密钥或账户。

## 0. 独立项目位置与工具检查

完整视频的新项目先取得客户指定的独立空白目录，按 [WORKSPACE-SETUP](references/WORKSPACE-SETUP.md) 检查后初始化；不要直接在当前聊天目录、桌面或已有工程撒文件。继续旧项目走 resume 检查，不重新脚手架覆盖。缺少插件/工具时先列用途、来源、安装目标与权限；得到相应授权后才安装到指定位置。无法便携安装的工具说明限制，不悄改全局环境。未指定项目位置时，研究和方案可继续，项目写入等待位置明确。

## 1. 先确定意图，复用已知选择

复用材料/项目里已知参数，只询问影响结果的缺项；需求明确时按现有信息与授权直接执行对应路线，不重复询问任务类型，不为填表补一轮确认。必要的权限、素材或关键产物信息缺失才询问，既有真实批准门禁仍适用。

### 统一任务入口：先看要什么，不强制整片

- **整条视频**：走主项目的内容、分镜、配音/字幕（按需）、预览、渲染和交付链。
- **单镜头**：只制作所需镜头；有素材按其真实使用权选择局部动画/合成，无素材则从零设计。不强制扩成章节视频。
- **单元素 / 用户素材动画**：先按 [ASSET-MOTION-DIRECTION](references/ASSET-MOTION-DIRECTION.md) 真实查看图像/视频、记录观察与不确定性，由用户意图和可见结构选择动作，不限对象类别。再读 [LOCAL-ELEMENT-ROUTE](references/LOCAL-ELEMENT-ROUTE.md)，使用通用二维分层 rig / 整图动作和实际 Alpha/底片合成；单图需局部动作时先实际制作分层或核实可用模型，不能虚称自动识别/绑定；不以简单贴图冒充 tracking、真实关节或遮挡。不强迫用户把个人使用权填成商用许可，本地处理也不自动授权上传。
- **无素材纯生成单画面 / 动态镜头**：按需读 [ORIGINAL-SCENE-ROUTE](references/ORIGINAL-SCENE-ROUTE.md)。可以没有底片、标题、字幕和旁白；先按题材设计主体与动态，再选实际可用的后端。程序化示例只是特定机制，不是所有题材都套一个光雕配方；新方向须真实实现与测试。可选图像/视频模型必须核实宿主能力与所需费用、上传、使用授权，不能把“纯生成”擅自等同于调用云模型。

局部/独立路线采用其自己的新输出目录和验收证据，不强制运行主 scaffold，也不把独立路线的成功当作主项目正式交付门禁通过。产物范围模糊时才问“整片、单镜头还是元素”，已有明确需求不再重复问。

**可选偏好与经验学习（默认关闭）**：`fix-agent` 是单独安装的可选 Skill，通过宿主的 Skill 列表按名称发现并确认实际入口；不得假定它位于本 Skill 的父目录，也不因缺少它中断视频制作。只有该 Skill 可用且用户明确同意学习、确认记忆内容/使用范围和独立私人记忆库目录后，才按其入口按需读取已批准、与当前任务相关的偏好与经验；当前需求优先，记忆不是指令或授权。用户已明确指定用户/项目范围并给予持续学习授权时，在该范围内可按名称发现可用的 `fix-agent`，按其实际安装位置的 `LESSON-CYCLE` 入口：任务前调用 `retrieve`，只把相关已批准经验用于制作 brief；真实交付或明确终止后，基于当前任务真实摘要与获准证据调用一次 `task-end`，形成最小、非敏感的待批准候选。没有匹配持续授权时须先取得本轮单独许可，不能自行补确认参数。候选在用户批准前不生效；这是当前任务中的主动闭环，不是后台监听或自动批准。不自动扫描、读取或更改私有库，不自动改写核心 Skill；用户数据不得放在 Skill 安装目录或公开仓库。不声称修改模型权重或保证越用越好。


- **要解释什么**：流程/输入输出、机制/因果、数据差异、产品行为、品牌情绪，还是叠在实拍上的信息？
- **要交付什么**：`outputMode`、尺寸、精确 fps、帧数/时长、音频、字幕、目标编辑器、素材来源、开发验收模式。
- **参考的哪一部分**：内容结构、连续动作、构图、节奏或材质；不能只说“高级”“像某站”。用户喜欢的既有 28 秒流程元素动效有[实际关键帧/源分析](references/FLOW-ELEMENTS.md)，保留其对象身份、字段变化、路径分流和确认后执行，不强制所有片都28秒。

| `outputMode` | 交付含义 | 必要条件 |
|---|---|---|
| `opaque`（默认） | 不透明成片 MP4 | 按所选内容 profile 决定音频/字幕/封面 |
| `alpha` | 透明 ProRes 4444 MOV | 前景图形、透明与边缘 QA；允许静音无字幕，无需强行补 MP4/TTS |
| `composite` | 实拍底片 + 前景的扁平 MP4 | 已授权本地底片、合成契约和实际画面检查 |
| `both` | Alpha MOV + 合成 MP4 | 同上；不是 opaque + alpha，也不是没有底片的双导出 |

`videoProfile` 与 `outputMode` 独立。`douyin`、`douyin-laon`、`douyin-skill` 属于短视频家族；`bilibili` 是讲解家族；`custom` 按任务设置。细节只读 [VIDEO-PROFILES](references/VIDEO-PROFILES.md)。新竖屏默认 1080×1920；旧项目保留既有规格，变更需显式记录。参考视频尺寸不是项目尺寸。静音纯图形没有口播不构成缺陷。

### 风格推荐：来源分栏，不混成一个清单

每次推荐固定展示 **系统内置风格** 与 **用户自建风格** 两栏。先将 `SKILL` 设为已确认的 Skill 安装绝对路径，运行 `node "$SKILL/scripts/style-recommendations.mjs" --query="题材" --limit=3`；只有用户已明确授权的个人库才追加 `--library-root=/approved/my-styles`，不得扫描 home、全局 skills 或猜默认库路径。

内置栏仅列随 Skill 发布的主题；用户栏仅列该个人库实际保存的包，不把新建/参考衍生的个人包计入内置。每项给出名称、ID、来源、用途和实际匹配依据；用户项另给版本、包路径、draft/记录的审阅状态。没有用途元数据写“用途未填写”，不要推断已获用户认可。未知目录写“尚未读取个人库”，空库、缺失/不可读/无匹配分别说明，不能用内置项填充用户栏或编造个人偏好。

用户说“查看我的所有风格 / 展开自建风格”时，用同一入口 `--all --library-root=/approved/my-styles`（不用 `--limit`），完整呈现用户栏每个 ID 的名称、用途、所有版本和状态；可按 ID 归组但不合并同名不同 ID，不暗中只显示最新版。没有已授权目录先询问位置，内置建议可继续。细节见 [风格目录](references/THEMES.md) 与 [自建风格](references/CUSTOM-STYLES.md)。

## 2. 设计契约：意图 → 对象 → 状态 → 因果/读数 → 镜头 → 帧

先用一句 `claim` 写出观众应理解的命题，再为每个镜头指定：

1. **对象与证据**：可见对象对应什么，事实/素材来自哪里，是真实机制、简化模型还是隐喻。
2. **关系与操作**：先选数量、顺序、空间、状态或因果；让同一对象实际发生变化，必要时用基线/反例区分结果。
3. **结果与读数**：用什么可见差异证明结果；数字、标签、形态从同一状态产生，不各演各的。
4. **镜头与注意力**：辨认对象，再看作用和结果；镜头揭示关系，必要标签/单位/字幕保留，面积占比不等于动态主导。
5. **确定时间**：`frame / fps → authored events → model state → pose/readout → image`。任意帧可独立重现；不依赖 hover、滚动、RAF 墙钟、定时器、渲染访问顺序或未固定的随机数。

**内容文字与制作指令分开**：`claim`、镜头/动作说明和制作要求不自动变成上屏文字。只展示内容需要且已选定的文字；不自动加 slogan、重复副标题或解释性小标签，能由版式说明的关系让版式说明。必要字幕、单位、术语与限定条件保留；不为“简洁”删事实。

连续对象不因 narration step 换页；动作依次/并行/错峰/hold 绑定同一 timing。普通流程与品牌情绪无需伪造机械因果。模型复杂时读 [MECHANISM-DESIGN](references/MECHANISM-DESIGN.md)，选设计家族读 [MOTION-CASEBOOK](references/MOTION-CASEBOOK.md)，网页参考转视频读 [WEB-TO-VIDEO](references/WEB-TO-VIDEO.md)。不要把三份全当每章必读。

多场景、连续变形或材质切换时，按需读 [MOTION-DIRECTION](references/MOTION-DIRECTION.md)，把既有镜头约束压缩到一份可检查契约，不重复重写分镜。先检验关键静帧，再补连续动作；只读结构检查不等于审美或用户验收。简单修改不强制新增契约。

## 3. 制作与确认

1. **准备**：保留用户原文/原素材；记录来源和使用权。依赖不明时读 [DEPENDENCIES](references/DEPENDENCIES.md)。只执行已获授权的依赖安装、外部调用与渲染。
2. **规划**：有口播时完成 `script.md`；静音时写视觉节拍而非虚构口播。按 [OUTLINE-FORMAT](references/OUTLINE-FORMAT.md) 写 `outline.md`、`shot-manifest.json` 与用户可读的 `shot-design.md`。原文提供事实细节，口播决定语言节拍，不把全文搬上屏。
3. **确认全片设计**：展示内容、输出规格、素材策略与关键镜头，记录用户实际确认。已有等价明确确认可复用；没展示过的设计不能用一句“继续”代替确认。[SHOT-DESIGN-REVIEW](references/SHOT-DESIGN-REVIEW.md) 定义确认门。
4. **首章/代表镜头锚点**：先实现能证明风格与困难技术成立的一段，实际渲染后请用户验收。多章项目首章通过再展开；单段素材不凭空增加章节。默认逐章验收；用户可选择顺序批量或独立章节并行，不自动升级授权。
5. **实现**：读一次 [CHAPTER-CRAFT](references/CHAPTER-CRAFT.md)，每章只回看相关章节资料、当前主题和验收问题。`narrations.ts` 是章节 step 数及有声文本源；保持 registry、outline、shot manifest、音频索引同步。无声模式用 `timingMode: explicit` 与 `stepTimings` 保留精确帧时长（见 RENDERING），不制造假音频。
6. **音频/字幕（按需）**：先区分无音频、TTS、用户提供的逐段旁白。按 [AUDIO](references/AUDIO.md) 核对真实本地文件/来源/时长；只有 TTS 才读 [TTS-ROUTING](references/TTS-ROUTING.md) 并选择 provider+voice，不能悄换收费后端或覆盖用户录音。整条长录音不能假装已自动分段对齐。字幕由同一 timing/cue 源生成；未请求就不强加。
7. **验证并交付**：先看只读 `npm run workflow:status`，再按 [QUALITY-GATE](references/QUALITY-GATE.md) 与 [RENDERING](references/RENDERING.md) 运行适用测试，人工查看运动和最终编码文件。真实结果决定 draft/verified/failed，不用退出码或状态布尔值伪造验收。结项附本轮已记录的耗时摘要和缺口，不把诊断建议当成自动改动授权。反馈见 [FEEDBACK-EVIDENCE](references/FEEDBACK-EVIDENCE.md)，交付见 [DELIVERY](DELIVERY.md)。

字幕启用时确认其预览；最终渲染批准、首章及全片分镜确认仍要有真实用户证据。草稿允许先研究/烟测，但 `--acknowledge-draft` 不是跳过最终确认的许可。新增/删改章节或实质改变内容/输出范围时，只重新确认受影响设计。

## 4. 专项路由

| 当前任务 | 读取 |
|---|---|
| 单元素、用户素材局部动画或已有素材的单镜头 | [LOCAL-ELEMENT-ROUTE](references/LOCAL-ELEMENT-ROUTE.md)：真实素材权利、本地处理与输出范围，不自动升级为整片任务 |
| 无素材原创单画面或动态镜头 | [ORIGINAL-SCENE-ROUTE](references/ORIGINAL-SCENE-ROUTE.md)：按题材选择可用后端，程序化示例不代表全题材覆盖，模型另核能力与授权 |
| 用户选择首页的 15 秒产品流程入门任务，或明确要求按首次视频指南执行 | [FIRST-VIDEO-AGENT](references/FIRST-VIDEO-AGENT.md)：按需读取；Agent 负责工程命令，保留实际授权与确认门，不将本例的时长、风格或静音设置强加给其他任务 |
| 产品宣传片需要真实 UI 镜头编排或镜头配方定位 | [PRODUCT-PROMO](references/PRODUCT-PROMO.md)：按需镜头证据、UI 切片、可选节拍回测；复用既有分镜/时序/确认，不替换60风格 |
| 用户选择同模板低成本批量填充 | [LOW-COST-BATCH](references/LOW-COST-BATCH.md)：先批准真实代表样片，再冻结指定本地设计文件与字段边界；只读输入预检不是自动 renderer 或画质保证，旧项目无需补合同 |
| 用户选择低成本/弱模型执行，且已有固定片头模板批量场景 | [LOW-CONTEXT-EXECUTION](references/LOW-CONTEXT-EXECUTION.md)：与 LOW-COST-BATCH 配套，仅固定片头草稿路径；不强加给普通视频任务，不宣称任意视频已支持 |
| 代码动态视频的文案与画面共写 | [VISUAL-SCRIPT](references/VISUAL-SCRIPT.md)：事实→对象动作证据→补充旁白→最小标签；[单任务卡](templates/script-templates/visual-script-task.md)与[4份前后稿](examples/visual-script/README.md)，不默认加载研究全文 |
| 原文改口播 | [SCRIPT-STYLE](references/SCRIPT-STYLE.md)，不读 TTS 细节直到合成 |
| 尺寸/帧率/平台安全区 | [FORMATS](references/FORMATS.md) |
| Alpha、亮暗边、导入编辑器 | [ALPHA-COMPOSITING](references/ALPHA-COMPOSITING.md) |
| 本地实拍、跟踪或遮挡需求 | [LIVE-ACTION-OVERLAYS](references/LIVE-ACTION-OVERLAYS.md)，另按需查 [VIDEO-ASSETS](references/VIDEO-ASSETS.md) |
| 用户提供视频/网站参考，要求学习动态设计、创建可复用新风格或命名保存版本 | [CUSTOM-STYLES](references/CUSTOM-STYLES.md)：60 套是起点；先核验实际可见时间序列和授权，原创实现专属 Scene，给出可播放小样并由用户确认；显式目录保存命名版本。不可访问的参考不冒称已分析，无法渲染只保存 draft，不自动抓取/绕访问限制或改写原60套 |
| 使用新增参考衍生风格 | [REFERENCE-STYLES](references/REFERENCE-STYLES.md)：四类保留场景的适用题材、真实入口、修改点与Alpha边界，不叫统一“Claude风格” |
| 原有预制风格精确查询/使用/切换（推荐先走上方双栏入口） | 先将 `SKILL` 设为已确认的 Skill 安装绝对路径（不是项目目录），再运行 `node "$SKILL/scripts/theme-summary.mjs" --query="题材" --limit=3`；已选只读该 `theme.json` 与当前 family；[风格使用与验收](references/PRESET-REBUILD.md) / [主题契约](references/THEMES.md)。不要把 56 套全部加载进每章上下文，也不把 SVG 检查替代浏览器验收 |
| 查看本轮实际离线代码样片与可复跑源码 | [CPU 设计试片](examples/cinematic-cpu-trial/README.md)：已编码 26 秒 1080p30 静音样片；独立 Python 渲染器，不替代 Remotion、Alpha 或客户验收 |
| 查看语义连续、条件分流与中间帧检验的真实中文小样 | [缓存边界示例](examples/semantic-cache-study/README.md)：14秒静音代码片与复跑源码；独立机制示意，不是第61个已验收风格 |
| 需要连续粒子形变与空间相机原型 | [独立数学示例](examples/cinematic-primitives/README.md)：模型契约已测，Remotion 适配未渲染；不等于成片质量与工作流验收 |
| 同对象跨场景承接、事件动作重定时、可选真实时间采样模糊 | [OBJECT-HANDOFF](references/OBJECT-HANDOFF.md)：先跑无依赖探针；对象轨复用现有章时钟，不新建时轴；Canvas模糊可明确降级，DOM/SVG默认保持清晰 |
| 连续变形、同主体换材质、支点与有机动作 | [MOTION-CRAFT](references/MOTION-CRAFT.md)；按需使用 `src/video/mechanisms/`，不改全部主题。来源见 [研究取舍](references/UPSTREAM-MOTION-SOURCES.md) |
| 需要具体运动配方 | [MOTION-PATTERN-LIBRARY](references/MOTION-PATTERN-LIBRARY.md)，再选一项 [技法索引](references/jitter-motion-techniques/README.md) |
| 参考视频拆解 | [REFERENCE-VIDEO-STYLES](references/REFERENCE-VIDEO-STYLES.md)，观察连续帧而不只抽静态封面 |
| 封面 | [COVER-WORKFLOW](references/COVER-WORKFLOW.md)：模型生成 / 代码排版或已授权素材，两路平级；按项目要求使用 |
| 用户要求美术精修、参考级完成度或画面确有设计问题 | [ART-DIRECTION-REVIEW](references/ART-DIRECTION-REVIEW.md)：按需分项审图，普通任务默认最多 2 轮、每轮优先 3 个问题；复用既有契约与 QA，不无限自评至“完美” |
| 用户授权当前任务小步对照实验 | 按名称发现可选 `fix-agent` 的 TASK-PROBE；固定同任务基线与上下文，使用只读 task_probe 对比真实检查产物，组合后重新检查；不自动渲染、改核心、建记忆或复制上轮批准 |
| 用户明确同意保存偏好或复用经验 | 按名称发现单独安装的可选 `fix-agent`，按其实际入口执行 opt-in 学习；先确认独立记忆库与范围，仅用已批准记录，当前任务优先，结项生成待批准候选。不可用或未授权则跳过，不影响视频制作 |
| 结项耗时摘要 / 深度复盘 | [FIX-AGENT-INTEGRATION](references/FIX-AGENT-INTEGRATION.md)：本地确定性摘要默认接入，完整 fix-agent 仅按需加载，不自动修复 |
| 核对参考资料是否真的变成风格/功能 | [REFERENCE-INTEGRATION-STATUS](references/REFERENCE-INTEGRATION-STATUS.md)，区别方法、原型、完整预设与未实现项 |
| 吸收外部 skill / Lottie 或 AE 需求 | [REFERENCE-ADOPTION](references/REFERENCE-ADOPTION.md)：核对实际能力和许可，不整仓加载，不把风格当格式能力 |
| 跨机器交接/性能 | [TRANSFER](references/TRANSFER.md) / [PERFORMANCE](PERFORMANCE.md) |

历史计划/事故仅供追溯，不在必读链。文档与代码冲突先验证；不把未实现写成通过。最小读集和变更影响见 [PERFORMANCE](PERFORMANCE.md)。

## 5. 不可用文案掩盖的边界

- 流程卡片、机制模型、数据图形、动感排版、实拍 overlay 都是可选家族；不因研究 Anatomy 就统一成等距机械。
- 透明根背景与内容层分开；不全局删除卡片、填充、阴影、模糊来“造透明”。
- `ffprobe` 的 `yuva` 只证明编码能力，不证明透明像素、边缘或目标编辑器通过。
- 没有实拍只可称“合成测试板”；屏幕固定注释不叫跟踪，手工轨迹不叫自动 tracking。遮挡需要实际 matte/分层实现。
- 源尺寸/fps 可经明确 crop/contain/cover 和复帧/丢帧适配；不把所有素材改成 60fps，不默认光流插帧。
- 不把技术检测、参考相似度分数、一次平台事故或未经复核的样本统计说成视觉质量、版权或平台审核保证。

