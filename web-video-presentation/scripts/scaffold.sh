#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# scaffold.sh —— 一键脚手架，创建一个 Remotion-first video 项目。
#
# 用法：
#   bash scripts/scaffold.sh <target-dir> --profile=douyin|bilibili|custom [--format=landscape|portrait] [--theme=<id>] [--fps=60] [--subtitles=true|false] [--output-mode=opaque|alpha|composite|both] [--install-project|--skip-install]
#   bash scripts/scaffold.sh --list-themes
#
# 例子：
#   bash <path-to-web-video-presentation>/scripts/scaffold.sh ./presentation --profile=bilibili
#   bash <path-to-web-video-presentation>/scripts/scaffold.sh ./talk --profile=custom --theme=paper-press --format=landscape
#   bash <path-to-web-video-presentation>/scripts/scaffold.sh ./short --profile=douyin
#   bash <path-to-web-video-presentation>/scripts/scaffold.sh --list-themes
#
# 跑完后，看 SKILL.md "Phase 2.4 实现单章" + references/CHAPTER-CRAFT.md
# 了解每章怎么写。卡壳时翻 references/EXAMPLES/ 找完整章节 anchor。
#
# 只覆盖 tokens.css 只改变配色，不切换 preset 构图/运动。
# 新项目通过 --theme 同时选择 tokens + src/config/themePreset.ts。
# 已有自定义项目不得未经审阅覆盖章节；切换后需重新验证画面与交付证据。
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATES="$SKILL_DIR/templates"
THEMES_DIR="$SKILL_DIR/themes"
DEFAULT_THEME="midnight-press"
DEFAULT_FPS="60"

list_themes() {
  echo "可用主题（来自 ${THEMES_DIR}）:"
  echo
  for dir in "$THEMES_DIR"/*/; do
    [[ -d "$dir" ]] || continue
    local meta="$dir/theme.json"
    [[ -f "$meta" ]] || continue
    # 没有 jq，简单 grep + sed 提字段
    local id name desc
    id=$(grep -E '"id"' "$meta" | head -n1 | sed -E 's/.*"id":[[:space:]]*"([^"]+)".*/\1/')
    name=$(grep -E '"nameZh"' "$meta" | head -n1 | sed -E 's/.*"nameZh":[[:space:]]*"([^"]+)".*/\1/')
    desc=$(grep -E '"descriptionZh"' "$meta" | head -n1 | sed -E 's/.*"descriptionZh":[[:space:]]*"([^"]+)".*/\1/')
    printf "  • %-18s %s
      %s

" "$id" "$name" "$desc"
  done
  echo "用 --theme=<id> 选定一个。默认主题：${DEFAULT_THEME}。新建项目必须先选 --profile=douyin|bilibili|custom；custom 仍需显式传 --format=landscape 或 --format=portrait。"
}

# ── 解析参数 ──
TARGET=""
THEME="$DEFAULT_THEME"
THEME_EXPLICIT="false"
FORMAT=""
VIDEO_FPS="$DEFAULT_FPS"
PROFILE=""
SUBTITLES_REQUESTED=""
SUBTITLES_EXPLICIT="false"
OUTPUT_MODE="opaque"
SKIP_INSTALL="true"
INSTALL_CHOICE=""
for arg in "$@"; do
  case "$arg" in
    --help|-h)
      cat <<HELP
Usage: scaffold.sh <customer-confirmed-empty-project-root> --profile=douyin|bilibili|custom [options]
  --format=landscape|portrait  Required for custom; profile defaults otherwise.
  --theme=<id> --fps=60 --subtitles=true|false --output-mode=opaque|alpha|composite|both
  --install-project           Explicit authorized npm ci; dependencies/cache stay in this project.
  --skip-install              Default. No dependency or browser installation.
  --list-themes               List themes without creating a project.
New projects require an explicit empty standalone directory. Existing projects are never overwritten.
Resume check only: node scripts/workspace-preflight.mjs --mode=resume --project-root=<existing-root>
HELP
      exit 0 ;;
    --output-mode=*) OUTPUT_MODE="${arg#--output-mode=}" ;;
    --alpha) OUTPUT_MODE="alpha" ;;
    --skip-install)
      if [[ "$INSTALL_CHOICE" == "install" ]]; then echo "x conflicting installation options" >&2; exit 1; fi
      SKIP_INSTALL="true"; INSTALL_CHOICE="skip" ;;
    --install-project)
      if [[ "$INSTALL_CHOICE" == "skip" ]]; then echo "x conflicting installation options" >&2; exit 1; fi
      SKIP_INSTALL="false"; INSTALL_CHOICE="install" ;;
    --list-themes)
      list_themes
      exit 0
      ;;
    --theme=*)
      THEME="${arg#--theme=}"
      THEME_EXPLICIT="true"
      ;;
    --format=*)
      FORMAT="${arg#--format=}"
      ;;
    --profile=*)
      PROFILE="${arg#--profile=}"
      ;;
    --subtitles=*)
      SUBTITLES_REQUESTED="${arg#--subtitles=}"
      SUBTITLES_EXPLICIT="true"
      ;;
    --fps=*)
      VIDEO_FPS="${arg#--fps=}"
      ;;
    --*)
      echo "✗ 未知参数: $arg" >&2
      exit 1
      ;;
    *)
      if [[ -z "$TARGET" ]]; then TARGET="$arg"; else echo "x only one explicit project directory is accepted" >&2; exit 1; fi
      ;;
  esac
done

if [[ -z "$TARGET" ]]; then
  echo "x 需要客户确认的独立空项目目录：scaffold.sh <project-root> --profile=..." >&2
  exit 1
fi
if [[ -z "$PROFILE" ]]; then
  echo "✗ 必须先选择视频类型：--profile=douyin、--profile=bilibili 或 --profile=custom。" >&2
  echo "  先问用户：1 抖音/竖屏短视频，2 B站/教程/长视频，3 其它。" >&2
  exit 1
fi

case "$PROFILE" in
  douyin)
    FORMAT="${FORMAT:-portrait}"
    SUBTITLES_REQUESTED="${SUBTITLES_REQUESTED:-true}"
    AUDIO_REQUESTED="true"
    FINAL_RENDER_REQUIRED="true"
    COVER_REQUIRED="true"
    TARGET_DURATION_SEC="30-60"
    ;;
  douyin-laon)
    # 老七聊AI 风格：AI工具/科技干货，9段式，5.61字/秒（20样本实测），dark-tech-glow 主题
    FORMAT="${FORMAT:-portrait}"
    SUBTITLES_REQUESTED="${SUBTITLES_REQUESTED:-true}"
    AUDIO_REQUESTED="true"
    FINAL_RENDER_REQUIRED="true"
    COVER_REQUIRED="true"
    TARGET_DURATION_SEC="150"
    if [[ "$THEME_EXPLICIT" != "true" ]]; then THEME="dark-tech-glow"; fi
    ;;
  douyin-skill)
    # 每天一个必备skill 风格：办公技巧/教程，7段式，5.2字/秒（14样本实测），practical-skill 主题
    FORMAT="${FORMAT:-portrait}"
    SUBTITLES_REQUESTED="${SUBTITLES_REQUESTED:-true}"
    AUDIO_REQUESTED="true"
    FINAL_RENDER_REQUIRED="true"
    COVER_REQUIRED="true"
    TARGET_DURATION_SEC="60"
    if [[ "$THEME_EXPLICIT" != "true" ]]; then THEME="practical-skill"; fi
    ;;
  bilibili)
    FORMAT="${FORMAT:-landscape}"
    SUBTITLES_REQUESTED="${SUBTITLES_REQUESTED:-false}"
    AUDIO_REQUESTED="true"
    FINAL_RENDER_REQUIRED="true"
    COVER_REQUIRED="false"
    TARGET_DURATION_SEC="180-720"
    ;;
  custom)
    AUDIO_REQUESTED="false"
    FINAL_RENDER_REQUIRED="true"
    COVER_REQUIRED="false"
    TARGET_DURATION_SEC=""
    SUBTITLES_REQUESTED="${SUBTITLES_REQUESTED:-false}"
    if [[ -z "$FORMAT" ]]; then
      echo "✗ custom profile 必须显式选择视频画幅：--format=landscape 或 --format=portrait。" >&2
      exit 1
    fi
    ;;
  *)
    echo "✗ 未知 profile '${PROFILE}'。可用：douyin, bilibili, custom" >&2
    exit 1
    ;;
esac

case "$OUTPUT_MODE" in opaque|alpha|composite|both) ;; *) echo "x unsupported output mode: $OUTPUT_MODE" >&2; exit 1 ;; esac
if [[ "$OUTPUT_MODE" == "alpha" ]]; then
  if [[ "$SUBTITLES_EXPLICIT" == "true" && "$SUBTITLES_REQUESTED" == "true" ]]; then echo "x alpha-only exports silent graphics; use --subtitles=false or composite/both." >&2; exit 1; fi
  AUDIO_REQUESTED="false"
  SUBTITLES_REQUESTED="false"
  COVER_REQUIRED="false"
fi
if [[ ! "$SUBTITLES_REQUESTED" =~ ^(true|false)$ ]]; then echo "x subtitles must be true or false" >&2; exit 1; fi

if [[ ! "$VIDEO_FPS" =~ ^[0-9]+$ || "$VIDEO_FPS" -lt 24 || "$VIDEO_FPS" -gt 120 ]]; then
  echo "x unsupported fps '${VIDEO_FPS}'. Use an integer from 24 to 120; 60 is recommended." >&2
  exit 1
fi

if command -v cygpath >/dev/null 2>&1; then
  TARGET="$(cygpath -u "$TARGET" 2>/dev/null || printf "%s" "$TARGET")"
fi
if ! command -v node >/dev/null; then
  echo "x Node.js 20.6+ is required. Confirm a tool directory before installing missing tools." >&2
  exit 1
fi
if ! node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 20 || (major === 20 && minor >= 6) ? 0 : 1)'; then
  echo "x Node.js 20.6+ is required for the local node --import tsx runner." >&2
  exit 1
fi

# Read-only guard runs before any mkdir/copy/install; never infer cwd as the project.
TARGET=$(node "$SKILL_DIR/scripts/workspace-preflight.mjs" --mode=new --project-root="$TARGET" --path-only)
TARGET_PARENT="$(dirname "$TARGET")"
TARGET_NAME="$(basename "$TARGET")"
THEME_DIR="$THEMES_DIR/$THEME"
THEME_TOKENS="$THEME_DIR/tokens.css"

case "$FORMAT" in
  landscape)
    VIDEO_WIDTH=1920
    VIDEO_HEIGHT=1080
    VIDEO_ASPECT="16:9"
    VIDEO_LABEL="Landscape 16:9"
    ;;
  portrait)
    VIDEO_WIDTH=1080
    VIDEO_HEIGHT=1920
    VIDEO_ASPECT="9:16"
    VIDEO_LABEL="Portrait 9:16"
    ;;
  *)
    echo "✗ 未知画幅 '${FORMAT}'。可用：landscape, portrait" >&2
    exit 1
    ;;
esac

if [[ ! -d "$THEME_DIR" || ! -f "$THEME_TOKENS" ]]; then
  echo "✗ 找不到主题 '${THEME}'。可用主题：" >&2
  echo >&2
  for dir in "$THEMES_DIR"/*/; do
    [[ -d "$dir" ]] || continue
    echo "    • $(basename "$dir")" >&2
  done
  exit 1
fi

if [[ -d "$TARGET" && -n "$(ls -A "$TARGET" 2>/dev/null || true)" ]]; then
  echo "✗ 目标目录 '${TARGET}' 已存在且非空，已中止。" >&2
  exit 1
fi

check_nested_project() {
  local dir
  dir="$TARGET_PARENT"
  while [[ -n "$dir" && "$dir" != "/" ]]; do
    if [[ -f "$dir/.web-video-presentation-project.json" || -f "$dir/project-state.json" ]]; then
      echo "✗ 目标目录位于已有 web-video-presentation 项目内：$dir" >&2
      echo "  请在新的空项目目录中创建 presentation，避免嵌套项目和状态文件混乱。" >&2
      exit 1
    fi
    dir="$(dirname "$dir")"
  done
}

check_nested_project

if [[ "$SKIP_INSTALL" != "true" ]] && ! command -v npm >/dev/null; then
  echo "✗ 需要 npm，但在 PATH 里没找到。" >&2
  exit 1
fi


echo "▸ 在 $TARGET 创建 Remotion-first React + TS 视频项目"
echo "▸ 使用主题：$THEME"
echo "▸ 使用视频类型：$PROFILE"
echo "▸ 使用画幅：$VIDEO_LABEL (${VIDEO_WIDTH}×${VIDEO_HEIGHT})"

# Recheck immediately before writes; creating the skeleton never resumes/overwrites a project.
TARGET=$(node "$SKILL_DIR/scripts/workspace-preflight.mjs" --mode=new --project-root="$TARGET" --path-only)
mkdir -p "$TARGET"

cd "$TARGET"

echo "▸ 写入 Remotion 视频骨架"

# 把脚手架文件拷到项目根
mkdir -p \
  src/styles src/components src/config src/registry src/video \
  src/chapters/01-example \
  public scripts output

cp "$TEMPLATES/src/config/videoFormat.ts" src/config/videoFormat.ts
cp "$TEMPLATES/src/config/themePreset.ts" src/config/themePreset.ts
THEME="$THEME" node -e 'const fs=require("fs"); const p="src/config/themePreset.ts"; fs.writeFileSync(p, fs.readFileSync(p,"utf8").replaceAll("__THEME_ID__", process.env.THEME));'

TARGET_NAME="$TARGET_NAME" node -e '
const fs = require("fs");
const packageJson = {
  name: process.env.TARGET_NAME,
  version: "0.1.0",
  private: true,
  type: "module",
  scripts: {
    "dev": "npm run render:studio",
    "preview": "npm run render:studio",
    "build": "npm run render:bundle",
    "render:bundle": "npm run render:timing && remotion bundle src/video/index.ts --log=warn",
    "render:studio": "npm run render:timing && node scripts/run-studio.cjs",
    "render:alpha:smoke": "npm run render:timing && node --import tsx scripts/render-alpha-smoke.ts",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test:presets": "node --import tsx --test src/video/presets/model.test.ts",
    "test:reference-styles": "node --import tsx --test src/video/reference-styles/particle.test.tsx src/video/reference-styles/material-type.test.tsx src/video/reference-styles/rain.test.tsx",
    "typecheck:watch": "tsc -p tsconfig.json --noEmit --watch"
  },
  dependencies: {
    "@remotion/bundler": "4.0.539",
    "@remotion/cli": "4.0.539",
    "@remotion/lottie": "4.0.539",
    "@remotion/renderer": "4.0.539",
    "animejs": "^3.2.2",
    "lottie-web": "^5.13.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "remotion": "4.0.539"
  },
  devDependencies: {
    "@types/animejs": "^3.1.12",
    "@types/node": "^24.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tsx": "^4.20.0",
    "typescript": "^5.9.0"
  }
};
const tsconfig = {
  compilerOptions: {
    target: "ES2022",
    useDefineForClassFields: true,
    lib: ["ES2022", "DOM", "DOM.Iterable"],
    allowJs: false,
    skipLibCheck: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: true,
    forceConsistentCasingInFileNames: true,
    module: "ESNext",
    moduleResolution: "Bundler",
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    jsx: "react-jsx",
    types: ["node"]
  },
  include: ["src", "scripts"]
};
fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2) + "\n");
fs.writeFileSync("tsconfig.json", JSON.stringify(tsconfig, null, 2) + "\n");
'

cp "$TEMPLATES/package-lock.json" package-lock.json
TARGET_NAME="$TARGET_NAME" node -e '
const fs = require("fs"); const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
lock.name = process.env.TARGET_NAME; lock.packages[""].name = process.env.TARGET_NAME;
fs.writeFileSync("package-lock.json", JSON.stringify(lock, null, 2) + "\n");
'

VIDEO_FORMAT_ID="$FORMAT" \
VIDEO_FORMAT_LABEL="$VIDEO_LABEL" \
VIDEO_FORMAT_ASPECT="$VIDEO_ASPECT" \
VIDEO_WIDTH="$VIDEO_WIDTH" \
VIDEO_HEIGHT="$VIDEO_HEIGHT" \
VIDEO_FPS="$VIDEO_FPS" \
node -e '
  const fs = require("fs");
  const p = "src/config/videoFormat.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s
    .replaceAll("__VIDEO_FORMAT_ID__", process.env.VIDEO_FORMAT_ID)
    .replaceAll("__VIDEO_FORMAT_LABEL__", process.env.VIDEO_FORMAT_LABEL)
    .replaceAll("__VIDEO_FORMAT_ASPECT__", process.env.VIDEO_FORMAT_ASPECT)
    .replaceAll("__VIDEO_WIDTH__", process.env.VIDEO_WIDTH)
    .replaceAll("__VIDEO_HEIGHT__", process.env.VIDEO_HEIGHT)
    .replaceAll("__VIDEO_FPS__", process.env.VIDEO_FPS);
  fs.writeFileSync(p, s);
'

# tokens.css 来自所选主题
cp "$THEME_TOKENS"                          src/styles/tokens.css
cp "$TEMPLATES/src/styles/base.css"         src/styles/base.css
cp "$TEMPLATES/src/styles/animations.css"   src/styles/animations.css
cp "$TEMPLATES/src/styles/fonts.css"        src/styles/fonts.css
cp "$TEMPLATES/src/styles/fonts.remote.css" src/styles/fonts.remote.css

cp "$TEMPLATES/src/components/MaskReveal.tsx"     src/components/MaskReveal.tsx
cp "$TEMPLATES/src/components/Subtitle.tsx"       src/components/Subtitle.tsx
cp "$TEMPLATES/src/components/Subtitle.css"       src/components/Subtitle.css
cp "$TEMPLATES/src/components/subtitleTiming.ts"  src/components/subtitleTiming.ts
cp "$TEMPLATES/src/components/FrameCanvas.tsx"    src/components/FrameCanvas.tsx
cp "$TEMPLATES/src/components/CanvasScenePlayer.tsx" src/components/CanvasScenePlayer.tsx
cp "$TEMPLATES/src/components/CardArrayFlow.tsx" src/components/CardArrayFlow.tsx
cp "$TEMPLATES/src/components/TransparentFix.tsx" src/components/TransparentFix.tsx

cp "$TEMPLATES/src/registry/types.ts"    src/registry/types.ts
cp "$TEMPLATES/src/registry/chapters.ts" src/registry/chapters.ts

cp "$TEMPLATES/src/video/index.ts"                  src/video/index.ts
cp "$TEMPLATES/src/video/preset-probe-index.ts"      src/video/preset-probe-index.ts
cp "$TEMPLATES/src/video/motion.ts"                 src/video/motion.ts
cp -R "$TEMPLATES/src/video/presets" src/video/presets
cp -R "$TEMPLATES/src/video/reference-styles" src/video/reference-styles
cp -R "$TEMPLATES/src/video/mechanisms" src/video/mechanisms
cp "$TEMPLATES/src/video/mechanism-probe-index.ts" src/video/mechanism-probe-index.ts
cp "$TEMPLATES/src/video/mechanism-probe-root.tsx" src/video/mechanism-probe-root.tsx
mkdir -p examples
cp "$TEMPLATES/examples/motion-direction.example.json" examples/motion-direction.example.json
cp "$TEMPLATES/scripts/check-motion-direction.mjs" scripts/check-motion-direction.mjs
cp "$TEMPLATES/scripts/check-batch-input.mjs" scripts/check-batch-input.mjs
cp "$TEMPLATES/scripts/test-batch-input.mjs" scripts/test-batch-input.mjs
cp "$TEMPLATES/scripts/test-motion-direction.mjs" scripts/test-motion-direction.mjs
cp "$TEMPLATES/src/video/continuity-clock.ts" src/video/continuity-clock.ts
cp "$TEMPLATES/src/video/render-schedule.ts" src/video/render-schedule.ts
cp "$TEMPLATES/src/video/render-schedule.test.ts" src/video/render-schedule.test.ts
cp "$TEMPLATES/src/video/object-track.ts" src/video/object-track.ts
cp "$TEMPLATES/src/video/object-track.test.ts" src/video/object-track.test.ts
cp "$TEMPLATES/src/video/temporal-sampling.ts" src/video/temporal-sampling.ts
cp "$TEMPLATES/src/video/continuity-clock.test.ts" src/video/continuity-clock.test.ts
mkdir -p src/examples
cp -R "$TEMPLATES/src/examples/object-handoff" src/examples/
cp -R "$TEMPLATES/src/examples/mechanism-demo" src/examples/
cp -R "$TEMPLATES/src/examples/flow-continuity" src/examples/
cp "$TEMPLATES/src/video/RemotionRoot.tsx"           src/video/RemotionRoot.tsx
cp "$TEMPLATES/src/video/CoverRoot.tsx"              src/video/CoverRoot.tsx
cp "$TEMPLATES/src/video/CoverDesign.tsx"            src/video/CoverDesign.tsx
cp "$TEMPLATES/src/video/cover-types.ts"             src/video/cover-types.ts
cp "$TEMPLATES/src/video/cover-index.ts"             src/video/cover-index.ts
cp "$TEMPLATES/src/video/cover-metadata.generated.ts" src/video/cover-metadata.generated.ts
cp "$TEMPLATES/src/video/render.css"                 src/video/render.css
cp "$TEMPLATES/src/video/cover.css"                  src/video/cover.css
cp "$TEMPLATES/src/video/render-timing.generated.ts"  src/video/render-timing.generated.ts
cp "$TEMPLATES/src/video/canvas-cinema.ts"            src/video/canvas-cinema.ts
cp "$TEMPLATES/src/video/scene-runtime.ts"            src/video/scene-runtime.ts
cp "$TEMPLATES/src/video/open-design-presets.ts"      src/video/open-design-presets.ts
cp "$TEMPLATES/src/video/reference-style-scenes.tsx"  src/video/reference-style-scenes.tsx
cp "$TEMPLATES/src/video/TechniquePreviews.tsx"       src/video/TechniquePreviews.tsx

cp "$TEMPLATES/src/chapters/01-example/Example.tsx"     src/chapters/01-example/Example.tsx
cp "$TEMPLATES/src/chapters/01-example/Example.css"     src/chapters/01-example/Example.css
cp "$TEMPLATES/src/chapters/01-example/narrations.ts"   src/chapters/01-example/narrations.ts
cp "$TEMPLATES/asset-manifest.json"                     asset-manifest.json
cp "$TEMPLATES/project-state.json"                      project-state.json
cp "$TEMPLATES/composition-manifest.json"                composition-manifest.json
cp "$TEMPLATES/src/video/PlateLayer.tsx"                  src/video/PlateLayer.tsx
cp "$TEMPLATES/scripts/measure-stage.mjs"                scripts/measure-stage.mjs
cp "$TEMPLATES/scripts/test-measure-stage.mjs" scripts/test-measure-stage.mjs
cp "$TEMPLATES/scripts/review-summary.mjs" scripts/review-summary.mjs
cp "$TEMPLATES/scripts/test-review-summary.mjs" scripts/test-review-summary.mjs
cp "$TEMPLATES/scripts/test-package-review.mjs" scripts/test-package-review.mjs
cp "$TEMPLATES/scripts/browser.ts"                        scripts/browser.ts
cp "$TEMPLATES/scripts/review-render.ts" scripts/review-render.ts
cp "$TEMPLATES/scripts/render-review-segment.ts" scripts/render-review-segment.ts
cp "$TEMPLATES/scripts/stable-generated-file.ts" scripts/stable-generated-file.ts
cp "$TEMPLATES/scripts/test-review-render.ts" scripts/test-review-render.ts
cp "$TEMPLATES/scripts/test-timing-stability.mjs" scripts/test-timing-stability.mjs
cp "$TEMPLATES/scripts/test-pipeline-wiring.mjs" scripts/test-pipeline-wiring.mjs
cp "$TEMPLATES/scripts/package-test-fixture.mjs" scripts/package-test-fixture.mjs
cp "$TEMPLATES/scripts/input-revision.ts" scripts/input-revision.ts
cp "$TEMPLATES/scripts/audio-source.ts" scripts/audio-source.ts
cp "$TEMPLATES/scripts/test-audio-source.ts" scripts/test-audio-source.ts
cp "$TEMPLATES/scripts/test-audio-delivery-routes.mjs" scripts/test-audio-delivery-routes.mjs
cp "$TEMPLATES/scripts/source-handoff.ts" scripts/source-handoff.ts
cp "$TEMPLATES/scripts/test-source-handoff.ts" scripts/test-source-handoff.ts
cp "$TEMPLATES/scripts/workflow-evidence.ts" scripts/workflow-evidence.ts
cp "$TEMPLATES/scripts/workflow-status.ts" scripts/workflow-status.ts
cp "$TEMPLATES/scripts/test-workflow.ts" scripts/test-workflow.ts
cp "$TEMPLATES/scripts/tts-cache.mjs" scripts/tts-cache.mjs
cp "$TEMPLATES/scripts/test-tts-cache.mjs" scripts/test-tts-cache.mjs
cp "$TEMPLATES/scripts/delivery-contract.ts"              scripts/delivery-contract.ts
cp "$TEMPLATES/scripts/validate-composition.ts"            scripts/validate-composition.ts
cp "$TEMPLATES/scripts/validate-alpha.ts"                  scripts/validate-alpha.ts
cp "$TEMPLATES/scripts/test-silent-route.mjs"              scripts/test-silent-route.mjs
cp "$TEMPLATES/scripts/test-contracts.ts"                  scripts/test-contracts.ts
cp "$TEMPLATES/scripts/render-route-args.ts" scripts/render-route-args.ts
cp "$TEMPLATES/scripts/render-output-safety.ts" scripts/render-output-safety.ts
cp "$TEMPLATES/scripts/test-render-output-safety.ts" scripts/test-render-output-safety.ts
cp "$TEMPLATES/scripts/test-alpha-composite-media.ts" scripts/test-alpha-composite-media.ts
cp "$TEMPLATES/scripts/render-smoke.ts" scripts/render-smoke.ts
cp "$TEMPLATES/scripts/test-render-route-args.ts" scripts/test-render-route-args.ts
cp "$TEMPLATES/scripts/test-narration-scope.mjs" scripts/test-narration-scope.mjs
cp "$TEMPLATES/scripts/test-run-studio.mjs" scripts/test-run-studio.mjs
SKILL_VERSION=$(node -e 'console.log(require(process.argv[1]).version)' "$SKILL_DIR/VERSION.json")
SKILL_VERSION="$SKILL_VERSION" \
OUTPUT_MODE="$OUTPUT_MODE" \
VIDEO_FORMAT_ID="$FORMAT" \
VIDEO_WIDTH="$VIDEO_WIDTH" \
VIDEO_HEIGHT="$VIDEO_HEIGHT" \
VIDEO_FPS="$VIDEO_FPS" \
VIDEO_PROFILE="$PROFILE" \
AUDIO_REQUESTED="$AUDIO_REQUESTED" \
SUBTITLES_REQUESTED="$SUBTITLES_REQUESTED" \
FINAL_RENDER_REQUIRED="$FINAL_RENDER_REQUIRED" \
COVER_REQUIRED="$COVER_REQUIRED" \
TARGET_DURATION_SEC="$TARGET_DURATION_SEC" \
node -e '
  const fs = require("fs");
  const p = "project-state.json";
  let s = fs.readFileSync(p, "utf8");
  s = s
    .replaceAll("__VIDEO_FORMAT_ID__", process.env.VIDEO_FORMAT_ID)
    .replaceAll("__VIDEO_WIDTH__", process.env.VIDEO_WIDTH)
    .replaceAll("__VIDEO_HEIGHT__", process.env.VIDEO_HEIGHT)
    .replaceAll("__VIDEO_FPS__", process.env.VIDEO_FPS)
    .replaceAll("__SKILL_VERSION__", process.env.SKILL_VERSION)
    .replaceAll("__VIDEO_PROFILE__", process.env.VIDEO_PROFILE)
    .replaceAll("__OUTPUT_MODE__", process.env.OUTPUT_MODE)
    .replaceAll("__AUDIO_REQUESTED__", process.env.AUDIO_REQUESTED)
    .replaceAll("__SUBTITLES_REQUESTED__", process.env.SUBTITLES_REQUESTED)
    .replaceAll("__FINAL_RENDER_REQUIRED__", process.env.FINAL_RENDER_REQUIRED)
    .replaceAll("__COVER_REQUIRED__", process.env.COVER_REQUIRED)
    .replaceAll("__TARGET_DURATION_SEC__", process.env.TARGET_DURATION_SEC || "");
  fs.writeFileSync(p, s);
'
: > feedback-events.jsonl
{
  echo "# Feedback Log"
  echo
  echo "This file is updated by \`npm run feedback -- ...\`."
  echo
} > feedback-log.md

# Audio pipeline scripts (extract-narrations + synthesize-audio runner +
# pluggable TTS providers under tts-providers/).
cp "$TEMPLATES/scripts/extract-narrations.ts"  scripts/extract-narrations.ts
cp "$TEMPLATES/scripts/synthesize-audio.sh"    scripts/synthesize-audio.sh
cp "$TEMPLATES/scripts/build-timing-manifest.ts" scripts/build-timing-manifest.ts
cp "$TEMPLATES/scripts/validate-subtitles.ts"   scripts/validate-subtitles.ts
cp "$TEMPLATES/scripts/validate-narrations.ts"  scripts/validate-narrations.ts
cp "$TEMPLATES/scripts/screen-quality.ts" scripts/screen-quality.ts
cp "$TEMPLATES/scripts/test-quality-gates.ts" scripts/test-quality-gates.ts
cp "$TEMPLATES/scripts/validate-screen-text.ts" scripts/validate-screen-text.ts
cp "$TEMPLATES/scripts/search-pexels-assets.ts" scripts/search-pexels-assets.ts
cp "$TEMPLATES/scripts/search-pixabay-assets.ts" scripts/search-pixabay-assets.ts
cp "$TEMPLATES/scripts/analyze-reference-videos.ts" scripts/analyze-reference-videos.ts
cp "$TEMPLATES/scripts/compare-reference-style.ts" scripts/compare-reference-style.ts
cp "$TEMPLATES/scripts/preflight.ts"            scripts/preflight.ts
cp "$TEMPLATES/scripts/build-render-timing.ts"  scripts/build-render-timing.ts
cp "$TEMPLATES/scripts/build-shot-manifest.ts"    scripts/build-shot-manifest.ts
cp "$TEMPLATES/scripts/test-preset-manifest.mjs" scripts/test-preset-manifest.mjs
cp "$TEMPLATES/scripts/validate-assets.ts"       scripts/validate-assets.ts
cp "$TEMPLATES/scripts/export-subtitles.ts"       scripts/export-subtitles.ts
cp "$TEMPLATES/scripts/render-golden-frames.ts"   scripts/render-golden-frames.ts
cp "$TEMPLATES/scripts/render-motion-strips.ts"   scripts/render-motion-strips.ts
cp "$TEMPLATES/scripts/render-video.ts"           scripts/render-video.ts
cp "$TEMPLATES/scripts/render-alpha-smoke.ts"     scripts/render-alpha-smoke.ts
cp "$TEMPLATES/scripts/run-studio.cjs"            scripts/run-studio.cjs
cp "$TEMPLATES/scripts/generate-cover.ts"         scripts/generate-cover.ts
cp "$TEMPLATES/scripts/cover-contract.ts" scripts/cover-contract.ts
cp "$TEMPLATES/scripts/cover-contract.test.ts" scripts/cover-contract.test.ts
cp "$TEMPLATES/cover-brief.example.json" cover-brief.example.json
cp "$TEMPLATES/scripts/run-cover.mjs" scripts/run-cover.mjs
cp "$TEMPLATES/scripts/test-cover-runner.mjs" scripts/test-cover-runner.mjs
cp "$TEMPLATES/scripts/validate-cover.ts"         scripts/validate-cover.ts
cp "$TEMPLATES/scripts/copy-cover.ts"             scripts/copy-cover.ts
cp "$TEMPLATES/scripts/validate-delivery.ts"      scripts/validate-delivery.ts
cp "$TEMPLATES/scripts/package-delivery.ts"       scripts/package-delivery.ts
cp "$TEMPLATES/scripts/record-feedback.ts"        scripts/record-feedback.ts
cp "$TEMPLATES/scripts/feedback-event.ts"         scripts/feedback-event.ts
cp "$TEMPLATES/scripts/run-bash.cjs"              scripts/run-bash.cjs
chmod +x scripts/synthesize-audio.sh

# Read the skill version from the source artifact, never from the new project cwd.
VIDEO_FORMAT_ID="$FORMAT" \
OUTPUT_MODE="$OUTPUT_MODE" \
VIDEO_WIDTH="$VIDEO_WIDTH" \
VIDEO_HEIGHT="$VIDEO_HEIGHT" \
VIDEO_FPS="$VIDEO_FPS" \
VIDEO_PROFILE="$PROFILE" \
SKILL_VERSION="$SKILL_VERSION" \
AUDIO_REQUESTED="$AUDIO_REQUESTED" \
SUBTITLES_REQUESTED="$SUBTITLES_REQUESTED" \
FINAL_RENDER_REQUIRED="$FINAL_RENDER_REQUIRED" \
COVER_REQUIRED="$COVER_REQUIRED" \
TARGET_DURATION_SEC="$TARGET_DURATION_SEC" \
THEME="$THEME" \
node -e '
const fs = require("fs");
fs.writeFileSync(".web-video-presentation-project.json", JSON.stringify({
  schema: 2,
  outputMode: process.env.OUTPUT_MODE,
  skill: "web-video-presentation",
  projectVersion: process.env.SKILL_VERSION,
  videoProfile: process.env.VIDEO_PROFILE,
  format: process.env.VIDEO_FORMAT_ID,
  width: Number(process.env.VIDEO_WIDTH),
  height: Number(process.env.VIDEO_HEIGHT),
  fps: Number(process.env.VIDEO_FPS),
  audioRequested: process.env.AUDIO_REQUESTED === "true",
  subtitlesRequested: process.env.SUBTITLES_REQUESTED === "true",
  finalRenderRequired: process.env.FINAL_RENDER_REQUIRED === "true",
  coverRequired: process.env.COVER_REQUIRED === "true",
  targetDurationSec: process.env.TARGET_DURATION_SEC,
  theme: process.env.THEME,
  createdAt: new Date().toISOString()
}, null, 2) + "\n");
'

mkdir -p scripts/tts-providers
cp "$TEMPLATES/scripts/tts-providers/README.md"   scripts/tts-providers/README.md
cp "$TEMPLATES/scripts/tts-providers/voicebox.sh"  scripts/tts-providers/voicebox.sh
cp "$TEMPLATES/scripts/tts-providers/minimax.sh"  scripts/tts-providers/minimax.sh
cp "$TEMPLATES/scripts/tts-providers/openai.sh"   scripts/tts-providers/openai.sh

# Wire the production scripts into npm so contributors don't have to remember
# the exact command. Uses node to merge into the package.json generated above.
node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
p.scripts = Object.assign({}, p.scripts, {
  "check:motion-direction": "node scripts/check-motion-direction.mjs",
  "test:motion-direction": "node --test scripts/test-motion-direction.mjs",
  "test:mechanisms": "node --import tsx --test src/video/mechanisms/mechanisms.test.tsx",
  "extract-narrations": "node --import tsx scripts/extract-narrations.ts",
  "build-timing": "node --import tsx scripts/build-timing-manifest.ts && node --import tsx scripts/build-render-timing.ts",
  "validate-subtitles": "node --import tsx scripts/validate-subtitles.ts",
  "validate-narrations": "node --import tsx scripts/validate-narrations.ts",
  "validate-screen-text": "node --import tsx scripts/validate-screen-text.ts",
  "assets:pexels": "node --import tsx scripts/search-pexels-assets.ts",
  "assets:pixabay": "node --import tsx scripts/search-pixabay-assets.ts",
  "analyze:references": "node --import tsx scripts/analyze-reference-videos.ts",
  "compare:references": "node --import tsx scripts/compare-reference-style.ts",
  "build-shot-manifest": "node --import tsx scripts/build-shot-manifest.ts",
  "test:preset-manifest": "node scripts/test-preset-manifest.mjs",
  "validate-assets": "node --import tsx scripts/validate-assets.ts",
  "validate:composition": "node --import tsx scripts/validate-composition.ts",
  "test:render-output-safety": "node --import tsx --test scripts/test-render-output-safety.ts",
  "test:alpha-composite-media": "node --import tsx --test scripts/test-alpha-composite-media.ts",
  "test:render-route-args": "node --import tsx --test scripts/test-render-route-args.ts",
  "test:narration-scope": "node --test scripts/test-narration-scope.mjs",
  "test:studio": "node --test scripts/test-run-studio.mjs",
  "test:contracts": "node --import tsx scripts/test-contracts.ts",
  "test:quality-gates": "node --import tsx --test scripts/test-quality-gates.ts",
  "test:silent-route": "node scripts/test-silent-route.mjs",
  "measure:stage": "node scripts/measure-stage.mjs",
  "metrics:begin": "node scripts/measure-stage.mjs --begin",
  "metrics:resume": "node scripts/measure-stage.mjs --resume",
  "metrics:end": "node scripts/measure-stage.mjs --end",
  "test:metrics": "node --test scripts/test-measure-stage.mjs",
  "review:summary": "node scripts/review-summary.mjs",
  "test:review-summary": "node --test scripts/test-review-summary.mjs",
  "test:package-review": "node --test scripts/test-package-review.mjs",
  "workflow:status": "node --import tsx scripts/workflow-status.ts",
  "test:audio-delivery-routes": "node scripts/test-audio-delivery-routes.mjs",
  "test:source-handoff": "node --import tsx scripts/test-source-handoff.ts",
  "test:audio-source": "node --import tsx scripts/test-audio-source.ts",
  "test:workflow": "node --import tsx scripts/test-workflow.ts",
  "test:tts-cache": "node scripts/test-tts-cache.mjs",
  "test:continuity": "node --import tsx --test src/video/continuity-clock.test.ts src/video/render-schedule.test.ts src/video/object-track.test.ts src/examples/flow-continuity/model.test.ts",
  "test:review-render": "node --import tsx scripts/test-review-render.ts",
  "test:timing-stability": "node scripts/test-timing-stability.mjs",
  "test:pipeline-wiring": "node scripts/test-pipeline-wiring.mjs",
  "export-subtitles": "npm run build-timing && node --import tsx scripts/export-subtitles.ts",
  "preflight": "npm run validate-narrations && npm run build-timing && npm run validate-subtitles && npm run validate-screen-text && npm run validate-assets && npm run validate:composition && node --import tsx scripts/preflight.ts",
  "render:timing": "npm run build-timing",
  "render:studio": "npm run render:timing && node scripts/run-studio.cjs",
  "render:alpha:smoke": "npm run render:timing && node --import tsx scripts/render-alpha-smoke.ts",
  "render:video": "npm run preflight && node --import tsx scripts/render-video.ts",
  "render:video:subtitles": "npm run preflight && node --import tsx scripts/export-subtitles.ts && node --import tsx scripts/render-video.ts --subtitles",
  "render:video:draft": "npm run typecheck && npm run validate-assets && npm run validate:composition && npm run render:timing && node --import tsx scripts/render-video.ts --preset=draft",
  "render:video:draft:subtitles": "npm run typecheck && npm run validate-assets && npm run validate:composition && npm run export-subtitles && node --import tsx scripts/render-video.ts --preset=draft --subtitles",
  "render:video:composite": "npm run preflight && node --import tsx scripts/render-video.ts --output-mode=composite",
  "render:video:both": "npm run preflight && node --import tsx scripts/render-video.ts --output-mode=both",
  "render:video:alpha": "npm run preflight && node --import tsx scripts/render-video.ts --alpha",
  "render:video:alpha:draft": "npm run typecheck && npm run validate-assets && npm run render:timing && node --import tsx scripts/render-video.ts --alpha --preset=draft --output output/draft-alpha.mov",
  "render:video:fast": "npm run render:video:draft --",
  "render:video:fast:subtitles": "npm run render:video:draft:subtitles --",
  "render:smoke": "npm run typecheck && npm run validate-assets && npm run validate:composition && npm run render:timing && node --import tsx scripts/render-smoke.ts",
  "render:segment": "npm run typecheck && npm run validate-assets && npm run validate:composition && npm run render:timing && node --import tsx scripts/render-review-segment.ts",
  "render:golden": "npm run render:timing && node --import tsx scripts/render-golden-frames.ts",
  "render:golden:fast": "npm run render:timing && node --import tsx scripts/render-golden-frames.ts --max=8",
  "render:motion-strips": "npm run render:timing && node --import tsx scripts/render-motion-strips.ts",
  "render:motion-strips:fast": "npm run render:timing && node --import tsx scripts/render-motion-strips.ts --max-steps=4 --frames-per-step=4",
  "cover:generate": "node --import tsx scripts/generate-cover.ts",
  "cover:validate": "node --import tsx scripts/validate-cover.ts",
  "cover:copy": "node --import tsx scripts/copy-cover.ts",
  "cover": "node scripts/run-cover.mjs",
  "test:cover-runner": "node --test scripts/test-cover-runner.mjs",
  "test:cover": "node --import tsx --test scripts/cover-contract.test.ts",
  "validate:delivery": "node --import tsx scripts/validate-delivery.ts",
  "synthesize-audio":   "node scripts/run-bash.cjs scripts/synthesize-audio.sh",
  "synthesize-audio:force": "node scripts/run-bash.cjs scripts/synthesize-audio.sh --force",
  "package:delivery": "npm run validate:delivery && node --import tsx scripts/package-delivery.ts",
  "feedback": "node --import tsx scripts/record-feedback.ts",
});
// Instrument only real leaves, never an npm alias or a shell chain. Arguments
// appended by npm still reach the original last command unchanged. No extra build.
const leafStages = {
  "extract-narrations.ts": "audio", "build-timing-manifest.ts": "timing", "build-render-timing.ts": "timing",
  "validate-subtitles.ts": "validate", "validate-narrations.ts": "validate", "validate-screen-text.ts": "validate",
  "search-pexels-assets.ts": "assets", "search-pixabay-assets.ts": "assets",
  "analyze-reference-videos.ts": "qa", "compare-reference-style.ts": "qa", "build-shot-manifest.ts": "timing",
  "validate-assets.ts": "validate", "validate-composition.ts": "validate", "export-subtitles.ts": "timing",
  "preflight.ts": "preflight", "render-alpha-smoke.ts": "render", "render-smoke.ts": "render", "render-video.ts": "render",
  "render-review-segment.ts": "render", "render-golden-frames.ts": "qa", "render-motion-strips.ts": "qa",
  "generate-cover.ts": "cover", "validate-cover.ts": "cover", "copy-cover.ts": "cover",
  "validate-delivery.ts": "validate", "package-delivery.ts": "package"
};
const measured = (stage, label, command) => `node scripts/measure-stage.mjs --best-effort --stage=${stage} --label=${label} -- ${command}`;
for (const [name, command] of Object.entries(p.scripts)) {
  p.scripts[name] = command.split(" && ").map((leaf) => {
    const file = /^node --import tsx scripts\/([a-z-]+\.ts)(?: |$)/.exec(leaf)?.[1];
    if (file && leafStages[file]) return measured(leafStages[file], file.replace(/\.ts$/, ""), leaf);
    if (leaf.startsWith("node scripts/run-bash.cjs scripts/synthesize-audio.sh")) return measured("audio", "synthesize-audio", leaf);
    if (leaf.startsWith("remotion bundle ")) return measured("build", "render-bundle", leaf.replace(/^remotion /, "node node_modules/@remotion/cli/remotion-cli.js "));
    return leaf;
  }).join(" && ");
}
p.scripts.typecheck = measured("typecheck", "typecheck", p.scripts.typecheck.replace(/^tsc /, "node node_modules/typescript/bin/tsc "));
fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");
'

# Theme identity is recorded even when dependencies are intentionally not installed.
printf '%s\n' "$THEME" > .theme

if [[ "$SKIP_INSTALL" != "true" ]]; then
echo "▸ 安装项目依赖（Remotion / React / TS / tsx，可能要等一会）..."
npm ci --ignore-scripts --cache "$TARGET/.cache/npm" --registry=https://registry.npmjs.org

echo "▸ 跑 typecheck（失败会阻断，避免把未编译工程报告为完成）..."
npm run typecheck

fi

cat <<EOF

✓ 项目骨架已生成：$TARGET
  profile=$PROFILE · outputMode=$OUTPUT_MODE · $VIDEO_LABEL ($VIDEO_WIDTH×$VIDEO_HEIGHT) @ $VIDEO_FPS fps
  theme=$THEME · skipInstall=$SKIP_INSTALL

下一步按 $SKILL_DIR/SKILL.md 的当前路由执行，不重新加载全部历史资料。
- 默认不安装依赖；--install-project 仅在已获准向此项目安装时使用，npm cache 也限定项目 .cache/npm。
- 未安装时依赖与类型检查尚未执行；获准后在项目目录 npm ci --ignore-scripts --cache .cache/npm。
- 系统工具缺失时先确认独立工具目录；不要全局安装或自动下载浏览器。
- 保留真实设计/代表镜头/最终验收记录，不把脚手架成功当成视频已完成。
- 无声图形使用 timingMode=explicit + stepTimings；narrations.ts 保留 step 索引，不需假口播或假音频。
- composite / both 必须先登记本地底片、适配与声音策略；内置仅 screen-space 叠加。

在项目目录可运行（需要已安装依赖与相应授权）：
  npm run typecheck
  npm run test:contracts
  npm run test:silent-route
  npm run build-timing
  npm run validate-assets
  npm run validate:composition
  npm run render:studio

正式产物由 outputMode 决定，不把所有模式都当 MP4：
  npm run render:video                 # 按 project-state 模式输出并保留证据
  npm run render:video:alpha           # 透明 ProRes 4444，独立 Alpha 合约
  npm run render:video:composite       # 底片与前景的合成 MP4
  npm run render:video:both            # Alpha + 合成；不是 opaque + Alpha
  npm run validate:delivery
  npm run package:delivery             # 默认项目 output；桌面仅显式 --desktop

生产命令默认只记录本地叶子阶段耗时；VWP_METRICS=off 可关闭，不上传数据：
  npm run metrics:begin -- --run-id=my-video-01  # 显式开始本次项目工作
  npm run metrics:resume -- --run-id=my-video-01 # 仅恢复已存在的同一次工作
  npm run review:summary -- --status=partial   # 非验收，不自动调用 fix-agent
  npm run metrics:end                         # 完成/暂停后结束当前选择
未 begin/resume 时每个叶子调用独立 UUID，不能把它们冒称整个项目耗时。
package:delivery 自动附本次快照（打包尚在进行，未闭合时长 unknown）。

音频、字幕、封面只按已确认需求执行。字体默认本地 fallback，remote opt-in 后重验排版。
草稿/抽帧/编解码测试与真实端到端渲染、用户最终验收分开；不要自动下载浏览器。
EOF
