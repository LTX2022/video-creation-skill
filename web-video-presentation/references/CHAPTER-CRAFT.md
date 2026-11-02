# 章节与镜头制作

首个镜头读本页；后续只查当前镜头契约、选定主题和变化风险。

## 从命题到画面

1. 读本章原材料、口播/视觉节拍和已确认分镜，保留数据、单位、条件和不确定性。
2. 先选数量、顺序、空间、状态或因果关系，再选表示，不先套 hero+卡片。
3. 写 `claim → object mapping → operation → visible proof → camera → timing`。分类让同一批对象按属性进入集合；比较保持同条件；适合检验的命题加基线/单条件反例。普通流程无需伪造机械模型。
4. `visualModel` 是信息关系，`compositionModel` 是空间骨架，recipe/style/technique 是实现选择。先核真实枚举，不填假字段骗检查。
5. “动态主导”是关键解释由操作与变化承担，不是面积达到55%或每秒都动。遮住整句说明后能指出“谁发生了什么”是诊断，不要求去掉对象名、单位、公式、代码或字幕。结果 hold 是阅读，不是缺陷。
6. 面积/字号/每屏字数参考值用于提示复核，不当通用硬门槛。`screenTextIntent` 可声明labels/data/editorial/captions；口播里的名称/单位仍可作画面标签，长段重复字幕则保留阻断或明确editorial审阅。真实已确认的逐镜数值要求用 `layoutRequirements`，字段与证据边界见 [QUALITY-GATE](QUALITY-GATE.md#静态门禁与设计提示分开)。声明意图不替代实际手机阅读、安全区检查或用户批准。

文案尚未落到镜头时，按需用 [共写表](VISUAL-SCRIPT.md) 把制作备注与实际旁白/文字分开；已确认分镜不重复重写。关声音检查不等于禁字幕，必要单位/条件保持可见。

## 身份、时间与镜头

- 场景数据保留稳定 `objectId` 和语义角色；对应关系先于 morph：保留/移动/变状态/拆分/合并/新增/删除。长得一样不代表同一对象；无语义对应时清楚切换，别硬凑变形。该名称是作者约定，不等于 shot validator 已检查身份。
- 同一订单从待审到执行应可追踪；容器与字形分别处理，不把整段文字拉伸。对象、方向和颜色意义跨镜头一致，转场不掩盖推理跳步。
- narration step不必换页：`frame/durationInFrames`仍是step局部；Root的`clockScope: "chapter"`同时给`chapterFrame/timelineFrame/chapterStartFrame/chapterDurationInFrames/chapterStepTimings`。跨步对象用chapterFrame；缺新字段按step-only，不猜前步时长。`bindChapterEvents()`把命名节拍绑定真实章内step区间，`actionsIn()`支持after/parallel/stagger；hold保持前动作结果。见[原创示例](../templates/src/examples/flow-continuity/FlowContinuity.tsx)和[RHYTHM](RHYTHM.md)。
- 对象关系在世界/图解层保持；镜头只改变观看范围，标签/字幕可独立屏幕层。只有接触、内部或整体关系需要揭示才聚焦/剖开，关键作用时视角稳定；二维流程可用静态相机。
- 主要观看目标清楚，留白给运动路径、阅读和下一次揭示。竖屏重排，不缩小横屏；字幕/平台按钮/脸/手/关键动作各留安全区。主题不要求每章同构图。

## 工程与验证

`narrations.ts` / registry / outline / shot manifest 同步；查真实句子覆盖，不只比长度。无声用显式时间，不补假 TTS。几何、端点和读数从同一状态派生；静态形状只构建一次，动态姿态按当前帧求值（见 [MOTION-DESIGN](MOTION-DESIGN.md)）。

不以 CSS keyframes/transition、RAF、访问顺序或未固定随机数驱动导出；静态 CSS 可用。SVG 外层定位、内层动画，Hooks 不放条件分支。mask/filter/blend/WebGL 先做适用的小范围实渲染，不一概必用或禁用。文字抖动先查字体就绪、亚像素、缩放与编码。

提交前：类型/bundle、素材/字体就绪；查看首态、作用点、结果和退出。跨步查边界前/当/后三帧及完整动作的连续段；稀疏抽样不证明连续性。检查重复/乱序 seek、静音关系可辨、有声同向、Alpha 表面/阴影及真实底片。自检修复后再提交用户；别把审阅 agent 或文件存在当成已经看过。
