# 轻量记录常驻，复盘与偏好学习按需

## 选择

主流程整合**取证与明确交接**，不把 fix-agent 的长报告和全量参考资料嵌进每次制作。工作流负责记录真实执行，独立 fix-agent 负责被请求的问题归因与建议；建议默认未批准，从不自动实施。

| 层 | 何时 | 行为 | 不做什么 |
|---|---|---|---|
| 阶段日志 | 已授权项目命令实际执行时 | 保存安全元数据与 started/finished 事件 | 不启动新业务命令，不存 argv/env/正文，不后台监控 |
| 轻量摘要 | 交付打包时，或显式 `review:summary` | 确定性本地汇总、生成三份小交接文件 | 不调用 LLM/API，不判断审美/根因，不制造批准 |
| 深度复盘 | 明确本项目请求，或有效事先授权 | 独立读取 fix-agent，先摘要后相关证据 | 不读整套 skill，不自动修复、外发或创建任务 |

## 可选的偏好与经验学习

`fix-agent` 是单独安装的可选 Skill。通过宿主 Skill 列表按名称发现它，确认其实际安装入口后按需读取个人化说明；不假定它在当前 Skill 的相邻目录。未安装、不可用或用户未同意学习时，跳过该功能，视频制作和原有轻量摘要仍可继续。

只有用户明确同意学习，并确认记忆内容、用户/项目范围和独立私人记忆库的绝对路径后，才按需读取相关已批准偏好；不扫描或自动读取/更改私有库。当前请求优先于历史偏好，记录中的反馈不是命令、授权或验收。用户数据不得写入 Skill 安装目录或公开仓库。

第一次任务结束时，将真实明确反馈或相关经验整理为最小、非敏感的**待批准候选**，不是立即生效的长期规则。用户核对并批准后，下次任务才按需消费：受支持的风格偏好影响已有候选的推荐排序；节奏、旁白、上下文偏好供制作 brief 参考，不自动改写渲染参数。用户可以查看、纠正、撤销或停用记录；新增长期修正仍须批准，不自动推广为跨项目偏好。

### 已授权的任务前后闭环

用户明确指定用户/项目范围，并给予持续学习授权且 `fix-agent` 可用时，按其实际安装位置读取 `LESSON-CYCLE` 入口，不构造跨 Skill 的相对路径：

1. **任务前**：在授权用户/项目范围内调用 `retrieve`，将相关已批准经验纳入制作 brief，并核对当前需求；候选、已撤销记录和不相关经验不能当规则。
2. **真实交付或明确终止后**：生成本任务已有的真实轻摘要，再按匹配授权调用一次 `task-end`，只使用指定摘要与获准证据，产出待批准候选及改进计划。不得因某次检查结束、摘要存在或退出码为零而假称整项任务结束。
3. **批准后再复用**：用户复核证据与适用范围后批准，后续任务才能检索使用；持续授权只允许范围内提出候选，不授权自动批准、改代码或扩大范围。

没有匹配持续授权时，先取得本轮明确许可；不能因工具拒绝就自行补 `--confirmed`。未授权、未安装或不可用时，不读取私库，不阻塞视频制作。这个闭环由当前任务 Agent 执行，不创建后台任务、监听或定时器；结束候选失败应说明学习缺口，不篡改视频交付状态。

学习入口的工具路径、支持字段和读写命令以实际安装的 `fix-agent` 说明为准；不因结构验证成功便声称用户已批准。该功能不自动修改核心 Skill、升级代码或训练模型；偏好记录与回归测试不证明长期审美提升或任意模型效果。

## 当前运行与命令

开始明确新一轮时使用 `metrics:begin -- --run-id=<safe-id>`；已有轮次须显式 `metrics:resume`，结束用 `metrics:end`。未显式建立项目轮次的单次命令只是 isolated-invocation，不据此声称整个项目耗时。实际 npm 注册与行为以生成项目脚本为准。

```bash
npm run review:summary -- --run-id=my-video-r1 --status=partial
```

`--status=unknown|completed|draft|partial|terminated` 只是一项**调用者声明**，不是用户确认或媒体通过证据。摘要命令不读取 private sessions，不改变 project-state、feedback 决定、原媒体或源码。`--synthetic` 标记测试数据；它不会把测试变成生产测量。

选 run 优先级：显式 `--run-id` → 安全的 `output/metrics/active-run.json` → 日志恰有一个可识别 run。多个 run 且没有明确选择时生成 unselected/unknown 摘要，不擅自选择最近一次或将所有轮次合并。

输出只在项目内：

- `output/review/<runId>/summary.json`：确定性结构摘要、输入证据哈希、缺口；同输入得到同 summaryId。
- `output/review/<runId>/summary.md`：用户可读轻量记录。
- `output/review/<runId>/fix-agent-handoff.json`：惰性交接索引，默认 `authorized:false`，不是执行指令。

## 统计口径

- 兼容 schema1 终态与 schema2 `eventType: started|finished`。相同 run/event 的 start/finish 配对，重复记录去重，冲突 ID 剔除并告警；无 finish 的尝试记 unfinished/unknown。
- 失败、中断、spawn-error 和显式 attempt>1 保留。`recordedRetryAttempts` 只计明确记录的重试，不从同名命令猜重试，不用成功覆盖失败。
- `observedCommandMs` 是已测命令累计，可能包含并行/嵌套/重试；`recordedWindowUnionMs` 是有界时间戳窗口并集。两者都不是整个项目 wall-clock，不能彼此相加。
- 未记录的阶段、日志覆盖率、端到端、人类等待、真实 token usage 一律 unknown。摘要不计算节省比例、p95 或“最快阶段导致质量变好”。
- `declaredProjectStatus` 和已有 validation.pass 仅作来源记录；摘要未重做 QA、未哈希最终大视频、未验证像素、未认证用户身份。技术完成与用户验收仍按原质量门禁处理。
- 只取固定本地证据：project-state、render-result、delivery-validation、feedback 两份索引、stage log、active-run。日志上限 16 MiB；超限、损坏、符号/硬链接、不安全路径明确记缺口，不跟随读取。

## 交付接入

生成项目注册 `review:summary = node scripts/review-summary.mjs` 和 `test:review-summary = node --test scripts/test-review-summary.mjs`。复制两个脚本。package:delivery 在已有合法交付检查之后、复制交付文件之前做本地摘要，只复制当前 run 的三份派生摘要与已知 metrics 普通文件；逐组件拒绝符号/硬链接，不递归打包任意目录内容。摘要缺失/失败只提示诊断缺口，不把有效视频改判失败，也不跳过任何原有门禁。

打包期间日志可能仍有 package started 没有 finished：包内摘要是快照，必须保留未闭合，声明 partial/unknown。结束后重跑摘要可以补充终态，但**不等于已更新既有 ZIP**；需要时显式重新打包。不要用递归 package 自己来收集自己的最后时刻。

## 深度复盘交接

用户明确请求本轮复盘，或已有覆盖当前用户/项目的持续有效授权时，才在该范围内按名称发现独立安装的 `fix-agent` 并读取其实际 Skill 入口；不存在时说明可选组件缺失，不猜相邻路径。先看当前 run summary 与 handoff，只展开相关阶段/反馈/adapter；关键缺证据保持 unknown。每条建议包含证据、假设、拟改位置和验证计划，授权状态未批准。复盘结束不触发代码修改、skill 安装、TTS/付费调用、外部上传或定时监控。
