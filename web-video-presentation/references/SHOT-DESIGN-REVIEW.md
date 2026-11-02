# 全片分镜与确认

先让用户看懂将制作什么，再投入正式制作。已有明确授权和参数应复用，不重复问；未展示过的设计不可用含糊“继续”追认。

## 最小提交

`shot-design.md` 给人看；`shot-manifest.json` 供项目检查。包含：

- 目标与受众；`videoProfile`、`outputMode`、width×height、精确 fps、时长/帧数。
- 是否音频/字幕/封面；主题；素材来源和缺项；最终目标软件及已知限制。
- 每镜头：命题、对象/语义身份、操作与可见结果、来源、必要基线/反例、命名节拍与hold、验收点；镜头为何聚焦/回全景，揭示了哪种关系。无必要时保持静态相机。
- Alpha/实拍：screen-space 或 tracking 需求；底片、fit/trim、时间原点、遮挡、保留音轨和禁遮挡区。局部前景约定实际bounds/字号，制作后用overlaySafety记录实际审图，不拿全屏覆盖率当角标目标。
- 开发模式写入 `project-state.developmentMode`：`sequential`（默认逐章）、`batch-after-anchor`（首章后顺序批量）或 `parallel`（首章后独立并行）。选择须包含在展示的计划与分镜中；旧 `postAnchorParallelDefault` 状态位不授予并行权限。

`script.md` 用于有声文本；静音素材可用视觉节拍。不能为 Alpha-only 追加无关口播。

## 确认记录

展示全片方案后用真实用户原话记录 `checkpoint-plan` 与 `shot-design-review`；可以对应同一次明确确认，不必问两遍。用户已看完整方案后的“按这个做”可确认；未见方案时不算。

```bash
npm run feedback -- --type=shot-design-review --scope=project --quote="<真实用户确认原话>" --resolution=accepted --source=agent-transcribed --source-declaration="转录当前消息；未做宿主身份认证"
```

首章/单段代表镜头实际渲染后记录 `chapter-anchor`。选择逐章模式时每章记录 `chapter-review` 并等用户反馈；批量/并行模式只有当前 `checkpoint-plan` 和 `shot-design-review` 都确实接受所选模式时才免去后续逐章提问，仍做首章锚点、golden 与全片最终检查。修改模式使计划/分镜确认失效；缺确认、旧默认位或 synthetic 测试记录不能放开门禁。已拒绝/撤销的后续章节仍须解决并重新确认，不能靠批量模式略过。无声则不需要 TTS 确认；无字幕则不伪造字幕预览事件。

调整颜色、间距或修 bug 不要求重走全片确认；新增/删除/合并章节、改变核心论点或输出范围时提交受影响部分。变更记录保留原确认与更新关系。
