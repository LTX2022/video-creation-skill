# 动效技法索引（保留12个既有ID）

本目录是历史整理的技法资源，不是Jitter资产授权，也不代表当前网页全部实测。按内容关系选一篇，**不要求每章读全部**；不把原研究URL/模板数量当本次重新核验的统计。帧示例按项目fps换算。

| ID | 技法 | 用途 |
|---|---|---|
| `01-fade-opacity` | [Fade/Opacity](01-fade-opacity.md) | 出现、层级与消失 |
| `02-stagger-offset` | [Stagger/Offset](02-stagger-offset.md) | 成组对象与顺序 |
| `03-reveal` | [Reveal](03-reveal.md) | 按层揭示、聚焦 |
| `04-slide-move` | [Slide/Move](04-slide-move.md) | 流向、对象迁移 |
| `05-scale-rotate` | [Scale/Rotate](05-scale-rotate.md) | 聚焦、空间变化 |
| `06-stack` | [Stack](06-stack.md) | 堆叠与归组 |
| `07-morph` | [Morph](07-morph.md) | 同一对象形态转换 |
| `08-blur` | [Blur](08-blur.md) | 焦点与软边 |
| `09-gradient` | [Gradient](09-gradient.md) | 颜色/氛围变化 |
| `10-counter` | [Counter](10-counter.md) | 有来源的数值变化 |
| `11-bento-grid` | [Bento/Grid](11-bento-grid.md) | 并列内容、布局重排 |
| `12-glass-shader` | [Glass/Shader](12-glass-shader.md) | 材质/折射的特定需求 |

先问：观众应理解什么变化？对象是否同一个？有无明确输入/结果？哪一主动作最能说明？再选技法。一个镜头可以组合，但避免多个强动作同时抢焦点。没有必要动作时允许稳定hold。

详细文件中的代码是设计片段，使用前需检查当前依赖/API并在目标composition渲染；网页动画不能直接当确定视频。高级mask/filter/shader按实际证据决定，不以工具名称保证效果。透明和实拍分别看 [Alpha](../ALPHA-COMPOSITING.md) / [实拍](../LIVE-ACTION-OVERLAYS.md)。
