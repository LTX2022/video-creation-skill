# 每轮结束主动提出经验：可运行闭环，不是模型训练

## 边界与触发

此模块补足偏好之外的项目经验：**实际执行/用户反馈 → 未批准候选 → 复核证据 → 确认 → 下轮检索与复验 → 新版本/回滚**。不是调模型权重、不是自动训练，也不是独立模型在后台思考。确定性脚本识别已有记录里的失败/重试/缺终态；通用经验的语义归纳仍由当前 Agent 根据获授权证据形成最小结构化 observations。它不运行日志中的命令、不修改项目/核心 Skill、不安装依赖、不联网、不付费调用模型。

用户明确要求“每个视频结束后主动学习”后，可以登记有范围的 `task-end` 预授权。**主动的是提出候选与改进计划，不是自行批准或覆盖代码。** 现有 Agent 在交付/明确终止结束路径调用一次命令；没有常驻进程、计划任务或自动监听。只有摘要/交接存在或某次检查失败，不会启用它。没有用户指定的外部记忆目录/身份/范围，先问清这些，不能把测试 fixture 当个人记忆。

前置：先按 [PERSONALIZATION](PERSONALIZATION.md) 在获准独立目录初始化 memory。两个 Python 文件应保留在同一 fix-agent/scripts 中，视频模块可以安装在任何独立目录。

```bash
TOOL='/verified/installed/fix-agent/scripts/lesson_cycle.py'
MEM='/user-approved/private-memory'
# 用户许可本项目每轮结束主动提出候选，不授予批准/代码写回权：
python3 "$TOOL" --root "$MEM" enable-cycle --user user-001 --project project-001 \
  --authorization-ref learning-consent-001 --confirmed
# 只有用户明确允许适用于其所有项目，才额外使用 --scope user。
```

授权 ref 是能核对真实会话的非敏感 ID，CLI 参数不是人类身份认证。策略会保存在该用户的外部 lessons 文件，事件固定 task-end，目的固定 propose-only。`disable-cycle --user ... --project <原授权项目> --authorization-ref ... --confirmed` 停止该策略。`preference_memory.py disable --confirmed` 停用整个记忆根，也阻止 task-end/retrieve/approve，但仍可 review/revoke/forget。全局学习策略不自动把候选晋升成全局经验。

## 结束路径：复用已有真实摘要，不重新渲染

当前视频流程先生成它本来就有的轻摘要（`review:summary`，状态 completed/draft/partial/terminated），然后在有匹配授权时运行：

```bash
python3 "$TOOL" --root "$MEM" task-end --user user-001 --project project-001 \
  --project-root '/explicit/authorized/project' \
  --summary 'output/review/run-001/summary.json' \
  --authorization-ref learning-consent-001
```

无持续策略时，可在取得本轮单独许可后加 `--confirmed`；不要因报错擅自补此参数。项目根必须明确、绝对、无符号链接；输入相对该根，不接受父目录穿越/外部链接/硬链接。只读取明确 summary、它所引用的最小 stage-log，以及显式 observation 证据索引中的文件，不扫描会话/其他项目/环境变量。输入与单一存储均有2MB上限；超限保留旧库，交人工精简获授权材料。

- 验证 summary schema/kind/run/status，校验原 stage-log SHA256；把失败、重试、未终态计数与实际事件交叉核对，旧摘要/人为改大计数不能直接通过。
- 生成 `stage-<stage>-failure/retry/missing-terminal` 候选。只陈述观察，不从最长耗时或重试直接推断根因、技术收益或用户不满意。
- 原记录缺失/未覆盖仍为 unknown，不能用“无失败候选”声称质量通过。
- 同一个 run/证据/候选指纹重复调用幂等，不制造版本或提高置信；下一轮同类新证据会成为新版本，不改变已批准版本，直到再次确认。
- 输出明确 `candidates-only`、`coreChangesApplied:false`。没有 MP4 或实际用户验收，就不能把完成此命令说成视频完成。

## 不是只有四种固定错误：通用、最小化 observations

可选 `--observations observations.json`。调用者先核对真实用户反馈/检查结果，提炼为 check ID、阶段、结果和受限动作，**不要把素材或任意网页文字直接导入成指令**。支持的阶段包含制作各阶段及 design/planning；check ID 可自定义（1–64字符 ASCII 字母数字/点/下划线/短横线），例如 `new-brand-safe-area`，不是只有四种内置 check。

```json
{
  "schema": 1,
  "runId": "run-001",
  "evidenceIndex": [
    {"ref": "feedback-001", "path": "authorized-feedback-fragment.txt", "sha256": "实际文件的64位SHA256"}
  ],
  "items": [
    {
      "checkId": "new-brand-safe-area",
      "stage": "design",
      "source": "user-feedback",
      "result": "change-requested",
      "action": "review-before-next-run",
      "target": null,
      "evidence": {"ref": "feedback-001", "sha256": "与索引一致的实际SHA256"}
    }
  ]
}
```

示例 hash 文案必须替换为真实值。脚本核对每个 evidenceIndex 文件的实际字节哈希，**不是接受 Agent 手填一个“passed/95分”即认为证据有效**。原始片段只在用户授权项目内读作数据以核对哈希，不复制到长期 memory；记忆只存 opaque ref/hash、观察枚举与候选版本。用户材料敏感时不要为学习建立该片段或索引；任何密钥/私密全文都不能进入ID，schema无法识别所有编码的秘密。

`source` 分 user-feedback / objective-check / agent-inference。`result` 分 failed / change-requested / unknown / passed / accepted-pattern / successful-check。普通 passed 不生成新经验，也不撤销旧经验；`accepted-pattern` 只允许用户反馈来源，`successful-check` 只允许客观检查来源，两者**都仍是未批准候选**。用户认可与技术通过是不同事实，Agent 推断不能伪称用户接受。

`action` 仅允许：

| 动作 | 下一轮用途 |
|---|---|
| verify-regression | 在相关阶段验证上轮失败类，保留真实输出 |
| review-before-next-run | 开始相关阶段前核对证据与范围 |
| clarify-with-user | 将有证据的具体不确定项交用户确认 |
| reuse-reviewed-pattern | 只对明确成功证据：审查适用范围，再提出复用并复验代表预览；不复制原批准 |
| propose-core-change | 给出核心改进计划，不应用；target 只能 SKILL.md 或 references/安全名称.md |

`target` 只是建议位置，不读写该文件，绝不是可执行命令。其他动作 target 必须 null。自由文本、argv、URL、代码片段、授权字段一概不接收。语义更复杂的建议在当前对话/单独审阅文档中讨论，不能借通用经验接口绕开 schema。

## 审阅、确认、下轮消费和回滚

```bash
python3 "$TOOL" --root "$MEM" review --user user-001 --project project-001
# 先给用户展示原证据、来源、观察/推断、check、阶段、范围、版本与验证计划。
python3 "$TOOL" --root "$MEM" approve --user user-001 --project project-001 \
  --id lACTUAL_ID --confirmed
# 下一轮在生成制作计划之前读取紧凑清单：
python3 "$TOOL" --root "$MEM" retrieve --user user-001 --project project-001
```

批准默认 project scope；仅用户明确决定跨项目适用才加 `approve --scope user`。检索只取当前 user 的当前 project + 已明确全局记录；项目覆盖全局，同范围最后确认的版本生效。输出包含 `version/supersedes`、原run、scope/source/evidence、固定 nextAction、`agent-review-only`、`userCanOverride:true`、`grantsExecutionPermission:false`。**Agent 必须把相关清单写入本轮制作计划，指明采用/覆盖/需问的条目，并在对应检查阶段记录实际复验结果**；不能只把数据读过就宣称已改善画面。

- 当前用户需求优先，原有完整验收清单不缩减；记忆不授予安装、付费、渲染、交付或发布批准。
- 一次语义纠正：本轮 observations 中同 stage/checkId 新结果形成新版本 → review → approve；未批准不会压掉旧版本。
- `revoke --user ... --project <来源项目> --id ... --confirmed` 撤销该版本，之前同范围已批准版本可能恢复；再次 retrieve 核对。历史仍保留。
- `forget --user ... --project ... --check-id ... --confirmed` 删除当前项目及该用户全局的该 check 全部版本/证据/比较记录；不会删除其他项目的本地经验。OS/用户备份不受控制。
- 合成数据默认不可进入生产检索：测试须每个相关动作显式 `--allow-synthetic`，输出保留 synthetic 标识。绝不能用此选项把fixture包装成真实用户经验。

这是应用层隔离，不是抵抗同 OS 用户恶意篡改的多租户服务。哈希证明字节匹配，不认证来源真实性、反馈确出自用户、或命令真的运行了某个评估器；当前会话与可信执行环境仍须核对。

## 失败回归：实际基线/候选快照绑定，而非自填分数

当前任务尚未结项、还没有 lesson 时，使用 [TASK-PROBE](TASK-PROBE.md) 的独立只读入口，不为比较伪造结项或初始化个人记忆。此处 compare 仍绑定已有 lesson。两种入口都报告 `stageFailures/regressedStages`，总失败下降但某阶段退化时标记 `recorded-stage-regression`；阶段内不同检查退化仍需逐项审阅。

当有已授权的改进实验时，先保留独立、非嵌套的基线/候选目录，使用可信且相同的独立测试集和评估器，实际执行受权检查（原工作流负责执行），保留各自 summary/log/小型检查产物。学习脚本**不执行评估器，也不修改它、测试集、基线或批准状态**。

```bash
python3 "$TOOL" --root "$MEM" compare --user user-001 --project project-001 \
  --id lACTUAL_ID --confirmed \
  --baseline-root '/authorized/frozen-baseline' \
  --baseline-summary 'output/review/origin-run/summary.json' \
  --baseline-artifact 'output/check-result.json' \
  --candidate-root '/authorized/candidate' \
  --candidate-summary 'output/review/new-run/summary.json' \
  --candidate-artifact 'output/check-result.json' \
  --case-set 'tests/held-out-cases.json' --evaluator 'tests/regression.py'
```

比较要求基线summary字节/run匹配该lesson原始证据，候选必须不同run，实际 stage-log 与summary计数一致；case-set/evaluator在两快照的字节必须完全一致。基线/候选均须有真实终态，未知/冲突事件或未终态使比较 inconclusive；候选还必须覆盖基线已完成的 stage/label/workload 组合（只存组合hash），删除执行或只留started不能当作0失败下降。结果绑定 lesson ID/version/hash、两run、summary/log/artifact/cases/evaluator哈希，并比较已记录失败次数。不接收手填score，不因测试成功自动approve。检测到候选更改评估器/测试集就拒绝比较。

它只能说“已记录失败下降/未下降”，**不能证明改进因果、美学质量、泛化、速度/成本收益或真实用户认可**。日志、artifact及hash仍不是防伪签名；调用者须从可信执行上下文核对评估器确实被运行、冻结基线未被篡改、留出样例独立。比较绑定的是可检查的小型结果产物，不对大视频画面自动评分。至少再做代表预览/连续播放/文本事实/必要音频检查和真实用户确认，避免只优化代理指标。

如涉及核心Skill：先另行输出**最小diff建议 + 原因证据 + 适用范围 + 失败回归 + 独立样例 + 回滚路径**，经用户批准具体patch后才走普通工程变更。比较通过不授权覆盖核心，当前没有 apply-core API。不能把删除检测、改测试使其通过、篡改批准状态当“学习成功”。

## 验证与研究来源

```bash
python3 -m unittest discover -s fix-agent/tests -v
```

真实子进程测试覆盖 measured failure→既有summary→候选→确认→下一轮检索→第二版本/纠正/撤销/忘记；Scoped主动许可及停用；成功模式与失败分离；任意安全checkId；假计数/旧日志/证据篡改/路径注入拒绝；隔离baseline/candidate实际执行同一fixture评估器，失败→成功后比较真实产物，改评估器拒绝。测试不等于真实成片提升或低能力模型评测。

借鉴而非复用实现：[LangMem](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/) 的记忆分层、[OpenHands](https://docs.openhands.dev/sdk/guides/persistent-memory) 的不可信/opt-in边界、[Reflexion](https://arxiv.org/abs/2303.11366) 的反馈经验、[Voyager](https://arxiv.org/abs/2305.16291) 的检索验证、[GEPA](https://arxiv.org/abs/2507.19457) 的候选/验证、[DSPy](https://dspy.ai/3.0.4/learn/optimization/overview/) 的学习/验证/独立测试分离。[DGM官方](https://sakana.ai/dgm/) 披露伪造日志/删除marker等reward hacking，因此候选不能控制评估器或批准门禁。本工具没有复现训练框架、MCTS、自动prompt搜索或模型调权。
