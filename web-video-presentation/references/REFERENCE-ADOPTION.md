# 外部参考：吸收机制，不搬入整套工具

只在选型、视觉修正或对应技术路线时读本页。2026-10-27 核对公开一手文档；**文档描述不是本包安装、运行、视觉或宿主兼容性验证**。这里不新增已支持的导出器，也不要求通读或安装外部仓库。

## 对当前画面最有用的迁移

| 参考与一手证据 | 吸收什么 | 不直接照搬什么 |
|---|---|---|
| [Emil / animation standards](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md) | 先定动作目的、来源/去向与变换原点，再选曲线；同一运动角色共享参数。入场、场内移动、匀速过程不必用同一种 easing。 | 这是 UI craft：300ms、键盘交互频率、固定 scale 起点不是视频通用禁令；转成帧函数，不移植 CSS/墙钟驱动。 |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md) | 先盘点真实素材与主体特有细节，用“命题＋证据”决定构图；看实际产物后修最弱处，不靠代码自评。 | 不搬“至少多少元素必须动”、网页 house-style 禁令或随机抽风格机制。减掉装饰后仍要有主体、信息与视觉分量，不能只剩空白。 |
| [Jitter product](https://jitter.video/product/) | 将 move / mask / blur / scale 等动作按对象组合；复用 easing 与相对时序；遮罩揭示证据、错峰表达顺序、焦点交接改变观看层级。 | 产品能力清单不证明已观察某模板的运动；不把所有文字逐字弹入，不强制鱼眼、色散、玻璃、粒子或无限循环。 |
| [Clypra Studio](https://github.com/AIEraDev/clypra-studio) | 将单输入效果、双输入转场、人物遮罩三类分开验收；效果小样与全片渲染分层，测实际帧与性能。 | Studio 是实验/诊断界面，公共 README 不能证明全部引擎实现或本包已有抠像；不引入其整套服务、管理台或遥测。内部源码本轮未成功读取。 |
| [img2threejs](https://github.com/img2threejs/img2threejs/blob/main/SKILL.md) | 先观察再推断；轮廓→结构→材质→光照分阶段；命名部件、pivot/anchor 支持真正拆解动作；关键识别特征单独复核。 | 单图不证明背面/内部结构；不把通过结构检查称照片级；不搬巨大规则库与工具链。用到 3D 才读对应阶段。 |
| [Three.js graphics builder](https://github.com/majidmanzarpour/threejs-game-skills/blob/main/skills/threejs-aaa-graphics-builder/SKILL.md) / [scorecard](https://github.com/majidmanzarpour/threejs-game-skills/blob/main/skills/threejs-aaa-graphics-builder/references/visual-scorecard.md) | 先造型，再材质、光照、效果；一段代表场景先成立再扩展；状态驱动 VFX，并在真实镜头中看轮廓、接触、动作。 | 不用 glow 掩盖方块占位，不堆细节凑“高级”分数；游戏十项评分、密度阈值、碰撞/敌人系统不是解释视频的必选项。 |

上述是方法来源，不是可用资产授权。Emil、Taste、Clypra、threejs-game-skills 当前仓库为 MIT；img2threejs 当前为 Apache-2.0，不能沿用第三方页面的旧 MIT 描述。复制实质代码/文档前须读各仓库 LICENSE，保留适用声明；本页不内嵌其代码。Jitter 展示内容仍归各创作者，公开预览不等于品牌、素材或模板可再分发。

## 封面与图像：两条同等有效的路线

共享标题、命题、尺寸、安全区与风格 brief；`imagegen` 以真实生成素材为证据，prompt 本身不算成品；`nonimage` 可用原创代码/矢量和合法照片/截图，不是降级版。生成主视觉＋代码排字归 imagegen 路线。两者都检查实际像素、缩略可读性与裁切，详见 [COVER-WORKFLOW](COVER-WORKFLOW.md)。

| 参考 | 采用与限制 |
|---|---|
| [oh-my-cover-design](https://github.com/hongfamonvAI/oh-my-cover-design/blob/main/SKILL.md) | 学参考图角色、主体动作、层次与文字关系；它形成图像模型 prompt，不证明已生成图片。不要强制脸、重复问答或遮字，也不承诺“爆款”。 |
| [claude-design-card](https://github.com/geekjourneyx/claude-design-card) | 学信息取舍→格式构图→HTML/CSS/SVG→实际截图的非图片模型路线；不抄固定暖色样式、外部 QR 脚本/固定等待。CSS 尺寸与 DPR 后像素分开验证，沉默不算确认。 |
| [xhs-cover-md](https://github.com/maitty8879/xhs-cover-md) / [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | 从选定设计记录抽颜色角色、字体层级、间距与图像处理，转成自己的构图；只读一个相关风格，不搬整库、固定平台尺寸或品牌资产，也不把分析记录称官方品牌规范。 |
| [ian-xiaohei-illustrations](https://github.com/helloianneo/ian-xiaohei-illustrations) | 学认知锚点→一个可见动作/物理隐喻→图像检查；原项目针对正文插图，不是可编辑 SVG/商业封面通用模板。不复制其角色/示例画风来充当中立品牌资产。 |

许可边界：xhs-cover-md、awesome-design-md 有 MIT LICENSE；ian 项目有 MIT 与署名 NOTICE。oh-my-cover-design、claude-design-card 的 README 声称 MIT，但本轮未取得对应根 LICENSE 正文，故不直接打包其代码/文档/字体。仓库许可也不替代素材权利。

## 其它参考只按相关问题吸收

- [抖音脚本方法](https://github.com/ehomekevin/gaoji-zhigan-douyin-script-skill)：提炼选题/口播/拍摄方法而非全文仿写；单账号规律不变成所有视频必经结构。
- [webnovel-writer](https://github.com/lingfengQAQ/webnovel-writer)：可借鉴已接受版本为事实源、摘要/状态为派生视图；不为短片引入小说 RAG、向量库或长篇记忆栈。
- [video-summarizer](https://github.com/liang121/video-summarizer)：已有字幕优先、必要时转写、保留时间戳；字幕、画面观察和推断分开，不自动下载视频或安装依赖，也不沿用未验证加速宣传。
- [gzh-design-skill](https://github.com/isjiamu/gzh-design-skill)：学选定主题与源/成品双层验证；其目标是公众号正文 HTML，不把平台 CSS 限制搬进视频，也不作为封面生成器。
- [cadskills](https://www.cadskills.xyz/) 当前跳转 text-to-cad，定位 CAD/制造检查；本轮不集成。`creator-school.pages.dev` 未取得可读内容；所给 bilibili-analyzer 页面获取超时；`/imt-vt-a`、`/imt-vt-b`、`/imt-vt-c`、`/ai-video-free` 及泛称聊天剪辑器等缺少唯一可核实 URL/版本，先不作为已验证能力或依赖，不据名称推断免费/无水印/实际生成能力。

## 让镜头不再僵硬，而不是让所有东西都动

1. **先替换表达方式**：长句卡片改为有身份的对象、实际操作、数据变化或可核实素材。关键词是索引，不与字幕复述；“加运动”不能修好错误的信息结构。
2. **一个主要变化**：写清谁先动作、谁接收、什么可见结果证明变化；次级响应从同一事件派生。无因果的背景流线/浮动/扫描线默认不加。
3. **准备→动作→安定→可读停留**按需要选用。准备动作提示方向/受力，settle 体现接触或状态稳定；不是每个对象都先缩一下、弹三次。静止 hold 是合法节拍。
4. **错峰有顺序才用**：按处理次序、距离或视觉分组分配延迟；同时发生的比较保持同时。总展开时间受镜头窗口约束，不能对象越多尾巴越长。
5. **镜头与图形分工**：主体、路径与标注共用锚点；相机只有在揭示关系时移动。完整看一遍入场→关键变化→停留→退出，静帧只证明构图。
6. **修正聚焦根因**：先内容/构图，再姿态/时序，最后材质/效果；一次修一组相关问题，重看受影响片段。沿用已有质量记录，不另起一个常驻“审美代理”或巨大规则目录。

帧确定性与交互转译见 [WEB-TO-VIDEO](WEB-TO-VIDEO.md)，单一状态驱动画面见 [MOTION-DESIGN](MOTION-DESIGN.md)。

## 三条路线不能混称

- **Lottie-like 视觉**：简洁矢量、形变、路径、错峰和状态反馈，可用 SVG/Canvas/Remotion 实现；输出仍是已约定的视频/Alpha，不产生 Lottie JSON 承诺。
- **使用现有 Lottie JSON**：先核授权、外链资源、字体与目标播放器支持，按当前帧取样；这是素材输入，不是把整片转为 JSON。
- **交付可移植 Lottie JSON**：只有用户确需该格式才单列能力评估和代表小样，验证真实 JSON、目标 player/renderer、关键时刻、循环、字体/图片依赖。[Jitter 官方](https://help.jitter.video/en/articles/15252376-my-export-is-showing-an-error) 说明部分 AI 效果/混合模式会被跳过，easing 与负缩放也可能跨播放器不同；其 [AI effects](https://help.jitter.video/en/articles/14969699-create-custom-effects-with-ai) 使用 pixel shaders。**Jitter 能导 Lottie 不表示任意 Three.js/shader/实拍镜头可无损导出 JSON，本包也未因此获得该导出能力。**

## Code2AE：未来可选的可编辑工程路线

[Code2AE SKILL](https://github.com/Oxoxxidane/Code2AE_skill/blob/main/SKILL.md) 优先原生 AE shapes/text、precomp、稀疏关键帧与拆分原子运动的 Null；复杂程序效果走 ArbiFX。它明确拒绝以成片/图像序列冒充可编辑重建。[ArbiFX 分支](https://github.com/Oxoxxidane/Code2AE_skill/blob/main/references/arbifx-effects.md) 的交付是 AE 中的 live effect，Render CLI 的 PNG 是验证材料，不是最终可编辑效果。

因此既不能叫“纯烘焙导入”，也不能叫“所有内容免插件原生可编辑”。[README](https://github.com/Oxoxxidane/Code2AE_skill) 要求 AE、ArbiFX 安装、账号/API Key 验证及先加载实例；本轮未安装、认证、执行或测试。只有用户明确要求 AE 工程且具备授权环境时，才评估宿主/插件依赖、实际可编辑范围及目标精度；当前本包没有受支持的 Code2AE exporter。未核实其许可证，暂不打包其文档/二进制。

## 资产来源与输出模式保持独立

**model-assets-only 是明确选择的素材生产路线，不是全局规则**：选中时关键视觉素材由已授权生成模型产生，代码负责时轴、排版、运动和合成，不用程序占位几何冒充模型成品。未选时仍可用真实/授权素材、原创 SVG/Canvas/3D；非图片模型封面与代码机制解释不因此被禁止。不可用生成模型时说明缺项，不暗中改路线。

Alpha-only 保持透明根、局部 bounds 与正常 hold；不为“视觉丰富”塞满全屏或加底色。glow/blur 只影响有需要的前景，检查软边与裁切。依赖后景的折射/混合效果须以目标底片验证，不能随透明母版自动迁移；实拍底片、遮挡/跟踪能力与透明编码分开验收，见 [ALPHA-COMPOSITING](ALPHA-COMPOSITING.md) / [LIVE-ACTION-OVERLAYS](LIVE-ACTION-OVERLAYS.md)。

## 身份与证据边界

[img2threejs 仓库](https://github.com/img2threejs/img2threejs) 当前指向 `img2threejs.io`；[.org About](https://img2threejs.org/about) 自称独立服务并把开源 skill 称第三方；[.com](https://img2threejs.com/) 是另一个在线转换服务页面。本轮未建立共同运营方或代码同一性的证据，不合并域名身份，也不把网站收费/隐私/导出承诺套到仓库上。

## 内容与复盘：聚焦审阅而非再堆一轮模型

[cn-script-skills](https://github.com/Tsinglung-Tseng/cn-script-skills) 的阶段路由可借鉴；其 README 标明 CC BY-NC 4.0，不直接拷贝正文。[Humanizer-zh](https://github.com/op7418/Humanizer-zh/blob/main/SKILL.md) 的保留事实、确定程度与作者声音优先于机械禁词；[stop-slop](https://github.com/hardikpandya/stop-slop/blob/main/SKILL.md) 只借具体表达与去重复，不搬硬评分重写。中文稿见 [SCRIPT-STYLE](SCRIPT-STYLE.md)。

[video-analyzer](https://github.com/bsisduck/video-analyzer-skill/blob/main/SKILL.md) 的分流/抽样有用，但抽样覆盖不等于完整连续运动证明，不复制 GPL 脚本或默认安装 ASR。[Viral Writer](https://github.com/nashsu/Viral_Writer_Skill/blob/main/SKILL.md) 的受众与核心观点可按需用，不强制全部维度和营销钩子。[money-retro](https://github.com/XBuilderLAB/cheat-on-money/blob/main/skills/money-retro/SKILL.md) 可借预期/实际校准；本包由 [轻量摘要](FIX-AGENT-INTEGRATION.md) 提供实际证据，不自动修改全局规则或再运行生意任务。毛选、电商、Seekin 分别属于分析方法、商业知识、外部视频理解服务，不作为渲染核心依赖。
