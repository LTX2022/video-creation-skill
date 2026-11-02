# 性能：先保证证据有效，再减少重复工作

不承诺速度倍数或token节省。先定位瓶颈；关键帧、稀疏帧和短段服务诊断，正式输出仍保留完整帧/尺寸/质量与适用QA。

## 当前阶段的最小读集

入口 [SKILL](SKILL.md) 读一次；内容/hash或会话上下文失效才重读。下表是路由，不是要求把六行全部加载。

| 阶段 | 必要输入 | 不默认读取 |
|---|---|---|
| 规划 | 用户材料/已知选择、[OUTLINE](references/OUTLINE-FORMAT.md)、[SHOT-DESIGN](references/SHOT-DESIGN-REVIEW.md) | 全部技法、历史事故、所有provider/主题 |
| 文案与画面共写 | 当前事实/允许字段、[单任务卡](templates/script-templates/visual-script-task.md)，必要时选1个[前后例](examples/visual-script/README.md) | 全部同类仓库、长分析、打分循环、无关风格 |
| 实现一章 | 一次[CHAPTER-CRAFT](references/CHAPTER-CRAFT.md)、该章材料/分镜、已选theme.json、所需一种技法 | 其它章全文、未变化的整套规则 |
| 音频变更 | [AUDIO](references/AUDIO.md)、[TTS](references/TTS-ROUTING.md)、已选provider/voice、受影响segments | 视觉教程、原始完整声音列表 |
| 验证/渲染 | workflow摘要、[RENDERING](references/RENDERING.md)、[QUALITY-GATE](references/QUALITY-GATE.md)适用项 | 每帧进度回显、历史成功日志 |
| 失败修复 | 首个根因/行号、输入摘要、对应证据/日志片段、失效原因 | 从头读整项目、无差别重跑 |
| 交付 | 当前revision的outputs/哈希、QA/用户决定/未测项、[DELIVERY](DELIVERY.md) | 无用实现历史 |

未选主题在skill根先 `node scripts/theme-summary.mjs --query="题材" --limit=3`；已选只读该元数据，`--id=准确ID`可取小摘要。关键词匹配不是审美评分；`--all`仅显式盘点。改token契约时才读[THEMES](references/THEMES.md)，不把脚本内部读取56项当成模型加载56项。

## 变更影响与复用

**输入指纹失效先于任何cache hit；unknown不复用。** 当前schema3以`contentRevision`绑定本项目声明输入；输出另有`renderVariant`。这是保守的src/public/config指纹，未使用的视频资产也可能触发失效；封面的可变props留在output/cover，独立封面更新不写视频src/public。共享的视频源码/素材仍受正常指纹保护。不是细粒度增量DAG或跨机器缓存。下表是选择检查策略，不表示自动只重渲受影响镜头。运行时外链/系统字体未固定。授权内局部修复后，最终仍重验当前完整输出。

| 改变 | 至少重新检查 | 可避免的无关工作 |
|---|---|---|
| 标签/局部图层/动作 | 受影响布局、完整动作短段、最终媒体/对应人审 | 无关TTS（前提是有效缓存） |
| 口播/text、voice/model/有效参数 | 对应音频指纹/授权、timing/cues、受影响画面/成片 | 不变且已验证的音频；未知配置不可命中 |
| step时长/fps/字幕 | timing、跨步与转场、字幕预览、媒体 | 无变化素材重新获取 |
| 共享theme/字体/素材字节 | 所有依赖镜头、bundle/预览/成片；同路径替换也失效 | 不清用户源素材 |
| 仅编码设置 | 新renderVariant、编码/媒体/Alpha边缘及最终决定 | 内容规划未变无需重新写 |
| 缓存输出缺失/损坏 | 拒绝命中，重建该产物及依赖证据 | 不以文件名存在判成功 |
| 输入清单外的README/说明 | 核对是否真不影响内容/权限；无需仅为说明重渲 | 若审批对象/范围变了仍重核决定；src内注释按字节仍会失效 |

缓存分清Webpack编译缓存、bundle、浏览器资源、解码、TTS、最终媒体，不互相代替。只清已确认stale的生成缓存；不每章删除全缓存。静态几何与固定路径构建一次，动态姿态从同一状态派生；不为简单对象引入整套新运行时。并发按实测内存/失败调节，不默认最大核数最佳。

## 小结果契约与测量

`npm run workflow:status`只读派生下一步，`-- --json`展开`contentRevision/stage/status/nextAction/missing/stale/pendingHumanReview/checks/evidencePaths`；它不执行下一步、不创建批准，也不重跑既有QA。先看摘要，失败再读对应日志；warning/error、授权阻断与待审项不可静默省略。完整日志留文件，别把整段逐帧进度反复返回模型。

生成项目的生产命令默认只记录本地叶子阶段；别再外套整个 npm 链来重复计时。显式 `npm run metrics:begin -- --run-id=project-r1` 建立本轮，续作 `metrics:resume`，结束 `metrics:end`；未选轮次时每次叶子调用独立标识，不能冒称整轮。`VWP_METRICS=off` 可关闭。记录失败不影响生产子命令真实结果，但须报告测量缺口。

自定义已授权命令仍可使用 `measure:stage`。schema2 追加 started/finished 事件，不存 argv/env/正文；schema1 历史记录兼容。默认重复调用不是重试；只有显式 attempt>1 才计重试。未完成命令的时长保持 unknown。只读相关证据和确定性结项摘要，具体命令与口径见 [FIX-AGENT-INTEGRATION](references/FIX-AGENT-INTEGRATION.md)。

elapsedMs是monotonic命令实测，含失败/重试，不是整个会话/人工等待；并行段相加不等于端到端。bundle/取帧/编码可能重叠；wrapper没有自动拆renderer内部阶段。比较要固定帧集合、尺寸/fps/N/编码质量、冷暖缓存、版本/硬件；预览延迟与完整成片耗时分别列，SSR/typecheck秒数不外推渲染。

真实input/output/cached-input token usage拿不到就写 **unknown**。read bytes、tool-result bytes、重复读取量/次数只是代理指标；磁盘文件大小不等于实际返回载荷，不按中文字符/KB推算“省84%token”。小样本报告原值/median/min/max，不制造可靠p95。

轻量摘要由本地脚本完成；完整 fix-agent 仅明确请求或预授权才用。消费当前schema3及legacy证据、真实反馈和计时，区分实测/推断/unknown；不自动实施建议或批准产物。用户五项体验是否改善仍需同题材实际观看及公平测量，本规范本身不是改善结果。

## v3.4 按需运动增强

- 简单改字/改色不新增设计契约；复杂变形或材质片只读 MOTION-DIRECTION 与当前机制 README，不加载五个上游仓库全文。
- 先检查源/目标/中间关键画面，错误先修局部，不先跑全部 56 风格或整片。
- 静态轮廓准备可在模块级缓存；逐帧仅插值。示例强调清晰可读，不代表批量实例的最优性能。
- 新模块无运行依赖；不安装上游项目、不更换已锁定 Remotion、不增加强制音频生成。
- 本轮未取得模型 token 计量，不能宣称节省某个百分比。
