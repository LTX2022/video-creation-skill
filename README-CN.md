# 视频创作 Skill

[English](README.md) · **简体中文**

**把你的文案、产品流程和知识解释，变成可以继续修改的视频工程。**

可扩展风格 · 横竖屏 · 配音字幕 · 透明动画 · 实拍叠加

[下载 ZIP](https://github.com/LTX2022/video-creation-skill/archive/refs/heads/main.zip) · [安装](#下载与安装) · [做第一条视频](#做出第一条视频15-秒产品流程) · [完整指南](web-video-presentation/README.zh-CN.md)

## 先看效果

**中文界面 · 三条各 12 秒 · 1080p30 · 静音**

| 产品流程 | 数据解释 | 动态排版 |
|:---:|:---:|:---:|
| [![产品流程](media/samples-20261102/zh-CN/product.gif)](media/samples-20261102/zh-CN/product.mp4) | [![数据解释](media/samples-20261102/zh-CN/data.gif)](media/samples-20261102/zh-CN/data.mp4) | [![动态排版](media/samples-20261102/zh-CN/type.gif)](media/samples-20261102/zh-CN/type.mp4) |
| [打开 MP4](media/samples-20261102/zh-CN/product.mp4) | [打开 MP4](media/samples-20261102/zh-CN/data.mp4) | [打开 MP4](media/samples-20261102/zh-CN/type.mp4) |

上方是动态 GIF 预览，不是内嵌 MP4 播放器。点击打开成片；GitHub 无播放器时选择 **Download raw file**。

<details>
<summary><strong>历史中文参考样片与内置风格总览</strong></summary>

### 历史中文样片

[![THREAD：连续对象动画，点击打开完整视频](media/previews/thread.gif)](media/thread-continuity-14s.mp4)

**THREAD / 一线 · 14 秒 · 有声** — 同一个面板，从输入变成结果，再收束为图标。[打开完整 MP4](media/thread-continuity-14s.mp4)

| 内置风格总览 · 6:24 | 从噪声到秩序 · 26 秒 | 缓存边界 · 14 秒 |
|:---:|:---:|:---:|
| [![60风格预览](media/previews/styles.jpg)](media/60-styles-noto-overview.mp4) | [![秩序预览](media/previews/order.jpg)](media/order-emergent-26s.mp4) | [![缓存机制预览](media/previews/cache.jpg)](web-video-presentation/examples/semantic-cache-study/semantic-cache-boundary.mp4) |
| [打开 MP4](media/60-styles-noto-overview.mp4) | [打开 MP4](media/order-emergent-26s.mp4) | [打开 MP4](web-video-presentation/examples/semantic-cache-study/semantic-cache-boundary.mp4) |

点击图片打开 MP4 文件页；若无播放器，点 **Download raw file** 下载播放。首页动态图片是无声 GIF，**不是内嵌 MP4 播放器**。后三条视频为静音。

<details>
<summary><strong>展开看全部 60 套风格</strong>（真实总览截图，按视频顺序排列）</summary>

[![全部60套风格的逐段截图](media/previews/60-styles.jpg)](media/60-styles-noto-overview.mp4)

[风格名称、用途与视频时间](media/preview-source/index.json) · [全部主题源码](web-video-presentation/themes/)

</details>


</details>

## 适合做什么

| 你提供 | 用它制作 |
|---|---|
| 文章、讲解稿 | 分镜、口播、句级字幕与横竖屏视频 |
| 产品流程、操作逻辑 | UI 演示、流程动画与连续对象变形 |
| 数据、机制、概念 | 因果关系、状态变化和知识解释动画 |
| 已授权实拍素材 | 透明动态图形及画面叠加 |

这是供**支持加载 Skill，且能读写文件、运行代码的 AI Agent**使用的工具，不是独立剪辑软件。不同 Agent 的安装方式与权限可能不同。工作流程是：**选风格 → 确认分镜与关键画面 → 预览 → 渲染与检查 → 交付视频和源码**。安装 Skill 不等于装好渲染环境。

## 内置风格与个人风格库

Skill 内置 60 套风格，作为创作起点，而不是功能上限。你自行创建的扩展风格保存在指定的独立个人目录中，不属于随 Skill 分发和安装的内置内容。推荐时，Agent 会分为「系统内置风格」和「用户自建风格」两个栏目，明确来源，不混在一起。你也可以要求 Agent 展开全部自建风格及其用途；这些仍属于个人风格库，不会自动变成系统内置风格。

没有合适的内置风格？把喜欢的视频、网站或可播放录屏交给 Agent，说明你想借鉴的部分。Agent 会在实际可访问、获准研究的范围内观察构图、运镜、连续形变、转场和节奏，提炼规则并编写可复用的新风格，而不只是换颜色。看不到的动态会明确标为未知，不会假装已经分析过，也不会自动抓取任意网站或绕过访问限制。

先做一段可播放小样，你看过并确认方向后，再扩展到完整视频。新风格可以起名、按版本保存到你指定的个人风格目录，以后继续调用或修改；旧版本和已有项目不会随库更新被覆盖。若环境暂时无法渲染，只能保存明确标记的草案，不冒充已验收风格。参考素材、字体与代码仍须有相应使用授权。

[新风格的学习、保存与复用说明](web-video-presentation/references/CUSTOM-STYLES.md)

## 不必每次都做整条视频

直接说你要的结果：**整条视频、一个镜头、让某个元素或你提供的素材动起来，或者没有任何素材、从零做一张画面或动态镜头**。需求已经明确，Agent 就按已有信息和授权执行，不再让你重复选择任务类型；只有会改变结果的关键信息不清楚时才问。

有素材时，按你实际拥有的使用权制作元素动画、透明前景或叠到镜头上，不默认要求商用授权，也不把本地处理许可当成外部上传许可。没有素材也能开始创作，不强制先找底片、补标题、字幕或旁白。现有本地生成示例只实现特定的程序化视觉机制，不代表覆盖所有题材；其他方向需要真正设计和测试。需要图像/视频模型时，先确认宿主确有可用工具及相应费用、上传和使用授权，不承诺模型一定可用或任意描述都能直接出片。

制作素材动画时，Agent 先实际查看图像或视频，再结合你的要求和可见结构设计动作，不靠固定的动物或物体名单套模板。本地执行器现已支持**通用二维分层动画**：

- **只有一张平图：** 可以整体移动、旋转、缩放，但不代表翅膀、腿或其他部件能独立运动。
- **已有透明分层：** 每层可设置旋转支点，独立编排位置、旋转、横纵缩放、透明度及周期运动，合成后再沿整体轨迹移动。可用于多种对象的部件动作，输出透明动画或叠加到实拍镜头。
- **尚未分层的图像或视频：** 局部动作需要先真正抠图/分层，或使用确实可用且获授权的其他工具。执行器不会自动识别拆分部件、去背景、恢复遮挡结构，也不会自动求解自然步态、关节、跟踪或遮挡。不能把你要求的局部动作悄悄换成整图晃动。

先给你可播放的短样，确认真正动了哪些部位再扩展。分层素材和编排好的动作是实际输入，不承诺任意图片都能自行自然运动。[素材观察与动作设计说明](web-video-presentation/references/ASSET-MOTION-DIRECTION.md)

[用户素材与元素动画](web-video-presentation/references/LOCAL-ELEMENT-ROUTE.md) · [无素材原创画面与镜头](web-video-presentation/references/ORIGINAL-SCENE-ROUTE.md)

## 下载与安装

**[下载完整公开版 ZIP](https://github.com/LTX2022/video-creation-skill/archive/refs/heads/main.zip)**，或点本页绿色 **Code → Download ZIP**，解压后得到 `video-creation-skill-main`。

ZIP 包含完整公开版 Skill、60 套内置风格源码、10 个 MP4（4 条历史片，以及 3 种新示例的中英文版本） 与可选 `fix-agent`。依赖、模型服务及旧研究抽帧/转写/蒸馏工具不附；不是历史原始总包。

### 安装到你的 Agent

解压下载的 ZIP，在你使用的 Agent 中发送：

> 请把我解压的 video-creation-skill 里的 web-video-presentation 文件夹安装为技能。先检查你的技能安装方式；如果需要我提供目录或确认权限，请告诉我。安装完成后确认技能可以被识别。

根据 Agent 的提示提供解压目录即可。需要能读取文件和安装技能的 Agent；各平台的操作、权限及依赖可能不同。如果 Agent 不支持安装技能，可参考该平台说明加载完整文件夹。

### 可选：越用越懂你的偏好

`fix-agent` 是需要**单独安装**的可选 Skill；只安装视频 Skill 也能正常继续制作。想启用时，请让 Agent 按名称查找 `fix-agent`，并先与你确认要记什么、允许在哪些项目使用，以及你指定的独立私人记忆目录。未经明确同意，不读取或更改你的私有记忆库。

你明确同意并指定独立私有目录后，Agent 可以保存**可查看、纠正、撤销的本地偏好与项目经验**。默认先提出候选、逐条确认。若希望减少打断，可以另行启用[有限范围的自动学习](fix-agent/references/PERSONALIZATION.md)：一次确认项目、允许的偏好/复验类别、最低置信和有效期。当前制作 Agent 在获授权工作中调用 `learning-enable → observe`，合格的明确反馈或客观复验提示便可自动保存，不必每条追问；推断仍待批准。下一次任务先读 `profile`，以本次需求覆盖旧偏好，再用于风格排序与制作计划，原有设计、渲染与验收门禁全部保留。

**没有后台监听、自动扫描聊天、模型训练、核心自改或外发。** hash 只核对证据字节，不认证来源或解释，调用者必须先核实。`learning-disable` 停止收集及采用自动记录，仍能查看、撤销、忘记。范围、到期、冲突历史和临时覆盖是实际可执行控制，不是“模型变聪明”或成片质量保证。独立的一般经验闭环仍在交付/终止后提出待批准候选，自动偏好授权不会替它批准经验。

### 可选：分享审阅后的诊断反馈

遇到问题或有流程建议？可以打开[公开的 Fix-Agent 反馈表单](https://github.com/LTX2022/video-creation-skill/issues/new?template=fix-agent-feedback.yml)，或先让 Agent 生成[最小本地草稿](fix-agent/references/FEEDBACK.md)。**由你审阅，并自行明确点击提交。** 不会自动分享，不反馈也不影响继续制作。默认不包含媒体、日志、提示词、私人记忆和私有路径；白名单与扫描器都无法保证匿名，请检查最终内容，并留意 Issue 及 GitHub 身份是公开的。缺失证据如实保留为 unknown。

## 做出第一条视频：15 秒产品流程

在你选择的 **兼容 Agent 的对话中**提出需求。环境、权限和依赖满足后，Agent 可以负责检查环境、创建工程、写代码和渲染；你负责确认方案与观看结果。

### 1. 告诉 Agent 要做什么

确认 `web-video-presentation` 已安装并启用，复制这段，填入项目目录：

```text
使用 web-video-presentation 做一条 15 秒产品流程视频。
内容：输入任务 → 生成三步计划 → 逐项标记完成。
规格：1920×1080、30 fps、静音，保留界面内中文。
只用原创图形，不调用付费服务。
项目目录：[填写你确认的独立空目录绝对路径]。
先推荐 3 套风格，给出三段分镜和关键画面方案。
我确认后再制作；最终需要 MP4 和可编辑源码。
```

**你会先看到：** 风格建议、0–5 / 5–10 / 10–15 秒分镜，以及需要你确认的环境或素材事项，而不是直接生成整片。首次练习的执行说明随 Skill 一起安装，由 Agent 按需读取。

### 2. 选方案，确认首段制作

```text
选择 ai-orchestration，确认这份三段分镜。
请在指定目录制作，缺依赖先说明安装来源和位置，等我确认。
先给我关键画面；我确认后再输出前 5 秒连续视频预览。
```

**你需要看：** 中文是否正确、画面布局是否合适、动作和节奏是否连贯。Agent 应提供可打开的预览文件，不用截图合集冒充视频。缺工具、素材或权限时，先说明阻塞，不自动绕过。

### 3. 直接说哪里要改

例如：

```text
结果卡片晚 0.5 秒出现，标题保留到第 5 秒。
保持总长 15 秒，修改后重新给我看首段。
```

满意后再说：

```text
首段确认。按分镜完成其余两段，保持同一风格和总时长。
展示新增关键画面，我确认后再渲染完整 MP4。
```

**你会得到：** 完整的 15 秒成片及实际文件路径。Agent 负责渲染和技术检查，你从头到尾观看内容、文字、节奏和首尾停留。

### 4. 确认成片，拿走视频与源码

```text
确认这版成片。请核验时长、分辨率和帧率，整理 MP4 与源码交付包。
先列明源码、素材和排除项；不要包含密钥或未授权素材。
交付时给我视频和 ZIP 的实际路径，说明如何继续修改及尚未验证的部分。
```

Agent 会告知视频和源码包的实际保存位置，并说明如何继续修改。交付包不是默认包含全部原始素材，也不等于已在另一台电脑验证可运行。

想做口播视频，补充文案、声音和字幕要求；想要透明动画或实拍叠加，直接说明所需素材和输出。Agent 应按对应路线执行，而不是照搬本例静音流程。[输出与交付说明](web-video-presentation/DELIVERY.md)

## 项目与说明

```text
web-video-presentation/  主 Skill：SKILL.md、脚本、模板、themes/、examples/
fix-agent/               可选的排错与复盘 Skill
media/                   视频、预览与来源说明（缓存示例在 examples/ 下）
docs/                    验证记录
```

**已完成的验证：** 已制作并检查 4 条历史片与 6 个中英文新样片文件，范围以各自记录为准；完成代码测试、独立脚手架 typecheck/bundle 和视频完整解码检查。不同 Agent、系统及输出路线的兼容情况，以各自测试记录为准。[详细记录](docs/VALIDATION.md)

原创代码的 MIT 范围见 [LICENSE-SCOPE](LICENSE-SCOPE.md)；视频、字体与第三方内容不自动适用 MIT。[第三方说明](THIRD_PARTY_NOTICES.md)
