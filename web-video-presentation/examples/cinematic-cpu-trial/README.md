> 公开整理候选在本示例目录保留源码和历史记录；[26秒成片已附于 media](../../../media/order-emergent-26s.mp4)，图片二进制未附；下文产物名、哈希及“本次”描述均指原先的历史示范，不是当前候选新验收。需自备合法字体和依赖后另行生成。

# 从噪声到秩序 · ORDER, EMERGENT

**原创、静音、纯本地代码设计试片。不是客户定稿，不是 Remotion 端到端能力证明。**

## 交付

- 单独交付的《从噪声到秩序_26秒_1080p交付版.mp4》（同分辨率/帧率压缩版，不重复嵌入技能包）：26 秒，1920×1080，30 fps，780 帧，H.264 / yuv420p；无音轨。
- `cover.png`：直接由第 720 帧（24.0 秒）渲染的 1920×1080 封面，没有另造不存在的场景。
- `film.py`：可导入、可独立寻帧的 CPU 渲染器；使用下方显式指定输出目录的命令。
- `config.json`：实际 seed、画幅、时间、配色、字体等参数。
- `shot-design.md`：视觉命题与显式节拍。
- `self-review.md`：严苛复盘、真实修改、仍存在的差距。
- `render_timing.json` / `qa.json`：实际渲染耗时与技术检测结果（生成后提供）。

只使用 Python / NumPy / SciPy / Pillow / fontTools / FFmpeg 和本机已安装字体。**没有安装依赖、调用远程服务、下载素材、复制参考视频像素、读取密钥，或使用浏览器渲染。**

## 运行

本次实测 Python 3.12、NumPy 2.3.5、SciPy 1.17.0、Pillow 12.3.0、FFmpeg 7.1.5。`fontTools` 用于检查字体字形覆盖。依赖未锁定为跨平台像素完全一致；所有版本见 `environment.json`。不包含字体二进制，不自动下载字体。

```bash
# 预检并生成单帧。out-dir 必须是新建或空目录。
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python film.py frame \
  --time 24 --out-dir ./my_new_frame

# 完整试片。四进程；具体性能依机器而异。
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python film.py render \
  --width 1920 --height 1080 --fps 30 --duration 26 \
  --workers 4 --out-dir ./my_new_render

# 关键帧
python film.py keyframes --width 1280 --height 720 --out-dir ./my_new_keyframes
```

此特定作品只支持 16:9 画幅和 1–8 字短标题，不冒充任意版式引擎。已有输出或符号链接路径会被拒绝，代码不递归删除文件。`--out` 可指定一个尚不存在的文件；不能与 `--out-dir` 并用。

### 字体

本次使用：

- 中文：`/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc`，collection index 2（简体中文）。
- 英文：`/usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf`。

跨机器请传入合法安装的本地字体，不要复制无授权字体：

```bash
python film.py frame --time 24 --cjk-font /path/to/your-cjk-font.ttf \
  --cjk-font-index 0 --latin-font /path/to/your-latin-font.otf --out-dir ./new_frame
```

缺字体或缺标题所需汉字会明确报错，不以方框字静默交付。外观受替代字体影响。

### Python API

```python
from film import Config, render_frame, model_state

cfg = Config(width=1280, height=720, fps=30, seed=20261027)
image = render_frame(720, cfg)        # PIL RGB Image；24 秒
image.save('new-frame.png')          # API 调用方自行管理写入权限
state = model_state(24.0, cfg)       # 状态时间为 26 秒标准时间轴
layers = render_frame(720, cfg, layers=True)
```

`render_frame` 的有效帧是 `[0, duration*fps)`，越界报错。时间缩放：输出 `frame/fps` 映射到标准 26 秒的全部动作。固定 seed 构建 27,648 个稳定 ID；任意顺序渲染同一帧得到同一结果，不依赖前帧、墙钟、RAF 或随机调用次数。

`layers=True` 提供背景、发光几何、暗核 mask、文字和最终图。**发光层为加色语义，不是已验证 straight-alpha 交付；本轮没有导出或声称验证 ProRes Alpha。**

## 制作边界

- 这是审美与连续动作的独立离线试片，**不是 skill 主流程的 Remotion 工程**，也没有运行 npm workflow / 浏览器 / WebGL。
- 场景有真实 3D 坐标、透视相机、相机推进/环绕、射线与球体的解析深度遮挡；不是物理流体、真实数据、真实算法结果或光线追踪引擎。
- “归序”是视觉隐喻：相干波先经过，同一批粒子聚为光流；三个结构形成；被选中的中间结构先成为共同轨道，其他结构按延迟并入。没有伪造指标、置信度或性能读数。
- 本轮用户要求“先自己产出、挑剔审视”支持自行完成**草稿试片**。没有将自审写成用户验收或正式设计批准。
- 参考视频仅作观察其材质、深度、构图与转场语言之用。成片无其画面、音频、文案、品牌或代码。

## 聊天附件体积适配

原始高码率成片约32.2MB，超过本次聊天附件大小限制。实际发出的1080p交付版经过一次H.264重新编码，尺寸、时长、帧率不变，细粒子细节可能略有压缩损失。源码可重新生成高码率母版；原有qa.json、render_timing.json、final-technical.json指母版，不把它们假称为压缩版检测。压缩版检测与两个文件哈希见总包“本轮试片与检验”。
