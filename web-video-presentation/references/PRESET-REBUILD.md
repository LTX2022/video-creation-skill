# 56 套预制风格：怎么使用、实测到哪里

## 本轮不是又加一个样片

原 56 个 ID 全保留。主题有自己的角色色、字型类别、密度、线条、卡面和装饰选择；运行时 registry 为各项指定实际布局、对象结构及动作。12 个家族共享可靠的基础代码，但逐套有明确配置与对应的实际预览，不把名称不同当作结构不同。

原有 Flow 示例仍保留为独立参考；默认 Example 已改为调用对应 `PresetScene`。主要修复包括：主题 token 被 base 覆盖、默认场景硬编码纸色、旧竖屏字幕位置、标签被对象盖住、推导顺序镜像、图表轴方向错误、动态合计与各项读数不同步、字形越界及透明图解的标注对比度。

## 选用，而不是重新发明整套画面

1. 先明确内容属于流程、数据、产品、课堂、编辑、空间、标题或其他哪类关系。
2. 用 `theme-summary.mjs` 选择一个 ID，只读取所选主题与当前 family，不加载全部 56 套源文件到模型上下文。
3. 在客户指定的独立空目录初始化，显式选择 `--theme=<id>`。脚手架同步所选 tokens 和 runtime ID。
4. 默认样片是概念示例，不是客户成片。替换内容时，文字、数值、标签、原文依据、三段口播和镜头说明要一起核对。仅改标题，不等于改好了内容。
5. 先看代表镜头和完整动作，再修改重出、验收、打包。不要在已有工程重跑脚手架覆盖文件。

下例中的路径均须先由客户确认，且权限已覆盖执行；不是默认写入位置：

```bash
SKILL='/absolute/path/to/web-video-presentation'
PROJECT_ROOT='/absolute/customer-confirmed/empty-project'
bash "$SKILL/scripts/bootstrap-preflight.sh" --mode=new --project-root "$PROJECT_ROOT" --json
bash "$SKILL/scripts/scaffold.sh" "$PROJECT_ROOT" --profile=custom --format=landscape --theme=paper-press --fps=30 --subtitles=false --skip-install
```

依赖、浏览器与字体先检查。没有允许安装时不安装；得到许可后限定项目目录/指定工具位置，不改全局配置。默认接口与更详细的 props 见 `templates/src/video/presets/README.md`。

## 内容与时间轴

- `PresetScene` 接收 presetId、明确的 frame/fps/尺寸、内容字段、overlay 和字幕预留等参数。
- 正式章节使用同一章时钟与实际 step timings，不按每段口播重新生成对象。
- 默认 Example 的 3 段说明通过 `presets/narration.ts` 生成，与选定示例的对象动作一致；镜头元数据绑定当前主题。自定义章节不会被默认示例逻辑强制覆盖。
- 预设内容可说明某种结构，却不证明具体业务、科学、医学或设备能力。演示数值不能冒充事实；实测或用户提供的数据要保留来源。
- 不支持的内容不能靠换标题硬塞。新增对象或改变关系是新的镜头设计，需要再次检查，而不是继承原样片通过状态。

## 本轮实际证据

预览包提供 56 条独立动态检查片及逐套静帧，总览视频按 ID 排列。每条为 6 秒、960×540、30fps、无声，用于检查预置动作，不是平台正式交付规格。

画面检查覆盖每套的横屏建立/动作/保持、竖屏、长中文、字幕预留与透明画面，共 448 个 case。最终这组检查未再产生越界、文字重叠候选或 alpha 像素缺失提示；这不是对任意内容长度和所有时刻的穷尽证明。透明 PNG 另在黑/白底复核，不能保证任意杂乱实拍背景都清楚。

这些预览由**生产 Example 同一个 React/SVG 组件**生成，经 CSS 变量解析、本地 librsvg 栅格化及 FFmpeg 编码。不是拿另一个 Python 画面冒充这套风格，但也不是浏览器/Remotion 端到端证明。字体回退、CSS 与栅格器仍可能不同。检查以密集顺序帧、原尺寸图和逐帧/几何诊断为主，不冒称正常速度人工全片回放或客户已接受。

源级检查、实际生成项目 TypeScript、默认/自定义镜头路由、主题选择及工作流回归另有记录。类型检查、退出码和哈希只能证明其各自范围，不能自动给审美评分。

每个主题元数据中的 pending 指目标渲染环境/正式视觉验收仍未完成；不要将本轮离线预览擅自写成浏览器或客户接受。

## 透明叠加的取舍

只移除明确的整片舞台底；重要主体表面保留。图解和必读标签有局部主题底板，外部区域继续透明。粒子装饰尽量保持悬浮，必要标签单独保护。这会牺牲局部通透度以换取可读性，不能把它宣传成对任何底片都自动适配。

本轮没有重新验证 ProRes 的 Alpha 编解码、真实实拍跟踪或目标剪辑软件导入。现有相应脚本/能力保留，仍须单独走实际输出验证。

## 尚缺的目标环境验收

独立真实 Remotion 入口：`src/video/preset-probe-index.ts`，Composition 为 `preset-probe`，使用同一组件、实际 tokens 与真实 Subtitle。它拒绝所选 ID 与项目主题 ID 不匹配；透明模式也保留明确的字幕选择。导入入口本身不执行浏览器、不下载、不产生通过记录。

在明确授权且已确认浏览器存在的项目里，才执行实际 probe。以已安装本地 CLI 为例：

```bash
BROWSER='/absolute/path/to/approved-installed-browser'
node node_modules/@remotion/cli/remotion-cli.js render src/video/preset-probe-index.ts preset-probe output/preset-probe.mp4 --browser-executable="$BROWSER" --concurrency=1
```

没有真实浏览器时，不自动下载或更换执行环境，不用 SVG 视频填写 Remotion 的最终证据。还需检查目标电脑的字体/性能、正式字幕、实际编码 Alpha、剪辑软件，以及客户修改后的内容。

## 交付定位

这是已经实改并提供可复跑源代码、真实离线预览的验证候选工作流。它降低重复绘制与漏步骤，但不会替任何模型获得审美判断，也不能保证弱模型面对全新题材都达到参考片水准。对客户的合理承诺应包括首次配置、样片验收与适用范围，而非“任何模型一键高级成片”。
