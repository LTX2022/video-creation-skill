# Outline 与镜头契约

`outline.md` 是可编辑的内容/时间规划；`shot-design.md` 是给用户看的画面方案；`shot-manifest.json` 是机器检查清单。不要强制用户读 JSON。

## 顶部规格

记录主题、profile、outputMode、尺寸、精确 fps、目标时长、章节/step 数、音频/字幕选择。内容选择有来源；未知事实不靠装饰数字补齐。

```markdown
# Video Outline
> Profile: custom · Output: alpha · 1080×1920 · 30 fps · 28s
> Audio: none · Subtitles: none · Theme: <选定主题>

## 1. flow — 输入如何成为结果（4 steps · ~28s）
信息池：
- 处理阶段的实际定义 —— 来源：用户材料 §2
- 这里省略等待队列，延迟为教学示意 —— 模型边界

- step 1 (~4s) — 建立输入对象与目标位置
- step 2 (~8s) — 同一对象沿连接进入处理阶段，处理状态可见
- step 3 (~10s) — 结果出现，再改变一个输入做对照
- step 4 (~6s) — 回到整体，保留结果供读者理解

素材：流程图形自绘；真实截图待用户提供，不宣称已验证产品行为。
```

例子的 28 秒是可选节奏，不是用户既有原片的分析或所有素材模板。口播模式将每步连到 `script.md` 的真实文本；音频实测后重算时间。静音模式以可读时间与动作完成时间定义区间。

共写时把 [VISUAL-SCRIPT](VISUAL-SCRIPT.md) 的节拍表直接放在现有 `shot-design.md`；来源/旁白/实际上屏文字/制作备注分列，不新增机器 schema。短任务和例集只按当前内容需要读取。

## 字段与同步

- 章节 id 用小写拉丁字母/数字/连字符；文件夹可用 `01-flow`，组件 PascalCase。
- 文档 step 从 1 开始，代码局部 step 常从 0 开始，显式核对；`narrations.ts` 是实际 step/text 源。
- `claim`、`visualModel`、`source`、`motionIntent` 必须具体。`motionIntent` 写谁如何变化以证明什么，不只写“fade”或“高级感”。
- 机制镜头在 `shot-design.md` 记录 model state/readout/invariants 等设计契约；未实现的 JSON 扩展字段不能声称已被校验器执行。
- `motionTechnique` 按需选既有技法，不通读库。节拍用“建立/到达/获批/结果”等名字，标明依次/并行/错峰/hold；实现时仅在一处绑定既有 timing/cue/stepTimings，详见 [RHYTHM](RHYTHM.md)。
- 实质改变章节或命题后同步确认；细分 step 不改变用户理解时同步各清单并记录理由，不无条件重问。

## 无声/局部前景的清单

静音项目的 `narrations.ts` 可用空字符串保留step；在project-state中用 `timingMode: "explicit"` 和完整 `stepTimings` 定义帧数，不往空口播塞标签或虚构声音。画面上的产品名/价格写在 `onScreenText`，不是字幕。

当outputMode为alpha/composite/both时，每个shot另填 `overlaySafety`：归一化bounds、真实覆盖率、有字时实际minTextPx、readabilityReviewed/edgePaddingReviewed与output/下的真实审图图片。完整字段片段见 [Alpha规范](ALPHA-COMPOSITING.md)。自动生成的0/false/空路径是待审占位，不直接改成通过；opaque原全屏覆盖率规则不用于局部前景。

## 自检

所有时间区间覆盖目标时长，口播估时与最终音频明确区分；信息池可追溯；素材缺项已标注；画面有可辨对象/关系；不存在只为了卡固定秒数拆碎的动作。既有 profile 的节奏是起点，不以 1.7 秒上限把完整因果剪断。
