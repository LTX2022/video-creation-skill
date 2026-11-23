# Motion reference study / 动效参考学习索引

This is a routing index for design and review, not a list of bundled effects or a claim that every video was watched. 这是按镜头任务选资料、验自己成片的索引，不代表所有原片已看完、全部实现或第三方素材可用。

**Coverage / 覆盖：** [Video Shotcraft Gallery](https://vincentwei1021.github.io/video-shotcraft/) inventory revision **bdd94be16d60fa8f**: **124 cards, 150 variants/previews, 10 categories**. All 124 pinned written cards were read and condensed into [one practical review note per card](SHOT-REVIEW-NOTES.md); 5 official previews were decoded and inspected at selected frames (not continuously watched or audio-reviewed). The index does not imply that all 150 videos were reviewed. Historical work is recorded separately; counts may overlap and are not added together. No third-party footage, preview frames, source code, card prose or assets are bundled here.

## Pick the shot by the job / 先选表达任务，再选动作

| Category / 类目 | Use when / 用法 | Evidence to check / 看什么 |
|---|---|---|
| Opening & brand / 开场与品牌 | Establish one product promise or spatial context / 先立一个命题或交代空间 | First readable frame explains what this is; closing beat leaves room for the first feature / 首个可读画面说清主体，衔接功能镜头 |
| Typography / 文字与字卡 | Give text structure or a decisive emphasis / 文字有层次或信息落点 | Line breaks, baseline and smallest readable scale survive motion / 运动中不破坏换行、基线和最小可读尺寸 |
| UI entrance / 界面登场 | Show a group, variety, or one object gaining weight / 表达整体、差异或离面体积 | Same card identities, correct stacking and readable fronts / 卡片身份连贯、遮挡有序、正面可读 |
| Camera & space / 运镜与空间 | Reveal a relationship the static shot cannot show / 运镜只为揭示关系 | Target stays legible; spatial axes keep orientation / 主体保持可读，方向不乱 |
| Data & metrics / 数据与指标 | Show an actual change in status, magnitude or domain / 表达有依据的状态、数值或量程变化 | Labels and units remain stable; old/new data map to a defined scale / 保留标签单位，明确数据到坐标的映射 |
| Interaction / 交互与功能 | Make a user action and its result legible / 交代操作与系统反馈 | Hit target → pressed → confirmed → readable result, in order / 命中、按压、确认、读结果，顺序可验 |
| Transitions / 转场 | Transfer meaning or redirect attention / 交接语义或转移焦点 | Inspect frames before/at/after the edit; transition not longer than the idea / 看切点前后，别让转场压过表达 |
| Rhythm / 节奏 | Group events or build energy / 分组或积累能量 | Each accent lands on a real event; allow a reading hold / 重音需对应事件，保留可读停留 |
| Light & emphasis / 光效 | Isolate one proof or visually connect actions / 照亮一个证据或连接动作 | Overlay cannot obscure labels or substitute for behavior / 光效不遮字，不冒充功能变化 |
| Outro / 收尾 | Leave a conclusion or one next step / 留住结论或下一步 | Final message reads without replaying the whole sequence / 不回看也能看懂收尾 |

## Next adaptations / 优先转成可验收的原创做法

1. **Readable card choreography / 高速卡片仍可读。** [Card flock](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/card-flock-tumble.md), [card stack](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/card-stack.md), [carousel](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/carousel-3d.md), [contact shadow](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/element-body-moves.md). First verify edge-on → readable fronts → handoff with no accidental pause, mirrored text or incorrect stacking. Only then add lighting or atmosphere. 先验薄边翻起、正面可读、下一动作接得上；不靠模糊和烟掩盖读不清的问题。重要帧取落位前、落位、落位后三点，再完整播放。
2. **Causal focus / 操作带来焦点。** [Segmented control](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/interaction/segmented-thumb-hero.md), [single select](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/interaction/chip-grid-single-select-blackout.md). Define a real hit area, show press before state change, lock unrelated geometry and hold the selected result. The motion can be slow or fast; the order is the point. 先命中真实控件，按下才变状态，其他控件不乱跳，结果停够读清；样片帧数不是全局模板。
3. **Semantic transitions / 转场不代替内容。** [Card flip](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/card-flip-reveal.md), [crane reveal](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/opening/crane-rise-reveal.md), [concealed cut](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/transition-hidden-cut.md). Keep an invariant while the meaning changes: same card links feature to result; same data row links detail to overview; a shared silhouette can carry the cut. 用同一对象保住因果；烟雾或闪光只能接动作，不能虚构前因后果。
4. **Data is evidence / 真实读数先于特效。** [Live charts](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/data/chart-live-moves.md). Animate marked real events rather than inventing impressive numbers. If a new value crosses the domain, update scale and reproject the existing data together; explicitly label demo data. 超量程时旧数据和新坐标同源更新；确认轴标、单位、读数与停留，不把全程有动静当高级。

For each adaptation, save one main intention, the object/state that carries it, the changes that must not happen, one expected failure case, the exact frames inspected, and a continuous playback result when available. 对每次适配记录镜头意图、主体状态、保护范围、一个应被检出的反例、实际验收帧及可用时的连续播放结论。Treat automated or sampled checks as evidence, not aesthetic approval. 不把抽帧或指标通过当美术验收。

## Earlier references / 既有参考回收

| Evidence state / 状态 | Source families / 来源 | Keep or next check / 落点 |
|---|---|---|
| Public project methods already documented / 已有公开版本方法说明 | [Shotcraft](https://github.com/Vincentwei1021/video-shotcraft); [Jitter](https://jitter.video/product/); [Anatomy](https://github.com/wheresryan22/anatomy); [Emil's animation standards](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md); [Taste Skill](https://github.com/Leonxlnx/taste-skill); [Clypra Studio](https://github.com/AIEraDev/clypra-studio) | Preference and technique selection, one shared state for motion, readable staging, and final-output checks. 方法、选型和验收记录已有；不代表安装执行外部项目，Clypra 仅文档研究。 |
| Earlier code-motion methods / 既有代码动效研究 | [deepseek-opus-motion-skill](https://github.com/8533502-dev/deepseek-opus-motion-skill); [Remotion official skills](https://github.com/remotion-dev/skills); [rossark](https://github.com/rossark0/rossark-motion-skill); [react-bits-video](https://github.com/GordenSun/react-bits-video); [img2threejs](https://github.com/img2threejs/img2threejs); [Three.js graphics builder](https://github.com/majidmanzarpour/threejs-game-skills) | Pose and pivot, render time vs wall time, stable label slots, shape before effects; project-specific render proof is a separate gate. 学支点、连续动作、稳定读字、先造型后加效果；不增必装依赖或把 Remotion 设为必经。 |
| Historical original trials; not a general capability / 有历史原创有限试片 | Code2Video studies (pickup → hold → release), [703 Opus collection](https://github.com/yihui-dev/awesome-opus5-5-videos), recurring product UI and Three.js particle references | Review only applicable shots with real inputs. Historic 703 catalog coverage and subsampled examples are not 703 complete viewings. 已有抓取持物、粒子/材质等试做或抽帧，不推断任意对象、真实现象或所有原片可复刻。 |
| Recorded research and pending validation / 有研究、待对应验证 | ReactDrops focus/pointer and glass; fftracking; scroll-world; claude-animated-shorts; ChrisHKAI-Video; vibecoding/UI motion libraries; tasteCode; contrast-led palettes | Focus and pointer need a concrete remake before claiming acceptance; do not implement all tools by name. Verify exact source/version, focused sample, renderer and rights. 聚焦/指针重测；跟踪和卷轴需要实测，通用称呼须找准项目。 |
| Target-tool scope, not imported / 工具路线独立 | [Tesseract](https://github.com/mirage-hq/Tesseract); [Lottie](https://lottiefiles.com/); [Code2AE](https://github.com/Oxoxxidane/Code2AE_skill); TapNow/Skrull, Sync Labs, Seedance | Tesseract study informed generic review patterns, not redistributable code; a local editable Lottie proof is not a vendor Studio result; keep AE, external models, lip sync and TapNow/Skrull behind separate tool/format checks. 不混称第三方交付，不把外部模型/格式路线并为默认依赖。 |
| Public examples with bounded observation / 公开样片有限观察 | [Linear Pulse](https://linear.app/changelog/2025-04-16-pulse); [Linear Mobile](https://linear.app/changelog/2024-09-19-introducing-linear-mobile); [Notion Layouts](https://www.notion.com/releases/2024-10-24); [3Blue1Brown Attention](https://www.3blue1brown.com/lessons/attention/) | Show one visible event with enough read time; visual/diagram observations do not establish audio, full continuous timing or marketing performance. 视觉观察不推定声音、原速观感或宣传效果。 |
| Missing precise anchors / 待恢复来源身份 | Some older social clips or references across Xiaohongshu, Bilibili, YouTube, X, and Instagram; 24 historical relative-only tool routes | Reconcile by exact official URL/version or delivered file when available. Do not infer service identity or license from labels. 缺地址、版本或文件身份不猜；匿名路线保持 0/24 已确认身份，私有链接与内容不进入公开记录。 |

For prior adoption and executable scope, see the repository's reference adoption, integration status, upstream motion, and upstream script documents. 既有代码落点见仓库参考采纳、整合状态和上游方法文档。Links here are provenance, not rights to media or instructions to install.

## Full card locator / 124 张卡片导航

Legend: every listed card has an original written review note. **Frames / 抽帧** marks the five official previews also decoded and inspected at selected frames. Open the [official gallery](https://vincentwei1021.github.io/video-shotcraft/) for its variant list.

### Opening & Brand / 开场与品牌 (11)

- [brand-ink-open](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/opening/brand-ink-open.md)
- [crane-rise-reveal](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/opening/crane-rise-reveal.md)
- [dataviz-landscape-open](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/opening/dataviz-landscape-open.md)
- [fracture](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/opening/fracture.md)
- [icon-field-colorize](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/opening/icon-field-colorize.md)
- [letterspace-materialize](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/opening/letterspace-materialize.md)
- [magician-card-flourish](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/opening/magician-card-flourish.md)
- [orbit-ring-title-open](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/opening/orbit-ring-title-open.md)
- [spotlight-hero-card](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/opening/spotlight-hero-card.md)
- [stroke-segment-build](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/opening/stroke-segment-build.md)
- [text-as-mask](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/opening/text-as-mask.md)

### Typography & Title Cards / 文字与字卡 (22)

- [blur-slide](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/blur-slide.md)
- [brace-expand](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/brace-expand.md)
- [countdown-arc-scatter](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/countdown-arc-scatter.md)
- [document-typewriter-reveal](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/document-typewriter-reveal.md)
- [flying-words](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/flying-words.md)
- [glitch-cycle](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/glitch-cycle.md)
- [gradient-word-sweep](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/gradient-word-sweep.md)
- [lead-word-zoom-assemble](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/lead-word-zoom-assemble.md)
- [marker-underline-title](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/marker-underline-title.md)
- [outline-word-fill](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/outline-word-fill.md)
- [paper-title-card](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/paper-title-card.md)
- [pill-chip-slot-cycle-handled](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/pill-chip-slot-cycle-handled.md)
- [pill-slot-cycle](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/pill-slot-cycle.md)
- [text-column-converge](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/text-column-converge.md)
- [title-demote-to-label](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/title-demote-to-label.md)
- [type-assembly-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/type-assembly-moves.md)
- [type-entrance-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/type-entrance-moves.md)
- [type-rhythm-sync](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/type-rhythm-sync.md)
- [typewriter-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/typewriter-moves.md)
- [vertical-word-roll-blur-cycle](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/vertical-word-roll-blur-cycle.md)
- [word-relay-filmstrip](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/word-relay-filmstrip.md)
- [word-relay-geometry](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/typography/word-relay-geometry.md)

### UI Entrance & Showcase / 界面登场与陈列 (21)

- [avatar-bracket-carousel](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/avatar-bracket-carousel.md)
- [bezier-source-converge-merge](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/bezier-source-converge-merge.md)
- [card-stack](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/card-stack.md) · **Frames / 抽帧**
- [carousel-3d](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/carousel-3d.md) · **Frames / 抽帧**
- [cloner-depth-echo](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/cloner-depth-echo.md)
- [deck-deal-flyin](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/deck-deal-flyin.md)
- [doc-park-left-pill-deal](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/doc-park-left-pill-deal.md)
- [draw-svg-trace](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/draw-svg-trace.md)
- [element-body-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/element-body-moves.md) · **Frames / 抽帧**
- [integration-hub-map](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/integration-hub-map.md)
- [list-reveal](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/list-reveal.md)
- [list-stack-press](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/list-stack-press.md)
- [neon-frame-forerun](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/neon-frame-forerun.md)
- [neon-frame-orbit-drop](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/neon-frame-orbit-drop.md)
- [page-waterfall-wall](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/page-waterfall-wall.md)
- [product-card-progressive-assemble](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/product-card-progressive-assemble.md)
- [radial-wave](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/radial-wave.md)
- [research-card-stack-scroll](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/research-card-stack-scroll.md)
- [row-embed](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/row-embed.md)
- [value-stagger-gradient](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/value-stagger-gradient.md)
- [wall-reveal-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/ui-entrance/wall-reveal-moves.md)

### Camera & Space / 运镜与空间 (10)

- [basic-3d-scene](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/camera/basic-3d-scene.md)
- [crash-zoom-punch](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/camera/crash-zoom-punch.md)
- [cursor-flyover](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/camera/cursor-flyover.md)
- [depth-layer-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/camera/depth-layer-moves.md)
- [graze-face-tour](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/camera/graze-face-tour.md)
- [overhead-camera-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/camera/overhead-camera-moves.md)
- [space-camera-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/camera/space-camera-moves.md)
- [steep-tilt-glide](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/camera/steep-tilt-glide.md)
- [tension-camera-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/camera/tension-camera-moves.md)
- [terminal-3d](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/camera/terminal-3d.md)

### Data & Metrics / 数据与指标 (5)

- [before-after-slider-scrub](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/data/before-after-slider-scrub.md)
- [chart-live-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/data/chart-live-moves.md)
- [gauge-readout-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/data/gauge-readout-moves.md)
- [scroll-brake-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/data/scroll-brake-moves.md)
- [timeline-travel](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/data/timeline-travel.md)

### Interaction & Feature Demo / 交互与功能演示 (11)

- [autolayout-gap-dial](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/interaction/autolayout-gap-dial.md)
- [canvas-materialize-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/interaction/canvas-materialize-moves.md)
- [chip-grid-single-select-blackout](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/interaction/chip-grid-single-select-blackout.md)
- [collab-cursor-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/interaction/collab-cursor-moves.md)
- [glass-pill-dictation-typing](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/interaction/glass-pill-dictation-typing.md)
- [hashtag-to-pill-materialize](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/interaction/hashtag-to-pill-materialize.md)
- [picker-carousel-feature-cycle](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/interaction/picker-carousel-feature-cycle.md)
- [segmented-thumb-hero](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/interaction/segmented-thumb-hero.md) · **Frames / 抽帧**
- [theme-switch-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/interaction/theme-switch-moves.md)
- [type-and-filter](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/interaction/type-and-filter.md)
- [voice-waveform-live](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/interaction/voice-waveform-live.md)

### Transitions / 转场 (15)

- [bottom-push-stack-wipe](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/bottom-push-stack-wipe.md)
- [card-flip-reveal](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/card-flip-reveal.md)
- [card-flock-tumble](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/card-flock-tumble.md) · **Frames / 抽帧**
- [circle-match-iris](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/circle-match-iris.md)
- [gradient-transition](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/gradient-transition.md)
- [line-carry-transition](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/line-carry-transition.md)
- [mosaic-reframe](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/mosaic-reframe.md)
- [page-turn-transitions](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/page-turn-transitions.md)
- [print-texture-transitions](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/print-texture-transitions.md)
- [shot-transitions](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/shot-transitions.md)
- [tear-streak-transitions](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/tear-streak-transitions.md)
- [transition-hidden-cut](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/transition-hidden-cut.md)
- [transition-travel](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/transition-travel.md)
- [white-flash-logo-simplify-cut](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/white-flash-logo-simplify-cut.md)
- [wipe-transitions](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/transition/wipe-transitions.md)

### Rhythm & Montage / 节奏与蒙太奇 (8)

- [beat-cut-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/rhythm/beat-cut-moves.md)
- [beat-step-list-theme-cycle](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/rhythm/beat-step-list-theme-cycle.md)
- [panel-grid-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/rhythm/panel-grid-moves.md)
- [quad-split-parallel-scenes](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/rhythm/quad-split-parallel-scenes.md)
- [rhythm-interrupt-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/rhythm/rhythm-interrupt-moves.md)
- [sakuga-timing-shift](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/rhythm/sakuga-timing-shift.md)
- [speed-ramp-freeze](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/rhythm/speed-ramp-freeze.md)
- [trailer-grammar-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/rhythm/trailer-grammar-moves.md)

### Light & Emphasis / 光效与强调 (15)

- [assemble-then-type-flyin](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/effects/assemble-then-type-flyin.md)
- [aurora-bloom-bg-flip](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/effects/aurora-bloom-bg-flip.md)
- [brand-frame-snap](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/effects/brand-frame-snap.md)
- [fui-hud-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/effects/fui-hud-moves.md)
- [glow-flyline-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/effects/glow-flyline-moves.md)
- [icon-performance-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/effects/icon-performance-moves.md)
- [impact-feedback](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/effects/impact-feedback.md)
- [light-play-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/effects/light-play-moves.md)
- [radial-ripple-phone-chips](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/effects/radial-ripple-phone-chips.md)
- [riso-print-hits](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/effects/riso-print-hits.md)
- [scan-bracket-sweep](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/effects/scan-bracket-sweep.md)
- [scanline-annotate-focus](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/effects/scanline-annotate-focus.md)
- [scanline-assemble-flyin](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/effects/scanline-assemble-flyin.md)
- [slam-entrance-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/effects/slam-entrance-moves.md)
- [spotlight-sweep-moves](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/effects/spotlight-sweep-moves.md)

### Outro / 收尾 (6)

- [grain-dissolve](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/outro/grain-dissolve.md)
- [logo-shrink-wordmark-lockup](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/outro/logo-shrink-wordmark-lockup.md)
- [neon-triple-marquee](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/outro/neon-triple-marquee.md)
- [outro-group-photo-launch](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/outro/outro-group-photo-launch.md)
- [ui-strip-away-outro](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/outro/ui-strip-away-outro.md)
- [ui-to-brand-morph](https://github.com/Vincentwei1021/video-shotcraft/blob/59f3e9b9e936ff2bce0e18446226d770a3f2f61f/references/shots/outro/ui-to-brand-morph.md)
