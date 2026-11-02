# 验收：每个“通过”都要对应证据

只执行当前模式相关项；没有口播不检查 TTS，没有字幕不强加字幕预览，没有底片不能声称实拍通过。

## 四层证据

| 层 | 检查 | 不足以证明 |
|---|---|---|
| 契约/静态 | 来源、状态、step/registry、尺寸/时间、依赖、typecheck/build/preflight | 美观、运动成立、版权合法、用户已同意 |
| 图形/运动 | 首态/转折/结果/退出，连续帧、重复/乱序取样、hold | 最终编码媒体完整或目标软件兼容 |
| 编码媒体 | 文件、哈希、全程解码、codec/尺寸/fps/N/音轨、最终文件实际观看 | 所有编辑器兼容、实拍 tracking 正确 |
| 用户与使用场景 | 真实确认、Alpha 合成边缘、实际底片、目标宿主导入 | 未测试环境的保证 |

## 设计必查

画面解释命题；对象/操作/结果可辨，必要基线能区分变化；数字和状态同源，无假数据/素材。必要标签/单位/字幕保留，关键关系不被遮挡；手机尺寸可读且hold充足。“55%面积”“每屏都动”“至少N个部件”都不是动态解释或审美验收。

### 静态门禁与设计提示分开

- **阻断**：缺少必需工作流证据、非数值/越界比例、实际文字尺寸非正数、越出画面或字幕/禁遮挡区相交、隐藏字符、错误字段类型。竖屏 opaque 仍须真实填写 `mobileReadability.required: true`；有标签时填写实测 `minTextPx`，无标题不虚构 `headlinePx`。
- **提示待看**：55%视觉覆盖、竖屏80/120px、58/60/34/70%布局参考值及recipe的62%，不是通用最低验收线；低于参考值只触发review warning。`visualCoverage`仍须为0–1真实数值；手机实际观看、留白/安全区、hold与用户确认不能省略。画面主旨是文字或数据时可声明 `screenTextIntent: "editorial" | "data"`，必要对象标签用 `"labels"`，实际字幕用 `"captions"`；该字段说明意图，不构成批准。
- **文字**：制作指令、claim 和镜头说明不自动上屏；不默认追加 slogan 或重复副标签，保留内容必需的字幕、单位和条件。2–3条/12字是标签设计提示，不删除产品名、术语、单位、公式或已确认大标题来通检查。短词在口播中出现不等于字幕重复；有声/有字幕模式下，声明画面文案与旁白有明确长段逐字叙述重复仍阻断；显式captions与已请求字幕全文重复，短句也阻断。明确的editorial文字且未请求字幕时提示审阅；源码中出现文字只提示检查实际画面，不证明其正在显示。无标点的长文、短句、意译、动态拼接等无法由静态匹配全面判断，仍须审图/看全片。
- **已约定的精确门槛**：仅把真实已确认分镜要求写为 `layoutRequirements: {basis: "user-approved-shot-design", reason: "具体需求依据", minimums: {visualCoverage: 0.4, minTextPx: 48}}`。支持 `visualCoverage`、当前模式的 `minTextPx`（`overlaySafety` 或 `mobileReadability`），及 `mobileReadability` 的 `headlinePx/primaryVisualCoverage/primaryVisualWidthRatio/primaryVisualHeightRatio/safeFrameUse`；未满足声明的数值仍阻断。该对象不证明用户确认，不替代revision绑定的工作流证据；禁止为通门禁捏造批准或测量值。

知识卡片额外检查stage/card比例分离、短/长标题和非默认画幅、最小字宽/安全区；批准静态内容布局后不借动画暗改文案。透明资产与带底预览的角色/路径不得串线。

## 技术与时间

- 文案/步骤/音频索引一致，实际音频时长驱动有声 timing。
- 帧与媒体时间一致，无暗中重复尾帧、缺帧、冒头音轨；乱序seek与重复渲染一致。跨step对象检查步界前/当/后三帧和完整动作连续段，不能只验局部帧重启后的新入场。
- Studio 与最终输出复用实现；最终结果不得用旧 golden frames 替代。
- CSS/Canvas/WebGL 异常先定位源头，静态 regex 只是风险信号，不当视觉事实或版权结论。

## 按模式追加

- `videoProfile`提供默认值，不覆盖已明确约定的画幅、`audioRequested/subtitlesRequested/coverRequired`布尔选择。偏离平台默认项提示复核；真实config尺寸不一致、缺显式契约、缺工作流确认与请求内容的最终检查仍阻断。
- **opaque/composite**：确认实际字幕状态与 metadata 一致；声音/字幕请求才检查对应内容；短视频封面按项目约定。
- **alpha**：实际透明与可见内容统计、音轨为零、黑白灰/复杂底边缘、半透明阴影、首尾 handles。`yuva` 不是单独通过条件；[Alpha 规范](ALPHA-COMPOSITING.md) 的 hash 绑定边缘人审必须满足。
- **composite/both**：本地底片授权/时间映射/适配/音轨、真实画面禁遮挡区。没有真实底片只能命名 synthetic/composite-test，不能实拍验收。
- **tracking/matte**：需实际实现与整段验证；当前内置 screen-space 合成不提供这些保证。

局部前景的 `overlaySafety` 是 `alpha/composite/both` 共同门禁：真实归一化bounds、真实覆盖率（不超过bounds面积）、有标签时实际 `minTextPx`，以及在目标背景上审过可读性/边缘留白的记录。证据须为output/下存在的PNG/JPEG/WebP，字段见 [Alpha规范](ALPHA-COMPOSITING.md)。不强行放大角标来套用opaque全屏参考比例，不伪填coverage/reviewed。文件存在和flags为true不是审图证据本身；全片运动、实际底片与Alpha边缘用户确认仍分别验证。

## 状态与报告

明确区分 `draft`、技术通过、人工待审、最终验收、失败。列出实际运行命令/版本、输出路径/哈希、通过项、未测项及阻断。草稿 smoke、partial frames 和 `--acknowledge-draft` 不满足 final。用户确认只能来自真实会话，不能为了通门禁模拟 accepted。

修复影响 timing、字体、素材、图层或编码后，重跑相关检查并更新证据。失败可在授权范围内修复重试；遇授权/素材/工具能力阻断就如实说明，不伪造降级结果。

可选定位中间帧停滞/突变：见 [TEMPORAL-REVIEW](TEMPORAL-REVIEW.md)；仅对指定本地 MP4/区间按需诊断，发现不等于视觉失败、exit 0 不等于通过或 accepted。
