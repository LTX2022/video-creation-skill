# 同任务小步对照与跨任务经验

## 研究与适用边界

借鉴 [Harness² 官方仓库](https://github.com/google-research/harness2) 与[论文 v1 §2.2–2.3](https://arxiv.org/html/2610.14224v1)：固定模型，在同任务上提出改动、对照执行、选择性组合，结束后保留有证据的经验。以下是本项目的保守适配，不是复现论文，也不保证论文的 benchmark 收益能迁移到视频。

**这是可选实验，不是每个视频都额外渲染。** 用户授权当前任务实验、相应执行和资源预算后，才能执行。现有沙箱、网络、批准和交付门禁始终不变；不沿用官方实验默认的 sandbox-disabled / unrestricted-network 配置。不安装 Harness² 或同类框架，不修改模型权重，不调用额外付费模型。没有真实比较证据就保留基线，不声称改善。

## 当前任务：提出 → 对照 → 选择性组合

1. 在获准目录固定当前 brief、素材引用、基线 Skill/项目版本和检查计划。只读取适用的已批准经验，并冻结本轮使用的清单；本轮不边试边把新推断写成已批准经验。记录原始基线，不覆盖。
2. 先声明一个可反驳假设、拟改文件、预计收益和可能退化。默认只做一次小步对照；增加候选或轮数前核对剩余预算与权限。可分别提出通用流程和视频领域候选，但不是必须同时执行两个。只生成 diff；具体核心 patch 的批准仍单独核对。
3. 在独立、非嵌套目录执行相同任务的基线和候选。固定输入、模型标识、工具/依赖版本、环境、检查集、评估器和可控随机种子。记录不可控制的随机性。保留真实 stage log、summary 和检查产物；有权执行的检查由原工作流运行，下面脚本从不执行它们。
4. 用 `task_probe.py` 输出字节绑定的技术对照。检查具体执行差异，不只看失败总数。总数下降但其他阶段失败上升会标 `recorded-stage-regression`。同阶段不同 check 的退化仍可能被聚合隐藏，必须审阅逐项日志和产物；无失败也不证明画面好。
5. 人工/Agent 按证据选择：保留基线、采用单一候选，或提出最小组合。记录每个保留/拒绝变更的证据、未知与回滚位置。**组合后的结果是新候选，必须重新执行相应检查；不能把两个单独通过的改动拼接后直接宣称通过。** 若无授权/预算或证据不足，停止实验并报告，保留最后已验证版本。
6. 需要视觉提升结论时仍做代表片段、连续播放、文本事实和必要音频检查，并保留用户确认。成本/速度比较需对应真实测量，不能从少一次失败推断更省钱。独立未参与提案的样例用于检查过拟合，不用它反复调候选。

## 可运行的只读对照

`task_probe.py` 与 `lesson_cycle.py`、`preference_memory.py` 保留在同一 scripts 目录。它不需要记忆根、lesson ID 或任务完成声明，因而可以在当前任务中使用；不创建偏好/经验、不批准、不修改项目。只向 stdout 返回 JSON。

```bash
python3 /verified/fix-agent/scripts/task_probe.py \
  --baseline-root /authorized/baseline --baseline-summary output/review/base/summary.json \
  --baseline-artifact output/check.json \
  --candidate-root /authorized/candidate --candidate-summary output/review/probe/summary.json \
  --candidate-artifact output/check.json \
  --case-set tests/cases.json --evaluator tests/check.py \
  --execution-context probe-context.json
```

两目录 `probe-context.json` 必须是完全相同、非空有效内容的受审阅上下文记录，建议记录 task/brief/input hashes、model ID、环境与工具版本、随机种子、预算和指标定义。不要含密钥、完整用户素材或私有 URL。**程序只比较上下文字节，不验证其 JSON schema、内容完整性或执行真实性**；不能用两个空文件伪称任务已匹配。评估器/测试集/上下文不同则拒绝，空/全空白上下文、摘要包含无效/冲突日志、缺真实终态/覆盖不足也拒绝。`--allow-synthetic` 仅用于测试；两侧 synthetic 标记必须是同一个布尔值，不能混合生产/合成证据。

结果包含 `regressedStages`、每阶段失败计数、两侧 summary/log/artifact/cases/evaluator/context 哈希。路径安全与 2 MB 输入上限沿用 LESSON-CYCLE。哈希不是签名，也不证明评估器真的运行或上下文记录属实。调用者需核对可信执行日志。此脚本不自动生成候选、合并代码、筛选画面或衡量审美。

## 结束后：积累证据，不继承批准

交付或明确终止后才走 [LESSON-CYCLE](LESSON-CYCLE.md) 的 opt-in `task-end → review → approve → retrieve`。用户可另行批准保存具体对照摘要/可复用改动的索引，但不要把整份素材、源码或日志复制进个人记忆。只提炼适用情境、变化、支持与反例、证据 ID/哈希、版本和下轮复验项；证据不足就不新增经验。现有结构化 schema 不接受任意自由文本，因此完整组合决策留在获准项目报告中，而不是强塞进 memory ID。

下次从当前受控 Skill 和当前需求开始，按情境检索已批准条目并重新提出适用改动；不自动继承上次候选、不把采用等同正确/通用，不把用户认可一段视频扩为全局规则。不扩大 project scope、不自动 approve 或授予渲染/发布/代码执行许可。纠正、撤销和忘记仍走原版本机制。
