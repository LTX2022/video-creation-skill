> **历史记录（非当前执行规范）**：保留当时问题、假设、计划和旧命令供追溯，不默认加载，不直接执行其中升级/安装/删除指令。当前制作从 [SKILL](../SKILL.md) 路由；Alpha、格式、QA、交付规则已在各专项文档实际修订。文内旧版本与旧路径不表示当前环境。

# web-video-presentation v2.9.0 工作流优化 —— 执行 Agent 实施文档

> **用途**：交给执行 Agent 按任务清单改代码。**不要自行扩展 scope**，严格按本文 P0 任务执行。
>
> **基线版本**：`v2.8.0`（读 `VERSION` 确认后再开始）
>
> **前置文档**：`references/WORKFLOW-OPTIMIZATION-EXEC-PLAN-v2.8.0.md`（已完成）
>
> **证据来源**：三份修改记录 + v2.8.0 遗留项（§5）+ v2.8.0 未做端到端验证项

---

## 0. v2.9 要解决什么（先读）

### v2.8.0 已解决（不要重做）

- 透明底模板：`TransparentFix` / `isOverlay` / `overlayChapterIds` / `full-video-alpha`
- Alpha 一条命令：`npm run render:video:alpha`（四 flag + 噪点阻断 + ffprobe yuva）
- script.md 漏章：`validate-narrations` 字符覆盖率 <90% fail
- SVG viewBox：`preflight` 舞台级检查
- 教训 16/17/23/26/34/37/42 → `[AUTO]`（27 条）

### v2.9 目标（一句话）

**把「流程偷懒」和「叠加层视觉质量」从 Agent 记忆变成 project-state + 脚本门禁，并补上 v2.8 未验证的 alpha 冒烟测试。**

### 三份修改记录在 v2.8 后仍反复出现的根因

| # | 问题 | 典型事故 | v2.8 现状 |
|---|---|---|---|
| 1 | **逐章验收无状态** | AI圈大地震：第 4 章未验收就渲染，3 次无效渲染 | `chapter-review` 事件类型存在，但 **不写入 project-state** |
| 2 | **draft 可绕过 workflow** | DeepSeek 涨价：preflight 241 error，直接 `tsx ... --preset=draft` | `assertWorkflowAllowed()` 对 draft **直接 return** |
| 3 | **叠加层低 opacity / 半透明图形** | GPT-5.6「怎么没看见」；DeepSeek「什么都看不清」 | 教训 18/19 仍 `[MANUAL]` |
| 4 | **Hook 写在 .map() 里** | AI圈大地震 Remotion 运行时错误 | 教训 35 仍 `[MANUAL]`，无静态扫描 |
| 5 | **章节变更后未重走 SDR** | GPT-5.6 中途加第 3 章未确认分镜 | 教训 28 仍 `[MANUAL]` |
| 6 | **参考视频分辨率误当项目规格** | GPT-5.6 2160×3840 误用 | 教训 27 部分覆盖（state vs videoFormat），**asset-manifest 未查** |
| 7 | **Alpha 未端到端验证** | v2.8 只 grep/结构检查 | 无 `render:alpha:smoke` |
| 8 | **自检产物污染仓库** | v2.8 留下 `test-v280/` + node_modules | `package-skill.ts` 未排除 |

### v2.9 明确不做（留给 v3.0 或永远手动）

| 问题 | 原因 |
|---|---|
| 模式 A「每章必须停」的 Agent 行为约束 | 无法可靠脚本化，靠 SKILL + feedback 流程 |
| 并行章节 reviewer 质量 | 需 subagent，不新增脚本 |
| 装饰 SVG 与主内容重叠（教训 40） | 需视觉理解，preflight 只能做启发式 |
| 尺寸手算（教训 30） | 只能做宽度溢出启发式，不做完整布局引擎 |

---

## 1. 版本与范围

- **目标版本**：`2.9.0`（MINOR）
- **预计 diff**：~500–700 行
- **Task 顺序**：Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
- **完成后**：`node scripts/package-skill.ts` 打包；删除或排除 `test-v280/`

---

## 2. P0 任务清单

---

### Task 1：逐章验收状态机（教训 33 / 32 部分）

**根因**：`record-feedback.ts` 已有 `chapter-review` 类型，但 accepted 时 **不更新 project-state**，preflight/validate-delivery 无法知道第 2–N 章是否验收。

#### 1.1 修改 `templates/project-state.json`

在 `overlayChapterIds` 后增加：

```json
"acceptedChapterIds": [],
"developmentMode": "sequential",
```

- `acceptedChapterIds`：用户验收通过的章节 id 列表（含第 1 章 anchor 验收后写入）
- `developmentMode`：`sequential` | `batch-after-anchor` | `parallel`（Shot Design Review 时由 Agent 写入，脚本只读）

#### 1.2 修改 `templates/scripts/record-feedback.ts`

1. `chapter-anchor` accepted 时：除现有 `firstChapterUserAccepted=true` 外，把 `--chapter=<id>` 写入 `acceptedChapterIds`（若无 chapter 参数，从 `--chapter` 或 registry 第 1 章 id 推断；**必须**要求 `--chapter=`）
2. 新增：`chapter-review` accepted 时：
   - 要求 `--chapter=<chapterId>`
   - 把该 id push 进 `acceptedChapterIds`（去重）
3. help 文本补充：
   ```
   npm run feedback -- --type=chapter-review --chapter=pivot --quote="这一版可以" --resolution=accepted
   ```

#### 1.3 修改 `templates/scripts/preflight.ts`

在现有 workflow gate 检查块（约 742–750 行）**之后**增加：

```ts
// 读取 src/registry/chapters.ts 中注册的 chapter id（排除 example）
// 对每个 id：必须在 acceptedChapterIds 中，否则 fail
```

逻辑：
- 从 `chapters.ts` import 路径解析出 chapter id（与 `validate-narrations` 相同 regex）
- 跳过 `example` / `01-example`
- 若 `acceptedChapterIds` 缺少任一注册章节 → `fail("x workflow gate: chapter '<id>' not accepted. Record: npm run feedback -- --type=chapter-review --chapter=<id> --resolution=accepted")`

**例外**：`workflowPhase === "scaffolded"` 且仅有 `01-example` 时跳过（与 validate-narrations 一致）。

#### 1.4 修改 `templates/scripts/validate-delivery.ts`

在 `validateWorkflowEvidence()` 中，对每个非 example 的注册章节：
- 检查 `acceptedChapterIds` 包含该 id
- 检查 `feedback-events.jsonl` 存在 `eventType=chapter-review` 或 `chapter-anchor` 且 `userResolution=accepted` 且 `chapter=<id>` 且 `userQuote` 非空

#### 1.5 修改 `SKILL.md`（最小）

Phase 2.3 模式 A 补充一句：每章验收后必须跑 `npm run feedback -- --type=chapter-review --chapter=<id> --quote="..." --resolution=accepted`。

#### 验收标准

- [ ] `chapter-review` accepted 后 `project-state.json` 的 `acceptedChapterIds` 含该章
- [ ] 3 章项目只验收 2 章 → preflight fail
- [ ] validate-delivery 缺 chapter-review 事件 → fail
- [ ] 仅 01-example 脚手架 → 跳过逐章检查

---

### Task 2：Draft 渲染 acknowledge 门禁（DeepSeek 涨价 bypass）

**根因**：`render-video.ts` 第 125 行 `if (isDraft || frames) return;` 使 draft/smoke **完全跳过** workflow gate；Agent 可直接 `tsx scripts/render-video.ts --preset=draft` 绕过 preflight。

**策略**：draft/smoke/alpha:draft **允许迭代**，但若 workflow gate 未满足，必须显式传 `--acknowledge-draft`，否则 exit 1。

#### 2.1 修改 `templates/scripts/render-video.ts`

1. 抽取函数：

```ts
function getMissingWorkflowGates(): Array<[string, string]> {
  // 与 assertWorkflowAllowed 相同逻辑，返回 missing 数组，不 exit
}
```

2. 修改 `assertWorkflowAllowed()`：内部调用 `getMissingWorkflowGates()`，非空则 exit 1。

3. 新增 `assertDraftAcknowledged()`：

```ts
function assertDraftAcknowledged() {
  if (!isDraft && !frames) return;
  const missing = getMissingWorkflowGates();
  if (missing.length === 0) return;
  if (hasFlag("--acknowledge-draft")) {
    console.error(`! draft/smoke render with missing gates acknowledged: ${missing.map(([,l]) => l).join(", ")}`);
    return;
  }
  console.error(`x draft/smoke render blocked. Missing workflow evidence: ...`);
  console.error("  Fix gates with npm run feedback, or pass --acknowledge-draft for intentional iteration only.");
  process.exit(1);
}
```

4. `main()` 中：在 `assertWorkflowAllowed()` **之前**调用 `assertDraftAcknowledged()`（draft 路径走 acknowledge，正式路径走 assertWorkflowAllowed）。

5. `--help` 增加：

```
  --acknowledge-draft     Allow draft/smoke/alpha:draft when workflow gates are incomplete (iteration only)
```

6. `writeRenderResult` 的 result JSON 增加 `acknowledgedDraft: boolean`（当使用了 `--acknowledge-draft` 时为 true）。

#### 2.2 修改 `templates/scripts/validate-delivery.ts`

若 `output/render-result.json` 或 per-output render-results 中 `draft === true` 且 `acknowledgedDraft === true`：
- **仍然 fail** 正式交付（已有逻辑）
- detail 消息明确："draft was rendered with --acknowledge-draft; not valid for delivery"

#### 2.3 修改 `scripts/scaffold.sh` npm scripts

`render:video:draft` / `render:smoke` / `render:video:alpha:draft` **不要**默认加 `--acknowledge-draft`（保持严格）。

文档注释说明：迭代时可手动加：
```bash
tsx scripts/render-video.ts --preset=draft --acknowledge-draft
```

#### 验收标准

- [ ] 未确认 gate 时 `tsx ... --preset=draft` → exit 1
- [ ] 加 `--acknowledge-draft` → 可渲染，result 含 `acknowledgedDraft: true`
- [ ] 正式 `render:video` 仍必须 gate 全 true，不受影响
- [ ] validate-delivery 拒绝 acknowledged draft 作为正式交付

---

### Task 3：叠加层视觉质量 preflight（教训 18 / 19）

**根因**：overlay 章节使用 `rgba(..., 0.08–0.18)` 或缺少 text-stroke，在博主视频上不可见。

#### 3.1 修改 `templates/scripts/preflight.ts`

新增函数 `validateOverlayChapterQuality()`，当 `project-state.json` 的 `overlayChapterIds` 非空时执行：

**检查 A — 低 opacity rgba（教训 19）**

扫描 `overlayChapterIds` 对应章节目录下所有 `.tsx/.css`：

```regex
rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\.(?:0?\d|1[0-9]|2[0-4])\s*\)
```

命中 → fail，提示 opacity 必须 ≥0.25，Alpha 导出建议 ≥0.3。

**检查 B — 透明底章节缺 text-stroke（教训 18，启发式）**

对 overlay 章节的 `.tsx`：
- 若存在 `fontSize` ≥ 48 或 `font-size` ≥ 48px 的文字样式
- 且同文件无 `-webkit-text-stroke` / `WebkitTextStroke` / `paintOrder` / `paint-order`
- → fail（warning 级可改为 fail，本文要求 **fail**）

**检查 C — 禁止 `.stage-alpha` CSS 类名（教训 17 回归）**

overlay 章节 css 中出现 `.stage-alpha` → fail，提示用 `TransparentFix` 组件。

#### 验收标准

- [ ] overlay 章节含 `rgba(255,255,255,0.18)` → preflight fail
- [ ] overlay 章节含 64px 文字但无 text-stroke → preflight fail
- [ ] 非 overlay 章节不受影响
- [ ] `overlayChapterIds: []` 时跳过整段检查

---

### Task 4：Remotion Hook 静态扫描（教训 35）

**根因**：`useCurrentFrame()` 写在 `.map()` 回调内导致运行时崩溃。

#### 4.1 修改 `templates/scripts/preflight.ts`

扫描 `src/chapters/**/*.tsx` 和 `src/video/**/*.tsx`：

启发式（足够弱 Agent 实现）：

```ts
// 对每个 .map( 或 .forEach( 开头，向后找第一个匹配的 ) => { 或 ) {
// 若该回调体（到下一个同级闭合大括号）内含 useCurrentFrame( 或 useVideoConfig(
// → fail
```

简化实现也可接受：
- 按行扫描：若某行含 `.map(` 或 `.forEach(`，则后续 30 行内出现 `useCurrentFrame(` → fail
- 排除 `AlphaStep` 等已知的正确包装组件文件（RemotionRoot.tsx 中 AlphaStep 是正确模式，应在回调外）

**白名单**：`RemotionRoot.tsx` 内 `AlphaStep` 组件定义本身允许在组件顶层调用 hook。

#### 验收标准

- [ ] 故意在 `.map(() => { useCurrentFrame()` 的测试 tsx → preflight fail
- [ ] `RemotionRoot.tsx` 的 `AlphaStep` 模式 → pass
- [ ] 错误消息指向教训 35 和「抽取子组件」修复方式

---

### Task 5：章节/registry 漂移 + 参考视频分辨率 guard（教训 28 / 27）

#### 5.1 章节数漂移（教训 28）

**修改 `templates/scripts/preflight.ts`**：

1. 若存在 `../outline.md` 或 `outline.md`：
   - 统计 `## 第` 或 `## Chapter` 或 `### ` 章节标题行数（与 `OUTLINE-FORMAT.md` 一致，用简单 regex：`^##\s+\d+\.` 或 `^##\s+第`)
   - 与 `chapters.ts` 注册章节数（排除 example）比较
   - 若 outline 章数 > registry 章数 → fail："outline lists N chapters but registry has M; missing chapter implementation or re-run Shot Design Review"
   - 若 outline 章数 < registry 章数 → fail："registry has chapters not in outline; update outline.md and re-run Shot Design Review"

2. 若 `fullShotDesignConfirmed === true` 且检测到 registry 章节 id 列表与 `shot-manifest.json` 中 chapter 集合不一致 → fail，提示重新 SDR。

#### 5.2 参考视频分辨率 guard（教训 27）

**修改 `templates/scripts/validate-assets.ts`**（或 preflight 内联）：

读取 `asset-manifest.json` 中 `type: "video"` 的条目：
- 若 `width/height` 与 `videoFormat.ts` 不一致
- 且 manifest 条目无 `referenceVideo: true` 或 `usage` 不含 "reference"
- → fail："video asset resolution WxH does not match project videoFormat; normalize with ffmpeg minterpolate or mark as referenceVideo only"

读取 `src/config/videoFormat.ts` 与 `project-state.json.videoProfile`，对照 `references/VIDEO-PROFILES.md` 默认值：
- douyin + width≠1440 或 height≠3200 → fail（除非 project-state.notes 含 `"formatOverrideAccepted"` 字符串——可选，弱 Agent 可省略此例外）

#### 验收标准

- [ ] outline 3 章、registry 2 章 → preflight fail
- [ ] asset-manifest 视频 2160×3840、项目 1440×3200、非 reference → fail
- [ ] 标记 `referenceVideo: true` 的参考视频 → pass

---

### Task 6：Alpha 冒烟测试 + Studio 端口 helper（v2.8 验证缺口 + 教训 36）

#### 6.1 新建 `templates/scripts/render-alpha-smoke.ts`

轻量脚本（可复用 render-video.ts 的 ffprobe 逻辑）：

```bash
# 行为：
# 1. npm run render:timing（由 npm script 前置）
# 2. tsx scripts/render-video.ts --alpha --frames=0-30 --output output/alpha-smoke.mov --acknowledge-draft
# 3. ffprobe 验证 pix_fmt 含 yuva
# 4. 写 output/render-results/alpha-smoke.json（含 sha256、pix_fmt、pass/fail）
# 5. 不替换 output/render-result.json
```

注意：冒烟测试允许 `--acknowledge-draft`（gate 可能未齐），但 **validate-delivery 不得接受 alpha-smoke 作为交付**。

#### 6.2 修改 `scripts/scaffold.sh` npm scripts

```js
"render:alpha:smoke": "npm run render:timing && tsx scripts/render-alpha-smoke.ts",
```

复制脚本：
```bash
cp "$TEMPLATES/scripts/render-alpha-smoke.ts" scripts/render-alpha-smoke.ts
```

#### 6.3 Studio 端口 helper（教训 36）

**修改 `scripts/scaffold.sh`** 中 `render:studio` npm script：

```js
"render:studio": "npm run render:timing && node scripts/run-studio.cjs",
```

**新建 `templates/scripts/run-studio.cjs`**（CommonJS，避免 tsx 依赖）：

1. 尝试端口 3000，被占用则递增 3001–3010（用 Node `net.createServer` 探测，复用 render-video.ts 的 `findFreePort` 逻辑）
2. 执行：`npx remotion studio src/video/index.ts --port=<port>`
3. 启动前打印：`Remotion Studio: http://localhost:<port>`

复制到 scaffold：
```bash
cp "$TEMPLATES/scripts/run-studio.cjs" scripts/run-studio.cjs
```

#### 验收标准

- [ ] `npm run render:alpha:smoke` 在 test 项目中可运行（有 remotion 环境时出 yuva mov；无环境时脚本结构正确）
- [ ] `npm run render:studio` 通过 run-studio.cjs 启动，端口冲突时自动换端口
- [ ] alpha-smoke 产物不写 output/render-result.json

---

### Task 7：仓库卫生 + package-skill 排除

#### 7.1 修改 `scripts/package-skill.ts`

`EXCLUDE_DIRS` 增加：

```ts
"test-v280", "test-v290"
```

`EXCLUDE_PATTERNS` 增加：`/^test-v\d+/` 匹配任意 test-v* 目录（可选，二选一）。

#### 7.2 删除仓库内已有自检产物

若存在 `test-v280/`（含 node_modules），**删除整个目录**：

```powershell
Remove-Item -Recurse -Force "C:\PUBLIC-EXAMPLE\web-video-presentation\test-v280"
```

（执行 Agent 在打包前执行一次。）

#### 验收标准

- [ ] 仓库无 `test-v280/` 或 `test-v290/`
- [ ] package-skill 不会把 test-v* 打进 zip

---

### Task 8：文档同步 + 版本 2.9.0 + 打包

#### 8.1 `references/MODIFICATION-RECORD-LESSONS.md`

更新统计：
- `[AUTO]` 27 → **32**（新增 33 部分、35、18/19 启发式、28 漂移、27 资产分辨率）
- `[MANUAL]` 15 → **10**

降级为 `[AUTO]` 并更新正文：

| 教训 | v2.9 机制 |
|---|---|
| 18 透明底图形不透明 | preflight overlay text-stroke 启发式 |
| 19 overlay opacity ≥0.25 | preflight rgba 扫描 |
| 27 项目规格按 profile | validate-assets 参考视频分辨率 + douyin 默认尺寸 |
| 28 章节变更重走 SDR | preflight outline/registry/shot-manifest 漂移 |
| 33 模式 A 每章必须停 | acceptedChapterIds + chapter-review 事件 |
| 35 Hook 禁止在 map 内 | preflight 静态扫描 |

保留 `[MANUAL]`：2 TTS逐段、6 图层遮挡、20 多阶段视觉、30 尺寸手算、32 并行自检、36 端口（studio helper 后仍标 MANUAL 但文档指向 run-studio.cjs）、40 装饰重叠、41 section label（validate-screen-text 已部分覆盖）

#### 8.2 其他文档（最小改动）

| 文件 | 改动 |
|---|---|
| `SKILL.md` | Phase 2.3 逐章 feedback 命令；Phase 4 加 `render:alpha:smoke`；draft 迭代说明 `--acknowledge-draft` |
| `references/AGENT-RULEBOOK.md` | 加「draft 不等于交付」3 行 |
| `references/QUALITY-GATE.md` | 加 acceptedChapterIds / acknowledge-draft / alpha-smoke 三条 |
| `references/PRODUCTION-WORKFLOW.md` | Studio 端口用 `npm run render:studio` |
| `references/WORKFLOW-OPTIMIZATION-EXEC-PLAN-v2.8.0.md` | 文末加一行：「后续见 v2.9.0 执行计划」 |

#### 8.3 版本文件

| 文件 | 值 |
|---|---|
| `VERSION` | `2.9.0` |
| `manifest.json` | `"version": "2.9.0"` |
| `templates/project-state.json` | `"projectVersion": "2.9.0"` |
| `VERSION.json` | version/publicVersion/internalRevision + notes 首条 v2.9.0 说明 |
| `VERSION.md` | 顶部 v2.9.0 Summary |

#### 8.4 VERSION.md v2.9.0 Summary 模板

```markdown
## v2.9.0 Summary — 流程门禁强化 + 叠加层质量自动化

**MINOR**。补齐 v2.8 遗留：逐章验收状态机、draft acknowledge 防 bypass、overlay 视觉 preflight、Hook 静态扫描、章节漂移检测、alpha 冒烟测试。

### 核心变更
1. acceptedChapterIds + chapter-review → project-state + preflight/validate-delivery
2. draft/smoke 需 --acknowledge-draft（gate 未齐时）
3. overlay 章节 rgba/text-stroke/stage-alpha preflight
4. useCurrentFrame-in-map 静态扫描
5. outline/registry/shot-manifest 漂移检测 + 参考视频分辨率 guard
6. npm run render:alpha:smoke + run-studio.cjs 自动端口
7. 教训 18/19/27/28/33/35 降级 [AUTO]（27→32）
```

#### 8.5 打包

```bash
cd C:\PUBLIC-EXAMPLE\web-video-presentation
node scripts/package-skill.ts
```

#### 验收标准

- [ ] 版本全部为 2.9.0
- [ ] zip 生成成功
- [ ] MODIFICATION-RECORD-LESSONS 统计 32/10

---

## 3. §4 自检命令（Task 8 完成后执行）

```bash
# 0. 确认基线
cat VERSION   # 2.9.0

# 1. 脚手架（不要用 test-v280 命名，用 test-v290 测完即删）
bash scripts/scaffold.sh ./test-v290 --profile=douyin --theme=soft-neu
cd test-v290 && npm install

# 2. 结构检查
grep "acceptedChapterIds" project-state.json
grep "acknowledge-draft" scripts/render-video.ts
grep "validateOverlayChapterQuality\|overlayChapterIds" scripts/preflight.ts
grep "render:alpha:smoke" package.json
grep "run-studio" package.json

# 3. validate-narrations（example 跳过）
npm run validate-narrations

# 4. draft 无 acknowledge 应失败（gate 未齐）
npx tsx scripts/render-video.ts --preset=draft --frames=0-30
# 期望 exit 1

# 5. draft 有 acknowledge 应通过（需 remotion 环境）
npx tsx scripts/render-video.ts --preset=draft --frames=0-30 --acknowledge-draft
# 期望 exit 0 或 remotion 相关错误（非 gate 错误）

# 6. 回到 skill 根目录，删除 test-v290，打包
cd ..
Remove-Item -Recurse -Force test-v290
node scripts/package-skill.ts
```

---

## 4. 执行 Agent 禁止事项

1. 不要改 v2.8 的 TransparentFix / full-video-alpha / render:video:alpha 核心逻辑（除非 Task 4 白名单需要）
2. 不要让 `render:video:draft` 默认带 `--acknowledge-draft`
3. 不要让 alpha-smoke 或 acknowledged draft 写入 `output/render-result.json`
4. 不要删除 validate-delivery 对正式 deliver 的严格检查
5. 不要 commit，除非用户明确要求
6. Task 7 必须删除 test-v280，不要提交 node_modules

---

## 5. 给弱执行 Agent 的一句话指令

> 阅读 `references/WORKFLOW-OPTIMIZATION-EXEC-PLAN-v2.9.0.md`，确认 VERSION 为 2.8.0 后，按 Task 1→8 顺序执行，每 Task 完成打验收勾，最后跑 §4 自检、`node scripts/package-skill.ts` 出 2.9.0 zip。

---

## 6. 文件变更一览

| 操作 | 路径 |
|---|---|
| 新增 | `templates/scripts/render-alpha-smoke.ts` |
| 新增 | `templates/scripts/run-studio.cjs` |
| 修改 | `templates/project-state.json` |
| 修改 | `templates/scripts/record-feedback.ts` |
| 修改 | `templates/scripts/render-video.ts` |
| 修改 | `templates/scripts/preflight.ts` |
| 修改 | `templates/scripts/validate-delivery.ts` |
| 修改 | `templates/scripts/validate-assets.ts`（或 preflight 内联 5.2） |
| 修改 | `scripts/scaffold.sh` |
| 修改 | `scripts/package-skill.ts` |
| 修改 | `references/MODIFICATION-RECORD-LESSONS.md` |
| 修改 | `SKILL.md`（最小） |
| 修改 | `references/AGENT-RULEBOOK.md`、`QUALITY-GATE.md`、`PRODUCTION-WORKFLOW.md` |
| 修改 | `VERSION` / `VERSION.json` / `VERSION.md` / `manifest.json` |
| 删除 | `test-v280/`（若存在） |

---

## 7. 预期效果（给用户看的）

| 事故 | v2.8 | v2.9 后 |
|---|---|---|
| 第 4 章未验收就渲染 | 无状态 | preflight 缺 chapter-review → fail |
| preflight 241 error 仍 draft 出片 | 可 bypass | 需 `--acknowledge-draft`，交付仍拒 |
| overlay 半透明看不见 | Agent 记忆 | preflight rgba/text-stroke fail |
| useCurrentFrame in map 崩溃 | 运行时才发现 | preflight 静态扫描 |
| 漏做第 3 章 | script 覆盖率（v2.8） | + outline/registry 漂移双保险 |
| Alpha 未实测 | 仅结构检查 | `render:alpha:smoke` + ffprobe |
