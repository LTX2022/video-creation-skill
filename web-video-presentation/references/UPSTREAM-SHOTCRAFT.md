# 上游方法研究与取舍

研究日期：2026-10-31。官方仓库：https://github.com/Vincentwei1021/video-shotcraft
固定 Git commit：1266a3ec4831289c4d893d42dd5102723658039a。不引用浮动 main 为交付依据。
读取：SKILL、README、pipeline、final-review、music-beat-sync、gallery/api/library.json、row-embed 配方；其余精选卡导航路径由 Git tree 与对应 Gallery 索引互校。未执行上游代码，未播放上游全部动态样片。

## 采纳与边界
- 功能到镜头到准确变体/示例的证据定位；精选4条，按需读取。
- UI整页/切片坐标同源，防止重绘字体漂移与落位重影。
- 风格帧先行、单镜动作/读取预算及独立审片只补原工作流缺项，不重复新建契约。
- 音源秒数据与渲后偏移分账；新增原创标准库数值诊断，非音频识别/混音接入。

不采纳：上游自主默认替代用户确认；整仓加载；固定模板/品牌映射；强制Freesound来源；固定秒数/拍点/冲击次数；自动Workbench、剪映、发布或全源码交付。
没有引入上游媒体、客户截图、BGM、SFX、npm依赖或可执行代码。原60风格与所有旧演示保持不变；不恢复已被用户拒绝的ink-landscape-film。

## 许可
上游代码和文档标Apache-2.0；相关媒体另行授权，不能因仓库公开推定可商用。以上中文方法为适配现有Skill的重新组织，来源标记在本页与精选导航；为清晰保留上游LICENSE于third-party/video-shotcraft-LICENSE.txt。未把上游许可扩张覆盖用户原包或新原创诊断代码；后续若复制实现须保留适用版权/NOTICE并标记修改。
参考固定文件：[pipeline](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/references/pipeline.md)、[终检](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/references/final-review.md)、[音画](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/references/music-beat-sync.md)、[素材](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/references/sfx-sourcing.md)、[LICENSE](https://github.com/Vincentwei1021/video-shotcraft/blob/1266a3ec4831289c4d893d42dd5102723658039a/LICENSE)。

## 未验证
新分支没有Remotion浏览器端到端、Mac/Windows、NLE或客户验收；示例离线编码不能冒充上述结果。节拍诊断的合成测试不证明真实声音同步。数值/日期是固定仓库记录，不推断整个库所有预览都已人工核实。
