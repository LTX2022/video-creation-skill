# 低上下文执行：把自由度交给工具，不承诺弱模型万能

这不是新默认路线。先读 `SKILL.md`；本页只在执行能力/上下文有限时按任务选用，**不要一次读完整 references**。脚本能减少选项、拒绝错误，不能证明模型理解事实或审美。

## 只选一条

| 实际需求 | 最小追加读集 / 动作 |
|---|---|
| 只做固定静音 cinema-title-card 片头，接受其示例标签、9秒/横屏/60fps | 本页下面的窄路线；生成后才读 `CINEMA-TITLE-BATCH-PILOT.md` 继续 |
| 已有获准模板，要填批量字段 | `LOW-COST-BATCH.md`；没有已审 adapter 就停在输入审核，不让模型改 TSX |
| 用户明确选择15秒产品流程示例 | `FIRST-VIDEO-AGENT.md`；仍需实现逻辑，脚手架不等于完成 |
| 任意新机制、复杂连续对象、实拍、音频、其他规格 | 回到 SKILL 的相应路线；能力不足时交回设计/实现审查，不偷偷替换成片头 |
| 旧项目修改 | 先只读 `workflow:status` 和相关输入；不重新 scaffold、不清空项目 |

## 一条可运行的窄路线

前提：用户确认独立输出位置、允许创建草稿，且需求匹配上表的固定片头。它不是视频渲染，也不是已获准样片复用。只需 Node 和现有 Bash；本命令不安装、下载、付费调用或渲染。

1. 把已核对来源的标题逐字放进用户允许的独立工作目录内 `request.json`。标题最多24个 Unicode code points，单行；超长/不支持字符则交回审查，不截断或删事实。安全 ID 必须以 ASCII 字母开头，总长1–64字符，后续只能使用 ASCII 字母、数字、`-`、`_`（`^[A-Za-z][A-Za-z0-9_-]{0,63}$`）；每项 ID 唯一。`opening`、`title-01` 合法，`01`、`_opening` 不合法。

```json
{"schema":1,"titles":[{"id":"opening","title":"清晨之前"}]}
```

2. 执行以下命令，替换为实际绝对路径。`new-draft` 必须不存在，其父目录已经存在，不能位于 Skill 内。使用已安装的 Skill，不猜仓库路径。

```bash
# 将占位路径替换成已核实的实际绝对路径；WORK 是用户授权且已经存在的独立目录。
SKILL='/absolute/path/to/installed/web-video-presentation'
WORK='/absolute/path/to/authorized-workspace'
node "$SKILL/scripts/prepare-cinema-title-draft.mjs" \
  "$WORK/request.json" "$WORK/new-draft" --draft-only
```

3. 读取 `new-draft/draft-report.json` 和 `new-draft/NEXT.md`。实际工程在 `new-draft/projects/opening/`；内容、三步显式时间表和组件 adapter 已接线。每项状态、输入/锁快照都会保留；不需要弱 Agent 手工枚举源码、计算数百个 hash 或编写 TSX。

**边界：** helper 只给当前本地实现建立 `anchor:null` 的未批准锁，hash不是审查方批准。它保留原片头固定示例标签，不能用来声称只显示用户标题。生成器仍执行既有输入门禁，所有批准保持 false；没有 MP4，`rendered:false`。只有实际播放、质量检查和用户确认后才能走原有正式交付，不把源码生成成功称为视频完成。

## 错误只修原因，不扩大自由度

- 创建前失败：保留原始需求和错误；纠正明确输入错误，不能自动改合同、文案事实、风格或输出规格。
- `blocked` / `not-started`：看每项错误，保留部分工程；不要删目录或把同一路径重跑当恢复。环境问题修复后，在新的已授权目标重试；旧证据保留。需要新安装/费用先取授权。
- 项目检查失败：停在首个错误，保留日志；修受影响输入/实现后重跑该检查及其下游。不要改 approved/accepted 字段绕过检查。
- 若脚本或实际画面仍有同一问题，不循环盲试；携原始输入、失败命令、日志、实际工程路径和未完成项交回审查。上下文恢复从这些文件开始，不重新生成整套设计。

## 证据，而非模型效果宣传

运行 `node --test scripts/test-low-context-draft.mjs` 可在独立临时空目录用真实 CLI 从短请求生成实际工程，验证固定540帧、独立状态、无安装/无成片、坏输入无副作用、重复运行拒绝覆盖、子进程失败保留证据。`scripts/test-cinema-title-batch.mjs` 另测真实 shot/timing/text 消费者。

这只证明工具路线及故障边界，不是任何低能力模型的评测：未测其选路、事实保真、遵循命令、视觉质量、成功率、成本或速度。真实模型适用性应单独记录模型/版本、任务、原始返回、修正次数、调用成本、最终媒体与人工结果；不能用合成 fixture 成功推导“很笨的模型也能做好任意视频”。
