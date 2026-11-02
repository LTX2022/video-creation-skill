# 机制型解释：对象真的按规则运行

只在“为什么发生、内部如何工作、改变输入会怎样”是核心问题时使用。普通流程、品牌和排版片不必机械化。本页提炼 Anatomy 等作者方法，没有复制其代码/资产；不是声称这些项目提供本 skill 的视频/跟踪后端。

## Anatomy 带来的具体变化

[Anatomy 官方仓库](https://github.com/wheresryan22/anatomy) 强调把概念映射为可运行对象，模型驱动姿态与仪表，而非独立摆动零件。[运动说明](https://github.com/wheresryan22/anatomy/blob/main/references/motion.md) 中控制路径、实际状态、事件年龄分开；[测试台 walkthrough](https://github.com/wheresryan22/anatomy/blob/main/references/walkthrough.md) 使形状和读数来自同一模型。可迁移这些原则，不默认复制灰色等距机器、固定零件数或网页交互界面。

案例启发：街机柜投币→开关→线路→屏幕启动是可追踪因果；波纹水槽的波形/数值同源；爆炸视图按装配关系拆，不让零件任意乱飞。来源研究为文档/源码核验，未在本包中运行这些案例。

## 先填模型卡

| 项目 | 要回答的具体问题 |
|---|---|
| claim / evidence | 证明哪句话？行为、数字和阈值来源是什么？ |
| truth level | 真实机制、定量简化、定性示意还是隐喻？ |
| mapping | 每个可见对象对应什么？保留/省略什么？ |
| input / state | 改变什么输入？哪些量随时间改变？ |
| transition | 接触、阈值、守恒、队列或导演事件如何改变状态？ |
| invariant | 数量、容量、连接、单位、身份哪些不能变？ |
| readout | 哪个可见结果证明变化？数字/标签/形态如何同源？ |
| counterfactual | 只改一个条件时，为什么结果不同？ |
| camera / omissions | 关键因果是否可见？非真实比例、延迟和省略如何标注？ |

无法填事实时先改用定性模型或补证据，不以精密小数伪装确定性。

## 帧确定性模型

```text
facts + initialState + authoredEvents + fixedSeed
                           ↓
                     modelAt(frame/fps)
                           ↓
              pose + readout + event envelopes
                           ↓
               cameraAt(t) + layout + renderer
```

这是建议接口，不是 Anatomy 的 API。能解析求值的用时间函数；需要积分的固定步长预计算，或从固定检查点重放。不要在 React render/RAF 中累加状态。读数取 model 输出，不能另写 `counter = progress * 100` 与真实对象数量脱节。

一个原创“队列处理”模型可让输入事件形成对象队列，服务时间决定完成集合，界面显示 `received = queued + processing + completed`。数字、对象位置和状态标签都由同一集合派生；展示堵塞时只改变服务时间，不同时乱改输入量。它可以是平面流程元素，不必画机器。

## 镜头组织

建立整体→给输入→显示关键作用→留结果→做单变量对照→回整体。内部联系不可见时才用切面/展开/特写；保留方向和地标。关键接触发生时不要同时转相机、爆炸零件和滚长字幕。

结构模型的支撑、转轴、接触、连接先正确，细节按功能添加。流体、场、粒子需要方向/传播意义；随机噪点不能替代机制。

## 验收

观众能指出原因和结果；作用顺序可辨；读数与对象同源；不变量在起态、转折、末态成立；换输入的结果符合规则；同帧重复/乱序一致。视觉模型只是说明，不因为“动起来”就证明现实世界也如此。

## 来源与许可

Anatomy 的 [MIT LICENSE](https://github.com/wheresryan22/anatomy/blob/main/LICENSE) 标明 Copyright (c) 2026 Ryan。这里仅原创概括原则，无附带代码/素材。以后若实际复制其代码或实质文档，记录具体提交/文件并保留版权和 MIT 声明；其它来源许可另查，MIT 不覆盖外来资产。

## 包内原创模型示例

[mechanism-demo](../templates/src/examples/mechanism-demo/README.md) 提供8秒令牌桶限流教学模型与SVG组件：`modelAtFrame` 同源驱动请求路线、闸门、令牌和计数；支持关闭全部文字、背景与palette配置。它不是用户28秒参考，也不是生产级连续限流实现；竖屏是安全contain适配，不代表已独立做竖屏艺术设计。模型测试、类型检查或静态渲染不等于完整Remotion编码通过，使用时仍按本项目实际验证。
