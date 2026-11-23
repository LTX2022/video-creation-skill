# Earlier motion references: source-to-test notes / 旧参考：从一手资料到验收

This is an original study note, not an integration report. 只研究机制与可验证边界，不安装、运行、复制上游组件或打包上游素材。

| Pinned evidence / 固定来源 | What was verified / 实际核实 | Transferable check / 可独立验证 |
|---|---|---|
| [mrsarac/ff-tracking README](https://github.com/mrsarac/ff-tracking/blob/579f5be9e10023164bc2fe7e5b955dea20ddd1c9/README.md#how-it-works) | The creator documents a generated terminal scene, with precise glyph locations, a separate lens/projection pass and synthesized audio, all reading common scene data. This is not a general tracker for recorded footage. 核实作者方案，未运行上游 Rust、Skia 或音频链。 | Derive screen-space adornments and state changes from the same event schedule. Test a moving camera and known glyph rectangles: the target corner/ring must remain registered across arrival, at lock and during exit; inject a lock event one frame early and reject it. If an audio route is used, separately verify event timing and pan. |
| [ReactDrops Showcase Pointer / source and usage](https://github.com/crisjavr/reactdrops/blob/aed0014649a2f0964041ac33c5f02dc3a40c5e13/README.md#showcase-pointer-scripted-multiplayer-cursors) · [component license](https://github.com/crisjavr/reactdrops/blob/aed0014649a2f0964041ac33c5f02dc3a40c5e13/LICENSE) | Scripted pointer events can emit presentation callbacks without dispatching actual clicks or navigation. A separate glass effect provides material, not proof of interaction. The terms do not authorize redistributing the source as a reusable kit. 未运行组件，不继承过去玻璃小样对指针或聚焦的验收。 | 原创镜头用同一事件表：先确保指针尖端在目标框内，再按压，再更新界面；焦点切换时保护未参与区域。对照反例：焦点先变、指针偏靶、或把指针动画当成真实点击。 |
| [oso95/scroll-world README](https://github.com/oso95/scroll-world/blob/71cc36d3bb150248ae36a2c552f9cbf88802a79c/README.md#what-it-does) | Upstream uses pre-rendered scene and connector footage, with scrolling driving playback position; a connector takes actual neighbors’ output frames as endpoint references. A separately produced 9:16 chain is described. 未安装、未调用付费生成、未评估真实滚动/浏览器或手机。 | Check endpoint agreement **and** direction/speed around the join. In a continuous timeline, count a shared endpoint once unless an intentional hold is specified. For a gallery, this principle is optional for transitions, not a reason to add forced scroll. |

## Independent check performed / 已跑的原创试验

Run the [original seam test](../scripts/test_motion_seam.py) with `python3 -B web-video-presentation/scripts/test_motion_seam.py` (tested on Linux with FFmpeg 7.x). It authors four 160×80 lossless original MKV clips, decodes their RGB frames, compares the complete join frame and measures the target centroid on either side. This is an isolated test, not a browser or upstream demonstration.

| Case / 用例 | Endpoint / 接缝 | Incoming → outgoing px/frame | Result |
|---|---|---:|---|
| intended seam / 正常接缝 | identical / 同帧 | 4 → 4 | PASS |
| same image, speed kick / 同帧但速度跳变 | identical / 同帧 | 4 → 10 | correctly rejected / 拒绝 |
| start-position jump / 位置突跳 | different / 不同 | 4 → 4 | correctly rejected / 拒绝 |

The ±1 px/frame tolerance is specific to this 30 fps fixture, not a production aesthetic rule. A full implementation must separately check presentation timestamps, seek behavior, aspect/orientation, intentional holds, and real playback.

## Exact earlier project IDs / 另两项的确切身份

- **Code2Video** here means [OpenSenseNova/SenseNova-6.8-Code2Video](https://github.com/OpenSenseNova/SenseNova-6.8-Code2Video/tree/776ae79824e338ba5d63fef66167455edc94ad26/skills/code-video/scripts), not the same-named Show Lab research. The pinned [sync checker](https://raw.githubusercontent.com/OpenSenseNova/SenseNova-6.8-Code2Video/776ae79824e338ba5d63fef66167455edc94ad26/skills/code-video/scripts/sync_check.py) selects each event's nearby peak separately. As a bounded source observation, it does not establish that two intended events map to two distinct onsets; nor does an empty effective event list demonstrate sync. The [original event-test script](../scripts/test_motion_onsets.py) actually synthesizes and FFmpeg-decodes simple PCM pulses: two events with two onsets pass; two events sharing one nearby pulse fail; zero required events is not applicable; a missing pulse fails. No claim about real music mixes, upstream execution or a shipped feature. 如采用编码挂钩，成功也需编码退出码、成片探测、完整解码三项独立证据。
- **703 prompts / 提示词索引**: the [pinned yihui-dev directory](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/92aee2f586ac0715cb3cbcb6384834f98a33383d/README.md) reports 703 indexed prompts, 418 with a hosted remake and creator ownership of media/prompts. The index, the published original, a remake and individual rights are four different things. For an adaptation, preselect one practical mechanism and compare the same start, trigger and settled phases; report observed deviations and keep a separate held-out prompt for generalization. This pass reviewed catalog structure, not individual films or licensing of every file. 不搬提示词、媒体或生成结果，不把数量写成交付能力。
