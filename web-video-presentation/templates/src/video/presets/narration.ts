import { getPreset } from './registry';
import type { PresetContent, PresetFamily } from './types';

/** Shared with the cinema renderer: inventory includes every phase, not just currently visible text. */
export function cinemaTitleText(content: Pick<PresetContent,'title'|'eyebrow'|'conclusion'>) {
  const study = 'AN ORIGINAL TITLE STUDY';
  const moving = '遮罩揭示 · 同一文字对象', held = '片名停留 · 留出阅读时间';
  const phases = {setup:'01 / SET', transform:'02 / ACT', hold:'03 / HOLD'};
  return {study, status:(phase:string)=>phase==='hold'?held:moving,
    phase:(phase:string)=>phase==='hold'?phases.hold:phase==='transform'?phases.transform:phases.setup,
    all:[content.eyebrow,content.title,study,moving,held,content.conclusion,...Object.values(phases)]};
}

export interface PresetShotMetadata {
  presetId: string;
  presetFamily: string;
  presetVariant: string;
  visualModel: string;
  compositionModel: string;
  visualRecipe: string;
  motionStyle: string;
  motionTechnique: string;
  motionIntent: string;
  visualStages: string[];
  onScreenText: string[];
  source: string;
  screenTextIntent: 'labels';
}
const actions:Record<PresetFamily,readonly[string,string,string]>={
  editorial:['先建立一份原始材料，让标题、摘录和边注拥有各自的位置。','标注沿材料逐步展开，连线将观察与依据接起来，不把证据画成任意数值。','保留这份已展开的证据稿，沿连接关系回看材料与论点。'],
  data:['先建立比较的坐标或分类次序。这里的数值都是演示数据，不代表真实结果。','让示例图形沿同一尺度变化；矩阵中的亮度只表达演示进度，不冒充实时状态。','保持最终图形与标注，确认读者能看懂比较依据和量的含义。'],
  product:['先把主体和它的部件放在同一观察空间，区分主对象与注释。','主体的状态或部件关系逐步变化；保留对象身份，便于追踪变化。','停留在最终结构，让部件位置与标注可以一起复核。'],
  terminal:['先呈现当前输入或任务状态，把可操作对象与辅助信息分开。','按既定次序推进输入检查、处理或状态记录，避免用装饰代替过程。','保留最后的确认状态；这是演示界面，不是真实系统执行记录。'],
  node:['先建立需要连接的对象和起点，明确它们属于同一个概念模型。','信号、连接或对象位置沿既定路径推进，结果由同一状态变化产生。','保留最终关系供阅读；这里演示关系结构，不代表真实系统运行。'],
  blueprint:['先观察中性的几何结构，建立轮廓与标注参照。','结构层次、测量线或轨道关系逐步展开，标注跟随对应对象。','保持分解后的关系，供读者对照；示意图不是真实工程或医学测量。'],
  lesson:['先给出完整的问题或操作对象，确定这一段要理解的关系。','沿明确次序展开推导或操作，同一对象的变化承接前一个状态。','保留最终结果并回看前面的关键步骤，不用新图标替换整个推理。'],
  gallery:['先建立一个独立的主体，让轮廓、比例与留白形成观察空间。','细部、曲面或刻度关系逐步显现，变化不打断主体身份。','让主体停留，观察边线与细部；这是一件原创概念形体。'],
  archive:['先呈现一份可辨认的原始材料，把来源和细节分层。','材料展开，连接线追踪其中的线索，阅读顺序保持明确。','保留可追溯的材料关系；画面是档案结构练习，不是真实历史证据。'],
  kinetic:['先用一个由圆环构成的字母O建立短词中的视觉焦点。','同一个圆环离开词组并继续成为结构中的对象，其他几何围绕它形成关系。','停留在变化后的结构；这里是矢量字形对象的延续，不是任意字形自动变换。'],
  audio:['先建立声音主题的主体与时间参照。这里没有输入真实音频。','示意波形随固定帧时间展开，只用于展示节奏布局，不宣称语音或频谱分析。','保留波形与说明，让观众分清演示图形和真实音频证据。'],
  reference:['先建立场景与主体。','同一场景中的形体、光线或关系连续推进。','保留最后状态与必要的说明。'],
  soft:['先建立稳定的主体和阅读起点，给各部分留出清楚的位置。','让分组、路径、对齐或观察视角逐步建立，变化仍围绕同一批对象。','停留在完成后的关系，让图形与短标签共同解释结果。'],
};
const categories:Record<PresetFamily,readonly[string,string,string]>={
  editorial:['motion-graphic-lab','source-to-output-demo','warm-grain'],data:['metric-strip','nyt-graph-reveal','nyt-data-story'],
  product:['product-gallery','product-feature-flythrough','product-promo'],terminal:['motion-graphic-lab','source-to-output-demo','swiss-grid'],
  node:['relationship-map','node-graph-build','decision-tree'],blueprint:['motion-graphic-lab','source-to-output-demo','shape-system'],
  lesson:['motion-graphic-lab','source-to-output-demo','swiss-grid'],gallery:['hero-theater','product-feature-flythrough','shape-system'],
  archive:['timeline-stage','timeline-stack','warm-grain'],kinetic:['hero-theater','source-to-output-demo','kinetic-type'],
  reference:['hero-theater','source-to-output-demo','shape-system'],
  audio:['audiogram-waveform','podcast-waveform-frame','podcast-frame'],soft:['motion-graphic-lab','source-to-output-demo','shape-system'],
};
/** Authored film scripts describe visible geometry, not inferred results or generic legacy flow. */
const referencePlans:Record<string,{
  component:string; narrations:[string,string,string]; stages:[string,string,string];
  composition:string; recipe:string; motion:string; techniques:[string,string,string]; labels:string[];
}>={
  'particle-depth-film':{
    component:'ParticleField',
    narrations:['先看分布在不同深度的微光；这些点拥有固定身份，不是逐帧换一批粒子。','同一组微光沿连续路径聚拢，逐渐形成有折叠与纵深的光带。','光带保持形态，细小高光沿表面延续；这是确定性图形，不是物理粒子测量。'],
    stages:['散布的深度光场','同一批粒子汇成折叠光带','稳定光带与表面余光'],composition:'spatial-3d-stage',recipe:'source-to-output-demo',motion:'three-depth',techniques:['01-fade-opacity','04-slide-move','01-fade-opacity'],labels:[],
  },
  'spectral-material-film':{
    component:'SpectralMaterial',
    narrations:['先观察一个橙色平涂形体，记住它的同一条轮廓。','纸面质感扫过轮廓，随后线条与网点进入；变化的是材质，不是更换主体。','让最终线版形态停留，回看同一轮廓的不同触感；这里使用程序化矢量近似。'],
    stages:['平涂轮廓保持','纸面、线版材质连续扫入','线版质感与同形保持'],composition:'hero-theater',recipe:'source-to-output-demo',motion:'shape-system',techniques:['03-reveal','07-morph','01-fade-opacity'],
    labels:['MATERIAL / STUDIES','01  —  Solid','02  —  Paper','03  —  Print'],
  },
  'kinetic-wireframe-film':{
    component:'KineticWireframe',
    narrations:['先用一个橙色字母 A 建立清楚的平面轮廓。','同一字母逐渐挤出深度并转动；前后轮廓与对应顶点连成线框，平涂让位给空间关系。','让字母的空间结构停留，回看轮廓与深度的联系；这是指定字形，不是任意字体自动变形。'],
    stages:['平面字母 A','挤出深度、旋转与线框显现','空间字母稳定保持'],composition:'spatial-3d-stage',recipe:'source-to-output-demo',motion:'kinetic-type',techniques:['03-reveal','05-scale-rotate','01-fade-opacity'],
    labels:['FORM / SPACE','STUDY 02','TYPE HAS DIMENSION','A / LETTER','A / EXTRUSION','A / SPATIAL OBJECT','X','Y','Z','2D → 3D / CONTINUOUS FORM'],
  },
  'rain-platform-film':{
    component:'RainPlatform',
    narrations:['先在靛蓝雨夜里辨认站台、雨线与暖光，远处的夜车正进入画面。','夜车停靠，撑伞的旅人走近车门；车门打开，伞轻轻倾斜，湿地倒影与雨线延续同一场景。','旅人在敞开的车门前停下，没有展示上车；雨与水纹继续，让这个出发前的片刻留下余韵。'],
    stages:['雨夜站台与来车','列车停靠、旅人走近与开门','旅人在门前暂停，雨继续'],composition:'hero-theater',recipe:'caption-over-motion-bg',motion:'three-depth',techniques:['03-reveal','04-slide-move','01-fade-opacity'],labels:['07','NIGHT SERVICE  /  雨夜站台','A MOMENT BEFORE DEPARTURE'],
  },
};
export function presetNarrations(id:string): [string,string,string] {
  if(Object.hasOwn(referencePlans,id)) return [...referencePlans[id]!.narrations];
  const spec=getPreset(id); const selected=[...actions[spec.family]] as [string,string,string];
  if(id==='procedural-vfx') return ['先给出一组有稳定身份的示意粒子，建立空间分布。','同一组粒子逐步汇入连续的纤维路径，展示从散布到有序的变化。','保持最终的丝束关系；这是确定性的图形示例，不是物理模拟结果。'];
  if(id==='robotics-showroom') return ['先识别概念机械臂的关节、连杆、末端与目标物。','让末端围绕关节路径移动，连接标注跟随它们对应的部位。','保留这个姿态，复核部件关系；不宣称真实运动学或设备控制结果。'];
  if(id==='cinema-title-card') return ['先以克制的片头空间建立文字对象，标题不是一张档案纸页。','同一行标题由遮罩逐步揭示，轻微位移结束后回到清晰、稳定的阅读位置。','让片名完整停留，保留字形与留白的关系；这是原创文字片头示例。'];
  if(id==='medical-clean-room') return ['先观察一个中性的分层几何体，它不指代真实器官。','三层形状逐步拉开，第一层、第二层和第三层分别由标注指出。','保持分层结构供观察；这不是解剖模型、诊断或诊疗建议。'];
  if(id==='element-clean') return ['先建立演示表单中的输入字段，把必填项与操作位置分开。','字段经历输入、格式提示、修正与确认，状态变化对应具体控件。','保持确认结果供阅读；没有提交真实表单或处理个人数据。'];
  if(id==='houdini-node-lab') return ['先建立从左到右的节点处理次序，输入与结果各有明确位置。','信号按串联路径依次经过节点，而不是随标题位置反转处理顺序。','保持最终链路，复核各阶段的连接；这是概念流程，不是实际软件运行。'];
  return selected;
}
export function presetShotPlan(id:string, cinemaTitle?: string): PresetShotMetadata[] {
  if(Object.hasOwn(referencePlans,id)) {
    const spec=getPreset(id), plan=referencePlans[id]!;
    return plan.narrations.map((motionIntent,index)=>({presetId:id,presetFamily:spec.family,presetVariant:spec.variant,
      visualModel:`preset-${id}`,compositionModel:plan.composition,visualRecipe:plan.recipe,motionStyle:plan.motion,
      motionTechnique:plan.techniques[index]!,motionIntent,visualStages:[...plan.stages],
      onScreenText:[spec.content.title,spec.content.conclusion,...plan.labels],
      source:`src/video/presets/registry.ts#${id}; src/video/reference-styles/${plan.component}.tsx; original authored SVG; rendered review pending`,
      screenTextIntent:'labels'}));
  }
  const spec=getPreset(id),narrations=presetNarrations(id),[compositionModel,baseRecipe,motionStyle]=categories[spec.family];
  const visualRecipe=id==='cinema-title-card'?'kinetic-claim-card':id==='houdini-node-lab'||id==='procedural-vfx'?'source-to-output-demo':baseRecipe;
  const stages=['建立主体与参照','同一对象或关系推进','结果保持与复核'];
  return narrations.map((line,index)=>({presetId:id,presetFamily:spec.family,presetVariant:spec.variant,
    visualModel:id==='cinema-title-card'?'preset-cinematic-title':`preset-${spec.family}`,compositionModel:id==='cinema-title-card'?'hero-theater':compositionModel,visualRecipe,motionStyle:id==='cinema-title-card'?'kinetic-type':motionStyle,
    motionTechnique:index===0?'03-reveal':index===1?'04-slide-move':'01-fade-opacity',
    motionIntent:line,visualStages:stages,onScreenText:id==='cinema-title-card'?cinemaTitleText({title:cinemaTitle??spec.content.title,eyebrow:spec.content.eyebrow,conclusion:spec.content.conclusion}).all:[spec.content.eyebrow,spec.content.title,...(spec.content.subtitle?[spec.content.subtitle]:[]),...spec.content.labels,spec.content.conclusion],
    source:`src/video/presets/registry.ts#${id}; src/video/presets/PresetScene.tsx; original illustrative geometry`,screenTextIntent:'labels'}));
}
