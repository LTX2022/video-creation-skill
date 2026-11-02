# 可选的运动方向契约

适用于需求较多、来源→目标变化难讲清、多人协作或设计容易漂移的镜头。**不是每次修改的必填表**：改间距、换一句文案、修一个已明确的动作，直接修改并验证受影响部分即可。不新增审批轮次，也不把既有 `shot-design.md`、反馈事件和时轴再复制成三套 S/X/E 表。

## 用一份小记录把设计接到证据

可按需复制 [motion-direction.example.json](../templates/examples/motion-direction.example.json) 为项目根的 `motion-direction.json`。包内例子是 **SYNTHETIC / 未渲染 / 未审图**，不是生产证据；数值、字体和配色只是演示，不是新默认。真实项目应替换内容并明确 `synthetic: false`。

- `requirements`：只列容易丢失、影响验收的要求；保留用户给出的具体数值和出处。状态为 `planned / implemented / verified / blocked`，`verified` 必须附证据引用和观察，不能把写完代码当看过画面。
- `direction`：需要新方向时才写；配色具体到角色/色值，文字具体到角色/字体/字号，留白写边距/间隔及理由，运动写动作含义、缓动、时长和 hold。不是“高级、电影感”几个形容词。已有方向就复用，不为填表发明另一套。
- `objects + transformations`：需要解释变化时才写。给对象稳定语义 ID，列源状态/时刻、目标状态/时刻、发生机制和保留什么。每次转换链接有关要求；不要靠两个无关画面交叉淡化伪装“同一对象变化”。身份也可代表一个明确的语义组，但不能据此声称任意拓扑 morph 可行。
- `keyframes`：先看起态、首个完整构图和收束态；复杂动作加关键转折，不机械增加固定张数。先稳住层级、比例、留白和对应关系，再铺运动。静态修改可只记录受影响帧。
- `review`：只写实际看过的素材、真实时间戳、具体观察和问题。待审保持 `unreviewed`；看了一部分用 `in-progress`；记录完成用 `reviewed`。问题记时间、现象、开放/解决状态；“解决”须有修复后的证据。

以既有 project-state、timing 和分镜为准；本文件只是选用的索引，不变成第二套时轴或批准记录。需求来源可以直接引用分镜/当前确认内容；不要为了此文件重复请求已给过的授权。范围变化、真实用户确认和最终审批仍走 [SHOT-DESIGN-REVIEW](SHOT-DESIGN-REVIEW.md)、[FEEDBACK-EVIDENCE](FEEDBACK-EVIDENCE.md) 和既有质量门禁。

## 最小 schema 1

必需：`schema: 1`、明确的 `synthetic` 布尔值、`label`、`scope`、非空 `requirements`。其余整节均可省略。direction 内各子块也按需省略：纯图形无文字不需要 type，局部改色不强迫填写 motion；一旦提供某子块，其内容仍须有效，不能用空数组假装已设计。字段名严格检查；新增自定义字段需先更新 schema/校验器，而非悄悄忽略拼写错误。

| 节 | 字段 |
|---|---|
| `scope` | `durationSec`（有限正数）、`audioMode`（`none/provided/tts`）、`outputMode`（`opaque/alpha/composite/both`） |
| requirement | `id, text, required, status`；`blocked` 需 `reason`，`verified` 需非空 `evidence` |
| `direction.palette` | 非空 `{role, value}` 数组，色值 `#RRGGBB` 或 `#RRGGBBAA` |
| `direction.type` | 非空 `{role, family, sizePx, weight?}` 数组；字号为正数，weight 如填写为 1..1000 整数 |
| `direction.whitespace` | `safeInsetPx, gapPx, rationale`，数值非负 |
| `direction.motion` | `behavior, easing, durationSec, holdSec`；允许静态/零时长方向，不强制 spring |
| `direction.bans` | 可选字符串数组，只记本项目真实禁用项 |
| object | `id, meaning` |
| transformation | `id, objectId, source:{atSec,state}, target:{atSec,state}, mechanism（字符串）, preserve（字符串）, requirementIds（ID 数组）` |
| keyframe | `id, atSec, purpose, requirementIds` |
| `review` | `status, samples, issues?`；状态为 `unreviewed/in-progress/reviewed` |
| sample | `id, kind, atSec, endSec?, result, evidence, requirementIds?, keyframeIds?, issueIds?` |
| issue | `id, atSec, description, status`；`resolved` 还需 `resolution, evidence` |
| evidence | `{artifact, note, atSec?}`；artifact 是文件/报告/来源引用，note 写实际观察；工具不打开它 |

所有定义 ID 全文件唯一（建议 `req- / obj- / move- / kf- / review- / issue-` 前缀），引用必须存在且类型匹配。转换时刻满足 `0 <= source < target <= durationSec`；关键帧、问题和实际观察时刻满足 `0 <= atSec < durationSec`。片尾边界不是一帧；最后可采样帧用本项目真实帧数和 fps 计算，不硬编码帧率。

sample 的 `kind` 为 `keyframe / motion-strip / segment / full`，`result` 为观察者声明的 `pass / issues`。静帧只对应一个实际时间；其余类型需 `endSec > atSec`，`full` 声明需覆盖 `0..durationSec`。关联关键帧和问题的时间必须在该观察点/区间内。至少关联一个要求或关键帧；有问题须链接 `issueIds`，不能一面填 pass、一面藏开放问题。只看静帧不算看过转换连续性，转换还要有覆盖其区间和相关要求的运动样段记录。

## 实际审图怎么记

计划帧和实际取样不同，应按真实帧时刻校正计划记录或另加实际关键帧；不要把计划秒数直接复制成“已审”。先运行既有 golden / motion strips / review segment，再看实际画面；Alpha 叠加到目标底片以及明暗测试底检查边缘、遮挡和可读性。示意记录如下，**不是可直接冒充已审的证据**：

```json
{
  "id": "review-move", "kind": "segment", "atSec": 1.2, "endSec": 2.4,
  "result": "issues",
  "evidence": [{"artifact": "output/review/move-v2.mp4", "note": "实际看过后填写：发生了什么，是否读得懂。"}],
  "requirementIds": ["req-identity"], "keyframeIds": ["kf-target"],
  "issueIds": ["issue-label"]
}
```

其 `issue-label` 还应在 `review.issues` 定义真实发生时刻、具体问题和状态。修复后保留问题链并补新证据；没有看过、文件缺失或还未解决就继续 pending。不要使用固定“8 分及格”、自动美学评分或自称专家评审来替代观察与用户选择。

## 只读检查命令

在生成项目中：

```bash
node scripts/check-motion-direction.mjs motion-direction.json --json
node scripts/check-motion-direction.mjs motion-direction.json --require-reviewed
node --test scripts/test-motion-direction.mjs
```

在 skill 源包中：

```bash
node templates/scripts/check-motion-direction.mjs templates/examples/motion-direction.example.json --json
node --test templates/scripts/test-motion-direction.mjs
```

无需 npm 安装或外部依赖；仅使用 Node 内建模块。不读网络、不打开证据路径、不写 project-state 或反馈事件。只读取明确传入的 JSON（上限 2 MiB）。

- 默认退出 **0** 仅表示结构有效，仍可能 `status: pending`；退出 **1** 是结构/输入错误。
- 可选 `--require-reviewed` 将未解决 required 要求、未结束审图、未覆盖关键帧/转换或开放问题返回 **2**。这是记录完整性检查，不是视频交付门禁，也不默认加入每次渲染。
- 记录完整时显示 `recorded-review-complete`，**不显示“美学质量通过”**。所有结果都有 `notAnAcceptanceRecord: true`；真假证据、字体可用性、画面质量、帧级渲染、音轨与 Alpha 正确性均仍须实际检查。纯文本“verified”或证据路径不能认证任何人的审核。

保留音频 `none/provided/tts` 分支；不强制加音乐、旁白、音效、字幕、固定 fps 或有色全屏底。Alpha/实拍的半透明阴影、遮挡及安全区仍按 [ALPHA-COMPOSITING](ALPHA-COMPOSITING.md)、[LIVE-ACTION-OVERLAYS](LIVE-ACTION-OVERLAYS.md) 判断；此契约不代替这些测试。

## 来源与采用边界

概念参考 [deepseek-opus-motion-skill 的实际 SKILL](https://github.com/8533502-dev/deepseek-opus-motion-skill/blob/main/motion-design-prompt-generator/SKILL.md)：需求可追溯、设计契约、来源→目标转换、关键帧先行、带时间戳的问题复核。本页和校验器是围绕现有工作流的原创压缩实现，未搬运其整套阶段表、代码或文档段落；不是已运行/验证该项目的视频后端。没有采纳绝对禁止提问、禁止 sequence、默认声音或固定评分线等不适合本项目的限制。未来如实际复制上游材料，应先核验对应版本许可并保留所需声明；本次概念借鉴不声称覆盖第三方字体、素材或视频的权利。

完整章节集成练习见 [motion-customer-smoke](../examples/motion-customer-smoke/README.md)。它已做生产入口打包和模型/SSR 检查，未渲染、未获得用户成片验收；不要复用其中的待审状态当批准。
