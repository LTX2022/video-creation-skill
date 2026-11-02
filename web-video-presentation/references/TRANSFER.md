# 跨环境交接

## Skill 包

按 [DELIVERY](../DELIVERY.md) 的 `node scripts/package-skill.ts --out-dir <确认目录>` 生成并用 `--verify` 核验。给接收方版本、包哈希、变更和测试/未测试范围。不要默认 C 盘或某用户桌面，不自动安装个人技能。

### 核心发行目录与组合包分开核验

上面的 `package-skill.ts --verify` 只用于它自己的纯核心输出（主技能目录、`delivery-manifest.json` 和声明的 ZIP）。包含 fix-agent、legacy、样片及 `bundle-manifest.json` 的组合交付使用：

```bash
BUNDLE_ROOT='/absolute/path/to/extracted-combined-release'
node "$BUNDLE_ROOT/web-video-presentation/scripts/verify-bundle.mjs" \
  --root "$BUNDLE_ROOT" --json
```

只读核对完整文件清单/大小/SHA256；拒绝多余或缺失文件、重复/不安全路径、symlink 和非普通文件。不要删掉组合包成员来迁就核心验证器。若另验核心 ZIP 内容，在新的临时目录复制上述核心三项后核验；原包保持不变。组合验证器对内嵌 ZIP 只核验其整文件哈希，不执行或解开旧版本。外层 ZIP 哈希另与交付记录比较；manifest 不是数字签名，不能证明来源可信或软件可用，详细范围见 [DELIVERY](../DELIVERY.md#c-包含主技能fix-agent历史包和样片的组合交付)。

接收方从 `SKILL.md` 开始，按任务模式加载参考；不用先通读所有事故、执行计划、TTS 和主题。保留历史源材料不意味着把它们全部当当前规则。

## 视频项目

带上请求的源代码、lockfile、素材来源/许可和输出证据；不含 API keys、私人配置、未获再分发权的实拍。路径应相对项目；专有素材需要接收方另提供时列缺项。

先检查 Node/npm/Bash、浏览器和 ffmpeg/ffprobe，再 typecheck/build，小范围取帧，最后检查目标模式。旧项目无 outputMode 时按旧 opaque 兼容处理；不静默改尺寸、profile、音色、主题或批准记录。新schema3以outputs[]、contentRevision及逐项renderVariant绑定当前输入；旧schema1/2可读但unbound，不能充当新修订交付证据。旧消费者升级前明确兼容限制。

实拍项目交接要说明源 trim、项目帧原点、fpsPolicy、音轨；Alpha 说明实际源精度、Alpha 解释、黑白边缘确认 hash、尚未测试的宿主。目标软件未打开就不宣称兼容。

安装、全局配置、云登录、外部传输均依据用户的明确授权，不由交接文档自行授权。工具不可用时保留可继续的源与证据，准确指出待完成动作。
