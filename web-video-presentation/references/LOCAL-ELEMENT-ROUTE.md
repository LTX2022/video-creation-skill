# 用户素材动画 / 单镜头本地路线（已实现，不是提示词）

这只是**已有素材**的小任务入口，不是整个 skill 唯一的单镜头方案。无实拍/无上传素材时，可以从零设计动态单画面；走无素材画面/生成路线，不要求用户先提供底片。完整视频仍走主 scaffold 的分镜、配音、审片交付链。

## 通用素材观察与动作设计

任意用户图像/视频先读 [ASSET-MOTION-DIRECTION](ASSET-MOTION-DIRECTION.md)：真实查看素材，以用户意图和可见结构设计动作，不按固定动物列表路由。已实现 `layered-rig` 支持任意名称的一层或多层 PNG、显式枢轴、独立变换/透明度关键帧及周期运动，沿用本文 Alpha 与底片合成。它不自动识别、分割、绑定或恢复隐藏部位；照片/视频需局部动作时先完成真实素材准备，不能悄退为整图摆动。原有 `layered-wings` 保留兼容，通用新任务优先按所需动作选 generic rig。

## 入口只补真正缺失的信息

先从用户已说的需求判断：完整视频 / 单镜头画面 / 单元素动画。用户明确“这只蝴蝶动起来叠到这个镜头前”就直接采用单元素 + 实拍合成，不再重复询问平台和任务类型。尚未明确时只问一次三选一；可同时提供“从零设计 / 用我的素材”选择。

只补缺失且会改变产物的信息：可读素材路径及使用权、输出时长/帧率/尺寸、出现区间/位置、是否保留原声、透明素材还是直接叠底。如果用户已明确需求，这些事实应从当前任务提取，不为填表机械重复问。执行范围包括新输出目录和本地处理；上传到付费模型/外部服务是另一权限，不被本地授权自动覆盖。

## 运行环境与边界

需要已安装 Python 3.10+、Pillow、FFmpeg、ffprobe。不自动联网、装包、购买服务或上传素材。缺依赖时报告具体缺项；安装要遵守当前环境许可。

`SKILL_ROOT` 必须从当前实际安装位置确定：它是包含本 skill 的 `SKILL.md`、`scripts/` 和 `references/` 的绝对目录，不是当前工作目录，也不是客户项目目录。不要照抄其它机器的安装路径；执行前确认目标脚本真实存在。下面所有脚本均用绝对路径，可在客户项目或任何其它目录调用：

```bash
# 将值替换为当前环境已确认的实际安装目录（不要使用占位值执行）。
SKILL_ROOT="/absolute/path/to/installed/web-video-presentation"
test -f "$SKILL_ROOT/scripts/local-element.py" || exit 1
python "$SKILL_ROOT/scripts/local-element.py" /absolute/path/request.json --output=/absolute/path/new-result
python "$SKILL_ROOT/scripts/test-local-element.py"
# 可选：保留合成测试板与真实编码文件，目录必须不存在
python "$SKILL_ROOT/scripts/test-local-element.py" --artifacts=/absolute/path/new-test-evidence
```

合同文件和输出目录也使用明确的绝对路径。合同内素材相对路径始终相对于 **request.json 所在目录** 解析，绝不相对于调用者 cwd；脚本不会在调用者目录落下缓存或产物。

- 这是 **Pillow RGBA 帧 + 本地 FFmpeg 编码** 的可执行独立路线，不是浏览器/Remotion 渲染，也不声称通过主项目的正式交付门禁。
- 输入只读；记录 SHA256 并在渲染后校验。底片只接受自包含常见容器，probe/编码限制本地 file 协议与容器白名单，拒绝 HLS/concat/DASH 等引用外部媒体的播放列表，不能仅哈希列表却声称验证了实际视频。输出目录必须是新目录，绝不覆盖输入或旧结果。失败目录保留诊断上下文；已生成媒体改名 `.incomplete` 并写 `render-failed.json`，正常捕获失败不留下交付文件名；修正后另选新目录。进程强杀/断电不是原子发布保证，此时 `render-in-progress.json` 保持未完成；只有已生成完整 evidence 且无 in-progress/failed 标记的输出可进入审片。
- 仅支持 `screen` 屏幕坐标。真实 tracking、遮挡、光流和模型服务不在本实现内，带这些要求会明确拒绝，不能悄悄用简单贴图冒充。
- 权利声明是任务方提供的使用范围记录，不是程序认证了版权。无需为个人授权素材伪填 `commercialUse: true`；迁入主项目时按 [VIDEO-ASSETS](VIDEO-ASSETS.md) 的 `intendedUse` + `authorization.allowedUses/basis/evidence` 契约填写真实授权范围，不必把个人授权伪报为商用。

## 最小合同：自己的蝴蝶 PNG 飞到自己的镜头前

路径相对 request.json，也支持明确的本地绝对路径。必须把例子里的素材、授权说明与参数换成真实任务事实。

```json
{
  "schema": 1,
  "scope": "element-animation",
  "localProcessingAuthorized": true,
  "coordinateSpace": "screen",
  "width": 1920,
  "height": 1080,
  "fps": "30000/1001",
  "frames": 120,
  "outputMode": "both",
  "element": {
    "motionModel": "rigid",
    "asset": {"path": "assets/butterfly.png", "rights": "用户提供，并明确授权在本镜头中使用"},
    "startFrame": 10,
    "endFrameExclusive": 110,
    "allowClipping": false,
    "keyframes": [
      {"frame": 10, "x": 0.2, "y": 0.6, "scale": 0.4, "rotationDeg": -10},
      {"frame": 55, "x": 0.5, "y": 0.35, "scale": 0.5, "rotationDeg": 5},
      {"frame": 109, "x": 0.8, "y": 0.4, "scale": 0.4, "rotationDeg": 10}
    ]
  },
  "plate": {
    "path": "assets/my-shot.mp4",
    "rights": "用户拍摄并授权本地合成",
    "trimStartSec": 2,
    "fit": "contain",
    "fpsPolicy": "resample",
    "audio": "keep"
  }
}
```

- `frames` 是实际交付帧数，时长 = frames / fps；分数 fps 用字符串，不能同时许诺不相容的精确秒数。
- 元素入出点是**输出时间线帧**，end 为不包含末端；关键帧必须覆盖首/末可见帧，位置为全画幅归一化的元素中心；scale 相对于原 PNG 尺寸；rotationDeg 为二维逆时针旋转。当前插值为逐段线性，不伪称贝塞尔或真实世界轨迹。
- `allowClipping: false` 会对每帧实际非透明包围盒检查；需要从画外飞入时可在用户意图明确后设为 true。该开关不是遮挡或自动避脸功能。
- `trimStartSec` 是底片源秒；`contain` 保全画面、可能有边，`cover` 会裁切；`resample` 仅丢/复帧，`reject` 拒绝平均帧率不匹配，并逐帧校验源时间戳间隔（容许源 time_base 量化误差），不能用平均帧率假装已保留 VFR 节奏。底片必须够长，不循环或冻尾。`audio: keep|mute` 必须明确；透明输出始终无音轨。
- 元素输入只接受单帧 PNG；APNG 会明确拒绝，不悄用首帧。所有输入 PNG 要有真实透明度、至少透明和可见像素；RGBA、LA、带透明索引的 PNG 可无损规范化为 RGBA。JPG/不透明背景图会拒绝；不偷偷抠图、重绘或改源。

## 蝴蝶扑翼：按实际素材选择，不虚构能力

| 输入 | 可执行路线 | 不应承诺 |
|---|---|---|
| 单张透明平图 | `rigid`：整图平移、旋转、缩放 | 独立翅膀、背面或三维骨骼 |
| 已注册同尺寸的身体/左翼/右翼 PNG | `layered-wings`：真实分层绕指定翼根做二维横向缩放模拟扇翅 | 恢复不存在的翅膀背面、物理真实飞行 |
| 不透明照片/未分层平图但用户要独立翅膀 | 先明确获得抠图/分层授权并实际制作可检查层；或转有授权模型服务 | 自动从任意平图准确恢复分层 |
| 要生成式真实飞行 | 另走模型服务、审查上传/费用/隐私/结果，不由本脚本暗中调用 | 本地刚体或2D扑翼等于生成式视频 |

分层时将 `asset` 替换为下列字段，沿用相同的时空参数。**层按列表顺序叠加**；hingeX 是原图像素坐标，三个 PNG 必须共享已对齐的画布，不是三个紧裁切图随意叠放。周期使用帧时间，不依赖墙钟。当前通过归一化余弦横向收展，每秒 `flapHz` 次开合；它只是二维拟态，不是物理生物飞行模拟。

```json
{
  "motionModel": "layered-wings",
  "flapHz": 2,
  "minWingScale": 0.2,
  "layers": [
    {"role": "left-wing", "path": "assets/left.png", "hingeX": 256, "rights": "已授权左翼分层"},
    {"role": "right-wing", "path": "assets/right.png", "hingeX": 256, "rights": "已授权右翼分层"},
    {"role": "body", "path": "assets/body.png", "rights": "已授权身体分层"}
  ]
}
```

## 单镜头裁切与输出模式

- `scope: single-shot` + `outputMode: composite` + `plate` 可不带 element：对已有镜头明确裁切、尺寸适配和原声处理；这是素材镜头处理，不叫从零设计新镜头。
- `alpha`：只生成 `element-alpha.mov`，不能传 plate（避免把底片混进母版）。
- `composite`：底片必填，只交 `shot-composite.mp4`。
- `both`：同时交透明 MOV 和实拍合成 MP4。无底片不得暗中用合成测试板冒充用户实拍。
- MOV 使用 ProRes 4444 / `yuva444p10le`；H.264 MP4 是扁平合成，不含透明层。源为8位 PNG，不能宣称因编码10位而获得真实新增精度。

## 验证与交付

`render-evidence.json` 记录输入/输出 hash、源未变、尺寸/帧数/fps/音轨、实际命令、完整合同和明确 renderer。实际输出经过 ffprobe 计帧及全程解码；所有模式逐帧检查元素不能全程不可见；透明母版还抽实际解码 Alpha 的 min/max/bbox（首尾、出现、内容中段、消失前，另强制加入真实可见帧）；回归另检查透明 handles、可见 alpha、运动方向、真实分层宽度变化、合成像素、音轨和拒绝用例。

测试的蝴蝶状标记/蓝底/音调全部是 **synthetic regression fixture**，不是用户素材、不是写实镜头、不是浏览器证据，也不能替用户审美确认。测试保留的 `synthetic-contact-sheet.png` 仅供看技术行为。

仍要人工看当前产物在黑白/纹理和实际底片上的边缘、运动、时机、主体禁遮挡区；目标编辑器导入/Alpha解释/色彩管理未实际操作就标未验证。证据默认 `pending-human-review`，脚本不会伪造 accepted。与主项目合流时登记 asset-manifest、shot-manifest/overlaySafety 和输出 hash；不能用该独立回归报告跳过正式验收。

已有契约与能力边界：[Alpha](ALPHA-COMPOSITING.md)、[实拍前景](LIVE-ACTION-OVERLAYS.md)。官方技术背景：[FFmpeg overlay](https://ffmpeg.org/ffmpeg-filters.html#overlay)、[ProRes 编码](https://ffmpeg.org/ffmpeg-codecs.html#ProRes)、[Remotion 透明输出](https://www.remotion.dev/docs/transparent-videos)。
