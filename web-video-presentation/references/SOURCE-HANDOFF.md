# 按明确范围交付源码快照

`npm run package:delivery` 默认只打包媒体成品和交付证据，**不会附带整个工程、源码、原始旁白或全部素材**。用户明确要求源码交付后，才可启用：

```bash
npm run package:delivery -- --include-source
```

这个开关只额外加入 **selected source snapshot（已选择源码快照）**，不是完整工程归档器。默认流程不会读取偶然留在项目中的源码交付清单；开关启用但清单缺失、无效或存在不安全路径时，打包必须失败，不可静默退回无源码包。

## 先确认范围，再写清单

在项目根目录人工建立 `source-delivery-manifest.json`。逐项写入用户要求交付、已检查内容且可合法再分发的文件。禁止从项目全量扫描结果自动生成清单，也不要把“用户同意”之类布尔值当成授权证明。

以下是**结构示例，不是真实授权**；`authorization.request` 必须替换为当前用户/任务对源码范围的真实要求或准确转述，`rationale` 写明选择原因，`files` 必须按实际项目补齐：

```json
{
  "schema": 1,
  "scope": "selected-source-snapshot",
  "rationale": "示例：交付用户要求的指定源码，供接收方继续编辑；未选择文件不在本次交付范围。",
  "authorization": {
    "request": "示例占位，必须替换：用户要求交付以下列明的源码文件，不包括未经授权的原始旁白和素材。"
  },
  "files": [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "src/video/index.ts",
    "src/video/RemotionRoot.tsx",
    "src/config/videoFormat.ts",
    "src/registry/chapters.ts",
    "src/video/render-timing.generated.ts",
    "timing-manifest.json"
  ],
  "excluded": [
    {
      "path": "public/audio",
      "reason": "示例：本次源码交付不包含原始旁白；需要另行确认再分发范围和权利。"
    }
  ]
}
```

这份最小示例**不构成可独立运行的工程**：例如章节实现、组件、样式、主题、被调用脚本及其依赖并未列全。根据真实范围继续逐项添加 `src/`、`scripts/`、`public/` 或 `docs/` 内的文件；`public/` 素材也必须逐项授权、逐项选择，绝不因请求源码而自动附带全部素材或音频。

允许的根文件限定为 `package.json`、`package-lock.json`、`tsconfig.json`、`remotion.config.ts/js`、`vite.config.ts/js`、`index.html`、`project-state.json`、`composition-manifest.json`、`timing-manifest.json`、`provided-audio-manifest.json`、`asset-manifest.json`、`README.md`、`LICENSE`/`LICENSE.md`/`LICENSE.txt`、`NOTICE`/`NOTICE.md`。清单不支持目录、通配符或任意根文件归档。

## 收件方能看到什么

- 包内 `source-project/`：只保留显式选择文件的相对目录与原始字节，不覆盖已有媒体、证据或其他包文件。
- 包内 `source-handoff-report.json`：精确文件清单、每项 SHA-256 和字节数、原清单的 SHA-256、范围理由、授权要求文本、排除说明和限制。
- `minimumInputs.missing`：以上九个基础文件中**未被选入快照**的项，不代表工具扫描后确认磁盘上不存在这些文件。
- `referencedScriptsNotSelected`：已选择的 `package.json` 中，简单字面量 `scripts/…` 命令路径未随包附带的项目。这里只诊断常见路径，不执行 npm scripts，也不解析所有 shell/动态命令或传递依赖。
- `status: "partial"`：基础文件或检测到的脚本引用不齐全；不得称作完整可编辑工程。
- `status: "minimum-inputs-present-not-verified"`：基础文件和检测到的脚本引用已包含，**仍不等于**完整工程、可运行工程、离线可复现或已验证可渲染。

是否能真正继续编辑和渲染，还取决于组件/章节导入、资源和字体、运行时、浏览器、系统工具以及依赖安装条件。只有基础文件存在的检查不能证明这些条件满足。若用户要求“完整可编辑工程”，当前快照报告只能作为范围清单；需另外确认所有必要文件可交付，并进行接收环境验证，不能把这个开关当成任务已完全完成。

## 安全和已知边界

1. 授权文本只是范围记录，`authorization.authenticated` 固定为 `false`。工具不认证用户身份、不证明版权/许可，也不替代发送方对文件内容的秘密信息和再分发权检查。不要在清单理由、授权或排除说明中写入秘密信息。
2. 禁止绝对路径、URL、`..`、反斜杠/路径别名、隐藏路径（包括 `.env`、`.git`）、常见凭据/私钥名称、依赖目录、缓存和构建/输出目录；符号链接、硬链接和非普通文件一律拒绝。文件名筛查并不能检测普通源码里误写的令牌或其他秘密。
3. 最多 512 个文件，每项最多 32 MiB，总计最多 256 MiB；清单最多 1 MiB。大体积原始素材不适合借此功能归档。
4. 不递归扫描项目、不读取环境变量或凭据、不下载、不安装、不执行选中的脚本。`excluded` 仅是说明，不会访问其路径；其他未选中文件不会被枚举。
5. 复制前验证整个选择集，复制后验证原始字节 SHA-256。原有执行权限/时间戳不保留（输出权限为 `0600`）；脚本若需要执行权限，应由收件方在核对后按环境要求设置。重复写入已有 `source-project/` 或报告会拒绝，而非覆盖。
6. 运行中的协同修改仍需避免；本功能不是针对恶意并发文件系统修改的隔离沙箱。出现异常时，整个打包流程不得宣称交付成功。

## 本地回归

```bash
npm run test:source-handoff
```

仅使用本地合成夹具验证 opt-in、明确选择、字节保真、缺失项报告、路径/链接/凭据名称拒绝、覆盖保护和体积边界；不进行真实渲染、不联网，也不把测试中的授权文本当成真实用户许可。
