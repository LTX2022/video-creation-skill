import type { ThemePresetSpec } from './types';

/**
 * Original theme identities, now bound to executable scene families.
 * All built-in content and numbers are illustrative, never customer results.
 * Historical families use CSS palette tokens. Reference films own authored SVG palettes;
 * their CSS tokens cover the surrounding stage/UI, not universal scene recoloring.
 * Technical / visual review is pending.
 */
export const PRESET_REGISTRY: Readonly<Record<string, ThemePresetSpec>> = Object.freeze({
  'dark-tech-glow': {
    id: 'dark-tech-glow', family: 'product', variant: 'interface-state-focus',
    layout: { heroSide: 'right', density: 2, subjectScale: 1.04, titleScale: 0.92, numberScale: 0.8, titleWeight: 700, corner: 'soft', rule: 'hairline', decoration: 'rays' },
    motion: { kind: 'scan', setupEnd: 0.22, transformEnd: 0.72, stagger: 0.055, travel: 0.12 },
    content: { eyebrow: '概念示例 · 界面状态', title: '让复杂操作变得清晰', subtitle: '输入与结果，沿同一路径展开', labels: ['输入', '识别', '处理', '结果'], values: [24, 42, 68, 88], unit: '演示值', conclusion: '状态可追踪，结果有停留' },
  },
  'paper-press': {
    id: 'paper-press', family: 'editorial', variant: 'warm-paper-evidence-spread',
    layout: { heroSide: 'left', density: 2, subjectScale: 0.96, titleScale: 1.04, numberScale: 1.06, titleWeight: 650, corner: 'square', rule: 'hairline', decoration: 'none' },
    motion: { kind: 'wipe', setupEnd: 0.31, transformEnd: 0.77, stagger: 0.065, travel: 0.09 },
    content: { eyebrow: '概念示例 · 纸上观察', title: '一个观点，几层证据', subtitle: '像展开一张有脉络的编辑稿', labels: ['观察', '线索', '证据', '结论'], values: [28, 44, 61, 76], unit: '演示值', conclusion: '留白不是空白，而是阅读次序' },
  },
  'swiss-ikb': {
    id: 'swiss-ikb', family: 'data', variant: 'ikb-proportional-axis',
    layout: { heroSide: 'left', density: 3, subjectScale: 1.08, titleScale: 0.86, numberScale: 1.24, titleWeight: 300, corner: 'square', rule: 'hairline', decoration: 'grid' },
    motion: { kind: 'draw', setupEnd: 0.18, transformEnd: 0.68, stagger: 0.035, travel: 0.06 },
    content: { eyebrow: '概念示例 · 比例练习', title: '让差异，回到同一尺度', subtitle: '统一基线，再比较每一个数值', labels: ['样本甲', '样本乙', '样本丙', '样本丁'], values: [32, 56, 72, 88], unit: '演示值', conclusion: '同一尺度，才能看清差异' },
  },
  'midnight-press': {
    id: 'midnight-press', family: 'editorial', variant: 'night-column-reveal',
    layout: {"heroSide": "right", "density": 1, "subjectScale": 0.91, "titleScale": 1.08, "numberScale": 1.16, "titleWeight": 600, "corner": "square", "rule": "double", "decoration": "frame"},
    motion: {"kind": "settle", "setupEnd": 0.34, "transformEnd": 0.8, "stagger": 0.075, "travel": 0.06},
    content: {"eyebrow": "概念示例 · 深夜编辑", "title": "重要的事，值得慢一点", "subtitle": "先看主线，再让细节进入", "labels": ["起点", "观察", "转折", "余韵"], "values": [18, 38, 64, 82], "unit": "演示值", "conclusion": "把信息留下，把噪声减掉"},
  },
  'newsroom': {
    id: 'newsroom', family: 'editorial', variant: 'masthead-evidence-columns',
    layout: {"heroSide": "left", "density": 3, "subjectScale": 1.05, "titleScale": 0.96, "numberScale": 1.12, "titleWeight": 750, "corner": "square", "rule": "double", "decoration": "bands"},
    motion: {"kind": "wipe", "setupEnd": 0.24, "transformEnd": 0.69, "stagger": 0.04, "travel": 0.08},
    content: {"eyebrow": "概念示例 · 编辑台", "title": "先核对事实，再形成判断", "subtitle": "标题、证据与来源保持层级", "labels": ["事实", "背景", "对照", "核验"], "values": [22, 48, 61, 80], "unit": "演示值", "conclusion": "示例只演示关系，不代表新闻事实"},
  },
  'monochrome-print': {
    id: 'monochrome-print', family: 'editorial', variant: 'quiet-margin-annotation',
    layout: {"heroSide": "right", "density": 1, "subjectScale": 0.88, "titleScale": 0.95, "numberScale": 0.92, "titleWeight": 500, "corner": "square", "rule": "hairline", "decoration": "none"},
    motion: {"kind": "draw", "setupEnd": 0.35, "transformEnd": 0.82, "stagger": 0.08, "travel": 0.04},
    content: {"eyebrow": "概念示例 · 印刷实验", "title": "少一点装饰，多一点秩序", "subtitle": "边注与正文，共享一条阅读线", "labels": ["引子", "论点", "注释", "收束"], "values": [20, 36, 54, 72], "unit": "演示值", "conclusion": "细节清楚，表达才有分寸"},
  },
  'vintage-editorial': {
    id: 'vintage-editorial', family: 'editorial', variant: 'columnist-roundel-notes',
    layout: {"heroSide": "left", "density": 2, "subjectScale": 1.0, "titleScale": 1.1, "numberScale": 0.98, "titleWeight": 650, "corner": "round", "rule": "hairline", "decoration": "dots"},
    motion: {"kind": "lift", "setupEnd": 0.29, "transformEnd": 0.75, "stagger": 0.055, "travel": 0.11},
    content: {"eyebrow": "概念示例 · 专栏练习", "title": "一条线索，牵起新理解", "subtitle": "观察从小处开始，解释逐层展开", "labels": ["发现", "追问", "联想", "解释"], "values": [26, 42, 63, 79], "unit": "演示值", "conclusion": "让观点有温度，也有依据"},
  },
  'indigo-porcelain': {
    id: 'indigo-porcelain', family: 'editorial', variant: 'porcelain-research-folio',
    layout: {"heroSide": "center", "density": 2, "subjectScale": 0.93, "titleScale": 1.02, "numberScale": 1.14, "titleWeight": 600, "corner": "square", "rule": "double", "decoration": "none"},
    motion: {"kind": "wipe", "setupEnd": 0.33, "transformEnd": 0.79, "stagger": 0.07, "travel": 0.05},
    content: {"eyebrow": "概念示例 · 研究札记", "title": "把问题，放进清晰框架", "subtitle": "定义、比较、论证与开放问题", "labels": ["定义", "比较", "论证", "问题"], "values": [16, 39, 65, 84], "unit": "演示值", "conclusion": "保留问题，才有继续探索的空间"},
  },
  'forest-ink': {
    id: 'forest-ink', family: 'editorial', variant: 'field-notes-canopy',
    layout: {"heroSide": "left", "density": 1, "subjectScale": 1.04, "titleScale": 0.98, "numberScale": 0.9, "titleWeight": 650, "corner": "soft", "rule": "hairline", "decoration": "rays"},
    motion: {"kind": "draw", "setupEnd": 0.32, "transformEnd": 0.81, "stagger": 0.072, "travel": 0.08},
    content: {"eyebrow": "概念示例 · 自然观察", "title": "从细小变化，看见联系", "subtitle": "以连续线索连接不同尺度", "labels": ["种子", "生长", "分枝", "群落"], "values": [15, 34, 58, 86], "unit": "演示值", "conclusion": "概念模型，不是生态测量"},
  },
  'kraft-paper': {
    id: 'kraft-paper', family: 'editorial', variant: 'field-envelope-ledger',
    layout: {"heroSide": "right", "density": 3, "subjectScale": 0.97, "titleScale": 1.0, "numberScale": 1.02, "titleWeight": 650, "corner": "square", "rule": "dashed", "decoration": "frame"},
    motion: {"kind": "lift", "setupEnd": 0.3, "transformEnd": 0.78, "stagger": 0.062, "travel": 0.13},
    content: {"eyebrow": "概念示例 · 手记练习", "title": "把想法收集成可读的线索", "subtitle": "草记、整理、串联，最后归档", "labels": ["草记", "筛选", "串联", "归档"], "values": [21, 41, 62, 78], "unit": "演示值", "conclusion": "思考留下痕迹，阅读找到入口"},
  },
  'dune': {
    id: 'dune', family: 'editorial', variant: 'architectural-void-study',
    layout: {"heroSide": "center", "density": 1, "subjectScale": 0.84, "titleScale": 0.9, "numberScale": 1.18, "titleWeight": 400, "corner": "square", "rule": "hairline", "decoration": "none"},
    motion: {"kind": "settle", "setupEnd": 0.38, "transformEnd": 0.84, "stagger": 0.085, "travel": 0.035},
    content: {"eyebrow": "概念示例 · 空间研究", "title": "留出空间，结构自然显现", "subtitle": "以少量线条，建立尺度与秩序", "labels": ["边界", "轴线", "体量", "空间"], "values": [18, 37, 59, 77], "unit": "演示值", "conclusion": "空间关系示意，非建筑施工图"},
  },
  'magazine-white-space': {
    id: 'magazine-white-space', family: 'editorial', variant: 'oversize-margin-feature',
    layout: {"heroSide": "left", "density": 1, "subjectScale": 0.89, "titleScale": 1.14, "numberScale": 1.06, "titleWeight": 550, "corner": "square", "rule": "hairline", "decoration": "bands"},
    motion: {"kind": "wipe", "setupEnd": 0.3, "transformEnd": 0.76, "stagger": 0.06, "travel": 0.07},
    content: {"eyebrow": "概念示例 · 专题版式", "title": "让主角成为阅读的第一眼", "subtitle": "一处重音，一条明确的阅读路径", "labels": ["主角", "背景", "细节", "观点"], "values": [24, 43, 67, 83], "unit": "演示值", "conclusion": "层级明确，内容才有呼吸"},
  },
  'electric-studio': {
    id: 'electric-studio', family: 'data', variant: 'electric-baseline-comparison',
    layout: {"heroSide": "right", "density": 2, "subjectScale": 1.06, "titleScale": 0.96, "numberScale": 1.14, "titleWeight": 750, "corner": "soft", "rule": "bold", "decoration": "bands"},
    motion: {"kind": "snap", "setupEnd": 0.2, "transformEnd": 0.66, "stagger": 0.028, "travel": 0.1},
    content: {"eyebrow": "概念示例 · 数据练习", "title": "把变化，放在同一基线上", "subtitle": "各样本使用相同单位与起点", "labels": ["样本甲", "样本乙", "样本丙", "样本丁"], "values": [30, 45, 68, 84], "unit": "演示值", "conclusion": "演示数据，不对应真实业务表现"},
  },
  'fintech-terminal': {
    id: 'fintech-terminal', family: 'data', variant: 'market-depth-readout',
    layout: {"heroSide": "left", "density": 3, "subjectScale": 1.02, "titleScale": 0.88, "numberScale": 1.2, "titleWeight": 600, "corner": "square", "rule": "hairline", "decoration": "grid"},
    motion: {"kind": "scan", "setupEnd": 0.17, "transformEnd": 0.7, "stagger": 0.032, "travel": 0.04},
    content: {"eyebrow": "概念示例 · 指标演示", "title": "波动之外，先理解尺度", "subtitle": "不预测涨跌，只演示数值阅读", "labels": ["区间甲", "区间乙", "区间丙", "区间丁"], "values": [24, 58, 43, 74], "unit": "演示值", "conclusion": "排版示例，不构成投资建议"},
  },
  'data-ops-slate': {
    id: 'data-ops-slate', family: 'data', variant: 'telemetry-lanes-focus',
    layout: {"heroSide": "right", "density": 3, "subjectScale": 1.09, "titleScale": 0.86, "numberScale": 1.0, "titleWeight": 700, "corner": "square", "rule": "hairline", "decoration": "grid"},
    motion: {"kind": "route", "setupEnd": 0.19, "transformEnd": 0.73, "stagger": 0.045, "travel": 0.07},
    content: {"eyebrow": "概念示例 · 运行观测", "title": "从多路信号，定位关键变化", "subtitle": "把输入、状态与结果放在一起", "labels": ["输入", "排队", "处理", "输出"], "values": [68, 36, 79, 92], "unit": "演示值", "conclusion": "演示读数，不代表真实服务指标"},
  },
  'creator-dashboard': {
    id: 'creator-dashboard', family: 'data', variant: 'growth-cohort-focus',
    layout: {"heroSide": "left", "density": 2, "subjectScale": 1.0, "titleScale": 0.98, "numberScale": 1.15, "titleWeight": 750, "corner": "soft", "rule": "double", "decoration": "dots"},
    motion: {"kind": "lift", "setupEnd": 0.24, "transformEnd": 0.71, "stagger": 0.045, "travel": 0.12},
    content: {"eyebrow": "概念示例 · 创作复盘", "title": "看见过程，比追逐数字重要", "subtitle": "用同一组示例观察阶段差异", "labels": ["构思", "制作", "发布", "回看"], "values": [35, 62, 80, 56], "unit": "演示值", "conclusion": "演示数值，仅用于关系说明"},
  },
  'apple-glass-studio': {
    id: 'apple-glass-studio', family: 'product', variant: 'floating-assembly-theater',
    layout: {"heroSide": "center", "density": 1, "subjectScale": 1.12, "titleScale": 0.94, "numberScale": 0.88, "titleWeight": 600, "corner": "round", "rule": "hairline", "decoration": "none"},
    motion: {"kind": "lift", "setupEnd": 0.3, "transformEnd": 0.78, "stagger": 0.06, "travel": 0.18},
    content: {"eyebrow": "概念示例 · 产品概念", "title": "轻盈外观，清楚的内部关系", "subtitle": "各层依次展开，始终保留主体", "labels": ["外壳", "界面", "连接", "核心"], "values": [22, 44, 67, 89], "unit": "演示值", "conclusion": "原创概念结构，不复刻品牌产品"},
  },
  'warm-keynote': {
    id: 'warm-keynote', family: 'product', variant: 'friendly-feature-orbit',
    layout: {"heroSide": "left", "density": 2, "subjectScale": 1.05, "titleScale": 1.02, "numberScale": 1.04, "titleWeight": 750, "corner": "round", "rule": "hairline", "decoration": "grid"},
    motion: {"kind": "settle", "setupEnd": 0.26, "transformEnd": 0.73, "stagger": 0.052, "travel": 0.14},
    content: {"eyebrow": "概念示例 · 功能演示", "title": "每个功能，都有清楚的去向", "subtitle": "由主体出发，让功能关系展开", "labels": ["入口", "工具", "协作", "输出"], "values": [27, 48, 71, 86], "unit": "演示值", "conclusion": "示意流程，不代表实际软件能力"},
  },
  'porsche-precision': {
    id: 'porsche-precision', family: 'product', variant: 'precision-offset-assembly',
    layout: {"heroSide": "right", "density": 1, "subjectScale": 1.1, "titleScale": 0.88, "numberScale": 1.18, "titleWeight": 550, "corner": "square", "rule": "double", "decoration": "frame"},
    motion: {"kind": "draw", "setupEnd": 0.25, "transformEnd": 0.75, "stagger": 0.048, "travel": 0.08},
    content: {"eyebrow": "概念示例 · 工程概念", "title": "精确，是每一层的对齐", "subtitle": "观察轮廓、连接与结构的配合", "labels": ["轮廓", "结构", "连接", "对齐"], "values": [20, 46, 64, 88], "unit": "演示值", "conclusion": "原创工程示意，非品牌技术图纸"},
  },
  'robotics-showroom': {
    id: 'robotics-showroom', family: 'product', variant: 'articulated-machine-stage',
    layout: {"heroSide": "left", "density": 3, "subjectScale": 1.08, "titleScale": 0.92, "numberScale": 0.94, "titleWeight": 700, "corner": "soft", "rule": "hairline", "decoration": "grid"},
    motion: {"kind": "route", "setupEnd": 0.23, "transformEnd": 0.74, "stagger": 0.05, "travel": 0.16},
    content: {"eyebrow": "概念示例 · 机器人概念", "title": "让关节与动作，清楚可见", "subtitle": "沿连杆观察关节与末端的位置变化", "labels": ["关节", "连杆", "末端", "目标物"], "values": [28, 52, 73, 91], "unit": "演示值", "conclusion": "概念动作模型，非真实设备参数"},
  },
  'terminal-green': {
    id: 'terminal-green', family: 'terminal', variant: 'phosphor-command-session',
    layout: {"heroSide": "left", "density": 3, "subjectScale": 1.04, "titleScale": 0.84, "numberScale": 0.92, "titleWeight": 550, "corner": "square", "rule": "hairline", "decoration": "bands"},
    motion: {"kind": "scan", "setupEnd": 0.15, "transformEnd": 0.68, "stagger": 0.025, "travel": 0.035},
    content: {"eyebrow": "概念示例 · 终端演示", "title": "一条指令，一个可追踪结果", "subtitle": "逐行呈现输入与状态，不滚屏堆字", "labels": ["输入", "解析", "执行", "返回"], "values": [18, 39, 68, 93], "unit": "演示值", "conclusion": "模拟终端会话，不执行系统命令"},
  },
  'element-clean': {
    id: 'element-clean', family: 'terminal', variant: 'clean-form-validation',
    layout: {"heroSide": "right", "density": 2, "subjectScale": 0.98, "titleScale": 0.94, "numberScale": 0.96, "titleWeight": 650, "corner": "soft", "rule": "hairline", "decoration": "none"},
    motion: {"kind": "wipe", "setupEnd": 0.22, "transformEnd": 0.72, "stagger": 0.042, "travel": 0.075},
    content: {"eyebrow": "概念示例 · 表单流程", "title": "输入之后，反馈必须明确", "subtitle": "检查、修正和确认各有位置", "labels": ["填写", "检查", "修正", "确认"], "values": [32, 54, 74, 90], "unit": "演示值", "conclusion": "概念交互，不是现成组件库截图"},
  },
  'saas-command-center': {
    id: 'saas-command-center', family: 'terminal', variant: 'operations-command-rail',
    layout: {"heroSide": "center", "density": 3, "subjectScale": 1.07, "titleScale": 0.9, "numberScale": 1.02, "titleWeight": 700, "corner": "soft", "rule": "double", "decoration": "grid"},
    motion: {"kind": "route", "setupEnd": 0.2, "transformEnd": 0.71, "stagger": 0.036, "travel": 0.06},
    content: {"eyebrow": "概念示例 · 系统演示", "title": "让每次交接，都有明确状态", "subtitle": "任务沿处理链推进，结果保持可读", "labels": ["接收", "校验", "调度", "完成"], "values": [25, 49, 72, 94], "unit": "演示值", "conclusion": "演示任务与状态，不接入真实系统"},
  },
  'ai-orchestration': {
    id: 'ai-orchestration', family: 'node', variant: 'agent-handoff-swimlane',
    layout: {"heroSide": "left", "density": 3, "subjectScale": 1.08, "titleScale": 0.9, "numberScale": 0.92, "titleWeight": 650, "corner": "soft", "rule": "hairline", "decoration": "grid"},
    motion: {"kind": "route", "setupEnd": 0.21, "transformEnd": 0.76, "stagger": 0.055, "travel": 0.12},
    content: {"eyebrow": "概念示例 · 编排概念", "title": "一次任务，清晰地交给下一环", "subtitle": "连接代表依赖，移动代表交接", "labels": ["请求", "规划", "工具", "答复"], "values": [22, 45, 69, 90], "unit": "演示值", "conclusion": "概念编排图，不保证实际智能体能力"},
  },
  'houdini-node-lab': {
    id: 'houdini-node-lab', family: 'node', variant: 'procedural-operator-chain',
    layout: {"heroSide": "right", "density": 3, "subjectScale": 1.1, "titleScale": 0.86, "numberScale": 0.9, "titleWeight": 650, "corner": "square", "rule": "hairline", "decoration": "dots"},
    motion: {"kind": "route", "setupEnd": 0.18, "transformEnd": 0.74, "stagger": 0.048, "travel": 0.1},
    content: {"eyebrow": "概念示例 · 节点概念", "title": "结果不是贴上去，而是生成出来", "subtitle": "沿节点顺序观察形态变化", "labels": ["源形", "采样", "变换", "输出"], "values": [24, 42, 67, 87], "unit": "演示值", "conclusion": "原创程序化示意，非软件操作截图"},
  },
  'quantum-interface': {
    id: 'quantum-interface', family: 'node', variant: 'state-space-orbit',
    layout: {"heroSide": "center", "density": 1, "subjectScale": 1.04, "titleScale": 0.92, "numberScale": 1.12, "titleWeight": 450, "corner": "round", "rule": "hairline", "decoration": "rays"},
    motion: {"kind": "pulse", "setupEnd": 0.31, "transformEnd": 0.81, "stagger": 0.075, "travel": 0.07},
    content: {"eyebrow": "概念示例 · 尺度示意", "title": "从局部状态，观察整体关系", "subtitle": "连线表达概念关联，不是物理测量", "labels": ["状态甲", "状态乙", "状态丙", "观测"], "values": [30, 49, 65, 82], "unit": "演示值", "conclusion": "抽象关系示例，不是量子物理仿真"},
  },
  'procedural-vfx': {
    id: 'procedural-vfx', family: 'node', variant: 'branching-effect-chain',
    layout: {"heroSide": "left", "density": 2, "subjectScale": 1.12, "titleScale": 0.96, "numberScale": 0.94, "titleWeight": 700, "corner": "square", "rule": "dashed", "decoration": "grid"},
    motion: {"kind": "draw", "setupEnd": 0.2, "transformEnd": 0.77, "stagger": 0.062, "travel": 0.14},
    content: {"eyebrow": "概念示例 · 特效概念", "title": "一道变化，沿规则逐层展开", "subtitle": "少量输入，经连续规则形成结果", "labels": ["源点", "规则", "扰动", "形态"], "values": [20, 43, 72, 91], "unit": "演示值", "conclusion": "程序化图形示例，非真实特效缓存"},
  },
  'blueprint': {
    id: 'blueprint', family: 'blueprint', variant: 'orthographic-dimension-study',
    layout: {"heroSide": "left", "density": 3, "subjectScale": 1.08, "titleScale": 0.88, "numberScale": 1.05, "titleWeight": 550, "corner": "square", "rule": "dashed", "decoration": "grid"},
    motion: {"kind": "draw", "setupEnd": 0.23, "transformEnd": 0.77, "stagger": 0.045, "travel": 0.05},
    content: {"eyebrow": "概念示例 · 制图练习", "title": "看见结构，也看见尺度", "subtitle": "轮廓先建立，尺寸与标注随后展开", "labels": ["轮廓", "轴线", "尺寸", "剖面"], "values": [25, 48, 70, 86], "unit": "演示值", "conclusion": "示意尺寸，无工程制造效力"},
  },
  'science-diagram': {
    id: 'science-diagram', family: 'blueprint', variant: 'cause-section-annotation',
    layout: {"heroSide": "right", "density": 2, "subjectScale": 1.04, "titleScale": 0.96, "numberScale": 0.96, "titleWeight": 650, "corner": "soft", "rule": "hairline", "decoration": "dots"},
    motion: {"kind": "draw", "setupEnd": 0.28, "transformEnd": 0.78, "stagger": 0.06, "travel": 0.08},
    content: {"eyebrow": "概念示例 · 科学图解", "title": "看清发生了什么，再解释为什么", "subtitle": "从整体轮廓进入关键关系", "labels": ["整体", "局部", "作用", "结果"], "values": [23, 44, 65, 88], "unit": "演示值", "conclusion": "概念图解，不替代实验数据"},
  },
  'medical-clean-room': {
    id: 'medical-clean-room', family: 'blueprint', variant: 'neutral-layered-structure',
    layout: {"heroSide": "center", "density": 2, "subjectScale": 0.96, "titleScale": 0.92, "numberScale": 0.9, "titleWeight": 650, "corner": "round", "rule": "hairline", "decoration": "none"},
    motion: {"kind": "route", "setupEnd": 0.3, "transformEnd": 0.8, "stagger": 0.065, "travel": 0.055},
    content: {"eyebrow": "概念示例 · 通用结构", "title": "把结构分层，讲得清楚一点", "subtitle": "中性几何结构，不指代真实器官或诊疗", "labels": ["第一层", "第二层", "第三层", "整体"], "values": [25, 47, 66, 82], "unit": "演示值", "conclusion": "通用分层示意，非解剖模型或诊疗建议"},
  },
  'chalk-garden': {
    id: 'chalk-garden', family: 'lesson', variant: 'chalk-causal-branch',
    layout: {"heroSide": "left", "density": 2, "subjectScale": 1.02, "titleScale": 1.0, "numberScale": 1.0, "titleWeight": 600, "corner": "round", "rule": "dashed", "decoration": "dots"},
    motion: {"kind": "draw", "setupEnd": 0.27, "transformEnd": 0.78, "stagger": 0.07, "travel": 0.08},
    content: {"eyebrow": "概念示例 · 板书练习", "title": "顺着一条线，把道理讲明白", "subtitle": "先提出问题，再让关系逐步形成", "labels": ["问题", "观察", "推理", "解释"], "values": [20, 41, 65, 83], "unit": "演示值", "conclusion": "每一步，都能回到前一个原因"},
  },
  'campus-blackboard-pro': {
    id: 'campus-blackboard-pro', family: 'lesson', variant: 'structured-board-proof',
    layout: {"heroSide": "right", "density": 3, "subjectScale": 1.05, "titleScale": 0.94, "numberScale": 0.98, "titleWeight": 700, "corner": "square", "rule": "double", "decoration": "grid"},
    motion: {"kind": "draw", "setupEnd": 0.24, "transformEnd": 0.76, "stagger": 0.056, "travel": 0.065},
    content: {"eyebrow": "概念示例 · 课堂示例", "title": "把推理过程，留在同一块板上", "subtitle": "保留已知条件，再揭示下一步关系", "labels": ["已知", "推导", "验证", "小结"], "values": [24, 45, 68, 87], "unit": "演示值", "conclusion": "示例推理结构，不代替具体课程论证"},
  },
  'course-studio': {
    id: 'course-studio', family: 'lesson', variant: 'guided-example-workbench',
    layout: {"heroSide": "left", "density": 2, "subjectScale": 1.0, "titleScale": 1.02, "numberScale": 1.06, "titleWeight": 700, "corner": "soft", "rule": "hairline", "decoration": "bands"},
    motion: {"kind": "wipe", "setupEnd": 0.25, "transformEnd": 0.73, "stagger": 0.05, "travel": 0.11},
    content: {"eyebrow": "概念示例 · 课程示例", "title": "先做一遍，再理解为什么", "subtitle": "一个对象贯穿示范、拆解和复盘", "labels": ["示范", "拆解", "练习", "复盘"], "values": [28, 48, 73, 90], "unit": "演示值", "conclusion": "节奏服务理解，而不是赶完步骤"},
  },
  'practical-skill': {
    id: 'practical-skill', family: 'lesson', variant: 'task-result-guided-path',
    layout: {"heroSide": "right", "density": 2, "subjectScale": 1.07, "titleScale": 1.06, "numberScale": 0.95, "titleWeight": 800, "corner": "soft", "rule": "bold", "decoration": "none"},
    motion: {"kind": "snap", "setupEnd": 0.18, "transformEnd": 0.67, "stagger": 0.035, "travel": 0.13},
    content: {"eyebrow": "概念示例 · 操作示例", "title": "少绕一步，把结果做清楚", "subtitle": "从目标出发，只保留必要动作", "labels": ["目标", "输入", "操作", "结果"], "values": [30, 51, 76, 93], "unit": "演示值", "conclusion": "模拟操作流程，不执行真实任务"},
  },
  'dark-botanical': {
    id: 'dark-botanical', family: 'gallery', variant: 'botanical-silhouette-study',
    layout: {"heroSide": "left", "density": 1, "subjectScale": 1.1, "titleScale": 0.96, "numberScale": 0.86, "titleWeight": 550, "corner": "round", "rule": "hairline", "decoration": "rays"},
    motion: {"kind": "settle", "setupEnd": 0.36, "transformEnd": 0.84, "stagger": 0.08, "travel": 0.06},
    content: {"eyebrow": "概念示例 · 形态研究", "title": "让细节，在安静中出现", "subtitle": "观察轮廓、分枝与空间的平衡", "labels": ["轮廓", "分枝", "纹理", "留白"], "values": [18, 37, 60, 79], "unit": "演示值", "conclusion": "原创形态示意，不是实拍植物标本"},
  },
  'atelier-gallery': {
    id: 'atelier-gallery', family: 'gallery', variant: 'museum-object-caption-rail',
    layout: {"heroSide": "right", "density": 1, "subjectScale": 1.06, "titleScale": 0.9, "numberScale": 0.9, "titleWeight": 450, "corner": "square", "rule": "hairline", "decoration": "none"},
    motion: {"kind": "lift", "setupEnd": 0.34, "transformEnd": 0.82, "stagger": 0.075, "travel": 0.1},
    content: {"eyebrow": "概念示例 · 展陈概念", "title": "把目光，交还给作品本身", "subtitle": "主体、尺度与短注释各有空间", "labels": ["主体", "比例", "细节", "注释"], "values": [24, 42, 64, 84], "unit": "演示值", "conclusion": "原创展陈示意，无真实作品出处主张"},
  },
  'luxury-watch-black': {
    id: 'luxury-watch-black', family: 'gallery', variant: 'radial-calibration-object',
    layout: {"heroSide": "center", "density": 1, "subjectScale": 1.14, "titleScale": 0.86, "numberScale": 1.15, "titleWeight": 500, "corner": "round", "rule": "double", "decoration": "rays"},
    motion: {"kind": "draw", "setupEnd": 0.35, "transformEnd": 0.83, "stagger": 0.07, "travel": 0.045},
    content: {"eyebrow": "概念示例 · 精密物件", "title": "让每一处刻度，都有理由", "subtitle": "从圆周、指向到结构细节", "labels": ["轮廓", "刻度", "指向", "细节"], "values": [20, 40, 60, 80], "unit": "演示值", "conclusion": "原创仪器意象，不是品牌腕表复刻"},
  },
  'history-museum': {
    id: 'history-museum', family: 'gallery', variant: 'artifact-provenance-display',
    layout: {"heroSide": "left", "density": 2, "subjectScale": 0.99, "titleScale": 1.04, "numberScale": 1.1, "titleWeight": 600, "corner": "square", "rule": "double", "decoration": "frame"},
    motion: {"kind": "wipe", "setupEnd": 0.32, "transformEnd": 0.8, "stagger": 0.068, "travel": 0.07},
    content: {"eyebrow": "概念示例 · 展柜示意", "title": "让一件物品，展开一段线索", "subtitle": "物件、年代与说明彼此对应", "labels": ["物件", "材质", "线索", "语境"], "values": [22, 43, 66, 85], "unit": "演示值", "conclusion": "虚构展陈示例，不作历史事实陈述"},
  },
  'documentary-archive': {
    id: 'documentary-archive', family: 'archive', variant: 'document-trace-timeline',
    layout: {"heroSide": "left", "density": 3, "subjectScale": 1.07, "titleScale": 0.98, "numberScale": 1.0, "titleWeight": 650, "corner": "square", "rule": "dashed", "decoration": "frame"},
    motion: {"kind": "scan", "setupEnd": 0.26, "transformEnd": 0.79, "stagger": 0.06, "travel": 0.12},
    content: {"eyebrow": "概念示例 · 档案练习", "title": "沿着证据，重新理解时间", "subtitle": "标记来源与顺序，不制造确定结论", "labels": ["线索甲", "线索乙", "对照", "待核验"], "values": [24, 43, 67, 86], "unit": "演示值", "conclusion": "虚构档案版式，不对应真实事件"},
  },
  'cinema-title-card': {
    id: 'cinema-title-card', family: 'archive', variant: 'cinematic-time-aperture',
    layout: {"heroSide": "center", "density": 1, "subjectScale": 1.12, "titleScale": 1.08, "numberScale": 0.9, "titleWeight": 450, "corner": "square", "rule": "hairline", "decoration": "bands"},
    motion: {"kind": "settle", "setupEnd": 0.38, "transformEnd": 0.85, "stagger": 0.085, "travel": 0.045},
    content: {"eyebrow": "概念示例 · 影像概念", "title": "在转折出现之前，留一点时间", "subtitle": "由遮罩揭示同一标题，再回到稳定的阅读位置", "labels": ["序章", "经过", "转折", "余声"], "values": [18, 39, 61, 84], "unit": "演示值", "conclusion": "原创文字片头示例，不代表真实影视作品"},
  },
  'bold-signal': {
    id: 'bold-signal', family: 'kinetic', variant: 'signal-block-inheritance',
    layout: {"heroSide": "left", "density": 1, "subjectScale": 1.16, "titleScale": 1.1, "numberScale": 1.18, "titleWeight": 900, "corner": "square", "rule": "bold", "decoration": "bands"},
    motion: {"kind": "snap", "setupEnd": 0.14, "transformEnd": 0.64, "stagger": 0.024, "travel": 0.22},
    content: {"eyebrow": "概念示例 · 观点演示", "title": "先看见重点，再看懂关系", "subtitle": "一个形状持续变化，不用装饰抢戏", "labels": ["出现", "聚焦", "变化", "保留"], "values": [20, 44, 70, 92], "unit": "演示值", "conclusion": "强表达，也要有清楚的阅读停留"},
  },
  'bauhaus-bold': {
    id: 'bauhaus-bold', family: 'kinetic', variant: 'geometric-primary-balance',
    layout: {"heroSide": "right", "density": 2, "subjectScale": 1.1, "titleScale": 1.02, "numberScale": 1.12, "titleWeight": 900, "corner": "square", "rule": "bold", "decoration": "frame"},
    motion: {"kind": "draw", "setupEnd": 0.19, "transformEnd": 0.68, "stagger": 0.04, "travel": 0.16},
    content: {"eyebrow": "概念示例 · 几何实验", "title": "让形状，自己说清楚关系", "subtitle": "圆、线与方块，共享明确的秩序", "labels": ["圆点", "轴线", "平面", "平衡"], "values": [28, 49, 72, 90], "unit": "演示值", "conclusion": "原创几何构成，不复刻既有海报"},
  },
  'creative-voltage': {
    id: 'creative-voltage', family: 'kinetic', variant: 'diagonal-cutout-energy',
    layout: {"heroSide": "left", "density": 3, "subjectScale": 1.14, "titleScale": 1.12, "numberScale": 1.05, "titleWeight": 850, "corner": "square", "rule": "dashed", "decoration": "dots"},
    motion: {"kind": "wipe", "setupEnd": 0.16, "transformEnd": 0.66, "stagger": 0.03, "travel": 0.24},
    content: {"eyebrow": "概念示例 · 创意实验", "title": "把能量，集中到一个方向", "subtitle": "切分、对齐与重组，让视线有去向", "labels": ["切分", "错位", "重组", "成形"], "values": [22, 48, 73, 95], "unit": "演示值", "conclusion": "运动表达结构，不是随机抖动"},
  },
  'neon-cyber': {
    id: 'neon-cyber', family: 'kinetic', variant: 'neon-axis-lock',
    layout: {"heroSide": "center", "density": 2, "subjectScale": 1.08, "titleScale": 1.04, "numberScale": 1.16, "titleWeight": 800, "corner": "square", "rule": "double", "decoration": "grid"},
    motion: {"kind": "scan", "setupEnd": 0.18, "transformEnd": 0.7, "stagger": 0.038, "travel": 0.18},
    content: {"eyebrow": "概念示例 · 未来界面", "title": "光有方向，信息才有层次", "subtitle": "从游离状态进入明确的结构", "labels": ["信号", "捕捉", "对齐", "锁定"], "values": [26, 45, 69, 88], "unit": "演示值", "conclusion": "原创界面意象，不是实时数据"},
  },
  'creator-neon-grid': {
    id: 'creator-neon-grid', family: 'kinetic', variant: 'creator-remix-grid',
    layout: {"heroSide": "right", "density": 3, "subjectScale": 1.06, "titleScale": 1.08, "numberScale": 1.1, "titleWeight": 850, "corner": "soft", "rule": "bold", "decoration": "grid"},
    motion: {"kind": "snap", "setupEnd": 0.17, "transformEnd": 0.65, "stagger": 0.03, "travel": 0.2},
    content: {"eyebrow": "概念示例 · 创作实验", "title": "从一处灵感，长出完整结构", "subtitle": "保留主角，让次要元素跟随关系", "labels": ["灵感", "选择", "编排", "表达"], "values": [24, 46, 71, 91], "unit": "演示值", "conclusion": "概念创作流程，数值无业务含义"},
  },
  'douyin-high-contrast': {
    id: 'douyin-high-contrast', family: 'kinetic', variant: 'vertical-impact-to-proof',
    layout: {"heroSide": "left", "density": 1, "subjectScale": 1.18, "titleScale": 1.14, "numberScale": 1.2, "titleWeight": 900, "corner": "square", "rule": "bold", "decoration": "none"},
    motion: {"kind": "snap", "setupEnd": 0.12, "transformEnd": 0.61, "stagger": 0.02, "travel": 0.26},
    content: {"eyebrow": "概念示例 · 短视频示例", "title": "重点，不需要挤满屏幕", "subtitle": "用一次清楚的变化，回答一个问题", "labels": ["问题", "变化", "对照", "答案"], "values": [30, 48, 76, 92], "unit": "演示值", "conclusion": "保留阅读时间，不靠快速闪烁制造刺激"},
  },
  'ferrari-rosso-corsa': {
    id: 'ferrari-rosso-corsa', family: 'kinetic', variant: 'speed-ribbon-convergence',
    layout: {"heroSide": "right", "density": 2, "subjectScale": 1.13, "titleScale": 1.0, "numberScale": 1.17, "titleWeight": 850, "corner": "square", "rule": "double", "decoration": "bands"},
    motion: {"kind": "wipe", "setupEnd": 0.16, "transformEnd": 0.67, "stagger": 0.032, "travel": 0.23},
    content: {"eyebrow": "概念示例 · 速度意象", "title": "速度，也需要清楚的方向", "subtitle": "线条收束到主体，展示推进关系", "labels": ["起步", "推进", "收束", "到达"], "values": [18, 43, 72, 96], "unit": "演示值", "conclusion": "原创速度示意，不是品牌性能数据"},
  },
  'podcast-wave-studio': {
    id: 'podcast-wave-studio', family: 'audio', variant: 'conversation-wave-window',
    layout: {"heroSide": "left", "density": 2, "subjectScale": 1.07, "titleScale": 0.98, "numberScale": 0.95, "titleWeight": 650, "corner": "round", "rule": "hairline", "decoration": "bands"},
    motion: {"kind": "pulse", "setupEnd": 0.28, "transformEnd": 0.79, "stagger": 0.065, "travel": 0.08},
    content: {"eyebrow": "概念示例 · 音频意象", "title": "让一句话，有可以停留的空间", "subtitle": "示意波形只表达节奏，不绑定真实音频", "labels": ["倾听", "回应", "停顿", "共鸣"], "values": [25, 55, 37, 73], "unit": "演示值", "conclusion": "合成示意波形，非音频同步或声学分析"},
  },
  'pastel-dream': {
    id: 'pastel-dream', family: 'soft', variant: 'gentle-guided-ribbon',
    layout: {"heroSide": "left", "density": 1, "subjectScale": 0.98, "titleScale": 1.04, "numberScale": 0.92, "titleWeight": 650, "corner": "round", "rule": "hairline", "decoration": "dots"},
    motion: {"kind": "settle", "setupEnd": 0.31, "transformEnd": 0.79, "stagger": 0.07, "travel": 0.12},
    content: {"eyebrow": "概念示例 · 友好引导", "title": "一步一步，把陌生变熟悉", "subtitle": "每次只出现恰好需要的提示", "labels": ["初见", "尝试", "理解", "熟悉"], "values": [24, 43, 65, 84], "unit": "演示值", "conclusion": "友好不等于幼稚，轻柔也要清楚"},
  },
  'split-canvas': {
    id: 'split-canvas', family: 'soft', variant: 'dual-field-comparison',
    layout: {"heroSide": "center", "density": 2, "subjectScale": 1.06, "titleScale": 1.02, "numberScale": 1.0, "titleWeight": 700, "corner": "soft", "rule": "double", "decoration": "bands"},
    motion: {"kind": "wipe", "setupEnd": 0.24, "transformEnd": 0.73, "stagger": 0.05, "travel": 0.18},
    content: {"eyebrow": "概念示例 · 双区练习", "title": "把不同，放在可以比较的位置", "subtitle": "两侧内容共享同一条关系线", "labels": ["之前", "观察", "调整", "之后"], "values": [25, 42, 67, 85], "unit": "演示值", "conclusion": "示例只呈现关系，不宣称真实改善结果"},
  },
  'sunset-zine': {
    id: 'sunset-zine', family: 'soft', variant: 'cut-paper-organic-collage',
    layout: {"heroSide": "right", "density": 2, "subjectScale": 1.02, "titleScale": 1.1, "numberScale": 0.96, "titleWeight": 700, "corner": "soft", "rule": "dashed", "decoration": "dots"},
    motion: {"kind": "lift", "setupEnd": 0.28, "transformEnd": 0.76, "stagger": 0.062, "travel": 0.16},
    content: {"eyebrow": "概念示例 · 小刊实验", "title": "把零散片段，拼成自己的表达", "subtitle": "拼贴保留差异，也建立阅读次序", "labels": ["收集", "筛选", "拼合", "成稿"], "values": [23, 45, 64, 83], "unit": "演示值", "conclusion": "原创排版示意，不借用现成刊物素材"},
  },
  'soft-neu': {
    id: 'soft-neu', family: 'soft', variant: 'tactile-control-feedback',
    layout: {"heroSide": "center", "density": 1, "subjectScale": 1.0, "titleScale": 0.96, "numberScale": 1.04, "titleWeight": 650, "corner": "round", "rule": "hairline", "decoration": "none"},
    motion: {"kind": "settle", "setupEnd": 0.32, "transformEnd": 0.8, "stagger": 0.075, "travel": 0.09},
    content: {"eyebrow": "概念示例 · 触感界面", "title": "一次轻触，得到明确反馈", "subtitle": "轮廓和状态变化，比阴影更重要", "labels": ["触达", "响应", "调整", "确认"], "values": [27, 46, 68, 86], "unit": "演示值", "conclusion": "概念控件，不保证真实交互功能"},
  },
  'xiaohongshu-premium': {
    id: 'xiaohongshu-premium', family: 'soft', variant: 'lifestyle-detail-curation',
    layout: {"heroSide": "left", "density": 1, "subjectScale": 1.04, "titleScale": 1.08, "numberScale": 0.94, "titleWeight": 600, "corner": "round", "rule": "hairline", "decoration": "frame"},
    motion: {"kind": "lift", "setupEnd": 0.3, "transformEnd": 0.78, "stagger": 0.068, "travel": 0.11},
    content: {"eyebrow": "概念示例 · 生活方式示例", "title": "把值得留意的细节，慢慢展开", "subtitle": "主角清楚，注释克制，步骤可读", "labels": ["选择", "观察", "搭配", "记录"], "values": [24, 44, 63, 82], "unit": "演示值", "conclusion": "概念内容，不是商品推荐或使用功效"},
  },
  'uxbot-product-lab': {
    id: 'uxbot-product-lab', family: 'soft', variant: 'research-loop-evidence',
    layout: {"heroSide": "right", "density": 3, "subjectScale": 1.05, "titleScale": 0.94, "numberScale": 0.98, "titleWeight": 700, "corner": "soft", "rule": "hairline", "decoration": "grid"},
    motion: {"kind": "route", "setupEnd": 0.22, "transformEnd": 0.75, "stagger": 0.052, "travel": 0.14},
    content: {"eyebrow": "概念示例 · 研究流程", "title": "让设计判断，接得住证据", "subtitle": "从问题出发，回到可检验的假设", "labels": ["问题", "访谈", "假设", "验证"], "values": [25, 47, 70, 88], "unit": "演示值", "conclusion": "概念研究路径，不是用户测试结果"},
  },
  'taste-skill-neo': {
    id: 'taste-skill-neo', family: 'soft', variant: 'design-criteria-orbit',
    layout: {"heroSide": "left", "density": 2, "subjectScale": 1.09, "titleScale": 1.0, "numberScale": 1.02, "titleWeight": 750, "corner": "soft", "rule": "double", "decoration": "rays"},
    motion: {"kind": "draw", "setupEnd": 0.26, "transformEnd": 0.77, "stagger": 0.06, "travel": 0.1},
    content: {"eyebrow": "概念示例 · 设计复盘", "title": "说清为什么，而不只说好看", "subtitle": "结构、层级与节奏形成可讨论的依据", "labels": ["结构", "层级", "节奏", "判断"], "values": [28, 46, 68, 87], "unit": "演示值", "conclusion": "示意评价维度，不宣称审美合格"},
  },
  'bootstrap-marketplace': {
    id: 'bootstrap-marketplace', family: 'soft', variant: 'catalog-selection-path',
    layout: {"heroSide": "right", "density": 3, "subjectScale": 1.03, "titleScale": 0.96, "numberScale": 1.08, "titleWeight": 750, "corner": "soft", "rule": "hairline", "decoration": "grid"},
    motion: {"kind": "wipe", "setupEnd": 0.21, "transformEnd": 0.72, "stagger": 0.044, "travel": 0.15},
    content: {"eyebrow": "概念示例 · 目录演示", "title": "先建立标准，再做出选择", "subtitle": "用清楚的关系比较几种候选方案", "labels": ["需求", "候选", "比较", "选择"], "values": [26, 49, 71, 89], "unit": "演示值", "conclusion": "虚构目录，不代表真实商品或报价"},
  },
  'particle-depth-film': {
    id: 'particle-depth-film', family: 'reference', variant: 'particle-depth',
    layout: { heroSide: 'center', density: 1, subjectScale: 1, titleScale: 1, numberScale: 1, titleWeight: 500, corner: 'square', rule: 'hairline', decoration: 'none' },
    motion: { kind: 'route', setupEnd: 0.18, transformEnd: 0.64, stagger: 0.04, travel: 0.1 },
    content: {"eyebrow": "概念示例 · 微光成场", "title": "微光，汇成深度", "subtitle": "同一批粒子经过聚拢、流动与空间展开", "labels": ["散点", "聚拢", "流动", "深度"], "conclusion": "每一道微光，都留下来路"},
  },
  'spectral-material-film': {
    id: 'spectral-material-film', family: 'reference', variant: 'spectral-material',
    layout: { heroSide: 'center', density: 1, subjectScale: 1, titleScale: 1, numberScale: 1, titleWeight: 500, corner: 'square', rule: 'hairline', decoration: 'none' },
    motion: { kind: 'lift', setupEnd: 0.15, transformEnd: 0.86, stagger: 0.04, travel: 0.1 },
    content: {"eyebrow": "概念示例 · 形与材质", "title": "同一形，不同质感", "subtitle": "同一轮廓经历平涂、纸面与线版的连续转换", "labels": ["轮廓", "平涂", "纸面", "线版"], "conclusion": "轮廓不变，触感可以不同"},
  },
  'kinetic-wireframe-film': {
    id: 'kinetic-wireframe-film', family: 'reference', variant: 'kinetic-wireframe',
    layout: { heroSide: 'center', density: 1, subjectScale: 1, titleScale: 1, numberScale: 1, titleWeight: 500, corner: 'square', rule: 'hairline', decoration: 'none' },
    motion: { kind: 'snap', setupEnd: 0.15, transformEnd: 0.86, stagger: 0.04, travel: 0.1 },
    content: {"eyebrow": "概念示例 · 动势结构", "title": "从字母，走向空间", "subtitle": "同一个字母 A 从平面轮廓伸展成空间线框", "labels": ["字母", "挤出", "旋转", "线框"], "conclusion": "同一轮廓，多一个维度"},
  },
  'rain-platform-film': {
    id: 'rain-platform-film', family: 'reference', variant: 'rain-platform',
    layout: { heroSide: 'center', density: 1, subjectScale: 1, titleScale: 1, numberScale: 1, titleWeight: 500, corner: 'square', rule: 'hairline', decoration: 'none' },
    motion: { kind: 'settle', setupEnd: 0.19, transformEnd: 0.79, stagger: 0.04, travel: 0.1 },
    content: {"eyebrow": "概念示例 · 雨夜站台", "title": "雨夜，仍有一束光", "subtitle": "列车靠站，旅人撑伞走近，在门前停下", "labels": ["雨线", "列车", "旅人", "车门"], "conclusion": "在等待里，看见时间经过"},
  },
});

export function getPreset(id: string): ThemePresetSpec {
  if (!Object.hasOwn(PRESET_REGISTRY, id)) throw new Error(`Unknown theme preset: ${id}`);
  return PRESET_REGISTRY[id]!;
}
