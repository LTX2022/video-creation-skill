import { HUMAN_DECISIONS, subjectForDecision, decisionEventErrors, decisionContentState } from "./workflow-evidence";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const EVENTS = resolve(ROOT, "feedback-events.jsonl");
const LOG = resolve(ROOT, "feedback-log.md");
const STATE = resolve(ROOT, "project-state.json");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

const allowedTypes = new Set([
  "checkpoint-plan",
  "shot-design-review",
  "chapter-anchor",
  "chapter-review",
  "script-change",
  "visual-change",
  "tts-choice",
  "subtitle-change",
  "alpha-edge-review",
  "bug",
  "gate-result",
  "golden-review",
  "final-review",
  "user-termination",
  "workflow-guidance",
]);

const stateFlagByType: Record<string, string> = {
  "checkpoint-plan": "checkpointPlanConfirmed",
  "shot-design-review": "fullShotDesignConfirmed",
};

function readArg(name: string): string {
  const prefix = `--${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1]!.startsWith("--")) {
    return process.argv[index + 1]!;
  }
  return "";
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function readProjectVersion(): string {
  if (existsSync(resolve(ROOT, "VERSION"))) {
    return readFileSync(resolve(ROOT, "VERSION"), "utf8").trim();
  }
  if (existsSync(STATE)) {
    try {
      const state = readJson(STATE);
      if (state.projectVersion) return String(state.projectVersion);
    } catch {
      return "generated-project";
    }
  }
  return "generated-project";
}

if (hasFlag("help") || hasFlag("h")) {
  console.log(`Usage:
  npm run feedback -- --type=checkpoint-plan --scope=project --quote="<actual user words>" --resolution=accepted --source=agent-transcribed --source-declaration="Transcribed from current user message; no host authentication" [--source-ref=<real message link/id>]
  npm run feedback -- --type=chapter-review --chapter=intro --scope=chapter:intro --quote="<actual user words>" --resolution=accepted --source=user-supplied --source-declaration="User supplied this decision"
  npm run feedback -- --type=golden-review --scope=project ...
  npm run feedback -- --type=final-review --scope=outputs ...
  npm run feedback -- --type=alpha-edge-review --scope=output:alpha --target=<actual alpha SHA256> ...
  npm run feedback -- --type=tts-choice --scope=project --provider=voicebox --voice="<provider voice>" ...
  --resolution=accepted|rejected|revoked needs quote, scope and source declaration.
  Missing source-ref is explicit null, never an invented message ID. Local declarations are NOT authentication.
  --type=gate-result is a caller-declared note only; it cannot approve a gate or claim observed execution.
  --source=synthetic is for test fixtures only and cannot satisfy a production approval gate.`);
  process.exit(0);
}

const type = readArg("type");
if (!allowedTypes.has(type)) throw new Error(`Invalid --type. Allowed: ${[...allowedTypes].join(", ")}`);
const resolution = readArg("resolution") || "pending";
if (!["pending","accepted","rejected","revoked"].includes(resolution)) throw new Error("Invalid --resolution");
const isDecision=HUMAN_DECISIONS.has(resolution);
if(type==='gate-result'&&isDecision)throw new Error('gate-result is technical/caller-declared evidence, not a user decision; use golden-review/final-review or a scoped review type');
const state=existsSync(STATE)?readJson(STATE):{};
let nextState=JSON.parse(JSON.stringify(state));
const accepted=resolution==='accepted';
// Apply selected content parameters in memory BEFORE binding, then persist only after all validation.
if(accepted)nextState=decisionContentState(state,type,{profile:readArg('profile'),duration:readArg('target-duration'),subtitles:readArg('subtitles'),provider:readArg('provider'),voice:readArg('voice'),requested:readArg('requested')});

const event:any={
  schema:2,recordKind:isDecision?'user-decision':'feedback-note',time:new Date().toISOString(),projectSkill:'web-video-presentation',projectVersion:readProjectVersion(),
  phase:readArg('phase'),eventType:type,severity:readArg('severity')||'normal',userQuote:readArg('quote'),chapter:readArg('chapter')||null,step:readArg('step')?Number(readArg('step')):null,
  shot:readArg('shot')||null,target:readArg('target'),problem:readArg('problem'),agentAction:readArg('action'),filesChanged:readArg('files').split(',').map(s=>s.trim()).filter(Boolean),
  // A typed command/status is merely a declaration, not an execution receipt.
  declaredValidation:readArg('command')?[{command:readArg('command'),status:readArg('status')||'unknown',evidence:readArg('evidence')}]:[],
  validation:[],userResolution:resolution,notes:readArg('notes'),workflowCandidate:{shouldUpdateWorkflow:hasFlag('workflow-candidate'),suggestedFile:readArg('suggested-file'),rule:readArg('rule')},
};
if(isDecision) {
  event.decision=resolution;
  event.source={kind:readArg('source'),reference:readArg('source-ref')||null,declaration:readArg('source-declaration')};
  // Validate plain-text/source/scope before reading subject files or writing any artifact.
  if(!event.userQuote.trim())throw new Error('Human decision requires nonempty --quote');
  if(!readArg('scope').trim())throw new Error('Human decision requires explicit --scope');
  if(!['agent-transcribed','user-supplied','synthetic'].includes(event.source.kind)||!event.source.declaration.trim())throw new Error('Human decision requires --source and --source-declaration; local declarations do not authenticate the user');
  event.subject=subjectForDecision(ROOT,type,{scope:readArg('scope'),chapter:readArg('chapter'),target:readArg('target'),state:nextState});
  const errors=decisionEventErrors(event,{allowSynthetic:true});if(errors.length)throw new Error(errors.join('; '));
}
if(isDecision&&event.source.kind!=='synthetic') {
  const key=stateFlagByType[type];if(key)nextState[key]=accepted;
  if(type==='chapter-anchor'||type==='chapter-review') {
    const chapter=readArg('chapter');
    const ids:Array<string>=Array.isArray(nextState.acceptedChapterIds)?nextState.acceptedChapterIds:[];
    nextState.acceptedChapterIds=accepted?[...new Set([...ids,chapter])]:ids.filter(id=>id!==chapter);
    if(type==='chapter-anchor'){nextState.firstChapterAnchorReady=accepted;nextState.firstChapterUserAccepted=accepted;}
  }
  if(type==='alpha-edge-review')nextState.alphaEdgeReview={accepted,sha256:readArg('target').toUpperCase(),backgrounds:['black','white']};
  if(type==='subtitle-change')nextState.subtitlesPreviewVerified=accepted;
  if(type==='golden-review')nextState.goldenFramesShownToUser=accepted;
  if(type==='final-review')nextState.finalRenderApproved=accepted;
}
appendFileSync(EVENTS,JSON.stringify(event)+'\n','utf8');
if(!existsSync(LOG))writeFileSync(LOG,'# Feedback Log\n\n','utf8');
appendFileSync(LOG,[`## ${event.time} — ${type}${event.chapter?` — ${event.chapter}`:''}`,'',`**用户原话**：${event.userQuote||'(note)'}`,`**范围**：${event.subject?.scope||'(unbound note)'}`,`**用户结果**：${resolution}`,`**来源声明**：${event.source?.declaration||'(not a human decision)'}`,''].join('\n')+'\n','utf8');
if(existsSync(STATE)&&isDecision&&event.source.kind!=='synthetic') {
  nextState.updatedAt=new Date().toISOString();writeFileSync(STATE,JSON.stringify(nextState,null,2)+'\n','utf8');
}
console.error(`v recorded ${type} (${event.recordKind}) -> ${EVENTS}`);
