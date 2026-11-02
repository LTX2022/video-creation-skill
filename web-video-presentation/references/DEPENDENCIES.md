# 依赖与执行边界

先读 [WORKSPACE-SETUP](WORKSPACE-SETUP.md)：**客户明确指定独立空目录后新建；已有项目走只读 resume，不重新 scaffold。** 更新 skill 包不自动授权用户电脑上的软件安装、全局设置、个人技能、登录或收费调用。

```bash
# 只读本机清点，不探测网络/LAN 服务、不安装。
bash <skill>/scripts/check-dependencies.sh --json
# 明确选定的新项目；不存在的目标只报告，不创建。
bash <skill>/scripts/bootstrap-preflight.sh --mode=new \
  --project-root /absolute/client-selected/project --json
# 已有项目只读验证。
bash <skill>/scripts/check-dependencies.sh --project /absolute/existing/project --json
# 客户明确确认的旧版无标记项目：仍只读，不补写文件。
bash <skill>/scripts/check-dependencies.sh --project /absolute/legacy/project --legacy-resume --json
```

| 依赖 | 作用 / 缺失时处理 |
|---|---|
| Node 20.6+、Bash | 项目脚本/脚手架；不足就停止相应动作并列出平台安装选项。skill 发行打包器另要求 Node 24+。 |
| npm | 安装项目依赖时需要；仅 scaffold 文件无需下载包。 |
| ffmpeg、ffprobe | 媒体处理、音频时长和 Alpha 检查；缺失可做有限草稿，但不能声称正式媒体/透明验证完成。 |
| 已安装受支持 Chromium/Chrome/Edge | 预览/渲染时需要；显式设置 `REMOTION_BROWSER_EXECUTABLE`/`--browser-executable`。缺失就停，不触发默认浏览器下载。 |
| ZIP 打包工具 | 视频项目 `package:delivery`：Unix/macOS 需要 PATH 中的 `zip`；Windows 使用 `powershell.exe` 的 `Compress-Archive`。只读清点按平台列出，缺失须先确认安装或单独安排目录交付，不能把暂存目录声称为 ZIP。发现工具不证明版本/能力兼容；Windows 分支尚未实机验证。 |
| 项目 npm 包 | 在项目 `node_modules/` 清点；“存在”不等于兼容或验证通过。 |
| imagegen / MCP 等宿主能力 | 由可用宿主工具确认，**不是 npm 包**；本地清点报告 `host-verification-required`，不猜测可用性或下载替代。 |

新检查器只读取路径和包元数据，不执行发现的工具、不联网；`found-not-tested` / `installed-not-verified` 不等于可用性验证。缺项按需要的阶段处理，退出 0 仅表示清点完成。旧检查器的 `--install-project` 已明确拒绝，避免无条件 `npm install`、重复加包、LAN 探测和隐式下载浏览器。

默认 resume 需要项目标记。旧项目缺标记时可显式 `--legacy-resume`：必须仍有识别本 skill 的有效 project-state 与 package/scripts，报告 `legacy-unmarked` 和身份来源不完整警告，所有文件保持原样；已存在但错误/损坏的标记不能绕过。该选项不是迁移、重新安装或覆盖授权。

项目依赖仅在安装已获准后安装到所选项目；Remotion 相关包保持同一已测兼容版本并保留 lockfile。当前 `OffthreadVideo` 从 `remotion` 导入，不安装不存在的 `@remotion/video` 包。正常安装使用：

```bash
cd /absolute/client-selected/project
npm ci --ignore-scripts --registry=https://registry.npmjs.org --cache "$PWD/.cache/npm"
```

`node_modules/` 留在 `package.json` 旁；npm cache 用单次命令的项目内路径，不改全局配置、不把依赖安装到独立工具库。`npm ci` 会重建已有依赖目录，继续项目也不代表自动授权此动作。原生 hook 确有必要时另行审查授权，不静默恢复全量 hooks；无 `npx` 自动下载回退。

客户可另选工具安装目录，但必须记录**准确路径、来源、版本、动作和授权**，确认该执行环境确有访问权。`--tool-root` 仅检查计划，不下载/安装。可移植工具按其支持方式放置；系统安装器、全局 npm、macOS/系统设置、PATH、登录、密钥和 MCP 配置需对应授权。不承诺所有插件可移植。缺权限则报告具体被阻止动作与目标，不绕过或声称已完成。

TTS 可选：MiniMax MMX 为现有 auto 首选；不可用时按 [TTS-ROUTING](TTS-ROUTING.md) 询问备选。Voicebox 仅手动显式选择，依赖清点不探测个人局域网地址。Alpha-only 无需 TTS 依赖。素材服务 key 只从已授权环境变量读取，不写入源文件、日志或交付包；无 key 可用用户素材或原创图形，不伪造下载/授权记录。

默认字体使用离线 fallback；远程方案保留为 `fonts.remote.css`，显式启用前需网络授权并重验排版。实际安装、typecheck、bundle、渲染结果分别记录，四者不能互相代替。
