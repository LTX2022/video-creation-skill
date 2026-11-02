# TTS 路由与声音选择

只在 `audioSource=tts`、确实需要合成语音时加载。已有逐 step 录音用 `audioSource=provided` + `audioRequested=true`，按 [AUDIO](AUDIO.md) 绑定实际来源、授权、文件哈希和实测时序，不要求 provider/voice，也不伪造 `tts-choice`。无声用 `audioSource=none` + `audioRequested=false`。未填写 source 的旧项目保留 audioRequested=true → tts 的语义，不能把 supplied 文件仅放进目录就当作 TTS 缓存。纯透明素材允许无语音；不能为满足旧 profile 默认值而强行调用付费 TTS。

runner 在加载 provider 前离线检查 source 与音频请求：provided/none、矛盾值、缺失或不可读的 `project-state.json`、空对象、缺失/非法 `audioRequested` 都会拒绝合成、列声音和 `--force`，且不会创建 output、记录事件或自动改成 tts。旧项目缺失 source 时，仅明确 `audioRequested=true` 保持兼容；显式 `audioSource=tts` 仍须同时 `audioRequested=true`。

**旧项目迁移：** 若 runner 因缺少状态而阻断，不要为了通过命令自动补 `true`。先核对真实用户授权与项目需求：无声项目保留/补 `audioSource=none` + `audioRequested=false`，已有录音用 `provided` + `true`；只有用户确已选择 TTS，才记录 `tts` + `true` 及所选 provider/voice。`--force` 和 `--list-voices` 不能绕过此边界。

## 选择和复用

- 现有 `auto` 首选 MiniMax MMX。不可用时说明缺项，由用户选择备选；不要擅自花另一服务的额度。
- `voicebox` 适配器保留，仅用户显式选择时用，不进入默认探测，不未经同意连接某个人的局域网地址。
- 新的 TTS 项目需要明确 provider + 具体 voice/profile。用户已选择过则直接复用，不能每章重新列声音；该要求不适用于 provided 录音。
- 列表不支持时查当前官方声音目录或请用户给 ID；声音 ID/价格/能力可能变化，不把旧示例当实时事实。
- 只有用户明确接受 provider 默认声音才使用 `--allow-provider-default`。

```bash
npm run synthesize-audio -- --provider=minimax --list-voices
npm run synthesize-audio -- --provider=openai --list-voices
npm run synthesize-audio -- --provider=<已确认provider> --voice="<已确认voice>"
# 仅明确接受默认声音时：
npm run synthesize-audio -- --provider=<已确认provider> --allow-provider-default
```

## 项目偏好

Agent 将确认记录为 `tts-choice`，并可保存：

```json
{
  "ttsPreferences": {
    "provider": "minimax",
    "voice": "<已确认ID>",
    "rejectedProviders": [],
    "confirmedAt": "<实际时间>",
    "userQuote": "<真实原话>"
  }
}
```

**当前 runner 不保证自动读取该偏好对象**；Agent 读取后显式传 CLI/env，不探测被拒绝后端。用户改声音只更新声音；改后端时再确认该后端声音。偏好不擅自跨项目推广，更不能把历史某人的选择写成所有人的永久偏好。

## 备选与自定义

OpenAI 为内置备选；Azure、Google、ElevenLabs、Edge TTS、其它已授权服务可按 [provider adapter 契约](../templates/scripts/tts-providers/README.md) 接入。按语言、风格、预算、隐私和用户已有账户选择，不给未经测试的“最高质量/最广/永远免费”排名。

Voicebox 手动配置用用户明确提供的 endpoint/voice；适配器支持 MCP 或其 REST 路径，具体变量看 `templates/scripts/tts-providers/voicebox.sh`。不能把包中历史默认地址当用户授权或探测目标。

密钥仅使用授权环境/凭据机制，不写到 skill、源文件或交付物；全局 CLI 安装、登录、外部文本上传及收费调用分别需要对应授权。失败保留已成功段与失败清单，修复后只重试受影响段。
