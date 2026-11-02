import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface GateValidation {
  command: string;
  status: "pass" | "fail" | "unknown";
  evidence?: string;
}

export interface FeedbackEventInput {
  eventType: string;
  severity?: string;
  phase?: string;
  target?: string;
  problem?: string;
  agentAction?: string;
  filesChanged?: string[];
  validation?: GateValidation[];
  userResolution?: "pending" | "accepted" | "rejected" | string;
  notes?: string;
}

const ROOT = resolve(process.cwd());
const EVENTS = resolve(ROOT, "feedback-events.jsonl");
const STATE = resolve(ROOT, "project-state.json");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

function readProjectVersion(): string {
  if (existsSync(resolve(ROOT, "VERSION"))) return readFileSync(resolve(ROOT, "VERSION"), "utf8").trim();
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

export function appendFeedbackEvent(input: FeedbackEventInput): void {
  if (input.userResolution && input.userResolution !== "pending") throw new Error("Tool receipts cannot record human acceptance/rejection; use a separate user-decision");
  const event = {
    schema: 2,
    recordKind: "tool-result",
    provenance: "local-wrapper-reported; not authenticated",
    time: new Date().toISOString(),
    projectSkill: "web-video-presentation",
    projectVersion: readProjectVersion(),
    phase: input.phase ?? "",
    eventType: input.eventType,
    severity: input.severity ?? "normal",
    userQuote: "",
    chapter: null,
    step: null,
    shot: null,
    target: input.target ?? "",
    problem: input.problem ?? "",
    agentAction: input.agentAction ?? "",
    filesChanged: input.filesChanged ?? [],
    validation: input.validation ?? [],
    userResolution: input.userResolution ?? "pending",
    workflowCandidate: {
      shouldUpdateWorkflow: false,
      suggestedFile: "",
      rule: "",
    },
    notes: input.notes ?? "",
  };
  mkdirSync(resolve(ROOT), { recursive: true });
  appendFileSync(EVENTS, JSON.stringify(event) + "\n", "utf8");
}
