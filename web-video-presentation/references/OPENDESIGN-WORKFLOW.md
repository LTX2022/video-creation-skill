# OpenDesign / 设计资产交接

这是现有 Remotion 制作中的可选视觉设计环节，不另建一套录屏/网页发布管线。工具可用且获授权时适合复杂主视觉、知识卡片、品牌插画、空间草图；精确数据和已提供真实产品画面不让生成工具重造。工具不可用不阻塞原创 SVG/Canvas/现有合法素材路线。

## Brief

写明 claim、对象/关系、事实来源、哪些内容不能改；style tokens（字体/色彩/边线/质感，比例注明相对cardWidth或min(width,height)，设置单位和上下限，不误用vw）；**stage width×height/aspect 与 card/asset aspect 分开**；使用场景、镜头时长、Alpha/不透明目标、字幕/实拍禁遮挡区；期望图层和许可约束。不要只给“高级/科技/好看”。

知识卡片先有可读静态样张，再按语义拆成标题/对象/证据/关系/注释等层；需要用户选风格时先确认样张，已确认同一套样式无需每张重复问。字体、字宽、长内容、亮暗底都要看，不能把响应式缩放当任何画幅都可用。

## Handoff

在 `open-design-handoff.json`、asset manifest 或 shot notes 记录工具/项目、brief、源与导出路径、图层角色、尺寸/比例、透明范围、授权/占位状态、将如何按帧实现。`open-design-handoff.json` 是交接记录，不保证已有自动验证器读取全部字段。

不要只交一张截图后假称可编辑分层动效。能提供 SVG/独立资产/结构化设计时保留；只有扁平PNG只能整体平移/缩放等，内部讲解需保留DOM/SVG/独立图层，不能声称PNG已有可编辑层。透明资产与审阅合成在handoff分别标为 `transparent_asset` / `preview_composite`，避免把带底预览接入透明前景。网页返回的 hover/RAF/CSS animation 要按 [WEB-TO-VIDEO](WEB-TO-VIDEO.md) 重构，不能作为第二套导出时钟。

## 静态到动态

动画按解释语义选择：关系用路径，状态用转换，对照用共同基线，逐层揭示用于降低阅读负担。静止阅读 hold 合理，不要求所有卡一直动或一律 MOV。透明素材与审阅合成分开：母版无棋盘/背景；preview 可带底，文件类型与真实Alpha验证对应。

交接后在当前 composition 实际渲染，核对字体、层次、动态阅读、边缘和最终编码；没有实拍只称测试板。现有 [QUALITY-GATE](QUALITY-GATE.md) 管最终验收，不另外设置一套互相冲突的“必读全部/包过”流程。
