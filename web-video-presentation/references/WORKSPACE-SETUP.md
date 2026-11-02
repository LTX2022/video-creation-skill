# 独立项目目录与依赖落点

## 先选地点，再写文件

每个客户/视频项目使用**客户明确指定的独立空目录**。先确认当前执行环境、项目绝对路径，以及是“新建”还是“继续已有项目”；不能擅自用当前目录、桌面、下载目录或默认 `presentation/`。云端同名路径不代表能访问用户电脑，遇到权限阻止要报告具体操作、目标、原因和未完成项，不能绕过限制。

- **新建**：目录可已存在但必须真正为空；`.DS_Store`、`.git` 等隐藏项也算非空。用户指定的新路径尚不存在时，只读预检报告 `not-created`；得到该地点的创建授权后才由 scaffold 创建，不先随手创建父目录。
- **继续**：用户明确选择已有项目，校验项目标记、`project-state.json`、`package.json`，然后读取现有状态继续。**不运行 scaffold、不重拷模板、不迁移或清理原文件**。失败/半成品项目也不自动修复覆盖；保留现场，另选空目录或单独确认修复范围。
- **旧项目无标记**：部分旧版项目没有 `.web-video-presentation-project.json`。确认这是客户要继续的旧项目后，用显式 `--legacy-resume` 只读检查；仍须通过 `project-state.projectSkill`、schema、package/scripts 与目录边界检查。报告 `legacy-unmarked` / `state-only-legacy` 及身份来源不完整警告，不补写标记、不自动升级。若已有标记但错误、损坏或为 symlink，该开关不能绕过。
- 拒绝目标/祖先目录 symlink、`..` 路径跳转、非目录目标，以及已有视频/npm 项目内部或 skill 安装目录内部的新项目。若系统路径本身是链接（如部分 macOS 临时路径），让客户确认实际路径后重新选择；不能偷偷换落点。
- 非 Windows 环境拒绝 `C:\...`、`C:/...`、盘符相对路径和反斜杠 UNC 路径，不把用户电脑路径误当成云端当前目录下的新文件夹。先确认执行环境与实际可访问的落点；普通已确认相对路径仍可用，快速开始示例统一使用绝对路径。
- 没有 `--force`、覆盖或自动清空开关。预检不锁住目录；不要并发向同一目录写入，scaffold 在写入前再次预检。

## 只读预检

以下路径是占位示例，须换成**客户确认且当前执行环境可访问**的路径。预检不会创建目录、联网、执行被发现的工具、下载或安装任何东西。

```bash
SKILL='/absolute/path/to/web-video-presentation'
PROJECT_ROOT='/absolute/client-selected/empty-video-project'
bash "$SKILL/scripts/bootstrap-preflight.sh" \
  --mode=new --project-root "$PROJECT_ROOT" --json

# 获准新建后；默认只生成文件，不安装依赖。
bash "$SKILL/scripts/scaffold.sh" "$PROJECT_ROOT" \
  --profile=custom --format=landscape --skip-install

# 下次继续已有项目：只读验证，绝不重新 scaffold。
bash "$SKILL/scripts/bootstrap-preflight.sh" \
  --mode=resume --project-root "$PROJECT_ROOT" --json

# 客户确认的旧版无标记项目；显式选择只读旧项目检查。
bash "$SKILL/scripts/bootstrap-preflight.sh" \
  --mode=resume --legacy-resume --project-root "$PROJECT_ROOT" --json
```

仅清点本机工具可运行 `bash "$SKILL/scripts/check-dependencies.sh" --json`。旧 `--install-project` 参数现在明确拒绝，不再隐式安装。缺 Node 时 Bash launcher 报告缺项后停止，无下载回退。

预检 JSON 中 `found-not-tested` 仅表示可执行文件存在；`installed-not-verified` 仅表示项目包元数据可读。它们**不是**版本兼容、typecheck、bundle、浏览器启动或渲染成功证据。退出 0 表示预检完成/路径符合契约，并不表示所有阶段依赖齐全；按 `dependencies[].status` 和 `requiredFor` 处理缺项。`--path-only` 仅供 scaffold 检查路径，不做完整环境清点。

## 一份项目，一套清楚的目录

| 路径 | 用途与边界 |
|---|---|
| `src/` | 源码；遵守现有模板，不另建重复的 `source/`。 |
| `assets/`（按需） | 原始输入、参考素材、来源/许可资料；不默认打包进浏览器。无需保留原件时不机械复制一份。 |
| `public/` | 渲染需要的图片/视频/音频；TTS 可复用音频在 `public/audio/`，不是随意可清理的 npm cache。 |
| `package.json`、lockfile、`node_modules/` | npm 约定位置都在项目根；不把 `node_modules` 装进工具库、cache 或另一个项目。 |
| `.cache/npm/` | npm 下载缓存/日志，用单次命令 `--cache` 指定，不改全局 npm 配置。其它工具缓存只在支持时明确配置。 |
| `output/tmp/`（按需） | 新增临时中间文件；现有 TTS 使用 `output/.tts-cache.*` 并自行清理。临时文件不纳入交付。 |
| `output/` | 工作渲染、证据、清单、验证结果。 |
| `output/delivery-package/` | 已有打包脚本的交付暂存目录；最终 zip 也由该脚本置于项目内。不另造重复的顶层 `delivery/`，桌面交付须显式授权。 |
| `.tools/`（显式选择后、按需） | 仅可移植工具，不放 npm 项目依赖。不是必须创建的空目录。 |

预检输出是**路径计划**，不会替第三方程序改写配置或自动迁移旧路径。需要集中临时文件时，在项目已获准建立后按需创建 `output/tmp/`，仅为相应进程设置其支持的 `TMPDIR`/`TEMP`/`TMP`；验证实际落点，不承诺每个工具都遵守同一缓存/临时目录。不要为了“整理”删除已有 cache、源素材或用户文件。

## 缺依赖时，先确认对象、下载源和准确目的地

三类依赖分开处理：

1. **项目 npm 包**：Remotion/React/TypeScript/tsx 等由该项目 lockfile 管理。先获得网络/下载及该项目安装授权，再在该项目运行下方命令；不全局安装、不使用 `npx` 临时自动拉包。
2. **系统或可移植工具**：Node/npm、Bash、ffmpeg/ffprobe、现有受支持浏览器，以及 ZIP 交付阶段的 `zip`（Unix/macOS）或 PowerShell `Compress-Archive`（Windows）。先展示缺项、用途、平台、官方/可信来源、版本和客户指定的工具安装路径，再取得对应授权。优先给出平台安装方案或已验证可移植发行版；**不是所有软件都能放进任意文件夹**。需要系统目录/管理员权限的安装必须另行批准，不能默改 macOS、PATH、Homebrew/npm 全局设置。
3. **宿主能力/插件**：imagegen、MCP、素材/语音服务由宿主工具目录和连接状态确认。imagegen **不是 npm 包**；本地脚本不能证明宿主有它，也不应为“补齐插件”擅自安装 MCP、读密钥、登录或收费调用。缺失时报告并选用户素材/原创代码图形等获准替代。

例如客户另选工具目录时，预检只能记录和检查路径：

```bash
bash "$SKILL/scripts/bootstrap-preflight.sh" --mode=new \
  --project-root "$PROJECT_ROOT" \
  --tool-root '/absolute/client-selected/video-tools' --json
```

`--tool-root` **不授权安装**，也不创建目录。项目外工具路径必须明确给出且实际可访问；项目内只允许 `.tools/`，不能占用 `node_modules/`、`public/` 等用途。若同一路径已有工具，先核对可复用项，禁止覆盖升级。下载、校验和解压各有准确目标；没有权限就停在计划，不声称已安装。

### 获准后才执行的项目安装示例

```bash
cd "$PROJECT_ROOT"
npm ci --ignore-scripts --registry=https://registry.npmjs.org \
  --cache "$PROJECT_ROOT/.cache/npm"
```

此命令会访问指定 registry 并写 `node_modules/` 与项目 cache；`npm ci` 会重建已有依赖目录，所以**继续旧项目时也需确认该安装动作**，不能把 resume 当成安装许可。不要设置 `npm --prefix` 到工具目录，不改 `npm config set ... --global`。`--ignore-scripts` 不等于第三方代码绝对可信；仍须遵守当前执行环境对外来代码的审批规则。需要原生 install hook 时单独审查、授权，不能静默取消保护。

scaffold 的 `--install-project` 仅在以上安装动作/落点已经获准时使用；默认不安装，`--skip-install` 保持兼容。缺浏览器时停止预览/渲染并报告；不得默认下载 Chrome。发现现有可用浏览器后，显式传 `REMOTION_BROWSER_EXECUTABLE` 或项目支持的 `--browser-executable`，再实际验证。

完成安装后重新清点，并分别记录安装、typecheck、bundle、渲染的实际结果。只验证了云端不能声称用户电脑也就绪。

## 本地确定性测试

```bash
node --test "$SKILL/scripts/test-workspace-preflight.mjs"
```

测试使用临时夹具，不安装依赖、不调用浏览器/ffmpeg/网络。覆盖空目录、隐藏项、symlink、嵌套项目、未创建父目录、只读 resume、旧版无标记项目字节不变、错误身份拒绝、显式工具路径和安装/force 拒绝；不是恶意并发改目录场景的完整文件系统隔离器。
