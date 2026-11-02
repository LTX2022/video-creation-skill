# 反馈与验收证据

`project-state.json`是状态投影；`feedback-events.jsonl`保留事件，`feedback-log.md`给人读。状态位、退出码、脚本成功都不等于真实用户接受。

## 记录当前对象的决定

```bash
npm run feedback -- --type=shot-design-review --scope=project --quote="<看过当前分镜后的真实原话>" --resolution=accepted --source=agent-transcribed --source-declaration="转录自当前用户消息；未做宿主身份认证"
```

accepted/rejected/revoked都需真实quote、显式scope及source声明；有真实消息ID/链接时加`--source-ref`，没有则写入null，不编造。source可为agent-transcribed或user-supplied；synthetic仅测试夹具且不能满足生产门。来源声明不是跨宿主鉴权，本地可写日志也不是防篡改授权系统。

| type | scope / 额外参数 | 实际确认对象 |
|---|---|---|
| checkpoint-plan / shot-design-review | project | 已展示的规划/完整分镜 |
| chapter-anchor / chapter-review | chapter:<id>；--chapter=<id> | 实际渲染过的代表镜头/章节 |
| tts-choice | project；--provider/--voice按实际选择 | 已确认provider及内部voice/profile |
| subtitle-change | project | 当前字幕选择/预览 |
| golden-review | project | 当前revision的真实关键帧 |
| final-review | outputs | 当前revision全部请求输出 |
| alpha-edge-review | output:alpha；--target=<当前Alpha的SHA256> | 当前文件黑白边缘图 |

脚本写入`recordKind: user-decision`、decision、`subject.{gate,scope,digest}`及适用的contentRevision/artifacts，`source.{kind,reference,declaration}`。subject按当前实际文件派生，不让调用者手填摘要。按同gate/scope的**追加顺序**取最新决定；新拒绝/撤销覆盖旧接受，摘要变化为stale、旧无绑定记录为unbound，不回退寻找更早的accepted。

一次真实确认可对应已展示的一组范围，不拆成多次重复提问；但不可扩大到未看过的新内容、收费调用或发布。无语音/字幕/Alpha就不造对应事件。调整说明无需重渲，受审对象/范围改变仍需重核；变更影响见[PERFORMANCE](../PERFORMANCE.md)。

## 执行事实与人的决定分开

`gate-result`不能accepted。反馈命令手填command/status只记`declaredValidation`，不伪装observed execution；实际执行看命令产生的报告/媒体/哈希及可用的stage计时回执。golden的生成、展示、接受是不同事实。输入unknown、旧revision、文件被替换或缺终态均不得用布尔位补成通过。

`npm run workflow:status`只读汇总缺失/过期/待人审与下一步，不自动执行或授予权限。失败记录根因、修复范围和复验路径；禁止改写历史accepted或布尔位绕门。

可选定位中间帧停滞/突变：见 [TEMPORAL-REVIEW](TEMPORAL-REVIEW.md)；仅对指定本地 MP4/区间按需诊断，发现不等于视觉失败、exit 0 不等于通过或 accepted。
