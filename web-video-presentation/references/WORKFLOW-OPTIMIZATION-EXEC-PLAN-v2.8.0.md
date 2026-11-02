> **历史记录（非当前执行规范）**：保留当时问题、假设、计划和旧命令供追溯，不默认加载，不直接执行其中升级/安装/删除指令。当前制作从 [SKILL](../SKILL.md) 路由；Alpha、格式、QA、交付规则已在各专项文档实际修订。文内旧版本与旧路径不表示当前环境。

# web-video-presentation v2.8.0 工作流优化 —— 执行 Agent 实施文档

> **用途**：交给执行 Agent 按任务清单改代码。**不要自行扩展 scope**，严格按本文 P0 任务执行。
>
> **基线版本**：`v2.7.0`（读 `VERSION` 确认）
>
> **证据来源**：
> - `C:\PUBLIC-EXAMPLE\修改记录\fix-agent-record.md`（DeepSeek 涨价）
> - `C:\PUBLIC-EXAMPLE\修改记录\GPT56-修改全记录.md`（GPT-5.6 门禁）
> - `C:\PUBLIC-EXAMPLE\修改记录\AI圈大地震-修改全记录.md`（AI圈大地震）
> - 当前 skill：`C:\PUBLIC-EXAMPLE\web-video-presentation`

---

## 0. 诊断结论（先读，再动手）

### v2.7.0 已经做得好的（**不要重复造轮子**）

| 能力 | 位置 | 说明 |
|---|---|---|
| 42 条修改记录教训文档 | `references/MODIFICATION-RECORD-LESSONS.md` | 已沉淀，但部分标 `[AUTO]` 实际未自动化 |
| 工作流硬节点文字提示 | `SKILL.md` 工作流总览 | 教训 24-33 有 ⚠️ 标注 |
| 最终渲染门禁 | `templates/scripts/render-video.ts` → `assertWorkflowAllowed()` | 仅 **非 draft 的正式 full.mp4** 才检查 |
| 浏览器自动扫描 | `render-video.ts` → `detectInstalledBrowser()` | 教训 22 已落地 |
| TTS null 超 50% 阻断 | `templates/scripts/preflight.ts` | 教训 29 已落地 |
| 画面文字重复检查 | `templates/scripts/validate-screen-text.ts` | 教训 4/21 已落地 |
| 竖屏字号门禁 | `preflight.ts` → `mobileReadability` | 教训 31 已落地 |

### v2.7.0 仍存在的核心问题（三份修改记录共同根因）

| # | 问题 | 三份记录中的损失 | v2.7.0 现状 |
|---|---|---|---|
| 1 | **透明底/Alpha 导出无模板代码** | GPT-5.6 三次无效 alpha 渲染 ~40min；AI圈大地震 3 次无效渲染 ~50min | 只有文字教训 16/17，Agent 每次会话现写 |
| 2 | **script.md 漏章无自动检查** | GPT-5.6 整章遗漏 ~45min 返工 | 教训 26 标 `[MANUAL]`，preflight 不查 |
| 3 | **draft 渲染可绕过全部门禁** | DeepSeek 涨价 preflight 241 error 仍 draft 渲染 | `assertWorkflowAllowed()` 对 draft 直接 return |
| 4 | **文档与代码不一致** | 教训 42 标 `[AUTO]` 但 `types.ts` 无 `isOverlay` | 弱 Agent 会误以为已自动化 |
| 5 | **ProRes 噪点/H.265 假 alpha 无脚本阻断** | AI圈大地震 46.6 GB + H.265 无 alpha | 教训 23/37 标 `[MANUAL]` |
| 6 | **分辨率变更后 SVG viewBox 不查** | GPT-5.6 2160→1440 后 viewBox 未同步 | 教训 34 标 `[MANUAL]` |

### 优化策略（v2.8.0 目标）

**把「Agent 必须记住的文字教训」变成「模板代码 + npm 脚本自动拦截」**，优先覆盖三份记录中 **P0 且反复发生** 的 5 类事故：

1. 透明底 + ProRes Alpha 导出（教训 16/17/23/37/42）
2. script.md 漏章（教训 26）
3. SVG viewBox 不一致（教训 34）

**不在 v2.8.0 范围**（保持 SKILL.md 手动规则即可）：
- 模式 A 每章必须停（教训 33）—— 无法脚本化，靠 Agent 流程
- 并行章节自检（教训 32）—— 靠 reviewer subagent，不新增脚本
- 装饰 SVG 重叠 / section label（教训 40/41）—— 已有 validate-screen-text 部分覆盖

---

## 1. 版本与范围

- **目标版本**：`2.8.0`（MINOR）
- **必须改的文件**：见各 Task 的「涉及文件」
- **必须同步的版本文件**：`VERSION`、`VERSION.json`（version/publicVersion/internalRevision/releaseDate/notes 首条）、`VERSION.md`（顶部新增 v2.8.0 Summary）、`manifest.json`
- **打包**：全部 Task 完成后运行 `node scripts/package-skill.ts` 生成交付包
- **禁止**：不要改 unrelated 文件；不要重构已有逻辑；不要删 v2.7.0 已有功能

---

## 2. P0 任务清单（按顺序执行）

---

### Task 1：透明底子系统模板内置

**对应教训**：17、18、35、42  
**根因**：三个项目都在会话里手写 TransparentFix / isOverlay / alpha composition，重复踩坑。

#### 1.1 新建 `templates/src/components/TransparentFix.tsx`

```tsx
/** 透明底章节唯一正确方案（教训 17）。禁止用 CSS 类名 .stage-alpha。 */
export function TransparentFix({ prefix }: { prefix?: string }) {
  const chapterSelector = prefix ? `, .${prefix}-chapter` : "";
  return (
    <style>{`
      body, .stage-frame, .scene${chapterSelector} { background: transparent !important; }
      .stage-frame { box-shadow: none !important; }
      .stage-frame::before, .stage-frame::after { display: none !important; }
    `}</style>
  );
}
```

章节用法（写在组件 JSDoc 里）：
```tsx
{isOverlay && <TransparentFix prefix="nf" />}
```

#### 1.2 修改 `templates/src/registry/types.ts`

在 `ChapterStepProps` 增加：

```ts
/** 透明叠加层章节（ProRes alpha / 博主镜头）。见 project-state.json overlayChapterIds */
isOverlay?: boolean;
```

#### 1.3 修改 `templates/project-state.json`

在 `subtitlesPreviewVerified` 后增加：

```json
"overlayChapterIds": [],
```

#### 1.4 修改 `templates/src/video/RemotionRoot.tsx`

必须实现：

1. 从 `project-state.json` 读取 `overlayChapterIds: string[]`，构建 `OVERLAY_CHAPTER_IDS` Set
2. `StepContent` 传 `isOverlay={false}` 给章节 Component
3. 新增 `AlphaStep` 组件（**教训 35**：`useCurrentFrame()` 必须在组件顶层，禁止在 `.map()` 内调用）
4. 新增 `AlphaVideo` 组件（无 `<Audio>`、无 `<Subtitle>`）
5. 注册新 Composition：

```tsx
<Composition id="full-video-alpha" component={AlphaVideo} ... />
```

**关键约束（AI圈大地震事故）**：
- `AlphaVideo` 的舞台 **不要** 设 `background: transparent`
- 只有 `overlayChapterIds` 中的章节收到 `isOverlay={true}`，由章节内 `TransparentFix` 控制透明
- 其余章节保持主题实色背景（支持「第 1 章透明 + 第 2-N 章实色」混合导出）

#### 1.5 修改 `scripts/scaffold.sh`

在复制 components 处增加一行：

```bash
cp "$TEMPLATES/src/components/TransparentFix.tsx" src/components/TransparentFix.tsx
```

#### 验收标准

- [ ] `TransparentFix.tsx` 存在且可被 import
- [ ] `types.ts` 含 `isOverlay?: boolean`
- [ ] `project-state.json` 含 `overlayChapterIds: []`
- [ ] `RemotionRoot.tsx` 有 `full-video-alpha` composition + `AlphaStep` 独立组件
- [ ] `scaffold.sh` 会复制 TransparentFix

---

### Task 2：`render-video.ts` 增加 `--alpha` 一条命令导出

**对应教训**：16、23、37、38  
**根因**：Agent 手拼 remotion 命令，三次缺 `--image-format=png`；纸纹噪点 46.6 GB；H.265 假 alpha。

#### 2.1 修改 `templates/scripts/render-video.ts`

**变量顺序（教训 38，必须先于 output）**：

```ts
const alpha = hasFlag("--alpha");
const composition = alpha ? "full-video-alpha" : "full-video";
const output = readFlag("--output", alpha ? "output/full-alpha.mov" : ...);
```

**alpha 模式参数**：
- `codec = "prores"`（固定，不读 --codec）
- 追加：`--prores-profile=4444 --image-format=png --pixel-format=yuva444p10le`
- **不要**传 `--crf` / `--x264-preset`
- `subtitles = false`（alpha 模式强制）

**新增函数 `assertProResSafeTheme()`**（教训 23）：
- 读 `src/styles/tokens.css`
- 若 `--surface-pattern` 不是 `none`，或含 `feTurbulence`/`feNoise` 且 pattern 非 none → `process.exit(1)`
- 在 `main()` 里、`assertWorkflowAllowed()` 之后调用（仅 alpha 时）

**新增函数 `assertAlphaChannel(outputPath)`**（教训 16）：
- 渲染完成后 ffprobe 读 `pix_fmt`
- 必须含 `yuva`；否则 fail 并提示缺 `--image-format=png`
- 命令：`ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of default=nw=1:nk=1 <path>`

**H.265 阻断（教训 37）**：
- 若 `!alpha && pixelFormat?.includes("yuva") && codec !== "prores"` → exit 1，提示用 `--alpha`

**renderArgs 改动**：
- composition 用变量（不是硬编码 `"full-video"`）
- alpha 时不 push `--crf`

**writeRenderResult**：
- result 对象增加 `alpha: boolean`
- `composition` 字段用变量

**help 文本**：增加 `--alpha` 说明

#### 2.2 修改 `scripts/scaffold.sh` 的 npm scripts 注入

在 `node -e` 的 scripts 对象中增加：

```js
"render:video:alpha": "npm run preflight && npm run render:timing && tsx scripts/render-video.ts --alpha",
"render:video:alpha:draft": "npm run render:timing && tsx scripts/render-video.ts --alpha --preset=draft --output output/draft-alpha.mov",
```

scaffold 输出 README 提示中也加一行 `npm run render:video:alpha`。

#### 验收标准

- [ ] `tsx scripts/render-video.ts --help` 显示 `--alpha`
- [ ] alpha 模式自动带四 flag
- [ ] tokens.css 有噪点纹理时 alpha 渲染被阻断（可用 paper-press 主题测）
- [ ] 渲染后自动 ffprobe 验证 yuva（无 remotion 环境时可 mock 测函数逻辑）
- [ ] `npm run render:video:alpha` 在 scaffold 项目的 package.json 中存在

---

### Task 3：`validate-narrations.ts` 增加 script.md 覆盖率门禁

**对应教训**：26  
**根因**：GPT-5.6 Agent 只读了 script.md 前 12 句，整章遗漏。

#### 3.1 修改 `templates/scripts/validate-narrations.ts`

在 `main()` 末尾、现有检查之后增加：

1. **`normalizeSpokenText(value)`**：去标点/空白/引号，转小写
2. **`readScriptContent()`**：依次找 `../script.md`、`script.md`；跳过 `#` 标题行、`>` 引用行、`---` 分隔行；返回 `{ path, text, segments }`
3. 汇总所有章节的 `narrations` 文本，算字符覆盖率 = `allNarrationText.length / script.text.length`
4. **跳过条件**：仅有 `01-example` 章节时跳过（脚手架初始态）
5. **阈值**：覆盖率 < 90% → `failed++` 并打印明确错误（引用 lesson 26 / GPT-5.6 事故）
6. 通过时打印 `v script coverage XX%`

#### 验收标准

- [ ] script.md 18 句、narrations 只有 12 句 → validate-narrations fail
- [ ] 覆盖率 ≥ 90% → pass
- [ ] 仅 01-example 章节 → 跳过 script 检查
- [ ] preflight 第一步 validate-narrations 会自动跑此检查

---

### Task 4：`preflight.ts` 增加 SVG viewBox 一致性检查

**对应教训**：34  
**根因**：GPT-5.6 分辨率 2160×3840 → 1440×3200 后，全屏 SVG viewBox 未改。

#### 4.1 修改 `templates/scripts/preflight.ts`

在 `readVideoFormat()` 之后、`validateChapterRegistry()` 之前增加：

```ts
// 仅检查「舞台级」SVG：viewBox 宽高均 >= 1000
// 小图标 viewBox（如 0 0 24 24）不检查
for (const file of walkFiles(resolve(ROOT, "src/chapters"))) {
  if (!/\.(tsx|jsx)$/.test(file)) continue;
  for (const match of content.matchAll(/viewBox\s*=\s*["']\s*0\s+0\s+(\d+)\s+(\d+)\s*["']/g)) {
    const w = Number(match[1]), h = Number(match[2]);
    if (w >= 1000 && h >= 1000) {
      if (w !== videoFormat.width || h !== videoFormat.height) {
        fail(`x ${rel}: stage SVG viewBox 0 0 ${w} ${h} != videoFormat ${videoFormat.width}x${videoFormat.height}`);
      }
    }
  }
}
```

#### 验收标准

- [ ] viewBox `0 0 2160 3840` + videoFormat 1440×3200 → preflight fail
- [ ] viewBox `0 0 24 24` → 不检查，pass
- [ ] viewBox 与 videoFormat 一致 → pass

---

### Task 5：文档同步 + 教训生命周期降级

**不要大改 SKILL.md**，只做最小必要同步。

#### 5.1 `references/MODIFICATION-RECORD-LESSONS.md`

更新统计表：
- `[AUTO]` 22 → **27**
- `[MANUAL]` 20 → **15**

在统计表下加一行说明：v2.8.0 降级记录。

把以下条目标 `[AUTO]` 并更新正文（注明 v2.8.0 自动化机制）：

| 教训 | 新机制 |
|---|---|
| 16 ProRes 四 flag | `npm run render:video:alpha` + ffprobe yuva |
| 17 TransparentFix | 模板内置组件 + overlayChapterIds |
| 23 噪点纹理 | render-video.ts alpha 前检查 --surface-pattern |
| 26 script 全文 | validate-narrations 字符覆盖率 <90% fail |
| 34 viewBox | preflight 舞台级 SVG 检查 |
| 37 H.265 无 alpha | render-video.ts yuva+非prores 阻断 |
| 42 isOverlay 字段 | types.ts 真正内置 |

#### 5.2 `references/remotion-prores-alpha.md`

在文件顶部（第一个 `---` 之前）增加 **「v2.8.0 起首选路径」** 章节：
- `overlayChapterIds` + `{isOverlay && <TransparentFix />}`
- `npm run render:video:alpha`
- 手动四 flag 配方降级为「排查旧项目用」

#### 5.3 `references/RENDERING.md`

在 ProRes 章节开头加 3 行指向 `npm run render:video:alpha`。

#### 5.4 `references/CHAPTER-CRAFT.md`

完工自检清单「透明底章节」条目改为指向内置 `TransparentFix.tsx`，不再说「自己写 style 注入」。

#### 5.5 `SKILL.md`（最小改动）

1. Phase 4 命令清单加 `npm run render:video:alpha`
2. Phase 5 工作流总览 ⚠️ 改为一行：`透明通道 = npm run render:video:alpha`
3. 企业红线清单：**修复重复编号 15**（当前有两个 15）
4. 企业红线加 1 条：透明通道禁止手拼命令，用 `render:video:alpha`
5. 相关资源表 `remotion-prores-alpha.md` 描述更新

#### 验收标准

- [ ] 教训 16/23/26/34/37 标 `[AUTO]`
- [ ] 文档与代码行为一致
- [ ] SKILL.md 无重复编号

---

### Task 6：版本号 + 打包

#### 6.1 版本文件

| 文件 | 改动 |
|---|---|
| `VERSION` | `2.8.0` |
| `manifest.json` | `"version": "2.8.0"` |
| `templates/project-state.json` | `"projectVersion": "2.8.0"` |
| `VERSION.json` | version/publicVersion/internalRevision → 2.8.0；releaseDate → 2026-07-07；notes 数组**最前面**插入 v2.8.0 说明 |
| `VERSION.md` | 顶部插入 v2.8.0 Summary（见下方模板） |

#### 6.2 VERSION.md v2.8.0 Summary 模板（可直接用）

```markdown
## v2.8.0 Summary — 透明底/Alpha 导出子系统内置化

**MINOR**。把三份修改记录中反复发生的透明底/Alpha/script漏章/viewBox 事故，从文字教训变成模板代码和 npm 自动门禁。

### 核心变更
1. 模板内置 TransparentFix + isOverlay + overlayChapterIds + full-video-alpha composition
2. render-video.ts --alpha：四 flag + 噪点阻断 + ffprobe yuva + H.265 阻断
3. validate-narrations script.md 字符覆盖率 <90% fail
4. preflight 舞台级 SVG viewBox 一致性检查
5. 教训 16/23/26/34/37 降级 [AUTO]（22→27 条自动化）
```

#### 6.3 打包

```bash
cd C:\PUBLIC-EXAMPLE\web-video-presentation
node scripts/package-skill.ts
```

确认 `C:\PUBLIC-EXAMPLE\交付-web-video-presentation\` 下有新 zip。

#### 验收标准

- [ ] 所有版本文件一致为 2.8.0
- [ ] package-skill 成功
- [ ] 交付目录有新 zip

---

## 3. 执行 Agent 禁止事项

1. **不要**改 v2.7.0 已有的 Jitter 技法族 / TechniquePreviews / inferMotionTechnique
2. **不要**改 douyin 审核合规红线 / platformCompliance
3. **不要**改 VIDEO-ASSETS / OffthreadVideo 相关逻辑
4. **不要**新增测试文件（除非用户要求）
5. **不要** commit（除非用户明确要求）
6. **不要**在 AlphaVideo 舞台全局设 `background: transparent`（AI圈大地震核心 bug）
7. **不要**让 draft 正式渲染绕过 preflight（现有行为保持；alpha:draft 故意跳过 workflow gate 用于迭代）

---

## 4. 完成后自检命令

在 scaffold 出的测试项目中验证（执行 Agent 自行 scaffold 一个 `--profile=douyin` 项目）：

```bash
# 1. 脚手架
bash scripts/scaffold.sh ./test-v280 --profile=douyin --theme=soft-neu

cd test-v280

# 2. narrations 检查（应 pass，example 章节跳过 script 检查）
npm run validate-narrations

# 3. preflight（example 项目可能因 shot-manifest 不完整 fail，属正常）
npm run preflight

# 4. 确认 package.json 有新命令
grep "render:video:alpha" package.json

# 5. 确认 RemotionRoot 有 full-video-alpha
grep "full-video-alpha" src/video/RemotionRoot.tsx

# 6. 确认 TransparentFix 存在
test -f src/components/TransparentFix.tsx && echo OK

# 7. 确认 types 有 isOverlay
grep "isOverlay" src/registry/types.ts
```

---

## 5. 已知限制（v2.8.0 不解决，留给后续）

> **v2.9.0 已落地**：见 [`WORKFLOW-OPTIMIZATION-完整执行方案.md`](WORKFLOW-OPTIMIZATION-完整执行方案.md) 与 [`WORKFLOW-OPTIMIZATION-EXEC-PLAN-v2.9.0.md`](WORKFLOW-OPTIMIZATION-EXEC-PLAN-v2.9.0.md)。

| 问题 | 原因 | 建议后续版本 |
|---|---|---|
| draft 渲染绕过 workflow gate | 迭代需要；DeepSeek 项目滥用 draft 交付 | v2.9 考虑 preflight 对 draft 输出 warning 或要求 `--acknowledge-draft` |
| 模式 A 每章必须停 | 纯流程约束，无法脚本化 | 强化 AGENT-RULEBOOK + feedback-events 检查 |
| 并行章节质量 | 需 reviewer subagent | SKILL.md 已有，不新增脚本 |
| preflight 不查 project-state 开发阶段 | 只在 final render 查 | 可选：preflight 打印 warning 列出未确认 gate |

---

## 6. 文件变更一览（供 Code Review）

| 操作 | 路径 |
|---|---|
| **新增** | `templates/src/components/TransparentFix.tsx` |
| 修改 | `templates/src/registry/types.ts` |
| 修改 | `templates/src/video/RemotionRoot.tsx` |
| 修改 | `templates/project-state.json` |
| 修改 | `templates/scripts/render-video.ts` |
| 修改 | `templates/scripts/validate-narrations.ts` |
| 修改 | `templates/scripts/preflight.ts` |
| 修改 | `scripts/scaffold.sh` |
| 修改 | `references/MODIFICATION-RECORD-LESSONS.md` |
| 修改 | `references/remotion-prores-alpha.md` |
| 修改 | `references/RENDERING.md` |
| 修改 | `references/CHAPTER-CRAFT.md` |
| 修改 | `SKILL.md`（最小） |
| 修改 | `VERSION` / `VERSION.json` / `VERSION.md` / `manifest.json` |

**预计 diff 规模**：~400-600 行，6 个 Task，不涉及现有章节示例代码。

---

## 7. 给弱执行 Agent 的执行顺序速查

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6
  │         │         │         │         │         │
  透明底    alpha     script    viewBox   文档      版本+打包
  模板      命令      覆盖率    检查      同步
```

每完成一个 Task，在回复中列出：
1. 改了哪些文件
2. 对应验收标准打勾情况
3. 有无 blockers

全部 Task 完成后，运行 §4 自检命令并贴结果。
