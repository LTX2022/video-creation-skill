# 渲染策略与实际结果

## 目标解析

`outputMode` 来自项目状态或显式 CLI，兼容 `--alpha`；`both` 依次渲染 Alpha 与 composite。输出清单由 `scripts/delivery-contract.ts` 决定：

| target | composition 含义 | 文件 |
|---|---|---|
| opaque | 普通整片 | `output/full.mp4` |
| alpha | 无底片、无场景底、静音前景 | `output/full-alpha.mov` |
| composite | 底片与同一前景扁平合成 | `output/full-composite.mp4` |

`output/render-result.json` schema3以顶层及每项相同的`contentRevision`绑定当前输入，`outputs[]`每项另有`renderVariant`、实际哈希/probe/参数/QA。旧schema1/2可读但unbound，不是当前有效证据；unknown输入禁止复用。单输出保留兼容顶层字段；消费者不要假定每个项目都有 `full.mp4`。partial/smoke/draft 不能覆盖正式证据。

## 连续主体与时间表边界

生产 `RemotionRoot` 的 full / alpha / composite 路由共用 `buildRenderSchedule`：总长取所有 step 的最大结束帧，与数组顺序无关。通用 chapter clock 仍允许 gap 并保留真实经过时间，但生产章节挂在 step Sequence 内，同章 gap 会导致主体卸载，因此生产调度明确拒绝此输入（包括乱序输入）。需要主体停留时，在源 narration/timing 中加入显式无声 hold step，并保持其画面状态；不能靠缺失区间实现停留。连续的既有 step、step-local 时钟、章节时钟与跨章有意空白行为不变。

例如原同章 `[0,60)`、`[70,130)` 之间有10帧洞，应在源 timing 添加第三个稳定 step（并相应更新 narration 索引）使区间变为 `[0,60)`、`[60,70)`、`[70,130)`：中间 step 的文本为空、无 audio、无 subtitle cue，视觉继续按 `chapterFrame` 读取同一对象端态；不要复制上一段音频/字幕，不手改生成 timing 来绕过源数据。三段 `stepIndex` 需唯一，例如 0、1、2。

`npm run test:continuity` 包含调度契约；skill 侧 `node --test scripts/test-render-schedule-scaffold.mjs` 验证实际新脚手架复制、三输出接线和可执行调度测试，不安装依赖，也不代表视觉或编码验收。

## 命令

```bash
npm run workflow:status       # 只读下一步/失效原因，不执行或批准
npm run typecheck
npm run build
npm run build-timing
npm run validate:composition   # 合成契约；不声称自动跟踪
npm run preflight             # 正式流程检查
npm run render:golden
npm run render:motion-strips   # 稀疏位置样本，不是连续片段
npm run render:segment -- --frames=120-240 --acknowledge-draft  # 示例范围，按实际动作重选
npm run render:smoke -- --acknowledge-draft
# 按目标选择，不是全部都跑：
npm run render:video
npm run render:video:subtitles
npm run render:video:alpha
npm run render:video -- --output-mode=composite
npm run render:video -- --output-mode=both
npm run validate:delivery
```

使用当前生成项目 package.json 的真实脚本；旧项目未升级时不要假称已有新命令。Alpha 技术烟测 `npm run render:alpha:smoke` 的边缘结果仍待人审，见 [ALPHA-COMPOSITING](ALPHA-COMPOSITING.md)。

## 取样与连续短段

一次`render:golden`或`render:motion-strips`调用内，官方API只建一次bundle/browser/composition，对请求帧去重后用`renderFrames({frames})`批取，再保留原shot/step映射。不是golden与motion跨命令共享，也不是跨运行bundle缓存。manifest记录contentRevision、renderer的实际请求/唯一帧数与并发/scale；motion的strategy为`sparse-step-motion-strips`，sampling明确`sparse`、continuous=false、audioSyncVerified=false、finalVideoVerified=false。这些是证据范围，不是视觉通过标志。step的continuousReview只是`evidence: not-rendered`建议：step前后各0.25秒并夹到总范围，跨step/continuityGroup或更长转场必须扩到完整动作，不是自动依赖规划。

`render:segment -- --frames=START-END`覆盖受影响动作完整起止、转场和hold；范围端点包含。固定原fps、quality、scale=1、everyNthFrame=1，写`output/review-MODE-START-END.mp4`（alpha为.mov），不能选正式文件名。both项目默认composite，Alpha另审；可指定opaque/alpha/composite。它是连续**局部**证据，不验未覆盖镜头/全片节奏，不是final交付。`--acknowledge-draft`只准已授权迭代，不代表用户接受。

批取API路径遇自定义`remotion.config.*`明确拒绝，先把必要设置显式迁入支持路径，不静默忽略配置。浏览器不可用则报告blocked，不以typecheck或稀疏图伪造连续播放。本版本尚无浏览器性能/同题材视觉实测收益。

## 显式无声时序

原有 `timingMode: "narration"` 保留。有声模式以实际音频时长生成 timing；静音素材可选：

```json
{
  "timingMode": "explicit",
  "stepTimings": [
    {"chapter": "flow", "step": 1, "durationInFrames": 120},
    {"chapter": "flow", "step": 2, "durationInFrames": 180}
  ]
}
```

纯无声项目同时明确 `audioRequested: false` / `subtitlesRequested: false`；`narrations.ts` 可保留 `export const narrations = ["", ""];` 作为两步结构。画面标签与口播分开，局部前景的 `shot-manifest` 另填 [overlaySafety](ALPHA-COMPOSITING.md)，explicit时序不豁免视觉审阅。

每个 registry/narrations step 都需一项，step 从1开始，帧数为正整数，不漏不多不重复。空 narration 仍代表一个 step；不能用乱填文字凑时长。explicit 直接保留帧数，不经毫秒取整；如同时有音频，区间不能短于音频。最终总帧数与目标时长核对。

## 可复现性

同帧重复、乱序取样与完整渲染应一致。时间来自 frame/fps，素材和字体已就绪，随机有 seed，Canvas 每帧清理并恢复状态。前景与底片用统一时间映射；项目 fps 与源 fps 允许明确适配，禁止默认光流“修顺”。

Studio 不是编码结果。看 golden 只能发现静态布局问题；连续帧看运动；最终媒体全程解码与播放检查卡顿、字幕、音轨、尾帧和边缘。

## 浏览器与缓存

先使用已安装受支持 Chromium/Edge/Chrome 路径，`--browser-executable=<path>` 或 `REMOTION_BROWSER_EXECUTABLE`；找不到时报告并取得所需安装授权，不反复触发默认下载。浏览器/依赖版本写进运行证据。

更换依赖、字体、主题或 bundle 后出现陈旧画面时先查缓存与输入指纹；只清理已确认生成的项目缓存，不无条件删除媒体/用户文件。端口冲突优先换空闲端口，不杀未知进程。

## 声明限制

正式输出不能跳帧提速；草稿低质量与缩小尺寸要标明。编码成功不证明透明通过、跟踪通过或目标编辑器兼容。大纹理/噪点可增加编码体积，但 Alpha 若已排除背景，不应因此破坏普通主题本体。

## 3.4.1 烟测与 both 字幕

`render:smoke` 读取生成的 TOTAL_FRAMES，默认只检查前 min(180,总帧数) 帧，闭区间末帧为总帧数减1；Alpha 输出 .mov，其它 .mp4。both 的通用烟测只看 composite，另用 `render:alpha:smoke` 查透明部分；不要把其视为双输出验收。烟测不会自动补用户批准，缺门禁的迭代仍需明确 `--acknowledge-draft`。both 正式路由中 `--subtitles` / `--captions` 只传给 composite，透明素材不烧字幕。
