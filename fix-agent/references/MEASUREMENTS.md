## 实测耗时、估计与并行口径

优先消费已有 `output/metrics/stage-events.jsonl`，不因为日志缺失自动运行命令。v3.2 支持 schema2 start/finish 生命周期，也读取 schema1 单行终态。轻量 summary 是索引，不是最终验收。schema1 字段如下：

```text
schema: 1
runId, eventId(UUID), stage, label, attempt(>=1), workloadId(string|null)
status: success | failed | spawn-error | interrupted
exitCode(number|null), signal(string|null), elapsedMs
startedAt, finishedAt（ISO 时间来源）
measurement: observed-command
command: 可执行程序 basename；errorCode 可选，仅 OS 错误码
```

stage 枚举为 `setup/assets/audio/timing/typecheck/build/preflight/qa/render/validate/cover/package`。只用已有授权日志；不采集 argv、env、正文或凭证。

schema2 同一次尝试以相同 runId/eventId 追加 `eventType: started|finished`。started 的 status=running、elapsedMs/finishedAt/exitCode=null；只有 finished 提供实测终态。`scope: project-run|isolated-invocation` 用来区分显式项目轮次和单命令范围，不能将 isolated-invocation 误当整轮。允许先读 `output/review/<runId>/summary.json`，再定位涉及事件；摘要存在不授权重跑或修复。

### 读取与状态

- 按 schema 解析，同 runId/eventId 的 started 与 finished 配对，完全重复记录去重；同 ID 内容冲突、截断行、未知 schema、负数/无效耗时、缺失终态应列缺口，不静默按成功处理。
- `elapsedMs` 是 monotonic 实测命令耗时；ISO 起止用于时间来源与观察窗口。不能把单命令耗时说成 agent 思考、人类劳动或整个项目耗时。
- 成功、失败、spawn-error 和 interrupted 全部保留；signal 代表中断证据，不必然证明用户主动取消。用户取消需真实会话/事件证据，项目取消与命令中断分列。其他 adapter 的 canceled/cancelled 按其已知字段保留，不能误映射为成功。
- 以 runId/stage/label/workloadId（可空）及显式 attempt 关联同一逻辑工作负载的重试；多次成功尝试仍不是多个逻辑阶段，只凭命令名相同不能判定重试。记录失败原因与最终结果，成功重试不能覆盖失败历史。
- wrapper 对 SIGINT/TERM/HUP 只尽力转发直接子进程；SIGKILL、机器丢失、写入失败可能无终态日志。缺记录为 unknown，不是0或成功。

### 时间汇总

| 口径 | 规则 |
|---|---|
| 项目端到端 wall-clock | 需明确项目起止或外层编排测量；否则 unknown。绝不以各阶段 elapsed 求和替代。 |
| sumAttemptMs / 已测命令累计 | sum 去重后所有有效终态 elapsed，包含失败、重试、中断；注明可能有并行重叠、只是命令占用，非实际人工工时。 |
| 已测观察窗口 | 可靠起止记录可展示 earliest→latest；仅覆盖已记录命令，含中间空档，不是项目总耗时；时钟异常时不可算。 |
| 渲染 | 区分 smoke/draft/final、alpha/composite；记录实际耗时，无依据不附加“+5分钟”。 |
| 重试 | 属于原阶段累计的子集；列成本与原因，不在总数上重复加一次。 |
| 用户等待/审批等待 | 需明确请求—回复或人工标记；无数据 unknown。可能与后台渲染并行，不把无日志空档全算等待。 |
| 审美返工 | 需反馈+修改/shot证据；可横跨实现和渲染，不与这些时间重复相加。 |
| 流程违规损失 | 需违反规则及额外工作的证据；不能可靠分离则 unknown/定性，不套经验罚时。 |

真实input/output/cached-input token usage缺失写unknown；read bytes/工具返回bytes/读取次数是代理指标，不从文件大小外推token节省或速度。

未测阶段、规划、用户等待、反馈缺口均写 `unknown`，不得填0。只有实际记录测得0才可写0。显式估计须标 `~范围`、依据、假设和覆盖范围，与实测单列；没有依据则不估计。不再默认使用“每章30–45分钟”等固定区间。预计优化收益不能写成已经节省的时间。

### 合成 stage-events 的口径检查（仅示例，不运行命令）

以下为刻意构造的测试夹具，**不是任何真实项目的耗时或用户反馈**。三个事件均带 `schema: 1`、`measurement: observed-command`、不同 eventId、同 runId；其余字段按契约填写。

| label / attempt | 起止（相对同一起点） | elapsedMs | status | workloadId |
|---|---|---:|---|---|
| alpha / 1 | 0–10秒 | 10000 | success | alpha |
| composite / 1 | 0–5秒 | 5000 | failed | composite |
| composite / 2 | 5–13秒 | 8000 | success | composite |

正确的合成报告：已测命令累计 `23000 ms`；在该夹具时间源一致前提下观察窗口为 `13000 ms`；composite 两次尝试累计 `13000 ms`，其中重试为 `8000 ms`，不能再额外加到23000。真实项目端到端、人工工时、用户等待均 `unknown`。在合成夹具中追加一条 `interrupted` 记录时保留其耗时和中断状态；只有用户取消证据时才写用户取消。复制某 eventId 不得重复累计。

这段只是报告阅读/计算的合成验收用例，不触发渲染、重试、自动修复或任何外部后续动作。

