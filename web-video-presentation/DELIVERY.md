# 交付：区分视频项目与 skill 发行包

## A. 制作的视频项目

以 `project-state.outputMode` 和 `scripts/delivery-contract.ts` 为单一输出契约。`output/render-result.json` schema 3 的 `outputs[]` 指向当前正式媒体及证据；不再固定要求每个项目有 MP4。

| 模式 | 正式媒体 |
|---|---|
| opaque | `output/full.mp4` |
| alpha | `output/full-alpha.mov`；可以无配音/字幕/封面 |
| composite | `output/full-composite.mp4`，需要已授权本地底片 |
| both | Alpha MOV + composite MP4，二者都验收且都进入包 |

默认交付包含所请求媒体、相关 timing/shot/composition/asset 清单、来源/许可说明、实际 QA 和用户确认、未测项。可编辑源文件不是默认自动外发：客户明确需要时，按 [SOURCE-HANDOFF](references/SOURCE-HANDOFF.md) 列出获准交付的文件，再用 `--include-source` 生成选定源码快照；缺依赖/脚本/素材必须列出，不冒称完整可离线复现工程。PNG 序列/其它格式只有请求或确有诊断用途时另导出，不声称默认存在。

```bash
npm run validate:delivery
npm run package:delivery
# 只有用户明确指定桌面/其它位置时使用脚本支持的覆盖参数
npm run package:delivery -- --desktop=<已确认目录>
```

默认项目内 `output/`，不隐式写某个个人桌面。仅封面请求用封面工作流，不把项目和所有源素材一并外发。素材许可不允许再分发时交付引用/替换说明，而非擅自打包。

Alpha 数值 pass 仍有边缘人工待审；当前 SHA256 绑定的 `alpha-edge-review` accepted 与黑/白检查通过后才能满足该门。灰底、实际 plate、目标编辑器另列证据与待测项；没有真实底片不称“实拍合成通过”。

draft/smoke/partial 不作 final；schema3顶层和各输出的contentRevision须等于当前输入，各有renderVariant，both不能拼接混合修订。输入unknown或文件hash变动都不通过。schema1/2可读但unbound，不能新交付时当当前有效。人工决定按gate/scope/subject.digest及追加顺序取最新；rejected/revoked覆盖旧接受，来源声明不是宿主鉴权。详情见[反馈证据](references/FEEDBACK-EVIDENCE.md)。

## B. Skill 本体发行包

更新上传的 skill 不等于安装。原包只读保留，修改候选副本，审查/验证后交新压缩包；用户没要求时不写个人 skills checkout 或电脑设置。

在 skill 根目录使用本发行打包器：

```bash
node scripts/package-skill.ts --out-dir <新的或空的交付目录>
# 明确只交目录、不生成 ZIP：
node scripts/package-skill.ts --out-dir <新的或空的交付目录> --no-zip
# 独立核验：
node scripts/package-skill.ts --verify <交付目录>
```

输出 skill 目录、delivery manifest 和（默认）ZIP；版本来自根 VERSION 文件。目标不可为源自身/祖先/子目录，不覆盖非空目录。不要传未经确认的个人绝对路径。打包失败不得写“完成”，`--no-zip` 目录交付也不能声称有 ZIP。

检查逐文件哈希/大小、版本一致性、ZIP 哈希与实际成员，排除密钥、当前运行日志、缓存和临时产物。公开候选已整体排除 lq-distillation 历史研究目录及 legacy/、嵌套 ZIP；不得从旧总包重新加入。保留五个 profile、主题、脚本与按需参考；历史资料可保留但不进入默认必读链。平台/工具兼容性只列实际测试过的环境。

发行打包器当前要求 Node 24+ 的原生TypeScript运行能力；Unix ZIP依赖PATH中的zip，Windows分支未在本次Linux测试中实测。验证拒绝ZIP64/多卷和symlink；SHA256是完整性校验，不是签名/来源认证。排除列表不是秘密扫描器，交付前仍需检查敏感信息。

## C. 包含主技能、fix-agent、历史包和样片的组合交付

组合包解压根包含 `bundle-manifest.json`；它不是上面核心发行打包器的纯净输出目录。**不要对组合包根运行 `package-skill.ts --verify`**：核心验证器按设计会拒绝 `bundle-manifest.json`、fix-agent、legacy、样片等额外成员，不应为此删除交付内容或放宽核心检查。

对实际组合包使用随主技能提供的只读验证器（Node 20.6+，无需 npm 安装）：

```bash
BUNDLE_ROOT='/absolute/path/to/extracted-combined-release'
node "$BUNDLE_ROOT/web-video-presentation/scripts/verify-bundle.mjs" \
  --root "$BUNDLE_ROOT" --json
```

它逐一验证 manifest 中的全部文件大小和流式 SHA256，拒绝缺失/额外文件（manifest 自身除外）、重复路径、路径越界、symlink 和非普通文件；不会安装、联网、启动浏览器、写文件或删除内容。对稳定目录执行，不要同时改动/重打包。返回成功只证明**相对于所附 manifest 的文件完整性**；不是签名/来源认证，也不是渲染、安装、视觉验收或跨平台兼容证明。ZIP 成员在此按完整 ZIP 文件哈希校验，不展开历史包或执行其代码。

组合包的外层 ZIP SHA256 应与另行提供的交付记录比较；外层 manifest 不能自证自己的真实性。核心包独立验收仍用 `package-skill.ts --verify <纯核心交付目录>`，该目录只能含主技能目录、`delivery-manifest.json` 和其声明的主技能 ZIP（目录交付则无 ZIP）。若需要从组合交付验证核心 ZIP 内容，应在新建临时核验目录复制这三项，保留原组合包不变，再运行核心验证器。

## 轻量记录与按需深度复盘

生成项目默认记录获授权叶子命令；项目轮次用 metrics:begin/resume 明确，缺失不猜。交付打包生成当前轮次的本地轻量摘要，只收已知普通文件，不递归带入任意诊断目录。包内是打包时快照，当前 package 尝试可能未闭合；不声称包含完整最终耗时。摘要失败只告警，不替代或放松正式媒体/封面/用户门禁。

完整 fix-agent 独立维护、按需加载，先摘要再相关证据，不自动实施建议或生成批准。命令与边界见 [FIX-AGENT-INTEGRATION](references/FIX-AGENT-INTEGRATION.md)。封面依 coverRequired 显式需求核验，包括被明确要求封面的 Alpha 项目；没有该要求时不强制透明素材附封面。
