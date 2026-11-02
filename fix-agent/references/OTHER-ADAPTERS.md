# 非标准 Remotion 路由

OpenDesign 在存在 Remotion 契约时叠加下列检查；HyperFrames 不读取 Remotion 专项。

### OpenDesign Lab

除适用的 Remotion/Web 门禁外，还检查既有项目证据，不因为复盘而强制安装 OpenDesign：

- `production:doctor` 或 `scripts/production-doctor.ts` 对应检查是否通过。
- `shot-manifest.json` 中重要 step 是否记录 `visualBenchmark`。
- 复杂画面 / 重要素材是否有 OpenDesign handoff，或明确记录跳过原因。
- 若用户未安装或未启用 OpenDesign，记录实际阻塞或已批准替代方案；工具本来可选、已有可接受替代时不自动判失败。

### HyperFrames

HyperFrames 不使用 `presentation/`，不要要求 `narrations.ts` 或 Remotion 文件。

正式完成条件：

- `composition.html` 存在。
- `hyperframes-plan.json` 与 `shot-manifest.json` 存在。
- `npm run validate-hyperframes`、`npm run validate-sync` 或 `doctor:final` 已通过。
- `npm run hf:lint` 与 `npm run hf:inspect` 已生成 JSON 结果。
- 正式输出存在：优先 `output/hyperframes/final.mp4`；只有 `draft.mp4` 时明确标为草稿，不写正式完成。
- 正式产物应对应 `output/hyperframes/render.json`；只有 `render-draft.json` 不能代替正式渲染证据。若存在 SHA256 文件，也写入交付物清单。

