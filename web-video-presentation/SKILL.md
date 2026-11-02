---
name: web-video-presentation
description: 把文章、口播、产品流程、机制或参考动效制作成帧确定性的 Remotion 视频；支持横竖屏、多种内容风格、TTS/字幕、透明 Alpha 素材、实拍动态图形，以及生图/非生图两路封面。适用于制作或修改视频项目，不把交互网页或未验收的预览当成最终视频。
---
> **离线公开整理候选 / publication review only:** 60 风格源码保留；第三方研究抽帧与转写未附；精选自生成示例见仓库 media 目录。原创代码 MIT 范围已获用户确认；第三方与媒体另按各自许可。当前测试与缺口见 [仓库发布说明（在线）](https://github.com/LTX2022/video-creation-skill/blob/main/README.md)。历史记录不等于本次验收。


# Web Video Presentation

以内容解释和可验证交付为目标，不以某一种外观为目标。保留原有流程元素、产品演示、数据叙事、口播教学等能力；机制解释、Alpha 与实拍前景是新增选择，不把所有内容改成等距机器或通用素材包。

版本读 `VERSION` / `VERSION.json`。更新包不等于安装；未经要求不改个人 skills、设置、密钥或账户。

## 0. 独立项目位置与工具检查

新项目先取得客户指定的独立空白目录，按 [WORKSPACE-SETUP](references/WORKSPACE-SETUP.md) 检查后初始化；不要直接在当前聊天目录、桌面或已有工程撒文件。继续旧项目走 resume 检查，不重新脚手架覆盖。缺少插件/工具时先列用途、来源、安装目标与权限；得到相应授权后才安装到指定位置。无法便携安装的工具说明限制，不悄改全局环境。未指定项目位置时，研究和方案可继续，项目写入等待位置明确。

## 1. 先确定意图，复用已知选择

复用材料/项目里已知参数，只询问影响结果的缺项；一次给出推荐契约和分镜。

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
| 用户选择首页的 15 秒产品流程入门任务，或明确要求按首次视频指南执行 | [FIRST-VIDEO-AGENT](references/FIRST-VIDEO-AGENT.md)：按需读取；Agent 负责工程命令，保留实际授权与确认门，不将本例的时长、风格或静音设置强加给其他任务 |
| 产品宣传片需要真实 UI 镜头编排或镜头配方定位 | [PRODUCT-PROMO](references/PRODUCT-PROMO.md)：按需镜头证据、UI 切片、可选节拍回测；复用既有分镜/时序/确认，不替换60风格 |
| 用户选择同模板低成本批量填充 | [LOW-COST-BATCH](references/LOW-COST-BATCH.md)：先批准真实代表样片，再冻结指定本地设计文件与字段边界；只读输入预检不是自动 renderer 或画质保证，旧项目无需补合同 |
| 代码动态视频的文案与画面共写 | [VISUAL-SCRIPT](references/VISUAL-SCRIPT.md)：事实→对象动作证据→补充旁白→最小标签；[单任务卡](templates/script-templates/visual-script-task.md)与[4份前后稿](examples/visual-script/README.md)，不默认加载研究全文 |
| 原文改口播 | [SCRIPT-STYLE](references/SCRIPT-STYLE.md)，不读 TTS 细节直到合成 |
| 尺寸/帧率/平台安全区 | [FORMATS](references/FORMATS.md) |
| Alpha、亮暗边、导入编辑器 | [ALPHA-COMPOSITING](references/ALPHA-COMPOSITING.md) |
| 本地实拍、跟踪或遮挡需求 | [LIVE-ACTION-OVERLAYS](references/LIVE-ACTION-OVERLAYS.md)，另按需查 [VIDEO-ASSETS](references/VIDEO-ASSETS.md) |
| 用户提供视频/网站参考，要求学习动态设计、创建可复用新风格或命名保存版本 | [CUSTOM-STYLES](references/CUSTOM-STYLES.md)：60 套是起点；先核验实际可见时间序列和授权，原创实现专属 Scene，给出可播放小样并由用户确认；显式目录保存命名版本。不可访问的参考不冒称已分析，无法渲染只保存 draft，不自动抓取/绕访问限制或改写原60套 |
| 使用新增参考衍生风格 | [REFERENCE-STYLES](references/REFERENCE-STYLES.md)：四类保留场景的适用题材、真实入口、修改点与Alpha边界，不叫统一“Claude风格” |
| 原有预制风格选择/使用/切换 | 先将 `SKILL` 设为已确认的 Skill 安装绝对路径（不是项目目录），再运行 `node "$SKILL/scripts/theme-summary.mjs" --query="题材" --limit=3`；已选只读该 `theme.json` 与当前 family；[风格使用与验收](references/PRESET-REBUILD.md) / [主题契约](references/THEMES.md)。不要把 56 套全部加载进每章上下文，也不把 SVG 检查替代浏览器验收 |
| 查看本轮实际离线代码样片与可复跑源码 | [CPU 设计试片](examples/cinematic-cpu-trial/README.md)：已编码 26 秒 1080p30 静音样片；独立 Python 渲染器，不替代 Remotion、Alpha 或客户验收 |
| 查看语义连续、条件分流与中间帧检验的真实中文小样 | [缓存边界示例](examples/semantic-cache-study/README.md)：14秒静音代码片与复跑源码；独立机制示意，不是第61个已验收风格 |
| 需要连续粒子形变与空间相机原型 | [独立数学示例](examples/cinematic-primitives/README.md)：模型契约已测，Remotion 适配未渲染；不等于成片质量与工作流验收 |
| 同对象跨场景承接、事件动作重定时、可选真实时间采样模糊 | [OBJECT-HANDOFF](references/OBJECT-HANDOFF.md)：先跑无依赖探针；对象轨复用现有章时钟，不新建时轴；Canvas模糊可明确降级，DOM/SVG默认保持清晰 |
| 连续变形、同主体换材质、支点与有机动作 | [MOTION-CRAFT](references/MOTION-CRAFT.md)；按需使用 `src/video/mechanisms/`，不改全部主题。来源见 [研究取舍](references/UPSTREAM-MOTION-SOURCES.md) |
| 需要具体运动配方 | [MOTION-PATTERN-LIBRARY](references/MOTION-PATTERN-LIBRARY.md)，再选一项 [技法索引](references/jitter-motion-techniques/README.md) |
| 参考视频拆解 | [REFERENCE-VIDEO-STYLES](references/REFERENCE-VIDEO-STYLES.md)，观察连续帧而不只抽静态封面 |
| 封面 | [COVER-WORKFLOW](references/COVER-WORKFLOW.md)：模型生成 / 代码排版或已授权素材，两路平级；按项目要求使用 |
| 用户要求美术精修、参考级完成度或画面确有设计问题 | [ART-DIRECTION-REVIEW](references/ART-DIRECTION-REVIEW.md)：按需分项审图，普通任务默认最多 2 轮、每轮优先 3 个问题；复用既有契约与 QA，不无限自评至“完美” |
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

