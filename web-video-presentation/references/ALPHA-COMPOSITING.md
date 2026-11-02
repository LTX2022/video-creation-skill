# Alpha：透明动态素材的交付契约

适用于透明图形素材，不把 Alpha 当作“所有视频都多导一份”。`outputMode: alpha` 合理地允许静音、无字幕、无封面；`both` 是 Alpha + 实拍合成，必须有底片。模式与输出路径由 `scripts/delivery-contract.ts` 统一。

## 先区分三件事

1. **透明素材**：RGBA PNG 序列或 ProRes 4444 MOV，含真实 Alpha，本身没有底片。
2. **扁平合成**：前景和底片合成的 MP4，不再含可分离透明度。
3. **镜头级 VFX**：跟踪、透视、遮挡、抠像、模糊和匹配；不是导出透明 MOV 就自动拥有。见 [LIVE-ACTION-OVERLAYS](LIVE-ACTION-OVERLAYS.md)。

PNG 序列可作选配母版/诊断基准，当前默认 Alpha 交付为 MOV；不要把未实现的额外格式当默认已生成。WebM 等仅在目标软件有需求并实测后增加。普通 H.264 MP4 不作透明母版；目标软件支持的其它编码能力需具体核实，不能用“H.265一律不支持透明”等泛断言替代。

## 图层隔离

- Alpha composition 根透明，关闭主题/舞台背景，底片不进入 Alpha。
- 章节获得 `isOverlay`；明确背景用 `data-scene-background` 标记。只移除真正场景背景，不全局删除所有 `background`、fill、卡片、接触阴影或 glow。
- 网页上依赖白/黑背景的透明材质可能不适用于实拍。玻璃折射需要知道后方内容；Alpha 贴图不会自行折射新底片。
- 棋盘格、黑白底是审阅合成，不得烘入透明母版。内容内部不透明表面可以合法存在。
- 前景音频策略明确；当前 Alpha 目标静音。动画组件内嵌视频也要静音，不能只移除 narration。

## 无声时间线

`project-state.json` 可设置 `timingMode: "explicit"` 与逐 step 的 `stepTimings`（chapter、1-based step、正整数 durationInFrames）。每个 step 恰有一项；空 narration 仍是 step。这样短瞬态/hold/loop 不被口播字数或1.8秒估时限制。完整示例见 [RENDERING](RENDERING.md)。

## 局部前景与 `overlaySafety`

`alpha` / `composite` / `both` 的每个 shot 使用局部前景验收，不套用 opaque 的55%全屏覆盖率或竖屏大标题字号。小角标、产品名、价格和纯图形都可以；静音不等于禁止屏幕文字。`visualCoverage` 如实填0–1范围内的数字，不能为过门禁把小角标写成0.55。

以下是 **shot-manifest字段片段/待审结构示例**，不是已通过的测量数据：

```json
{
  "visualCoverage": 0.08,
  "onScreenText": ["LUMA", "¥299"],
  "overlaySafety": {
    "coordinateSystem": "normalized",
    "bounds": {"x": 0.05, "y": 0.72, "width": 0.4, "height": 0.25},
    "minTextPx": 24,
    "readabilityReviewed": false,
    "edgePaddingReviewed": false,
    "reviewEvidence": "output/golden/local-overlay-frame.png"
  }
}
```

把示例数值换成实际前景范围、覆盖率与最小文字像素。bounds以整帧归一化，宽高为正且不超画幅；覆盖率不能大于bounds面积。有文字时 `minTextPx` 为实际正数，纯shape可省略。证据须为 `output/` 下真实存在的本地PNG/JPEG/WebP，并对应当前图形与目标背景；不得造空文件/借旧图满足路径检查。

只有实际查看可读性、边缘留白和禁遮挡区后才设置两个reviewed flag为true；脚手架生成的0/false/空路径是故意待审。布尔值与文件存在只证明记录条件，不能替代审图；它也不替代正式Alpha当前hash绑定的 `alpha-edge-review` 用户确认。没有实拍只能在测试底上审查并说明待实拍，不新增自动tracking能力。

## 格式与精度

记录尺寸、精确 fps、N 帧、起始编号/时间原点、预期 handles/hold、Alpha 解释（straight/premultiplied）、颜色元数据、源精度与目标软件版本。未知的色彩/Alpha 解释标待验证，不声称全链路线性或高位深。

[Remotion 官方 ProRes 文档](https://www.remotion.dev/docs/prores) 的编码组合为 `--codec=prores --prores-profile=4444 --image-format=png --pixel-format=yuva444p10le`。使用本包 `npm run render:video:alpha` 封装路径；避免传入与目标冲突的编码参数。ProRes 有损，16-bit Alpha 编码不会增加 8-bit 源的真实精度。

## 验收分三层

### A. 技术与像素统计

检查实际文件存在、哈希、codec/profile、尺寸、精确 fps、帧数、时长、音轨数；全程解码。抽样必须覆盖入场、内容、半透明/模糊、退出，不只第零帧。

`yuva` 表示解码格式提供 Alpha，不表示画面真的透明。检查 A 通道 min/max、透明/半透明/不透明比例、非透明包围盒；按设计允许空 handle，主要内容帧不能全空，透明素材不能意外全程实色矩形。

### B. 合成边缘与运动

在黑、白、中灰和彩色/纹理底上合成解码产物，检查细线、软阴影、模糊尾迹、裁边、白边/黑边、色漂、单帧闪烁。源 PNG 与解码 MOV 的比较同时看 Alpha 和可见合成，不把完全透明区域的 RGB 差异直接当可见误差。持稳区逐帧稳定，循环接缝单独验证。

脚本当前生成黑/白边缘图与 `pending-human-review`，不能自动替用户证明边缘通过。用户确实看过当前产物后记录：

```bash
npm run feedback -- --type=alpha-edge-review --scope=output:alpha --target=<当前Alpha文件SHA256> --quote="<真实用户确认原话>" --resolution=accepted --source=agent-transcribed --source-declaration="转录当前消息；未做宿主身份认证"
```

确认与 SHA256 绑定；改代码重渲后旧确认不再证明新产物。黑白通过也不替代灰底、复杂纹理/实际底片的额外检查。

### C. 宿主与真实底片

在指定软件/版本中导入、明确 Alpha 解释、叠真实底片播放并重导出测试段。未操作目标软件必须写“待验证”，不能说“所有剪辑软件兼容”。没有实拍只能交测试板，不能说实拍合成/跟踪验收通过。

## 诊断命令（在已授权环境）

```bash
ffprobe -v error -select_streams v:0 -count_frames -show_streams -of json output/full-alpha.mov
ffmpeg -v error -i output/full-alpha.mov -map 0:v:0 -f null -
# qa 目录先创建；实际命名/采样与项目契约一致
ffmpeg -i output/full-alpha.mov -map 0:v:0 -vf alphaextract -fps_mode passthrough qa/alpha_%06d.png
```

[FFmpeg alphaextract / overlay](https://ffmpeg.org/ffmpeg-filters.html) 与 [ProRes encoder](https://ffmpeg.org/ffmpeg-codecs.html#ProRes) 说明的是工具能力；执行日志和人工审图才是本项目证据。

## 失败处理

全不透明、内容全空、尺寸/帧数不符、隐含音轨、明显边缘错误、尾帧冻结或导入错误均不得称完成。先定位根背景/图层、解码路径、预乘解释、源时间/裁切；不能靠改文件后缀、换黑底预览或伪造 accepted 解决。

## 短暂前景的采样位置

默认稀疏五帧可能错过只有几帧出现的前景。已知前景出现位置时，在 Alpha 正式或烟测命令传 `--alpha-sample-frames=0,10,59`（示例，不是统一默认）。这些是编码输出的帧索引，不是原片/全局帧；裁切片段后要重新换算。最多32个非负整数，越过输出末帧会失败。它选择实际解码检查位置，绝不将失败自动改成通过；要覆盖透明 handles、前景出现、运动峰值及收束，并继续人工检查黑白底和目标编辑器。稀疏采样通过不证明其余时间没有问题。
