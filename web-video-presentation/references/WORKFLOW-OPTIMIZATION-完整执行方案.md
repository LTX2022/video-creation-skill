> **历史记录（非当前执行规范）**：保留当时问题、假设、计划和旧命令供追溯，不默认加载，不直接执行其中升级/安装/删除指令。当前制作从 [SKILL](../SKILL.md) 路由；Alpha、格式、QA、交付规则已在各专项文档实际修订。文内旧版本与旧路径不表示当前环境。

# web-video-presentation 工作流优化 —— 完整执行方案（主文档）

> **这是唯一主文档**。执行 Agent 只读这一份，按 Phase A → B → C 顺序做完，即视为「三份修改记录」相关优化**全部落地**。
>
> **当前基线**：`v2.9.0`（完整方案已落地，2026-07-07）  
> **上一基线**：`v2.8.0`（透明底/Alpha/script/viewBox）  
> **目标终态**：`v2.9.0`（流程门禁 + 叠加层质量 + 验证闭环 + 仓库卫生）  
> **工作目录**：`C:\PUBLIC-EXAMPLE\web-video-presentation`  
> **证据来源**：`C:\PUBLIC-EXAMPLE\修改记录\` 下三份全记录 + `references/MODIFICATION-RECORD-LESSONS.md`

**子文档（仅供查阅，不必并行读）**：
- `WORKFLOW-OPTIMIZATION-EXEC-PLAN-v2.8.0.md` — v2.8 细节（应已完成）
- `WORKFLOW-OPTIMIZATION-EXEC-PLAN-v2.9.0.md` — v2.9 细节（与本文 Phase B 一致）

---

## 一、什么叫「完整全部修改好」

| 层级 | 含义 | 本方案覆盖 |
|---|---|---|
| **L1 脚本门禁** | 能自动拦的事故，preflight/validate/render 脚本拦截 | ✅ 42 条中 34 条 → `[AUTO]` |
| **L2 模板代码** | 脚手架自带正确组件/composition，Agent 不用每次重写 | ✅ TransparentFix / full-video-alpha 等 |
| **L3 流程状态** | project-state + feedback-events 可证明用户验收过 | ✅ v2.9 补 acceptedChapterIds 等 |
| **L4 Agent 行为** | 每章必停、并行必自检等 | ⚠️ 保留 SKILL 文字规则，无法 100% 脚本化 |
| **L5 视觉审美** | 装饰不重叠、尺寸手算等 | ⚠️ 部分启发式 + CHAPTER-CRAFT 自检 |

**「完整」= L1+L2+L3 全部做完，L4/L5 文档与启发式到位。** 不要求用脚本替代人类审美判断。

---

## 二、42 条教训完整对照表（执行前必读）

图例：`✅` 已在 v2.8 落地 · `🔲` v2.9 Phase B 要做 · `📖` 保持 MANUAL（SKILL/CHAPTER-CRAFT）

| # | 教训摘要 | v2.8 | v2.9 | 终态 |
|---|---|:---:|:---:|:---:|
| 1 | 音频路径 + tts-manifest | ✅ | — | AUTO |
| 2 | TTS 逐段不合并 | — | — | MANUAL |
| 3 | subtitleCues 句级推进 | ✅ | — | AUTO |
| 4 | 画面文字不复述字幕 | ✅ | — | AUTO |
| 5 | 竖屏字幕安全区 | ✅ | — | AUTO |
| 6 | 图层 z-index 自检 | — | — | MANUAL |
| 7 | 每 step 有内容画面 | ✅ | — | AUTO |
| 8 | 节奏/超长 step 拆分 | ✅ | — | AUTO |
| 9 | 正式 render-result 证据 | ✅ | — | AUTO |
| 10 | package:delivery zip | ✅ | — | AUTO |
| 11–14 | 封面流程 | ✅ | — | AUTO |
| 15 | 参考视频 analyze/motion/compare | ✅ | — | AUTO |
| 16 | ProRes 四 flag + yuva | ✅ | — | AUTO |
| 17 | TransparentFix 模板 | ✅ | — | AUTO |
| 18 | 透明底图形不透明 + text-stroke | — | 🔲 T3 | AUTO |
| 19 | overlay opacity ≥0.25 | — | 🔲 T3 | AUTO |
| 20 | 多阶段视觉隐藏旧阶段 | — | — | MANUAL |
| 21 | label 不重复主画面 | ✅ | — | AUTO |
| 22 | 浏览器自动扫描 | ✅ | — | AUTO |
| 23 | ProRes 噪点纹理阻断 | ✅ | — | AUTO |
| 24 | Shot Design Review gate | ✅ | — | AUTO |
| 25 | 第一章 anchor gate | ✅ | — | AUTO |
| 26 | script.md 全文覆盖率 | ✅ | — | AUTO |
| 27 | 规格按 profile / 参考视频分辨率 | 部分 | 🔲 T5 | AUTO |
| 28 | 章节变更重走 SDR / 漂移检测 | — | 🔲 T5 | AUTO |
| 29 | audioDurationMs null >50% | ✅ | — | AUTO |
| 30 | 尺寸手算前置 | — | — | MANUAL |
| 31 | 竖屏最小字号 mobileReadability | ✅ | — | AUTO |
| 32 | 并行章节自检 | — | — | MANUAL |
| 33 | 模式 A 每章必须停 | — | 🔲 T1 | AUTO* |
| 34 | SVG viewBox 一致 | ✅ | — | AUTO |
| 35 | Hook 禁止在 .map() 内 | 部分 | 🔲 T4 | AUTO |
| 36 | Studio 端口冲突 | — | 🔲 T6 | AUTO* |
| 37 | H.265 无 alpha 阻断 | ✅ | — | AUTO |
| 38 | alpha 变量初始化顺序 | ✅ | — | AUTO |
| 39 | 并行前第一章已验收 | ✅ | — | AUTO |
| 40 | 装饰 SVG 不挡主内容 | — | — | MANUAL |
| 41 | section label 非口播原句 | ✅ | — | AUTO |
| 42 | isOverlay 在 types.ts | ✅ | — | AUTO |

\* 教训 33：脚本检查 `acceptedChapterIds`，不能替代 Agent「主动停下来问用户」，但可阻止未验收章节的交付。  
\* 教训 36：`run-studio.cjs` 自动换端口，减少手动 taskkill。

**v2.9 完成后实际统计**：`[AUTO]` **34 条**，`[MANUAL]` **8 条**（2/6/20/30/32/36/40/41）。

---

## 三、三份修改记录 → 优化项映射

### DeepSeek 涨价（fix-agent-record.md）

| 修改记录 P0/P1 项 | 对应教训 | 状态 |
|---|---|---|
| Shot Design Review 自动门禁 | 24 | ✅ v2.8 |
| 第一章 anchor 门禁 | 25 | ✅ v2.8 |
| 透明底图形不透明 | 18 | 🔲 v2.9 T3 |
| 尺寸计算前置 | 30 | 📖 MANUAL |
| 竖屏最小字号 | 31 | ✅ v2.8 |
| narration 当屏幕文字 | 4/41 | ✅ v2.8 |
| 主题 token 取色 | SKILL 已有 | 📖 |
| TTS null 阻断 preflight | 29 | ✅ v2.8 |
| draft 绕过 preflight 渲染 | — | 🔲 v2.9 T2 |
| 并行开发未验收第一章 | 39 | ✅ v2.8 |

### GPT-5.6 门禁（GPT56-修改全记录.md）

| 修改记录 P0/P1 项 | 对应教训 | 状态 |
|---|---|---|
| ProRes 四 flag | 16 | ✅ v2.8 |
| script 全文校验 | 26 | ✅ v2.8 |
| overlay opacity 阈值 | 19 | 🔲 v2.9 T3 |
| 竖屏图标尺寸 | 31 | ✅ v2.8 |
| 规格 1440×3200 非参考视频分辨率 | 27 | 🔲 v2.9 T5 |
| 新增章节重走 SDR | 28 | 🔲 v2.9 T5 |
| viewBox 与 videoFormat | 34 | ✅ v2.8 |
| 装饰 SVG 重叠 | 40 | 📖 MANUAL |

### AI圈大地震（AI圈大地震-修改全记录.md）

| 修改记录 P0/P1 项 | 对应教训 | 状态 |
|---|---|---|
| TransparentFix 注入 style | 17 | ✅ v2.8 |
| 并行章节自检 | 32 | 📖 MANUAL |
| label 重复主画面 | 21 | ✅ v2.8 |
| 不下载 Chrome | 22 | ✅ v2.8 |
| 模式 A 每章停 | 33 | 🔲 v2.9 T1 |
| 多阶段视觉交替 | 20 | 📖 MANUAL |
| 纸纹 ProRes 46.6GB | 23 | ✅ v2.8 |
| 全局透明舞台错误 | 17 | ✅ v2.8 |
| H.265 假 alpha | 37 | ✅ v2.8 |
| Hook in map | 35 | 🔲 v2.9 T4 |

---

## 四、Phase A —— v2.8.0 验收复核（必须先过）

> 若任一项失败，按 `WORKFLOW-OPTIMIZATION-EXEC-PLAN-v2.8.0.md` 补做后再进入 Phase B。

```bash
cd C:\PUBLIC-EXAMPLE\web-video-presentation
cat VERSION   # 必须是 2.8.0
```

| # | 检查项 | 命令/路径 | 期望 |
|---|---|---|---|
| A1 | 版本 | `VERSION` | `2.8.0` |
| A2 | TransparentFix | `templates/src/components/TransparentFix.tsx` | 存在 |
| A3 | isOverlay | `templates/src/registry/types.ts` | 含 `isOverlay?: boolean` |
| A4 | overlayChapterIds | `templates/project-state.json` | 含 `"overlayChapterIds": []` |
| A5 | full-video-alpha | `templates/src/video/RemotionRoot.tsx` | 含 `full-video-alpha` + `AlphaStep` |
| A6 | render:video:alpha | `scripts/scaffold.sh` | npm scripts 已注入 |
| A7 | --alpha 四 flag | `templates/scripts/render-video.ts` | `assertProResSafeTheme` + `assertAlphaChannel` |
| A8 | script 覆盖率 | `templates/scripts/validate-narrations.ts` | 含 `script coverage` + 90% |
| A9 | viewBox 检查 | `templates/scripts/preflight.ts` | 舞台级 viewBox 逻辑 |
| A10 | 教训 27/15 | `MODIFICATION-RECORD-LESSONS.md` | AUTO 27 / MANUAL 15 |
| A11 | 交付 zip | `交付-web-video-presentation/*v2.8.0*.zip` | 存在（可选复核 SHA256） |

**Phase A 全部 ✅ 才进入 Phase B。**

---

## 五、Phase B —— v2.9.0 完整实施（8 个 Task）

> 细节与 `WORKFLOW-OPTIMIZATION-EXEC-PLAN-v2.9.0.md` 相同；此处为合并版速查 + 验收勾。

### Task 1：逐章验收状态机（教训 33）

**改什么**：
1. `templates/project-state.json` 增加 `acceptedChapterIds: []`、`developmentMode: "sequential"`
2. `templates/scripts/record-feedback.ts`：`chapter-review` accepted → push `acceptedChapterIds`；`chapter-anchor` 也写入第 1 章 id
3. `templates/scripts/preflight.ts`：注册章节均须在 `acceptedChapterIds`（example 项目跳过）
4. `templates/scripts/validate-delivery.ts`：每章需 accepted 的 feedback 事件 + userQuote
5. `SKILL.md`：补充 `npm run feedback -- --type=chapter-review --chapter=<id> ...`

**验收**：3 章只验收 2 章 → preflight fail ✅

---

### Task 2：Draft acknowledge 防 bypass（DeepSeek draft 事故）

**改什么**：
1. `render-video.ts`：抽取 `getMissingWorkflowGates()`；新增 `assertDraftAcknowledged()`
2. draft/smoke/alpha:draft：gate 未齐时 **必须** `--acknowledge-draft`，否则 exit 1
3. `writeRenderResult` 增加 `acknowledgedDraft: true`
4. `validate-delivery`：acknowledged draft 不得作为正式交付
5. **不要**给 `npm run render:video:draft` 默认加 acknowledge

**验收**：无 gate + draft 无 flag → exit 1；加 `--acknowledge-draft` → 可渲染 ✅

---

### Task 3：Overlay 视觉 preflight（教训 18/19）

**改什么**：`preflight.ts` 当 `overlayChapterIds` 非空时：
- 扫描 rgba alpha < 0.25 → fail
- 大号字无 text-stroke → fail
- `.stage-alpha` CSS 类 → fail

**验收**：`rgba(255,255,255,0.18)` → fail ✅

---

### Task 4：Remotion Hook 静态扫描（教训 35）

**改什么**：`preflight.ts` 扫描 `.map(`/`.forEach(` 后 30 行内 `useCurrentFrame(` → fail；白名单 `RemotionRoot.tsx` 的 `AlphaStep`

**验收**：故意坏例子 → fail ✅

---

### Task 5：章节漂移 + 参考视频分辨率（教训 27/28）

**改什么**：
1. `preflight.ts`：outline 章数 vs registry 章数；shot-manifest chapter 集合 vs registry
2. `validate-assets.ts` 或 preflight：非 reference 视频素材分辨率须匹配 videoFormat；douyin 默认 1440×3200

**验收**：outline 3 章 registry 2 章 → fail ✅

---

### Task 6：Alpha 冒烟 + Studio 端口（v2.8 验证缺口 + 教训 36）

**新增**：
1. `templates/scripts/render-alpha-smoke.ts`（0–30 帧 + ffprobe yuva）
2. `templates/scripts/run-studio.cjs`（端口 3000–3010 自动探测）
3. `scaffold.sh`：`render:alpha:smoke`、`render:studio` 走 run-studio.cjs

**验收**：package.json 含两条命令；alpha-smoke 不写 `render-result.json` ✅

---

### Task 7：仓库卫生

**改什么**：
1. `scripts/package-skill.ts`：`EXCLUDE_DIRS` 加 `test-v280`、`test-v290` 或 `/^test-v\d+/`
2. **删除**仓库内 `test-v280/`（若存在，含 node_modules）

**验收**：打包 zip 不含 test-v* ✅

---

### Task 8：文档 + 版本 2.9.0 + 打包

**改什么**：

| 文件 | 内容 |
|---|---|
| `VERSION` / `manifest.json` / `templates/project-state.json` | `2.9.0` |
| `VERSION.json` / `VERSION.md` | v2.9.0 Summary + notes |
| `MODIFICATION-RECORD-LESSONS.md` | AUTO 34 / MANUAL 8；教训 18/19/27/28/33/35 改 AUTO |
| `SKILL.md` | chapter-review、acknowledge-draft、render:alpha:smoke |
| `AGENT-RULEBOOK.md` / `QUALITY-GATE.md` / `PRODUCTION-WORKFLOW.md` | 各 3–5 行 |
| `WORKFLOW-OPTIMIZATION-EXEC-PLAN-v2.8.0.md` | 文末链到本文 |

**打包**：
```bash
cd C:\PUBLIC-EXAMPLE\web-video-presentation
node scripts/package-skill.ts
```

**验收**：`web-video-presentation-v2.9.0-delivery-*.zip` 存在 ✅

---

## 六、Phase C —— 完整端到端验收（全部 Task 后必跑）

### C1. 结构自检（无需 Remotion 渲染）

```bash
cd C:\PUBLIC-EXAMPLE\web-video-presentation
cat VERSION                                    # 2.9.0

bash scripts/scaffold.sh ./test-v290 --profile=douyin --theme=soft-neu
cd test-v290 && npm install

grep acceptedChapterIds project-state.json
grep acknowledge-draft scripts/render-video.ts
grep overlayChapterIds scripts/preflight.ts
grep render:alpha:smoke package.json
grep run-studio package.json
test -f src/components/TransparentFix.tsx && echo OK
grep isOverlay src/registry/types.ts
grep full-video-alpha src/video/RemotionRoot.tsx

npm run validate-narrations                    # pass（example 跳过 script）
```

### C2. 负向门禁测试

```bash
# draft 无 acknowledge，gate 未齐 → 必须 exit 1
npx tsx scripts/render-video.ts --preset=draft --frames=0-30

# draft 有 acknowledge → 允许（或 remotion 环境错误，但不能是 gate 错误）
npx tsx scripts/render-video.ts --preset=draft --frames=0-30 --acknowledge-draft
```

### C3. 正向流程模拟（有真实章节时）

在**非 example** 项目上（Agent 自建 2 章最小项目）：

1. 写 `script.md` + 2 章 `narrations.ts`
2. `npm run feedback -- --type=checkpoint-plan --resolution=accepted --quote="确认"`
3. `npm run feedback -- --type=shot-design-review --resolution=accepted --quote="确认分镜"`
4. 第 1 章：`npm run feedback -- --type=chapter-anchor --chapter=ch1 --resolution=accepted --quote="OK"`
5. 第 2 章：`npm run feedback -- --type=chapter-review --chapter=ch2 --resolution=accepted --quote="OK"`
6. `npm run preflight` → pass
7. `npm run render:alpha:smoke`（有 remotion 时）→ yuva

### C4. 清理与打包

```bash
cd C:\PUBLIC-EXAMPLE\web-video-presentation
Remove-Item -Recurse -Force test-v290 -ErrorAction SilentlyContinue
node scripts/package-skill.ts
```

### C5. 交付物检查清单

| 交付物 | 路径 |
|---|---|
| skill 源码 | `web-video-presentation/` VERSION=2.9.0 |
| 交付 zip | `交付-web-video-presentation/web-video-presentation-v2.9.0-delivery-*.zip` |
| manifest | `交付-web-video-presentation/delivery-manifest.json` version=2.9.0 |
| 主文档 | `references/WORKFLOW-OPTIMIZATION-完整执行方案.md`（本文） |

---

## 七、完整文件变更清单（Phase A+B 合计）

### v2.8 应有（复核，一般不重复改）

| 文件 | 关键内容 |
|---|---|
| `templates/src/components/TransparentFix.tsx` | 新建 |
| `templates/src/registry/types.ts` | isOverlay |
| `templates/src/video/RemotionRoot.tsx` | full-video-alpha, AlphaStep |
| `templates/project-state.json` | overlayChapterIds |
| `templates/scripts/render-video.ts` | --alpha, assertProRes*, assertAlpha* |
| `templates/scripts/validate-narrations.ts` | script coverage 90% |
| `templates/scripts/preflight.ts` | viewBox |
| `scripts/scaffold.sh` | TransparentFix 复制, render:video:alpha |

### v2.9 新增/修改

| 操作 | 文件 |
|---|---|
| 改 | `templates/project-state.json`（acceptedChapterIds, developmentMode, projectVersion） |
| 改 | `templates/scripts/record-feedback.ts` |
| 改 | `templates/scripts/render-video.ts`（acknowledge-draft） |
| 改 | `templates/scripts/preflight.ts`（T1/T3/T4/T5） |
| 改 | `templates/scripts/validate-delivery.ts` |
| 改 | `templates/scripts/validate-assets.ts`（或 preflight 内联 T5.2） |
| **新增** | `templates/scripts/render-alpha-smoke.ts` |
| **新增** | `templates/scripts/run-studio.cjs` |
| 改 | `scripts/scaffold.sh` |
| 改 | `scripts/package-skill.ts` |
| 改 | `references/MODIFICATION-RECORD-LESSONS.md` |
| 改 | `SKILL.md` + `AGENT-RULEBOOK.md` + `QUALITY-GATE.md` + `PRODUCTION-WORKFLOW.md` |
| 改 | `VERSION` / `VERSION.json` / `VERSION.md` / `manifest.json` |
| 删 | `test-v280/` |

---

## 八、执行 Agent 禁止事项（完整版）

1. 不要改动 v2.8 已正确的 TransparentFix / full-video-alpha 核心逻辑（除非 Task 4 白名单）
2. 不要让 `render:video:draft` / `render:smoke` **默认**带 `--acknowledge-draft`
3. 不要让 alpha-smoke 或 acknowledged draft 写入 `output/render-result.json`
4. 不要在 `AlphaVideo` 舞台全局 `background: transparent`
5. 不要削弱 validate-delivery 对正式 MP4 的严格要求
6. 不要提交 `test-v*/node_modules` 到仓库
7. 不要 git commit，除非用户明确要求
8. 不要扩展 scope 到 v3.0（装饰 SVG 重叠检测、完整布局引擎等）

---

## 九、给执行 Agent 的一句话（复制即用）

```
阅读 C:\PUBLIC-EXAMPLE\web-video-presentation\references\WORKFLOW-OPTIMIZATION-完整执行方案.md：
先 Phase A 复核 v2.8.0（10 项），再 Phase B 执行 Task 1–8 升到 v2.9.0，最后 Phase C 端到端验收并 node scripts/package-skill.ts。
不要扩展 scope，不要 commit，完成后汇报 Phase A/B/C 勾选表与 zip 路径。
```

---

## 十、完成后用户可见效果（验收标准人话版）

| 以前会发生的事 | 完整方案后 |
|---|---|
| Agent 跳过 Shot Design / 第一章验收仍出正式片 | preflight + render 正式路径阻断 |
| preflight 一堆 error 仍 draft 当交付 | draft 需 `--acknowledge-draft`，交付仍拒 |
| 透明底每次会话重写、三次 alpha 失败 | 模板 + `npm run render:video:alpha` |
| script 只读一半漏整章 | 字符覆盖率 <90% fail |
| overlay 半透明看不见 | preflight 扫 rgba / text-stroke |
| 第 4 章没验收就渲染 | acceptedChapterIds 缺章 fail |
| 参考视频 2160 误当项目尺寸 | asset-manifest + profile 检查 |
| Studio 端口占满启动失败 | run-studio 自动换端口 |
| 仓库里留着 test-v280 几万个文件 | 删除 + 打包排除 |

---

## 十一、v3.0  backlog（本方案不做）

| 项 | 原因 |
|---|---|
| 装饰 SVG 与主内容重叠自动检测 | 需视觉/坐标启发式，误报高 |
| 横排宽度溢出自动计算 | 需布局引擎 |
| 多阶段 visualStages 自动检测 | 需 AST 分析 opacity 切换 |
| preflight 对开发中项目分级（warning vs error） | 产品决策，非本轮回 |

---

**文档版本**：与 skill v2.8.0 基线对齐，目标 v2.9.0  
**最后更新**：2026-07-07
