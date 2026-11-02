# 同类文案仓库：采用什么，不采用什么

核查日期2026-10-27。来源由本轮只读仓库研究取得；未锁commit，未来main内容可能变化。下表是原创摘要与本包适配，不是原文件副本、官方推荐或效果实证；未安装、执行第三方代码。完整研究另放总包附录，本页不进入每个镜头的必读链。

| 实际查看的来源 | 采用到本包 | 明确不采用/未核实 |
|---|---|---|
| [cn-script-skills入口](https://github.com/Tsinglung-Tseng/cn-script-skills/blob/main/skills/douyin-script/SKILL.md) | 薄入口、分阶段交付物→短任务卡与按需参考 | 不默认十角度/多篇长稿，不假定其专用工具可用；writing-guide未取得；LICENSE正文未核实 |
| [高质感脚本方法](https://raw.githubusercontent.com/ehomekevin/gaoji-zhigan-douyin-script-skill/main/references/distilled-patterns.md)、[SKILL](https://github.com/ehomekevin/gaoji-zhigan-douyin-script-skill/blob/main/SKILL.md) | 参数转真实任务、具体案例、观察/推断/应用分开→事实与对象动作共写 | 20样本/ASR为作者材料范围，不是效果实验；不照搬价格战与营销断言；本次未找到明确再分发许可 |
| [Viral Writer SKILL](https://github.com/nashsu/Viral_Writer_Skill/blob/main/SKILL.md) | 一个主要观点、具体画面描述→一行一个观众命题 | 不默认11维长分析/5标题，不采用虚假恐惧、争议或背书；本次未找到明确再分发许可 |
| [Humanizer-zh](https://raw.githubusercontent.com/op7418/Humanizer-zh/main/SKILL.md) | 润色不改事实强度；本包加跨模态复核：计划/测试状态不能画成已完成 | 不把命中模式视为必删，不保证作者身份或检测器结果 |
| [stop-slop](https://raw.githubusercontent.com/hardikpandya/stop-slop/main/SKILL.md) | 找空泛铺垫、抽象赞美，改成具体对象动作 | 不继承全禁副词/被动句/限定语；“仅、尚未、可能”有意义就保留 |
| [Anatomy](https://raw.githubusercontent.com/wheresryan22/anatomy/main/SKILL.md) | 动作与读数来自同一状态；对象承载解释→流程/缓存例 | 不强制等距机械、零件数、无标签，也不暗示已获得视频运行时 |

Humanizer-zh、stop-slop、Anatomy 的官方 LICENSE 本轮查得 MIT；其它三库按上表保留许可未知。这里只写原创采用总结，不随包复制上游源码、SKILL全文、视频、音频或转写。公开可读不等于任意可再分发，后续复制具体内容需另查许可并保留所需声明。

## 本轮真正新增的差异

已有 SCRIPT-STYLE 保真/可说性、CHAPTER-CRAFT 对象关系、OUTLINE 时间与 LOW-COST-BATCH 锁定合同继续保留。不是再加一套规则库，而是把缺少的连接补上：

- [共写单元](VISUAL-SCRIPT.md)：事实/命题、可见变化、补充旁白、实际上屏文字、制作备注分列。
- [一份短任务](../templates/script-templates/visual-script-task.md)：未定稿共写与已批准模板填充分开；模型不需吞全库。
- [四份前后稿](../examples/visual-script/README.md)：流程、数据、机制、静音实拍overlay；实际教学数据检查可离线跑，视频未渲。
- 无障碍字幕不是要删除的同义强调卡；必要信息可有意复述。
- 事实强度要在音画共同保留，例如“仍在测试/计划下一版”不能搭配成功上线勾选。

没有运行真实廉价模型成本/质量对照，没有观看或渲染这些新示例；不承诺传播、理解或画质收益。只有实际制作与反馈能验证这些方法是否适合当前内容。

## 跨平台节奏补充

本轮进一步读官方资料、观察公开官方产品视频抽帧（不是完整实时观看）。完整报告在总包独立研究附录，媒体与原作抽帧不随skill再分发。

- [TikTok Creative Codes](https://ads.tiktok.com/business/library/TikTok_CreativeCodes_May2023.pdf)：hook/body/close是广告创意建议；不把广告记忆指标改成自然流量算法，也不强制所有片CTA。
- [YouTube观众留存说明](https://support.google.com/youtube/answer/9314415)：检查开头是否兑现预期；重看峰值也可能源于不理解。该工具不规定固定剪辑频率。
- [Shorts官方创作者访谈](https://blog.youtube/creator-and-artist-stories/youtube-shorts-deep-dive/)：开头迅速给观看理由、一个小完整故事属于创作者经验，不是强制首秒规则。
- [Linear Pulse](https://linear.app/changelog/2025-04-16-pulse)：43.413秒官方文件，指定时点抽帧看到标题/UI/完成状态分工；含音轨但未听辨，不推断旁白或音乐卡点。
- [Linear Mobile](https://linear.app/changelog/2024-09-19-introducing-linear-mobile)：54.590秒官方文件，全片稀疏抽帧及13–20秒加密检查；18–19.5秒采样可见创建反馈。采用操作后留可读结果；未听音，不称无旁白，不推精确点击帧/响应速度。
- [Notion Layouts发布页](https://www.notion.com/releases/2024-10-24)：6.967秒官网视频，全片0.5秒抽样；同内容重排后停留，文件未检出音轨。采用稳定对象与结构对照，不把概念动画当真实点击行为，也不强制短循环片内CTA。
- [3Blue1Brown Attention官方图文改编](https://www.3blue1brown.com/lessons/attention/)：读动机/局部计算与查看官方矩阵图，未完整观看原视频。采用先建立解释需求、再命名机制和保留假设，不从图文捏造镜头时码。

抽样间隔是研究方法，不是推荐切镜时长；未核验热度、完播率、转化效果。B站未在该组证据中独立核查，迁移到B站只能叫制作建议，不能称B站官方规律。未来按真实素材与用户反馈复核，不为研究结论放宽现有QA或审批。
