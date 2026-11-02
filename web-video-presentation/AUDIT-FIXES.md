# v3.8.0 审查修复候选 audit-fix.1

基线：Library v14；原完整ZIP SHA256 `6af3eba7139ed5ca3349ef4ff504cc2a5e80e1e4be1dec129b5a3104f8a5dd46`。仅隔离副本修改，未更新正式安装，未上传。

1. TTS shell 在 provider 加载及输出副作用前要求明确一致音频选择。缺 state、空对象、缺 flag、false、非法值均拒绝；明确 legacy true 保留。`--force` 与 `--list-voices` 不绕过。不得为通过门禁伪造授权，详见 TTS-ROUTING。
2. Cinema batch 在路径 resolve 前检查原始输入，拒绝异平台盘符、UNC/device、控制字符及遍历；既有 symlink 与目标边界仍生效。
3. 通用 clock 可表达 gap；生产 full/alpha/composite 同章 gap 明确拒绝，使用显式无声 hold step，见 RENDERING。无 gap 旧项目与跨章有意空白不变。
4. 生产总长由全部 step 最大结束帧得出，输入无需排序、不修改源数组。
5. 整数 timing/索引要求安全整数，frame/窗口/运算结果限定 `abs(value) <= Number.MAX_SAFE_INTEGER`，fractional frame 仍可用；越界抛 RangeError。action count 限制为1至100000防止不受控分配。pose 仍支持全部有限数，对向极值使用稳定凸组合、精确端点，不产生 NaN/Infinity。

验证：纯模型/合约、mock-only TTS、真实 skip-install 脚手架及完整包校验。未安装依赖、未调用真实provider、未运行浏览器；不宣称 Remotion typecheck/build、真实帧视觉、编码或用户验收通过。60风格资源保持字节一致。
