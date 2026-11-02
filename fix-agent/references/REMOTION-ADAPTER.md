# Remotion 复盘证据契约

### Remotion-first / web-video-presentation

先读取 `project-state.json`、`output/render-result.json` 及实际存在的验证证据。正式完成不是“找到了一个 MP4”，也不是“smoke 成功”。

#### v3.2 当前输出契约与旧版读取

| outputMode | 必需 kind | 默认最终输出 |
|---|---|---|
| opaque | opaque | `output/full.mp4` |
| alpha | alpha | `output/full-alpha.mov` |
| composite | composite | `output/full-composite.mp4` |
| both | alpha 和 composite | 上述 Alpha 与合成成片，两者缺一即部分交付 |

- manifest字段名是`schema`。schema3与schema2均以`outputs[]`为准，遍历全部项，不只读取第一项或兼容顶层 `output`。逐项核对 `kind/output/sha256/mediaProbe`、有效渲染参数、对应质量检查以及文件存在性；每个期望 kind 恰好一项，both 必须共两项，其他模式共一项。未知 schema、重复 kind、意外/过时输出、模式冲突或清单缺项均列风险。
- schema3的顶层与各项`contentRevision`须匹配当前输入，各项有独立`renderVariant`，both不可混合修订；输入unknown、字节变更、缺绑定都不当当前通过。仅凭已存在摘要无法确认当前输入时写unknown；复盘不自动重渲或外呼。
- v3 的 `outputMode` 以项目状态与已批准目标为依据；若 render-result 的 outputMode 不一致，报告冲突。`complete: true` 不能代替逐项核查。实际可读文件与已记录哈希可做只读一致性核验；无法核验时明确说明。
- v3 正式结果应为全范围 quality：`preset: quality`，无 `draft`、局部 `frames` 或 `everyNthFrame`；每项应有 SHA256 和 `mediaProbe.ok: true`。缺少上述证据不得升级为正式完成。
- alpha 需 `alphaValidation.pass: true` 等真实解码像素证据与边缘审查记录；仅 MOV 扩展名或 pix_fmt 含 a 不证明有效透明。按 v3 alpha-only 契约，静音、无字幕、无封面、无 MP4 可以合理，不把它们当遗漏。若状态却要求音频/字幕，记录契约冲突，不擅自删除需求。
- composite/both 还记录底片来源/授权、适配、同步与遮挡 QA；both 的每项都必须有独立输出证据，不能拿 Alpha 的通过替代合成成片验证。
- 人工决定核对`recordKind:user-decision`、decision、`subject.{gate,scope,digest}`和`source.{kind,reference,declaration}`；同gate/scope按追加顺序取最新，rejected/revoked覆盖旧接受，摘要变化stale、旧记录unbound。source只是来源声明，不是宿主身份认证；不补造缺失quote/ref或把synthetic当真实授权。
- 用户验收与机器检查分列：已有章节/anchor/最终批准证据只能引用，不能由 agent 自评、退出码或计时事件补写“用户通过”。按实际 profile 与 `audioRequested/subtitlesRequested/coverRequired` 判断适用门禁；不适用写原因。
- `gate-result`或手填`declaredValidation`不是observed执行，也不能制造用户批准。`workflow:status`若存在只读建议下一步，不是自动执行或完整QA回执。
- 正式交付还需适用的 preflight/golden/最终渲染与质量门禁证据。`render:smoke`、draft、preview或`render:segment`只证明相应范围，不能代替正式全片。motion-strips是sparse取样，不是连续区间，不证明音画同步；每命令共享bundle/browser不等于跨命令或跨运行缓存。

#### 旧项目兼容

`schema: 1` 或已确认旧版顶层 `output` 可作为单项读取；不存在 `outputMode` 时按旧 opaque 约定，标注 legacy/inferred。若顶层明确 `alpha: true` 或实际证据与推定冲突，应列为旧透明输出/待确认，不能强行解释成 opaque。schema1/2继续可读但标legacy/unbound，只能描述其历史产物，不能当schema3当前输入已验证或新交付通过。旧项目未有schema时注明缺失，不补造绑定。已明确的旧版用户指定输出路径按其版本契约记录，不套用 v3 默认路径误报。旧项目不必凭空补出 stage-events。

若只交付 draft，标注“草稿交付”；若部分模式产物缺失，标注“部分交付”。报告既可记录失败/取消，也可记录正式完成，但不混淆状态。

抖音/竖屏项目若要求或实际生成封面，记录生成方式与验证状态，读取已有 `output/cover/cover.png`、`cover-report.json`、`cover-metadata.json`。只有违背该项目已批准封面流程、未经同意替代且有证据时，才把 `remotion still` 标为 `cover workflow bypass`；获准的 still/外部封面不自动判违规。


### v3.2.1 的适用性核对

- 音频先分 audioSource：tts 才查供应商/音色；provided 查逐段本地录音、provided-audio-manifest、文件/文字哈希和实际时长。不把用户提供旁白缺 TTS manifest 判为故障；来源声明不是宿主认证，时长/哈希不证明逐字内容正确。
- 批量模式须有当前范围的真实计划/分镜确认；仍查首章、最终与适用质量门，不能只凭默认并行标志。合法批量不必伪造每章单独批准；已有拒绝/撤销仍须处理。
- 封面独立查看 cover-attempt、props/source revision 与真实 PNG。新请求失败时旧图只是 last-known-good，不引用旧 pass 作为当前通过；封面技术检查、agent 看图与客户批准分开。
- 打包诊断可能因取证时文件变化而明确省略失效摘要；记录 unavailable/unknown，不补造耗时或回退到别的 run。离线复盘先核档内证据路径和哈希，不把交接文件存在当成授权。
