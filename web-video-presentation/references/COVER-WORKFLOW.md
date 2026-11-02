# 视频封面：图片模型 / 非图片模型双路线

只在用户明确要封面或 `coverRequired=true` 时生产。Alpha-only 不默认附封面，但显式封面要求仍须完成。封面是独立静态交付，不是视频画幅或透明素材的副产品。

## 先设计，再选择实现方式

一个简短 brief 同时服务两条平级路线：内容命题、准确标题、主视觉如何解释命题、受众/使用位置、明确宽高、裁切/安全区、布局和配色。封面表达一个清楚的承诺/判断，而不是堆满视频摘要。标题文字先忠于用户，不擅自改词、去标点、截断或承诺点击率。构图/换行可变，但拼接后的文字必须与标题完全一致。

- `route="imagegen"`：实际图片生成模型输出。可生成完整封面，也可生成主视觉后由代码排字；两者都属于图片模型路线。记录真实本地文件、prompt、provider、model（工具未报告就写 `unknown`）、来源/使用权。**提示词、规划、准备成功不等于出图。** 不把 `model` 名称编成已知，不默认付费调用。
- `route="nonimage"`：原创 SVG/code 构图，或有使用权的本地照片、截图、作品。无需也不得强制调用图片模型。数据、产品 UI、中文排版等需要准确呈现时尤其合适。AI 写代码不等于图片模型生图。

两路均允许作品级设计，不能将非模型路线降格为随便截一帧。已有截图/品牌标识/真实产品证据尽量保留，不交给模型凭空重画。参考图用于确定题材、密度、层次、图文关系，不默认照搬角色/品牌/模板。

## 轻量合同与命令

复制项目内 `cover-brief.example.json` 为 `cover-brief.json` 并改成实际内容。这是原创流程示例，不是通用图标占位。类型定义：`src/video/cover-types.ts`。

核心字段：

- `schema:1`、`route`、`mode`、原样 `title` / 可选 `subtitle`。
- `width/height` 是明确目标像素，不强制 1080×1440；平台当前规格若重要，另查官方资料。旧尺寸只是预设。
- `safeArea:{top,right,bottom,left}`、`layout.title/subtitle/visual` 都用画布像素。标题框 `lines` 是精确文本切分，不许删字，非字符数裁剪。声明的框只做几何检查，**不是实际字形包围盒/OCR/平台裁切证明**。
- `palette`：背景、主字、强调、次字的十六进制颜色；不强制品牌配色/居中/单行。
- `visual.kind="code"` 用有限 SVG shape 数据（局部 0..1000 坐标；不执行任意 HTML/JS）；`description` 说明图形与命题的关系。没有真正设计时停留在计划，不自动换成机器人/金币/箭头。
- `visual.kind="image"` 的 `asset` 需要项目相对路径、`contain|cover` 适配和 provenance。支持可完整解码 PNG/JPEG 作主视觉。完整成品导入仅支持**实际 PNG**，不把 JPEG 改后缀冒充 PNG。

```bash
# 常规：同一组件用已安装 Remotion/browser 渲染，不下载浏览器
npm run cover:generate -- --brief cover-brief.json
npm run cover:validate

# 只准备设计/资产绑定，不声称有新 PNG；不得进入最终交付
npm run cover:generate -- --brief cover-brief.json --prepare-only

# 有已安装 Inkscape 时的可选离线 SVG 渲染，不新增安装
npm run cover:generate -- --brief cover-brief.json --renderer svg-inkscape

# 模型返回完整封面，保留实际源尺寸/原始像素，不重复叠标题
# brief: mode="complete-image", visual.kind="image"
npm run cover:generate -- --brief cover-brief.json --import-complete
```

完整模型封面的 `title` 是应核对的预期文案，不是机器证明图中一定有这些字。导入时宽高必须匹配实际 PNG；需要重新裁切/排版时用 composed，不能悄悄拉伸。`renderer=source-asset-copy` 明确区别于 `remotion-still` / `svg-inkscape`，不冒称浏览器已验证。模型主视觉 + 代码中文排字通常更容易精确修改，但不强制覆盖用户要的完整模型封面。

图片模型分支实际调用可用生图工具；未获调用权限/能力不可用则说明，只交 prompt/brief 时标记未出图。脚本不偷偷调用任何模型/付费服务。所有文件放当前项目内；外部用户素材应先以授权方式复制到项目 `assets/`，再引用。

封面专用 brief 放项目根目录、原始图片放 `assets/`。生成器把可变设计和图片 data URI 写入 `output/cover/cover-props.json`；Remotion 通过 `--props` / `calculateMetadata` 使用它，不再改写 `src/video/cover-metadata.generated.ts`，也不向 `public/cover-assets` 堆放新副本。因此只准备/修改/重做独立封面，不会使已经验收的视频、章节和关键帧失效。**没有排除任何视频 `src/public` 输入的哈希**：共享字体、实际视频源码/素材改变仍必须重新验收；若把封面原图/brief 有意放到这些共享目录，修改它也仍会使视频失效。旧工程已存在的 public 副本不自动删除，以免误删被视频使用的素材。

## 准确证据与两个质量门

`cover-metadata.json` schema 3 记录路线、渲染器、当前生成 attempt、brief/组件/生成器/注册字体文件哈希、实际 input props、真实素材宽高/哈希、最终 PNG 宽高/哈希；模型素材保留 provenance。PNG 结构/CRC、解压上限和**已有 ffmpeg 完整帧解码**防止假头/截断文件冒充成品。没有 ffmpeg 时技术门失败，不用文件名/头部替代解码。输出先写本次唯一临时文件、完整解码后原子替换；渲染器 exit 0 却没输出、输出损坏时不把旧 PNG 算成新结果。

1. **技术门**：明确路线/尺寸、可解码文件、精确 source/output revision、有效安全区/文本框、文件内外一致。重新检查原始素材和 props 内嵌字节；brief、素材、注册字体或组件改变后旧报告/审批失效。所有输入/输出限项目相对路径，拒绝目录穿越、远程 URL、符号链接、硬链接和非普通文件；写入在截断前再次核对已打开文件。面向授权的单用户项目，不宣称是抵御并发恶意文件替换的沙箱。字体 CSS 不接受外部/import；安装字体版本仍属环境，实际渲染结果必须复核。Inkscape 使用其本地字体环境，不承诺与浏览器字形完全一致。
2. **视觉门**：真的打开最终 PNG，并在缩略尺寸检查主标题/中文掉字、层级、裁切、人物/截图真实性、图形语义、可读性、误导承诺。图形是否服务内容比注册表名称重要。技术门通过不自动获得美学批准，OCR 也不替代看图。

看过实际像素以后，才记录审阅身份和具体结论。这是本地审阅声明，不是经过认证的用户验收；agent 检查通过不能写成“用户已批准”。用户否定当前封面时必须撤销当前审阅，不能拿旧的 agent 检查覆盖最新反馈。撤销会保留前一条审阅到 history：

```bash
npm run cover:validate -- --approve-visual --reviewer "审阅人/agent" --review-note "实际检查的文字、裁切、语义和可读性结论"
npm run cover:validate -- --require-visual
# 最新反馈否定当前版本时：
npm run cover:validate -- --revoke-visual --reviewer "用户反馈记录人" --review-note "当前版本被否定的实际原因"
```

普通 `cover:validate` 技术通过可退出 0，但视觉待审时 `report.pass=false`。最终交付仅在技术通过且审批绑定当前 output hash 时 pass；`validate:delivery` 和 `package:delivery` 对 `coverRequired=true`（包括明确要求封面的 alpha 项目）重查当前 brief/source/asset/output，不只信旧 report.pass。未请求封面的项目不增加封面门。

## 旧工程迁移 / 故障处理

开始生成即记录 `cover-attempt.json` 并撤销“当前已完成”状态，之后才检查新 brief/图片。即使换用另一个 brief 时图片缺失、brief 无效或渲染失败，旧 PNG 也仅作为 last-known-good 保留，不能被旧 pass 报告重新当作本次成功；重复 `cover:validate` 不会恢复它。要采用旧设计，显式重新运行旧 brief，然后重做视觉审阅。attempt 只存 ID、状态和已校验的相对 brief 路径，不存任意命令行、环境值或错误原文。旧 schema 3 文件若缺少当前 attempt/props 绑定，也必须重新生成，不自动伪造迁移通过。

`cover:generate`、`cover:validate`、历史 composition id `douyin-cover` 保留；旧 schema 2 报告不冒充可追溯的新证据。旧 flags 需显式 `--legacy-adapter --title "..." --visual "..." --symbol "分屏对比|四步骤|增长图表"`，输出可编辑 `cover-brief.legacy.json`；不从口播截十个字。旧主题/情绪/其他符号不保证同样外观，应迁移到 brief，不悄悄用通用占位。样式不正确做有根据的局部修正；改变用户文案/主题或关键帧截图降级需说明取舍，不盲试固定次数。

只做封面交 PNG、brief 与必要来源/审阅说明，不打完整视频包。普通交付直接使用 `output/cover/cover.png`。`cover:copy` 不在默认路线；只有用户明确要桌面时传 `--desktop-authorized`，默认不覆盖已有文件，禁止 filename 逃逸。自定义位置优先当前任务交付目录，不擅自写桌面。

## 研究参考（机制借鉴，不捆绑第三方模板/品牌资产）

[oh-my-cover-design](https://github.com/hongfamonvAI/oh-my-cover-design)：明确场景/动作/参考图角色，原仓库主要交 prompt，不代表已生图。
[claude-design-card](https://github.com/geekjourneyx/claude-design-card)：内容角色与格式驱动 HTML/截图，未采纳其固定风格和静默视作确认。
[xhs-cover-md](https://github.com/maitty8879/xhs-cover-md)：设计 token→HTML→PNG，是非图片模型路线；不移植无沙箱截图脚本。
[awesome-design-md](https://github.com/VoltAgent/awesome-design-md)：按需提炼设计变量，不复制大批品牌系统/未许可字体。
[ian-xiaohei-illustrations](https://github.com/helloianneo/ian-xiaohei-illustrations)：认知锚点→实物隐喻→生成后检查；它本身是正文插图，不直接冒充封面引擎，不捆绑角色。
`creator-school.pages.dev` 本轮无法抓取，无可验证方法/许可，不声称已经吸收。
