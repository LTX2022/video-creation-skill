# 从视频 / 网站学习并保存新风格

60 个内置风格是起点，不是上限。这里的“新风格”包含可执行对象、构图、镜头、运动、连续形变、转场和节奏；不是提取色板，也不是给旧卡片改名。Agent 负责研究与实现；本地脚本负责验证包结构、命名版本保存与接入新项目，**不声称自动理解 URL、自动下载视频或自动复制任意网页效果**。

## Agent 入口与范围

用户说“学习这个视频/网站”“保存为我的风格”“以后沿用这种动态设计”时，走本页。复用已知偏好，只补来源、允许研究的范围、新风格名、独立研究/项目目录和个人风格库位置等必要信息。已获授权的工程内研究可继续；不得把用户的参考链接当作下载、登录、付费、全局安装、发布或挪用素材的授权。

个人风格默认保存在**用户指定的独立目录**，不写安装目录、全局 skills、账户或设置。不将个人新风格加入内置 60 项清单。目录保存不是远端备份；换机器需带走整个包。

## 1. 看真实时间序列，而不是猜一张图

先记录出处、作者、访问日期、本次实际可访问范围、版权/隐私约束和证据方式。明确区分：文字介绍、源码、截图、连续播放、音频听审。无法播放就说明不能判断实际节奏/运镜；源码和截图可供部分研究，不得声称“看完/学会”。

- **视频**：先核验真实文件或可播放来源、总时长、尺寸/fps；完整正常速度观看选定段落，建镜头区间。按变化采样而非只等间隔截图：开场、动作前、启动、关键中间态、加减速、转场前/中/后、结果 hold。每条记时间戳/帧索引和本地证据路径。重点动作细采样并回看连续片段；截图时间不是自动切点。若有口播/音乐驱动节奏，听审后才能写音画关系；未听则标未知。
- **网站**：记录 URL、viewport、滚动位置、路由、登录/加载状态、触发动作及 reduced-motion 状态。在获准访问范围内观察加载→hover/click/scroll→稳定→退出/重入，必要时录屏。检查连续滚动、反向滚动、重复触发/取消，区分一次播放、循环、弹簧和交互响应；不能从首页静图猜后续效果。不抓取私密页面/埋点/凭据、不绕登录或付费墙。
- 优先 1–3 个相关片段，缺证据就缩小结论或请求可播放文件/录屏。别批量搜集一堆只看标题的参考。

复用 [视频分析](REFERENCE-VIDEO-STYLES.md)、[网页转视频](WEB-TO-VIDEO.md)、[素材权限与采用](REFERENCE-ADOPTION.md)，无需每次全读研究库。

## 2. 分析 → 可执行设计契约

在风格包 `analysis.md` 写逐镜表，至少包括：

| 时间/状态与证据 | 对象身份与构图 | 动作、相机和变形 | 节奏与转场 | 事实边界 / 原创迁移 |
|---|---|---|---|---|
| 源片 t0–t1 或网页触发→状态；截图/录屏定位 | stable objectId；归一化位置/尺度、层级、遮挡、必要文本 | 起点→关键中间态→终点；路径、旋转/材质；camera 与主体分开 | 起始、时长、先后/并行/错峰、速度变化、easing 候选、hold、退出 | 亲眼观察 / 推断 / 拟实现；未知内容不补故事 |

提炼可复用规律：构图与字层/色彩角色、对象动作的解释目的、镜头焦点、形变拓扑与身份、进入/承接/退出、段间节奏、阅读停留、适用/不适用场景。比如“汇流用于归纳”比“高级流动感”可执行。easing 无法测定就标近似并做对照，不声称还原了原公式。不得把不相关的同色图形当同对象连续形变。

将网页 trigger/scroll 映射到导演事件与固定 `frame / fps`，移除无限循环、导航等待、墙钟/RAF依赖。共享同一章节时钟，支持随机 seek；随机过程固定 seed。同一主体从上一状态继续，转场不是遮挡一次偷偷换对象。可以复用现有运动工具，但**实际 Scene 必须落实新的可见规则**；JSON 文案不驱动运动。

## 3. 先代表镜头，再入库

1. 给用户看研究结论与边界、拟借鉴/舍弃的规则、原创迁移、参考来源和代表镜头方案；复用已有明确设计确认。
2. 在获准的独立项目实现 `src/Scene.tsx`。代表镜头通常约 10–30 秒，以覆盖困难动作与转场为准，不强制固定时长。先做关键构图，再做连续运动；先不扩整片。
3. 跑类型/逻辑测试与实际 Remotion 渲染。观察开中末、转场前中后、原尺寸/小屏、连续播放，检查遮挡/可读性、速度/hold、对象一致性、断裂/闪烁、随机 seek；如需横竖屏、字幕、Alpha，逐项测，不宣称自动兼容。
4. 每问题记录“时间/对象/现象→最小修改→复验”。技术退出 0、SSR、哈希或不同帧不能证明视觉质量；用户接受也不能代替编码/透明检查。
5. 交付**可播放小样**及具体改动，请用户确认可复用方向。只有真实渲染+看过后才标 `render-reviewed`；真实用户确认另记证据，绝不由脚本自动批准。无法渲染只保存 `draft` 草案，明确没有完成可播放样片验收。

证据里写明实际渲染器、文件/哈希、关键时间与观察、未测项和用户反馈。完整验收继续遵循 [QUALITY-GATE](QUALITY-GATE.md) 和 [FEEDBACK-EVIDENCE](FEEDBACK-EVIDENCE.md)。

## 4. 真实可移植风格包

```text
my-style/
  style.json        # ID/中文名/版本/来源与设计规则/3段叙事和镜头元数据
  preset.json       # ThemePresetSpec；ID 必须相同
  tokens.css        # 语义颜色、字体回退、材质角色
  analysis.md       # 时间序列研究、迁移理由、局限、样片与验收证据
  src/Scene.tsx     # export function Scene(props: PresetSceneProps)
  src/...           # 原创辅助模型/CSS等，使用相对导入
```

`Scene` 接收 `frame,durationInFrames,fps,width,height,chapterStepTimings,isOverlay,subtitleVisible,content`（按需使用），类型可从 `../../presets/types` 导入。它是**实际生产与 probe 共用的组件入口**，不是静态截图。宽高与时间由项目给定，不由参考强行覆盖。内容可通过 props.content 或项目章节配置改；不得把参考品牌/文案写死成用户内容。包内 CSS/资产需由组件真正引用；需要 public URL 的资产必须另按项目资产流程登记，不能假称自动部署。

`preset.json` 完整结构见 `templates/src/video/presets/types.ts`。`family` 用既有合法分类帮助工具理解，但实际画面走专属 Scene，不落回旧 family 卡片；`id` 与 `variant` 使用新标识。基础 theme 仅用于建立原有脚手架，随后以新包 tokens 与独立组件替换；不等于“新风格只能换色”。

`style.json` 必须含：

- `schema: 1`、唯一小写连字符 `id`（不撞内置 ID）、`name`、正整数 `version`、已存在的 `baseTheme`。
- `status: "draft" | "render-reviewed"`。后者需 `reviewEvidence` 对象：`artifact` 实际样片位置、`sha256`（64位小写十六进制）、`renderer` 所用渲染器、`observed` 看过的帧/片段、`limitations` 剩余缺口；脚本只检查记录存在，不能替人审片。
- `references`: `{kind, source, observed, rights, limitations}` 数组；不复制未授权第三方视频/字体/图像到包里。可存 URL 与观察记录；需跨机器携带的原创或授权资产要保留许可。
- `design`: `composition,color,camera,motion,morph,transitions,rhythm` 七个具体字符串。某项不适用就写原因，不能空着，更不能虚构看见了。
- `narrations`: 3 个字符串，静音可为 `['','','']`；与现有示例的三段时序契约一致。不是强制所有成片只能三个镜头，后续章节仍走原流程。
- `shots`: 3 个对象，各含 `compositionModel,visualRecipe,motionStyle,motionTechnique,motionIntent,visualStages: string[],onScreenText: string[]`。这些描述必须与实际 Scene 对应；可用枚举见现有 shot-plan/registry 契约，不能随便发明标签绕验证。

首次作者可参考 `scripts/test-custom-style.mjs` 中的完整**合成测试包**结构（稳定主体移动+圆角连续形变），但它不是任何用户参考的学习成果、不是审美已验收风格，不应原样包装为“新学会的参考效果”。

## 5. 保存、调用、修改：Agent 执行命令

以下都是显式本地目录，不访问网络、不安装依赖、不启动浏览器、不修改原60套；按用户授权替换路径。先将 `SKILL_ROOT` 设为实际安装的 `web-video-presentation` **绝对目录**；不假设当前目录位于 Skill 内。所有命令可从任意工作目录执行。

```bash
SKILL_ROOT="/absolute/path/to/web-video-presentation"
node "$SKILL_ROOT/scripts/custom-style.mjs" validate --package=/approved/work/my-style
node "$SKILL_ROOT/scripts/custom-style.mjs" save --package=/approved/work/my-style --library-root=/approved/my-styles
node "$SKILL_ROOT/scripts/custom-style.mjs" list --library-root=/approved/my-styles
node "$SKILL_ROOT/scripts/custom-style.mjs" scaffold \
  --package=/approved/my-styles/my-style/v1 \
  --project-root=/approved/projects/new-video \
  --profile=custom --format=landscape --fps=30 --subtitles=false
```

`save` 保存完整源码/元数据到 `<library-root>/<id>/v<version>`，不覆盖同名版本；草案明确保留 draft。`scaffold` 先验证包，再调用原 scaffold，只在**新空项目**注册新 preset、专属 Scene、独立 narration/shot plan 和 tokens，并写 `custom-style-lock.json`（ID/version/SHA-256）。新项目携带完整包，不依赖原风格库路径；Studio/生产/实际 probe 都经过相同路由。

需要改名/修订：将已存包复制到获准工作目录，修改 `name`/规则/Scene/研究证据，增加 `version`，重新测试/小样验收，再 `save`。改 ID 是创建新风格，要同步 preset.id；不覆盖历史版本。已有项目保持锁定，不会被库更新悄改。若要升级已有工程，先审查章节和局部改动，**不得重跑 scaffold 覆盖已有项目**；本工具暂不提供自动合并升级。

脚本校验是结构检查，不是代码安全审计或渲染验收。第三方包的 TSX 是可执行代码，依赖、网络、素材路径和自定义代码必须审阅；不要因 validate 成功就运行来历不明代码。仅依赖项目已有包；新增依赖须单独获准并登记。保存前去除私密录屏、临时凭据与无权分发素材。

## 6. 回归与已知边界

```bash
SKILL_ROOT="/absolute/path/to/web-video-presentation"
node --test "$SKILL_ROOT/scripts/test-custom-style.mjs"
# 若已有获准安装的依赖，可加跑完整类型检查 + 实际 React 生产路由/乱序帧/Alpha：
CUSTOM_STYLE_NODE_MODULES=/approved/project/node_modules node --test "$SKILL_ROOT/scripts/test-custom-style.mjs"
```

默认测试覆盖命名版本、拒绝覆盖/符号链接/缺少真实组件和动态规则、从持久包复用横竖项目；可选集成测试检查真实类型与 SSR 动态帧、timing/shot manifest/composition/screen-text 链及生成项目的内置60项回归和独立自定义契约。它们**不等于浏览器视频渲染、参考相似度、用户接受或实际 Alpha 编码通过**。后续正常安装/渲染仍需已有授权，执行原工作流。新风格包目前是“一次新项目选择一个包”；多风格混剪可由 Agent 在项目内显式设计，不能声称自动支持包热插拔。
