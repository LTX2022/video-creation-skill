# 实拍前景动态图形：先选合成层级

用户说“放在实拍前景”时，区分以下三层能力；不要把第一层包装成第三层。

| 层级 | 所需事实/资产 | 可以声称什么 |
|---|---|---|
| 屏幕固定 `screen-space` | 本地底片、固定画面坐标、时间映射、禁遮挡区 | 在实拍画面上叠图形，不跟随世界对象 |
| 显式 tracking | 跟踪点/平面/摄像机数据及坐标单位，或明确手工关键帧 | 实际完成的跟随范围；手工动画不叫自动跟踪 |
| 遮挡/镜头级合成 | 主体/前景 matte、深度或分层、透视、模糊/颜色匹配 | 在实际验证区间内正确前后遮挡，不承诺自动抠像 |

当前内置 `composition-manifest.json` 支持第一层；tracking/occlusion 配置在没有专门实现时应阻断，而非静默忽略。后两层可以作为明确新增制作工作，先取得素材/授权/实现计划。没有底片时先做 Alpha + **合成测试板**；不声称实拍、跟踪、遮挡验收通过。

## 本地底片契约

**当前规格限制**：脚手架项目fps只接受24–120的整数，不能直接创建30000/1001等精确分数fps项目。源底片可以是分数fps，并通过明确的 `fpsPolicy: resample` 适配为整数项目fps；这不等于保留源cadence。若用户要求输出精确保留分数fps，必须先扩展实现并验证时间/帧数/编码链，不提供看似可直接执行的现成CLI。12秒×30000/1001不是整数帧，需明确选择实际帧数与对应时长，不能同时伪称两者精确。

底片放 `public/plates/`，原片不覆盖，文件入 `asset-manifest.json` 并有来源/使用权。项目根：

```json
{
  "schema": 1,
  "coordinateSpace": "screen",
  "backgroundColor": "#000000",
  "plates": [{
    "id": "plate-main",
    "assetId": "user-plate",
    "src": "plates/take-01.mp4",
    "startFrame": 0,
    "durationInFrames": 180,
    "trimStartSec": 0,
    "fit": "contain",
    "fpsPolicy": "resample",
    "audio": "mute",
    "volume": 1
  }]
}
```

- `src` 是 public 相对路径；资产清单的 path 与该素材对应。不能用任意远程 URL 绕过入库/授权。
- `startFrame`、`durationInFrames` 是**项目帧**；`trimStartSec` 是**源秒**。例如项目第 90 帧不等于源第 90 帧。
- `fit: contain` 完整显示可能留边，`cover` 填满可能裁切；明确主体位置/不能裁掉什么。
- `fpsPolicy: resample` 为明确复帧/丢帧采样，不是光流；`reject` 拒绝不匹配。源时长需覆盖使用区间，不能悄悄冻结尾帧。
- `audio: mute|keep` 明确底片声音，`volume` 可在 0–1；Alpha 仍静音。底片声、旁白、音乐混合要试听，避免重复声道。

`outputMode: composite` 输出 `output/full-composite.mp4`；`both` 同时保留透明 `output/full-alpha.mov`。同一前景/timing 驱动二者；Alpha 中不得保留底片。

## 空间与可读性

先标注脸、手、产品关键动作、现有字幕/平台 UI 的禁遮挡区，再放前景。叠加图形可以接触主体、延伸动作方向、揭示路径或读数，但没有跟踪时保持屏幕语义，不假装透视贴附。

需要遮挡时的层序是：底片→被前景遮住的图形→前景 matte/主体→前方标注。matte 必须是真实资产/算法输出或手工制作，不能只在文档里声明。透明发光和软边要在目标亮暗/纹理处检验；必要时局部背板提高可读性，而非删掉全部图形阴影。

局部前景在每个shot填写 [overlaySafety契约](ALPHA-COMPOSITING.md)：bounds/coverage按实际图形，标签记录实际最小像素，不套55%覆盖或竖屏全屏标题尺度。真实底片上检查人物/产品禁遮挡区、可读性与边缘留白，保存output/下对应审图帧后再填写reviewed flags；没有底片仅能记录测试板结论。该字段不生成跟踪、matte或自动避让。

## 镜头级验收

至少检查：源 trim、入出点、跨 step 连续性、帧率 cadence、音画同步、禁遮挡区、尺寸适配；tracking 额外看锚点滑动、透视和出入画；matte 额外看头发/手/模糊边界、前后顺序及整段时间一致性。缺任何一层，就只声明已经完成的层级。
