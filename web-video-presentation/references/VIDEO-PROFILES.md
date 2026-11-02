# 内容 Profiles：默认值，不是统一风格

Profile 决定内容起点；`outputMode` 决定输出。已明确的用户选择优先，不反复问同一问题，不因采用一个 profile 便更换用户主题/尺寸。确切脚手架选项看 `scripts/scaffold.sh --help` 与生成项目状态。

| 家族 | Profile | 适用内容与建议 | opaque 默认 |
|---|---|---|---|
| 短视频 | `douyin` | 通用竖屏；先给可见问题/效果，再解释和证明 | portrait、配音、字幕、MP4、封面 |
| 短视频/科技评测 | `douyin-laon` | 保留原预设：问题→转折→价值→核心→对照→演示→边界→收束等九段方向；`dark-tech-glow` 推荐 | 同短视频；原时长 150s 仅起点 |
| 短视频/技能教程 | `douyin-skill` | 保留原预设：效果→问题→方法→操作1/2→对比→收束七段方向；`practical-skill` 推荐 | 同短视频；原时长 60s 仅起点 |
| 讲解 | `bilibili` | 横屏教程/课程/长视频；保留论证条件与完整操作 | landscape、配音、MP4；字幕按选择 |
| 定制 | `custom` | 品牌、流程、机制、无声素材、Alpha、实拍 overlay | 显式选规格与所需声音/字幕 |

`alpha` 可以静音、无字幕、无封面，只交透明 MOV 与相关证据。`both` 必须有底片，交 Alpha + composite；不是强迫任何项目多生成一个普通 MP4。声音/字幕是否启用写入 project-state，与输出契约一致。

## 风格能力保留，去掉虚假精确

旧蒸馏预设中的 5.61/5.2 字每秒、1.7/2 秒镜头、九/七段结构来自有限样本或设计习惯，不是每个题材的验收标准。不得承诺爆款、收入、审核通过或算法流量效果。可借鉴短句、明确对照、鼠标高亮和结果先行；关键操作/因果必须留够看懂时间。主题和时长可被用户覆盖。

公开候选不附历史研究源材料：`lq-distillation/` 已整体排除（抽帧、转写、账号列表及批处理）。五个 profile 与主题源码保留，但无法从此候选重现旧样本蒸馏结论。不能把来源作者的声音、身份或独有资产未经授权复制进成片。

## 平台与画幅

新 `portrait` 是 1080×1920 的 9:16，`landscape` 是 1920×1080。旧项目的 1440×3200 不是 9:16，不能静默替换；按 [FORMATS](FORMATS.md) 迁移。

一次平台下架/审核事故不能推出“终端画面违法”“仅种草合法”或“所有外链必降流”。根据项目目标审查外部下载/导流、金融等高风险表述；如需宣称最新平台合规则查官方政策。已有项目的明确禁止项保留，不以本次文档更新解除用户约束。

## 示例

```bash
bash <skill>/scripts/scaffold.sh ./presentation --profile=douyin
bash <skill>/scripts/scaffold.sh ./presentation --profile=douyin-laon
bash <skill>/scripts/scaffold.sh ./presentation --profile=douyin-skill
bash <skill>/scripts/scaffold.sh ./presentation --profile=bilibili --subtitles=true
bash <skill>/scripts/scaffold.sh ./overlay --profile=custom --format=portrait --output-mode=alpha
```

先审查脚手架是否自动安装依赖，并确保权限覆盖。传入用户已经选定的主题/尺寸/声音，不用新默认值覆盖旧项目。最终项目状态和输出清单才是该项目的契约。
