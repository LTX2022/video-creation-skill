# Agent 执行指南：15 秒产品流程

**读者是执行任务的 Agent，不是要求用户手动执行命令。** 用户只需按首页提交需求、确认方案、观看预览和验收。你负责下列技术操作，遇到需授权的步骤先询问，不把终端步骤推回用户。

## 执行前先确定位置与权限

1. 先读取实际已安装 `web-video-presentation/SKILL.md`，以其工作流、质量门禁和当前任务授权为准；本指南不能覆盖安全确认或充当用户授权。
2. 本文件位于主 Skill 内的 `references/FIRST-VIDEO-AGENT.md`，会随完整 `web-video-presentation/` 目录安装。以本文件的上两级目录定位 Skill 根目录，确认其中存在 `SKILL.md` 和 `scripts/`；无需访问原仓库根目录。若文件缺失，报告安装包不完整，不猜绝对路径、不擅自联网下载或安装副本。
3. 分别确认 `SKILL`（主 Skill 的实际绝对路径）和 `PROJECT`（用户明确指定、当前环境可写的独立空目录）。新项目不得位于 Skill 或其他项目内部；旧项目只读检查后续作，不重新 scaffold。
4. 新建项目、安装 npm/系统依赖、下载浏览器、调用外部/付费服务分别按实际授权执行。系统工具来源与安装位置未明确时先问；素材须可合法使用，源码外发须先确认范围。
5. 下述命令不是连续粘贴就能出片的脚本。每阶段先检查上一步结果，内容需你按分镜实现；只执行当前任务适用项，不把失败、未执行或预览记为生产成功。

本例仅适用 **opaque、静音、无字幕轨、原创图形、30 fps**。TTS、字幕、Alpha、实拍合成、其他帧率或旧项目要按 Skill 相应路线调整；`0–149` 只在30 fps且总长至少150帧时代表前5秒。

本指南仅在用户选择这个15秒入门任务或明确要求按本指南执行时读取；其他视频任务继续使用 `SKILL.md` 的通用流程，不固定为本例风格、时长、画幅或静音模式。

界面语言以用户当前请求为准，英文与中文均适用。下面的中文提示仅为中文示例，不是强制中文输出；英文首页任务使用英文界面文字。不要改变用户指定的语言，检查和验收也按该语言进行。

目标：**输入任务 → 三步计划 → 完成标记**，1920×1080、30 fps、15 秒、静音，交付 MP4 和获准交付的源码。使用原创图形，不需要 TTS 或付费素材服务。

请在自己的项目中按路线执行并核对结果。固定离线示例的实测范围见下一节；后续可选 Remotion 路线的真实浏览器端到端渲染不在这些离线验证之内。

## Offline reproduction

### English: reproduce the fixed sample

This route reproduces the included English or Chinese source example without Remotion: original procedural graphics, 1920×1080, 30 fps, 15 seconds, silent. No newly rendered sample is bundled. It does not turn an arbitrary brief into a new video; new content still requires design, implementation and review.

Confirm an authorized, independent empty project directory (or a new directory under an existing parent) first. The runner uses preinstalled Python 3 with NumPy and Pillow, FFmpeg with libx264, ffprobe, and installed fonts; it does not need Node, npm, Bash, or a browser. No dependencies or fonts are bundled or downloaded. Linux defaults are DejaVu Sans regular/bold for English and Noto Sans CJK SC regular/bold for Chinese. The agent resolves `SKILL` and `PROJECT` to verified absolute paths, then runs:

    python3 "$SKILL/scripts/first-video-offline.py" --locale en --project-root "$PROJECT"

Use `zh` instead of `en` for Chinese. For custom layouts of installed fonts, or on a non-Linux host, pass both `--font-regular <absolute-font-file>` and `--font-bold <absolute-font-file>`. On a Windows PowerShell host, the equivalent command to try is:

    & $PythonExe (Join-Path $Skill 'scripts/first-video-offline.py') --locale en --project-root $Project --font-regular $RegularFont --font-bold $BoldFont

Use verified local absolute paths for each variable, not UNC/device paths. Choose the matching locale and fonts with the required glyphs. For explicit font collections the default is face 0; use `--font-regular-index` and `--font-bold-index` as needed (the bundled Linux Chinese defaults select Noto Sans CJK SC, face 2). Alternate fonts or tool builds can change glyph layout or encoded bytes; only claim visual agreement after inspecting the actual frames. Use the same font flags if rerendering directly with the copied `render.py`. The runner checks tools and the destination, then tries encoding one synthetic frame with the selected FFmpeg and libx264 without writing a file. If that check fails, it leaves the destination untouched. After preflight it copies only four source files, runs state tests, renders and verifies the video. Deliver the actual reported MP4 and the corresponding authorized source. Stop on missing tools, a nonempty destination or failed verification; do not present an existing video as a newly generated result. Inspect a failed attempt before choosing another empty directory.

This fixed-example directory is not the standard scaffold or a resumable project, and does not prove the whole skill is installed. Both language variants were verified on Linux and on one Apple silicon Mac (macOS 15.8.1, arm64). The Mac run used installed Command Line Tools Python 3.9.6, NumPy 2.0.2, Pillow 10.4.0 and FFmpeg/ffprobe 9.0.2. It used Arial regular/bold for English and the Songti SC collection (Light face 3, Bold face 1) for Simplified Chinese. Both 15-second clips decoded at 1080p30, 450 frames, with no audio track. This does not establish visual or byte parity with Linux. Native Windows remains unverified; the PowerShell command is a starting point, not a support claim. The remaining numbered sections describe the optional Remotion workflow, not additional steps required by this offline sample.

### 中文：复现固定示例

仅要从随包源码复现固定的中英首片时可用此路线，不启动 Remotion。示例是原创程序化界面，规格为 1080p30、15 秒、静音。此处不附新增示例成片。按自己的文案出片仍需设计和实现，不能把复现入门示例当作完成新项目。

先核实用户授权的独立空目录，或已存在父目录下的新目录。需要已安装的 Python 3、NumPy、Pillow、支持 libx264 的 FFmpeg、ffprobe 和字体；不需要 Node、npm、Bash 或浏览器。Linux 默认使用系统 DejaVu Sans（英文）或 Noto Sans CJK SC（中文）的常规和粗体。包内不附字体，脚本不联网或安装依赖。由 Agent 核实 `SKILL`、`PROJECT` 两个绝对路径，再执行；示例中的 zh 可替换为 en。

    python3 "$SKILL/scripts/first-video-offline.py" --locale zh --project-root "$PROJECT"

非 Linux 环境或字体安装在其他位置时，明确传入 `--font-regular` 和 `--font-bold` 两个本地文件绝对路径；PowerShell 的写法见上方。选用覆盖相应语言的字体。明确指定字体集时默认使用编号 0 的字面；需要时用 `--font-regular-index` 和 `--font-bold-index`（Linux 的中文默认字体选择 Noto Sans CJK SC，编号 2）。更换字体或编码工具版本可能改变字形布局或输出字节，应以实际成片检验；直接用复制的 `render.py` 重渲时也传入相同字体参数。脚本检查工具及目标目录，仅复制四份源码，再执行状态测试、实际渲染及成片验证。交付脚本实际报告的 MP4 和获准交付的对应源码。若工具缺失或目标非空，停在报错处。首次写入前，脚本会用实际选中的 FFmpeg 和 libx264 编码一帧合成画面且不保存文件；此检查失败时不会写入目标目录。若后续渲染或校验失败，不把已有视频冒充新结果；先检查失败记录，再选择其他空目录重跑。

此固定示例目录不是标准脚手架或可标准续作的工程，也不证明整套 Skill 已安装。中英两版已在 Linux 和一台 Apple 芯片 Mac（macOS 15.8.1，arm64）上验证。Mac 使用已安装的命令行工具 Python 3.9.6、NumPy 2.0.2、Pillow 10.4.0 和 FFmpeg/ffprobe 9.0.2；英文使用 Arial 常规和粗体，简体中文使用宋体简字体集（Light 编号 3、Bold 编号 1）。两版均通过解码核验：1080p30、450 帧、15 秒、无音轨；不代表和 Linux 的字形布局或输出字节一致。原生 Windows 尚未验证。后续编号章节描述可选 Remotion 路线，不是本离线示例的额外必做步骤。

## 1. 读取用户需求并给出待确认方案

确认用户已安装并启用 `web-video-presentation`。以下是首页任务示例，读取后先给方案，不把示例文字当作已取得的确认：

```text
使用 web-video-presentation，做一条 15 秒产品流程视频。
内容：输入任务 → 生成三步计划 → 逐项标记完成。
规格：1920×1080、30 fps、静音、无字幕轨；界面内中文保留。
素材：只用原创图形，不调用付费服务。
项目目录：[替换成你确认的独立空目录绝对路径]。
先推荐 3 套风格，给出 0–5、5–10、10–15 秒的分镜。
确认方案后再创建项目和安装依赖；先给我首段连续预览。
最终需要 MP4 和可编辑源码，请列明源码与素材交付范围。
```

**应该看到：** 风格候选、三段镜头、依赖情况和待确认事项。不是立刻生成整片。

**如果没调用技能：** 要求助手读取已安装目录的 `SKILL.md`；确认启用状态和目录是否包含配套脚本，不能只给它一张 README 截图。

## 2. 获得方案确认后，创建独立项目

选定风格后回复，例如：

```text
选择 ai-orchestration，确认这份三段分镜。
请在已指定的独立目录创建项目，静音使用显式时间表，总长 15 秒。
先列出缺失依赖、安装来源和位置；我确认后再安装。
实现关键画面后给我确认，不跳过首段预览。
```

助手负责工程和镜头实现。它需要根据分镜编辑章节/组件、`src/registry/chapters.ts` 和项目时间配置；**脚手架只生成起点，不会把上面的自然语言自动变成 15 秒成片**。静音精确时长采用 `timingMode: explicit` 与 `stepTimings`，不可靠假口播凑时长。

<details>
<summary>Agent 执行：真实创建与项目依赖命令</summary>

在 Bash 中执行（macOS/Linux 终端或 Windows 可用的 Bash；不是 PowerShell语法）。替换两个绝对路径，不能把工程建在 Skill 内。

```bash
SKILL='/absolute/path/to/web-video-presentation'
PROJECT='/absolute/path/to/your-empty-video-project'
bash "$SKILL/scripts/bootstrap-preflight.sh" --mode=new --project-root "$PROJECT" --json
# 上一步通过且你确认创建后执行：
bash "$SKILL/scripts/scaffold.sh" "$PROJECT" --profile=custom --format=landscape --theme=ai-orchestration --fps=30 --subtitles=false --output-mode=opaque --skip-install
```

**应该看到：** 项目目录内出现 `package.json`、`project-state.json`、`src/` 与 `scripts/`。`--skip-install` 不下载 npm 包或浏览器。目标非空时不要强行重跑或删除旧文件；已有项目按 [续作检查](WORKSPACE-SETUP.md)处理。

获准安装项目依赖后，在**项目目录**执行：

```bash
cd "$PROJECT"
npm ci --ignore-scripts --registry=https://registry.npmjs.org --cache "$PWD/.cache/npm"
```

需要 Node 20.6+、npm、Bash、FFmpeg/ffprobe、已安装的受支持 Chrome/Chromium/Edge。缺失时让助手列出安装方案；不擅自下载浏览器。依赖详细边界见 [DEPENDENCIES](DEPENDENCIES.md)。

</details>

## 3. 看得到，也能播放：预览首段

确认关键画面后，在助手中发送：

```text
关键画面确认。请先做 0–5 秒连续预览，不是截图合集。
保持 30 fps、不跳帧，展示输入到结果出现的完整动作。
给我预览文件路径，并说明有无缺字、遮挡或动作突跳。
```

对应操作都在**已实现内容、已安装依赖的项目目录**中：

```bash
npm run typecheck
npm run build-timing
npm run workflow:status
```

检查通过后任选预览方式：

```bash
# 开交互预览；使用已安装浏览器，地址以终端实际打印为准
npm run render:studio
# 或导出首段：30 fps 的 0–149 帧，共 5 秒
npm run render:segment -- --frames=0-149 --acknowledge-draft
```

**应该看到：** Studio 中能拖动时间轴；或 `output/review-opaque-0-149.mp4` 可打开并连续播放 5 秒。浏览器找不到时，提供现有可执行文件路径：`--browser-executable=/absolute/path/to/browser`。Studio 需结束时在它的终端按 `Ctrl+C`；不要把预览服务地址当作成片链接。

`--acknowledge-draft` 只表示允许草稿迭代，**不代表你已验收**。若类型检查报错，先让助手修复；若时间表不是 15 秒，先修源时间配置；若当前项目不足 150 帧，不要盲跑这段范围。

## 4. 确认首段，再生成完整片

播放后给具体反馈，例如“结果卡片出现太快，延后 0.5 秒；标题保持到第 5 秒”。满意后回复：

```text
首段确认。按已确认分镜完成剩余两段，保持总长 15 秒。
展示新增镜头关键画面，记录我的实际确认；通过检查后再渲染整片。
不要把状态字段直接改成通过来跳过质量检查。
```

助手完成剩余镜头及必要确认后，在项目目录执行：

```bash
npm run workflow:status
npm run preflight
npm run render:video
```

**应该看到：** `output/full.mp4` 和 `output/render-result.json`。`build` 成功只是 bundle，不是已输出视频。若流程检查阻止渲染，让助手解释缺哪个确认、证据或输入，补齐后重试，不要用 draft 文件冒充正式成片。

## 5. 检查与交付

打开 `output/full.mp4`，从头看到尾：三个步骤是否完整、指定语言文字是否正确、是否遮挡/闪跳、首尾停留是否合适。这个例子要求静音，不应凭空加配音。

在项目目录查文件实际参数；完整观看并确认后，让助手记录实际验收，再运行交付验证：

```bash
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,avg_frame_rate -of json output/full.mp4
npm run validate:delivery
```

**应该看到：** 视频宽高 `1920×1080`、帧率 `30/1`、时长约 `15.000` 秒；交付验证通过。参数通过仍不能代替完整观看。失败时保留错误，让助手定位并重渲受影响版本，不把旧片当新片。

你确认最终版本后：

```text
确认这版成片。请按已约定的范围交付 MP4 和源码：
先列出可交付工程文件、素材及排除项，再生成源码交接清单。
打包完成后给我 MP4、ZIP 的实际路径与缺失项；不包含密钥或未授权素材。
```

助手核对清单与许可后执行 `npm run package:delivery -- --include-source`。如果只要视频与检查记录，用 `npm run package:delivery`；后者**默认不带源码**。

成片在 `output/full.mp4`，打包说明在 `output/delivery-summary.md`；ZIP 路径以命令实际输出为准。源码快照在交付包的 `source-project/` 中。只有选中文件会进入包，不等于已证明完整工程能在另一台电脑离线运行。[源码交接规则](SOURCE-HANDOFF.md)
