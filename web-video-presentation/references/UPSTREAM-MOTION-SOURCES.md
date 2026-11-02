# 外部运动项目：采纳与边界

核查日期：2026-10-27。以下为作者公开说明/指南的研究，不是对这些项目的安全认证或本机运行报告。本包新增代码采用原创实现；没有安装这些仓库或复制其整套模板。既有包中其它素材沿用原来源说明。

| 官方来源 | 本次吸收 | 不采纳/待验证 |
|---|---|---|
| [deepseek-opus-motion-skill](https://github.com/8533502-dev/deepseek-opus-motion-skill)，[SKILL](https://github.com/8533502-dev/deepseek-opus-motion-skill/blob/main/motion-design-prompt-generator/SKILL.md)，[MIT](https://github.com/8533502-dev/deepseek-opus-motion-skill/blob/main/LICENSE) | 可压缩需求追踪、具体设计契约、关键帧先行、真实变形与材质身份连续性 | 不照搬禁 Sequence、强制配乐、全部规则常驻或自评 8 分即交付；四类示例/灰度 SSIM 不证明模型能力相等。未执行其源码 |
| [Remotion 官方 skills](https://github.com/remotion-dev/skills)，[markup](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/SKILL.md) | 订阅变化组件、fps 统一换算、抽组件不改变时域、先检查锁定版本 | 仅提供链接与原创摘要；未取得可确认的根 LICENSE，不复制指南正文。不要未经验证采用新 Interactive/CanvasImage/Easing API。Remotion 运行库适用其自身许可 |
| [rossark-motion-skill](https://github.com/rossark0/rossark-motion-skill)，[SKILL](https://github.com/rossark0/rossark-motion-skill/blob/main/SKILL.md)，[MIT](https://github.com/rossark0/rossark-motion-skill/blob/main/LICENSE) | 正确旋转支点、跟随延迟、穿越姿态与停顿姿态区分、首尾姿态/速度检查 | 不移入 React Native/Reanimated/SwiftUI 实时时钟；不声称已实现自动任意图片骨骼绑定或完整角色动画系统 |
| [react-bits-video](https://github.com/GordenSun/react-bits-video)，[SKILL](https://github.com/GordenSun/react-bits-video/blob/main/SKILL.md)，[LICENSE](https://github.com/GordenSun/react-bits-video/blob/main/LICENSE) | 复杂背景局部可读性保护、隐藏元素保留布局槽、渐变文字兼容性检查 | 不替换现有渲染器、不安装 GSAP/字体、不强制每场景特效。字体另有许可；跨编码环境字节一致 MP4 未验证 |
| [Anatomy](https://github.com/wheresryan22/anatomy)，[SKILL](https://github.com/wheresryan22/anatomy/blob/main/SKILL.md)，[MIT](https://github.com/wheresryan22/anatomy/blob/main/LICENSE) | 读数/运动共用状态、接触/遮挡近景复核 | 不强制所有内容变机械，不采纳固定零件数，不引入实时 WebGL 引擎 |

## 如何使用参考

研究公开方法不等于获得作者示例视频、品牌资产或字体的转授权。未来若复制第三方实质代码/文本，先核对当时许可证并保留所需版权与许可声明；有不明依赖就不纳入客户包。视频里的宣传比例不作为本项目验收分数。

本轮只补充有明确收益的模块。现有 Alpha、实拍叠加、音频来源、封面双路线、空白项目目录和依赖授权约束仍优先。
