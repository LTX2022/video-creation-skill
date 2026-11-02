# Codex 项目约定

进入制作先读 [SKILL.md](SKILL.md)，之后仅加载当前模式需要的参考。这里是工程补充，不重复整套制作流程。

新项目必须先确认执行环境与客户指定、当前环境可访问的独立空目录，续作不得重跑脚手架覆盖。调用脚手架时用已确认的 skill 绝对路径和项目绝对路径；项目不能位于 skill 安装目录或其它项目内，不在 skill 根目录照抄 `./presentation`。先读 [WORKSPACE-SETUP](references/WORKSPACE-SETUP.md) 做工具/路径检查；缺依赖不代表可自行装到全局。模型生图工具、AE 插件、Node 包属于不同来源和安装边界，不伪装为同一 npm 能力。

## 单一真相

- `project-state.json`：项目选择与用户确认状态；状态需要 `feedback-events.jsonl` 的真实证据。
- `narrations.ts`：step 数与有声文本；无声镜头仍需稳定 step/timing，不伪造 TTS。
- `timing-manifest.json` 与生成的 render timing：时长、帧区间、音频与字幕 cue。
- `shot-manifest.json`：命题、来源、画面关系、运动意图与 QA 预期。
- `composition-manifest.json`：本地实拍底片的时间、适配、帧率/音频策略。
- `scripts/delivery-contract.ts`：输出模式及交付清单；`output/render-result.json` schema 3 的 `outputs[]` 记录实际产物，不以固定 `full.mp4` 判断所有项目。

## 实现约束

- Studio/烟测/正式输出复用composition与timing；局部frame不改语义，跨步对象用chapterFrame而非重入场。用稳定objectId、共同状态与命名节拍，不另起网页录屏版。
- `staticFile()` 引用已入库的本地素材；异步加载在取帧前就绪。固定随机种子、固定模型积分步长，支持乱序 seek。
- SVG 定位和动画各一层，避免 CSS transform 覆盖 `<g transform>`。Hooks 不放在条件分支。
- 有效主题 tokens 保持兼容；Alpha 仅移除明确标记的场景背景，不删除所有内容表面/阴影。
- 先用 `npm run workflow:status` 看只读下一步/缺失/过期证据；它不执行、不批准。输入指纹unknown或变化先失效，不能以旧QA或cache hit盖过。schema3各输出绑定当前contentRevision；旧schema1/2可读但unbound。
- 不修改已存在项目尺寸、主题、provider 或输出模式来迎合默认值。项目升级先列迁移差异。

## 验证层次

`typecheck` 证明类型、`build` 证明可打包、`preflight` 证明部分契约；均不能证明视觉通过。关键帧看构图，连续帧看因果/节奏，最终编码全解码看媒体完整性，Alpha 额外看透明分布与黑白灰合成边缘。按 [QUALITY-GATE](references/QUALITY-GATE.md) 留证据。

草稿与正式结果分开；`--acknowledge-draft` 仅作迭代。不能把系统生成的 pending 事件改写成用户 accepted；缺素材、授权、实测编辑器时准确报告待验证项。
