# Lottie Assets

Lottie 是可选的语义动效素材输入，适合图标、流程节点和状态反馈；“没有素材”不自动触发搜索、下载、安装或强加一段 Lottie。先比较用户自有素材、原创矢量/代码画面与已授权生成路线，选能表达当前命题的方式。

**Lottie-like 风格、播放现有 JSON、导出可移植 JSON 是三件事。** 本页只处理素材接入，不提供整片转 Lottie JSON 的导出器；格式与播放器边界见 [REFERENCE-ADOPTION](REFERENCE-ADOPTION.md)。

## 什么时候使用

适合：

- 抖音 / 竖屏短视频中的动态图标、概念隐喻、状态变化。
- B站 / 教程里的步骤图标、流程箭头、加载、完成、警告、AI/数据/工具等轻量动画。
- 客户没有真实素材，但画面需要比静态图标更丰富。
- 需要小范围 loop 或一次性 reveal，不需要真实人物 / 真实产品图。

不适合：

- 客户品牌主视觉、真实产品外观、精确数据图、需要授权人物/商标的画面。
- 复杂场景、强风格 KV、电影感封面；按项目选真实/授权素材、生成模型或非图片模型构图，不把特定工具当必选。
- 未确认授权来源的商业视频。

## 搜索来源

只有需要外部 Lottie 且搜索在授权范围内时，考虑：

- LottieFiles 或同类 Lottie 动画库。
- 客户自有 Lottie JSON。
- 开源库，但必须检查 license。

若平台需 API，先确认已授权工具与安全配置；不索要明文密钥，不将密钥写入文档、项目、日志或交付包。无授权时保留缺项或选范围内的路线，不自动接入服务。

## 接入规则

1. 候选阶段只写 `asset-candidates/lottie-*.json`，不要直接当正式素材。
2. 选中后写入 `asset-manifest.json`：
   - `id`
   - `type: "lottie"`
   - `source`
   - `author`
   - `license`
   - `commercialUse`
   - `usage`
   - `path`
3. `shot-manifest.json.steps[].assets` 必须引用该 asset id。
4. 脚手架及 lockfile **声明** `@remotion/lottie` 与 `lottie-web`；默认仅写项目文件，不安装依赖。只有用户授权的显式项目安装（`--install-project`）才安装；`--skip-install` 仅保留兼容用法。现有项目是否可用须查实际环境，不因声明就声称已安装/已验证。获准使用时将 JSON 放在 `public/assets/lottie/` 或项目内可打包路径，通过 `staticFile()` 或可序列化 import 接入；不把外链 URL 当渲染时素材。
5. Remotion 中优先使用 `@remotion/lottie` 或确定性 JSON frame 播放；不要用浏览器真实时间、`setInterval` 或 CSS animation 控制。
6. 复杂 Lottie 加载必须保证渲染前数据已就绪；不能依赖浏览器运行时随机请求，否则 Studio 预览和 MP4 可能不一致。
7. 字幕开启时，Lottie 不得和字幕争夺底部安全区。
8. 实际检查入场、循环接缝、退出、字号/路径、字体与图片依赖；Alpha 模式还需亮暗底软边与局部 bounds 复核。成功解析 JSON 不等于视觉或透明合成通过。

## 与其它设计路线的关系

- Lottie 解决“没有素材但需要小型语义动效”的问题。
- 图像模型、真实素材和 SVG/Canvas 等代码画面各有适用范围，不因接入 Lottie 而替换用户选择的路线。
- 同一 step 可组合背景/主体与局部状态动画，但 Alpha-only 不强加场景底图；model-assets-only 路线也不偷偷用库存 Lottie 替换已约定生成素材。

## 记录模板

```json
{
  "id": "ai-thinking-lottie",
  "type": "lottie",
  "source": "https://...",
  "author": "...",
  "license": "...",
  "commercialUse": true,
  "usage": "chapter hook step 1 background semantic motion",
  "path": "public/assets/lottie/ai-thinking.json",
  "placeholder": false
}
```


## 依赖与候选工具边界

`scripts/scaffold.sh` 与 `templates/package-lock.json` 同时声明 `@remotion/lottie`、`lottie-web`、`animejs`；用户授权的显式项目安装与声明分离，不全局安装。依赖核对是静态检查，不代表已经执行安装。Anime.js 的 timeline/stagger/path/morph 可作为设计概念，视频输出仍由帧驱动，不启用其墙钟运行时。

Pixabay/Pexels 候选脚本不等于已下载/已授权素材，是否调用取决于项目范围。素材来源、许可和用途记录不因工具名称省略。

授权范围同样遵循 [视频素材授权合同](VIDEO-ASSETS.md#仅个人--非商业授权素材)：仅个人/非商业许可不伪填 `commercialUse:true`，需项目明确用途与资产匹配的 `authorization.allowedUses/basis/evidence`；Lottie 的来源、作者和 license 检查仍保留。
