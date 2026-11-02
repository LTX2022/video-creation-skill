# 可选：成片锚点残差诊断
调用：python3 scripts/promo-beat-check.py /绝对或相对路径/measurements.json
只读JSON，报告写stdout；不读音视频、不写项目、不联网、不调用provider。退出0代表输入合法且残差在项目自定阈值内；退出1代表残差超阈值；退出2代表输入无效。无样本不能通过。

输入 schema=1；fps 为正数（可用30000/1001对应数值），toleranceFrames非负且须由项目决定。
anchors 每项包含唯一 id、visualFrame（来自现有timing导出的整数帧）、audioPeakSeconds（实际编码成片中实测的绝对秒时间）。
误差 = audioPeakSeconds * fps - visualFrame；正值表示音频峰值晚于画面，负值为提前。
measurementNote必须写测量来源和方法；工具只检查非空，不能认证测量真实性。sourceBeatSeconds如需保留应存原研究记录，本诊断不修改它。
同向偏移、平均误差与最大误差只是诊断，不自动写入补偿常数。应记录渲染器/编码器/音源/设置/日期并在修改后重新测量。听觉质感、响度、削波、配乐许可与最终用户验收需另外检查。

示例（合成数值，不是样片实测）：
```json
{"schema":1,"fps":30,"toleranceFrames":2,"measurementNote":"合成单元测试；非真实试听","anchors":[{"id":"landing","visualFrame":60,"audioPeakSeconds":2.02}]}
```
