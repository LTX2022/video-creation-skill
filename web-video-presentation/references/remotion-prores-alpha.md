# ProRes Alpha 兼容入口

完整规范集中在 [ALPHA-COMPOSITING.md](ALPHA-COMPOSITING.md)，此路径保留供旧项目引用。

```bash
npm run render:alpha:smoke -- --acknowledge-draft
npm run render:video:alpha
```

Smoke/draft 不覆盖正式证据，不代替正式交付。`outputMode=alpha` 交透明 MOV；`both` 交 Alpha + composite 且需要底片。透明根必须隔离场景背景，保留对象的内部表面和阴影。`ffprobe` 为 yuva 不能单独判定通过；必须检测实际透明像素并人工审查合成边缘。
