# Optional public feedback / 可选公开反馈

This is a separate opt-in route, not a prerequisite for diagnosis, learning, or video delivery. Never invoke it automatically after a failure or task end. Offer it briefly when relevant; if declined, continue without reminders. A request for a local draft does not authorize publication.

这是独立的可选入口，不是诊断、学习或视频交付的前提。不要在失败或任务结束时自动运行；相关时简短提示，用户不需要就继续，不反复打扰。授权生成本地草稿不等于授权公开发布。

## Local preview

Python 3 standard library only; no package installation. From the extracted repository root:

```sh
python3 fix-agent/scripts/feedback_draft.py --category bug --adapter remotion
```

By default every diagnostic value is unknown. After the user authorizes reading one existing project summary, select it explicitly:

```sh
python3 fix-agent/scripts/feedback_draft.py --project-root /approved/project --summary output/review/selected-run/summary.json --category bug --adapter remotion --video-version 3.2.1 --fix-version 1.8.1
```

Use the actual verified versions, not the example numbers. The command prints a preview; it does not save a file, open a browser, call an API, create an issue, scan the project, or read personal memory. To save locally, ask the user for an approved private destination outside the public repository. Do not paste the command's private project path into GitHub. Safe summary reading requires POSIX directory/file flags; unsupported platforms can still generate a blank draft without summary arguments.

默认只打印草稿，不保存文件、打开浏览器、请求 API、创建 Issue、扫描项目或读取私人记忆。需要保存时先确认仓库以外的私人目录；不要把命令中的私有项目路径贴到 GitHub。不支持安全读取的平台仍可生成不带 summary 的空白草稿。

## What is included and excluded

The tool constructs a new object using only numeric release versions, fixed category/adapter/status/output-mode choices, a synthetic-data flag, and bounded integer attempt counts. Extra JSON fields and arbitrary text are dropped, not redacted and forwarded. It reads only the selected JSON file (maximum 1 MiB), rejects symlinks and traversal, and never follows its evidence paths. Unsupported or unsafe files fail closed; you can omit the summary and keep unknowns.

No media, logs, prompts, raw user feedback, private paths, run IDs, hashes, credentials, environment variables, project names, or personal memory are included by default. Unknown counts are not zero. Counts cover recorded attempts only; a completed declaration is not acceptance. Input authenticity, coverage, root cause, and actual quality are not verified.

No scanner can guarantee anonymity, and allowlisting cannot guarantee it either: a combination of otherwise ordinary values, your manual additions, or your GitHub identity may identify you. The tool is not a secret scanner. Review the exact text and anything added later; do not share sensitive material.

白名单与扫描器均不能保证匿名：普通字段的组合、你手动补充的内容或 GitHub 身份仍可能识别你。工具不是秘密扫描器，也不认证证据或诊断根因。未知不等于零或通过；请逐项检查最终内容。

## Explicit manual submission

1. Review the local preview, omit any fields you do not want public, and add only a minimal invented reproduction if useful.
2. Open the [blank public feedback form](https://github.com/LTX2022/video-creation-skill/issues/new?template=fix-agent-feedback.yml). The link contains no diagnostic payload; opening it does not publish the draft.
3. Paste only your reviewed content, inspect the final form and its public-sharing checkbox, then choose whether to click Submit. GitHub sign-in may be required. Canceling is always fine.

The agent must not submit, upload an attachment, prefill a URL with diagnostics, or treat the form checkbox as user authorization. This first release deliberately has no submit command, telemetry, auto-sharing, recurring monitoring, or automatic core-skill edits.

用户检查本地草稿后，自行打开[公开反馈表单](https://github.com/LTX2022/video-creation-skill/issues/new?template=fix-agent-feedback.yml)，只粘贴愿意公开的内容，检查最终表单，再明确点击提交。可以随时取消。Agent 不代为提交、不上传附件、不把诊断信息塞入链接，也不把勾选框当作会话授权。
