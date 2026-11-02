# 视频制作 Skill · 60 风格公开整理候选

**3.8.0-public-candidate.1 · 离线准备，尚未发布 GitHub。用户已同意其有权授权的原创代码采用 MIT；第三方与媒体不自动适用 MIT。公开前仍需完成来源核对。**

这是原有 Web Video Presentation Skill 的筛选版本，不是新做的独立 model-first Skill。保留 `web-video-presentation/` 与可选 `fix-agent/`。开始使用见 [中文说明](web-video-presentation/README.zh-CN.md) 和 [SKILL](web-video-presentation/SKILL.md)。

## 保留功能

- 60 个主题目录（56 原有 ID + 4 个新增场景）；120 个主题文件与输入源逐字节相同。
- 五个 profile、Remotion 脚手架、音频/字幕路线、opaque/alpha/composite/both 输出契约、连续对象/时间采样、确认与质量门禁。
- 可选 fix-agent；第三方许可、依赖 lockfile 和来源说明。
- 运行时代码保留不等于真实渲染已验收。需要用户独立项目目录、合法素材、相应依赖及明确操作授权。

## 删除及影响

- 整个 `lq-distillation/`（原73文件，包括抽帧、转写、账号列表、研究日志及批处理）不附：缺乏已确认的再分发授权。**旧下载/批量蒸馏工具及研究复现能力不再提供**；兼容 profile 和通用制作功能不因此移除。
- 不纳入总包 `legacy/`、全部嵌套/重复 ZIP、外层历史验证与研究附件、重复风格预览包与未经来源筛选的附件；精选自有视频例外列入 media。60风格的可执行源码仍在。
- 核心10个历史图片二进制不附，恢复已核对原创来源的缓存边界视频；另纳入26秒秩序与14秒THREAD；原60风格总览因历史字体未锁定而排除，另以可核Noto字体重新生成完整384秒新总览，含全部60套风格，见 [视频示例](media/README.md)。示例脚本、说明及历史 JSON 记录保留；未恢复的截图需重新生成，旧记录只描述历史产物。
- 5 份文档中的历史个人 Windows 目录已改为中性示例路径；中性路径不是默认输出目的地。
- 修正文档的研究材料入口；取消“无未授权素材”的整体保证。其余来源/文本/代码权属仍需逐项确认。

打包器现在在任意深度整体排除 `lq-distillation/`、`legacy/` 及 ZIP，新增真实临时打包回归防止重新泄漏。`.gitignore` 不是权利审查或秘密检测的替代品。

## 当前验证（2026-11-02，Linux / Node 24.22.1）

先离线探测，再经授权在候选外全新 `custom / landscape` 脚手架项目按保留锁文件执行 `npm ci --ignore-scripts --registry=https://registry.npmjs.org`（265包）。依赖缓存与 node_modules 均在候选外；初次默认缓存不可写已改用工作区缓存解决，未绕过审批。忽略安装脚本，因此不代表所有可选安装钩子已验证。

以下只描述本轮执行，历史 VERSION/示例验证块不是本轮证据：

- 根 MJS：244/244（含3条公开内容回归）；连续对象 runtime：20/20。
- Python promo-beat：15/15；temporal：20次场景调用、2次平台标签、3次采样mock通过。初次 `unittest discover` 未发现连字符命名测试，随后按文件直接执行通过。
- 真实隔离脚手架 `npm run typecheck` 和 `npm run build` 通过。build 是 Remotion bundle/timing 生成，不是视频渲染、编码或视觉验收。
- 安装依赖后：audio-source 11/11、contracts 43/43、quality-gates 34/34、render-route-args 8/8、review-render 19/19（假backend）、source-handoff 14/14、workflow 31/31；源模型69/69、cover契约24/24。
- 初测模板100通过/8文件失败，额外audio/workflow失败均记录保留，不能改写为初测全绿。安装依赖后模板111/112，暴露新测试helper未被scaffold复制；随后又发现临时测试子进程的tsx定位问题。已修并从最终候选重新生成脚手架，完整模板最终 **112/112**，pipeline **16/16路线**（验证器/渲染显式stand-in），mock TTS **82项内部断言**。并发期间一次10秒测试超时已保留，未放宽超时；停止冗余并发后原默认测试并发下通过。
- 新增打包器整目录排除检查、pipeline源模板真实scaffold夹具，修正辅助文件复制与临时测试loader定位；不伪造package或跳过依赖测试。两个旧教学模板已改为独立虚构例文，保留九/七段结构与profile兼容；去第三方尾句、账号和未证实效能/语速承诺。
- THREAD示例脚本增加必须指定外部空输出目录与字体预检，4/4拒绝场景通过，未重渲历史影片。
- **未验**：真实浏览器渲染、生产编码、视觉/音频验收、真实模型/TTS provider、目标NLE、原生Windows/macOS端到端。视频示例的历史生成结果不替代这些检查。

可复跑基础检查（在 `web-video-presentation/`）：

```bash
node --test scripts/test-*.mjs
node scripts/check-continuity-runtime.mjs
python scripts/test-promo-beat-check.py
python scripts/test-temporal-review.py
node --test templates/scripts/test-*.mjs  # 当前无依赖环境会失败；如实检查输出
node --import ./scripts/register-ts-runtime.mjs templates/scripts/test-contracts.ts
```

脚手架用法与依赖要求见核心 README；不要在技能源码内生成客户项目。测试会创建独立临时夹具，不代表客户授权或生产验收。

## 视频验证

[观看4条示例](media/README.md)：新60风格总览384秒、26秒秩序、14秒缓存边界、14秒THREAD。最大单文件约10.9MB。3条历史自生成成片完整解码通过；本轮新总览使用实际React/SVG场景、隔离Noto字体、librsvg/Cairo和FFmpeg，11,520帧完整解码、60段各抽样一帧并检查联系表通过。复现代码、字体hash及版本清单随包；这不是Remotion浏览器渲染、全帧美术/真人视听或客户验收。

## 发布前仍需完成

1. 权利人确认原包、保留摘要/模板/代码可公开，确认 MIT 适用文件范围；用户已明确选择其有权授权原创代码 MIT，不得扩张覆盖第三方或媒体。
2. 审查 [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md)，确认依赖、品牌名称及各保留来源的适用条款。
3. 核对下列最终验证状态；补齐尚未执行的真实渲染、代表镜头及目标宿主验收。
4. 明确目标 GitHub 仓库、可见性和发布授权，复核最终清单/哈希后才推送。

本次未写入 GitHub、未改变原 Library/原 ZIP，也未证明不存在所有形式的秘密或个人信息。范围有限的模式扫描不构成安全认证。
