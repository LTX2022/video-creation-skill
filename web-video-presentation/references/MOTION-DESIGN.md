# 运动设计与帧契约

动作让关系发生：增长用基线/数值，连接有路径/接收响应，分类让同一对象分流，拆解沿真实装配轴，比较保持同条件。选型见 [MOTION-CASEBOOK](MOTION-CASEBOOK.md)；流程例见 [FLOW-ELEMENTS](FLOW-ELEMENTS.md)。

## 一份状态，多个可见结果

`frame/fps → authored events → model state → pose/readout → image`。一个队列集合决定对象数量、位置和完成数，连接端点由对象锚点派生；导演事件只改变输入，不能另写一条无关的“完成百分比”。简单两对象无需搭整套物理系统。

静态轮廓、固定路径和布局构建一次，动态姿态/遮挡按当前帧派生。相同帧重复或乱序求值应一致；需积分的模型用固定步长预计算/重放，不依赖上一次访问帧。缓存只是实现选择，不能掩盖输入变更。

## 时间与表现

依次/并行/错峰/hold 的选择与命名节拍见 [RHYTHM](RHYTHM.md)。事件名在一个映射点绑定既有 timing，不把相同数字散落各属性。保持语义 `objectId`，先确认对应对象，再插值位置/形状；不支持的路径拓扑明确切换，不许诺任意 morph。

`useCurrentFrame()` / `interpolate()` / 必要的 `spring()`、固定随机种子与预计算轨迹可组合。linear、ease 与 spring 由动作含义选择，不统一回弹。CSS animation/transition、timer、RAF 墙钟或渲染次数不得驱动导出状态；静态 CSS 可用。

SVG 外层定位、内层运动；Canvas 每帧隔离 transform/clip/alpha/filter/blend/shadow。世界层保持对象关系，相机层揭示整体/局部，字幕留在稳定屏幕层；不强制相机运动。

mask/filter/blend/backdrop-filter/WebGL 先以目标浏览器/编码的小样验证，再选保留或换实现。Alpha 看亮暗底边缘，不能一刀切删除半透明阴影。资源取帧前就绪。交互转时轴见 [WEB-TO-VIDEO](WEB-TO-VIDEO.md)；有意义的变化和读得懂的 hold 胜过持续炫动。
