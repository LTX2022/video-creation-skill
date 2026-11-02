import {outputMode, readState} from "./delivery-contract";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const REGISTRY_PATH = resolve(ROOT, "src/registry/chapters.ts");
const CHAPTERS_DIR = resolve(ROOT, "src/chapters");
const OUT_PATH = resolve(ROOT, "shot-manifest.json");
const VIDEO_FORMAT_PATH = resolve(ROOT, "src/config/videoFormat.ts");

interface ShotStep {
  chapter: string;
  step: number;
  scriptText: string;
  claim: string;
  visualModel: string;
  compositionModel: string;
  visualRecipe: string;
  motionStyle: string;
  motionTechnique: string; // 12 technique families from references/jitter-motion-techniques/
  finishLevel: "draft" | "structured" | "polished" | "hero";
  source: string;
  motionIntent: string;
  assetImportance: "simple" | "medium" | "important";
  openDesignRequired: boolean;
  openDesignHandoff: string;
  lottieCandidate: string;
  onScreenText: string[]; // max 2 labels per step (3 for opening/ending); enforced by validate-screen-text.ts
  allowSubtitleOverlap: boolean;
  overlapReason: string;
  assets: string[];
  visualCoverage: number;
  overlaySafety?: {coordinateSystem: string; bounds: {x:number;y:number;width:number;height:number}; minTextPx:number; readabilityReviewed:boolean; edgePaddingReviewed:boolean; reviewEvidence:string};
  mobileReadability: {
    required: boolean;
    minTextPx: number;
    headlinePx: number;
    primaryVisualCoverage: number;
    primaryVisualWidthRatio: number;
    primaryVisualHeightRatio: number;
    safeFrameUse: number;
    notes: string;
  };
  subtitleSafety: {
    required: boolean;
    checked: boolean;
    coordinateSystem: "normalized";
    subtitleBand: { x: number; y: number; width: number; height: number };
    platformUiBand: { x: number; y: number; width: number; height: number } | null;
    textBoxes: Array<{ id: string; x: number; y: number; width: number; height: number; allowSubtitleOverlap?: boolean; allowPlatformOverlap?: boolean }>;
    criticalVisualBoxes: Array<{ id: string; x: number; y: number; width: number; height: number; allowSubtitleOverlap?: boolean; allowPlatformOverlap?: boolean }>;
    notes: string;
  };
  motionDensity: "low" | "medium" | "high";
  visualStages: string[];
  qualityNotes: string[];
}

function readChapterOrder(): { id: string; folder: string }[] {
  const src = readFileSync(REGISTRY_PATH, "utf8");
  const ids = [...src.matchAll(/id:\s*["']([^"']+)["']/g)].map((m) => m[1]!);
  const folders = [...src.matchAll(/from\s+["']\.\.\/chapters\/([^"'\/]+)\/narrations["']/g)].map((m) => m[1]!);
  return ids.map((id) => {
    const folder = folders.find((f) => f.endsWith("-" + id)) ?? folders.find((f) => f === id);
    if (!folder) throw new Error(`No narrations import found for chapter ${id}`);
    return { id, folder };
  });
}

async function loadChapterNarration(folder: string): Promise<{narrations: string[]; presetShotPlan?: Array<Record<string, unknown>>}> {
  const file = join(CHAPTERS_DIR, folder, "narrations.ts");
  const mod = await import(pathToFileURL(file).href + "?t=" + Date.now());
  if (!Array.isArray(mod.narrations)) throw new Error(`${folder}/narrations.ts must export narrations`);
  const presetShotPlan = folder === '01-example' && Array.isArray(mod.presetShotPlan) ? mod.presetShotPlan : undefined;
  if (presetShotPlan && (presetShotPlan.length !== mod.narrations.length || presetShotPlan.some((item: unknown) => !item || typeof item !== 'object'))) {
    throw new Error('Default presetShotPlan must provide one metadata object per actual narration');
  }
  if (presetShotPlan) {
    const selectionPath = resolve(ROOT, 'src/config/themePreset.ts');
    const selection = existsSync(selectionPath) ? readFileSync(selectionPath, 'utf8').match(/THEME_PRESET_ID\s*=\s*['"]([a-z0-9-]+)['"]/)?.[1] : undefined;
    if (!selection) throw new Error('Default preset shot plan requires the actual selected theme config');
    const required = ['presetId','presetFamily','presetVariant','visualModel','compositionModel','visualRecipe','motionStyle','motionTechnique','motionIntent','source'];
    for (const item of presetShotPlan) {
      if (required.some(key => typeof item[key] !== 'string' || !item[key].trim())) throw new Error('Default preset shot metadata requires complete nonempty source/action fields');
      if (item.presetId !== selection || !String(item.source).includes(`registry.ts#${selection}`)) throw new Error('Default preset shot plan does not match the selected theme source');
      if (!Array.isArray(item.onScreenText) || item.onScreenText.some((value:unknown) => typeof value !== 'string') || !Array.isArray(item.visualStages) || item.visualStages.some((value:unknown) => typeof value !== 'string')) throw new Error('Default preset shot plan text and stages must be explicit string arrays');
    }
  }
  return {narrations: mod.narrations, presetShotPlan};
}

function inferVisualModel(text: string): string {
  if (/数据|增长|下降|比例|百分比|排名|分数|销量|用户|成本|收入|速度|时长/.test(text)) return "data-visualization";
  if (/流程|步骤|阶段|先|然后|最后|路径|链路/.test(text)) return "process-flow";
  if (/关系|连接|依赖|网络|影响|因果/.test(text)) return "relationship-graph";
  if (/对比|差异|前后|相比|但是|而是/.test(text)) return "comparison";
  if (/声音|节奏|时间|切页|停留|播放/.test(text)) return "timeline";
  return "content-bound-visual";
}

function inferCompositionModel(visualModel: string, text: string): string {
  if (/开场|第一|核心|关键|结论|为什么/.test(text)) return "hero-theater";
  if (visualModel === "data-visualization") return "metric-strip";
  if (visualModel === "process-flow" || visualModel === "relationship-graph") return "dark-preview-stage";
  if (/案例|作品|模板|清单|工具|素材/.test(text)) return "product-gallery";
  if (/声音|音乐|播客|节奏|音频/.test(text)) return "audiogram-waveform";
  if (/空间|层级|结构|架构|3D|三维/.test(text)) return "spatial-3d-stage";
  if (/对比|差异|前后|相比|但是|而是/.test(text)) return "comparison-stage";
  if (/时间|历史|阶段|路线|进度/.test(text)) return "timeline-stage";
  return "motion-graphic-lab";
}

function inferVisualRecipe(visualModel: string, compositionModel: string, text: string): string {
  if (/开场|第一|为什么|钩子|痛点/.test(text)) return "pov-hook-demo";
  if (/产品|工具|SaaS|应用|界面|输入框|prompt|AI|人工智能/.test(text)) return "kinetic-prompt-to-product";
  if (/教程|工程|流程|步骤|框图|手写|标注|Agent|方法论/.test(text)) return "annotated-flow-diagram";
  if (/输入|输出|生成|调用|处理|转化/.test(text)) return "source-to-output-demo";
  if (/选择|判断|分支|如果|否则|策略/.test(text)) return "decision-tree-router";
  if (compositionModel === "hero-theater") return "kinetic-claim-card";
  if (visualModel === "data-visualization") return /趋势|曲线|增长|下降/.test(text) ? "nyt-graph-reveal" : "metric-race-strip";
  if (compositionModel === "comparison-stage") return "before-after-wipe";
  if (compositionModel === "audiogram-waveform") return "podcast-waveform-frame";
  if (compositionModel === "product-gallery") return /产品|功能|演示/.test(text) ? "product-feature-flythrough" : "quote-carousel";
  if (compositionModel === "module-dashboard") return "module-dashboard-focus";
  if (compositionModel === "relationship-map" || visualModel === "relationship-graph") return "node-graph-build";
  if (compositionModel === "timeline-stage" || visualModel === "timeline") return "timeline-stack";
  return "source-to-output-demo";
}

function inferMotionStyle(visualRecipe: string, compositionModel: string, text: string): string {
  if (visualRecipe === "nyt-graph-reveal" || visualRecipe === "metric-race-strip") return "nyt-data-story";
  if (visualRecipe === "decision-tree-router" || visualRecipe === "node-graph-build") return "decision-tree";
  if (visualRecipe === "kinetic-prompt-to-product") return "prompt-product-kinetic";
  if (visualRecipe === "annotated-flow-diagram") return "whiteboard-engineering-flow";
  if (visualRecipe === "product-feature-flythrough" || visualRecipe === "source-to-output-demo") return "product-promo";
  if (visualRecipe === "podcast-waveform-frame") return "podcast-frame";
  if (visualRecipe === "before-after-wipe") return "before-after";
  if (visualRecipe === "quote-carousel") return "quote-carousel";
  if (visualRecipe === "logo-sting-outro") return "logo-sting";
  if (compositionModel === "hero-theater" && /标题|开场|结论|金句/.test(text)) return "kinetic-type";
  if (compositionModel === "spatial-3d-stage") return "three-depth";
  if (/企业|技术|系统|流程|数据/.test(text)) return "swiss-grid";
  if (/生活|品牌|故事|人物/.test(text)) return "warm-grain";
  return "shape-system";
}

// Infer the primary motion technique family from content action.
// See references/jitter-motion-techniques/ for the 12 families and their design steps.
// NOTE: This is a draft suggestion only. Agent must review and override based on content understanding.
function inferMotionTechnique(visualModel: string, compositionModel: string, text: string): string {
  // Counter: numbers, growth, stats, countdowns (10-counter)
  if (/\d+%|\d+万|\d+亿|\d+倍|[0-9]+[,0-9]*\.?[0-9]*\s*(元|块|美元|kg|km|个|人|次|台|万|亿)|涨价|降价|增长|下降|上升|跌幅|比例|百分比|排名|销量|用户数|成本|收入|倒计时|达到|突破|新高|累计|总计|翻倍|翻番|[零一二三四五六七八九十百千万两]+[块元倍万亿%]|百分之/.test(text)) return "10-counter";
  // Reveal: key info, suspense, answer, conclusion (03-reveal)
  if (/揭示|答案|结论|揭晓|关键|核心|秘密|真相|发现|来了|诞生|炸|震|到底|背后|真正原因|不复杂|没那么简单|实锤|即将|揭晓|就是|原来是|其实|新版|训练完成/.test(text)) return "03-reveal";
  // Stack: product matrix, feature list, card sequences (06-stack)
  if (/功能|特性|清单|产品|卡片|堆叠|序列|展示|版本|方案|第一是|第二是|第三是|一是|二是|三是|首先|其次|最后|标准|旧.*新|参数|榜单/.test(text)) return "06-stack";
  // Scale-rotate: emphasis, comparison, 3D (05-scale-rotate)
  if (/对比|差异|vs|VS|versus|还是|哪个好|相比|放大|缩小|翻转|旋转|提升|加强|升级|更强|更牛/.test(text)) return "05-scale-rotate";
  // Slide-move: direction, progression, path, timeline (04-slide-move)
  if (/推进|路径|流程|步骤|方向|移动|滑入|时间线|历史|进度|.*月.*份|从.*到|阶段|推移|演变/.test(text)) return "04-slide-move";
  // Morph: transformation, shape-to-text, state change (07-morph)
  if (/变成|转换|演变|变形|过渡|状态切换|形变|迭代|自我|进化|升级成|变成/.test(text)) return "07-morph";
  // Bento grid: multiple parallel elements with hierarchy (11-bento-grid)
  if (/矩阵|网格|并列|多个|方面|维度|模块|全景|生态|体系/.test(text)) return "11-bento-grid";
  // Gradient: brand, atmosphere, background (09-gradient)
  if (/品牌|背景|氛围|渐变|色彩|流动|调性|视觉/.test(text)) return "09-gradient";
  // Blur: focus, depth, dreamy (08-blur)
  if (/聚焦|模糊|景深|梦幻|柔化|焦点|失焦/.test(text)) return "08-blur";
  // Glass-shader: high-end UI, refraction (12-glass-shader)
  if (/玻璃|质感|折射|高端|磨砂|透明底|叠加层/.test(text)) return "12-glass-shader";
  // Stagger: list, multiple items entering (02-stagger-offset)
  if (compositionModel === "product-gallery" || /列表|多项|逐个|依次|错峰|三张|四个|五项/.test(text)) return "02-stagger-offset";
  // Fade: default — appear/disappear, transitions (01-fade-opacity)
  return "01-fade-opacity";
}

function inferAssetImportance(visualModel: string, compositionModel: string, text: string): "simple" | "medium" | "important" {
  if (/主视觉|封面|品牌|客户|产品|人物|角色|空间|场景|复杂|案例|架构|生态/.test(text)) return "important";
  if (["data-visualization", "process-flow", "relationship-graph", "comparison"].includes(visualModel)) return "medium";
  if (["spatial-3d-stage", "relationship-map", "module-dashboard"].includes(compositionModel)) return "medium";
  return "simple";
}

function inferLottieCandidate(visualModel: string, visualRecipe: string, text: string): string {
  if (/没有素材|无素材|图标|状态|加载|完成|提醒|工具|AI|人工智能|机器人|搜索|上传|下载|生成/.test(text)) {
    return `search Lottie for semantic motion matching ${visualModel}/${visualRecipe}; record selected asset in asset-manifest.json`;
  }
  if (["process-flow", "relationship-graph", "timeline"].includes(visualModel)) {
    return `optional Lottie icon/loop for ${visualModel}; use only if licensed and subtitle-safe`;
  }
  return "";
}

function inferVisualStages(visualRecipe: string, compositionModel: string): string[] {
  if (visualRecipe === "kinetic-prompt-to-product") {
    return ["oversized hook", "typed prompt", "product card reveal", "settle"];
  }
  if (visualRecipe === "annotated-flow-diagram") {
    return ["title establish", "first node", "flow growth", "current highlight", "conclusion"];
  }
  if (visualRecipe === "nyt-graph-reveal" || visualRecipe === "metric-race-strip") {
    return ["setup", "series reveal", "peak comparison", "retained hold"];
  }
  if (visualRecipe === "decision-tree-router" || visualRecipe === "node-graph-build") {
    return ["problem setup", "branch reveal", "path selection", "decision settle"];
  }
  if (compositionModel === "comparison-stage" || visualRecipe === "before-after-wipe") {
    return ["before", "wipe", "after"];
  }
  return ["setup", "main reveal", "hold"];
}

function claimFrom(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 34 ? clean.slice(0, 34) + "..." : clean;
}

function readVideoFormatId(): string {
  if (!existsSync(VIDEO_FORMAT_PATH)) return "unknown";
  const src = readFileSync(VIDEO_FORMAT_PATH, "utf8");
  return src.match(/id:\s*["']([^"']+)["']/)?.[1] ?? "unknown";
}

function draftMobileReadability(format: string) {
  return {
    required: format === "portrait",
    minTextPx: 0,
    headlinePx: 0,
    primaryVisualCoverage: 0,
    primaryVisualWidthRatio: 0,
    primaryVisualHeightRatio: 0,
    safeFrameUse: 0,
    notes: format === "portrait"
      ? "Portrait/mobile delivery gate: revise these numbers after visual implementation. Small-phone viewing requires large text and a dominant primary visual."
      : "Optional for landscape; required when format is portrait.",
  };
}

function draftSubtitleSafety(format: string) {
  const portrait = format === "portrait";
  return {
    required: true,
    checked: false,
    coordinateSystem: "normalized" as const,
    subtitleBand: portrait
      ? { x: 0.08, y: 0.60, width: 0.84, height: 0.13 }
      : { x: 0.06, y: 0.80, width: 0.88, height: 0.14 },
    platformUiBand: portrait
      ? { x: 0, y: 0.82, width: 1, height: 0.18 }
      : null,
    textBoxes: [],
    criticalVisualBoxes: [],
    notes: "After golden-frame review, record normalized boxes for every on-screen text/label and critical visual. Boxes must not intersect subtitleBand or platformUiBand unless this is the opening/ending title exception.",
  };
}

async function main() {
  if (existsSync(OUT_PATH) && !process.argv.includes("--force")) {
    console.error("x shot-manifest.json already exists. Use --force to regenerate.");
    process.exit(1);
  }

  const format = readVideoFormatId();
  const state = readState(ROOT);
  const overlayMode = outputMode(state.outputMode) !== "opaque";
  const steps: ShotStep[] = [];
  for (const { id, folder } of readChapterOrder()) {
    const {narrations,presetShotPlan} = await loadChapterNarration(folder);
    narrations.forEach((text, index) => {
      const visualModel = inferVisualModel(text);
      const compositionModel = inferCompositionModel(visualModel, text);
      const visualRecipe = inferVisualRecipe(visualModel, compositionModel, text);
      const motionStyle = inferMotionStyle(visualRecipe, compositionModel, text);
      const motionTechnique = inferMotionTechnique(visualModel, compositionModel, text);
      const assetImportance = inferAssetImportance(visualModel, compositionModel, text);
      const preset = presetShotPlan?.[index];
      const presetText = (key:string, fallback:string) => typeof preset?.[key] === 'string' ? String(preset[key]) : fallback;
      steps.push({
        chapter: id,
        step: index + 1,
        scriptText: text,
        claim: claimFrom(text),
        visualModel: presetText('visualModel',visualModel),
        compositionModel: presetText('compositionModel',compositionModel),
        visualRecipe: presetText('visualRecipe',visualRecipe),
        motionStyle: presetText('motionStyle',motionStyle),
        motionTechnique: presetText('motionTechnique',motionTechnique),
        finishLevel: "draft",
        source: presetText('source',overlayMode ? "replace with the actual foreground design/source and shot-plan reference" : "narrations.ts; replace with script.md/article.md section before enterprise delivery"),
        motionIntent: presetText('motionIntent',`Use ${visualModel} to make the spoken claim visible; replace with a concrete content-driven motion decision.`),
        assetImportance,
        openDesignRequired: assetImportance !== "simple",
        openDesignHandoff: assetImportance !== "simple"
          ? "required for medium/important visuals; fill OpenDesign brief/artifact path or accepted skipReason before enterprise delivery"
          : "",
        lottieCandidate: inferLottieCandidate(visualModel, visualRecipe, text),
        onScreenText: preset && Array.isArray(preset.onScreenText) && preset.onScreenText.every((value:unknown)=>typeof value==='string') ? preset.onScreenText as string[] : [],
        ...(preset ? {presetId: presetText('presetId',''),presetFamily:presetText('presetFamily',''),presetVariant:presetText('presetVariant',''),screenTextIntent:presetText('screenTextIntent','labels')} : {}),
        allowSubtitleOverlap: false,
        overlapReason: "",
        assets: [],
        visualCoverage: 0,
        ...(overlayMode ? {overlaySafety:{coordinateSystem:'normalized',bounds:{x:0,y:0,width:0,height:0},minTextPx:0,readabilityReviewed:false,edgePaddingReviewed:false,reviewEvidence:''}} : {}),
        mobileReadability: {...draftMobileReadability(format), required: !overlayMode && format === 'portrait'},
        subtitleSafety: {...draftSubtitleSafety(format), required: state.subtitlesRequested === true},
        motionDensity: "medium",
        visualStages: preset && Array.isArray(preset.visualStages) && preset.visualStages.every((value:unknown)=>typeof value==='string') ? preset.visualStages as string[] : inferVisualStages(visualRecipe, compositionModel),
        qualityNotes: [
          "画面必须直接对应当前口播",
          "画面文字不得复述字幕；开头/结尾点题例外必须设置 allowSubtitleOverlap=true 并写 overlapReason",
          "去掉口播只看画面也应能理解大意",
          "不要使用抽象装饰代替内容表达",
          overlayMode ? "前景覆盖率按真实值填写，允许小角标；填写overlaySafety实际bounds/minTextPx并保留可读性与边缘留白复核证据，不伪造0.55" : "动态图形/图表/关系/素材等非文字视觉必须占画面主体，visualCoverage 交付前至少 0.55",
          "长 step 必须拆分，或在 visualStages 写清多阶段视觉变化；连续帧必须能看出对象真的在变",
          "按 references/STYLE-BENCHMARKS.md 把 finishLevel 从 draft 提升到 polished 或 hero",
          "按 references/VISUAL-RECIPES.md 选择对应 recipe，并把具体动作写进 motionIntent",
          "按 references/MOTION-PATTERN-LIBRARY.md 选择 visualRecipe 与 motionStyle，复用成熟 Remotion/HyperFrames 画面模式",
          "按 references/jitter-motion-techniques/ 选择 motionTechnique（12 个技法族之一），并阅读对应文章的「拿到一篇文章怎么设计该动态」步骤",
          "参考视频学习必须看连续帧和时间序列，不只看静帧",
          overlayMode ? "透明/合成前景使用overlaySafety，不套全屏80/120px标题门槛；须在实际底片与观看尺寸上复核" : "竖屏项目必须按 references/FORMATS.md 填写 mobileReadability：文字够大、主视觉够大、元素不能超出画幅",
          "客户无素材且适合小型语义动效时，按 references/LOTTIE-ASSETS.md 搜索 Lottie 候选并记录授权",
          "复杂画面/中等以上素材按 references/OPENDESIGN-WORKFLOW.md 生成 brief 和 handoff",
        ],
      });
    });
  }

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    format,
    rules: {
      requiredFields: ["claim", "visualModel", "source", "motionIntent"],
      requiredDesignFields: ["compositionModel", "visualRecipe", "motionStyle", "motionTechnique", "finishLevel"],
      visualMustBindToScript: true,
      compositionMustUseStyleBenchmarks: true,
      onScreenTextMustNotDuplicateSubtitles: true,
      onScreenTextMaxPerStep: 2,
      onScreenTextMaxOpeningEnding: 3,
      subtitleOverlapAllowedOnlyForOpeningOrEndingTitle: true,
      finalRenderRequired: true,
      portraitMobileReadabilityRequired: format === "portrait",
      referenceStyleScenesAvailable: true,
      referenceVideoRecipesRequireContinuousStages: true,
      lottieAssetsMustBeLicensed: true,
      openDesignHandoffRequiredForMediumOrImportantAssets: true,
    },
    steps,
  };

  writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.error(`v wrote ${OUT_PATH} (${steps.length} steps)`);
}

main().catch((err) => {
  console.error("x " + (err.message ?? err));
  process.exit(1);
});
