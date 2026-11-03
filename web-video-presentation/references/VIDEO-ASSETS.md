# 视频素材：来源、时间与适配

使用本地实拍、录屏、动画或参考视频时读本页。参考素材不是默认可交付资产；`reference` 标记不能绕过来源、文件存在或授权检查。

## 入库

保留原片，派生文件另存。`public/` 内文件用 `staticFile()`；清单记录 id、路径、用途/角色、来源/作者、许可依据、实际 probe 宽高/fps/时长、所用区间。版权或人物/品牌许可未知时写未知，不自动设 `commercialUse: true`。

资产清单的声明不替代对真实文件 `ffprobe`。缺文件、空文件、无法解码、声明与实际冲突、区间越界均需修复。素材平台候选不等于已下载或获授权，不向第三方上传用户实拍除非明确获准。

## 源与项目不必同规格

- 明确 `contain`/`cover` 或实际裁切，记录原因和主体位置；不要为过校验先破坏原片。
- 源 fps ≠ 项目 fps 可以明确 resample（重复/丢帧）或 reject。优先考虑项目匹配源 cadence；不是每片都转成 60fps。
- 光流插帧需用户需要且另做伪影检查；快速手势、遮挡和透明边缘会出错，**不作为默认修复**。
- 变速改变时长/音调/动作关系，不等同帧率归一化。VFR 先 probe 时间戳，必要时生成可重现 CFR 派生版本并保留原片。
- 源时间、项目时间和 step 局部帧分清。跨多个 step 的连续底片放在统一 composition 层，不每 step 重头播放。

内置底片字段与支持边界见 [LIVE-ACTION-OVERLAYS](LIVE-ACTION-OVERLAYS.md)。不能凭文档中的扩展建议声称已实现 tracking/occlusion/光流。

## 渲染与音频

当前项目依赖支持的 `OffthreadVideo` 用于帧准确视频取样；核对实际 Remotion 版本与 API，不照搬过期 import/props。视频默认不要意外播放音轨；保留底片声时显式记录，Alpha 目标强制静音。

## 检查

实际渲染起态、快速运动、裁切边缘、源尾端、跨 step 接点；全片解码后查看 cadence、冻结/重复、时长与音频。技术通过不是画面合理；非本项目尺寸不是单独的失败理由。

## 当前清单的适配字段

与项目尺寸/fps不同的非参考视频，需要同时在资产项记录 `adaptation`，合成底片自身也有对应策略：

```json
{
  "id": "user-plate",
  "type": "video",
  "path": "public/plates/take-01.mp4",
  "usage": "composite background plate",
  "source": "<真实来源与已确认使用权记录>",
  "commercialUse": true,
  "placeholder": false,
  "width": 1920,
  "height": 1080,
  "fps": 24,
  "durationSec": 10,
  "adaptation": {"fit": "cover", "fpsPolicy": "resample", "trimStartSec": 0}
}
```

示例数值必须换成实际 probe 结果；`commercialUse:true` 只能在确有相应权利时填写。旧的明确商业授权分支保持兼容；未知授权不能为过门禁改成 true 或 placeholder。清单是使用范围记录，不是法律结论。

### 仅个人 / 非商业授权素材

合法个人素材不需要虚构商业授权。先按用户实际用途在 `project-state.json` 明确设置 `"intendedUse": "personal"` 或 `"noncommercial"`，再在对应资产上记录：

```json
{
  "commercialUse": false,
  "authorization": {
    "allowedUses": ["personal"],
    "basis": "<实际授权人及许可范围，不能填未知或推测>",
    "evidence": "<可追溯的用户授权原话/消息日期引用或真实许可记录>"
  }
}
```

`allowedUses` 必须明确包含本项目的准确用途；personal 与 noncommercial 不自动互相推断。来源 `source`、实际用途 `usage`、视频规格及其他既有检查仍必填。两处门禁 `validate-assets` / `preflight` 使用同一授权规则。用途缺失/未知、缺授权依据/证据、个人授权配商业用途均拒绝；非空文字本身不证明真实权利，执行者仍须核对其真实性与范围。商业项目仍需真实 `commercialUse:true`，不得把本地处理权限当作公开发布或商业使用许可。

未使用这一窄分支的旧项目无需补填 intendedUse；模板不会擅自选择用户用途。`intendedUse` 与资产清单纳入输入修订身份，改变用途/授权后旧渲染及最终交付证据失效。新增权限绑定会令旧版本未绑定这些字段的证据需要重新核验；不会修改素材或将 false 改成 true。
