> **历史记录（非当前执行规范）**：保留当时问题、假设、计划和旧命令供追溯，不默认加载，不直接执行其中升级/安装/删除指令。当前制作从 [SKILL](../SKILL.md) 路由；Alpha、格式、QA、交付规则已在各专项文档实际修订。文内旧版本与旧路径不表示当前环境。

# Modification Record Lessons

本文件保留当时修改记录的事故归纳。仅追溯对应问题时读取；下列旧“必须”与旧命令不覆盖当前SKILL及专项规范。

## 教训生命周期管理

每条教训有两种状态：

- **`[AUTO]`**：已被 preflight / 脚本自动化检查。Agent **不需要记忆**，脚本会拦截。失败时按错误提示修复。
- **`[MANUAL]`**：需 Agent 开发时手动遵守。在 [`CHAPTER-CRAFT.md`](CHAPTER-CRAFT.md) 自检清单中保留对应的检查项。

> **维护规则**：新增教训时必须标注 `[AUTO]` 或 `[MANUAL]`。已被脚本覆盖的教训应标注 `[AUTO]` 并从 Agent 自检清单移除，防止规则膨胀。每半年复查一次：是否有 `[MANUAL]` 教训已被新脚本覆盖，可降级为 `[AUTO]`。

### 自动化覆盖统计

| 状态 | 数量 | 说明 |
|---|---|---|
| `[AUTO]` | 34 条 | preflight / render-video.ts / cover:validate / validate-screen-text 等自动检查 |
| `[MANUAL]` | 8 条 | Agent 开发时手动遵守，在 CHAPTER-CRAFT 自检清单中保留 |
| 总计 | 42 条 | |

v2.8.0 降级记录：教训 16 / 17 / 23 / 26 / 34 / 37 / 42 从 `[MANUAL]` 降级为 `[AUTO]`，由模板代码与脚本门禁兜底。

v2.9.0 降级记录：教训 18 / 19 / 27 / 28 / 33 / 35 从 `[MANUAL]` 降级为 `[AUTO]`，由 overlay preflight、章节漂移检测、acceptedChapterIds、Hook 静态扫描与 validate-assets 分辨率 guard 兜底。

## 硬故障清单

### [AUTO] 教训（已被脚本自动化，无需 Agent 记忆）

1. [AUTO] 音频路径必须真实存在且可读。`build-timing` 会兼容 `1.mp3`、`01.mp3`、`001.mp3` 以及常见音频扩展名，并优先使用 ffprobe 真实时长；最终交付不得带 `audioDurationMs: null` 或 `audio missing / ffprobe unavailable` warning。`public/audio/**.mp3` 文件存在不等于音频有效，必须有 `output/tts-manifest.json` 证明当前 narration 文本 hash、provider、voice/profile 与音频 SHA256 匹配。
2. [MANUAL] TTS 必须按 `narrations.ts` 数组逐段生成，禁止合并相邻 step。合并会造成字幕、画面和声音错位。
3. [AUTO] 字幕必须来自 `subtitleCues` 句级推进。长画面里声音进入下一句时，字幕必须同步切换，不能一个画面只显示第一段字幕。
4. [AUTO] 画面文字不得复述字幕。中段画面出现与口播相同或高度相似的中文句子，直接删除或改成短标签、图形、数据、关系、动作；开头 / 结尾点题例外必须写 `allowSubtitleOverlap` 与 `overlapReason`。
5. [AUTO] 竖屏字幕必须避开平台底部 UI。默认安全区已上移，章节画面底部也必须留出空间，不能把关键标签、图例或按钮放进字幕区。
6. [MANUAL] SVG / Canvas / HTML 图层必须自检遮挡。标注文字、图例、关键节点应在对应图形之后渲染，或使用清晰的 z-index / 分组顺序。
7. [AUTO] 每个 step 至少有一个内容对应画面。禁止空白 step、纯背景 step、无关大字、无声过渡返回空 div。
8. [AUTO] 画面节奏必须跟文案走：短句至少保留可读时间，长句必须拆 cue 或拆 visualStages；超过 8 秒的 step 必须拆分或声明多段视觉变化。
9. [AUTO] `render:golden`、`render:smoke`、最终 MP4 和 `output/render-result.json` 是正式交付证据；`draft.mp4` 不是成品。`render-result.json` 必须包含成功的 `mediaProbe`，证明最终 MP4 有视频流、需要音频时有音轨，并且时长 / fps / 分辨率与 Remotion 预期一致。
10. [AUTO] `package:delivery` 必须生成桌面 zip。Windows 中文路径或文件锁导致拷贝失败时，脚本会逐文件 fallback；仍失败时必须修复，不得手动散拷替代正式交付包。
11. [AUTO] `douyin` / 竖屏短视频最终视频后必须生成封面。封面标题来自前 3 个画面 / 开场钩子，10 字以内；代表图在上，标题居中，叠加 `视频封面.png` 后不得遮挡关键元素。
12. [AUTO] `AI未来前景发展与应用-封面.png` 暴露的事故：直接抽视频帧会得到小标签、小金句、大片空黑的“截图”，不是商业短视频封面。`douyin` 封面必须走 `cover:generate` / `cover:validate`，标题为中部主角，上方有代表性主视觉，不能用 `remotion still full-video --frame=...` 替代正式封面流程。
13. [AUTO] 封面标题掉行事故：`AI未来前景` 这种短标题必须在一行内显示。封面 CSS 必须禁止 CJK 自动换行（`white-space: nowrap`、`word-break: keep-all`、`text-wrap: nowrap`），生成器必须按视觉宽度自动缩字号，`cover:validate` 必须检查 `title one line`。
14. [AUTO] `AI未来前景发展与应用` 暴露的竖屏小手机事故：画面元素、标签、主体图形过小，即使 1440×3200 分辨率正确也不合格。竖屏项目每个 step 必须填写 `mobileReadability`，并由 `preflight` 检查小手机可读性。
15. [AUTO] 参考视频风格事故：不能只看参考帧或口头说“像这两个视频”。凡写入 `referenceVideo` / `referenceVideoStyle`，必须先运行 `npm run analyze:references -- <video...>` 生成 `output/reference-video-analysis/manifest.json`，再运行 `npm run render:motion-strips` 证明生成视频自身也有连续运动，最后运行 `npm run compare:references` 同时证明没有逐帧复制参考视频，并且动态结构覆盖了入场、推进、可读停留、收束/退出。
16. [AUTO] **ProRes Alpha 三 flag 配方**（GPT-5.6 门禁背后项目，2026-07-01）：v2.8.0 起由 `npm run render:video:alpha` 自动注入四 flag（`--codec=prores --prores-profile=4444 --image-format=png --pixel-format=yuva444p10le`），并在渲染后用 ffprobe 自动校验 `pix_fmt` 含 `yuva`。若缺失 alpha 通道直接阻断。完整配方见 [`remotion-prores-alpha.md`](remotion-prores-alpha.md)。
17. [AUTO] **TransparentFix 透明底方案**（AI圈大地震项目，2026-07-03）：v2.8.0 起模板内置 `TransparentFix` 组件，`project-state.json` 内置 `overlayChapterIds`，`RemotionRoot` 内置 `full-video-alpha` composition + `isOverlay` 传参，透明底范围按章节隔离，不再依赖会话内手写样式。
18. [AUTO] **透明底图形不透明规则**（DeepSeek 涨价项目，2026-07-02）：v2.9.0 起 `preflight.ts` 对 `overlayChapterIds` 章节扫描大号文字（≥48px）是否含 `-webkit-text-stroke` / `paint-order`；缺失直接 fail。叠加层图形仍需 solid 背景 + visible border，背景透明 ≠ 图形透明。
19. [AUTO] **overlay 图形最小 opacity ≥0.25**（DeepSeek 涨价 + GPT-5.6 门禁项目）：v2.9.0 起 `preflight.ts` 扫描 overlay 章节 `rgba(..., 0.00-0.24)` 直接 fail。Alpha 导出建议图形 opacity ≥0.3。
20. [MANUAL] **多阶段视觉必须隐藏旧阶段**（AI圈大地震项目，2026-07-03）：单 step 内多个视觉阶段用 `position: absolute` 堆叠时，阶段间必须用 opacity 交替显示，不能全部同时显示。用户原话："好多内容叠加在一起很混乱" / "文字都重复放置2次了"。正确做法：每个阶段用独立容器，通过 `opacity: 0/1` 交替，旧阶段在新阶段进场时淡出。3 阶段以上必须拆 visualStages 或拆 step。
21. [AUTO] **label 不得重复主画面文字**（AI圈大地震项目，2026-07-03）：画面中央已有 "6月12日"，左上角又有 label "6月12日" —— 脚手架生成的 label 系统与主画面文字内容重复。用户原话："为什么有2个6月和2个出口管制·全球停服。有2个mythos已训练完成。2个7月1日。2个逆向实锤"。`onScreenText` 每 step 最多 2 条短标签，且不得与主画面文字内容重复；label 只用于标注用途（如数据单位、对象名），不复述画面已有文字。
22. [AUTO] **渲染前自动扫描已安装浏览器**（AI圈大地震项目，2026-07-03）：用户说"千万不要下载" Chrome Headless Shell。`render-video.ts` 已内置 `detectInstalledBrowser()` 自动扫描 Edge/Chrome/Firefox 已安装路径，优先使用已有浏览器，不触发自动下载。仅在所有候选都找不到时才提示用户传 `--browser-executable=<path>`。
23. [AUTO] **纸纹噪点纹理导致 ProRes 体积爆炸**（AI圈大地震项目，2026-07-03）：v2.8.0 起 `render-video.ts --alpha` 渲染前自动检查 `src/styles/tokens.css`；若 `--surface-pattern` 非 `none` 或包含噪点纹理即阻断（教训 23）。
24. [AUTO] **Shot Design Review 自动门禁**（DeepSeek 涨价项目，2026-07-02）：跳过 Shot Design Review 导致用户不满意视觉方向，三章并行返工。`project-state.json` 中 `checkpointPlanConfirmed` 和 `fullShotDesignConfirmed` 都必须为 `true` 才允许进入 Phase 2。`render-video.ts` 的 `assertWorkflowAllowed()` 已检查这些字段；preflight 同理。
25. [AUTO] **第一章 anchor 自动门禁**（DeepSeek 涨价项目，2026-07-02）：跳过第 1 章 anchor 导致三章并行开发但全部需要返工。`project-state.json` 中 `firstChapterUserAccepted` 必须为 `true` 才允许进入 Phase 2.3（第 2~N 章）。`render-video.ts` 已强制检查。
26. [AUTO] **Phase 1.2 全文校验**（GPT-5.6 门禁项目，2026-07-01）：v2.8.0 起 `validate-narrations.ts` 增加 script 覆盖率门禁，`narrations` 归一化字符覆盖率低于 90% 直接 fail，防止漏章事故。
27. [AUTO] **项目规格按 profile 默认值**（GPT-5.6 门禁项目，2026-07-01）：v2.9.0 起 `validate-assets.ts` / `preflight.ts` 阻断非 `referenceVideo` 素材分辨率与 `videoFormat` 不一致；douyin profile 默认 1440×3200（除非 notes 含 `formatOverrideAccepted`）。
28. [AUTO] **新增/删除/合并章节后重新走 Shot Design Review**（GPT-5.6 门禁项目，2026-07-01）：v2.9.0 起 `preflight.ts` 比较 `outline.md` 章数与 registry / `shot-manifest.json` 章节集合；漂移直接 fail 并提示重走 Shot Design Review。
29. [AUTO] **timing-manifest audioDurationMs: null 超 50% 阻止 preflight**（DeepSeek 涨价项目，2026-07-02）：TTS 未开始导致全部 16 步用估算 timing，`audioDurationMs: null`。`preflight.ts` 已新增门禁：null 超过 50% 时 fail。必须先走 Checkpoint Audio（TTS 合成）再交付。
30. [MANUAL] **尺寸计算前置检查**（DeepSeek 涨价项目，2026-07-02）：横排标签 500×3+80×2=1660px > 1440px 溢出，Hero text 220px 溢出。新增组件/卡片前必须先手算总宽总高（`cardWidth × count + gap × (count-1)`），与画幅（横屏 1440 / 竖屏 1440×3200）比较，写在代码注释或 shot 设计里。竖屏项目优先纵向堆叠。
31. [AUTO] **竖屏最小字号建议**（DeepSeek 涨价 + GPT-5.6 门禁 + AI圈大地震项目）：三份修改记录均出现"全部都太小了。放大一倍"反馈。Portrait 竖屏最小建议字号：label ≥88px, title ≥100px, subtitle ≥56px, body ≥48px。overlay 图标最小 ≥280px 圆形或等效面积。`mobileReadability` 已由 preflight 检查，但 agent 开发时必须主动遵守这些阈值。
32. [MANUAL] **并行章节自检强制**（AI圈大地震项目，2026-07-03）：并行 agent 产出的第 2-3 章存在严重排版问题（重复文字、内容叠加），未执行自检即合并。并行章节 agent 完成后必须跑 [`CHAPTER-CRAFT.md`](CHAPTER-CRAFT.md) 完工自检（优先独立 reviewer agent），不通过不合并。
33. [AUTO] **模式 A 每章必须停**（AI圈大地震项目，2026-07-03）：v2.9.0 起 `acceptedChapterIds` + `chapter-review` / `chapter-anchor` feedback 写入 project-state；`preflight` / `validate:delivery` 阻断未验收章节。Agent 仍须在每章完成后主动停下等用户反馈。
34. [AUTO] **分辨率变更后检查 SVG viewBox 一致性**（GPT-5.6 门禁项目，2026-07-01）：v2.8.0 起 `preflight.ts` 自动检查章节里的舞台级 SVG（`viewBox` 宽高 >=1000）与 `videoFormat` 一致，不一致直接 fail。
35. [AUTO] **`useCurrentFrame()` 禁止在 `.map()` 回调内调用**（AI圈大地震项目，2026-07-03）：v2.9.0 起 `preflight.ts` 静态扫描 `.map()` / `.forEach()` 后 30 行内的 `useCurrentFrame()` / `useVideoConfig()` 并 fail。正确修复：抽取 `AlphaStep` 等子组件，在组件顶层调用 Hook。
36. [MANUAL] **端口占用/冲突处理**（三份记录共同 Bug）：v2.9.0 起 `npm run render:studio` 通过 `run-studio.cjs` 自动探测 3000–3010 端口；仍建议启动失败时 taskkill 旧进程。
37. [AUTO] **H.265 不支持 alpha 通道**（AI圈大地震项目，2026-07-03）：v2.8.0 起 `render-video.ts` 自动阻断 `yuva` 像素格式 + 非 ProRes 组合，并提示改用 `--alpha`。
38. [AUTO] **render-video.ts 变量初始化顺序**（GPT-5.6 门禁项目，2026-07-01）：`alpha` 变量在第 82 行定义，但第 66 行的 `output` 变量已引用它，导致 `ReferenceError: Cannot access 'alpha' before initialization`。脚本中变量必须在被引用之前定义。`render-video.ts` 已修复：`const alpha = hasFlag("--alpha")` 移到 `output` 变量之前。
39. [AUTO] **并行开发前提：第 1 章必须已验收**（DeepSeek 涨价项目，2026-07-02）：模式 C（并行开发）的前提是第 1 章已通过用户验收（`firstChapterUserAccepted: true`）且用户同意并行模式。在第 1 章未被验收的情况下进入第 2/3 章开发，导致三章同时存在大量待修复问题，无法形成风格锚点。`render-video.ts` 的 `assertWorkflowAllowed()` 已检查此字段。
40. [MANUAL] **装饰 SVG 与主内容重叠**（GPT-5.6 门禁项目，2026-07-01）：Ch2 S1 的 Ghost lock SVG 元素定位在画面中央（x=880-1210, y=1350），与 LockIcon 和 NOT OPEN 文字重叠。用户原话："GPT-5.6 BOT OPEN那个镜头图标和内容重叠"。装饰性 SVG 元素（鬼影、链条、警戒线等）必须移至画面边缘（两侧/顶部），主内容 `zIndex: 1`，装饰 `zIndex: 0`。与教训 18 一脉相承。
41. [MANUAL] **section label 不得显示口播原句**（DeepSeek 涨价项目，2026-07-02）：Agent 将 narration 文本作为 section label 显示在画面顶部（如"之前大家盯的是""开始面对另一类问题"），用户原话："这句话也在顶上，不要再这样了！你居然在地图那还加字幕了，别加字幕"。section label 只能是短标签（≤8 字），不能是完整句子；narration 文本不得以任何形式出现在画面上（与教训 4 一致，但 section label 是新的遗漏点）。
42. [AUTO] **脚手架 `ChapterStepProps` 接口必须含 `isOverlay?: boolean`**（AI圈大地震项目，2026-07-03）：v2.8.0 已在模板 `types.ts` 内置该字段并同步脚手架复制路径，避免透明底章节类型报错。

## Final Render Evidence Rule

`render:smoke` and `render:video:draft` produce diagnostic media, not final delivery: opaque/composite use MP4, alpha uses MOV, and both uses separate outputs. Mode-aware paths and current commands are defined in [RENDERING](RENDERING.md), not by the historical `draft.mp4`/`full.mp4` examples. Diagnostic metadata must not replace formal full-quality evidence. Final delivery requires the applicable mode outputs, no diagnostic frame range or draft flag, successful hashes/media probes, and the existing approval/quality gates; rerun the appropriate full render before `validate:delivery` and `package:delivery`.

## Subtitle Safety Rule

Repeated modification records show that "preflight passed" was not enough when labels, punchlines, or important visuals sat in the subtitle band or Douyin bottom UI band. Every step must now record `subtitleSafety` in `shot-manifest.json`: checked golden-frame evidence, normalized `subtitleBand`, portrait `platformUiBand`, every `textBoxes[]`, and every `criticalVisualBoxes[]`. `npm run preflight` and `npm run validate:delivery` must block missing boxes or box intersections. Do not mark the work complete by visually guessing "it should be fine"; record the boxes after looking at frames with subtitles visible.

## BOM-Safe JSON Rule

Windows/editor/agent UTF-8 BOM drift can break `JSON.parse` in delivery-chain scripts even when the file content is otherwise correct. All JSON readers in the delivery path must strip a leading BOM before parsing. This now applies to asset manifests, timing manifests, project state, feedback events, subtitles export, render timing generation, final render gating, and TTS segment processing. If a script still crashes on a valid file with a BOM, it is a workflow bug, not a user mistake.

## 交付前复查顺序

```bash
npm run typecheck
npm run build
npm run extract-narrations
npm run build-timing
npm run validate-subtitles
npm run validate-screen-text
npm run build-shot-manifest
npm run analyze:references -- <video...> # 仅当使用参考视频 / referenceVideo 字段时
npm run preflight
npm run render:golden
npm run render:motion-strips # 参考视频 / 复杂动效
npm run compare:references # 参考视频 / 复杂动效
npm run render:smoke
npm run render:video
# 若用户确认要字幕，最终成片用：
npm run render:video:subtitles
# douyin / 竖屏短视频：
npm run cover:generate
npm run cover:validate
npm run package:delivery
```

如果任一步失败，先修根因，再重跑相关 gate。不要通过删除检查、改成默认值或补录虚假 evidence 让流程通过。
