
> **离线公开整理候选 / publication review only:** 60 风格源码保留；第三方研究抽帧与转写未附；精选自生成示例见仓库 media 目录。原创代码 MIT 范围已获用户确认；第三方与媒体另按各自许可。当前测试与缺口见 [发布说明](../README.md)。历史记录不等于本次验收。

# Web Video Presentation

把文章、口播、流程、产品行为或机制做成可复现的 Remotion 视频，也可制作透明动态图形并叠在实拍上。入口是 [SKILL.md](SKILL.md)，版本见 `VERSION`；本包更新不自动安装个人技能。

## 本轮：文案与画面共写

把事实源/观众命题、对象动作证据、补充旁白、实际上屏文字和制作备注分开。按需读[共写表](references/VISUAL-SCRIPT.md)、[一份短任务](templates/script-templates/visual-script-task.md)与[四份前后稿](examples/visual-script/README.md)，不用把同类仓库全塞给执行模型。新增例子是未渲染教学脚本；静音/Alpha不强配口播，必要字幕/单位/条件保留。

## 能做什么

- 原文/口播→分镜→章节→TTS/句级字幕→实际渲染与验收。
- 流程元素、产品/UI、数据故事、机制解释、动感排版、空间/材质等不同家族，不统一成等距机器或“文字淡入”。
- 五个既有 profile 全保留：`douyin`、`douyin-laon`、`douyin-skill`、`bilibili`、`custom`；主题目录保留，按需要选而非全部加载。
- 四种输出：opaque MP4、Alpha ProRes 4444 MOV、实拍合成 MP4、Alpha+合成。Alpha-only 可静音无字幕；新竖屏默认1080×1920，旧尺寸不会自动迁移。
- 通过模型和帧事件表达因果；scroll/hover/RAF 网页效果转为确定时间线。官方/作者案例的作用、迁移方法与不用场景见 [案例手册](references/MOTION-CASEBOOK.md)。

## 本轮：方法与四类可选风格

已按用户反馈移除新增水墨留白 ink-landscape-film；仅保留空间粒子、多材质品牌、字形线框、雨夜站台四类新场景，原56项不变。

原56套保留，新增四类实际场景，总计60个可选ID。入口、题材与修改点见 [REFERENCE-STYLES](references/REFERENCE-STYLES.md)，方法与风格分别做到哪里见 [状态表](references/REFERENCE-INTEGRATION-STATUS.md)。同时修复初始化版本、静音混合音频、字幕/Alpha路由、Studio工具路径、烟测、源码交接和整体包验证的已发现问题。

## 保留：设计与运动增强

新增可选 [设计契约](references/MOTION-DIRECTION.md)、[运动工艺](references/MOTION-CRAFT.md) 与 `src/video/mechanisms/` 原创小模块。先关键画面再连续动效；同一主体的几何/颜色身份跨材质保留。`check:motion-direction` 只检查结构与记录，不代表真实审图通过。来源取舍见 [五项目核查](references/UPSTREAM-MOTION-SOURCES.md)。

## 保留：原 56 套预制风格重建

保留全部主题 ID，实际改造配色角色、字体/密度/材质、12 类场景构图与确定性运动；默认项目真正按所选主题路由，不再对全部主题使用同一个硬编码示例。三段口播和镜头元数据也与选定示例同步。

使用方法、逐套预览与验证边界见 [PRESET-REBUILD](references/PRESET-REBUILD.md)。本轮有真实同组件 SVG 画面及动效样片，但仍是验证候选版，不承诺任意模型、任意内容、任意电脑都能无需配置产出高级成片。

## 保留：封面与复盘

- [双路封面](references/COVER-WORKFLOW.md)：图片模型生成（完整图或主视觉）与非图片模型制作（代码/已授权素材），来源明确，标题与画面单独检查。
- [轻量复盘接入](references/FIX-AGENT-INTEGRATION.md)：默认本地执行证据和确定性摘要；独立 fix-agent 按需深查，不自动改工程。
- [项目位置与依赖](references/WORKSPACE-SETUP.md)：新项目使用客户指定的独立空目录，旧项目明确续作；工具安装先核对来源、用途、权限和客户指定位置。
- [外部参考取舍](references/REFERENCE-ADOPTION.md)：吸收机制，不批量安装或把所有 skill 装进上下文。

## 快速开始

先确认执行环境、客户指定的独立空项目目录、内容与镜头契约，再在授权范围内创建文件。两个变量都要替换为客户确认且当前环境可访问的绝对路径；项目须在 skill 安装目录及其它项目之外。以下是占位符，不是默认落点：

```bash
SKILL='/absolute/path/to/web-video-presentation'
PROJECT_ROOT='/absolute/customer-confirmed/empty-video-project'
bash "$SKILL/scripts/bootstrap-preflight.sh" --mode=new --project-root "$PROJECT_ROOT" --json
# 获准后，只执行适合当前项目的一条脚手架命令。
bash "$SKILL/scripts/scaffold.sh" "$PROJECT_ROOT" --profile=bilibili --subtitles=true --skip-install
# 若选择纯 Alpha 项目，另选独立空目录后改用下条；不要在上面已生成的项目重复执行：
# bash "$SKILL/scripts/scaffold.sh" "$PROJECT_ROOT" --profile=custom --format=portrait --output-mode=alpha --skip-install
```

继续已有项目时按 [WORKSPACE-SETUP](references/WORKSPACE-SETUP.md) 使用只读 `--mode=resume` 检查，不重新运行脚手架。

`--skip-install` 只生成文件；依赖/浏览器按 [DEPENDENCIES](references/DEPENDENCIES.md) 检查与安装。首章/代表镜头确认后再展开。无声精确时长用 `timingMode: explicit` + `stepTimings`，不是靠假口播凑时间。

当前项目命令：只读`workflow:status`、`typecheck`、`build`、`build-timing`、`validate:composition`、`preflight`、`render:golden`、`render:motion-strips`（稀疏取样）、`render:segment`（连续局部）、`render:alpha:smoke`、`render:video`、`validate:delivery`、`package:delivery`。只跑适用项，具体顺序见 [RENDERING](references/RENDERING.md)。

## 合成边界

内置实拍能力是本地底片上的屏幕空间图形；跟踪、人物前后遮挡、抠像需要额外素材与实现，不能只填字段就声称完成。没有实拍时只能交合成测试板。`yuva` 不代表透明与边缘合格；黑白灰底、实际底片和目标软件分别验收，未测试的写待验证。

## 文档与交付

- [用户喜欢的28秒流程：实际关键帧/源码拆解](references/FLOW-ELEMENTS.md)
- [机制解释与Anatomy原则](references/MECHANISM-DESIGN.md)
- [网页动效转译](references/WEB-TO-VIDEO.md)
- [Alpha](references/ALPHA-COMPOSITING.md) / [实拍前景](references/LIVE-ACTION-OVERLAYS.md)
- [音频](references/AUDIO.md) / [主题](references/THEMES.md) / [QA](references/QUALITY-GATE.md)
- [视频项目与skill包交付](DELIVERY.md) / [跨环境交接](references/TRANSFER.md)

最终schema3的 `outputs[]` 绑定同一当前 `contentRevision`，各项另有 `renderVariant`；旧schema1/2可读但unbound，不能当当前交付通过。每个请求目标都真实存在并验收；不强制所有项目有 `full.mp4`。历史事故/执行计划保留供查阅，不属于默认生产必读链。第三方案例只提炼方法，已排除历史研究媒体；其余文本/实现来源仍需权属复核；不承诺流量、收入、平台审核或所有编辑器兼容。
