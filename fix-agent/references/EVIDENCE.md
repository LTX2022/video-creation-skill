# 有界证据采集

## 数据采集顺序

1. 识别 adapter、skill 名和版本。
2. 收集项目元信息。
3. 从对话记录、摘要和项目内日志提取用户反馈。
4. 从项目文件提取修改前后差异。
5. 从验证命令、错误日志和输出目录提取 Bug 与门禁结果。
6. 对照对应 workflow 规则提取 Agent 流程违规。
7. 把反馈归类为核心缺陷、逐章修改、Bug、子系统演进和工作流优化候选。
8. 优先读取真实阶段计时；未测量写 `unknown`。有明确依据才提供 `~范围` 估计，区分重试、渲染、用户等待与审美返工。
9. 生成文档并自检必填章节。

## 元信息来源

| 信息 | Remotion/Web 来源 | OpenDesign 来源 | HyperFrames 来源 |
|---|---|---|---|
| 项目名 | `script.md` 标题、目录名、用户口述 | 同左 | `script.md` 标题、目录名、`hyperframes-plan.json` |
| 规格 | `src/config/videoFormat.ts`、`timing-manifest.json` | 同左 | `composition.html` 的 `data-width/data-height/data-fps`、`hyperframes-plan.json` |
| 技术栈 | 已确认项目根的 `package.json` | 同左 + OpenDesign 工具记录 | `package.json`、`hyperframes` 版本 |
| 章节/镜头 | `chapters.ts`、`timing-manifest.json`、`outline.md` | 同左 + `visualBenchmark` | `shot-manifest.json`、`hyperframes-plan.json` |
| 输出 | `project-state.json`、`output/render-result.json` 和其全部 `outputs[]`；旧版单输出 | 同左 | `output/hyperframes/` |
| 计时 | `output/metrics/stage-events.jsonl`（存在时）及已授权日志 | 同左 | 已有真实计时日志；不得假设一定有 wrapper |
| 字幕/TTS | `audio-segments.json`、`public/audio/`、`output/subtitles/` | 同左 | `audio-manifest.json`、subtitle 导出、mux 结果 |
| 验证 | `preflight`、`render:golden`、`render:smoke` | 同左 + `production:doctor` | `validate-*`、`hf:lint`、`hf:inspect`、`render.json` |
| 封面 | `output/cover/cover.png`、`cover-report.json`、`cover-metadata.json`、封面 PNG 交付物 | 同左 | 若项目有封面，读取用户指定封面、poster/thumbnail 输出和渲染日志 |

## 用户反馈提取

用户反馈是最高优先级证据。必须逐条记录，不要只总结。

优先来源：

1. 当前会话和压缩摘要中的用户消息。
2. 项目内 `feedback-log.md`、`feedback-events.jsonl`、`CHANGELOG.md`、`delivery-log.md`。
3. 文件差异：`script.md` vs `narrations.ts` / `hyperframes-plan.json` / `shot-manifest.json`。
4. 验收命令输出和错误日志。

筛选关键词：

- 视觉：`太小`、`放大`、`空`、`丑`、`像 AI`、`不像`、`雷同`、`没有变化`、`参考`、`质感`。
- 封面：`封面`、`首帧`、`抽帧`、`cover`、`thumbnail`、`poster`、`字太小`、`标题太小`、`不吸睛`、`不像参考`、`新版测试封面`、`参考视频封面`、`overlay`、`遮挡`、`背景太白`、`描边太重`、`主视觉`。
- 文案：`改`、`删`、`换`、`不用这么麻烦`、`太学术`、`说人话`。
- 音频：`音色不对`、`声音`、`TTS`、`字幕`、`不同步`、`太快`、`太慢`。
- 流程：`为什么`、`怎么没问我`、`直接做`、`卡住`、`不继续`。
- 审批：`OK`、`通过`、`可以`、`继续`、`不行`。

用户原话必须精确引用，保留标点和语气，并标明可用的来源/时间；摘要只保留转述时写“摘要转述”，不虚构原句、标点或时间。文件差异和命令输出是技术证据，不是用户反馈；与用户意图的归因须单独标注推断。敏感原话用明确的脱敏标记处理。

