# 动效类型与案例：学作用，不学皮肤

供选型和分镜时按需读取。下列案例研究基于作者/官方文字与公开源码；**未在本包研究中完成实际播放、逐帧或当代浏览器兼容性验证**。具体动作只记来源明确说明的内容；“视频迁移”是原创设计建议，不是复述原片镜头。网站在更新，实作前重新确认相关资料。第三方品牌、图像、字体、模型、音乐与代码分别核权，不因可访问就可复制。

## 先选解释任务

| 任务/家族 | 有意义的运动 | 何时不用 |
|---|---|---|
| 流程元素/信息传递 | 对象沿明确路径到达，接收节点改变状态，结果汇聚 | 没有实际顺序时，不用随机流线伪装流程 |
| 产品与 UI 行为 | 同一对象由列表到详情，操作后结果反馈，返回保留变化 | 只有假 UI 时不能声称真实产品演示 |
| 机制与结构解释 | 输入→接触/阈值→传递→输出；沿装配关系拆开/合回 | 无结构资料时不编造机械内部；简单流程不必等距化 |
| 数据故事/算法 | 基线→变量变化→差异；处理队列/路径按规则更新 | 数据未知时不生成精密假读数 |
| 动感排版/品牌 | 关键词尺度与遮罩改变观看层级，节拍承接语义 | 密集条款/长句/重要数字不宜持续旋转变形 |
| 材质/空间 | 固定其他变量，材质或视角改变显示真实差异 | 纯平面解释无需引入复杂 3D；折射不等于 Alpha |
| 实拍+动态图形 | 跟随动作节拍的标注、路径、局部放大、画面重排 | 无底片/跟踪/matte 时不承诺镜头级 VFX |

用户喜欢的既有 28 秒流程元素属于第一类；其已核验的关键帧、分镜与源代码拆解见 [FLOW-ELEMENTS](FLOW-ELEMENTS.md)。机制解释是扩展，不是替换。模板/基础素材包可帮起步，但不等于内容设计完成。

## 10 个可迁移案例

### 1. Stripe — Interactive Globe｜路径、空间

[作者工程说明](https://stripe.com/blog/globe) 描述海洋球体、点状陆地和连接端点的弧线，表示支付地点到商家的关系，并说明 draw range 和滚动控制。可学“来源—路径—接收者”，而非复制全球线路外观。

**迁移**：先建立两个端点，一条路径伸展，包到达时终点状态变化，再扩展到多条路线；转镜头时别让主要路径不可见。滚动/鼠标改成 `cameraAt(t)`，路径进度独立。没有真实数据就标示意；2D 曲线可完成时不强做地球。

### 2. FiftyThree Pencil — Jonnie Hallman｜产品拆解

[作者复盘](https://destroytoday.com/blog/building-the-pencil-page) 说明拆件和滚动驱动转向。可学“同一产品完整→结构→完整”的身份连续。

**迁移**：沿真实装配轴分离，保留读图时间，少量功能标注，再合回并用一次动作证明功能。有分层资产时合适；只有一张照片时改为外观分区，不虚构内部结构。

### 3. GSAP Image Sequence Scrub｜产品序列与定时

[官方 helper](https://gsap.com/docs/v3/HelperFunctions/helpers/imageSequenceScrub/) 用滚动进度选择 canvas 图像帧；这只能证明采样机制，不能据此声称已观看具体产品运动。

**迁移**：`sourceFrame = round(u(t) × (N−1))`，给起态、关键变化、末态分别分配时间。源序列已具有速度曲线时避免重复 easing。官方示例引用的品牌图片不是商业复用授权；用自有/合法序列。

### 4. Motion / Matt Perry — App Store Layout｜共享对象转场

[作者教程](https://motion.dev/examples/js-app-store-layout) 描述卡片展开为全屏 modal、关闭逆向收回及共享身份/FLIP 思路。不是获取付费源码的许可。

**迁移**：列表中选一项，图片和标题分别保持身份进入详情，完成一次有结果的操作，再收回原位。按源/目标矩形求帧位置；文字不整块拉伸。两个完全无关镜头不用硬 morph。

### 5. Duolingo — World Characters｜状态机反馈

[官方文章](https://blog.duolingo.com/world-character-visemes/) 说明身体姿态、嘴型及答题/语音状态配合。可学反馈与输入同源，而非复制角色。

**迁移**：idle→输入→处理→成功/错误→稳定结果，每种状态有不同动作含义。该逻辑可用于按钮、节点、图标，不必创造角色。事件表与口型时间都转成帧时间；循环不携带上次播放的残余状态。

### 6. Codrops / Manoela Ilic — Kinetic Typography｜文字作为空间

[作者文章](https://tympanus.net/codrops/2021/09/29/kinetic-typography-page-transition/) 描述背景字转动、强调、退出并揭示下一层。

**迁移**：关键词先可读，再成为遮挡/窗口，引出与之相关的证据，落成稳定标签。中文按语意词组而非随机逐字错峰。对数字、条款和长段字幕不用这套表演。

### 7. Codrops / Manoela Ilic — Image Layer Clip-Path｜遮罩揭示

[作者文章](https://tympanus.net/codrops/2023/10/31/image-layer-animations-with-clip-path/) 描述分层图像和两阶段 clip-path 变化；不是人物分割或实拍 Alpha 成功案例。

**迁移**：小开口先展示新镜头关键部位，再扩大并交接构图。多边形顶点对应避免翻折；Alpha 需要真正的透明遮罩，不是黑底白形。头发/运动模糊不能拿简单多边形假装已抠好。

### 8. Three.js — Physical Transmission｜材质变量比较

[官方示例](https://threejs.org/examples/webgl_materials_physical_transmission.html) 与 [材质文档](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) 展示可调粗糙度、IOR、透射及视角；不应把静态交互示例称自动旋转动画。

**迁移**：固定几何、光照和相机，只改一个参数；差异看清后再轻微绕拍。Transmission 不是降低 opacity；透明贴纸叠到未知底片不会自动正确折射背景。需要目标底片进入渲染，或标注风格化效果。

### 9. Codrops / Victor Work — Video Projection Mapping｜影像分块重组

[作者教程](https://tympanus.net/codrops/2025/08/28/interactive-video-projection-mapping-with-three-js/) 描述 mask 决定网格、UV 决定视频区域及网格切换；原例视频为创意编程录屏，不是已验证的人物实拍合成。

**迁移**：先看完整影像，再看到采样边界，用少量单元演示对应，最后重组。源 `mediaTime` 与几何进度同钟；大量单元要按总时长归一化 stagger。解释分块/数字化时有用，否则可能只是噪声。

### 10. OK Go × Pilobolus × Google — All Is Not Lost｜实拍参与构图

[官方制作说明](https://chrome.googleblog.com/2011/07/ok-go-play-with-chrome.html) 与 [项目档案](https://experiments.withgoogle.com/all-is-not-lost) 描述透过透明地板拍摄舞者，多窗口对齐/缩放并随音乐形成图形文字；透明地板不是透明视频编码。

**迁移**：自有实拍的动作成为布局节拍，局部窗口顺动作方向重排，图形路径连接动作和结论。多窗口改为同一画布的合成层。需重拍、音乐许可或主体 matte 时明确成本与缺项，不复制原片。

## 机制/算法的补充参照

- [Bartosz Ciechanowski：Mechanical Watch](https://ciechanow.ski/mechanical-watch/)：约束→简单方案不足→新增部件解决→回到整体；长篇机制不硬塞入短片。
- [Red Blob Games：A*](https://www.redblobgames.com/pathfinding/a-star/introduction.html)：frontier/当前项/已处理集合自己工作；比较算法保持地图与条件一致，不将定性动画冒称实测机器人导航。
- [Nicky Case：LOOPY](https://ncase.me/loopy/)：输入扰动经过反馈环回到自身；定性模型不自动构成定量预测。
- [Bret Victor：Ladder of Abstraction](https://worrydream.com/LadderOfAbstraction/)：具体状态→轨迹→多条件→回到具体时刻；跨表示保留对象与时间身份。

## 案例落地记录

每个采用的参考只记：URL/作者、核验方式（文字/源码/静帧/播放）、借鉴的动作与解释作用、原创改编、资产/代码许可、不同之处、实际渲染证据。不要把“参考同一种运动语法”偷换成“可复制原作资产”，也不要用相似度脚本当版权鉴定。
