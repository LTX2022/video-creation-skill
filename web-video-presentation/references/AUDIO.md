# 音频、时序与字幕

仅在请求配音/声音的项目读取。先区分 `project-state.json` 的 `audioSource: "tts" | "provided" | "none"`；`tts`/`provided` 要求 `audioRequested: true`，`none` 要求 false，矛盾值阻断。旧项目未写 `audioSource` 时保持原语义：audioRequested=true → tts，否则 none。纯 Alpha/无声图形可不调用 TTS；显式帧时序见 [RENDERING](RENDERING.md)。

## 文件与真相源

`src/chapters/<NN>-<id>/narrations.ts` 的每项对应一个 step；有声文本来自已确认 `script.md`，不是 outline 的短节选。逐句核对覆盖与关键条件，长度相等不等于内容一致。

音频为 `public/audio/<chapter-id>/<N>.mp3`，N 从 1 开始；现有时序读取也支持 `.wav`、`.m4a`、`.aac`、`.ogg` 和 01/001 补零文件名。同一个 step 只放一个候选，避免按搜索顺序误选。`audio-segments.json` 按 registry 顺序抽取。TTS 的 `output/tts-manifest.json` 记录文本/音色/provider 和音频哈希；复用前验证当前输入，不能凭文件存在就跳过。

## TTS 执行（audioSource=tts）

```bash
npm run extract-narrations
# 新选择时先列声音；已有明确选择无需重问
npm run synthesize-audio -- --provider=minimax --list-voices
npm run synthesize-audio -- --provider=minimax --voice="<已确认voice/profile>"
npm run build-timing
npm run validate-subtitles
# 要交字幕时：
npm run export-subtitles
```

用户已确认稿件无需再次要求阅读整个 JSON；Agent 应核对抽取文本，只有切分/内容发生实质变化时展示差异。声音/provider 未确认时按 [TTS-ROUTING](TTS-ROUTING.md)。失败不能静默转付费云服务。

runner 逐 step 合成，保持索引。复用先核文本/provider/voice/model/有效参数/format/adapter与音频hash、实际probe；schema2元数据已知且匹配才命中。旧/失效/未知缓存不自动重合成，有旧文件时先停；`--force`沿用全段重合成语义，只有用户已授权该范围才执行，不把它当局部免费重试。外部提供旁白需实际文件/时长/来源，不冒用TTS provenance。OpenAI按已解析请求复用；MMX/Voicebox隐式model/参数未知时不自动命中，已批准音频仍可作素材。远端同名alias变化不可保证检测，可用非秘密`PRESENTATION_TTS_VOICE_REVISION` / `PRESENTATION_TTS_CACHE_REVISION`显式失效或授权--force。

## 用户提供的逐 step 旁白（audioSource=provided）

已有录音且使用权限明确时，直接沿用实际授权，不重复询问 provider/voice，也不记录虚假的 `tts-choice` 或 `tts-manifest`。只在授权范围不明确时补问。把已授权文件放入上述项目内路径；`narrations.ts`/`script.md` 必须准确对应录音内容。此路径不自动转写、切分任意长录音、分离原视频声音或做词级强制对齐。只有整段录音时，应先确定获准的切分与逐段文稿，不能给每个 step 指向同一长文件冒充完成。

在项目根建立 `provided-audio-manifest.json`（以下为结构示例，占位值不能交付）：

```json
{
  "schema": 1,
  "source": "provided",
  "authorization": {
    "kind": "agent-transcribed",
    "userQuote": "<已有授权的真实原话>",
    "reference": null,
    "declaration": "<说明原话来自哪里，以及获准使用这些录音的范围>"
  },
  "items": [{
    "chapter": "intro",
    "step": 1,
    "audio": "public/audio/intro/1.wav",
    "audioSha256": "<实际音频文件的64位大写SHA256>",
    "textHash": "<对应narrations原文UTF-8的64位大写SHA256>",
    "source": "<该段录音的实际来源>"
  }]
}
```

`authorization.kind` 为 `agent-transcribed` 或 `user-supplied`；`reference` 可为实际消息/文件引用，无可用引用时明确 null。它是本地来源声明，**不是身份认证或许可证证明**；`synthetic` 测试来源不能通过生产校验。每个非空旁白 step 一项，空白无旁白 step 不放音频；路径必须等于时序实际选中的文件。清单绑定到项目计划、镜头设计决策和输入指纹，内容改变会使旧证据失效。

```bash
# 不运行 synthesize-audio；无需 provider/voice
npm run validate-narrations
npm run build-timing
npm run validate-subtitles
npm run export-subtitles   # 需要交字幕时
# 后续照常预检、试听/字幕预览、渲染、validate:delivery
```

`validate:delivery` 对 provided 路径核对文稿/文件哈希、真实本地音频流与 ffprobe 时长、时序是否过期/裁切；缺文件、符号链接/越界路径、无法探测及估时均不能过关。仅不适用的 TTS provider/voice 门禁被跳过；字幕、试听、素材/视觉审阅、最终媒体与人工确认不因此豁免。文稿哈希只能证明输入一致，不能证明录音实际说了什么，仍须试听核对。

## 时间与字幕

`build-timing` 生成 `timing-manifest.json` 与 render timing，Studio、音频、字幕和渲染读同一源。正式有声项目使用 ffprobe 的实际时长；音频缺失只能明确草稿估时，不能作为 final。

字幕按句级 cue 推进，画面 step 可容纳多句，不把第一句钉在全段。中英文按词/视觉宽度换行，标点不独立开行；通常最多两行，实际手机尺寸看可读性。默认字幕与主题正文区分，可按用户样式覆盖；字幕不挡对象/证据，也不要求屏幕逐字重复。

听查：文本/读音/停顿、音量、段间爆音/空白、尾音裁切、与关键动作对齐。TTS 调用返回成功不代表音频正确；文件 probe 与试听均需要。

## Provider 扩展

内置 `minimax`、`openai`、手动 `voicebox`。auto 首选 MMX，不自动接连试收费后端。自定义 provider 仍是 `<name>.sh`：`tts_synthesize(text,out_path,voice)` 必需，`tts_check` / `tts_install_help`可选；`tts_cache_descriptor <voice>`可选且必须纯离线，缺失/未知配置不能假造缓存命中；按 [provider 契约](../templates/scripts/tts-providers/README.md) 适配，并对当前官方接口验证。该模板不是云服务许可或安装授权。
