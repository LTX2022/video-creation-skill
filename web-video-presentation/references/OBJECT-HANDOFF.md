# 连续对象承接：最小可运行路径

**何时用**：同一产品/卡片从一个场景进入下一个场景，或者改口播长度时动作不应重置。局部改色、普通硬切不用新增契约。先沿用 `CHAPTER-CRAFT`、已有分镜与真实审批；本页没有新批准步骤。原60风格、音频、Alpha、实拍路线不变。

## 先运行，再改一个值（低模型路径）

以下从 **skill 根目录**执行；Node 24 可直接执行，不需 npm、网络、浏览器或新依赖：

```bash
node scripts/check-continuity-runtime.mjs
node --test templates/scripts/test-temporal-sampling.mjs
node scripts/probe-object-handoff.mjs --frames=0,79,80,120.5,210,299
```

输出 `notAnAcceptanceRecord: true` 是纯模型探针，不是视频验收。若要练习，先复制到已授权隔离目录，只改 `templates/src/examples/object-handoff/model.ts` 中 `focus.to.x`，再跑探针：末帧位置应改变，`product-core` 身份不变，79→80帧不重置。不要为了练习修改当前客户工程、批准状态或全部风格。

**环境前提**：无依赖探针成功不代表可渲染。真实项目若缺 `react`、`remotion`、`tsx` 或浏览器，先标注 `render blocked: missing dependencies`，按 `DEPENDENCIES` 列出来源、安装位置及所需授权；不得自动调用npm安装、切换付费后端或把前置检查当成视频结果。

**生产入口**（已有获准依赖的新脚手架项目）：`ObjectHandoffChapter` 位于 `src/examples/object-handoff/ObjectHandoff.tsx`；在确实选择这类镜头的章节中导入并传原 `ChapterStepProps`。组件要求 `clockScope:'chapter'`、`chapterFrame`、`chapterDurationInFrames` 和 `chapterStepTimings`，全部来自现有 `RemotionRoot → STEPS`，不自己猜平均步长。当前示例需3个实际step，少于3个须先修改事件锚点，不制造空旁白凑数。

```tsx
import type {ChapterStepProps} from '../../registry/types';
import {ObjectHandoffChapter} from '../../examples/object-handoff/ObjectHandoff';
export default function Chapter(props: ChapterStepProps) {
  return <ObjectHandoffChapter {...props} motionBlur={false}/>;
}
```

Studio 的 `object-handoff` / `object-handoff-blur` 是10秒教学 composition（1200×680、30fps），不是项目默认尺寸；其 `preview-timing.ts` **只服务教学预览**。生产不要复制这个时长表。真实渲染仍经已有批准与 `RENDERING` 路线，别把预览 composition 当最终交付。示例无字无声，不自动加音乐或字幕。纵屏请重新设计画面，不能把示例横屏压扁称为适配。

## 只保留一套时间源

已有 `bindChapterEvents(chapterStepTimings, bindings)` 把 `{step,at}`（零基step、0..1比例）解析为章内帧窗。场景状态、移动、尺寸、结果读数均引用同一个命名事件；`actionsIn` 的 after/parallel/stagger 仍可使用，不建立第二张场景秒表。

`object-track.ts` 提供：

```ts
const events=bindChapterEvents(actualSteps, {
  enter:{start:{step:0,at:0.2},end:{step:1,at:0.6}},
  focus:{start:{step:1,at:0.7},end:{step:2,at:0.5}},
});
const track=compileObjectTrack({objectId:'product-core',initial:{x:200,size:60},actions:[
  {event:'enter',to:{x:700}},
  {event:'focus',to:{x:600,size:110}},
]},events);
const {objectId,pose}=objectAt(track,chapterFrame);
```

每个目标自动从上一动作端态承接，未修改通道保持；同一通道重叠会报错，不悄悄“后写覆盖”。不同通道可以并行。支持 `linear/smooth` 数值插值、零时长即时状态；不是任意路径/拓扑/字体 morph。复杂机械因果仍用原机制模块。

任意/倒序/小数帧直接求值，不依赖上一帧或 React mount。稳定ID用于语义追踪，不宣称跨 Remotion Sequence 保留同一个DOM节点。

事件边缘保留小数帧以供子帧求值；整数输出帧首次命中用 `firstFrameAt(edge)=ceil(edge)`。例如15.5帧事件在第16帧首次发生。音效若已有明确需求与素材，也从该边缘映射一次，**不在每个模糊样本触发音频**。不会新增声音。章内重叠step报错；通用clock的合法gap保留真实时间而非压缩。但生产RemotionRoot按step挂载章节，因此同章gap会明确拒绝：请在源时间表加入显式无声hold step，不以缺失step表达主体停留。跨章有意空白仍保留。零窗口是明确瞬时事件，不当作可见持续动作。

## 可选时间采样模糊

`temporal-sampling.ts` 的 `renderTemporalCanvas(canvas,drawAtFrame,chapterFrame,options)` 对**真正不同子帧**求值并预乘Alpha平均，随后还原直通Alpha；不是CSS blur、模糊静帧或N层source-over叠加。默认关闭：先确保动作清楚，再按需要启用5样本/0.5帧快门，最多8样本。静止/读数hold不需模糊。

- 当前适配器只处理Canvas运动层。DOM/SVG/复杂3D保持清晰，除非其已有真正时间积分后端；不偷偷换渲染器。
- `draw(ctx,frame)` 必须支持小数帧，禁用帧累加状态。文字/HUD在调用后绘制；字幕/音频放原有单实例轨道。
- `minFrame/maxFrame` 可限制当前连续镜头采样；硬切两侧分别限制，不能把相邻不相关镜头混入。示例无硬切。
- 默认1080p像素预算；更大画布返回 `fallback:pixel-budget`，需实测成本后才显式提高 `maxPixels`。不自动升采样或装GPU工具。
- 返回 `mode/reason/sampleFrames`；示例写入canvas data属性。单样本、零快门、默认禁用是 `single`；像素读取不可用等是明确 `fallback`。应用绘制错误直接抛出，不用降级掩盖bug。
- 合成是RGBA代码空间平均，不宣称线性光或物理摄影精确。Alpha边缘仍需明/暗底与编辑器实测；实拍源本身有快门时谨慎避免双重拖影。

## 失败卡

| 现象 | 最小处理 |
|---|---|
| Node缺`registerHooks`/不能读TS | 在已批准项目使用原 `node --import tsx` 测试路径；没有依赖就报告未测，不自动联网安装 |
| Missing event/step | 核对实际step数与锚点；不增加独立秒表或假音频 |
| Overlapping actions on channel | 调整同一通道事件边缘；需要叠加运动时明确建立另一个独立通道/变换层 |
| Requires actual chapter clock | 从Root接props，不用step局部frame假装全章 |
| fallback | 保留清晰版并报告reason；别宣称运动模糊成功 |
| 结构测试通过但无视频 | 标注model-only；还需真实渲染、连续帧审图、音频/Alpha以及原审批门禁 |

## 来源和许可边界

参考的是一般制作方法：同对象跨场景承接、动作组织、事件对齐、可选快门采样。新增代码、示例和本文独立编写，未读取/复制/执行 lieflat-code-video 的代码、文档或素材，不引入其 PolyForm Noncommercial 材料。不能因此保证项目里其他素材、字体、Remotion许可或旧包全部商用合规；这些仍按原来源与依赖流程核对。没有“用了某仓库=效果自动升级”的承诺。
